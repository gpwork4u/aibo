package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateEntryRequest 建立知識條目的請求
type CreateEntryRequest struct {
	Title      *string    `json:"title"`
	Content    *string    `json:"content"`
	Summary    *string    `json:"summary"`
	Detail     *string    `json:"detail"`
	Action     *string    `json:"action"`
	CategoryID *uuid.UUID `json:"category_id"`
	Source     *string    `json:"source"`
	SourceType *string    `json:"source_type"`
	SourceRef  *string    `json:"source_ref"`
	Tags       []string   `json:"tags"`
}

// UpdateEntryRequest 部分更新知識條目的請求（PATCH）
// 使用 json.RawMessage 來區分「未傳」和「傳 null」
type UpdateEntryRequest struct {
	Title      *string    `json:"title"`
	Content    *string    `json:"content"`
	Summary    *string    `json:"summary"`
	Detail     *string    `json:"detail"`
	Action     *string    `json:"action"`
	CategoryID *uuid.UUID `json:"category_id"`
	Source     *string    `json:"source"`
	SourceType *string    `json:"source_type"`
	SourceRef  *string    `json:"source_ref"`
	Tags       *[]string  `json:"tags"`
	IsArchived *bool      `json:"is_archived"`

	// 追蹤哪些欄位有在 JSON 中出現（含 null）
	HasTitle      bool `json:"-"`
	HasContent    bool `json:"-"`
	HasCategoryID bool `json:"-"`
}

// EntryResponse 單筆知識條目回應（完整 content + summary/detail/action）
type EntryResponse struct {
	ID              uuid.UUID  `json:"id"`
	Title           *string    `json:"title"`
	Content         *string    `json:"content"`
	Summary         *string    `json:"summary"`
	Detail          *string    `json:"detail"`
	Action          *string    `json:"action"`
	CategoryID      *uuid.UUID `json:"category_id"`
	Source          *string    `json:"source"`
	SourceType      *string    `json:"source_type"`
	SourceRef       *string    `json:"source_ref"`
	Tags            []string   `json:"tags"`
	IsArchived      bool       `json:"is_archived"`
	Confidence      float64    `json:"confidence"`
	Confirmations   int        `json:"confirmations"`
	FlagsCount      int        `json:"flags_count"`
	SupersededBy    *uuid.UUID `json:"superseded_by"`
	LifecycleStatus string     `json:"lifecycle_status"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// EntryListItemResponse 列表中的知識條目（含 summary，不含 detail/action/source）
type EntryListItemResponse struct {
	ID              uuid.UUID  `json:"id"`
	Title           *string    `json:"title"`
	Summary         *string    `json:"summary"`
	ContentPreview  *string    `json:"content_preview"`
	CategoryID      *uuid.UUID `json:"category_id"`
	Tags            []string   `json:"tags"`
	IsArchived      bool       `json:"is_archived"`
	Confidence      float64    `json:"confidence"`
	Confirmations   int        `json:"confirmations"`
	FlagsCount      int        `json:"flags_count"`
	SupersededBy    *uuid.UUID `json:"superseded_by"`
	LifecycleStatus string     `json:"lifecycle_status"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// PaginationResponse 分頁資訊回應
type PaginationResponse struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// ListEntriesResponse 列出知識條目的回應
type ListEntriesResponse struct {
	Data       []EntryListItemResponse `json:"data"`
	Pagination PaginationResponse      `json:"pagination"`
}
