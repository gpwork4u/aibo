package dto

import "time"

// GitHubConnectRequest POST /api/v1/integrations/github/connect 的請求 body
type GitHubConnectRequest struct {
	// Token GitHub Personal Access Token（PAT）；不得出現在回應或日誌中
	Token string `json:"token" binding:"required"`
}

// GitHubConnectResponse POST /api/v1/integrations/github/connect 的回應 body（201）
// 扁平結構，符合 spec 要求
type GitHubConnectResponse struct {
	ID           string     `json:"id"`
	Username     string     `json:"username"`
	Scopes       []string   `json:"scopes"`
	TokenSet     bool       `json:"token_set"`
	LastSyncedAt *time.Time `json:"last_synced_at,omitempty"`
	LastError    *string    `json:"last_error,omitempty"`
	LastErrorAt  *time.Time `json:"last_error_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// GitHubStatusConnectedResponse GET /api/v1/integrations/github/status 的回應 body（已連接）
// 扁平結構，符合 spec 要求
type GitHubStatusConnectedResponse struct {
	Connected    bool       `json:"connected"`
	ID           string     `json:"id"`
	Username     string     `json:"username"`
	Scopes       []string   `json:"scopes"`
	TokenSet     bool       `json:"token_set"`
	LastSyncedAt *time.Time `json:"last_synced_at,omitempty"`
	LastError    *string    `json:"last_error,omitempty"`
	LastErrorAt  *time.Time `json:"last_error_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// GitHubStatusDisconnectedResponse GET /api/v1/integrations/github/status 的回應 body（未連接）
type GitHubStatusDisconnectedResponse struct {
	Connected bool `json:"connected"`
}
