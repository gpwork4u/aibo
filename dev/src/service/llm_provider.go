package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/crypto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
)

// LlmProviderService LLM Provider 業務邏輯
type LlmProviderService struct {
	repo   *repository.LlmProviderRepository
	crypto *crypto.AESCrypto
}

// NewLlmProviderService 建立新的 LlmProviderService
func NewLlmProviderService(repo *repository.LlmProviderRepository, aesCrypto *crypto.AESCrypto) *LlmProviderService {
	return &LlmProviderService{
		repo:   repo,
		crypto: aesCrypto,
	}
}

// CreateInput 建立 LLM Provider 的輸入
type CreateInput struct {
	Name        string
	EndpointURL string
	ApiKey      *string
	ModelName   string
	IsDefault   bool
	Config      *json.RawMessage
	IsActive    bool
}

// UpdateInput 更新 LLM Provider 的輸入
type UpdateInput struct {
	Name        string
	EndpointURL string
	ApiKey      *string // nil 表示清除
	ApiKeyOmit  bool    // true 表示請求中沒有提供 api_key 欄位，保留原值
	ModelName   string
	IsDefault   bool
	Config      *json.RawMessage
	IsActive    bool
}

// Create 建立新的 LLM Provider
func (s *LlmProviderService) Create(ctx context.Context, input CreateInput) (*model.LlmProvider, error) {
	// 驗證輸入
	if err := s.validateInput(input.Name, input.EndpointURL, input.ModelName); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	provider := &model.LlmProvider{
		ID:          uuid.New(),
		Name:        input.Name,
		EndpointURL: input.EndpointURL,
		ModelName:   input.ModelName,
		IsDefault:   input.IsDefault,
		Config:      input.Config,
		IsActive:    input.IsActive,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// 加密 api_key
	if input.ApiKey != nil && *input.ApiKey != "" {
		encrypted, err := s.crypto.Encrypt(*input.ApiKey)
		if err != nil {
			return nil, fmt.Errorf("加密 API Key 失敗: %w", err)
		}
		provider.ApiKey = &encrypted
	}

	// 如果設定為 default，先在 transaction 中清除舊 default
	if input.IsDefault {
		tx, err := s.repo.BeginTx(ctx)
		if err != nil {
			return nil, fmt.Errorf("開始交易失敗: %w", err)
		}
		defer tx.Rollback(ctx)

		if err := s.repo.ClearDefault(ctx, tx); err != nil {
			return nil, err
		}

		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("提交交易失敗: %w", err)
		}
	}

	if err := s.repo.Create(ctx, provider); err != nil {
		return nil, err
	}

	return provider, nil
}

// GetByID 取得指定 ID 的 LLM Provider
func (s *LlmProviderService) GetByID(ctx context.Context, id uuid.UUID) (*model.LlmProvider, error) {
	provider, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if provider == nil {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "LLM Provider 不存在")
	}
	return provider, nil
}

// List 列出所有 LLM Providers
func (s *LlmProviderService) List(ctx context.Context) ([]model.LlmProvider, error) {
	return s.repo.List(ctx)
}

// Update 全量更新 LLM Provider
func (s *LlmProviderService) Update(ctx context.Context, id uuid.UUID, input UpdateInput) (*model.LlmProvider, error) {
	// 驗證輸入
	if err := s.validateInput(input.Name, input.EndpointURL, input.ModelName); err != nil {
		return nil, err
	}

	// 確認 provider 存在
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "LLM Provider 不存在")
	}

	now := time.Now().UTC()
	provider := &model.LlmProvider{
		ID:          id,
		Name:        input.Name,
		EndpointURL: input.EndpointURL,
		ModelName:   input.ModelName,
		IsDefault:   input.IsDefault,
		Config:      input.Config,
		IsActive:    input.IsActive,
		UpdatedAt:   now,
	}

	// 處理 api_key
	if input.ApiKeyOmit {
		// 保留原值
		provider.ApiKey = existing.ApiKey
	} else if input.ApiKey != nil && *input.ApiKey != "" {
		// 加密新值
		encrypted, err := s.crypto.Encrypt(*input.ApiKey)
		if err != nil {
			return nil, fmt.Errorf("加密 API Key 失敗: %w", err)
		}
		provider.ApiKey = &encrypted
	}
	// else: api_key = nil，表示清除

	// 如果設定為 default 且不是原本就是 default，先清除舊 default
	if input.IsDefault && !existing.IsDefault {
		tx, err := s.repo.BeginTx(ctx)
		if err != nil {
			return nil, fmt.Errorf("開始交易失敗: %w", err)
		}
		defer tx.Rollback(ctx)

		if err := s.repo.ClearDefault(ctx, tx); err != nil {
			return nil, err
		}

		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("提交交易失敗: %w", err)
		}
	}

	if err := s.repo.Update(ctx, provider); err != nil {
		return nil, err
	}

	// 重新取得更新後的資料
	return s.repo.FindByID(ctx, id)
}

// Delete 刪除 LLM Provider（硬刪除）
func (s *LlmProviderService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

// HealthCheckResult 健康檢查結果
type HealthCheckResult struct {
	Status         string  `json:"status"`
	ResponseTimeMs *int64  `json:"response_time_ms,omitempty"`
	Error          *string `json:"error,omitempty"`
}

// HealthCheck 對指定 provider 發送健康檢查
func (s *LlmProviderService) HealthCheck(ctx context.Context, id uuid.UUID) (*HealthCheckResult, error) {
	provider, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if provider == nil {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "LLM Provider 不存在")
	}

	// 取得 timeout（從 config 或預設 10 秒）
	timeout := 10 * time.Second
	if provider.Config != nil {
		var cfg model.LlmProviderConfig
		if err := json.Unmarshal(*provider.Config, &cfg); err == nil && cfg.TimeoutSeconds != nil {
			timeout = time.Duration(*cfg.TimeoutSeconds) * time.Second
		}
	}

	// 準備 health check request：POST /chat/completions with minimal payload
	endpointURL := strings.TrimRight(provider.EndpointURL, "/") + "/chat/completions"
	payload := map[string]interface{}{
		"model": provider.ModelName,
		"messages": []map[string]string{
			{"role": "user", "content": "hi"},
		},
		"max_tokens": 1,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpointURL, bytes.NewReader(body))
	if err != nil {
		errMsg := fmt.Sprintf("建立請求失敗: %s", err.Error())
		return &HealthCheckResult{Status: "unhealthy", Error: &errMsg}, nil
	}
	req.Header.Set("Content-Type", "application/json")

	// 如果有 api_key，解密後加到 Authorization header
	if provider.ApiKey != nil && *provider.ApiKey != "" {
		decrypted, err := s.crypto.Decrypt(*provider.ApiKey)
		if err != nil {
			slog.Error("解密 API Key 失敗", "error", err, "provider_id", id)
			errMsg := "解密 API Key 失敗"
			return &HealthCheckResult{Status: "unhealthy", Error: &errMsg}, nil
		}
		req.Header.Set("Authorization", "Bearer "+decrypted)
	}

	client := &http.Client{Timeout: timeout}

	start := time.Now()
	resp, err := client.Do(req)
	elapsed := time.Since(start).Milliseconds()

	if err != nil {
		errMsg := err.Error()
		return &HealthCheckResult{Status: "unhealthy", Error: &errMsg}, nil
	}
	defer resp.Body.Close()

	// 讀取 response body（限制大小）
	io.ReadAll(io.LimitReader(resp.Body, 1024))

	if resp.StatusCode >= 200 && resp.StatusCode < 500 {
		return &HealthCheckResult{Status: "healthy", ResponseTimeMs: &elapsed}, nil
	}

	errMsg := fmt.Sprintf("HTTP %d", resp.StatusCode)
	return &HealthCheckResult{Status: "unhealthy", Error: &errMsg}, nil
}

// GetActiveProvider 取得可用的 provider（優先序：default active > 任意 active > 503）
func (s *LlmProviderService) GetActiveProvider(ctx context.Context) (*model.LlmProvider, error) {
	// 先找 default active
	provider, err := s.repo.FindDefaultActive(ctx)
	if err != nil {
		return nil, err
	}
	if provider != nil {
		return provider, nil
	}

	// 再找任意 active
	provider, err = s.repo.FindAnyActive(ctx)
	if err != nil {
		return nil, err
	}
	if provider != nil {
		return provider, nil
	}

	return nil, model.NewAppError(503, "SERVICE_UNAVAILABLE", "無可用的 LLM Provider")
}

// validateInput 驗證共通欄位
func (s *LlmProviderService) validateInput(name, endpointURL, modelName string) *model.AppError {
	if name == "" {
		return model.NewAppError(400, model.ErrCodeInvalidInput, "name 不可為空")
	}
	if len(name) > 50 {
		return model.NewAppError(400, model.ErrCodeInvalidInput, "name 不可超過 50 字元")
	}

	if endpointURL == "" {
		return model.NewAppError(400, model.ErrCodeInvalidInput, "endpoint_url 不可為空")
	}
	if len(endpointURL) > 500 {
		return model.NewAppError(400, model.ErrCodeInvalidInput, "endpoint_url 不可超過 500 字元")
	}
	u, err := url.Parse(endpointURL)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return model.NewAppError(400, model.ErrCodeInvalidInput, "endpoint_url 格式無效，必須是 http 或 https URL")
	}

	if modelName == "" {
		return model.NewAppError(400, model.ErrCodeInvalidInput, "model_name 不可為空")
	}
	if len(modelName) > 100 {
		return model.NewAppError(400, model.ErrCodeInvalidInput, "model_name 不可超過 100 字元")
	}

	return nil
}
