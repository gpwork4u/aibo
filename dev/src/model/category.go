package model

import (
	"time"

	"github.com/google/uuid"
)

// Category 分類資料庫模型
type Category struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	SortOrder   int       `json:"sort_order"`
	EntryCount  int       `json:"entry_count,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
