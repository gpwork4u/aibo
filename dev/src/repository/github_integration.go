package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GitHubIntegrationRepository GitHub 整合資料庫操作
type GitHubIntegrationRepository struct {
	pool *pgxpool.Pool
}

// NewGitHubIntegrationRepository 建立新的 GitHubIntegrationRepository
func NewGitHubIntegrationRepository(pool *pgxpool.Pool) *GitHubIntegrationRepository {
	return &GitHubIntegrationRepository{pool: pool}
}

// Get 取得目前唯一的 GitHubIntegration 記錄（MVP 僅支援單一帳號）
// 若尚未設定則回傳 nil, nil
func (r *GitHubIntegrationRepository) Get(ctx context.Context) (*model.GitHubIntegration, error) {
	integration := &model.GitHubIntegration{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, username, token_encrypted, scopes,
		        last_synced_at, last_error, last_error_at, created_at, updated_at
		 FROM github_integrations
		 ORDER BY created_at DESC
		 LIMIT 1`,
	).Scan(
		&integration.ID,
		&integration.Username,
		&integration.TokenEncrypted,
		&integration.Scopes,
		&integration.LastSyncedAt,
		&integration.LastError,
		&integration.LastErrorAt,
		&integration.CreatedAt,
		&integration.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return integration, nil
}

// Upsert 依 LOWER(username) 覆蓋更新（若存在則更新，否則插入）
// 確保 DB 內永遠只有一筆同 username 的記錄
// 採用 query-then-insert-or-update 策略，規避 ON CONFLICT expression 限制
func (r *GitHubIntegrationRepository) Upsert(ctx context.Context, integration *model.GitHubIntegration) error {
	if integration.ID == uuid.Nil {
		integration.ID = uuid.New()
	}

	// 先查是否存在相同（case-insensitive）username
	var existingID uuid.UUID
	err := r.pool.QueryRow(ctx,
		`SELECT id FROM github_integrations WHERE LOWER(username) = LOWER($1) LIMIT 1`,
		integration.Username,
	).Scan(&existingID)

	if errors.Is(err, pgx.ErrNoRows) {
		// 不存在 → INSERT
		_, err = r.pool.Exec(ctx,
			`INSERT INTO github_integrations
			   (id, username, token_encrypted, scopes, last_synced_at, last_error, last_error_at, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
			integration.ID,
			integration.Username,
			integration.TokenEncrypted,
			integration.Scopes,
			integration.LastSyncedAt,
			integration.LastError,
			integration.LastErrorAt,
		)
		return err
	}
	if err != nil {
		return err
	}

	// 存在 → UPDATE（清空 last_error / last_error_at）
	_, err = r.pool.Exec(ctx,
		`UPDATE github_integrations
		 SET token_encrypted = $1,
		     scopes          = $2,
		     last_synced_at  = $3,
		     last_error      = NULL,
		     last_error_at   = NULL,
		     updated_at      = NOW()
		 WHERE id = $4`,
		integration.TokenEncrypted,
		integration.Scopes,
		integration.LastSyncedAt,
		existingID,
	)
	return err
}

// Delete 刪除所有 github_integrations 記錄（中斷連線語意）
// 若無記錄則回傳 pgx.ErrNoRows
func (r *GitHubIntegrationRepository) Delete(ctx context.Context) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM github_integrations`)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// UpdateLastSyncedAt 更新最後同步時間（供 sync job 使用）
func (r *GitHubIntegrationRepository) UpdateLastSyncedAt(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE github_integrations
		 SET last_synced_at = NOW(), last_error = NULL, last_error_at = NULL, updated_at = NOW()
		 WHERE id = $1`,
		id,
	)
	return err
}

// UpdateLastError 記錄最後一次同步錯誤（供 sync job 使用）
// 同步寫入 last_error_at = NOW()
func (r *GitHubIntegrationRepository) UpdateLastError(ctx context.Context, id uuid.UUID, errMsg string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE github_integrations
		 SET last_error = $1, last_error_at = NOW(), updated_at = NOW()
		 WHERE id = $2`,
		errMsg, id,
	)
	return err
}
