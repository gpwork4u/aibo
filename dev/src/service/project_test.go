package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
)

// ─── Fake ProjectRepository ────────────────────────────────────────────

type fakeProjectRepo struct {
	store map[uuid.UUID]*model.Project

	createErr error
	updateErr error
	deleteErr error

	taskCounts map[uuid.UUID]int            // for CountTasks total
	taskByStat map[uuid.UUID]map[string]int // for CountTasks by status
}

func newFakeProjectRepo() *fakeProjectRepo {
	return &fakeProjectRepo{
		store:      map[uuid.UUID]*model.Project{},
		taskCounts: map[uuid.UUID]int{},
		taskByStat: map[uuid.UUID]map[string]int{},
	}
}

func (r *fakeProjectRepo) Create(ctx context.Context, p *model.Project) error {
	if r.createErr != nil {
		return r.createErr
	}
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	now := time.Now()
	p.CreatedAt = now
	p.UpdatedAt = now
	if p.Status == "" {
		p.Status = model.ProjectStatusActive
	}
	if p.Color == "" {
		p.Color = "#3b82f6"
	}
	r.store[p.ID] = p
	return nil
}

func (r *fakeProjectRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Project, error) {
	p, ok := r.store[id]
	if !ok {
		return nil, model.NewAppError(404, model.ErrCodeProjectNotFound, "專案不存在")
	}
	cp := *p
	return &cp, nil
}

func (r *fakeProjectRepo) List(
	ctx context.Context, opts repository.ProjectListOptions,
) ([]*model.Project, int64, error) {
	items := make([]*model.Project, 0)
	for _, p := range r.store {
		if opts.Status != nil && p.Status != *opts.Status {
			continue
		}
		cp := *p
		items = append(items, &cp)
	}
	return items, int64(len(items)), nil
}

func (r *fakeProjectRepo) Update(ctx context.Context, p *model.Project) error {
	if r.updateErr != nil {
		return r.updateErr
	}
	if _, ok := r.store[p.ID]; !ok {
		return model.NewAppError(404, model.ErrCodeProjectNotFound, "專案不存在")
	}
	p.UpdatedAt = time.Now()
	cp := *p
	r.store[p.ID] = &cp
	return nil
}

func (r *fakeProjectRepo) Delete(ctx context.Context, id uuid.UUID) error {
	if r.deleteErr != nil {
		return r.deleteErr
	}
	if _, ok := r.store[id]; !ok {
		return model.NewAppError(404, model.ErrCodeProjectNotFound, "專案不存在")
	}
	delete(r.store, id)
	delete(r.taskCounts, id)
	delete(r.taskByStat, id)
	return nil
}

func (r *fakeProjectRepo) CountTasks(
	ctx context.Context, projectID uuid.UUID,
) (int, map[string]int, error) {
	by := r.taskByStat[projectID]
	if by == nil {
		by = map[string]int{}
	}
	return r.taskCounts[projectID], by, nil
}

func (r *fakeProjectRepo) RecomputeProgress(
	ctx context.Context, projectID uuid.UUID,
) (int, error) {
	p, ok := r.store[projectID]
	if !ok {
		return 0, model.NewAppError(404, model.ErrCodeProjectNotFound, "專案不存在")
	}
	by := r.taskByStat[projectID]
	done := by["done"]
	total := 0
	for status, c := range by {
		if status != "cancelled" {
			total += c
		}
	}
	prog := 0
	if total > 0 {
		prog = (100*done + total/2) / total
	}
	p.Progress = prog
	return prog, nil
}

// ─── Fake TaskRepository（最小） ─────────────────────────────────────────

type fakeTaskRepoMin struct {
	countByProj map[uuid.UUID]int
}

func (r *fakeTaskRepoMin) Create(ctx context.Context, t *model.Task, refs []model.TaskRef) error {
	return nil
}
func (r *fakeTaskRepoMin) FindByID(ctx context.Context, id uuid.UUID) (*model.Task, []model.TaskRef, error) {
	return nil, nil, nil
}
func (r *fakeTaskRepoMin) ListByProject(ctx context.Context, projectID uuid.UUID, statusFilter []string) ([]*model.Task, error) {
	return nil, nil
}
func (r *fakeTaskRepoMin) Update(ctx context.Context, t *model.Task) error          { return nil }
func (r *fakeTaskRepoMin) ReplaceRefs(ctx context.Context, taskID uuid.UUID, refs []model.TaskRef) error {
	return nil
}
func (r *fakeTaskRepoMin) Delete(ctx context.Context, id uuid.UUID) error           { return nil }
func (r *fakeTaskRepoMin) ListUpcoming(ctx context.Context, days int) ([]*model.Task, error) {
	return nil, nil
}
func (r *fakeTaskRepoMin) ListOverdue(ctx context.Context) ([]*model.Task, error) {
	return nil, nil
}
func (r *fakeTaskRepoMin) CountByProject(ctx context.Context, projectID uuid.UUID) (int, error) {
	return r.countByProj[projectID], nil
}
func (r *fakeTaskRepoMin) GetRefs(ctx context.Context, taskID uuid.UUID) ([]model.TaskRef, error) {
	return nil, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────

func newProjectSvc() (*ProjectService, *fakeProjectRepo, *fakeTaskRepoMin) {
	pr := newFakeProjectRepo()
	tr := &fakeTaskRepoMin{countByProj: map[uuid.UUID]int{}}
	return NewProjectService(pr, tr), pr, tr
}

func strPtr(s string) *string { return &s }

// ─── Tests ────────────────────────────────────────────────────────────

// Scenario: 建立 project（happy path）
func TestProjectSvc_Create_HappyPath(t *testing.T) {
	svc, _, _ := newProjectSvc()
	req := &dto.CreateProjectRequest{
		Name:      "aibo v2",
		StartDate: strPtr("2026-04-01"),
		EndDate:   strPtr("2026-06-30"),
	}
	p, err := svc.Create(context.Background(), req)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if p.Status != model.ProjectStatusActive {
		t.Errorf("expected status=active, got %s", p.Status)
	}
	if p.Progress != 0 {
		t.Errorf("expected progress=0, got %d", p.Progress)
	}
	if p.StartDate == nil || p.StartDate.Format("2006-01-02") != "2026-04-01" {
		t.Errorf("start_date wrong: %v", p.StartDate)
	}
}

// Scenario: end_date 早於 start_date
func TestProjectSvc_Create_EndBeforeStart(t *testing.T) {
	svc, _, _ := newProjectSvc()
	req := &dto.CreateProjectRequest{
		Name:      "x",
		StartDate: strPtr("2026-06-01"),
		EndDate:   strPtr("2026-04-01"),
	}
	_, err := svc.Create(context.Background(), req)
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != 400 || appErr.Code != model.ErrCodeInvalidInput {
		t.Errorf("expected 400 INVALID_INPUT, got %+v", appErr)
	}
}

// Scenario: 重名專案被拒（透過 repo 模擬 PgErr 已轉成 AppError）
func TestProjectSvc_Create_NameDuplicate(t *testing.T) {
	svc, repo, _ := newProjectSvc()
	repo.createErr = model.NewAppError(409, model.ErrCodeProjectNameDuplicate, "已有同名專案")
	_, err := svc.Create(context.Background(), &dto.CreateProjectRequest{Name: "Aibo V2"})
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != 409 || appErr.Code != model.ErrCodeProjectNameDuplicate {
		t.Errorf("expected 409 PROJECT_NAME_DUPLICATE, got %+v", appErr)
	}
}

// Scenario: name 長度超過 80
func TestProjectSvc_Create_NameTooLong(t *testing.T) {
	svc, _, _ := newProjectSvc()
	long := make([]byte, 81)
	for i := range long {
		long[i] = 'a'
	}
	_, err := svc.Create(context.Background(), &dto.CreateProjectRequest{Name: string(long)})
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Code != model.ErrCodeInvalidInput {
		t.Errorf("expected INVALID_INPUT, got %s", appErr.Code)
	}
}

// Scenario: Get 不存在 → 404
func TestProjectSvc_Get_NotFound(t *testing.T) {
	svc, _, _ := newProjectSvc()
	_, _, err := svc.Get(context.Background(), uuid.New())
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != 404 || appErr.Code != model.ErrCodeProjectNotFound {
		t.Errorf("expected 404 PROJECT_NOT_FOUND, got %+v", appErr)
	}
}

// Scenario: Get 包含 task_counts
func TestProjectSvc_Get_WithTaskCounts(t *testing.T) {
	svc, repo, _ := newProjectSvc()
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "x", Status: "active"}
	repo.taskCounts[id] = 3
	repo.taskByStat[id] = map[string]int{"todo": 2, "done": 1}

	p, counts, err := svc.Get(context.Background(), id)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if p.ID != id {
		t.Error("wrong project")
	}
	if counts.Total != 3 || counts.ByStatus["done"] != 1 || counts.ByStatus["todo"] != 2 {
		t.Errorf("counts wrong: %+v", counts)
	}
}

// Scenario: List with status filter
func TestProjectSvc_List_StatusFilter(t *testing.T) {
	svc, repo, _ := newProjectSvc()
	repo.store[uuid.New()] = &model.Project{ID: uuid.New(), Name: "a", Status: "active"}
	repo.store[uuid.New()] = &model.Project{ID: uuid.New(), Name: "b", Status: "active"}
	repo.store[uuid.New()] = &model.Project{ID: uuid.New(), Name: "c", Status: "archived"}

	active := model.ProjectStatusActive
	items, total, err := svc.List(context.Background(), repository.ProjectListOptions{
		Status: &active,
	})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if total != 2 || len(items) != 2 {
		t.Errorf("expected 2 active, got total=%d len=%d", total, len(items))
	}
	for _, p := range items {
		if p.Status != "active" {
			t.Errorf("got non-active project: %s", p.Status)
		}
	}
}

// Scenario: Update 不存在 → 404
func TestProjectSvc_Update_NotFound(t *testing.T) {
	svc, _, _ := newProjectSvc()
	name := "new name"
	_, err := svc.Update(context.Background(), uuid.New(), &dto.UpdateProjectRequest{Name: &name})
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != 404 || appErr.Code != model.ErrCodeProjectNotFound {
		t.Errorf("expected 404, got %+v", appErr)
	}
}

// Scenario: Update 修改 name + 日期區間
func TestProjectSvc_Update_OK(t *testing.T) {
	svc, repo, _ := newProjectSvc()
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "old", Status: "active"}

	newName := "new"
	end := strPtr("2026-12-31")
	patch := &dto.UpdateProjectRequest{
		Name:    &newName,
		EndDate: &end,
	}
	p, err := svc.Update(context.Background(), id, patch)
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if p.Name != "new" {
		t.Errorf("name not updated: %s", p.Name)
	}
	if p.EndDate == nil || p.EndDate.Format("2006-01-02") != "2026-12-31" {
		t.Errorf("end_date not updated: %v", p.EndDate)
	}
}

// Scenario: Update 中 end_date 早於 start_date（合併後）→ 400
func TestProjectSvc_Update_DateRangeInvalid(t *testing.T) {
	svc, repo, _ := newProjectSvc()
	id := uuid.New()
	start := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "active", StartDate: &start}

	end := strPtr("2026-04-01")
	patch := &dto.UpdateProjectRequest{EndDate: &end}
	_, err := svc.Update(context.Background(), id, patch)
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != 400 || appErr.Code != model.ErrCodeInvalidInput {
		t.Errorf("expected 400 INVALID_INPUT, got %+v", appErr)
	}
}

// Scenario: Update description 設為 NULL（**string 內層 nil）
func TestProjectSvc_Update_DescriptionToNull(t *testing.T) {
	svc, repo, _ := newProjectSvc()
	id := uuid.New()
	desc := "initial"
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "active", Description: &desc}

	var nullDesc *string // nil
	patch := &dto.UpdateProjectRequest{Description: &nullDesc}
	p, err := svc.Update(context.Background(), id, patch)
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if p.Description != nil {
		t.Errorf("expected description=nil, got %v", *p.Description)
	}
}

// Scenario: 刪除有 task 的專案（無 force）→ 409 PROJECT_HAS_TASKS
func TestProjectSvc_Delete_HasTasks(t *testing.T) {
	svc, repo, taskRepo := newProjectSvc()
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "active"}
	taskRepo.countByProj[id] = 3

	err := svc.Delete(context.Background(), id, false)
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != 409 || appErr.Code != model.ErrCodeProjectHasTasks {
		t.Errorf("expected 409 PROJECT_HAS_TASKS, got %+v", appErr)
	}
	// 專案不應被刪
	if _, ok := repo.store[id]; !ok {
		t.Error("project should not be deleted on 409")
	}
}

// Scenario: 強制刪除（force=true）即使有 task
func TestProjectSvc_Delete_Force(t *testing.T) {
	svc, repo, taskRepo := newProjectSvc()
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "active"}
	taskRepo.countByProj[id] = 5

	if err := svc.Delete(context.Background(), id, true); err != nil {
		t.Fatalf("Delete force: %v", err)
	}
	if _, ok := repo.store[id]; ok {
		t.Error("project should be deleted with force=true")
	}
}

// Scenario: 刪除無 task 的專案
func TestProjectSvc_Delete_NoTasks(t *testing.T) {
	svc, repo, _ := newProjectSvc()
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "active"}

	if err := svc.Delete(context.Background(), id, false); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if _, ok := repo.store[id]; ok {
		t.Error("project should be deleted")
	}
}

// Scenario: Delete 不存在 → 404
func TestProjectSvc_Delete_NotFound(t *testing.T) {
	svc, _, _ := newProjectSvc()
	err := svc.Delete(context.Background(), uuid.New(), false)
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != 404 || appErr.Code != model.ErrCodeProjectNotFound {
		t.Errorf("expected 404 PROJECT_NOT_FOUND, got %+v", appErr)
	}
}

// Scenario: Archive 將 status 設為 archived
func TestProjectSvc_Archive_OK(t *testing.T) {
	svc, repo, _ := newProjectSvc()
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "active"}

	p, err := svc.Archive(context.Background(), id)
	if err != nil {
		t.Fatalf("Archive: %v", err)
	}
	if p.Status != model.ProjectStatusArchived {
		t.Errorf("expected status=archived, got %s", p.Status)
	}
}

// Scenario: Archive 已是 archived（idempotent）
func TestProjectSvc_Archive_Idempotent(t *testing.T) {
	svc, repo, _ := newProjectSvc()
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "archived"}
	p, err := svc.Archive(context.Background(), id)
	if err != nil {
		t.Fatalf("Archive: %v", err)
	}
	if p.Status != model.ProjectStatusArchived {
		t.Errorf("expected archived, got %s", p.Status)
	}
}

// Scenario: Archive 不存在 → 404
func TestProjectSvc_Archive_NotFound(t *testing.T) {
	svc, _, _ := newProjectSvc()
	_, err := svc.Archive(context.Background(), uuid.New())
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != 404 {
		t.Errorf("expected 404, got %+v", appErr)
	}
}

// Edge: 專案下無 task 時 progress = 0
func TestProjectSvc_Get_NoTasks_ProgressZero(t *testing.T) {
	svc, repo, _ := newProjectSvc()
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "active", Progress: 0}
	// taskCounts/taskByStat 空

	p, counts, err := svc.Get(context.Background(), id)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if p.Progress != 0 {
		t.Errorf("expected progress=0, got %d", p.Progress)
	}
	if counts.Total != 0 {
		t.Errorf("expected total=0, got %d", counts.Total)
	}
}

// Edge: 全部 task 都 cancelled → progress = 0（透過 RecomputeProgress）
func TestProjectSvc_RecomputeProgress_AllCancelled(t *testing.T) {
	svc, repo, _ := newProjectSvc()
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "active"}
	repo.taskByStat[id] = map[string]int{"cancelled": 3}

	prog, err := svc.RecomputeProgress(context.Background(), id)
	if err != nil {
		t.Fatalf("Recompute: %v", err)
	}
	if prog != 0 {
		t.Errorf("expected progress=0, got %d", prog)
	}
}
