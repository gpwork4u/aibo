package model

import (
	"time"

	"github.com/google/uuid"
)

// ApiKey 資料庫模型
type ApiKey struct {
	ID         uuid.UUID  `json:"id"`
	Name       string     `json:"name"`
	KeyHash    string     `json:"-"`
	KeyPrefix  string     `json:"key_prefix"`
	IsActive   bool       `json:"is_active"`
	ExpiresAt  *time.Time `json:"expires_at"`
	LastUsedAt *time.Time `json:"last_used_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

// IsExpired 檢查 key 是否已過期
func (k *ApiKey) IsExpired() bool {
	if k.ExpiresAt == nil {
		return false
	}
	return k.ExpiresAt.Before(time.Now())
}

// IsValid 檢查 key 是否有效（active 且未過期）
func (k *ApiKey) IsValid() bool {
	return k.IsActive && !k.IsExpired()
}
