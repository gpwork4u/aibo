package repository

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

// withProjectsTasksTestDB 取得 F-031 整合測試用 DB pool，並清空 projects/tasks/task_refs。
//
// 與 journal_test 共用 TEST_DATABASE_URL，沿用相同的「dbname 必須含 'test' 字樣」防呆。
func withProjectsTasksTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL 未設置，跳過 projects/tasks repo 整合測試")
	}
	if os.Getenv("ALLOW_NON_TEST_DB") != "1" && !strings.Contains(strings.ToLower(dsn), "test") {
		t.Fatalf("TEST_DATABASE_URL 未包含 'test' 字樣，為安全起見拒絕對此 DB 執行破壞性測試")
	}

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("連接測試 DB 失敗: %v", err)
	}

	// 子表先清，主表後清
	for _, table := range []string{"task_refs", "tasks", "projects"} {
		if _, err := pool.Exec(context.Background(), "DELETE FROM "+table); err != nil {
			pool.Close()
			t.Fatalf("清空 %s 失敗: %v", table, err)
		}
	}
	return pool
}

func makeProject(name string) *model.Project {
	return &model.Project{
		Name:   name,
		Color:  "#3b82f6",
		Status: model.ProjectStatusActive,
	}
}

func TestProject_Create_DuplicateNameCaseInsensitive(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	repo := NewProjectRepository(pool)

	if err := repo.Create(context.Background(), makeProject("aibo v2")); err != nil {
		t.Fatalf("first Create: %v", err)
	}

	err := repo.Create(context.Background(), makeProject("Aibo V2"))
	if err == nil {
		t.Fatal("expected PROJECT_NAME_DUPLICATE, got nil")
	}
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected *AppError, got %T: %v", err, err)
	}
	if appErr.Status != 409 || appErr.Code != model.ErrCodeProjectNameDuplicate {
		t.Errorf("expected 409 PROJECT_NAME_DUPLICATE, got %d %s", appErr.Status, appErr.Code)
	}
}

func TestProject_Create_AllowDuplicateWhenArchived(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	repo := NewProjectRepository(pool)

	p := makeProject("aibo v2")
	p.Status = model.ProjectStatusArchived
	if err := repo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create archived: %v", err)
	}
	// 同名 active 應被允許（partial unique index 排除 archived）
	if err := repo.Create(context.Background(), makeProject("Aibo V2")); err != nil {
		t.Fatalf("expected to allow duplicate when previous is archived, got %v", err)
	}
}

func TestProject_FindByID_NotFound(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	repo := NewProjectRepository(pool)

	_, err := repo.FindByID(context.Background(), newUUID(t))
	if err == nil {
		t.Fatal("expected PROJECT_NOT_FOUND")
	}
	appErr, _ := err.(*model.AppError)
	if appErr == nil || appErr.Status != 404 || appErr.Code != model.ErrCodeProjectNotFound {
		t.Errorf("expected 404 PROJECT_NOT_FOUND, got %v", err)
	}
}

func TestProject_RecomputeProgress(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	pRepo := NewProjectRepository(pool)
	tRepo := NewTaskRepository(pool)

	p := makeProject("aibo v2")
	if err := pRepo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create project: %v", err)
	}

	// 4 tasks: 1 done, 2 todo, 1 cancelled
	statuses := []string{model.TaskStatusDone, model.TaskStatusTodo, model.TaskStatusTodo, model.TaskStatusCancelled}
	for i, s := range statuses {
		task := &model.Task{
			ProjectID: p.ID,
			Title:     "t" + time.Now().Format("150405") + string(rune('a'+i)),
			Status:    s,
			Priority:  model.TaskPriorityNormal,
		}
		if err := tRepo.Create(context.Background(), task, nil); err != nil {
			t.Fatalf("Create task %d: %v", i, err)
		}
	}

	// 公式：ROUND(100 * 1 / (4-1=3)) = 33
	got, err := pRepo.RecomputeProgress(context.Background(), p.ID)
	if err != nil {
		t.Fatalf("RecomputeProgress: %v", err)
	}
	if got != 33 {
		t.Errorf("expected progress=33, got %d", got)
	}

	// 重新讀回 project，確認已寫回 DB
	reloaded, err := pRepo.FindByID(context.Background(), p.ID)
	if err != nil {
		t.Fatalf("FindByID: %v", err)
	}
	if reloaded.Progress != 33 {
		t.Errorf("expected DB progress=33, got %d", reloaded.Progress)
	}
}

func TestProject_RecomputeProgress_AllCancelledFallbackZero(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	pRepo := NewProjectRepository(pool)
	tRepo := NewTaskRepository(pool)

	p := makeProject("aibo v2")
	if err := pRepo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create project: %v", err)
	}
	for i := 0; i < 3; i++ {
		task := &model.Task{
			ProjectID: p.ID,
			Title:     "t" + string(rune('a'+i)),
			Status:    model.TaskStatusCancelled,
			Priority:  model.TaskPriorityNormal,
		}
		if err := tRepo.Create(context.Background(), task, nil); err != nil {
			t.Fatalf("Create task: %v", err)
		}
	}
	got, err := pRepo.RecomputeProgress(context.Background(), p.ID)
	if err != nil {
		t.Fatalf("RecomputeProgress: %v", err)
	}
	if got != 0 {
		t.Errorf("expected progress=0 (NULLIF fallback), got %d", got)
	}
}

func TestProject_RecomputeProgress_NoTaskZero(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	repo := NewProjectRepository(pool)

	p := makeProject("aibo v2")
	if err := repo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create: %v", err)
	}
	got, err := repo.RecomputeProgress(context.Background(), p.ID)
	if err != nil {
		t.Fatalf("RecomputeProgress: %v", err)
	}
	if got != 0 {
		t.Errorf("expected 0 for no-task project, got %d", got)
	}
}

func TestProject_CountTasks(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	pRepo := NewProjectRepository(pool)
	tRepo := NewTaskRepository(pool)

	p := makeProject("aibo v2")
	if err := pRepo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create project: %v", err)
	}
	for _, s := range []string{
		model.TaskStatusTodo, model.TaskStatusTodo,
		model.TaskStatusInProgress,
		model.TaskStatusDone,
	} {
		task := &model.Task{ProjectID: p.ID, Title: "t " + s, Status: s, Priority: model.TaskPriorityNormal}
		if err := tRepo.Create(context.Background(), task, nil); err != nil {
			t.Fatalf("Create task %s: %v", s, err)
		}
	}
	total, byStatus, err := pRepo.CountTasks(context.Background(), p.ID)
	if err != nil {
		t.Fatalf("CountTasks: %v", err)
	}
	if total != 4 {
		t.Errorf("expected total=4, got %d", total)
	}
	if byStatus[model.TaskStatusTodo] != 2 || byStatus[model.TaskStatusInProgress] != 1 || byStatus[model.TaskStatusDone] != 1 {
		t.Errorf("unexpected byStatus: %+v", byStatus)
	}
}

func TestProject_List_FilterAndPaging(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	repo := NewProjectRepository(pool)

	specs := []struct {
		name   string
		status string
	}{
		{"alpha", model.ProjectStatusActive},
		{"bravo", model.ProjectStatusActive},
		{"charlie", model.ProjectStatusPaused},
		{"delta", model.ProjectStatusArchived},
	}
	for _, s := range specs {
		p := makeProject(s.name)
		p.Status = s.status
		if err := repo.Create(context.Background(), p); err != nil {
			t.Fatalf("Create %s: %v", s.name, err)
		}
	}

	active := model.ProjectStatusActive
	items, total, err := repo.List(context.Background(), ProjectListOptions{
		Page: 1, PerPage: 10, Status: &active,
	})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if total != 2 || len(items) != 2 {
		t.Errorf("expected 2 active, got total=%d len=%d", total, len(items))
	}
}

func TestProject_Update_NotFound(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	repo := NewProjectRepository(pool)

	p := &model.Project{
		ID:     newUUID(t),
		Name:   "ghost",
		Color:  "#000000",
		Status: model.ProjectStatusActive,
	}
	err := repo.Update(context.Background(), p)
	appErr, _ := err.(*model.AppError)
	if appErr == nil || appErr.Status != 404 {
		t.Errorf("expected 404, got %v", err)
	}
}

func TestProject_Delete_CascadesTasks(t *testing.T) {
	pool := withProjectsTasksTestDB(t)
	defer pool.Close()
	pRepo := NewProjectRepository(pool)
	tRepo := NewTaskRepository(pool)

	p := makeProject("to-delete")
	if err := pRepo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create project: %v", err)
	}
	task := &model.Task{ProjectID: p.ID, Title: "child", Status: model.TaskStatusTodo, Priority: model.TaskPriorityNormal}
	if err := tRepo.Create(context.Background(), task, []model.TaskRef{
		{RefType: model.TaskRefTypeEntry, RefID: "ref-1"},
	}); err != nil {
		t.Fatalf("Create task: %v", err)
	}

	if err := pRepo.Delete(context.Background(), p.ID); err != nil {
		t.Fatalf("Delete project: %v", err)
	}

	// task 應被 CASCADE 刪除
	count, err := tRepo.CountByProject(context.Background(), p.ID)
	if err != nil {
		t.Fatalf("CountByProject: %v", err)
	}
	if count != 0 {
		t.Errorf("expected tasks cascade-deleted, got %d remaining", count)
	}

	// 重複刪 → 404
	err = pRepo.Delete(context.Background(), p.ID)
	appErr, _ := err.(*model.AppError)
	if appErr == nil || appErr.Status != 404 {
		t.Errorf("expected 404 on second delete, got %v", err)
	}
}
