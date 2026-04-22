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

// CreateCategoryRequest 建立分類的請求
type CreateCategoryRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
	SortOrder   *int    `json:"sort_order"`
}

// UpdateCategoryRequest 更新分類的請求（全量更新）
type UpdateCategoryRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
	SortOrder   int     `json:"sort_order"`
}
