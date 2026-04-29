package model

import (
	"time"

	"github.com/google/uuid"
)

// CopilotSession Copilot 對話 session
type CopilotSession struct {
	ID         uuid.UUID `json:"id"`
	UserID     string    `json:"user_id"`
	CreatedAt  time.Time `json:"created_at"`
	LastActive time.Time `json:"last_active"`
}

// CopilotMessage Copilot 對話訊息
type CopilotMessage struct {
	ID        uuid.UUID `json:"id"`
	SessionID uuid.UUID `json:"session_id"`
	Role      string    `json:"role"` // user | assistant | system
	Content   string    `json:"content"`
	Seq       int       `json:"seq"`
	CreatedAt time.Time `json:"created_at"`
}
