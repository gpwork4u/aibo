package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5"
)

// SupersedeEntry 設定取代關係：將 oldID 的 superseded_by 設為 newID，並降低 confidence
func (r *EntryRepository) SupersedeEntry(ctx context.Context, oldID, newID uuid.UUID) (*model.Entry, error) {
	entry := &model.Entry{}
	err := r.pool.QueryRow(ctx,
		`UPDATE entries
		 SET superseded_by = $2,
		     confidence = LEAST(confidence, 0.2),
		     updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, title, content, summary, detail, action, category_id, source, source_type, source_ref, tags, is_archived,
		           confidence, confirmations, flags_count, superseded_by, created_at, updated_at`,
		oldID, newID,
	).Scan(
		&entry.ID, &entry.Title, &entry.Content, &entry.Summary, &entry.Detail, &entry.Action,
		&entry.CategoryID, &entry.Source, &entry.SourceType, &entry.SourceRef,
		&entry.Tags, &entry.IsArchived,
		&entry.Confidence, &entry.Confirmations, &entry.FlagsCount, &entry.SupersededBy,
		&entry.CreatedAt, &entry.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "知識條目不存在")
	}
	if err != nil {
		return nil, err
	}
	return entry, nil
}

// ClearSupersede 清除取代關係
func (r *EntryRepository) ClearSupersede(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	entry := &model.Entry{}
	err := r.pool.QueryRow(ctx,
		`UPDATE entries
		 SET superseded_by = NULL,
		     updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, title, content, summary, detail, action, category_id, source, source_type, source_ref, tags, is_archived,
		           confidence, confirmations, flags_count, superseded_by, created_at, updated_at`,
		id,
	).Scan(
		&entry.ID, &entry.Title, &entry.Content, &entry.Summary, &entry.Detail, &entry.Action,
		&entry.CategoryID, &entry.Source, &entry.SourceType, &entry.SourceRef,
		&entry.Tags, &entry.IsArchived,
		&entry.Confidence, &entry.Confirmations, &entry.FlagsCount, &entry.SupersededBy,
		&entry.CreatedAt, &entry.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "知識條目不存在")
	}
	if err != nil {
		return nil, err
	}
	return entry, nil
}

// HistoryItem 版本鏈中的一個節點（從 DB 查詢用）
type HistoryItem struct {
	ID           uuid.UUID
	Title        *string
	Confidence   float64
	SupersededBy *uuid.UUID
	CreatedAt    time.Time
}

// GetSupersedeChain 使用 WITH RECURSIVE 查詢版本鏈（從給定 entry 向後追蹤，最多 10 層）
func (r *EntryRepository) GetSupersedeChain(ctx context.Context, id uuid.UUID) ([]HistoryItem, error) {
	rows, err := r.pool.Query(ctx,
		`WITH RECURSIVE chain AS (
		   SELECT id, title, confidence, superseded_by, created_at, 1 AS depth
		   FROM entries
		   WHERE id = $1
		   UNION ALL
		   SELECT e.id, e.title, e.confidence, e.superseded_by, e.created_at, c.depth + 1
		   FROM entries e
		   INNER JOIN chain c ON c.superseded_by = e.id
		   WHERE c.depth < 10
		 )
		 SELECT id, title, confidence, superseded_by, created_at
		 FROM chain
		 ORDER BY depth ASC`,
		id,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]HistoryItem, 0)
	for rows.Next() {
		var item HistoryItem
		if err := rows.Scan(&item.ID, &item.Title, &item.Confidence, &item.SupersededBy, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

// CheckCircularSupersede 檢查設定 supersede 關係是否會形成循環
// 從 newID 開始，沿著 superseded_by 鏈往後追蹤，看是否會到達 oldID
func (r *EntryRepository) CheckCircularSupersede(ctx context.Context, oldID, newID uuid.UUID) (bool, error) {
	var isCircular bool
	err := r.pool.QueryRow(ctx,
		`WITH RECURSIVE chain AS (
		   SELECT id, superseded_by, 1 AS depth
		   FROM entries
		   WHERE id = $1
		   UNION ALL
		   SELECT e.id, e.superseded_by, c.depth + 1
		   FROM entries e
		   INNER JOIN chain c ON c.superseded_by = e.id
		   WHERE c.depth < 10
		 )
		 SELECT EXISTS(SELECT 1 FROM chain WHERE id = $2)`,
		newID, oldID,
	).Scan(&isCircular)
	return isCircular, err
}
