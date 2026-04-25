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

// ProjectRepository 專案資料庫操作（F-031）
type ProjectRepository struct {
	pool *pgxpool.Pool
}

// NewProjectRepository 建立新的 ProjectRepository
func NewProjectRepository(pool *pgxpool.Pool) *ProjectRepository {
	return &ProjectRepository{pool: pool}
}

// ProjectListOptions ProjectRepository.List 的過濾條件
type ProjectListOptions struct {
	Page    int
	PerPage int
	Status  *string // active / paused / done / archived
	Sort    string  // updated_at / created_at / name / end_date
	Order   string  // asc / desc
}

const projectSelectCols = `id, name, description, color, status, start_date, end_date, progress, created_at, updated_at`

// scanProject 將 row 掃進 *model.Project
func scanProject(row pgx.Row) (*model.Project, error) {
	p := &model.Project{}
	err := row.Scan(
		&p.ID, &p.Name, &p.Description, &p.Color, &p.Status,
		&p.StartDate, &p.EndDate, &p.Progress, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return p, nil
}

// mapProjectPgErr 將常見的 PgError 轉成 model.AppError
//
// 特別處理：
//   - uq_projects_name_ci 唯一鍵衝突 → 409 PROJECT_NAME_DUPLICATE
//   - 其他 23505 → 409 INVALID_INPUT（保底）
//   - 23514 check_violation → 400 INVALID_INPUT
func mapProjectPgErr(err error) error {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		if pgErr.Code == "23505" {
			if pgErr.ConstraintName == "uq_projects_name_ci" {
				return model.NewAppError(409, model.ErrCodeProjectNameDuplicate, "已有同名（忽略大小寫）的非封存專案")
			}
			return model.NewAppError(409, model.ErrCodeInvalidInput, "資料重複")
		}
		if pgErr.Code == "23514" {
			return model.NewAppError(400, model.ErrCodeInvalidInput, "欄位值不符合限制")
		}
	}
	return err
}

// Create 建立專案；若 ID 為零值則由 DB 端 gen_random_uuid()
//
// 名稱衝突 → 409 PROJECT_NAME_DUPLICATE
func (r *ProjectRepository) Create(ctx context.Context, p *model.Project) error {
	if p.Status == "" {
		p.Status = model.ProjectStatusActive
	}
	if p.Color == "" {
		p.Color = "#3b82f6"
	}

	var insertedID uuid.UUID
	var err error
	if p.ID == uuid.Nil {
		err = r.pool.QueryRow(ctx,
			`INSERT INTO projects (name, description, color, status, start_date, end_date, progress)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 RETURNING id, created_at, updated_at`,
			p.Name, p.Description, p.Color, p.Status, p.StartDate, p.EndDate, p.Progress,
		).Scan(&insertedID, &p.CreatedAt, &p.UpdatedAt)
	} else {
		err = r.pool.QueryRow(ctx,
			`INSERT INTO projects (id, name, description, color, status, start_date, end_date, progress)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 RETURNING id, created_at, updated_at`,
			p.ID, p.Name, p.Description, p.Color, p.Status, p.StartDate, p.EndDate, p.Progress,
		).Scan(&insertedID, &p.CreatedAt, &p.UpdatedAt)
	}
	if err != nil {
		return mapProjectPgErr(err)
	}
	p.ID = insertedID
	return nil
}

// FindByID 依 ID 載入專案；不存在 → 404 PROJECT_NOT_FOUND
func (r *ProjectRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.Project, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+projectSelectCols+` FROM projects WHERE id = $1`, id,
	)
	p, err := scanProject(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, model.NewAppError(404, model.ErrCodeProjectNotFound, "專案不存在")
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

// List 分頁列表（支援 status 過濾、排序）
func (r *ProjectRepository) List(ctx context.Context, opts ProjectListOptions) ([]*model.Project, int64, error) {
	if opts.Page <= 0 {
		opts.Page = 1
	}
	if opts.PerPage <= 0 {
		opts.PerPage = 20
	}

	conds := []string{}
	args := []any{}
	idx := 1
	if opts.Status != nil {
		conds = append(conds, fmt.Sprintf("status = $%d", idx))
		args = append(args, *opts.Status)
		idx++
	}
	where := ""
	if len(conds) > 0 {
		where = "WHERE " + strings.Join(conds, " AND ")
	}

	// 排序白名單，避免 SQL injection
	sortCol := "updated_at"
	switch opts.Sort {
	case "created_at", "name", "end_date", "start_date", "updated_at":
		sortCol = opts.Sort
	}
	order := "DESC"
	if strings.EqualFold(opts.Order, "asc") {
		order = "ASC"
	}

	var total int64
	if err := r.pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT COUNT(*) FROM projects %s`, where), args...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (opts.Page - 1) * opts.PerPage
	q := fmt.Sprintf(
		`SELECT `+projectSelectCols+` FROM projects %s
		 ORDER BY %s %s, id ASC
		 LIMIT $%d OFFSET $%d`,
		where, sortCol, order, idx, idx+1,
	)
	args = append(args, opts.PerPage, offset)

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]*model.Project, 0)
	for rows.Next() {
		p, err := scanProject(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, p)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// Update 全欄位更新（呼叫端負責先 FindByID 並合併 patch）
//
// 不存在 → 404 PROJECT_NOT_FOUND
// 名稱衝突 → 409 PROJECT_NAME_DUPLICATE
func (r *ProjectRepository) Update(ctx context.Context, p *model.Project) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE projects SET
			name = $1, description = $2, color = $3, status = $4,
			start_date = $5, end_date = $6, progress = $7,
			updated_at = NOW()
		 WHERE id = $8`,
		p.Name, p.Description, p.Color, p.Status,
		p.StartDate, p.EndDate, p.Progress, p.ID,
	)
	if err != nil {
		return mapProjectPgErr(err)
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(404, model.ErrCodeProjectNotFound, "專案不存在")
	}
	// 重新讀回 updated_at 等
	row := r.pool.QueryRow(ctx, `SELECT `+projectSelectCols+` FROM projects WHERE id = $1`, p.ID)
	updated, err := scanProject(row)
	if err != nil {
		return err
	}
	*p = *updated
	return nil
}

// Delete 刪除專案（child tasks 透過 FK CASCADE 一併移除）
//
// 不存在 → 404 PROJECT_NOT_FOUND
func (r *ProjectRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM projects WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(404, model.ErrCodeProjectNotFound, "專案不存在")
	}
	return nil
}

// CountTasks 統計指定專案的 task 總數與按 status 分桶
//
// 回傳：(total, byStatus, error)。byStatus 不含 0 的 key。
func (r *ProjectRepository) CountTasks(ctx context.Context, projectID uuid.UUID) (int, map[string]int, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT status, COUNT(*) FROM tasks WHERE project_id = $1 GROUP BY status`,
		projectID,
	)
	if err != nil {
		return 0, nil, err
	}
	defer rows.Close()

	byStatus := make(map[string]int)
	total := 0
	for rows.Next() {
		var status string
		var c int
		if err := rows.Scan(&status, &c); err != nil {
			return 0, nil, err
		}
		byStatus[status] = c
		total += c
	}
	if err := rows.Err(); err != nil {
		return 0, nil, err
	}
	return total, byStatus, nil
}

// RecomputeProgress 依 spec §66 公式重新計算 progress 並寫回
//
//	progress = ROUND(100 * COUNT(status='done') / NULLIF(COUNT(status NOT IN ('cancelled')), 0))
//
// 沒有 task 或全部 cancelled → progress = 0（NULLIF 分母為 0 fallback）
//
// 回傳新的 progress 值
func (r *ProjectRepository) RecomputeProgress(ctx context.Context, projectID uuid.UUID) (int, error) {
	var newProgress int
	err := r.pool.QueryRow(ctx,
		`UPDATE projects p
		 SET progress = COALESCE((
		     SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'done')
		         / NULLIF(COUNT(*) FILTER (WHERE status NOT IN ('cancelled')), 0))
		     FROM tasks
		     WHERE project_id = p.id
		 ), 0),
		 updated_at = NOW()
		 WHERE p.id = $1
		 RETURNING progress`,
		projectID,
	).Scan(&newProgress)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, model.NewAppError(404, model.ErrCodeProjectNotFound, "專案不存在")
	}
	if err != nil {
		return 0, err
	}
	return newProgress, nil
}
