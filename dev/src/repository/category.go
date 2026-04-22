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

// CategoryRepository 分類資料庫操作
type CategoryRepository struct {
	pool *pgxpool.Pool
}

// NewCategoryRepository 建立新的 CategoryRepository
func NewCategoryRepository(pool *pgxpool.Pool) *CategoryRepository {
	return &CategoryRepository{pool: pool}
}

// Create 建立新分類
func (r *CategoryRepository) Create(ctx context.Context, cat *model.Category) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO categories (id, name, description, sort_order, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		cat.ID, cat.Name, cat.Description, cat.SortOrder, cat.CreatedAt, cat.UpdatedAt,
	)
	if err != nil && strings.Contains(err.Error(), "idx_categories_name_lower") {
		return model.NewAppError(409, model.ErrCodeDuplicateCategory, "分類名稱已存在")
	}
	return err
}

// FindByID 透過 ID 查找分類（含 entry_count）
func (r *CategoryRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.Category, error) {
	cat := &model.Category{}

	// 檢查 entries 表是否存在，決定是否加入 entry_count
	entryCount := 0
	err := r.pool.QueryRow(ctx,
		`SELECT c.id, c.name, c.description, c.sort_order, c.created_at, c.updated_at
		 FROM categories c
		 WHERE c.id = $1`,
		id,
	).Scan(
		&cat.ID, &cat.Name, &cat.Description, &cat.SortOrder,
		&cat.CreatedAt, &cat.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// 嘗試查詢 entry_count（entries 表可能尚未建立）
	_ = r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM entries WHERE category_id = $1`, id,
	).Scan(&entryCount)
	cat.EntryCount = entryCount

	return cat, nil
}

// List 列出所有分類（含 entry_count，按 sort_order ASC, name ASC 排序）
func (r *CategoryRepository) List(ctx context.Context) ([]model.Category, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT c.id, c.name, c.description, c.sort_order, c.created_at, c.updated_at
		 FROM categories c
		 ORDER BY c.sort_order ASC, c.name ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []model.Category
	for rows.Next() {
		var cat model.Category
		if err := rows.Scan(
			&cat.ID, &cat.Name, &cat.Description, &cat.SortOrder,
			&cat.CreatedAt, &cat.UpdatedAt,
		); err != nil {
			return nil, err
		}
		categories = append(categories, cat)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// 嘗試批次查詢 entry_count（entries 表可能尚未建立）
	if len(categories) > 0 {
		for i := range categories {
			var count int
			err := r.pool.QueryRow(ctx,
				`SELECT COUNT(*) FROM entries WHERE category_id = $1`,
				categories[i].ID,
			).Scan(&count)
			if err == nil {
				categories[i].EntryCount = count
			}
		}
	}

	return categories, nil
}

// Update 更新分類
func (r *CategoryRepository) Update(ctx context.Context, cat *model.Category) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE categories
		 SET name = $1, description = $2, sort_order = $3, updated_at = NOW()
		 WHERE id = $4`,
		cat.Name, cat.Description, cat.SortOrder, cat.ID,
	)
	if err != nil {
		if strings.Contains(err.Error(), "idx_categories_name_lower") {
			return model.NewAppError(409, model.ErrCodeDuplicateCategory, "分類名稱已存在")
		}
		return err
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(404, model.ErrCodeNotFound, "分類不存在")
	}
	return nil
}

// Delete 刪除分類（硬刪除）
func (r *CategoryRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM categories WHERE id = $1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(404, model.ErrCodeNotFound, "分類不存在")
	}
	return nil
}

// ExistsByID 檢查分類是否存在
func (r *CategoryRepository) ExistsByID(ctx context.Context, id uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM categories WHERE id = $1)", id,
	).Scan(&exists)
	return exists, err
}
