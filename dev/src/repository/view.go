package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ViewRepository saved_views 資料庫操作
type ViewRepository struct {
	pool *pgxpool.Pool
}

// NewViewRepository 建立新的 ViewRepository
func NewViewRepository(pool *pgxpool.Pool) *ViewRepository {
	return &ViewRepository{pool: pool}
}

// FindAll 列出所有 saved views，依 position 排序
func (r *ViewRepository) FindAll(ctx context.Context) ([]*model.SavedView, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, scope, filters, sort_by, sort_dir, icon, position, created_at, updated_at
		 FROM saved_views
		 ORDER BY position ASC, created_at ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var views []*model.SavedView
	for rows.Next() {
		v := &model.SavedView{}
		if err := rows.Scan(
			&v.ID, &v.Name, &v.Scope, &v.Filters,
			&v.SortBy, &v.SortDir, &v.Icon, &v.Position,
			&v.CreatedAt, &v.UpdatedAt,
		); err != nil {
			return nil, err
		}
		views = append(views, v)
	}
	return views, rows.Err()
}

// FindByID 透過 ID 查找
func (r *ViewRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.SavedView, error) {
	v := &model.SavedView{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, scope, filters, sort_by, sort_dir, icon, position, created_at, updated_at
		 FROM saved_views WHERE id = $1`,
		id,
	).Scan(
		&v.ID, &v.Name, &v.Scope, &v.Filters,
		&v.SortBy, &v.SortDir, &v.Icon, &v.Position,
		&v.CreatedAt, &v.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return v, err
}

// Count 回傳目前 view 數量
func (r *ViewRepository) Count(ctx context.Context) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM saved_views`).Scan(&n)
	return n, err
}

// MaxPosition 取得目前最大 position
func (r *ViewRepository) MaxPosition(ctx context.Context) (int, error) {
	var pos int
	err := r.pool.QueryRow(ctx, `SELECT COALESCE(MAX(position), -1) FROM saved_views`).Scan(&pos)
	return pos, err
}

// Create 建立新 saved view
func (r *ViewRepository) Create(ctx context.Context, v *model.SavedView) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO saved_views (id, name, scope, filters, sort_by, sort_dir, icon, position, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		v.ID, v.Name, v.Scope, v.Filters, v.SortBy, v.SortDir, v.Icon,
		v.Position, v.CreatedAt, v.UpdatedAt,
	)
	if err != nil && strings.Contains(err.Error(), "idx_saved_views_name_scope_lower") {
		return model.NewAppError(409, model.ErrCodeDuplicateView, "相同 scope 下已有同名的 view")
	}
	return err
}

// Update 更新 saved view
func (r *ViewRepository) Update(ctx context.Context, v *model.SavedView) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE saved_views
		 SET name=$1, scope=$2, filters=$3, sort_by=$4, sort_dir=$5, icon=$6, position=$7, updated_at=$8
		 WHERE id=$9`,
		v.Name, v.Scope, v.Filters, v.SortBy, v.SortDir, v.Icon,
		v.Position, v.UpdatedAt, v.ID,
	)
	if err != nil && strings.Contains(err.Error(), "idx_saved_views_name_scope_lower") {
		return model.NewAppError(409, model.ErrCodeDuplicateView, "相同 scope 下已有同名的 view")
	}
	return err
}

// Delete 刪除 saved view
func (r *ViewRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM saved_views WHERE id=$1`, id)
	return err
}

// Reorder 批次更新 position（ids 的順序即新順序）
func (r *ViewRepository) Reorder(ctx context.Context, ids []uuid.UUID) (int, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	updated := 0
	for i, id := range ids {
		tag, err := tx.Exec(ctx,
			`UPDATE saved_views SET position=$1, updated_at=NOW() WHERE id=$2`,
			i, id,
		)
		if err != nil {
			return 0, err
		}
		updated += int(tag.RowsAffected())
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return updated, nil
}
