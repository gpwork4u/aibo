package dto

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// CreateViewRequest 建立 saved view 請求
type CreateViewRequest struct {
	Name    string          `json:"name" binding:"required"`
	Scope   string          `json:"scope"`
	Filters json.RawMessage `json:"filters"`
	SortBy  *string         `json:"sort_by"`
	SortDir *string         `json:"sort_dir"`
	Icon    *string         `json:"icon"`
	Position *int           `json:"position"`
}

// UpdateViewRequest 更新 saved view 請求（所有欄位可選）
type UpdateViewRequest struct {
	Name    *string         `json:"name"`
	Scope   *string         `json:"scope"`
	Filters json.RawMessage `json:"filters"`
	SortBy  *string         `json:"sort_by"`
	SortDir *string         `json:"sort_dir"`
	Icon    *string         `json:"icon"`
	Position *int           `json:"position"`
}

// ReorderViewsRequest 重新排序請求
type ReorderViewsRequest struct {
	IDs []uuid.UUID `json:"ids" binding:"required"`
}

// ViewResponse saved view 回應
type ViewResponse struct {
	ID        uuid.UUID       `json:"id"`
	Name      string          `json:"name"`
	Scope     string          `json:"scope"`
	Filters   json.RawMessage `json:"filters"`
	SortBy    *string         `json:"sort_by"`
	SortDir   *string         `json:"sort_dir"`
	Icon      *string         `json:"icon"`
	Position  int             `json:"position"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

// ReorderViewsResponse 重排回應
type ReorderViewsResponse struct {
	Updated int `json:"updated"`
}
