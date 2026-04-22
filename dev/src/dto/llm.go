package dto

import "github.com/google/uuid"

// ClassifyResult LLM 分類回傳結果
type ClassifyResult struct {
	Category string   `json:"category"`
	Tags     []string `json:"tags"`
	Title    string   `json:"title"`
}

// ClassifyResponse 手動觸發分類的回應
type ClassifyResponse struct {
	Message string    `json:"message"`
	EntryID uuid.UUID `json:"entry_id"`
}

// ClassifyAllResponse 批次分類的回應
type ClassifyAllResponse struct {
	Message    string `json:"message"`
	EntryCount int    `json:"entry_count"`
}
