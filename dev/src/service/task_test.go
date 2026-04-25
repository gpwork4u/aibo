package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
)

// ─── Fake TaskRepository（service test 用） ──────────────────────────────

type fakeTaskRepo struct {
	tasks    map[uuid.UUID]*model.Task
	refs     map[uuid.UUID][]model.TaskRef
	createErr error
	updateErr error
	deleteErr error

	// ListByProject 排序後直接吐回（不過濾）
	listByProjErr error

	upcoming []*model.Task
	overdue  []*model.Task
}

func newFakeTaskRepo() *fakeTaskRepo {
	return &fakeTaskRepo{
		tasks: map[uuid.UUID]*model.Task{},
		refs:  map[uuid.UUID][]model.TaskRef{},
	}
}

func (r *fakeTaskRepo) Create(ctx context.Context, t *model.Task, refs []model.TaskRef) error {
	if r.createErr != nil {
		return r.createErr
	}
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	now := time.Now()
	t.CreatedAt = now
	t.UpdatedAt = now
	if t.Status == "" {
		t.Status = model.TaskStatusTodo
	}
	if t.Priority == "" {
		t.Priority = model.TaskPriorityNormal
	}
	cp := *t
	r.tasks[t.ID] = &cp
	if len(refs) > 0 {
		stored := make([]model.TaskRef, len(refs))
		for i, ref := range refs {
			stored[i] = model.TaskRef{TaskID: t.ID, RefType: ref.RefType, RefID: ref.RefID}
		}
		r.refs[t.ID] = stored
	}
	return nil
}

func (r *fakeTaskRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Task, []model.TaskRef, error) {
	t, ok := r.tasks[id]
	if !ok {
		return nil, nil, model.NewAppError(404, model.ErrCodeTaskNotFound, "任務不存在")
	}
	cp := *t
	refs := append([]model.TaskRef(nil), r.refs[id]...)
	return &cp, refs, nil
}

func (r *fakeTaskRepo) ListByProject(ctx context.Context, projectID uuid.UUID, statusFilter []string) ([]*model.Task, error) {
	if r.listByProjErr != nil {
		return nil, r.listByProjErr
	}
	out := make([]*model.Task, 0)
	for _, t := range r.tasks {
		if t.ProjectID != projectID {
			continue
		}
		if len(statusFilter) > 0 {
			match := false
			for _, s := range statusFilter {
				if t.Status == s {
					match = true
					break
				}
			}
			if !match {
				continue
			}
		}
		cp := *t
		out = append(out, &cp)
	}
	return out, nil
}

func (r *fakeTaskRepo) Update(ctx context.Context, t *model.Task) error {
	if r.updateErr != nil {
		return r.updateErr
	}
	if _, ok := r.tasks[t.ID]; !ok {
		return model.NewAppError(404, model.ErrCodeTaskNotFound, "任務不存在")
	}
	t.UpdatedAt = time.Now()
	cp := *t
	r.tasks[t.ID] = &cp
	return nil
}

func (r *fakeTaskRepo) ReplaceRefs(ctx context.Context, taskID uuid.UUID, refs []model.TaskRef) error {
	if len(refs) == 0 {
		delete(r.refs, taskID)
		return nil
	}
	stored := make([]model.TaskRef, len(refs))
	for i, ref := range refs {
		stored[i] = model.TaskRef{TaskID: taskID, RefType: ref.RefType, RefID: ref.RefID}
	}
	r.refs[taskID] = stored
	return nil
}

func (r *fakeTaskRepo) Delete(ctx context.Context, id uuid.UUID) error {
	if r.deleteErr != nil {
		return r.deleteErr
	}
	if _, ok := r.tasks[id]; !ok {
		return model.NewAppError(404, model.ErrCodeTaskNotFound, "任務不存在")
	}
	delete(r.tasks, id)
	delete(r.refs, id)
	return nil
}

func (r *fakeTaskRepo) ListUpcoming(ctx context.Context, days int) ([]*model.Task, error) {
	return r.upcoming, nil
}

func (r *fakeTaskRepo) ListOverdue(ctx context.Context) ([]*model.Task, error) {
	return r.overdue, nil
}

func (r *fakeTaskRepo) CountByProject(ctx context.Context, projectID uuid.UUID) (int, error) {
	c := 0
	for _, t := range r.tasks {
		if t.ProjectID == projectID {
			c++
		}
	}
	return c, nil
}

func (r *fakeTaskRepo) GetRefs(ctx context.Context, taskID uuid.UUID) ([]model.TaskRef, error) {
	return append([]model.TaskRef(nil), r.refs[taskID]...), nil
}

// ─── Fake TaskRefValidator ──────────────────────────────────────────────

type fakeRefValidator struct {
	entries  map[uuid.UUID]bool
	journals map[string]bool // YYYY-MM-DD
}

func newFakeRefValidator() *fakeRefValidator {
	return &fakeRefValidator{
		entries:  map[uuid.UUID]bool{},
		journals: map[string]bool{},
	}
}

func (v *fakeRefValidator) EntryExists(ctx context.Context, id uuid.UUID) (bool, error) {
	return v.entries[id], nil
}
func (v *fakeRefValidator) JournalExistsByDate(ctx context.Context, date time.Time) (bool, error) {
	return v.journals[date.UTC().Format("2006-01-02")], nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────

func newTaskSvc(t *testing.T) (
	*TaskService,
	*fakeTaskRepo,
	*fakeProjectRepo,
	*fakeRefValidator,
	*ProjectService,
) {
	t.Helper()
	tr := newFakeTaskRepo()
	pr := newFakeProjectRepo()
	rv := newFakeRefValidator()
	psvc := NewProjectService(pr, tr)
	svc := NewTaskServiceWithValidator(tr, pr, rv, psvc)
	return svc, tr, pr, rv, psvc
}

func seedActiveProject(pr *fakeProjectRepo) *model.Project {
	id := uuid.New()
	p := &model.Project{ID: id, Name: "P", Status: model.ProjectStatusActive}
	pr.store[id] = p
	return p
}

// ─── Tests ──────────────────────────────────────────────────────────────

// 1. Create happy path 預設 status=todo / priority=normal
func TestTaskSvc_Create_HappyPath(t *testing.T) {
	svc, _, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	req := &dto.CreateTaskRequest{Title: "設計 schema"}
	got, refs, err := svc.Create(context.Background(), p.ID, req)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if got.Status != model.TaskStatusTodo {
		t.Errorf("status default expected todo, got %s", got.Status)
	}
	if got.Priority != model.TaskPriorityNormal {
		t.Errorf("priority default expected normal, got %s", got.Priority)
	}
	if len(refs) != 0 {
		t.Errorf("expected 0 refs, got %d", len(refs))
	}
}

// 2. Create 帶 entry ref（成功）
func TestTaskSvc_Create_WithEntryRef(t *testing.T) {
	svc, _, pr, rv, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	entryID := uuid.New()
	rv.entries[entryID] = true

	req := &dto.CreateTaskRequest{
		Title: "設計 schema",
		Refs: []dto.TaskRefDTO{
			{RefType: "entry", RefID: entryID.String()},
		},
	}
	_, refs, err := svc.Create(context.Background(), p.ID, req)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if len(refs) != 1 || refs[0].RefID != entryID.String() {
		t.Errorf("expected 1 entry ref, got %+v", refs)
	}
}

// 3. Create entry ref 不存在 → 400 INVALID_INPUT
func TestTaskSvc_Create_EntryRefNotFound(t *testing.T) {
	svc, _, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	req := &dto.CreateTaskRequest{
		Title: "x",
		Refs:  []dto.TaskRefDTO{{RefType: "entry", RefID: uuid.New().String()}},
	}
	_, _, err := svc.Create(context.Background(), p.ID, req)
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Status != 400 || appErr.Code != model.ErrCodeInvalidInput {
		t.Fatalf("expected 400 INVALID_INPUT, got %v", err)
	}
}

// 4. Create journal ref 不存在 → 400
func TestTaskSvc_Create_JournalRefNotFound(t *testing.T) {
	svc, _, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	req := &dto.CreateTaskRequest{
		Title: "x",
		Refs:  []dto.TaskRefDTO{{RefType: "journal", RefID: "2026-04-25"}},
	}
	_, _, err := svc.Create(context.Background(), p.ID, req)
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Status != 400 || appErr.Code != model.ErrCodeInvalidInput {
		t.Fatalf("expected 400, got %v", err)
	}
}

// 5. Create journal ref id 格式錯
func TestTaskSvc_Create_JournalRefBadFormat(t *testing.T) {
	svc, _, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	req := &dto.CreateTaskRequest{
		Title: "x",
		Refs:  []dto.TaskRefDTO{{RefType: "journal", RefID: "not-a-date"}},
	}
	_, _, err := svc.Create(context.Background(), p.ID, req)
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Code != model.ErrCodeInvalidInput {
		t.Fatalf("expected INVALID_INPUT, got %v", err)
	}
}

// 6. Create gcal_event ref 空字串
func TestTaskSvc_Create_GcalRefEmpty(t *testing.T) {
	svc, _, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	req := &dto.CreateTaskRequest{
		Title: "x",
		Refs:  []dto.TaskRefDTO{{RefType: "gcal_event", RefID: ""}},
	}
	_, _, err := svc.Create(context.Background(), p.ID, req)
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Code != model.ErrCodeInvalidInput {
		t.Fatalf("expected INVALID_INPUT, got %v", err)
	}
}

// 7. Create 對 archived 專案 → 400 PROJECT_ARCHIVED
func TestTaskSvc_Create_ProjectArchived(t *testing.T) {
	svc, _, pr, _, _ := newTaskSvc(t)
	id := uuid.New()
	pr.store[id] = &model.Project{ID: id, Name: "old", Status: model.ProjectStatusArchived}
	_, _, err := svc.Create(context.Background(), id, &dto.CreateTaskRequest{Title: "x"})
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Status != 400 || appErr.Code != model.ErrCodeProjectArchived {
		t.Fatalf("expected 400 PROJECT_ARCHIVED, got %v", err)
	}
}

// 8. Create project 不存在 → 404
func TestTaskSvc_Create_ProjectNotFound(t *testing.T) {
	svc, _, _, _, _ := newTaskSvc(t)
	_, _, err := svc.Create(context.Background(), uuid.New(), &dto.CreateTaskRequest{Title: "x"})
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Status != 404 || appErr.Code != model.ErrCodeProjectNotFound {
		t.Fatalf("expected 404 PROJECT_NOT_FOUND, got %v", err)
	}
}

// 9. Create title 過長 → 400
func TestTaskSvc_Create_TitleTooLong(t *testing.T) {
	svc, _, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	long := make([]byte, 201)
	for i := range long {
		long[i] = 'a'
	}
	_, _, err := svc.Create(context.Background(), p.ID, &dto.CreateTaskRequest{Title: string(long)})
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Code != model.ErrCodeInvalidInput {
		t.Fatalf("expected INVALID_INPUT, got %v", err)
	}
}

// 10. Create due_date 格式錯
func TestTaskSvc_Create_DueDateBadFormat(t *testing.T) {
	svc, _, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	bad := "2026/04/25"
	_, _, err := svc.Create(context.Background(), p.ID, &dto.CreateTaskRequest{
		Title: "x", DueDate: &bad,
	})
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Code != model.ErrCodeInvalidInput {
		t.Fatalf("expected INVALID_INPUT, got %v", err)
	}
}

// 11. Get 不存在 → 404
func TestTaskSvc_Get_NotFound(t *testing.T) {
	svc, _, _, _, _ := newTaskSvc(t)
	_, _, err := svc.Get(context.Background(), uuid.New())
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Status != 404 || appErr.Code != model.ErrCodeTaskNotFound {
		t.Fatalf("expected 404 TASK_NOT_FOUND, got %v", err)
	}
}

// 12. Update 不存在 → 404
func TestTaskSvc_Update_NotFound(t *testing.T) {
	svc, _, _, _, _ := newTaskSvc(t)
	tt := "x"
	_, _, err := svc.Update(context.Background(), uuid.New(), &dto.UpdateTaskRequest{Title: &tt})
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Status != 404 || appErr.Code != model.ErrCodeTaskNotFound {
		t.Fatalf("expected 404, got %v", err)
	}
}

// 13. Update done → todo 清 completed_at
func TestTaskSvc_Update_DoneToTodoClearsCompletedAt(t *testing.T) {
	svc, tr, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	now := time.Now()
	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "t",
		Status: model.TaskStatusDone, Priority: model.TaskPriorityNormal,
		CompletedAt: &now,
	}

	todo := model.TaskStatusTodo
	got, _, err := svc.Update(context.Background(), id, &dto.UpdateTaskRequest{Status: &todo})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got.CompletedAt != nil {
		t.Errorf("expected completed_at cleared, got %v", got.CompletedAt)
	}
	if got.Status != model.TaskStatusTodo {
		t.Errorf("status not updated, got %s", got.Status)
	}
}

// 14. Update todo → done 自動補 completed_at
func TestTaskSvc_Update_TodoToDoneSetsCompletedAt(t *testing.T) {
	svc, tr, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "t",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	done := model.TaskStatusDone
	got, _, err := svc.Update(context.Background(), id, &dto.UpdateTaskRequest{Status: &done})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got.CompletedAt == nil {
		t.Errorf("expected completed_at set")
	}
}

// 15. Update refs 整批覆寫
func TestTaskSvc_Update_RefsReplace(t *testing.T) {
	svc, tr, pr, rv, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	entryID := uuid.New()
	rv.entries[entryID] = true

	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "t",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	tr.refs[id] = []model.TaskRef{
		{TaskID: id, RefType: "gcal_event", RefID: "old-event"},
	}

	newRefs := []dto.TaskRefDTO{{RefType: "entry", RefID: entryID.String()}}
	_, refs, err := svc.Update(context.Background(), id, &dto.UpdateTaskRequest{Refs: &newRefs})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if len(refs) != 1 || refs[0].RefType != "entry" {
		t.Errorf("expected 1 entry ref, got %+v", refs)
	}
}

// 16. Update refs 空陣列 → 全清
func TestTaskSvc_Update_RefsEmptyClears(t *testing.T) {
	svc, tr, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "t",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	tr.refs[id] = []model.TaskRef{
		{TaskID: id, RefType: "gcal_event", RefID: "x"},
	}
	empty := []dto.TaskRefDTO{}
	_, refs, err := svc.Update(context.Background(), id, &dto.UpdateTaskRequest{Refs: &empty})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if len(refs) != 0 {
		t.Errorf("expected refs cleared, got %d", len(refs))
	}
}

// 17. Update position（拖放更新）
func TestTaskSvc_Update_Position(t *testing.T) {
	svc, tr, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "t",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
		Position: 0,
	}
	pos := 2
	inProg := model.TaskStatusInProgress
	got, _, err := svc.Update(context.Background(), id, &dto.UpdateTaskRequest{
		Status: &inProg, Position: &pos,
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got.Position != 2 || got.Status != model.TaskStatusInProgress {
		t.Errorf("expected pos=2 status=in_progress, got pos=%d status=%s", got.Position, got.Status)
	}
}

// 18. Complete 觸發 RecomputeProgress（4 tasks，1 done → complete 第 2 → 50）
func TestTaskSvc_Complete_RecomputesProgress(t *testing.T) {
	svc, tr, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	// 模擬已有 4 tasks（service test 直接餵到 fakeProjectRepo.taskByStat）
	pr.taskByStat[p.ID] = map[string]int{"todo": 3, "done": 1}

	// 我們要 complete 第 2 個 task：先建一個 todo task，之後 complete
	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "t2",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	// Complete 之後 byStat 改為 todo:2 done:2 → progress=50
	originalProgress := pr.store[p.ID].Progress
	_ = originalProgress

	// hook 進 fake：complete 後我們手動改 byStat（service 呼叫 RecomputeProgress 時會用此計算）
	// 但 fake 的 RecomputeProgress 直接讀 byStat；我們改成先把 byStat 改成終態，
	// 然後驗證 RecomputeProgress 被呼叫（即 progress 被更新成期望值）
	pr.taskByStat[p.ID] = map[string]int{"todo": 2, "done": 2}

	got, err := svc.Complete(context.Background(), id)
	if err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if got.Status != model.TaskStatusDone || got.CompletedAt == nil {
		t.Errorf("expected status=done with completed_at, got %+v", got)
	}
	if pr.store[p.ID].Progress != 50 {
		t.Errorf("expected project.progress=50, got %d", pr.store[p.ID].Progress)
	}
}

// 19. Complete 已是 done 的 task 不重複設 completed_at（idempotent-ish）
func TestTaskSvc_Complete_AlreadyDone(t *testing.T) {
	svc, tr, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	old := time.Now().Add(-time.Hour)
	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "t",
		Status: model.TaskStatusDone, Priority: model.TaskPriorityNormal,
		CompletedAt: &old,
	}
	got, err := svc.Complete(context.Background(), id)
	if err != nil {
		t.Fatalf("Complete: %v", err)
	}
	// completedAt 不被覆蓋（保持原始值）
	if !got.CompletedAt.Equal(old) {
		t.Errorf("expected completed_at unchanged when already done, got %v vs %v", got.CompletedAt, old)
	}
}

// 20. Complete on archived project 仍可執行（Edge：archived 後完成 task 仍 recompute progress）
func TestTaskSvc_Complete_OnArchivedProject(t *testing.T) {
	svc, tr, pr, _, _ := newTaskSvc(t)
	id := uuid.New()
	pid := uuid.New()
	pr.store[pid] = &model.Project{ID: pid, Name: "old", Status: model.ProjectStatusArchived}
	pr.taskByStat[pid] = map[string]int{"done": 1}
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: pid, Title: "t",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	if _, err := svc.Complete(context.Background(), id); err != nil {
		t.Fatalf("Complete on archived should succeed, got %v", err)
	}
	if pr.store[pid].Progress != 100 {
		t.Errorf("expected progress=100 (1/1 done), got %d", pr.store[pid].Progress)
	}
}

// 21. Delete 不存在 → 404
func TestTaskSvc_Delete_NotFound(t *testing.T) {
	svc, _, _, _, _ := newTaskSvc(t)
	err := svc.Delete(context.Background(), uuid.New())
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Status != 404 {
		t.Fatalf("expected 404, got %v", err)
	}
}

// 22. Delete 後 RecomputeProgress 被呼叫
func TestTaskSvc_Delete_RecomputesProgress(t *testing.T) {
	svc, tr, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "t",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	pr.taskByStat[p.ID] = map[string]int{"todo": 1, "done": 1}
	// 假設 Delete 後 byStat 改成
	pr.taskByStat[p.ID] = map[string]int{"done": 1}
	if err := svc.Delete(context.Background(), id); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if pr.store[p.ID].Progress != 100 {
		t.Errorf("expected progress=100, got %d", pr.store[p.ID].Progress)
	}
}

// 23. ListByProject project 不存在 → 404
func TestTaskSvc_List_ProjectNotFound(t *testing.T) {
	svc, _, _, _, _ := newTaskSvc(t)
	_, err := svc.ListByProject(context.Background(), uuid.New(), nil)
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Status != 404 {
		t.Fatalf("expected 404, got %v", err)
	}
}

// 24. ListUpcoming days < 0 → 400
func TestTaskSvc_Upcoming_NegativeDays(t *testing.T) {
	svc, _, _, _, _ := newTaskSvc(t)
	_, err := svc.ListUpcoming(context.Background(), -1)
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Code != model.ErrCodeInvalidInput {
		t.Fatalf("expected INVALID_INPUT, got %v", err)
	}
}

// 25. ListUpcoming days > 365 → 400
func TestTaskSvc_Upcoming_DaysTooLarge(t *testing.T) {
	svc, _, _, _, _ := newTaskSvc(t)
	_, err := svc.ListUpcoming(context.Background(), 9999)
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Code != model.ErrCodeInvalidInput {
		t.Fatalf("expected INVALID_INPUT, got %v", err)
	}
}

// 26. ListUpcoming 回傳 repo 結果
func TestTaskSvc_Upcoming_Pass(t *testing.T) {
	svc, tr, _, _, _ := newTaskSvc(t)
	now := time.Now()
	tr.upcoming = []*model.Task{
		{ID: uuid.New(), Title: "a", DueDate: &now},
		{ID: uuid.New(), Title: "b", DueDate: &now},
		{ID: uuid.New(), Title: "c", DueDate: &now},
	}
	got, err := svc.ListUpcoming(context.Background(), 7)
	if err != nil {
		t.Fatalf("ListUpcoming: %v", err)
	}
	if len(got) != 3 {
		t.Errorf("expected 3, got %d", len(got))
	}
}

// 27. ListOverdue 回傳 repo 結果
func TestTaskSvc_Overdue_Pass(t *testing.T) {
	svc, tr, _, _, _ := newTaskSvc(t)
	tr.overdue = []*model.Task{{ID: uuid.New(), Title: "old"}}
	got, err := svc.ListOverdue(context.Background())
	if err != nil {
		t.Fatalf("ListOverdue: %v", err)
	}
	if len(got) != 1 {
		t.Errorf("expected 1, got %d", len(got))
	}
}

// 28. Create status 不合法
func TestTaskSvc_Create_BadStatus(t *testing.T) {
	svc, _, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	bad := "wrong"
	_, _, err := svc.Create(context.Background(), p.ID, &dto.CreateTaskRequest{
		Title: "x", Status: &bad,
	})
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Code != model.ErrCodeInvalidInput {
		t.Fatalf("expected INVALID_INPUT, got %v", err)
	}
}

// 29. Update bad status
func TestTaskSvc_Update_BadStatus(t *testing.T) {
	svc, tr, pr, _, _ := newTaskSvc(t)
	p := seedActiveProject(pr)
	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "t",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	bad := "wrong"
	_, _, err := svc.Update(context.Background(), id, &dto.UpdateTaskRequest{Status: &bad})
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Code != model.ErrCodeInvalidInput {
		t.Fatalf("expected INVALID_INPUT, got %v", err)
	}
}
