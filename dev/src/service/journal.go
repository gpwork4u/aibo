package service

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/jackc/pgx/v5"
)

// JournalService 每日日記 business logic（F-028b：CRUD，不含 LLM draft）
//
// 不含 LLM draft 路徑（POST /:date/draft），那由 F-028c 補上。
type JournalService struct {
	journalRepo JournalRepository
	entryRepo   EntryRepository // 用於驗證 source_refs.entry 存在
}

// NewJournalService 建立 JournalService
func NewJournalService(jr JournalRepository, er EntryRepository) *JournalService {
	return &JournalService{journalRepo: jr, entryRepo: er}
}

// JournalListOptions service 層暴露給 handler 用，避免 handler import repository
type JournalListOptions = repository.JournalListOptions

// ParseDate 解析 YYYY-MM-DD（依 tz 轉成當天 00:00 UTC，再轉為 DATE）
//
// 因為 DB 用 DATE 型別（無時區），這裡僅取「該 tz 下指定那一天」的 UTC midnight 表示。
// 與 calendar.go 的時區慣例一致：tz 為空字串時使用 UTC。
func parseJournalDate(dateStr, tz string) (time.Time, error) {
	if dateStr == "" {
		return time.Time{}, model.NewAppError(400, model.ErrCodeInvalidInput, "date 為必填（格式 YYYY-MM-DD）")
	}
	if tz == "" {
		tz = "UTC"
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		return time.Time{}, model.NewAppError(400, model.ErrCodeInvalidInput, "無效的時區")
	}
	t, err := time.ParseInLocation("2006-01-02", dateStr, loc)
	if err != nil {
		return time.Time{}, model.NewAppError(400, model.ErrCodeInvalidInput, "無效的日期格式，需 YYYY-MM-DD")
	}
	// 轉成 UTC 的同一天 00:00（pgx DATE 編碼會以 UTC 解讀 time.Time 的年月日）
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), nil
}

// validateAndConvertSourceRefs 驗證 source_refs，並轉成 model 結構
//
// - source_type 必須為 entry / gcal_event（DTO binding 已先擋一道）
// - 當 source_type=entry 時，service 用 EntryRepository.FindByID 驗證存在性
//   不存在 → 400 INVALID_INPUT with message "source entry not found"
func (s *JournalService) validateAndConvertSourceRefs(
	ctx context.Context, refs []dto.SourceRefDTO,
) ([]model.JournalSourceRef, error) {
	out := make([]model.JournalSourceRef, 0, len(refs))
	for _, r := range refs {
		switch r.SourceType {
		case model.JournalSourceTypeEntry:
			id, err := uuid.Parse(r.SourceID)
			if err != nil {
				return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "source entry id 格式錯誤")
			}
			entry, err := s.entryRepo.FindByID(ctx, id)
			if err != nil {
				return nil, err
			}
			if entry == nil {
				return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "source entry not found")
			}
		case model.JournalSourceTypeGcalEvent:
			// gcal event id 為 string，不在 DB 中存對應表，跳過存在性檢查
			if r.SourceID == "" {
				return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "source_id 為必填")
			}
		default:
			return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "source_type 必須為 entry / gcal_event")
		}
		out = append(out, model.JournalSourceRef{
			SourceType: r.SourceType,
			SourceID:   r.SourceID,
		})
	}
	return out, nil
}

// Create 建立日記
//
// - generated_by 由 service 設為 'user'（不接受 client 傳入）
// - is_draft 一律 false
// - 若該日已存在 → 409 JOURNAL_EXISTS（由 repository 的 PgError mapping 處理）
func (s *JournalService) Create(
	ctx context.Context, req *dto.CreateJournalRequest, tz string,
) (*model.Journal, []model.JournalSourceRef, error) {
	if req == nil {
		return nil, nil, model.NewAppError(400, model.ErrCodeInvalidInput, "request body 為必填")
	}

	date, err := parseJournalDate(req.Date, tz)
	if err != nil {
		return nil, nil, err
	}

	// service 層長度驗證（雙保險，DTO 已標 max=20000）
	if l := len(req.Content); l > 20000 {
		return nil, nil, model.NewAppError(400, model.ErrCodeInvalidInput, "日記內容超過 20000 字上限")
	}

	refs, err := s.validateAndConvertSourceRefs(ctx, req.SourceRefs)
	if err != nil {
		return nil, nil, err
	}

	gen := model.GeneratedByUser
	highlights := req.Highlights
	if highlights == nil {
		highlights = []string{}
	}

	j := &model.Journal{
		Date:        date,
		Title:       req.Title,
		Content:     req.Content,
		Mood:        req.Mood,
		Highlights:  highlights,
		IsDraft:     false,
		GeneratedBy: &gen,
	}

	if err := s.journalRepo.Create(ctx, j, refs); err != nil {
		return nil, nil, err
	}

	// 從 DB 重抓（拿到 source_refs 完整 journal_id 等）
	created, gotRefs, err := s.journalRepo.GetByDate(ctx, date)
	if err != nil {
		return nil, nil, err
	}
	if created == nil {
		// 理論上不會發生
		return j, refs, nil
	}
	slog.InfoContext(ctx, "journal.create",
		"id", created.ID,
		"date", req.Date,
		"source_refs", len(gotRefs),
	)
	return created, gotRefs, nil
}

// GetByDate 取得單日 journal
//
// 不存在 → 404 JOURNAL_NOT_FOUND
func (s *JournalService) GetByDate(
	ctx context.Context, dateStr, tz string,
) (*model.Journal, []model.JournalSourceRef, error) {
	date, err := parseJournalDate(dateStr, tz)
	if err != nil {
		return nil, nil, err
	}
	j, refs, err := s.journalRepo.GetByDate(ctx, date)
	if err != nil {
		return nil, nil, err
	}
	if j == nil {
		return nil, nil, model.NewAppError(404, model.ErrCodeJournalNotFound, "當日尚無日記")
	}
	return j, refs, nil
}

// Update partial 更新；保留原 generated_by。
//
// - 若 patch 含 source_refs（非 nil）→ 整批覆寫，service 端先驗證 entry 存在性
// - 不存在當日 journal → 404 JOURNAL_NOT_FOUND
func (s *JournalService) Update(
	ctx context.Context, dateStr, tz string, req *dto.UpdateJournalRequest,
) (*model.Journal, []model.JournalSourceRef, error) {
	if req == nil {
		return nil, nil, model.NewAppError(400, model.ErrCodeInvalidInput, "request body 為必填")
	}
	date, err := parseJournalDate(dateStr, tz)
	if err != nil {
		return nil, nil, err
	}

	// service 層 content 長度雙保險
	if req.Content != nil && len(*req.Content) > 20000 {
		return nil, nil, model.NewAppError(400, model.ErrCodeInvalidInput, "日記內容超過 20000 字上限")
	}

	// 若帶 source_refs，先驗證
	if req.SourceRefs != nil {
		if _, err := s.validateAndConvertSourceRefs(ctx, *req.SourceRefs); err != nil {
			return nil, nil, err
		}
	}

	updated, err := s.journalRepo.Update(ctx, date, req)
	if err != nil {
		return nil, nil, err
	}

	refs, err := s.journalRepo.GetSourceRefs(ctx, updated.ID)
	if err != nil {
		return nil, nil, err
	}
	slog.InfoContext(ctx, "journal.update", "id", updated.ID, "date", dateStr)
	return updated, refs, nil
}

// Delete 刪除單日 journal（CASCADE 連帶刪除 source_refs）
//
// 不存在 → 404 JOURNAL_NOT_FOUND
func (s *JournalService) Delete(ctx context.Context, dateStr, tz string) error {
	date, err := parseJournalDate(dateStr, tz)
	if err != nil {
		return err
	}
	if err := s.journalRepo.Delete(ctx, date); err != nil {
		return err
	}
	slog.InfoContext(ctx, "journal.delete", "date", dateStr)
	return nil
}

// CreateAutoGenerated 由 LLM 自動生成並落地 DB（generated_by='llm'）。
//
// - 若當日已存在 → 409 JOURNAL_EXISTS（由 repo 層 PgError mapping 處理）
// - usedRefs：entry UUID 字串 list（來自 JournalDraftResult.UsedRefs），會過濾非法格式
// - generatedByLabel：LLM provider/model 名稱（存入 generated_by 欄位）
func (s *JournalService) CreateAutoGenerated(
	ctx context.Context,
	dateStr, tz string,
	content string,
	mood *string,
	usedRefs []string,
	generatedByLabel string,
) (*model.Journal, []model.JournalSourceRef, error) {
	date, err := parseJournalDate(dateStr, tz)
	if err != nil {
		return nil, nil, err
	}

	// 組 source_refs（只取 entry 型別，過濾非法 UUID）
	refs := make([]model.JournalSourceRef, 0, len(usedRefs))
	for _, id := range usedRefs {
		if _, err := uuid.Parse(id); err == nil {
			refs = append(refs, model.JournalSourceRef{
				SourceType: model.JournalSourceTypeEntry,
				SourceID:   id,
			})
		}
	}

	gen := generatedByLabel
	if gen == "" {
		gen = model.GeneratedByLlm
	}
	j := &model.Journal{
		Date:        date,
		Content:     content,
		Mood:        mood,
		Highlights:  []string{},
		IsDraft:     false,
		GeneratedBy: &gen,
	}

	if err := s.journalRepo.Create(ctx, j, refs); err != nil {
		return nil, nil, err
	}

	// 重抓完整資料（含 DB 產生的 ID / timestamps）
	created, gotRefs, err := s.journalRepo.GetByDate(ctx, date)
	if err != nil {
		return nil, nil, err
	}
	if created == nil {
		return j, refs, nil
	}
	slog.InfoContext(ctx, "journal.auto_generated",
		"id", created.ID,
		"date", dateStr,
		"generated_by", gen,
		"source_refs", len(gotRefs),
	)
	return created, gotRefs, nil
}

// List 分頁列表（不含 source_refs / content）
//
// query：page, per_page, since, until, mood, is_draft
func (s *JournalService) List(
	ctx context.Context, opts JournalListOptions,
) ([]*model.Journal, int64, error) {
	items, total, err := s.journalRepo.List(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// 確保 pgx.ErrNoRows 不會逃逸（防呆 — 目前路徑都已包成 AppError）
var _ = errors.Is
var _ = pgx.ErrNoRows
