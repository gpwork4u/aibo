package model

import (
	"time"

	"github.com/google/uuid"
)

// SavedView 已儲存的篩選視圖
type SavedView struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Scope     string    `json:"scope"`
	Filters   []byte    `json:"filters"` // raw JSONB
	SortBy    *string   `json:"sort_by"`
	SortDir   *string   `json:"sort_dir"`
	Icon      *string   `json:"icon"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// 錯誤碼
const (
	ErrCodeDuplicateView = "DUPLICATE"
	ErrCodeViewLimitExceeded = "LIMIT_EXCEEDED"
	ErrCodeViewNotFound  = "VIEW_NOT_FOUND"
)
