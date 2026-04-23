package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// EntryRepository 知識條目資料庫操作
type EntryRepository struct {
	pool *pgxpool.Pool
}

// NewEntryRepository 建立新的 EntryRepository
func NewEntryRepository(pool *pgxpool.Pool) *EntryRepository {
	return &EntryRepository{pool: pool}
}

// Create 建立新知識條目
func (r *EntryRepository) Create(ctx context.Context, entry *model.Entry) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO entries (id, title, content, category_id, source, source_type, source_ref, tags, is_archived, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		entry.ID, entry.Title, entry.Content, entry.CategoryID,
		entry.Source, entry.SourceType, entry.SourceRef,
		entry.Tags, entry.IsArchived, entry.CreatedAt, entry.UpdatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "idx_entries_source") {
			return model.NewAppError(409, model.ErrCodeDuplicateSource, "相同 source_type + source_ref 已存在")
		}
		if strings.Contains(err.Error(), "chk_title_or_content") {
			return model.NewAppError(400, model.ErrCodeInvalidInput, "title 和 content 至少需要填寫一個")
		}
		return err
	}
	return nil
}

// FindByID 透過 ID 查找知識條目（完整 content）
func (r *EntryRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	entry := &model.Entry{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, title, content, category_id, source, source_type, source_ref, tags, is_archived, created_at, updated_at
		 FROM entries WHERE id = $1`,
		id,
	).Scan(
		&entry.ID, &entry.Title, &entry.Content, &entry.CategoryID,
		&entry.Source, &entry.SourceType, &entry.SourceRef,
		&entry.Tags, &entry.IsArchived, &entry.CreatedAt, &entry.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return entry, nil
}

// List 列表查詢知識條目（含分頁、過濾、搜尋）
func (r *EntryRepository) List(ctx context.Context, filter model.EntryFilter) (*model.EntryListResult, error) {
	// 動態建構 WHERE 條件
	conditions := []string{}
	args := []interface{}{}
	argIdx := 1

	// category_id 過濾
	if filter.CategoryID != nil {
		if *filter.CategoryID == "null" {
			conditions = append(conditions, "e.category_id IS NULL")
		} else {
			catID, err := uuid.Parse(*filter.CategoryID)
			if err != nil {
				return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "無效的 category_id 格式")
			}
			conditions = append(conditions, fmt.Sprintf("e.category_id = $%d", argIdx))
			args = append(args, catID)
			argIdx++
		}
	}

	// is_archived 過濾
	if filter.IsArchived != nil {
		conditions = append(conditions, fmt.Sprintf("e.is_archived = $%d", argIdx))
		args = append(args, *filter.IsArchived)
		argIdx++
	}

	// tag 過濾（AND 邏輯）
	if len(filter.Tags) > 0 {
		conditions = append(conditions, fmt.Sprintf("e.tags @> $%d::text[]", argIdx))
		args = append(args, filter.Tags)
		argIdx++
	}

	// 全文搜尋
	hasSearch := false
	searchArgIdx := 0
	if filter.Search != "" {
		hasSearch = true
		searchArgIdx = argIdx
		// 加權 tsvector 全文搜尋 + pg_trgm 模糊搜尋 + tag ILIKE
		searchCondition := fmt.Sprintf(
			`((setweight(to_tsvector('simple', coalesce(e.title, '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(array_to_string(e.tags, ' '), '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(e.content, '')), 'B'))
			  @@ plainto_tsquery('simple', $%d)
			 OR (coalesce(e.title,'') || ' ' || coalesce(e.content,'')) %% $%d
			 OR EXISTS (SELECT 1 FROM unnest(e.tags) AS t WHERE t ILIKE '%%' || $%d || '%%'))`,
			argIdx, argIdx, argIdx,
		)
		conditions = append(conditions, searchCondition)
		args = append(args, filter.Search)
		argIdx++
	}

	// 建構 WHERE 子句
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// 排序（搜尋時以 ts_rank 為主排序，覆蓋 sort 參數）
	var orderClause string
	if hasSearch {
		orderClause = fmt.Sprintf(
			`ts_rank(
			   setweight(to_tsvector('simple', coalesce(e.title, '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(array_to_string(e.tags, ' '), '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(e.content, '')), 'B'),
			   plainto_tsquery('simple', $%d)
			 ) DESC, e.created_at DESC`, searchArgIdx)
	} else {
		sortColumn := "e.created_at"
		switch filter.Sort {
		case "title":
			sortColumn = "e.title"
		case "updated_at":
			sortColumn = "e.updated_at"
		case "created_at":
			sortColumn = "e.created_at"
		}
		orderDir := "DESC"
		if filter.Order == "asc" {
			orderDir = "ASC"
		}
		orderClause = fmt.Sprintf("%s %s", sortColumn, orderDir)
	}

	// 計算 total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM entries e %s", whereClause)
	var total int
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	// 分頁計算
	offset := (filter.Page - 1) * filter.PerPage
	totalPages := 0
	if total > 0 {
		totalPages = (total + filter.PerPage - 1) / filter.PerPage
	}

	// 查詢資料（content_preview 用 LEFT(content, 200)，列表不含 source/source_type/source_ref）
	dataQuery := fmt.Sprintf(
		`SELECT e.id, e.title, LEFT(e.content, 200) AS content_preview, e.category_id,
		        e.tags, e.is_archived, e.created_at, e.updated_at
		 FROM entries e
		 %s
		 ORDER BY %s
		 LIMIT $%d OFFSET $%d`,
		whereClause, orderClause, argIdx, argIdx+1,
	)
	args = append(args, filter.PerPage, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.EntryListItem, 0)
	for rows.Next() {
		var item model.EntryListItem
		if err := rows.Scan(
			&item.ID, &item.Title, &item.ContentPreview, &item.CategoryID,
			&item.Tags, &item.IsArchived, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &model.EntryListResult{
		Data: items,
		Pagination: model.Pagination{
			Page:       filter.Page,
			PerPage:    filter.PerPage,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

// Update 部分更新知識條目
func (r *EntryRepository) Update(ctx context.Context, entry *model.Entry) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE entries
		 SET title = $1, content = $2, category_id = $3, source = $4, source_type = $5,
		     source_ref = $6, tags = $7, is_archived = $8, updated_at = NOW()
		 WHERE id = $9`,
		entry.Title, entry.Content, entry.CategoryID,
		entry.Source, entry.SourceType, entry.SourceRef,
		entry.Tags, entry.IsArchived, entry.ID,
	)
	if err != nil {
		if strings.Contains(err.Error(), "idx_entries_source") {
			return model.NewAppError(409, model.ErrCodeDuplicateSource, "相同 source_type + source_ref 已存在")
		}
		if strings.Contains(err.Error(), "chk_title_or_content") {
			return model.NewAppError(400, model.ErrCodeInvalidInput, "title 和 content 至少需要填寫一個")
		}
		return err
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(404, model.ErrCodeNotFound, "知識條目不存在")
	}
	return nil
}

// Delete 硬刪除知識條目
func (r *EntryRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM entries WHERE id = $1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(404, model.ErrCodeNotFound, "知識條目不存在")
	}
	return nil
}

// ExistsBySourceRef 檢查指定 source_type + source_ref 的 entry 是否已存在（用於去重）
func (r *EntryRepository) ExistsBySourceRef(ctx context.Context, sourceType, sourceRef string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM entries WHERE source_type = $1 AND source_ref = $2)",
		sourceType, sourceRef,
	).Scan(&exists)
	return exists, err
}

// CategoryExists 檢查分類是否存在
func (r *EntryRepository) CategoryExists(ctx context.Context, id uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM categories WHERE id = $1)", id,
	).Scan(&exists)
	return exists, err
}
