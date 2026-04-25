package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MaxTasksPerProject 單一 project 在 ListByProject 時的硬上限
//
// 對應 spec §107 / §214（TOO_MANY_TASKS）
const MaxTasksPerProject = 500

// TaskRepository 任務資料庫操作（F-031）
type TaskRepository struct {
	pool *pgxpool.Pool
}

// NewTaskRepository 建立新的 TaskRepository
func NewTaskRepository(pool *pgxpool.Pool) *TaskRepository {
	return &TaskRepository{pool: pool}
}

const taskSelectCols = `id, project_id, title, description, status, priority,
	due_date, position, created_at, updated_at, completed_at`

// scanTask 將 row 掃進 *model.Task
func scanTask(row pgx.Row) (*model.Task, error) {
	t := &model.Task{}
	err := row.Scan(
		&t.ID, &t.ProjectID, &t.Title, &t.Description, &t.Status, &t.Priority,
		&t.DueDate, &t.Position, &t.CreatedAt, &t.UpdatedAt, &t.CompletedAt,
	)
	if err != nil {
		return nil, err
	}
	return t, nil
}

// mapTaskPgErr 將常見 PgError 轉成 AppError
//
// 特別處理：
//   - 23503 foreign_key_violation（project_id 不存在）→ 404 PROJECT_NOT_FOUND
//   - 23514 check_violation → 400 INVALID_INPUT
func mapTaskPgErr(err error) error {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		if pgErr.Code == "23503" {
			// FK 失敗：僅以 ConstraintName 結構化判斷（避免依賴 locale-dependent Message）
			if pgErr.ConstraintName == "tasks_project_id_fkey" {
				return model.NewAppError(404, model.ErrCodeProjectNotFound, "專案不存在")
			}
			return model.NewAppError(400, model.ErrCodeInvalidInput, "外鍵約束失敗")
		}
		if pgErr.Code == "23514" {
			return model.NewAppError(400, model.ErrCodeInvalidInput, "欄位值不符合限制")
		}
	}
	return err
}

// Create 建立任務 + 批次插入 task_refs（同一個 transaction）
func (r *TaskRepository) Create(ctx context.Context, t *model.Task, refs []model.TaskRef) error {
	if t.Status == "" {
		t.Status = model.TaskStatusTodo
	}
	if t.Priority == "" {
		t.Priority = model.TaskPriorityNormal
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var insertedID uuid.UUID
	if t.ID == uuid.Nil {
		err = tx.QueryRow(ctx,
			`INSERT INTO tasks (project_id, title, description, status, priority, due_date, position, completed_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 RETURNING id, created_at, updated_at`,
			t.ProjectID, t.Title, t.Description, t.Status, t.Priority,
			t.DueDate, t.Position, t.CompletedAt,
		).Scan(&insertedID, &t.CreatedAt, &t.UpdatedAt)
	} else {
		err = tx.QueryRow(ctx,
			`INSERT INTO tasks (id, project_id, title, description, status, priority, due_date, position, completed_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			 RETURNING id, created_at, updated_at`,
			t.ID, t.ProjectID, t.Title, t.Description, t.Status, t.Priority,
			t.DueDate, t.Position, t.CompletedAt,
		).Scan(&insertedID, &t.CreatedAt, &t.UpdatedAt)
	}
	if err != nil {
		return mapTaskPgErr(err)
	}
	t.ID = insertedID

	if len(refs) > 0 {
		if err := insertTaskRefsTx(ctx, tx, t.ID, refs); err != nil {
			return mapTaskPgErr(err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}
	return nil
}

// insertTaskRefsTx 在 tx 內批次插入 task_refs（不處理 commit / rollback）
func insertTaskRefsTx(ctx context.Context, tx pgx.Tx, taskID uuid.UUID, refs []model.TaskRef) error {
	if len(refs) == 0 {
		return nil
	}
	placeholders := make([]string, 0, len(refs))
	args := make([]any, 0, len(refs)*3)
	for i, ref := range refs {
		base := i * 3
		placeholders = append(placeholders, fmt.Sprintf("($%d, $%d, $%d)", base+1, base+2, base+3))
		args = append(args, taskID, ref.RefType, ref.RefID)
	}
	q := fmt.Sprintf(
		`INSERT INTO task_refs (task_id, ref_type, ref_id) VALUES %s
		 ON CONFLICT DO NOTHING`,
		strings.Join(placeholders, ", "),
	)
	_, err := tx.Exec(ctx, q, args...)
	return err
}

// FindByID 載入單一 task 與其 refs
//
// 不存在 → 404 TASK_NOT_FOUND
func (r *TaskRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.Task, []model.TaskRef, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+taskSelectCols+` FROM tasks WHERE id = $1`, id,
	)
	t, err := scanTask(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, model.NewAppError(404, model.ErrCodeTaskNotFound, "任務不存在")
	}
	if err != nil {
		return nil, nil, err
	}
	refs, err := r.listRefs(ctx, t.ID)
	if err != nil {
		return nil, nil, err
	}
	return t, refs, nil
}

// listRefs 取得指定 task 的 refs
func (r *TaskRepository) listRefs(ctx context.Context, taskID uuid.UUID) ([]model.TaskRef, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT task_id, ref_type, ref_id
		 FROM task_refs
		 WHERE task_id = $1
		 ORDER BY ref_type ASC, ref_id ASC`,
		taskID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	refs := make([]model.TaskRef, 0)
	for rows.Next() {
		var ref model.TaskRef
		if err := rows.Scan(&ref.TaskID, &ref.RefType, &ref.RefID); err != nil {
			return nil, err
		}
		refs = append(refs, ref)
	}
	return refs, rows.Err()
}

// ListByProject 取得指定 project 下的 tasks（無分頁，給 kanban 一次載入）
//
// statusFilter 為 nil/empty → 不過濾
// 若該 project 下符合條件的 task 數 > MaxTasksPerProject (500) → 回 400 TOO_MANY_TASKS
//
// 排序：position ASC（同 status 內），再以 created_at ASC 平手
func (r *TaskRepository) ListByProject(
	ctx context.Context,
	projectID uuid.UUID,
	statusFilter []string,
) ([]*model.Task, error) {
	conds := []string{"project_id = $1"}
	args := []any{projectID}
	idx := 2
	if len(statusFilter) > 0 {
		placeholders := make([]string, 0, len(statusFilter))
		for _, s := range statusFilter {
			placeholders = append(placeholders, fmt.Sprintf("$%d", idx))
			args = append(args, s)
			idx++
		}
		conds = append(conds, fmt.Sprintf("status IN (%s)", strings.Join(placeholders, ",")))
	}
	where := "WHERE " + strings.Join(conds, " AND ")

	// 先 count，超過上限直接拒絕
	var total int
	if err := r.pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT COUNT(*) FROM tasks %s`, where), args...,
	).Scan(&total); err != nil {
		return nil, err
	}
	if total > MaxTasksPerProject {
		return nil, model.NewAppError(400, model.ErrCodeTooManyTasks,
			fmt.Sprintf("此專案任務數 %d 超過 %d 上限，請加上 status 過濾", total, MaxTasksPerProject))
	}

	q := fmt.Sprintf(
		`SELECT `+taskSelectCols+` FROM tasks %s
		 ORDER BY status ASC, position ASC, created_at ASC`,
		where,
	)
	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]*model.Task, 0)
	for rows.Next() {
		t, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, t)
	}
	return items, rows.Err()
}

// Update 全欄位更新（呼叫端負責先讀 + 合併 patch）
//
// 不存在 → 404 TASK_NOT_FOUND
func (r *TaskRepository) Update(ctx context.Context, t *model.Task) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE tasks SET
			title = $1, description = $2, status = $3, priority = $4,
			due_date = $5, position = $6, completed_at = $7,
			updated_at = NOW()
		 WHERE id = $8`,
		t.Title, t.Description, t.Status, t.Priority,
		t.DueDate, t.Position, t.CompletedAt, t.ID,
	)
	if err != nil {
		return mapTaskPgErr(err)
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(404, model.ErrCodeTaskNotFound, "任務不存在")
	}
	row := r.pool.QueryRow(ctx, `SELECT `+taskSelectCols+` FROM tasks WHERE id = $1`, t.ID)
	updated, err := scanTask(row)
	if err != nil {
		return err
	}
	*t = *updated
	return nil
}

// ReplaceRefs 清空後重插某 task 的 refs
func (r *TaskRepository) ReplaceRefs(ctx context.Context, taskID uuid.UUID, refs []model.TaskRef) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM task_refs WHERE task_id = $1`, taskID); err != nil {
		return err
	}
	if err := insertTaskRefsTx(ctx, tx, taskID, refs); err != nil {
		return mapTaskPgErr(err)
	}
	return tx.Commit(ctx)
}

// Delete 刪除任務（task_refs 透過 FK CASCADE 一併移除）
//
// 不存在 → 404 TASK_NOT_FOUND
func (r *TaskRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM tasks WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(404, model.ErrCodeTaskNotFound, "任務不存在")
	}
	return nil
}

// ListUpcoming 跨專案：未完成且 due_date <= today + days
//
// 排序：due_date ASC（NULL 視為最大），priority DESC（urgent>high>...）
func (r *TaskRepository) ListUpcoming(ctx context.Context, days int) ([]*model.Task, error) {
	if days < 0 {
		days = 0
	}
	q := `SELECT ` + taskSelectCols + ` FROM tasks
		 WHERE status NOT IN ('done','cancelled')
		   AND due_date IS NOT NULL
		   AND due_date <= (CURRENT_DATE + ($1 || ' days')::interval)::date
		 ORDER BY due_date ASC, created_at ASC`
	rows, err := r.pool.Query(ctx, q, fmt.Sprintf("%d", days))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]*model.Task, 0)
	for rows.Next() {
		t, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, t)
	}
	return items, rows.Err()
}

// ListOverdue 跨專案：未完成且 due_date < today
func (r *TaskRepository) ListOverdue(ctx context.Context) ([]*model.Task, error) {
	q := `SELECT ` + taskSelectCols + ` FROM tasks
		 WHERE status NOT IN ('done','cancelled')
		   AND due_date IS NOT NULL
		   AND due_date < CURRENT_DATE
		 ORDER BY due_date ASC, created_at ASC`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]*model.Task, 0)
	for rows.Next() {
		t, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, t)
	}
	return items, rows.Err()
}

// CountByProject 計算指定 project 的 task 總數（不過濾 status）
func (r *TaskRepository) CountByProject(ctx context.Context, projectID uuid.UUID) (int, error) {
	var c int
	if err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM tasks WHERE project_id = $1`, projectID,
	).Scan(&c); err != nil {
		return 0, err
	}
	return c, nil
}

// GetRefs 對外暴露查詢 task_refs（避免外部直接寫 SQL）
func (r *TaskRepository) GetRefs(ctx context.Context, taskID uuid.UUID) ([]model.TaskRef, error) {
	return r.listRefs(ctx, taskID)
}
