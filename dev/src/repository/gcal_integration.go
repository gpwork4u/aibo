package repository

import (
	"context"
	"errors"
	"time"

	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GcalIntegrationRepository Google Calendar 整合資料庫操作
type GcalIntegrationRepository struct {
	pool *pgxpool.Pool
}

// NewGcalIntegrationRepository 建立新的 GcalIntegrationRepository
func NewGcalIntegrationRepository(pool *pgxpool.Pool) *GcalIntegrationRepository {
	return &GcalIntegrationRepository{pool: pool}
}

// Get 取得唯一的 GcalIntegration 記錄（只支援一組）
func (r *GcalIntegrationRepository) Get(ctx context.Context) (*model.GcalIntegration, error) {
	integration := &model.GcalIntegration{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, client_id, client_secret, access_token, refresh_token, token_expiry, created_at, updated_at
		 FROM gcal_integrations
		 ORDER BY created_at DESC
		 LIMIT 1`,
	).Scan(
		&integration.ID, &integration.Email, &integration.ClientID,
		&integration.ClientSecret, &integration.AccessToken, &integration.RefreshToken,
		&integration.TokenExpiry, &integration.CreatedAt, &integration.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return integration, nil
}

// Upsert 建立或更新 GcalIntegration（刪除舊的，插入新的）
func (r *GcalIntegrationRepository) Upsert(ctx context.Context, integration *model.GcalIntegration) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 刪除所有現有記錄（只支援一組）
	_, err = tx.Exec(ctx, `DELETE FROM gcal_integrations`)
	if err != nil {
		return err
	}

	// 插入新記錄
	_, err = tx.Exec(ctx,
		`INSERT INTO gcal_integrations (id, email, client_id, client_secret, access_token, refresh_token, token_expiry, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		integration.ID, integration.Email, integration.ClientID,
		integration.ClientSecret, integration.AccessToken, integration.RefreshToken,
		integration.TokenExpiry, integration.CreatedAt, integration.UpdatedAt,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// UpdateTokens 更新 access_token 和 refresh_token
func (r *GcalIntegrationRepository) UpdateTokens(ctx context.Context, id interface{}, accessToken, refreshToken string, expiry interface{}) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE gcal_integrations
		 SET access_token = $1, refresh_token = $2, token_expiry = $3, updated_at = NOW()
		 WHERE id = $4`,
		accessToken, refreshToken, expiry, id,
	)
	return err
}

// SaveOAuthState 儲存 OAuth state 到 DB
func (r *GcalIntegrationRepository) SaveOAuthState(ctx context.Context, state string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO oauth_states (state, created_at) VALUES ($1, NOW())`,
		state,
	)
	return err
}

// ValidateOAuthState 驗證 OAuth state 是否存在且未過期（10 分鐘內），驗證後刪除
func (r *GcalIntegrationRepository) ValidateOAuthState(ctx context.Context, state string) (bool, error) {
	var createdAt time.Time
	err := r.pool.QueryRow(ctx,
		`DELETE FROM oauth_states WHERE state = $1 RETURNING created_at`,
		state,
	).Scan(&createdAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	// 檢查是否在 10 分鐘內
	if time.Since(createdAt) > 10*time.Minute {
		return false, nil
	}

	return true, nil
}

// CleanExpiredOAuthStates 清理超過 10 分鐘的過期 state
func (r *GcalIntegrationRepository) CleanExpiredOAuthStates(ctx context.Context) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM oauth_states WHERE created_at < NOW() - INTERVAL '10 minutes'`,
	)
	return err
}
