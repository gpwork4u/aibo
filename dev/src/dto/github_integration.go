package dto

import "time"

// GitHubConnectRequest POST /api/v1/integrations/github/connect 的請求 body
type GitHubConnectRequest struct {
	// Token GitHub Personal Access Token（PAT）；不得出現在回應或日誌中
	Token string `json:"token" binding:"required"`
}

// GitHubIntegrationDTO GitHub 整合資訊（不含 token 明文）
type GitHubIntegrationDTO struct {
	// Username GitHub 使用者名稱（由 GET /user API 回傳）
	Username string `json:"username"`

	// Scopes 此 PAT 擁有的 scope 清單（由 X-OAuth-Scopes header 解析）
	Scopes []string `json:"scopes"`

	// TokenSet 固定為 true，代表 token 已存在（不回傳明文）
	TokenSet bool `json:"token_set"`

	// LastSyncedAt 最後一次成功同步的時間
	LastSyncedAt *time.Time `json:"last_synced_at,omitempty"`

	// LastError 最後一次同步的錯誤訊息（無錯誤時省略）
	LastError *string `json:"last_error,omitempty"`
}

// GitHubStatusResponse GET /api/v1/integrations/github/status 的回應 body
type GitHubStatusResponse struct {
	// Connected 是否已連接 GitHub
	Connected bool `json:"connected"`

	// Integration 連接資訊（connected=false 時為 nil）
	Integration *GitHubIntegrationDTO `json:"integration,omitempty"`
}

// GitHubConnectResponse POST /api/v1/integrations/github/connect 的回應 body（201）
type GitHubConnectResponse struct {
	// Message 操作結果說明
	Message string `json:"message"`

	// Integration 連接後的整合資訊
	Integration GitHubIntegrationDTO `json:"integration"`
}
