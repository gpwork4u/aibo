package dto

import (
	"encoding/json"

	"github.com/google/uuid"
)

// SmartSearchRequest 智慧搜尋請求
type SmartSearchRequest struct {
	Query         string                     `json:"query" binding:"required"`
	CategoryID    *string                    `json:"category_id"`
	Domains       []string                   `json:"domains"`
	ContextFilter map[string]json.RawMessage `json:"context_filter"`
	Limit         *int                       `json:"limit"`
}

// SearchResultItem 搜尋結果項目
type SearchResultItem struct {
	EntryID         uuid.UUID        `json:"entry_id"`
	Title           *string          `json:"title"`
	Summary         *string          `json:"summary"`
	ContentPreview  string           `json:"content_preview"`
	Tags            []string         `json:"tags"`
	Domains         []string         `json:"domains"`
	Context         *json.RawMessage `json:"context"`
	LifecycleStatus string           `json:"lifecycle_status"`
	SupersededBy    *uuid.UUID       `json:"superseded_by"`
	Relevance       float64          `json:"relevance"`
	MatchedKeywords []string         `json:"matched_keywords,omitempty"`
}

// SmartSearchResponse 智慧搜尋回應
type SmartSearchResponse struct {
	Results      []SearchResultItem `json:"results"`
	SynonymsUsed []string           `json:"synonyms_used"`
	Total        int                `json:"total"`
	Degraded     bool               `json:"degraded"`
}

// SimpleSearchResultItem 簡單搜尋結果項目
type SimpleSearchResultItem struct {
	EntryID         uuid.UUID        `json:"entry_id"`
	Title           *string          `json:"title"`
	Summary         *string          `json:"summary"`
	ContentPreview  string           `json:"content_preview"`
	Tags            []string         `json:"tags"`
	Domains         []string         `json:"domains"`
	Context         *json.RawMessage `json:"context"`
	LifecycleStatus string           `json:"lifecycle_status"`
	SupersededBy    *uuid.UUID       `json:"superseded_by"`
	Relevance       float64          `json:"relevance"`
}

// SimpleSearchResponse 簡單搜尋回應
type SimpleSearchResponse struct {
	Results  []SimpleSearchResultItem `json:"results"`
	Total    int                      `json:"total"`
	Degraded bool                     `json:"degraded"`
}
