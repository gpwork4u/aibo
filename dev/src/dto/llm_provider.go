package dto

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// CreateLlmProviderRequest 建立 LLM Provider 的請求
type CreateLlmProviderRequest struct {
	Name        string           `json:"name" binding:"required"`
	EndpointURL string           `json:"endpoint_url" binding:"required"`
	ApiKey      *string          `json:"api_key"`
	ModelName   string           `json:"model_name" binding:"required"`
	IsDefault   *bool            `json:"is_default"`
	Config      *json.RawMessage `json:"config"`
	IsActive    *bool            `json:"is_active"`
}

// UpdateLlmProviderRequest 更新 LLM Provider 的請求（全量更新）
type UpdateLlmProviderRequest struct {
	Name        string           `json:"name" binding:"required"`
	EndpointURL string           `json:"endpoint_url" binding:"required"`
	ApiKey      *string          `json:"api_key"`
	ModelName   string           `json:"model_name" binding:"required"`
	IsDefault   bool             `json:"is_default"`
	Config      *json.RawMessage `json:"config"`
	IsActive    bool             `json:"is_active"`
}

// LlmProviderResponse LLM Provider 回應（不含 api_key 明文）
type LlmProviderResponse struct {
	ID          uuid.UUID        `json:"id"`
	Name        string           `json:"name"`
	EndpointURL string           `json:"endpoint_url"`
	ApiKeySet   bool             `json:"api_key_set"`
	ModelName   string           `json:"model_name"`
	IsDefault   bool             `json:"is_default"`
	Config      *json.RawMessage `json:"config"`
	IsActive    bool             `json:"is_active"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

// ListLlmProvidersResponse 列出所有 LLM Providers 的回應
type ListLlmProvidersResponse struct {
	Data []LlmProviderResponse `json:"data"`
}

// HealthCheckResponse 健康檢查回應
type HealthCheckResponse struct {
	Status         string  `json:"status"`
	ResponseTimeMs *int64  `json:"response_time_ms,omitempty"`
	Error          *string `json:"error,omitempty"`
}
