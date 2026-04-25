package model

import (
	"time"

	"github.com/google/uuid"
)

// GcalIntegration Google Calendar 整合資料庫模型
type GcalIntegration struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	ClientID     string    `json:"client_id"`
	ClientSecret string    `json:"client_secret"` // AES-256 加密儲存
	AccessToken  string    `json:"access_token"`  // AES-256 加密儲存
	RefreshToken string    `json:"refresh_token"` // AES-256 加密儲存
	TokenExpiry  time.Time `json:"token_expiry"`
	// DefaultCalendarID 使用者選定的預設日曆（F-030 強化用）。Migration 014 起新增，預設 "primary"。
	DefaultCalendarID string `json:"default_calendar_id"`
	// AccessTokenExpiresAt 新版 access token 過期時間（F-030 強化用）。
	// 與既有 TokenExpiry 欄位雙寫，便於後續逐步淘汰舊欄位；既有資料以 backfill 補齊。
	AccessTokenExpiresAt *time.Time `json:"access_token_expires_at,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}
