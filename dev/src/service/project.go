package service

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
)

// ProjectService 專案 business logic（F-031b）
//
// 職責：
//   - 欄位驗證（name 1..80、description <= 5000、end_date >= start_date）
//   - status transition 規則（archived 由 Archive endpoint 設定）
//   - 對 archived 進行 unarchive 仍透過 PATCH（status=active/paused/done）允許；
//     反向（active → archived 透過 PATCH archived）也允許。spec §139~140 的「需顯式 unarchive」
//     在此處解讀為：archive endpoint 只能設成 archived；PATCH 任何 status 皆可，由 client 端
//     顯式指定。
//   - delete 預設拒含 task；force=true 時透過 ProjectRepository.Delete（FK CASCADE）。
//   - PATCH 中 progress 欄位忽略（progress 為自動計算）。
type ProjectService struct {
	projectRepo ProjectRepository
	taskRepo    TaskRepository
}

// NewProjectService 建立 ProjectService
func NewProjectService(pr ProjectRepository, tr TaskRepository) *ProjectService {
	return &ProjectService{projectRepo: pr, taskRepo: tr}
}

// ProjectListOptions service 層 alias，避免 handler import repository
type ProjectListOptions = repository.ProjectListOptions

// parseProjectDate 解析 YYYY-MM-DD（以 UTC 表示「該日 00:00」），與 Journal 一致。
//
// 空字串視為錯誤，呼叫端應在傳入前判斷是否為 nil。
func parseProjectDate(s string) (time.Time, error) {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return time.Time{}, model.NewAppError(400, model.ErrCodeInvalidInput,
			"日期格式錯誤，需 YYYY-MM-DD")
	}
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), nil
}

// validateDateRange 若 start/end 都有值，end 必須 >= start
func validateDateRange(start, end *time.Time) error {
	if start != nil && end != nil && end.Before(*start) {
		return model.NewAppError(400, model.ErrCodeInvalidInput,
			"end_date 不可早於 start_date")
	}
	return nil
}

// Create 建立專案
//
// Scenarios:
//   - 名稱 1..80（DTO binding 已擋）
//   - end_date >= start_date 否則 400 INVALID_INPUT
//   - 名稱（CI）重複於非 archived → 409 PROJECT_NAME_DUPLICATE（由 repository PgErr mapping）
//   - status 預設 active；progress 一律 0
func (s *ProjectService) Create(
	ctx context.Context, req *dto.CreateProjectRequest,
) (*model.Project, error) {
	if req == nil {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "request body 為必填")
	}

	name := strings.TrimSpace(req.Name)
	if name == "" || len(name) > 80 {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "name 長度需 1~80")
	}
	if req.Description != nil && len(*req.Description) > 5000 {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "description 長度上限 5000")
	}

	var startDate, endDate *time.Time
	if req.StartDate != nil && *req.StartDate != "" {
		t, err := parseProjectDate(*req.StartDate)
		if err != nil {
			return nil, err
		}
		startDate = &t
	}
	if req.EndDate != nil && *req.EndDate != "" {
		t, err := parseProjectDate(*req.EndDate)
		if err != nil {
			return nil, err
		}
		endDate = &t
	}
	if err := validateDateRange(startDate, endDate); err != nil {
		return nil, err
	}

	status := model.ProjectStatusActive
	if req.Status != nil && *req.Status != "" {
		if !model.IsValidProjectStatus(*req.Status) {
			return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "status 不合法")
		}
		status = *req.Status
	}

	color := ""
	if req.Color != nil {
		color = *req.Color
	}

	p := &model.Project{
		Name:        name,
		Description: req.Description,
		Color:       color,
		Status:      status,
		StartDate:   startDate,
		EndDate:     endDate,
		Progress:    0,
	}

	if err := s.projectRepo.Create(ctx, p); err != nil {
		return nil, err
	}
	slog.InfoContext(ctx, "project.create", "id", p.ID, "name", p.Name)
	return p, nil
}

// Get 取得專案詳情，附帶 task_counts
//
// 不存在 → 404 PROJECT_NOT_FOUND
func (s *ProjectService) Get(
	ctx context.Context, id uuid.UUID,
) (*model.Project, *dto.TaskCountsResponse, error) {
	p, err := s.projectRepo.FindByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	total, byStatus, err := s.projectRepo.CountTasks(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	if byStatus == nil {
		byStatus = map[string]int{}
	}
	counts := &dto.TaskCountsResponse{Total: total, ByStatus: byStatus}
	return p, counts, nil
}

// List 分頁列表
func (s *ProjectService) List(
	ctx context.Context, opts ProjectListOptions,
) ([]*model.Project, int64, error) {
	return s.projectRepo.List(ctx, opts)
}

// Update partial 更新
//
// Scenarios:
//   - name 長度 1..80（若有更新）
//   - description <= 5000（若有更新）
//   - end_date >= start_date（合併後）
//   - 名稱衝突 → 409 PROJECT_NAME_DUPLICATE
//   - 不存在 → 404 PROJECT_NOT_FOUND
//
// 注意：spec §142 progress 由系統計算，PATCH 不接受 progress 欄位（DTO 上沒這個欄位，自然忽略）。
func (s *ProjectService) Update(
	ctx context.Context, id uuid.UUID, req *dto.UpdateProjectRequest,
) (*model.Project, error) {
	if req == nil {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "request body 為必填")
	}

	current, err := s.projectRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// 套用 patch
	if req.Name != nil {
		n := strings.TrimSpace(*req.Name)
		if n == "" || len(n) > 80 {
			return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "name 長度需 1~80")
		}
		current.Name = n
	}
	if req.Description != nil {
		// **string：外層非 nil 代表 client 有送 description 欄位
		// 內層 nil 代表設為 NULL，否則更新文字
		if *req.Description == nil {
			current.Description = nil
		} else {
			d := **req.Description
			if len(d) > 5000 {
				return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "description 長度上限 5000")
			}
			current.Description = &d
		}
	}
	if req.Color != nil {
		current.Color = *req.Color
	}
	if req.Status != nil {
		if !model.IsValidProjectStatus(*req.Status) {
			return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "status 不合法")
		}
		current.Status = *req.Status
	}
	if req.StartDate != nil {
		if *req.StartDate == nil {
			current.StartDate = nil
		} else {
			d, err := parseProjectDate(**req.StartDate)
			if err != nil {
				return nil, err
			}
			current.StartDate = &d
		}
	}
	if req.EndDate != nil {
		if *req.EndDate == nil {
			current.EndDate = nil
		} else {
			d, err := parseProjectDate(**req.EndDate)
			if err != nil {
				return nil, err
			}
			current.EndDate = &d
		}
	}
	if err := validateDateRange(current.StartDate, current.EndDate); err != nil {
		return nil, err
	}

	if err := s.projectRepo.Update(ctx, current); err != nil {
		return nil, err
	}
	slog.InfoContext(ctx, "project.update", "id", id)
	return current, nil
}

// Delete 刪除專案
//
// Scenarios:
//   - 預設：若有 task → 409 PROJECT_HAS_TASKS
//   - force=true → DB FK CASCADE 連帶刪除 tasks（透過 ProjectRepository.Delete）
//   - 不存在 → 404 PROJECT_NOT_FOUND
func (s *ProjectService) Delete(ctx context.Context, id uuid.UUID, force bool) error {
	// 先確認專案存在（一致的 404 行為）
	if _, err := s.projectRepo.FindByID(ctx, id); err != nil {
		return err
	}

	if !force {
		count, err := s.taskRepo.CountByProject(ctx, id)
		if err != nil {
			return err
		}
		if count > 0 {
			return model.NewAppError(409, model.ErrCodeProjectHasTasks,
				"專案下仍有 task，請改以 ?force=true 強制刪除")
		}
	}

	if err := s.projectRepo.Delete(ctx, id); err != nil {
		return err
	}
	slog.InfoContext(ctx, "project.delete", "id", id, "force", force)
	return nil
}

// Archive 將專案 status 設為 archived
//
// 不存在 → 404 PROJECT_NOT_FOUND
// 已是 archived → 直接回傳（idempotent）
func (s *ProjectService) Archive(ctx context.Context, id uuid.UUID) (*model.Project, error) {
	p, err := s.projectRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if p.Status == model.ProjectStatusArchived {
		return p, nil
	}
	p.Status = model.ProjectStatusArchived
	if err := s.projectRepo.Update(ctx, p); err != nil {
		return nil, err
	}
	slog.InfoContext(ctx, "project.archive", "id", id)
	return p, nil
}

// RecomputeProgress 給 F-031c task 變動時呼叫，重新計算 progress。
//
// 沒有 task 或全部 cancelled → 0。
func (s *ProjectService) RecomputeProgress(
	ctx context.Context, projectID uuid.UUID,
) (int, error) {
	return s.projectRepo.RecomputeProgress(ctx, projectID)
}
