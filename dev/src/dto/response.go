package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateApiKeyResponse 建立 API Key 的回應（包含明文 key，只回傳一次）
type CreateApiKeyResponse struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	Key       string     `json:"key"`
	KeyPrefix string     `json:"key_prefix"`
	ExpiresAt *time.Time `json:"expires_at"`
	CreatedAt time.Time  `json:"created_at"`
}

// ApiKeyItem 列表中的單筆 API Key（不含明文）
type ApiKeyItem struct {
	ID         uuid.UUID  `json:"id"`
	Name       string     `json:"name"`
	KeyPrefix  string     `json:"key_prefix"`
	IsActive   bool       `json:"is_active"`
	ExpiresAt  *time.Time `json:"expires_at"`
	LastUsedAt *time.Time `json:"last_used_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

// ListApiKeysResponse 列出所有 API Keys 的回應
type ListApiKeysResponse struct {
	Data []ApiKeyItem `json:"data"`
}

// ErrorResponse 錯誤回應
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// CategoryResponse 建立分類的回應
type CategoryResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CategoryItemResponse 分類列表項目（含 entry_count）
type CategoryItemResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	SortOrder   int       `json:"sort_order"`
	EntryCount  int       `json:"entry_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ListCategoriesResponse 列出所有分類的回應
type ListCategoriesResponse struct {
	Data []CategoryItemResponse `json:"data"`
}
