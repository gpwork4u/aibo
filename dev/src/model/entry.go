package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Entry 知識條目資料庫模型
type Entry struct {
	ID            uuid.UUID  `json:"id"`
	Title         *string    `json:"title"`
	Content       *string    `json:"content"`
	Summary       *string    `json:"summary"`
	Detail        *string    `json:"detail"`
	Action        *string    `json:"action"`
	CategoryID    *uuid.UUID `json:"category_id"`
	Source        *string    `json:"source"`
	SourceType    *string    `json:"source_type"`
	SourceRef     *string    `json:"source_ref"`
	Tags          []string         `json:"tags"`
	Domains       []string         `json:"domains"`
	Context       *json.RawMessage `json:"context"`
	IsArchived    bool             `json:"is_archived"`
	Confidence    float64    `json:"confidence"`
	Confirmations int        `json:"confirmations"`
	FlagsCount    int        `json:"flags_count"`
	SupersededBy  *uuid.UUID `json:"superseded_by"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// LifecycleStatus 計算知識條目的生命週期狀態
// - superseded: superseded_by IS NOT NULL
// - degraded: confidence <= 0.2 AND superseded_by IS NULL
// - active: 其他
func (e *Entry) LifecycleStatus() string {
	if e.SupersededBy != nil {
		return "superseded"
	}
	if e.Confidence <= 0.2 {
		return "degraded"
	}
	return "active"
}

// EntryListItem 列表查詢用的條目（content 改為 preview，不含 source 欄位）
type EntryListItem struct {
	ID             uuid.UUID        `json:"id"`
	Title          *string          `json:"title"`
	Summary        *string          `json:"summary"`
	ContentPreview *string          `json:"content_preview"`
	CategoryID     *uuid.UUID       `json:"category_id"`
	Tags           []string         `json:"tags"`
	Domains        []string         `json:"domains"`
	Context        *json.RawMessage `json:"context"`
	IsArchived     bool             `json:"is_archived"`
	Confidence     float64    `json:"confidence"`
	Confirmations  int        `json:"confirmations"`
	FlagsCount     int        `json:"flags_count"`
	SupersededBy   *uuid.UUID `json:"superseded_by"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// LifecycleStatus 計算列表條目的生命週期狀態
func (e *EntryListItem) LifecycleStatus() string {
	if e.SupersededBy != nil {
		return "superseded"
	}
	if e.Confidence <= 0.2 {
		return "degraded"
	}
	return "active"
}

// EntryFilter 列表查詢過濾條件
type EntryFilter struct {
	Page            int
	PerPage         int
	CategoryID      *string // "null" 表示未分類，UUID 字串表示特定分類
	Tags            []string
	Domains         []string            // domain 過濾（AND 邏輯）
	ContextFilter   map[string][]string // context 子欄位過濾（如 languages=["go"]）
	IsArchived      *bool
	Search          string
	Sort            string
	Order           string
	LifecycleStatus string // "active", "superseded", "degraded" 或空字串（不過濾）
}

// EntryListResult 列表查詢結果（含分頁）
type EntryListResult struct {
	Data       []EntryListItem `json:"data"`
	Pagination Pagination      `json:"pagination"`
}

// Pagination 分頁資訊
type Pagination struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}
