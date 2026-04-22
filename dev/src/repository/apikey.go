package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ApiKeyRepository API Key 資料庫操作
type ApiKeyRepository struct {
	pool *pgxpool.Pool
}

// NewApiKeyRepository 建立新的 ApiKeyRepository
func NewApiKeyRepository(pool *pgxpool.Pool) *ApiKeyRepository {
	return &ApiKeyRepository{pool: pool}
}

// Count 取得 API Key 總數
func (r *ApiKeyRepository) Count(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM api_keys").Scan(&count)
	return count, err
}

// CountActiveValid 取得有效（active 且未過期）的 API Key 數量
func (r *ApiKeyRepository) CountActiveValid(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM api_keys
		 WHERE is_active = TRUE
		 AND (expires_at IS NULL OR expires_at > NOW())`,
	).Scan(&count)
	return count, err
}

// Create 建立新的 API Key
func (r *ApiKeyRepository) Create(ctx context.Context, apiKey *model.ApiKey) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO api_keys (id, name, key_hash, key_prefix, is_active, expires_at, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		apiKey.ID, apiKey.Name, apiKey.KeyHash, apiKey.KeyPrefix,
		apiKey.IsActive, apiKey.ExpiresAt, apiKey.CreatedAt,
	)
	if err != nil && strings.Contains(err.Error(), "duplicate key value") {
		if strings.Contains(err.Error(), "api_keys_name_key") {
			return model.NewAppError(409, model.ErrCodeDuplicateKeyName, "API Key 名稱已存在")
		}
	}
	return err
}

// FindByKeyHash 透過 key hash 查找 API Key
func (r *ApiKeyRepository) FindByKeyHash(ctx context.Context, keyHash string) (*model.ApiKey, error) {
	apiKey := &model.ApiKey{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, key_hash, key_prefix, is_active, expires_at, last_used_at, created_at
		 FROM api_keys WHERE key_hash = $1`,
		keyHash,
	).Scan(
		&apiKey.ID, &apiKey.Name, &apiKey.KeyHash, &apiKey.KeyPrefix,
		&apiKey.IsActive, &apiKey.ExpiresAt, &apiKey.LastUsedAt, &apiKey.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return apiKey, err
}

// FindByID 透過 ID 查找 API Key
func (r *ApiKeyRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.ApiKey, error) {
	apiKey := &model.ApiKey{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, key_hash, key_prefix, is_active, expires_at, last_used_at, created_at
		 FROM api_keys WHERE id = $1`,
		id,
	).Scan(
		&apiKey.ID, &apiKey.Name, &apiKey.KeyHash, &apiKey.KeyPrefix,
		&apiKey.IsActive, &apiKey.ExpiresAt, &apiKey.LastUsedAt, &apiKey.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return apiKey, err
}

// List 列出所有 API Keys
func (r *ApiKeyRepository) List(ctx context.Context) ([]model.ApiKey, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, key_hash, key_prefix, is_active, expires_at, last_used_at, created_at
		 FROM api_keys ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []model.ApiKey
	for rows.Next() {
		var k model.ApiKey
		if err := rows.Scan(
			&k.ID, &k.Name, &k.KeyHash, &k.KeyPrefix,
			&k.IsActive, &k.ExpiresAt, &k.LastUsedAt, &k.CreatedAt,
		); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, rows.Err()
}

// Delete 刪除 API Key（硬刪除）
func (r *ApiKeyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM api_keys WHERE id = $1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(404, model.ErrCodeNotFound, "API Key 不存在")
	}
	return nil
}

// UpdateLastUsedAt 更新最後使用時間
func (r *ApiKeyRepository) UpdateLastUsedAt(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		"UPDATE api_keys SET last_used_at = NOW() WHERE id = $1", id,
	)
	return err
}
