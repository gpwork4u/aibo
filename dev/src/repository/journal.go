package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// JournalRepository 每日日記資料庫操作（F-028）
type JournalRepository struct {
	pool *pgxpool.Pool
}

// NewJournalRepository 建立新的 JournalRepository
func NewJournalRepository(pool *pgxpool.Pool) *JournalRepository {
	return &JournalRepository{pool: pool}
}

// JournalListOptions JournalRepository.List 的過濾條件
type JournalListOptions struct {
	Page    int
	PerPage int
	Since   *time.Time // inclusive
	Until   *time.Time // inclusive
	Mood    *string
	IsDraft *bool
}

// JournalListResult List 的回傳結果
type JournalListResult struct {
	Items []*model.Journal
	Total int64
}

const journalSelectCols = `id, date, title, content, mood, highlights, is_draft, generated_by,
	llm_provider_id, created_at, updated_at`

// scanJournal 將 row 掃進 *model.Journal
func scanJournal(row pgx.Row) (*model.Journal, error) {
	j := &model.Journal{}
	err := row.Scan(
		&j.ID, &j.Date, &j.Title, &j.Content, &j.Mood, &j.Highlights,
		&j.IsDraft, &j.GeneratedBy, &j.LlmProviderID, &j.CreatedAt, &j.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return j, nil
}

// mapPgErrToAppError 將常見的 PgError 轉成 model.AppError
//
// 特別處理：
//   - journal_entries.date 唯一鍵衝突 → 409 JOURNAL_EXISTS
//   - chk_journal_content_len → 400 INVALID_INPUT
func mapJournalPgErr(err error) error {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		// 23505 = unique_violation；ConstraintName 在 PG 通常是 journal_entries_date_key
		if pgErr.Code == "23505" && (pgErr.ConstraintName == "journal_entries_date_key" ||
			strings.Contains(pgErr.ConstraintName, "journal_entries") && strings.Contains(pgErr.ConstraintName, "date")) {
			return model.NewAppError(409, model.ErrCodeJournalExists, "當日日記已存在")
		}
		// 23514 = check_violation
		if pgErr.Code == "23514" {
			switch pgErr.ConstraintName {
			case "chk_journal_content_len":
				return model.NewAppError(400, model.ErrCodeInvalidInput, "日記內容超過 20000 字上限")
			case "chk_journal_mood":
				return model.NewAppError(400, model.ErrCodeInvalidInput, "mood 必須為 great / ok / down")
			case "chk_journal_generated_by":
				return model.NewAppError(400, model.ErrCodeInvalidInput, "generated_by 必須為 user / llm")
			case "chk_journal_source_type":
				return model.NewAppError(400, model.ErrCodeInvalidInput, "source_type 必須為 entry / gcal_event")
			}
		}
	}
	return err
}

// Create 建立日記 + 批次插入 source_refs（同一個 transaction）
//
// 行為：
//   - 若 j.ID 為零值，會由 DB 端 gen_random_uuid()
//   - generated_by 預設由呼叫端決定（user 路徑下應填 'user'）
//   - 若 date 已存在 → 回傳 409 JOURNAL_EXISTS
func (r *JournalRepository) Create(ctx context.Context, j *model.Journal, refs []model.JournalSourceRef) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 若 ID 為零值，讓 DB 自動產生
	var insertedID uuid.UUID
	if j.ID == uuid.Nil {
		err = tx.QueryRow(ctx,
			`INSERT INTO journal_entries (date, title, content, mood, highlights, is_draft, generated_by, llm_provider_id)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 RETURNING id, created_at, updated_at`,
			j.Date, j.Title, j.Content, j.Mood, j.Highlights, j.IsDraft, j.GeneratedBy, j.LlmProviderID,
		).Scan(&insertedID, &j.CreatedAt, &j.UpdatedAt)
	} else {
		err = tx.QueryRow(ctx,
			`INSERT INTO journal_entries (id, date, title, content, mood, highlights, is_draft, generated_by, llm_provider_id)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			 RETURNING id, created_at, updated_at`,
			j.ID, j.Date, j.Title, j.Content, j.Mood, j.Highlights, j.IsDraft, j.GeneratedBy, j.LlmProviderID,
		).Scan(&insertedID, &j.CreatedAt, &j.UpdatedAt)
	}
	if err != nil {
		return mapJournalPgErr(err)
	}
	j.ID = insertedID

	// 批次插入 source_refs（若有）
	if len(refs) > 0 {
		if err := insertSourceRefsTx(ctx, tx, j.ID, refs); err != nil {
			return mapJournalPgErr(err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}
	return nil
}

// insertSourceRefsTx 在 tx 內批次插入 source_refs（不處理 commit / rollback）
func insertSourceRefsTx(ctx context.Context, tx pgx.Tx, journalID uuid.UUID, refs []model.JournalSourceRef) error {
	if len(refs) == 0 {
		return nil
	}
	// 動態建構 VALUES 子句，一次 round-trip 完成
	placeholders := make([]string, 0, len(refs))
	args := make([]any, 0, len(refs)*3)
	for i, ref := range refs {
		base := i * 3
		placeholders = append(placeholders, fmt.Sprintf("($%d, $%d, $%d)", base+1, base+2, base+3))
		args = append(args, journalID, ref.SourceType, ref.SourceID)
	}
	q := fmt.Sprintf(
		`INSERT INTO journal_source_refs (journal_id, source_type, source_id) VALUES %s
		 ON CONFLICT DO NOTHING`,
		strings.Join(placeholders, ", "),
	)
	_, err := tx.Exec(ctx, q, args...)
	return err
}

// GetByDate 依日期載入日記與其 source_refs（一次回傳完整聚合）
//
// 不存在 → (nil, nil, nil)，呼叫端自行包成 404 JOURNAL_NOT_FOUND
func (r *JournalRepository) GetByDate(ctx context.Context, date time.Time) (*model.Journal, []model.JournalSourceRef, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+journalSelectCols+` FROM journal_entries WHERE date = $1`,
		date,
	)
	j, err := scanJournal(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}

	refs, err := r.listSourceRefs(ctx, j.ID)
	if err != nil {
		return nil, nil, err
	}
	return j, refs, nil
}

// listSourceRefs 取得指定 journal 的 source_refs
func (r *JournalRepository) listSourceRefs(ctx context.Context, journalID uuid.UUID) ([]model.JournalSourceRef, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT journal_id, source_type, source_id
		 FROM journal_source_refs
		 WHERE journal_id = $1
		 ORDER BY source_type ASC, source_id ASC`,
		journalID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	refs := make([]model.JournalSourceRef, 0)
	for rows.Next() {
		var ref model.JournalSourceRef
		if err := rows.Scan(&ref.JournalID, &ref.SourceType, &ref.SourceID); err != nil {
			return nil, err
		}
		refs = append(refs, ref)
	}
	return refs, rows.Err()
}

// Update 對指定日期的日記做 partial update。
//
// patch 內各欄位為 nil 代表「不更動」。
// 若 patch.SourceRefs 非 nil（即使長度 0）→ 整批覆寫 source_refs。
//
// 不存在 → 404 JOURNAL_NOT_FOUND。
func (r *JournalRepository) Update(
	ctx context.Context,
	date time.Time,
	patch *dto.UpdateJournalRequest,
) (*model.Journal, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 先抓出當前 journal id（也用來確認存在性）
	var journalID uuid.UUID
	err = tx.QueryRow(ctx, `SELECT id FROM journal_entries WHERE date = $1 FOR UPDATE`, date).Scan(&journalID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, model.NewAppError(404, model.ErrCodeJournalNotFound, "當日尚無日記")
	}
	if err != nil {
		return nil, err
	}

	// 動態組 UPDATE 欄位
	sets := []string{}
	args := []any{}
	idx := 1
	if patch != nil {
		if patch.Title != nil {
			sets = append(sets, fmt.Sprintf("title = $%d", idx))
			args = append(args, *patch.Title) // *string，可能為 nil
			idx++
		}
		if patch.Content != nil {
			sets = append(sets, fmt.Sprintf("content = $%d", idx))
			args = append(args, *patch.Content)
			idx++
		}
		if patch.Mood != nil {
			sets = append(sets, fmt.Sprintf("mood = $%d", idx))
			args = append(args, *patch.Mood)
			idx++
		}
		if patch.Highlights != nil {
			sets = append(sets, fmt.Sprintf("highlights = $%d", idx))
			args = append(args, *patch.Highlights)
			idx++
		}
		if patch.IsDraft != nil {
			sets = append(sets, fmt.Sprintf("is_draft = $%d", idx))
			args = append(args, *patch.IsDraft)
			idx++
		}
	}
	sets = append(sets, "updated_at = NOW()")

	q := fmt.Sprintf(
		`UPDATE journal_entries SET %s WHERE id = $%d
		 RETURNING `+journalSelectCols,
		strings.Join(sets, ", "), idx,
	)
	args = append(args, journalID)

	updated, err := scanJournal(tx.QueryRow(ctx, q, args...))
	if err != nil {
		return nil, mapJournalPgErr(err)
	}

	// 若需覆寫 source_refs
	if patch != nil && patch.SourceRefs != nil {
		if _, err := tx.Exec(ctx,
			`DELETE FROM journal_source_refs WHERE journal_id = $1`, journalID); err != nil {
			return nil, err
		}
		// dto -> model
		refs := make([]model.JournalSourceRef, 0, len(*patch.SourceRefs))
		for _, r := range *patch.SourceRefs {
			refs = append(refs, model.JournalSourceRef{
				JournalID:  journalID,
				SourceType: r.SourceType,
				SourceID:   r.SourceID,
			})
		}
		if err := insertSourceRefsTx(ctx, tx, journalID, refs); err != nil {
			return nil, mapJournalPgErr(err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return updated, nil
}

// Delete 依日期刪除日記（CASCADE 會連帶刪除 source_refs）
//
// 不存在 → 404 JOURNAL_NOT_FOUND。
func (r *JournalRepository) Delete(ctx context.Context, date time.Time) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM journal_entries WHERE date = $1`, date)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(404, model.ErrCodeJournalNotFound, "當日尚無日記")
	}
	return nil
}

// List 分頁列表（支援 since/until/mood/is_draft 過濾），不載入 source_refs
//
// 排序：date DESC（最新優先）
func (r *JournalRepository) List(ctx context.Context, opts JournalListOptions) ([]*model.Journal, int64, error) {
	if opts.Page <= 0 {
		opts.Page = 1
	}
	if opts.PerPage <= 0 {
		opts.PerPage = 20
	}

	conds := []string{}
	args := []any{}
	idx := 1
	if opts.Since != nil {
		conds = append(conds, fmt.Sprintf("date >= $%d", idx))
		args = append(args, *opts.Since)
		idx++
	}
	if opts.Until != nil {
		conds = append(conds, fmt.Sprintf("date <= $%d", idx))
		args = append(args, *opts.Until)
		idx++
	}
	if opts.Mood != nil {
		conds = append(conds, fmt.Sprintf("mood = $%d", idx))
		args = append(args, *opts.Mood)
		idx++
	}
	if opts.IsDraft != nil {
		conds = append(conds, fmt.Sprintf("is_draft = $%d", idx))
		args = append(args, *opts.IsDraft)
		idx++
	}
	where := ""
	if len(conds) > 0 {
		where = "WHERE " + strings.Join(conds, " AND ")
	}

	// 計 total
	var total int64
	if err := r.pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT COUNT(*) FROM journal_entries %s`, where), args...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (opts.Page - 1) * opts.PerPage
	q := fmt.Sprintf(
		`SELECT `+journalSelectCols+` FROM journal_entries %s
		 ORDER BY date DESC
		 LIMIT $%d OFFSET $%d`,
		where, idx, idx+1,
	)
	args = append(args, opts.PerPage, offset)

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]*model.Journal, 0)
	for rows.Next() {
		j, err := scanJournal(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, j)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// ReplaceSourceRefs 清空後重插某 journal 的 source_refs（用於 LLM draft 重生）
func (r *JournalRepository) ReplaceSourceRefs(
	ctx context.Context,
	journalID uuid.UUID,
	refs []model.JournalSourceRef,
) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`DELETE FROM journal_source_refs WHERE journal_id = $1`, journalID); err != nil {
		return err
	}
	if err := insertSourceRefsTx(ctx, tx, journalID, refs); err != nil {
		return mapJournalPgErr(err)
	}
	return tx.Commit(ctx)
}

// GetSourceRefs 對外暴露查詢 source_refs（避免外部直接寫 SQL）
func (r *JournalRepository) GetSourceRefs(ctx context.Context, journalID uuid.UUID) ([]model.JournalSourceRef, error) {
	return r.listSourceRefs(ctx, journalID)
}
