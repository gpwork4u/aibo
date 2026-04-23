package model

import (
	"time"

	"github.com/google/uuid"
)

// EntryFlag 知識條目標記記錄
type EntryFlag struct {
	ID        uuid.UUID `json:"id"`
	EntryID   uuid.UUID `json:"entry_id"`
	Reason    string    `json:"reason"`
	Note      *string   `json:"note"`
	CreatedAt time.Time `json:"created_at"`
}

// ValidFlagReasons 有效的 flag reason 列表
var ValidFlagReasons = map[string]bool{
	"outdated":   true,
	"inaccurate": true,
	"incomplete": true,
	"duplicate":  true,
}
