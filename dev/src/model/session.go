package model

import (
	"time"

	"github.com/google/uuid"
)

// Session cookie-based session
type Session struct {
	ID          uuid.UUID  `db:"id"`
	TokenHash   string     `db:"token_hash"`
	UserLabel   string     `db:"user_label"`
	ExpiresAt   time.Time  `db:"expires_at"`
	CreatedAt   time.Time  `db:"created_at"`
	LastSeenAt  *time.Time `db:"last_seen_at"`
}
