package dto

import (
	"encoding/json"

	"github.com/google/uuid"
)

// ClassifyResult LLM 分類回傳結果
type ClassifyResult struct {
	Category string           `json:"category"`
	Tags     []string         `json:"tags"`
	Domains  []string         `json:"domains"`
	Context  *json.RawMessage `json:"context"`
	Title    string           `json:"title"`
	Summary  string           `json:"summary"` // 一句話摘要
	Detail   string           `json:"detail"`  // 詳細說明
	Action   string           `json:"action"`  // 可執行的建議/行動
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
