package dto

import (
	"time"

	"github.com/google/uuid"
)

// ConfirmResponse 確認知識條目的回應
type ConfirmResponse struct {
	EntryID       uuid.UUID `json:"entry_id"`
	Confidence    float64   `json:"confidence"`
	Confirmations int       `json:"confirmations"`
	Message       string    `json:"message"`
}

// FlagRequest 標記知識條目的請求
type FlagRequest struct {
	Reason string  `json:"reason" binding:"required"`
	Note   *string `json:"note"`
}

// FlagResponse 標記知識條目的回應
type FlagResponse struct {
	EntryID    uuid.UUID `json:"entry_id"`
	Confidence float64   `json:"confidence"`
	FlagsCount int       `json:"flags_count"`
	Message    string    `json:"message"`
}

// EntryFlagResponse 單筆 flag 記錄回應
type EntryFlagResponse struct {
	ID        uuid.UUID `json:"id"`
	EntryID   uuid.UUID `json:"entry_id"`
	Reason    string    `json:"reason"`
	Note      *string   `json:"note"`
	CreatedAt time.Time `json:"created_at"`
}

// ListFlagsResponse 列出 flag 記錄的回應
type ListFlagsResponse struct {
	Data  []EntryFlagResponse `json:"data"`
	Total int                 `json:"total"`
}
