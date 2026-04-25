package repository

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
)

// newUUID 產生隨機 uuid（測試用）
func newUUID(t *testing.T) uuid.UUID {
	t.Helper()
	return uuid.New()
}

func TestTask_CreateWithRefs_AndFindByID(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	pRepo := NewProjectRepository(pool)
	tRepo := NewTaskRepository(pool)

	p := makeProject("aibo v2")
	if err := pRepo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create project: %v", err)
	}

	due := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	task := &model.Task{
		ProjectID: p.ID,
		Title:     "設計 schema",
		Status:    model.TaskStatusTodo,
		Priority:  model.TaskPriorityHigh,
		DueDate:   &due,
	}
	refs := []model.TaskRef{
		{RefType: model.TaskRefTypeEntry, RefID: uuid.New().String()},
		{RefType: model.TaskRefTypeJournal, RefID: "2026-04-24"},
		{RefType: model.TaskRefTypeGcalEvent, RefID: "evt-1"},
	}
	if err := tRepo.Create(context.Background(), task, refs); err != nil {
		t.Fatalf("Create task: %v", err)
	}
	if task.ID == uuid.Nil {
		t.Fatal("task ID not populated")
	}

	got, gotRefs, err := tRepo.FindByID(context.Background(), task.ID)
	if err != nil {
		t.Fatalf("FindByID: %v", err)
	}
	if got.Title != "設計 schema" || got.Priority != model.TaskPriorityHigh {
		t.Errorf("task fields mismatch: %+v", got)
	}
	if len(gotRefs) != 3 {
		t.Errorf("expected 3 refs, got %d", len(gotRefs))
	}
}

func TestTask_FindByID_NotFound(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	repo := NewTaskRepository(pool)

	_, _, err := repo.FindByID(context.Background(), uuid.New())
	appErr, _ := err.(*model.AppError)
	if appErr == nil || appErr.Status != 404 || appErr.Code != model.ErrCodeTaskNotFound {
		t.Errorf("expected 404 TASK_NOT_FOUND, got %v", err)
	}
}

func TestTask_Create_ProjectNotExists(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	tRepo := NewTaskRepository(pool)

	task := &model.Task{
		ProjectID: uuid.New(), // 不存在
		Title:     "x",
		Status:    model.TaskStatusTodo,
		Priority:  model.TaskPriorityNormal,
	}
	err := tRepo.Create(context.Background(), task, nil)
	appErr, _ := err.(*model.AppError)
	if appErr == nil {
		t.Fatalf("expected AppError, got %v", err)
	}
	if appErr.Status != 404 || appErr.Code != model.ErrCodeProjectNotFound {
		t.Errorf("expected 404 PROJECT_NOT_FOUND, got %d %s", appErr.Status, appErr.Code)
	}
}

func TestTask_ListByProject_StatusFilterAndOrder(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	pRepo := NewProjectRepository(pool)
	tRepo := NewTaskRepository(pool)

	p := makeProject("aibo v2")
	if err := pRepo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create project: %v", err)
	}

	specs := []struct {
		title    string
		status   string
		position int
	}{
		{"a", model.TaskStatusTodo, 1},
		{"b", model.TaskStatusTodo, 0},
		{"c", model.TaskStatusInProgress, 2},
		{"d", model.TaskStatusDone, 0},
	}
	for _, s := range specs {
		task := &model.Task{
			ProjectID: p.ID,
			Title:     s.title,
			Status:    s.status,
			Priority:  model.TaskPriorityNormal,
			Position:  s.position,
		}
		if err := tRepo.Create(context.Background(), task, nil); err != nil {
			t.Fatalf("Create %s: %v", s.title, err)
		}
	}

	// 不過濾 status：4 筆
	all, err := tRepo.ListByProject(context.Background(), p.ID, nil)
	if err != nil {
		t.Fatalf("ListByProject: %v", err)
	}
	if len(all) != 4 {
		t.Errorf("expected 4 tasks, got %d", len(all))
	}

	// 過濾 todo,in_progress
	got, err := tRepo.ListByProject(context.Background(), p.ID, []string{
		model.TaskStatusTodo, model.TaskStatusInProgress,
	})
	if err != nil {
		t.Fatalf("ListByProject filter: %v", err)
	}
	if len(got) != 3 {
		t.Errorf("expected 3, got %d", len(got))
	}

	// 同 status 內 position ASC
	var todos []*model.Task
	for _, x := range got {
		if x.Status == model.TaskStatusTodo {
			todos = append(todos, x)
		}
	}
	if len(todos) != 2 || todos[0].Position > todos[1].Position {
		t.Errorf("todos not sorted by position ASC: %+v", todos)
	}
}

func TestTask_ListByProject_TooManyTasks(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	pRepo := NewProjectRepository(pool)
	tRepo := NewTaskRepository(pool)

	p := makeProject("aibo v2")
	if err := pRepo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create project: %v", err)
	}

	// bulk insert 501 tasks via raw SQL（單筆 Create 太慢）
	args := []any{p.ID}
	values := []string{}
	for i := 0; i < 501; i++ {
		values = append(values, fmt.Sprintf("($1, 'task-%d', 'todo', 'normal', 0)", i))
	}
	_, err := pool.Exec(context.Background(),
		`INSERT INTO tasks (project_id, title, status, priority, position) VALUES `+
			joinStrings(values, ","),
		args...,
	)
	if err != nil {
		t.Fatalf("bulk insert: %v", err)
	}

	_, err = tRepo.ListByProject(context.Background(), p.ID, nil)
	if err == nil {
		t.Fatal("expected TOO_MANY_TASKS")
	}
	appErr, _ := err.(*model.AppError)
	if appErr == nil || appErr.Status != 400 || appErr.Code != model.ErrCodeTooManyTasks {
		t.Errorf("expected 400 TOO_MANY_TASKS, got %v", err)
	}

	// 加上 status filter 也是同樣 501 todos，仍超過上限
	_, err = tRepo.ListByProject(context.Background(), p.ID, []string{model.TaskStatusTodo})
	if err == nil {
		t.Fatal("expected TOO_MANY_TASKS with filter")
	}

	// 但若 filter 到 0 筆則應通過（驗證 filter 是 count 在 SQL 內進行的）
	got, err := tRepo.ListByProject(context.Background(), p.ID, []string{model.TaskStatusDone})
	if err != nil {
		t.Fatalf("expected ok with done filter, got %v", err)
	}
	if len(got) != 0 {
		t.Errorf("expected 0 done tasks, got %d", len(got))
	}
}

func joinStrings(ss []string, sep string) string {
	out := ""
	for i, s := range ss {
		if i > 0 {
			out += sep
		}
		out += s
	}
	return out
}

func TestTask_ReplaceRefs(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	pRepo := NewProjectRepository(pool)
	tRepo := NewTaskRepository(pool)

	p := makeProject("aibo v2")
	if err := pRepo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create project: %v", err)
	}
	task := &model.Task{ProjectID: p.ID, Title: "x", Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal}
	if err := tRepo.Create(context.Background(), task, []model.TaskRef{
		{RefType: model.TaskRefTypeEntry, RefID: "old-1"},
		{RefType: model.TaskRefTypeEntry, RefID: "old-2"},
	}); err != nil {
		t.Fatalf("Create: %v", err)
	}

	if err := tRepo.ReplaceRefs(context.Background(), task.ID, []model.TaskRef{
		{RefType: model.TaskRefTypeJournal, RefID: "2026-04-24"},
	}); err != nil {
		t.Fatalf("ReplaceRefs: %v", err)
	}
	refs, err := tRepo.GetRefs(context.Background(), task.ID)
	if err != nil {
		t.Fatalf("GetRefs: %v", err)
	}
	if len(refs) != 1 || refs[0].RefType != model.TaskRefTypeJournal {
		t.Errorf("unexpected refs: %+v", refs)
	}
}

func TestTask_Update_StatusAndCompletedAt(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	pRepo := NewProjectRepository(pool)
	tRepo := NewTaskRepository(pool)

	p := makeProject("aibo v2")
	if err := pRepo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create project: %v", err)
	}
	task := &model.Task{ProjectID: p.ID, Title: "x", Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal}
	if err := tRepo.Create(context.Background(), task, nil); err != nil {
		t.Fatalf("Create task: %v", err)
	}

	now := time.Now().UTC()
	task.Status = model.TaskStatusDone
	task.CompletedAt = &now
	if err := tRepo.Update(context.Background(), task); err != nil {
		t.Fatalf("Update: %v", err)
	}
	if task.CompletedAt == nil {
		t.Errorf("completed_at should be set")
	}
}

func TestTask_ListUpcoming_AndOverdue(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	pRepo := NewProjectRepository(pool)
	tRepo := NewTaskRepository(pool)

	p := makeProject("aibo v2")
	if err := pRepo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create project: %v", err)
	}
	today := time.Now().UTC().Truncate(24 * time.Hour)
	mk := func(title string, due time.Time, status string) {
		d := due
		task := &model.Task{
			ProjectID: p.ID, Title: title, Status: status,
			Priority: model.TaskPriorityNormal, DueDate: &d,
		}
		if err := tRepo.Create(context.Background(), task, nil); err != nil {
			t.Fatalf("Create %s: %v", title, err)
		}
	}
	// upcoming：今天、3 天後（in_progress）；遠期 30 天後（不算 days=7）
	mk("up-today", today, model.TaskStatusTodo)
	mk("up-3d", today.Add(72*time.Hour), model.TaskStatusInProgress)
	mk("up-30d", today.Add(30*24*time.Hour), model.TaskStatusTodo)
	// overdue: -1 day
	mk("overdue", today.Add(-24*time.Hour), model.TaskStatusTodo)
	// done 不該出現
	mk("done", today, model.TaskStatusDone)

	upcoming, err := tRepo.ListUpcoming(context.Background(), 7)
	if err != nil {
		t.Fatalf("ListUpcoming: %v", err)
	}
	// upcoming 包含今天、3 天後、overdue（因為 due_date <= today+7 也涵蓋過去的；spec
	// 的 upcoming 與 overdue 由 service 層分流，repo 層只給「<= now+N」）
	// 預期：4 個（today, 3d, overdue, 但不含 30d 與 done）
	gotTitles := map[string]bool{}
	for _, x := range upcoming {
		gotTitles[x.Title] = true
	}
	for _, want := range []string{"up-today", "up-3d", "overdue"} {
		if !gotTitles[want] {
			t.Errorf("upcoming missing %s", want)
		}
	}
	if gotTitles["up-30d"] {
		t.Errorf("upcoming should not include up-30d (>7d)")
	}
	if gotTitles["done"] {
		t.Errorf("upcoming should not include done task")
	}

	overdue, err := tRepo.ListOverdue(context.Background())
	if err != nil {
		t.Fatalf("ListOverdue: %v", err)
	}
	gotOver := map[string]bool{}
	for _, x := range overdue {
		gotOver[x.Title] = true
	}
	if !gotOver["overdue"] {
		t.Errorf("overdue list missing 'overdue'")
	}
	if gotOver["up-today"] || gotOver["up-3d"] {
		t.Errorf("overdue should only include past-due tasks: %+v", gotOver)
	}
}

func TestTask_Delete_NotFound(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	repo := NewTaskRepository(pool)

	err := repo.Delete(context.Background(), uuid.New())
	appErr, _ := err.(*model.AppError)
	if appErr == nil || appErr.Status != 404 || appErr.Code != model.ErrCodeTaskNotFound {
		t.Errorf("expected 404 TASK_NOT_FOUND, got %v", err)
	}
}
