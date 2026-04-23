package repository

import (
	"context"
	"encoding/json"
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
	qualityFlagsJSON, err := json.Marshal(entry.QualityFlags)
	if err != nil || entry.QualityFlags == nil {
		qualityFlagsJSON = []byte("[]")
	}

	_, err = r.pool.Exec(ctx,
		`INSERT INTO entries (id, title, content, summary, detail, action, category_id, source, source_type, source_ref, tags, domains, context, is_archived, quality_flags, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
		entry.ID, entry.Title, entry.Content, entry.Summary, entry.Detail, entry.Action,
		entry.CategoryID, entry.Source, entry.SourceType, entry.SourceRef,
		entry.Tags, entry.Domains, entry.Context, entry.IsArchived, qualityFlagsJSON, entry.CreatedAt, entry.UpdatedAt,
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
	var qualityFlagsJSON []byte
	err := r.pool.QueryRow(ctx,
		`SELECT id, title, content, summary, detail, action, category_id, source, source_type, source_ref, tags, domains, context, is_archived,
		        confidence, confirmations, flags_count, superseded_by, quality_flags, created_at, updated_at
		 FROM entries WHERE id = $1`,
		id,
	).Scan(
		&entry.ID, &entry.Title, &entry.Content, &entry.Summary, &entry.Detail, &entry.Action,
		&entry.CategoryID, &entry.Source, &entry.SourceType, &entry.SourceRef,
		&entry.Tags, &entry.Domains, &entry.Context, &entry.IsArchived,
		&entry.Confidence, &entry.Confirmations, &entry.FlagsCount, &entry.SupersededBy,
		&qualityFlagsJSON, &entry.CreatedAt, &entry.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if qualityFlagsJSON != nil {
		_ = json.Unmarshal(qualityFlagsJSON, &entry.QualityFlags)
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

	// domain 過濾（AND 邏輯）
	if len(filter.Domains) > 0 {
		conditions = append(conditions, fmt.Sprintf("e.domains @> $%d::text[]", argIdx))
		args = append(args, filter.Domains)
		argIdx++
	}

	// context 子欄位過濾
	for key, values := range filter.ContextFilter {
		jsonObj := map[string][]string{key: values}
		jsonBytes, _ := json.Marshal(jsonObj)
		conditions = append(conditions, fmt.Sprintf("e.context @> $%d::jsonb", argIdx))
		args = append(args, string(jsonBytes))
		argIdx++
	}

	// lifecycle_status 過濾（計算欄位，用 SQL 條件實現）
	if filter.LifecycleStatus != "" {
		switch filter.LifecycleStatus {
		case "active":
			conditions = append(conditions, "e.superseded_by IS NULL AND e.confidence > 0.2")
		case "superseded":
			conditions = append(conditions, "e.superseded_by IS NOT NULL")
		case "degraded":
			conditions = append(conditions, "e.superseded_by IS NULL AND e.confidence <= 0.2")
		}
	}

	// 全文搜尋
	hasSearch := false
	searchArgIdx := 0
	if filter.Search != "" {
		hasSearch = true
		searchArgIdx = argIdx
		// 加權 tsvector 全文搜尋 + pg_bigm LIKE 模糊搜尋 + tag ILIKE
		escapedArgIdx := argIdx + 1
		searchCondition := fmt.Sprintf(
			`((setweight(to_tsvector('simple', coalesce(e.summary, '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(e.title, '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(array_to_string(e.tags, ' '), '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(array_to_string(e.domains, ' '), '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(e.content, '')), 'B'))
			  @@ plainto_tsquery('simple', $%d)
			 OR (coalesce(e.summary,'') || ' ' || coalesce(e.title,'') || ' ' || coalesce(e.content,''))
			    LIKE '%%' || $%d || '%%' ESCAPE '\\'
			 OR EXISTS (SELECT 1 FROM unnest(e.tags) AS t WHERE t ILIKE '%%' || $%d || '%%' ESCAPE '\\'))`,
			argIdx, escapedArgIdx, escapedArgIdx,
		)
		conditions = append(conditions, searchCondition)
		args = append(args, filter.Search, escapeLikePattern(filter.Search))
		argIdx += 2
	}

	// 建構 WHERE 子句
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// 排序（搜尋時以 ts_rank * confidence 為主排序，覆蓋 sort 參數）
	var orderClause string
	if hasSearch {
		orderClause = fmt.Sprintf(
			`(ts_rank(
			   setweight(to_tsvector('simple', coalesce(e.summary, '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(e.title, '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(array_to_string(e.tags, ' '), '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(array_to_string(e.domains, ' '), '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(e.content, '')), 'B'),
			   plainto_tsquery('simple', $%d)
			 ) * e.confidence) DESC, e.created_at DESC`, searchArgIdx)
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
		`SELECT e.id, e.title, e.summary, LEFT(e.content, 200) AS content_preview, e.category_id,
		        e.tags, e.domains, e.context, e.is_archived, e.confidence, e.confirmations, e.flags_count, e.superseded_by,
		        e.quality_flags, e.created_at, e.updated_at
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
		var qfJSON []byte
		if err := rows.Scan(
			&item.ID, &item.Title, &item.Summary, &item.ContentPreview, &item.CategoryID,
			&item.Tags, &item.Domains, &item.Context, &item.IsArchived, &item.Confidence, &item.Confirmations, &item.FlagsCount, &item.SupersededBy,
			&qfJSON, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if qfJSON != nil {
			_ = json.Unmarshal(qfJSON, &item.QualityFlags)
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
	updateQFJSON, jsonErr := json.Marshal(entry.QualityFlags)
	if jsonErr != nil || entry.QualityFlags == nil {
		updateQFJSON = []byte("[]")
	}

	tag, err := r.pool.Exec(ctx,
		`UPDATE entries
		 SET title = $1, content = $2, summary = $3, detail = $4, action = $5,
		     category_id = $6, source = $7, source_type = $8,
		     source_ref = $9, tags = $10, domains = $11, context = $12, is_archived = $13, quality_flags = $14, updated_at = NOW()
		 WHERE id = $15`,
		entry.Title, entry.Content, entry.Summary, entry.Detail, entry.Action,
		entry.CategoryID, entry.Source, entry.SourceType, entry.SourceRef,
		entry.Tags, entry.Domains, entry.Context, entry.IsArchived, updateQFJSON, entry.ID,
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

// ConfirmEntry 確認知識條目有用，增加 confirmations 並重算 confidence
func (r *EntryRepository) ConfirmEntry(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	entry := &model.Entry{}
	var confirmQFJSON []byte
	err := r.pool.QueryRow(ctx,
		`UPDATE entries
		 SET confirmations = confirmations + 1,
		     confidence = LEAST(0.5 + (confirmations + 1) * 0.05 - flags_count * 0.1, 1.0),
		     updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, title, content, summary, detail, action, category_id, source, source_type, source_ref, tags, domains, context, is_archived,
		           confidence, confirmations, flags_count, superseded_by, quality_flags, created_at, updated_at`,
		id,
	).Scan(
		&entry.ID, &entry.Title, &entry.Content, &entry.Summary, &entry.Detail, &entry.Action,
		&entry.CategoryID, &entry.Source, &entry.SourceType, &entry.SourceRef,
		&entry.Tags, &entry.Domains, &entry.Context, &entry.IsArchived,
		&entry.Confidence, &entry.Confirmations, &entry.FlagsCount, &entry.SupersededBy,
		&confirmQFJSON, &entry.CreatedAt, &entry.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "知識條目不存在")
	}
	if err != nil {
		return nil, err
	}
	if confirmQFJSON != nil {
		_ = json.Unmarshal(confirmQFJSON, &entry.QualityFlags)
	}
	return entry, nil
}

// FlagEntry 標記知識條目問題，建立 flag 記錄並更新 confidence（事務）
func (r *EntryRepository) FlagEntry(ctx context.Context, id uuid.UUID, reason string, note *string) (*model.Entry, *model.EntryFlag, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	// 建立 flag 記錄
	flag := &model.EntryFlag{}
	err = tx.QueryRow(ctx,
		`INSERT INTO entry_flags (entry_id, reason, note)
		 VALUES ($1, $2, $3)
		 RETURNING id, entry_id, reason, note, created_at`,
		id, reason, note,
	).Scan(&flag.ID, &flag.EntryID, &flag.Reason, &flag.Note, &flag.CreatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "entry_flags_entry_id_fkey") {
			return nil, nil, model.NewAppError(404, model.ErrCodeNotFound, "知識條目不存在")
		}
		return nil, nil, err
	}

	// 更新 entry 的 flags_count 和 confidence
	entry := &model.Entry{}
	var flagQFJSON []byte
	err = tx.QueryRow(ctx,
		`UPDATE entries
		 SET flags_count = flags_count + 1,
		     confidence = GREATEST(0.5 + confirmations * 0.05 - (flags_count + 1) * 0.1, 0.0),
		     updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, title, content, summary, detail, action, category_id, source, source_type, source_ref, tags, domains, context, is_archived,
		           confidence, confirmations, flags_count, superseded_by, quality_flags, created_at, updated_at`,
		id,
	).Scan(
		&entry.ID, &entry.Title, &entry.Content, &entry.Summary, &entry.Detail, &entry.Action,
		&entry.CategoryID, &entry.Source, &entry.SourceType, &entry.SourceRef,
		&entry.Tags, &entry.Domains, &entry.Context, &entry.IsArchived,
		&entry.Confidence, &entry.Confirmations, &entry.FlagsCount, &entry.SupersededBy,
		&flagQFJSON, &entry.CreatedAt, &entry.UpdatedAt,
	)
	if err != nil {
		return nil, nil, err
	}
	if flagQFJSON != nil {
		_ = json.Unmarshal(flagQFJSON, &entry.QualityFlags)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}

	return entry, flag, nil
}

// GetFlags 取得知識條目的所有 flag 記錄
func (r *EntryRepository) GetFlags(ctx context.Context, entryID uuid.UUID) ([]model.EntryFlag, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, entry_id, reason, note, created_at
		 FROM entry_flags
		 WHERE entry_id = $1
		 ORDER BY created_at DESC`,
		entryID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	flags := make([]model.EntryFlag, 0)
	for rows.Next() {
		var flag model.EntryFlag
		if err := rows.Scan(&flag.ID, &flag.EntryID, &flag.Reason, &flag.Note, &flag.CreatedAt); err != nil {
			return nil, err
		}
		flags = append(flags, flag)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return flags, nil
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
