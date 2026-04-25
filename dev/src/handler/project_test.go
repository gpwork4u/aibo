package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/gpwork4u/aibo/service"
)

// ─── Fake ProjectRepository（與 service test 形狀一致） ─────────────────────

type fakeProjectRepoH struct {
	store     map[uuid.UUID]*model.Project
	createErr error
	updateErr error

	taskCounts map[uuid.UUID]int
	taskByStat map[uuid.UUID]map[string]int
}

func newFakeProjectRepoH() *fakeProjectRepoH {
	return &fakeProjectRepoH{
		store:      map[uuid.UUID]*model.Project{},
		taskCounts: map[uuid.UUID]int{},
		taskByStat: map[uuid.UUID]map[string]int{},
	}
}

func (r *fakeProjectRepoH) Create(_ context.Context, p *model.Project) error {
	if r.createErr != nil {
		return r.createErr
	}
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	now := time.Now()
	p.CreatedAt = now
	p.UpdatedAt = now
	if p.Color == "" {
		p.Color = "#3b82f6"
	}
	r.store[p.ID] = p
	return nil
}
func (r *fakeProjectRepoH) FindByID(_ context.Context, id uuid.UUID) (*model.Project, error) {
	p, ok := r.store[id]
	if !ok {
		return nil, model.NewAppError(404, model.ErrCodeProjectNotFound, "專案不存在")
	}
	cp := *p
	return &cp, nil
}
func (r *fakeProjectRepoH) List(
	_ context.Context, opts repository.ProjectListOptions,
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
func (r *fakeProjectRepoH) Update(_ context.Context, p *model.Project) error {
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
func (r *fakeProjectRepoH) Delete(_ context.Context, id uuid.UUID) error {
	if _, ok := r.store[id]; !ok {
		return model.NewAppError(404, model.ErrCodeProjectNotFound, "專案不存在")
	}
	delete(r.store, id)
	return nil
}
func (r *fakeProjectRepoH) CountTasks(_ context.Context, id uuid.UUID) (int, map[string]int, error) {
	by := r.taskByStat[id]
	if by == nil {
		by = map[string]int{}
	}
	return r.taskCounts[id], by, nil
}
func (r *fakeProjectRepoH) RecomputeProgress(_ context.Context, _ uuid.UUID) (int, error) {
	return 0, nil
}

// ─── Fake TaskRepository ────────────────────────────────────────────────────

type fakeTaskRepoH struct {
	countByProj map[uuid.UUID]int
}

func (r *fakeTaskRepoH) Create(_ context.Context, _ *model.Task, _ []model.TaskRef) error {
	return nil
}
func (r *fakeTaskRepoH) FindByID(_ context.Context, _ uuid.UUID) (*model.Task, []model.TaskRef, error) {
	return nil, nil, nil
}
func (r *fakeTaskRepoH) ListByProject(_ context.Context, _ uuid.UUID, _ []string) ([]*model.Task, error) {
	return nil, nil
}
func (r *fakeTaskRepoH) Update(_ context.Context, _ *model.Task) error { return nil }
func (r *fakeTaskRepoH) ReplaceRefs(_ context.Context, _ uuid.UUID, _ []model.TaskRef) error {
	return nil
}
func (r *fakeTaskRepoH) Delete(_ context.Context, _ uuid.UUID) error { return nil }
func (r *fakeTaskRepoH) ListUpcoming(_ context.Context, _ int) ([]*model.Task, error) {
	return nil, nil
}
func (r *fakeTaskRepoH) ListOverdue(_ context.Context) ([]*model.Task, error) {
	return nil, nil
}
func (r *fakeTaskRepoH) CountByProject(_ context.Context, id uuid.UUID) (int, error) {
	return r.countByProj[id], nil
}
func (r *fakeTaskRepoH) GetRefs(_ context.Context, _ uuid.UUID) ([]model.TaskRef, error) {
	return nil, nil
}

// ─── helper ─────────────────────────────────────────────────────────────────

func newProjectTestRouter(t *testing.T) (*gin.Engine, *fakeProjectRepoH, *fakeTaskRepoH) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	pr := newFakeProjectRepoH()
	tr := &fakeTaskRepoH{countByProj: map[uuid.UUID]int{}}
	svc := service.NewProjectService(pr, tr)
	h := NewProjectHandler(svc)

	r := gin.New()
	g := r.Group("/api/v1/projects")
	g.GET("", h.List)
	g.POST("", h.Create)
	g.GET("/:id", h.GetByID)
	g.PATCH("/:id", h.Update)
	g.DELETE("/:id", h.Delete)
	g.POST("/:id/archive", h.Archive)
	return r, pr, tr
}

func doProjReq(r *gin.Engine, method, path string, body any) *httptest.ResponseRecorder {
	var buf *bytes.Buffer
	if body != nil {
		b, _ := json.Marshal(body)
		buf = bytes.NewBuffer(b)
	} else {
		buf = bytes.NewBuffer(nil)
	}
	req := httptest.NewRequest(method, path, buf)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ─── Tests ──────────────────────────────────────────────────────────────────

func TestProjectHandler_Create_201(t *testing.T) {
	r, _, _ := newProjectTestRouter(t)
	body := dto.CreateProjectRequest{Name: "aibo v2"}
	w := doProjReq(r, http.MethodPost, "/api/v1/projects", body)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", w.Code, w.Body.String())
	}
	var resp dto.ProjectResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Name != "aibo v2" {
		t.Errorf("name wrong: %s", resp.Name)
	}
	if resp.Status != model.ProjectStatusActive {
		t.Errorf("default status should be active, got %s", resp.Status)
	}
	if resp.Progress != 0 {
		t.Errorf("progress should be 0, got %d", resp.Progress)
	}
}

func TestProjectHandler_Create_400_NameEmpty(t *testing.T) {
	r, _, _ := newProjectTestRouter(t)
	w := doProjReq(r, http.MethodPost, "/api/v1/projects", map[string]any{"name": ""})
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_Create_400_BadStatus(t *testing.T) {
	r, _, _ := newProjectTestRouter(t)
	w := doProjReq(r, http.MethodPost, "/api/v1/projects",
		map[string]any{"name": "x", "status": "weird"})
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_Create_409_NameDuplicate(t *testing.T) {
	r, repo, _ := newProjectTestRouter(t)
	repo.createErr = model.NewAppError(409, model.ErrCodeProjectNameDuplicate, "已有同名專案")
	w := doProjReq(r, http.MethodPost, "/api/v1/projects",
		dto.CreateProjectRequest{Name: "dup"})
	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d", w.Code)
	}
	var er dto.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &er)
	if er.Code != model.ErrCodeProjectNameDuplicate {
		t.Errorf("expected PROJECT_NAME_DUPLICATE, got %s", er.Code)
	}
}

func TestProjectHandler_Get_200(t *testing.T) {
	r, repo, _ := newProjectTestRouter(t)
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "active"}
	repo.taskCounts[id] = 2
	repo.taskByStat[id] = map[string]int{"todo": 2}

	w := doProjReq(r, http.MethodGet, "/api/v1/projects/"+id.String(), nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp dto.ProjectResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.TaskCounts == nil || resp.TaskCounts.Total != 2 {
		t.Errorf("task_counts wrong: %+v", resp.TaskCounts)
	}
}

func TestProjectHandler_Get_404(t *testing.T) {
	r, _, _ := newProjectTestRouter(t)
	w := doProjReq(r, http.MethodGet, "/api/v1/projects/"+uuid.New().String(), nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
	var er dto.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &er)
	if er.Code != model.ErrCodeProjectNotFound {
		t.Errorf("expected PROJECT_NOT_FOUND, got %s", er.Code)
	}
}

func TestProjectHandler_Get_400_BadUUID(t *testing.T) {
	r, _, _ := newProjectTestRouter(t)
	w := doProjReq(r, http.MethodGet, "/api/v1/projects/not-a-uuid", nil)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_List_200(t *testing.T) {
	r, repo, _ := newProjectTestRouter(t)
	repo.store[uuid.New()] = &model.Project{ID: uuid.New(), Name: "a", Status: "active"}
	repo.store[uuid.New()] = &model.Project{ID: uuid.New(), Name: "b", Status: "archived"}

	// 預設 status=active
	w := doProjReq(r, http.MethodGet, "/api/v1/projects", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp dto.ListProjectsResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Data) != 1 {
		t.Errorf("expected 1 active, got %d", len(resp.Data))
	}
}

func TestProjectHandler_List_All(t *testing.T) {
	r, repo, _ := newProjectTestRouter(t)
	repo.store[uuid.New()] = &model.Project{ID: uuid.New(), Name: "a", Status: "active"}
	repo.store[uuid.New()] = &model.Project{ID: uuid.New(), Name: "b", Status: "archived"}

	w := doProjReq(r, http.MethodGet, "/api/v1/projects?status=all", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp dto.ListProjectsResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Data) != 2 {
		t.Errorf("expected 2, got %d", len(resp.Data))
	}
}

func TestProjectHandler_List_400_BadStatus(t *testing.T) {
	r, _, _ := newProjectTestRouter(t)
	w := doProjReq(r, http.MethodGet, "/api/v1/projects?status=weird", nil)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_Update_200(t *testing.T) {
	r, repo, _ := newProjectTestRouter(t)
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "old", Status: "active"}

	w := doProjReq(r, http.MethodPatch, "/api/v1/projects/"+id.String(),
		map[string]any{"name": "new"})
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}
	var resp dto.ProjectResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Name != "new" {
		t.Errorf("name not updated: %s", resp.Name)
	}
}

func TestProjectHandler_Update_404(t *testing.T) {
	r, _, _ := newProjectTestRouter(t)
	w := doProjReq(r, http.MethodPatch, "/api/v1/projects/"+uuid.New().String(),
		map[string]any{"name": "x"})
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestProjectHandler_Delete_204(t *testing.T) {
	r, repo, _ := newProjectTestRouter(t)
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "active"}

	w := doProjReq(r, http.MethodDelete, "/api/v1/projects/"+id.String(), nil)
	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d body=%s", w.Code, w.Body.String())
	}
	if _, ok := repo.store[id]; ok {
		t.Error("project should be deleted")
	}
}

func TestProjectHandler_Delete_409_HasTasks(t *testing.T) {
	r, repo, taskRepo := newProjectTestRouter(t)
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "active"}
	taskRepo.countByProj[id] = 3

	w := doProjReq(r, http.MethodDelete, "/api/v1/projects/"+id.String(), nil)
	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", w.Code, w.Body.String())
	}
	var er dto.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &er)
	if er.Code != model.ErrCodeProjectHasTasks {
		t.Errorf("expected PROJECT_HAS_TASKS, got %s", er.Code)
	}
}

func TestProjectHandler_Delete_Force_204(t *testing.T) {
	r, repo, taskRepo := newProjectTestRouter(t)
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "active"}
	taskRepo.countByProj[id] = 5

	w := doProjReq(r, http.MethodDelete, "/api/v1/projects/"+id.String()+"?force=true", nil)
	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d body=%s", w.Code, w.Body.String())
	}
	if _, ok := repo.store[id]; ok {
		t.Error("project should be deleted with force=true")
	}
}

func TestProjectHandler_Delete_404(t *testing.T) {
	r, _, _ := newProjectTestRouter(t)
	w := doProjReq(r, http.MethodDelete, "/api/v1/projects/"+uuid.New().String(), nil)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestProjectHandler_Archive_200(t *testing.T) {
	r, repo, _ := newProjectTestRouter(t)
	id := uuid.New()
	repo.store[id] = &model.Project{ID: id, Name: "p", Status: "active"}

	w := doProjReq(r, http.MethodPost, "/api/v1/projects/"+id.String()+"/archive", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}
	var resp dto.ProjectResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Status != model.ProjectStatusArchived {
		t.Errorf("expected status=archived, got %s", resp.Status)
	}
}

func TestProjectHandler_Archive_404(t *testing.T) {
	r, _, _ := newProjectTestRouter(t)
	w := doProjReq(r, http.MethodPost, "/api/v1/projects/"+uuid.New().String()+"/archive", nil)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}
