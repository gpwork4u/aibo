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
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
