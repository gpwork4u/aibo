package model

import (
	"time"

	"github.com/google/uuid"
)

// Mood 日記情緒 enum 值（對應 migration 013 的 chk_journal_mood）
const (
	MoodGreat = "great"
	MoodOk    = "ok"
	MoodDown  = "down"
)

// GeneratedBy 日記生成來源 enum 值（對應 migration 013 的 chk_journal_generated_by）
const (
	GeneratedByUser = "user"
	GeneratedByLlm  = "llm"
)

// JournalSourceType journal_source_refs.source_type 合法值
const (
	JournalSourceTypeEntry     = "entry"
	JournalSourceTypeGcalEvent = "gcal_event"
)

// 額外錯誤碼（F-028）
const (
	ErrCodeJournalExists   = "JOURNAL_EXISTS"
	ErrCodeJournalNotFound = "JOURNAL_NOT_FOUND"
	ErrCodeLlmUnavailable  = "LLM_UNAVAILABLE"
)

// Journal 對應 journal_entries 資料表
//
// Date 採用 time.Time（DATE 型別 → UTC 00:00:00），在序列化時呼叫端應
// 以 YYYY-MM-DD 格式輸出（見 dto.JournalResponse.DateString）。
type Journal struct {
	ID            uuid.UUID  `json:"id"`
	Date          time.Time  `json:"-"` // 對外用 dto 的 string，避免 timezone 誤導
	Title         *string    `json:"title"`
	Content       string     `json:"content"`
	Mood          *string    `json:"mood"`
	Highlights    []string   `json:"highlights"`
	IsDraft       bool       `json:"is_draft"`
	GeneratedBy   *string    `json:"generated_by"`
	LlmProviderID *uuid.UUID `json:"llm_provider_id"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// JournalSourceRef 對應 journal_source_refs 資料表
type JournalSourceRef struct {
	JournalID  uuid.UUID `json:"-"`
	SourceType string    `json:"source_type"`
	SourceID   string    `json:"source_id"`
}
