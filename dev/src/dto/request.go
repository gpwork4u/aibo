package dto

import "time"

// CreateApiKeyRequest 建立 API Key 的請求
type CreateApiKeyRequest struct {
	Name      string  `json:"name" binding:"required,max=50"`
	ExpiresAt *string `json:"expires_at"`
}

// ParseExpiresAt 解析 expires_at 欄位
func (r *CreateApiKeyRequest) ParseExpiresAt() (*time.Time, error) {
	if r.ExpiresAt == nil {
		return nil, nil
	}

	t, err := time.Parse(time.RFC3339, *r.ExpiresAt)
	if err != nil {
		return nil, err
	}

	return &t, nil
}
