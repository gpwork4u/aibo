package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// LlmProviderConfig LLM Provider 的可選設定
type LlmProviderConfig struct {
	Temperature    *float64 `json:"temperature,omitempty"`
	MaxTokens      *int     `json:"max_tokens,omitempty"`
	TimeoutSeconds *int     `json:"timeout_seconds,omitempty"`
}

// LlmProvider 資料庫模型
type LlmProvider struct {
	ID          uuid.UUID        `json:"id"`
	Name        string           `json:"name"`
	EndpointURL string           `json:"endpoint_url"`
	ApiKey      *string          `json:"-"` // 加密後的 api_key，永不直接回傳
	ModelName   string           `json:"model_name"`
	IsDefault   bool             `json:"is_default"`
	Config      *json.RawMessage `json:"config"`
	IsActive    bool             `json:"is_active"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

// ApiKeySet 回傳 api_key 是否已設定
func (p *LlmProvider) ApiKeySet() bool {
	return p.ApiKey != nil && *p.ApiKey != ""
}
