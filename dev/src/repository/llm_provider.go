package repository

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// LlmProviderRepository LLM Provider 資料庫操作
type LlmProviderRepository struct {
	pool *pgxpool.Pool
}

// NewLlmProviderRepository 建立新的 LlmProviderRepository
func NewLlmProviderRepository(pool *pgxpool.Pool) *LlmProviderRepository {
	return &LlmProviderRepository{pool: pool}
}

// Create 建立新的 LLM Provider
func (r *LlmProviderRepository) Create(ctx context.Context, provider *model.LlmProvider) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO llm_providers (id, name, endpoint_url, api_key, model_name, is_default, config, is_active, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		provider.ID, provider.Name, provider.EndpointURL, provider.ApiKey,
		provider.ModelName, provider.IsDefault, provider.Config,
		provider.IsActive, provider.CreatedAt, provider.UpdatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "idx_llm_providers_name_lower") {
			return model.NewAppError(409, model.ErrCodeDuplicateProvider, "LLM Provider 名稱已存在")
		}
		if strings.Contains(err.Error(), "idx_llm_providers_default") {
			return model.NewAppError(409, model.ErrCodeInvalidInput, "已有其他 default provider")
		}
	}
	return err
}

// FindByID 透過 ID 查找 LLM Provider
func (r *LlmProviderRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.LlmProvider, error) {
	p := &model.LlmProvider{}
	var configBytes []byte
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, endpoint_url, api_key, model_name, is_default, config, is_active, created_at, updated_at
		 FROM llm_providers WHERE id = $1`,
		id,
	).Scan(
		&p.ID, &p.Name, &p.EndpointURL, &p.ApiKey,
		&p.ModelName, &p.IsDefault, &configBytes,
		&p.IsActive, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if configBytes != nil {
		raw := json.RawMessage(configBytes)
		p.Config = &raw
	}
	return p, nil
}

// List 列出所有 LLM Providers
func (r *LlmProviderRepository) List(ctx context.Context) ([]model.LlmProvider, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, endpoint_url, api_key, model_name, is_default, config, is_active, created_at, updated_at
		 FROM llm_providers ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var providers []model.LlmProvider
	for rows.Next() {
		var p model.LlmProvider
		var configBytes []byte
		if err := rows.Scan(
			&p.ID, &p.Name, &p.EndpointURL, &p.ApiKey,
			&p.ModelName, &p.IsDefault, &configBytes,
			&p.IsActive, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if configBytes != nil {
			raw := json.RawMessage(configBytes)
			p.Config = &raw
		}
		providers = append(providers, p)
	}
	return providers, rows.Err()
}

// Update 全量更新 LLM Provider
func (r *LlmProviderRepository) Update(ctx context.Context, provider *model.LlmProvider) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE llm_providers
		 SET name = $2, endpoint_url = $3, api_key = $4, model_name = $5,
		     is_default = $6, config = $7, is_active = $8, updated_at = $9
		 WHERE id = $1`,
		provider.ID, provider.Name, provider.EndpointURL, provider.ApiKey,
		provider.ModelName, provider.IsDefault, provider.Config,
		provider.IsActive, provider.UpdatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "idx_llm_providers_name_lower") {
			return model.NewAppError(409, model.ErrCodeDuplicateProvider, "LLM Provider 名稱已被其他 provider 使用")
		}
		if strings.Contains(err.Error(), "idx_llm_providers_default") {
			return model.NewAppError(409, model.ErrCodeInvalidInput, "已有其他 default provider")
		}
		return err
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(404, model.ErrCodeNotFound, "LLM Provider 不存在")
	}
	return nil
}

// Delete 刪除 LLM Provider（硬刪除）
func (r *LlmProviderRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM llm_providers WHERE id = $1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(404, model.ErrCodeNotFound, "LLM Provider 不存在")
	}
	return nil
}

// ClearDefault 取消目前的 default provider（transaction 中使用）
func (r *LlmProviderRepository) ClearDefault(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, "UPDATE llm_providers SET is_default = FALSE WHERE is_default = TRUE")
	return err
}

// SetDefault 在 transaction 中設定指定 provider 為 default
func (r *LlmProviderRepository) SetDefault(ctx context.Context, tx pgx.Tx, id uuid.UUID) error {
	tag, err := tx.Exec(ctx, "UPDATE llm_providers SET is_default = TRUE, updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(404, model.ErrCodeNotFound, "LLM Provider 不存在")
	}
	return nil
}

// BeginTx 開始一個交易
func (r *LlmProviderRepository) BeginTx(ctx context.Context) (pgx.Tx, error) {
	return r.pool.Begin(ctx)
}

// FindDefaultActive 查找 default 且 active 的 provider
func (r *LlmProviderRepository) FindDefaultActive(ctx context.Context) (*model.LlmProvider, error) {
	p := &model.LlmProvider{}
	var configBytes []byte
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, endpoint_url, api_key, model_name, is_default, config, is_active, created_at, updated_at
		 FROM llm_providers WHERE is_default = TRUE AND is_active = TRUE`,
	).Scan(
		&p.ID, &p.Name, &p.EndpointURL, &p.ApiKey,
		&p.ModelName, &p.IsDefault, &configBytes,
		&p.IsActive, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if configBytes != nil {
		raw := json.RawMessage(configBytes)
		p.Config = &raw
	}
	return p, nil
}

// FindAnyActive 查找任意 active 的 provider
func (r *LlmProviderRepository) FindAnyActive(ctx context.Context) (*model.LlmProvider, error) {
	p := &model.LlmProvider{}
	var configBytes []byte
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, endpoint_url, api_key, model_name, is_default, config, is_active, created_at, updated_at
		 FROM llm_providers WHERE is_active = TRUE LIMIT 1`,
	).Scan(
		&p.ID, &p.Name, &p.EndpointURL, &p.ApiKey,
		&p.ModelName, &p.IsDefault, &configBytes,
		&p.IsActive, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if configBytes != nil {
		raw := json.RawMessage(configBytes)
		p.Config = &raw
	}
	return p, nil
}
