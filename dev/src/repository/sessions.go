package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SessionRepository session 資料庫操作
type SessionRepository struct {
	pool *pgxpool.Pool
}

// NewSessionRepository 建立新的 SessionRepository
func NewSessionRepository(pool *pgxpool.Pool) *SessionRepository {
	return &SessionRepository{pool: pool}
}

// Create 建立新 session
func (r *SessionRepository) Create(ctx context.Context, s *model.Session) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO sessions (id, token_hash, user_label, expires_at, created_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		s.ID, s.TokenHash, s.UserLabel, s.ExpiresAt, s.CreatedAt,
	)
	return err
}

// FindByTokenHash 透過 token hash 查找 session
func (r *SessionRepository) FindByTokenHash(ctx context.Context, tokenHash string) (*model.Session, error) {
	s := &model.Session{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, token_hash, user_label, expires_at, created_at, last_seen_at
		 FROM sessions WHERE token_hash = $1 AND expires_at > NOW()`,
		tokenHash,
	).Scan(&s.ID, &s.TokenHash, &s.UserLabel, &s.ExpiresAt, &s.CreatedAt, &s.LastSeenAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return s, err
}

// Delete 刪除 session
func (r *SessionRepository) Delete(ctx context.Context, tokenHash string) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM sessions WHERE token_hash = $1", tokenHash)
	return err
}

// UpdateLastSeenAt 更新最後使用時間
func (r *SessionRepository) UpdateLastSeenAt(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx,
		"UPDATE sessions SET last_seen_at = $1 WHERE id = $2", now, id,
	)
	return err
}
