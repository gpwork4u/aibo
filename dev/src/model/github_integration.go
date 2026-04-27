package model

import (
	"time"

	"github.com/google/uuid"
)

// GitHubIntegration GitHub PAT 整合資料庫模型
//
// token_encrypted 欄位：service 層使用 AES-256-GCM 加密後才落地；
// 任何程式碼路徑都不得將明文 PAT 寫入此欄位或印到日誌。
type GitHubIntegration struct {
	ID             uuid.UUID  `json:"id"`
	Username       string     `json:"username"`
	TokenEncrypted string     `json:"-"` // 加密後的 PAT，json 序列化時省略
	Scopes         []string   `json:"scopes"`
	LastSyncedAt   *time.Time `json:"last_synced_at,omitempty"`
	LastError      *string    `json:"last_error,omitempty"`
	LastErrorAt    *time.Time `json:"last_error_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// 錯誤碼常數（GitHub 整合相關）
const (
	// ErrCodeGitHubTokenInvalid PAT 無效或已過期（GitHub API 回 401）
	ErrCodeGitHubTokenInvalid = "GITHUB_TOKEN_INVALID"

	// ErrCodeGitHubInsufficientScope PAT 缺少必要 scopes
	ErrCodeGitHubInsufficientScope = "GITHUB_TOKEN_INSUFFICIENT_SCOPE"

	// ErrCodeGitHubUnavailable GitHub API 無法連線（503）
	ErrCodeGitHubUnavailable = "GITHUB_UNAVAILABLE"

	// ErrCodeGitHubNotConnected 尚未設定 GitHub 整合
	ErrCodeGitHubNotConnected = "GITHUB_NOT_CONNECTED"
)
