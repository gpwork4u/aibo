package model

import (
	"time"

	"github.com/google/uuid"
)

// Entry 知識條目資料庫模型
type Entry struct {
	ID         uuid.UUID  `json:"id"`
	Title      *string    `json:"title"`
	Content    *string    `json:"content"`
	CategoryID *uuid.UUID `json:"category_id"`
	Source     *string    `json:"source"`
	SourceType *string    `json:"source_type"`
	SourceRef  *string    `json:"source_ref"`
	Tags       []string   `json:"tags"`
	IsArchived bool       `json:"is_archived"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// EntryListItem 列表查詢用的條目（content 改為 preview，不含 source 欄位）
type EntryListItem struct {
	ID             uuid.UUID  `json:"id"`
	Title          *string    `json:"title"`
	ContentPreview *string    `json:"content_preview"`
	CategoryID     *uuid.UUID `json:"category_id"`
	Tags           []string   `json:"tags"`
	IsArchived     bool       `json:"is_archived"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// EntryFilter 列表查詢過濾條件
type EntryFilter struct {
	Page       int
	PerPage    int
	CategoryID *string // "null" 表示未分類，UUID 字串表示特定分類
	Tags       []string
	IsArchived *bool
	Search     string
	Sort       string
	Order      string
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
