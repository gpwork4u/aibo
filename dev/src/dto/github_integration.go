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

// GitHubCommit 單筆 commit 的 API 回應結構
type GitHubCommit struct {
	SHA         string    `json:"sha"`
	Repo        string    `json:"repo"`
	Message     string    `json:"message"`
	URL         string    `json:"url"`
	CommittedAt time.Time `json:"committed_at"`
	Additions   *int      `json:"additions"`
	Deletions   *int      `json:"deletions"`
}

// GitHubCommitsResponse GET /api/v1/integrations/github/commits 的回應 body
type GitHubCommitsResponse struct {
	Date      string         `json:"date"`
	Username  string         `json:"username"`
	Commits   []GitHubCommit `json:"commits"`
	Total     int            `json:"total"`
	Truncated bool           `json:"truncated"`
	Warning   *string        `json:"warning,omitempty"`
}

// GitHubRateLimitErrorResponse rate limit 錯誤的回應 body
type GitHubRateLimitErrorResponse struct {
	Code              string `json:"code"`
	Message           string `json:"message"`
	RetryAfterSeconds int    `json:"retry_after_seconds"`
}
