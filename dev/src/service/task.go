package service

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
)

// TaskRefValidator 對 task_refs 做存在性驗證的最小介面
//
// 拆出獨立介面避免 TaskService 直接綁 EntryRepository / JournalRepository 的整套
// API，以利 unit test。
type TaskRefValidator interface {
	EntryExists(ctx context.Context, id uuid.UUID) (bool, error)
	JournalExistsByDate(ctx context.Context, date time.Time) (bool, error)
}

// EntryFinder 包一層 EntryRepository.FindByID
type EntryFinder interface {
	FindByID(ctx context.Context, id uuid.UUID) (*model.Entry, error)
}

// JournalDateFinder 包一層 JournalRepository.GetByDate
type JournalDateFinder interface {
	GetByDate(ctx context.Context, date time.Time) (*model.Journal, []model.JournalSourceRef, error)
}

// taskRefValidatorAdapter 將 EntryRepository / JournalRepository 串成 TaskRefValidator
type taskRefValidatorAdapter struct {
	entryRepo   EntryFinder
	journalRepo JournalDateFinder
}

func (a *taskRefValidatorAdapter) EntryExists(ctx context.Context, id uuid.UUID) (bool, error) {
	e, err := a.entryRepo.FindByID(ctx, id)
	if err != nil {
		// 統一將底層錯誤回傳；service 層會包裝
		return false, err
	}
	return e != nil, nil
}

func (a *taskRefValidatorAdapter) JournalExistsByDate(ctx context.Context, date time.Time) (bool, error) {
	j, _, err := a.journalRepo.GetByDate(ctx, date)
	if err != nil {
		// JournalRepository.GetByDate 不存在會回 AppError 404，需轉成 (false, nil)
		if appErr, ok := err.(*model.AppError); ok && appErr.Status == 404 {
			return false, nil
		}
		return false, err
	}
	return j != nil, nil
}

// TaskService 任務 business logic（F-031c）
//
// 職責：
//   - title 1..200 / description <= 5000 / due_date 格式驗證
//   - status / priority enum 驗證；done → 其他 自動清 completed_at
//   - refs 驗證：entry 用 EntryRepository / journal 用 JournalRepository.GetByDate(YYYY-MM-DD)
//   - Create/Update/Complete/Delete 後呼叫 ProjectService.RecomputeProgress
//   - archived project 不可新增 task → 400 PROJECT_ARCHIVED
type TaskService struct {
	taskRepo       TaskRepository
	projectRepo    ProjectRepository
	refValidator   TaskRefValidator
	projectService *ProjectService
}

// NewTaskService 由 main 注入完整 dependencies
func NewTaskService(
	taskRepo TaskRepository,
	projectRepo ProjectRepository,
	entryRepo EntryFinder,
	journalRepo JournalDateFinder,
	projectService *ProjectService,
) *TaskService {
	return &TaskService{
		taskRepo:    taskRepo,
		projectRepo: projectRepo,
		refValidator: &taskRefValidatorAdapter{
			entryRepo:   entryRepo,
			journalRepo: journalRepo,
		},
		projectService: projectService,
	}
}

// NewTaskServiceWithValidator 測試用注入點
func NewTaskServiceWithValidator(
	taskRepo TaskRepository,
	projectRepo ProjectRepository,
	validator TaskRefValidator,
	projectService *ProjectService,
) *TaskService {
	return &TaskService{
		taskRepo:       taskRepo,
		projectRepo:    projectRepo,
		refValidator:   validator,
		projectService: projectService,
	}
}

// parseTaskDueDate 將 YYYY-MM-DD 轉成 UTC date（00:00），空字串視為錯誤
func parseTaskDueDate(s string) (time.Time, error) {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return time.Time{}, model.NewAppError(400, model.ErrCodeInvalidInput,
			"due_date 格式錯誤，需 YYYY-MM-DD")
	}
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), nil
}

// validateAndConvertRefs 驗證 task_refs（entry / journal / gcal_event）
func (s *TaskService) validateAndConvertRefs(
	ctx context.Context, refs []dto.TaskRefDTO,
) ([]model.TaskRef, error) {
	out := make([]model.TaskRef, 0, len(refs))
	for _, r := range refs {
		switch r.RefType {
		case model.TaskRefTypeEntry:
			id, err := uuid.Parse(r.RefID)
			if err != nil {
				return nil, model.NewAppError(400, model.ErrCodeInvalidInput,
					"task ref entry id 格式錯誤")
			}
			ok, err := s.refValidator.EntryExists(ctx, id)
			if err != nil {
				return nil, err
			}
			if !ok {
				return nil, model.NewAppError(400, model.ErrCodeInvalidInput,
					"task ref entry not found")
			}
		case model.TaskRefTypeJournal:
			d, err := time.Parse("2006-01-02", r.RefID)
			if err != nil {
				return nil, model.NewAppError(400, model.ErrCodeInvalidInput,
					"task ref journal id 需為 YYYY-MM-DD")
			}
			date := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, time.UTC)
			ok, err := s.refValidator.JournalExistsByDate(ctx, date)
			if err != nil {
				return nil, err
			}
			if !ok {
				return nil, model.NewAppError(400, model.ErrCodeInvalidInput,
					"task ref journal not found")
			}
		case model.TaskRefTypeGcalEvent:
			if strings.TrimSpace(r.RefID) == "" {
				return nil, model.NewAppError(400, model.ErrCodeInvalidInput,
					"gcal_event ref_id 不可為空")
			}
		default:
			return nil, model.NewAppError(400, model.ErrCodeInvalidRefType,
				"ref_type 必須為 entry / journal / gcal_event")
		}
		out = append(out, model.TaskRef{RefType: r.RefType, RefID: r.RefID})
	}
	return out, nil
}

// validateCreate 共用欄位檢查（Create 用）
func validateTaskTitle(title string) (string, error) {
	t := strings.TrimSpace(title)
	if t == "" || len(t) > 200 {
		return "", model.NewAppError(400, model.ErrCodeInvalidInput, "title 長度需 1~200")
	}
	return t, nil
}

// Create 建立 task
//
// Scenarios:
//   - title 1..200、description <= 5000
//   - status 預設 todo、priority 預設 normal
//   - due_date 若有需 YYYY-MM-DD
//   - archived project 不可新增 task → 400 PROJECT_ARCHIVED
//   - project 不存在 → 404 PROJECT_NOT_FOUND
//   - refs 驗證（entry/journal）
//   - 建立後 RecomputeProgress
func (s *TaskService) Create(
	ctx context.Context, projectID uuid.UUID, req *dto.CreateTaskRequest,
) (*model.Task, []model.TaskRef, error) {
	if req == nil {
		return nil, nil, model.NewAppError(400, model.ErrCodeInvalidInput, "request body 為必填")
	}

	// 確認 project 存在 + 非 archived
	p, err := s.projectRepo.FindByID(ctx, projectID)
	if err != nil {
		return nil, nil, err
	}
	if p.Status == model.ProjectStatusArchived {
		return nil, nil, model.NewAppError(400, model.ErrCodeProjectArchived,
			"已封存的專案不可新增任務")
	}

	title, err := validateTaskTitle(req.Title)
	if err != nil {
		return nil, nil, err
	}
	if req.Description != nil && len(*req.Description) > 5000 {
		return nil, nil, model.NewAppError(400, model.ErrCodeInvalidInput, "description 長度上限 5000")
	}

	status := model.TaskStatusTodo
	if req.Status != nil && *req.Status != "" {
		if !model.IsValidTaskStatus(*req.Status) {
			return nil, nil, model.NewAppError(400, model.ErrCodeInvalidInput, "status 不合法")
		}
		status = *req.Status
	}
	priority := model.TaskPriorityNormal
	if req.Priority != nil && *req.Priority != "" {
		if !model.IsValidTaskPriority(*req.Priority) {
			return nil, nil, model.NewAppError(400, model.ErrCodeInvalidInput, "priority 不合法")
		}
		priority = *req.Priority
	}

	var dueDate *time.Time
	if req.DueDate != nil && *req.DueDate != "" {
		d, err := parseTaskDueDate(*req.DueDate)
		if err != nil {
			return nil, nil, err
		}
		dueDate = &d
	}

	pos := 0
	if req.Position != nil {
		pos = *req.Position
	}

	refs, err := s.validateAndConvertRefs(ctx, req.Refs)
	if err != nil {
		return nil, nil, err
	}

	t := &model.Task{
		ProjectID:   projectID,
		Title:       title,
		Description: req.Description,
		Status:      status,
		Priority:    priority,
		DueDate:     dueDate,
		Position:    pos,
	}
	// 若 client 直接以 status=done 建立，自動補 completed_at
	if status == model.TaskStatusDone {
		now := time.Now().UTC()
		t.CompletedAt = &now
	}

	if err := s.taskRepo.Create(ctx, t, refs); err != nil {
		return nil, nil, err
	}

	if _, err := s.projectService.RecomputeProgress(ctx, projectID); err != nil {
		slog.WarnContext(ctx, "task.create.recompute_progress_failed",
			"project_id", projectID, "err", err)
	}

	slog.InfoContext(ctx, "task.create",
		"id", t.ID, "project_id", projectID, "refs", len(refs))
	return t, refs, nil
}

// Get 取得 task 詳情含 refs
//
// 不存在 → 404 TASK_NOT_FOUND
func (s *TaskService) Get(
	ctx context.Context, id uuid.UUID,
) (*model.Task, []model.TaskRef, error) {
	return s.taskRepo.FindByID(ctx, id)
}

// ListByProject 列表（依 project，無分頁）
//
// 超過 500 → 400 TOO_MANY_TASKS（由 repository 直接擋）
func (s *TaskService) ListByProject(
	ctx context.Context, projectID uuid.UUID, statusFilter []string,
) ([]*model.Task, error) {
	// 確認專案存在以一致 404 行為
	if _, err := s.projectRepo.FindByID(ctx, projectID); err != nil {
		return nil, err
	}
	return s.taskRepo.ListByProject(ctx, projectID, statusFilter)
}

// Update partial 更新
//
// Scenarios:
//   - title 長度 1..200（若有更新）
//   - description <= 5000
//   - status/priority enum
//   - done → 其他 → 自動清 completed_at；其他 → done → 自動補 completed_at
//   - refs 為非 nil 則整批覆寫
//   - 不存在 → 404 TASK_NOT_FOUND
//   - 變動後 RecomputeProgress
func (s *TaskService) Update(
	ctx context.Context, id uuid.UUID, req *dto.UpdateTaskRequest,
) (*model.Task, []model.TaskRef, error) {
	if req == nil {
		return nil, nil, model.NewAppError(400, model.ErrCodeInvalidInput, "request body 為必填")
	}

	current, _, err := s.taskRepo.FindByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}

	prevStatus := current.Status

	if req.Title != nil {
		t, err := validateTaskTitle(*req.Title)
		if err != nil {
			return nil, nil, err
		}
		current.Title = t
	}
	if req.Description != nil {
		if *req.Description == nil {
			current.Description = nil
		} else {
			d := **req.Description
			if len(d) > 5000 {
				return nil, nil, model.NewAppError(400, model.ErrCodeInvalidInput, "description 長度上限 5000")
			}
			current.Description = &d
		}
	}
	if req.Status != nil {
		if !model.IsValidTaskStatus(*req.Status) {
			return nil, nil, model.NewAppError(400, model.ErrCodeInvalidInput, "status 不合法")
		}
		current.Status = *req.Status
	}
	if req.Priority != nil {
		if !model.IsValidTaskPriority(*req.Priority) {
			return nil, nil, model.NewAppError(400, model.ErrCodeInvalidInput, "priority 不合法")
		}
		current.Priority = *req.Priority
	}
	if req.DueDate != nil {
		if *req.DueDate == nil {
			current.DueDate = nil
		} else {
			d, err := parseTaskDueDate(**req.DueDate)
			if err != nil {
				return nil, nil, err
			}
			current.DueDate = &d
		}
	}
	if req.Position != nil {
		current.Position = *req.Position
	}

	// status transition：done → 其他 清 completed_at；其他 → done 補 completed_at
	if prevStatus == model.TaskStatusDone && current.Status != model.TaskStatusDone {
		current.CompletedAt = nil
	}
	if prevStatus != model.TaskStatusDone && current.Status == model.TaskStatusDone {
		now := time.Now().UTC()
		current.CompletedAt = &now
	}

	if err := s.taskRepo.Update(ctx, current); err != nil {
		return nil, nil, err
	}

	// refs 整批覆寫（含 nil 不動 / 空陣列 = 全清）
	var newRefs []model.TaskRef
	if req.Refs != nil {
		converted, err := s.validateAndConvertRefs(ctx, *req.Refs)
		if err != nil {
			return nil, nil, err
		}
		if err := s.taskRepo.ReplaceRefs(ctx, current.ID, converted); err != nil {
			return nil, nil, err
		}
		newRefs = converted
	} else {
		got, err := s.taskRepo.GetRefs(ctx, current.ID)
		if err != nil {
			return nil, nil, err
		}
		newRefs = got
	}

	if _, err := s.projectService.RecomputeProgress(ctx, current.ProjectID); err != nil {
		slog.WarnContext(ctx, "task.update.recompute_progress_failed",
			"project_id", current.ProjectID, "err", err)
	}
	slog.InfoContext(ctx, "task.update", "id", id)
	return current, newRefs, nil
}

// Complete 將 task 標記 done + 補 completed_at + RecomputeProgress
//
// 不存在 → 404 TASK_NOT_FOUND
func (s *TaskService) Complete(ctx context.Context, id uuid.UUID) (*model.Task, error) {
	t, _, err := s.taskRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if t.Status != model.TaskStatusDone {
		now := time.Now().UTC()
		t.Status = model.TaskStatusDone
		t.CompletedAt = &now
		if err := s.taskRepo.Update(ctx, t); err != nil {
			return nil, err
		}
	}
	if _, err := s.projectService.RecomputeProgress(ctx, t.ProjectID); err != nil {
		slog.WarnContext(ctx, "task.complete.recompute_progress_failed",
			"project_id", t.ProjectID, "err", err)
	}
	slog.InfoContext(ctx, "task.complete", "id", id)
	return t, nil
}

// Delete 刪除 task；之後 RecomputeProgress
//
// 不存在 → 404 TASK_NOT_FOUND
func (s *TaskService) Delete(ctx context.Context, id uuid.UUID) error {
	t, _, err := s.taskRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.taskRepo.Delete(ctx, id); err != nil {
		return err
	}
	if _, err := s.projectService.RecomputeProgress(ctx, t.ProjectID); err != nil {
		slog.WarnContext(ctx, "task.delete.recompute_progress_failed",
			"project_id", t.ProjectID, "err", err)
	}
	slog.InfoContext(ctx, "task.delete", "id", id)
	return nil
}

// ListUpcoming 跨專案：未完成且 due_date <= today + days
//
// days 預設 7、最大 365
func (s *TaskService) ListUpcoming(ctx context.Context, days int) ([]*model.Task, error) {
	if days < 0 {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "days 不可為負數")
	}
	if days > 365 {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "days 上限 365")
	}
	return s.taskRepo.ListUpcoming(ctx, days)
}

// ListOverdue 跨專案：未完成且 due_date < today
func (s *TaskService) ListOverdue(ctx context.Context) ([]*model.Task, error) {
	return s.taskRepo.ListOverdue(ctx)
}
