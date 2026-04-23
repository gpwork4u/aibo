package dto

import (
	"time"

	"github.com/google/uuid"
)

// SupersedeRequest 設定取代關係的請求
type SupersedeRequest struct {
	NewEntryID uuid.UUID `json:"new_entry_id" binding:"required"`
}

// SupersedeResponse 設定取代關係的回應
type SupersedeResponse struct {
	OldEntry SupersedeEntryInfo `json:"old_entry"`
	NewEntry SupersedeEntryInfo `json:"new_entry"`
}

// SupersedeEntryInfo 取代關係中的 entry 簡要資訊
type SupersedeEntryInfo struct {
	ID           uuid.UUID  `json:"id"`
	SupersededBy *uuid.UUID `json:"superseded_by"`
	Confidence   float64    `json:"confidence"`
}

// ClearSupersedeResponse 取消取代關係的回應
type ClearSupersedeResponse struct {
	ID           uuid.UUID  `json:"id"`
	SupersededBy *uuid.UUID `json:"superseded_by"`
}

// HistoryChainItem 版本鏈中的一個節點
type HistoryChainItem struct {
	ID        uuid.UUID `json:"id"`
	Title     *string   `json:"title"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// HistoryLatest 版本鏈中的最新版本
type HistoryLatest struct {
	ID    uuid.UUID `json:"id"`
	Title *string   `json:"title"`
}

// HistoryResponse 版本鏈查詢回應
type HistoryResponse struct {
	EntryID uuid.UUID          `json:"entry_id"`
	Status  string             `json:"status"`
	Chain   []HistoryChainItem `json:"chain"`
	Latest  HistoryLatest      `json:"latest"`
}
