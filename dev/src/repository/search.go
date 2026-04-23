package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// escapeLikePattern 對 LIKE/ILIKE 的特殊字元做 escape
func escapeLikePattern(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "%", "\\%")
	s = strings.ReplaceAll(s, "_", "\\_")
	return s
}

// SearchResult 搜尋結果（從 DB 回傳）
type SearchResult struct {
	EntryID        uuid.UUID
	Title          *string
	Summary        *string
	ContentPreview *string
	Tags           []string
	Domains        []string
	Context        *json.RawMessage
	Confidence     float64
	SupersededBy   *uuid.UUID
	Relevance      float64
}

// SearchRepository 搜尋專用 repository
type SearchRepository struct {
	pool *pgxpool.Pool
}

// NewSearchRepository 建立新的 SearchRepository
func NewSearchRepository(pool *pgxpool.Pool) *SearchRepository {
	return &SearchRepository{pool: pool}
}

// SearchParams 搜尋參數
type SearchParams struct {
	Keywords      []string            // 搜尋關鍵字（原始 query + 同義詞）
	CategoryID    *uuid.UUID          // 可選的分類過濾
	Tags          []string            // 可選的 tag 過濾（AND 邏輯）
	Domains       []string            // 可選的 domain 過濾（AND 邏輯）
	ContextFilter map[string][]string // 可選的 context 子欄位過濾
	Limit         int                 // 回傳數量上限
	Offset        int                 // 分頁偏移
}

// Search 執行加權全文搜尋
// 使用 tsvector 加權搜尋（title:A, tags:A, content:B）+ pg_bigm LIKE 模糊比對
// 多個關鍵字以 OR 邏輯搜尋，ts_rank 取最高分
func (r *SearchRepository) Search(ctx context.Context, params SearchParams) ([]SearchResult, int, error) {
	if len(params.Keywords) == 0 {
		return []SearchResult{}, 0, nil
	}

	// 建構動態 WHERE 條件
	conditions := []string{}
	args := []interface{}{}
	argIdx := 1

	// 全文搜尋條件：任一關鍵字匹配即可（OR）
	searchConditions := []string{}
	keywordArgIndices := []int{}
	for _, kw := range params.Keywords {
		kwIdx := argIdx
		escapedKwIdx := argIdx + 1
		keywordArgIndices = append(keywordArgIndices, kwIdx)
		searchConditions = append(searchConditions, fmt.Sprintf(
			`((setweight(to_tsvector('simple', coalesce(e.summary, '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(e.title, '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(array_to_string(e.tags, ' '), '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(array_to_string(e.domains, ' '), '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(e.content, '')), 'B'))
			  @@ plainto_tsquery('simple', $%d)
			 OR (coalesce(e.summary,'') || ' ' || coalesce(e.title,'') || ' ' || coalesce(e.content,''))
			    LIKE '%%' || $%d || '%%' ESCAPE '\\'
			 OR EXISTS (SELECT 1 FROM unnest(e.tags) AS t WHERE t ILIKE '%%' || $%d || '%%' ESCAPE '\\'))`,
			kwIdx, escapedKwIdx, escapedKwIdx,
		))
		args = append(args, kw, escapeLikePattern(kw))
		argIdx += 2
	}
	conditions = append(conditions, "("+strings.Join(searchConditions, " OR ")+")")

	// category_id 過濾
	if params.CategoryID != nil {
		conditions = append(conditions, fmt.Sprintf("e.category_id = $%d", argIdx))
		args = append(args, *params.CategoryID)
		argIdx++
	}

	// tag 過濾（AND 邏輯）
	if len(params.Tags) > 0 {
		conditions = append(conditions, fmt.Sprintf("e.tags @> $%d::text[]", argIdx))
		args = append(args, params.Tags)
		argIdx++
	}

	// domain 過濾（AND 邏輯）
	if len(params.Domains) > 0 {
		conditions = append(conditions, fmt.Sprintf("e.domains @> $%d::text[]", argIdx))
		args = append(args, params.Domains)
		argIdx++
	}

	// context 子欄位過濾
	for key, values := range params.ContextFilter {
		jsonObj := map[string][]string{key: values}
		jsonBytes, _ := json.Marshal(jsonObj)
		conditions = append(conditions, fmt.Sprintf("e.context @> $%d::jsonb", argIdx))
		args = append(args, string(jsonBytes))
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// 建構 ts_rank：取所有關鍵字中最高的 rank
	rankExprs := []string{}
	for _, kwIdx := range keywordArgIndices {
		rankExprs = append(rankExprs, fmt.Sprintf(
			`ts_rank(
			   setweight(to_tsvector('simple', coalesce(e.summary, '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(e.title, '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(array_to_string(e.tags, ' '), '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(array_to_string(e.domains, ' '), '')), 'A') ||
			   setweight(to_tsvector('simple', coalesce(e.content, '')), 'B'),
			   plainto_tsquery('simple', $%d)
			 )`, kwIdx,
		))
	}
	rankExpr := "GREATEST(" + strings.Join(rankExprs, ", ") + ")"

	// 計算 total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM entries e %s", whereClause)
	var total int
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	if total == 0 {
		return []SearchResult{}, 0, nil
	}

	// 查詢資料（relevance = ts_rank * confidence）
	dataQuery := fmt.Sprintf(
		`SELECT e.id, e.title, e.summary, LEFT(e.content, 200) AS content_preview,
		        e.tags, e.domains, e.context, e.confidence, e.superseded_by, (%s * e.confidence) AS relevance
		 FROM entries e
		 %s
		 ORDER BY relevance DESC, e.created_at DESC
		 LIMIT $%d OFFSET $%d`,
		rankExpr, whereClause, argIdx, argIdx+1,
	)
	args = append(args, params.Limit, params.Offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	results := make([]SearchResult, 0)
	for rows.Next() {
		var item SearchResult
		if err := rows.Scan(
			&item.EntryID, &item.Title, &item.Summary, &item.ContentPreview,
			&item.Tags, &item.Domains, &item.Context, &item.Confidence, &item.SupersededBy, &item.Relevance,
		); err != nil {
			return nil, 0, err
		}
		results = append(results, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return results, total, nil
}
