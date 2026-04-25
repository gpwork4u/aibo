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
	"github.com/gpwork4u/aibo/service"
)

// ─── Fakes ─────────────────────────────────────────────────────────────

type fakeTaskRepoFull struct {
	tasks    map[uuid.UUID]*model.Task
	refs     map[uuid.UUID][]model.TaskRef
	upcoming []*model.Task
	overdue  []*model.Task
}

func newFakeTaskRepoFull() *fakeTaskRepoFull {
	return &fakeTaskRepoFull{
		tasks: map[uuid.UUID]*model.Task{},
		refs:  map[uuid.UUID][]model.TaskRef{},
	}
}

func (r *fakeTaskRepoFull) Create(_ context.Context, t *model.Task, refs []model.TaskRef) error {
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
func (r *fakeTaskRepoFull) FindByID(_ context.Context, id uuid.UUID) (*model.Task, []model.TaskRef, error) {
	t, ok := r.tasks[id]
	if !ok {
		return nil, nil, model.NewAppError(404, model.ErrCodeTaskNotFound, "任務不存在")
	}
	cp := *t
	refs := append([]model.TaskRef(nil), r.refs[id]...)
	return &cp, refs, nil
}
func (r *fakeTaskRepoFull) ListByProject(_ context.Context, projectID uuid.UUID, statusFilter []string) ([]*model.Task, error) {
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
func (r *fakeTaskRepoFull) Update(_ context.Context, t *model.Task) error {
	if _, ok := r.tasks[t.ID]; !ok {
		return model.NewAppError(404, model.ErrCodeTaskNotFound, "任務不存在")
	}
	t.UpdatedAt = time.Now()
	cp := *t
	r.tasks[t.ID] = &cp
	return nil
}
func (r *fakeTaskRepoFull) ReplaceRefs(_ context.Context, taskID uuid.UUID, refs []model.TaskRef) error {
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
func (r *fakeTaskRepoFull) Delete(_ context.Context, id uuid.UUID) error {
	if _, ok := r.tasks[id]; !ok {
		return model.NewAppError(404, model.ErrCodeTaskNotFound, "任務不存在")
	}
	delete(r.tasks, id)
	delete(r.refs, id)
	return nil
}
func (r *fakeTaskRepoFull) ListUpcoming(_ context.Context, _ int) ([]*model.Task, error) {
	return r.upcoming, nil
}
func (r *fakeTaskRepoFull) ListOverdue(_ context.Context) ([]*model.Task, error) {
	return r.overdue, nil
}
func (r *fakeTaskRepoFull) CountByProject(_ context.Context, projectID uuid.UUID) (int, error) {
	c := 0
	for _, t := range r.tasks {
		if t.ProjectID == projectID {
			c++
		}
	}
	return c, nil
}
func (r *fakeTaskRepoFull) GetRefs(_ context.Context, taskID uuid.UUID) ([]model.TaskRef, error) {
	return append([]model.TaskRef(nil), r.refs[taskID]...), nil
}

type fakeRefValidatorH struct {
	entries map[uuid.UUID]bool
}

func (v *fakeRefValidatorH) EntryExists(_ context.Context, id uuid.UUID) (bool, error) {
	return v.entries[id], nil
}
func (v *fakeRefValidatorH) JournalExistsByDate(_ context.Context, _ time.Time) (bool, error) {
	return false, nil
}

// ─── Helper：建 router with task handler ────────────────────────────────

func newTaskTestRouter(t *testing.T) (
	*gin.Engine,
	*fakeProjectRepoH,
	*fakeTaskRepoFull,
	*fakeRefValidatorH,
) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	pr := newFakeProjectRepoH()
	tr := newFakeTaskRepoFull()
	rv := &fakeRefValidatorH{entries: map[uuid.UUID]bool{}}

	psvc := service.NewProjectService(pr, tr)
	tsvc := service.NewTaskServiceWithValidator(tr, pr, rv, psvc)
	th := NewTaskHandler(tsvc, psvc)

	r := gin.New()
	v1 := r.Group("/api/v1")
	{
		projects := v1.Group("/projects")
		projects.POST("/:id/tasks", th.CreateInProject)
		projects.GET("/:id/tasks", th.ListByProject)

		tasks := v1.Group("/tasks")
		tasks.GET("/upcoming", th.Upcoming)
		tasks.GET("/overdue", th.Overdue)
		tasks.GET("/:id", th.GetByID)
		tasks.PATCH("/:id", th.Update)
		tasks.POST("/:id/complete", th.Complete)
		tasks.DELETE("/:id", th.Delete)
	}
	return r, pr, tr, rv
}

func doTaskReq(r *gin.Engine, method, path string, body any) *httptest.ResponseRecorder {
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

func seedProject(pr *fakeProjectRepoH, status string) *model.Project {
	id := uuid.New()
	p := &model.Project{ID: id, Name: "P", Status: status}
	pr.store[id] = p
	return p
}

// ─── Tests ─────────────────────────────────────────────────────────────

// 1. POST /projects/:id/tasks → 201
func TestTaskHandler_Create_201(t *testing.T) {
	r, pr, _, _ := newTaskTestRouter(t)
	p := seedProject(pr, model.ProjectStatusActive)
	w := doTaskReq(r, "POST", "/api/v1/projects/"+p.ID.String()+"/tasks",
		dto.CreateTaskRequest{Title: "設計"})
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", w.Code, w.Body.String())
	}
	var resp dto.TaskResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Title != "設計" || resp.Status != model.TaskStatusTodo {
		t.Errorf("unexpected: %+v", resp)
	}
}

// 2. POST 不合法 project id → 400
func TestTaskHandler_Create_BadProjectID(t *testing.T) {
	r, _, _, _ := newTaskTestRouter(t)
	w := doTaskReq(r, "POST", "/api/v1/projects/not-a-uuid/tasks",
		dto.CreateTaskRequest{Title: "x"})
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// 3. POST archived project → 400 PROJECT_ARCHIVED
func TestTaskHandler_Create_Archived(t *testing.T) {
	r, pr, _, _ := newTaskTestRouter(t)
	p := seedProject(pr, model.ProjectStatusArchived)
	w := doTaskReq(r, "POST", "/api/v1/projects/"+p.ID.String()+"/tasks",
		dto.CreateTaskRequest{Title: "x"})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", w.Code, w.Body.String())
	}
	var er dto.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &er)
	if er.Code != model.ErrCodeProjectArchived {
		t.Errorf("expected PROJECT_ARCHIVED, got %s", er.Code)
	}
}

// 4. POST project 不存在 → 404
func TestTaskHandler_Create_ProjectNotFound(t *testing.T) {
	r, _, _, _ := newTaskTestRouter(t)
	w := doTaskReq(r, "POST", "/api/v1/projects/"+uuid.New().String()+"/tasks",
		dto.CreateTaskRequest{Title: "x"})
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// 5. POST 缺 title → 400
func TestTaskHandler_Create_MissingTitle(t *testing.T) {
	r, pr, _, _ := newTaskTestRouter(t)
	p := seedProject(pr, model.ProjectStatusActive)
	w := doTaskReq(r, "POST", "/api/v1/projects/"+p.ID.String()+"/tasks",
		map[string]any{})
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// 6. GET /projects/:id/tasks 列表
func TestTaskHandler_ListByProject(t *testing.T) {
	r, pr, tr, _ := newTaskTestRouter(t)
	p := seedProject(pr, model.ProjectStatusActive)
	tr.tasks[uuid.New()] = &model.Task{
		ID: uuid.New(), ProjectID: p.ID, Title: "a",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	tr.tasks[uuid.New()] = &model.Task{
		ID: uuid.New(), ProjectID: p.ID, Title: "b",
		Status: model.TaskStatusInProgress, Priority: model.TaskPriorityNormal,
	}
	w := doTaskReq(r, "GET", "/api/v1/projects/"+p.ID.String()+"/tasks", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp dto.ListTasksResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 items, got %d", len(resp.Data))
	}
}

// 7. GET 列表 status filter
func TestTaskHandler_ListByProject_StatusFilter(t *testing.T) {
	r, pr, tr, _ := newTaskTestRouter(t)
	p := seedProject(pr, model.ProjectStatusActive)
	tr.tasks[uuid.New()] = &model.Task{
		ID: uuid.New(), ProjectID: p.ID, Title: "a",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	tr.tasks[uuid.New()] = &model.Task{
		ID: uuid.New(), ProjectID: p.ID, Title: "b",
		Status: model.TaskStatusDone, Priority: model.TaskPriorityNormal,
	}
	w := doTaskReq(r, "GET", "/api/v1/projects/"+p.ID.String()+"/tasks?status=todo", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp dto.ListTasksResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Data) != 1 || resp.Data[0].Status != "todo" {
		t.Errorf("expected 1 todo, got %+v", resp.Data)
	}
}

// 8. GET 列表 status filter 含非法值 → 400
func TestTaskHandler_ListByProject_BadStatus(t *testing.T) {
	r, pr, _, _ := newTaskTestRouter(t)
	p := seedProject(pr, model.ProjectStatusActive)
	w := doTaskReq(r, "GET", "/api/v1/projects/"+p.ID.String()+"/tasks?status=wrong", nil)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// 9. GET /tasks/:id → 200
func TestTaskHandler_GetByID(t *testing.T) {
	r, pr, tr, _ := newTaskTestRouter(t)
	p := seedProject(pr, model.ProjectStatusActive)
	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "x",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	w := doTaskReq(r, "GET", "/api/v1/tasks/"+id.String(), nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

// 10. GET /tasks/:id 不存在 → 404
func TestTaskHandler_GetByID_NotFound(t *testing.T) {
	r, _, _, _ := newTaskTestRouter(t)
	w := doTaskReq(r, "GET", "/api/v1/tasks/"+uuid.New().String(), nil)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// 11. PATCH /tasks/:id → 200
func TestTaskHandler_Update(t *testing.T) {
	r, pr, tr, _ := newTaskTestRouter(t)
	p := seedProject(pr, model.ProjectStatusActive)
	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "old",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	newTitle := "new"
	w := doTaskReq(r, "PATCH", "/api/v1/tasks/"+id.String(),
		dto.UpdateTaskRequest{Title: &newTitle})
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}
	var resp dto.TaskResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Title != "new" {
		t.Errorf("title not updated: %s", resp.Title)
	}
}

// 12. POST /tasks/:id/complete → 200 + status=done
func TestTaskHandler_Complete(t *testing.T) {
	r, pr, tr, _ := newTaskTestRouter(t)
	p := seedProject(pr, model.ProjectStatusActive)
	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "x",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	w := doTaskReq(r, "POST", "/api/v1/tasks/"+id.String()+"/complete", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp dto.TaskResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Status != model.TaskStatusDone || resp.CompletedAt == nil {
		t.Errorf("expected done with completed_at, got %+v", resp)
	}
}

// 13. DELETE /tasks/:id → 204
func TestTaskHandler_Delete(t *testing.T) {
	r, pr, tr, _ := newTaskTestRouter(t)
	p := seedProject(pr, model.ProjectStatusActive)
	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "x",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	w := doTaskReq(r, "DELETE", "/api/v1/tasks/"+id.String(), nil)
	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
	if _, ok := tr.tasks[id]; ok {
		t.Errorf("task should be deleted")
	}
}

// 14. GET /tasks/upcoming → 200
func TestTaskHandler_Upcoming(t *testing.T) {
	r, pr, tr, _ := newTaskTestRouter(t)
	p := seedProject(pr, model.ProjectStatusActive)
	now := time.Now()
	tr.upcoming = []*model.Task{
		{ID: uuid.New(), ProjectID: p.ID, Title: "a", Status: "todo", Priority: "normal", DueDate: &now},
	}
	w := doTaskReq(r, "GET", "/api/v1/tasks/upcoming?days=7", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp dto.UpcomingTasksResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Data) != 1 {
		t.Errorf("expected 1 item, got %d", len(resp.Data))
	}
	if resp.Data[0].ProjectName != "P" {
		t.Errorf("expected project_name=P, got %s", resp.Data[0].ProjectName)
	}
}

// 15. GET /tasks/upcoming bad days → 400
func TestTaskHandler_Upcoming_BadDays(t *testing.T) {
	r, _, _, _ := newTaskTestRouter(t)
	w := doTaskReq(r, "GET", "/api/v1/tasks/upcoming?days=abc", nil)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// 16. GET /tasks/overdue
func TestTaskHandler_Overdue(t *testing.T) {
	r, pr, tr, _ := newTaskTestRouter(t)
	p := seedProject(pr, model.ProjectStatusActive)
	yesterday := time.Now().AddDate(0, 0, -1)
	tr.overdue = []*model.Task{
		{ID: uuid.New(), ProjectID: p.ID, Title: "old", Status: "todo", Priority: "high", DueDate: &yesterday},
	}
	w := doTaskReq(r, "GET", "/api/v1/tasks/overdue", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp dto.UpcomingTasksResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Data) != 1 {
		t.Errorf("expected 1, got %d", len(resp.Data))
	}
}

// 17. /tasks/upcoming 不會被 /tasks/:id 攔截（路由順序驗證）
func TestTaskHandler_RoutingOrder(t *testing.T) {
	r, _, _, _ := newTaskTestRouter(t)
	w := doTaskReq(r, "GET", "/api/v1/tasks/upcoming", nil)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200 (routed to upcoming, not :id), got %d body=%s",
			w.Code, w.Body.String())
	}
}

// 18. PATCH /tasks/:id with refs replace
func TestTaskHandler_Update_RefsReplace(t *testing.T) {
	r, pr, tr, rv := newTaskTestRouter(t)
	p := seedProject(pr, model.ProjectStatusActive)
	entryID := uuid.New()
	rv.entries[entryID] = true
	id := uuid.New()
	tr.tasks[id] = &model.Task{
		ID: id, ProjectID: p.ID, Title: "x",
		Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal,
	}
	refs := []dto.TaskRefDTO{{RefType: "entry", RefID: entryID.String()}}
	w := doTaskReq(r, "PATCH", "/api/v1/tasks/"+id.String(),
		dto.UpdateTaskRequest{Refs: &refs})
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}
	var resp dto.TaskResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Refs) != 1 || resp.Refs[0].RefType != "entry" {
		t.Errorf("refs not replaced: %+v", resp.Refs)
	}
}
