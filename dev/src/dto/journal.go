package dto

import (
	"time"

	"github.com/google/uuid"
)

// SourceRefDTO 日記來源關聯（雙向使用：request 與 response）
type SourceRefDTO struct {
	SourceType string `json:"source_type" binding:"required,oneof=entry gcal_event"`
	SourceID   string `json:"source_id" binding:"required"`
}

// CreateJournalRequest POST /api/v1/journal 的請求 body
type CreateJournalRequest struct {
	Date       string         `json:"date" binding:"required"`              // YYYY-MM-DD
	Title      *string        `json:"title"`
	Content    string         `json:"content" binding:"required,max=20000"` // 對齊 DB chk_journal_content_len
	Mood       *string        `json:"mood" binding:"omitempty,oneof=great ok down"`
	Highlights []string       `json:"highlights"`
	SourceRefs []SourceRefDTO `json:"source_refs"`
}

// UpdateJournalRequest PATCH /api/v1/journal/:date 的 partial update body
//
// 所有欄位皆 optional：nil 代表不更動。
//   - Title 用 **string 區分「不更動」(nil) 與「更新為 NULL」(*Title == nil)
//   - SourceRefs 為 nil 代表不更動；非 nil（含長度 0）代表「整批覆寫」
type UpdateJournalRequest struct {
	Title      **string        `json:"title"`
	Content    *string         `json:"content" binding:"omitempty,max=20000"`
	Mood       **string        `json:"mood"`
	Highlights *[]string       `json:"highlights"`
	IsDraft    *bool           `json:"is_draft"`
	SourceRefs *[]SourceRefDTO `json:"source_refs"`
}

// GenerateDraftRequest POST /api/v1/journal/:date/draft 的請求 body
type GenerateDraftRequest struct {
	LlmProviderID  *uuid.UUID `json:"llm_provider_id"`
	Tone           string     `json:"tone" binding:"omitempty,oneof=reflective concise narrative"`
	IncludeEntries *bool      `json:"include_entries"`
	IncludeEvents  *bool      `json:"include_events"`
}

// JournalResponse Journal 的 API 回應
//
// Date 為 YYYY-MM-DD 字串（避免 timezone 誤解）。
type JournalResponse struct {
	ID            uuid.UUID      `json:"id"`
	Date          string         `json:"date"`
	Title         *string        `json:"title"`
	Content       string         `json:"content"`
	Mood          *string        `json:"mood"`
	Highlights    []string       `json:"highlights"`
	IsDraft       bool           `json:"is_draft"`
	GeneratedBy   *string        `json:"generated_by"`
	LlmProviderID *uuid.UUID     `json:"llm_provider_id"`
	SourceRefs    []SourceRefDTO `json:"source_refs"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// JournalListItem 日記列表精簡項目（不含完整 content / source_refs）
type JournalListItem struct {
	ID          uuid.UUID  `json:"id"`
	Date        string     `json:"date"`
	Title       *string    `json:"title"`
	Mood        *string    `json:"mood"`
	IsDraft     bool       `json:"is_draft"`
	GeneratedBy *string    `json:"generated_by"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// ListJournalResponse GET /api/v1/journal 的回應
type ListJournalResponse struct {
	Data       []JournalListItem  `json:"data"`
	Pagination PaginationResponse `json:"pagination"`
}
