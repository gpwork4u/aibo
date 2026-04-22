package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
)

const (
	keyPrefix    = "aibo_"
	keyRandomLen = 32
	keyCharset   = "abcdefghijklmnopqrstuvwxyz0123456789"
)

// ApiKeyService API Key 業務邏輯
type ApiKeyService struct {
	repo *repository.ApiKeyRepository
}

// NewApiKeyService 建立新的 ApiKeyService
func NewApiKeyService(repo *repository.ApiKeyRepository) *ApiKeyService {
	return &ApiKeyService{repo: repo}
}

// IsBootstrap 檢查是否處於 bootstrap 狀態（無任何 API Key）
func (s *ApiKeyService) IsBootstrap(ctx context.Context) (bool, error) {
	count, err := s.repo.Count(ctx)
	if err != nil {
		return false, err
	}
	return count == 0, nil
}

// Create 建立新的 API Key，回傳包含明文 key 的結果
func (s *ApiKeyService) Create(ctx context.Context, name string, expiresAt *time.Time) (*model.ApiKey, string, error) {
	// 驗證 name
	if name == "" {
		return nil, "", model.NewAppError(400, model.ErrCodeInvalidInput, "name 不可為空")
	}
	if len(name) > 50 {
		return nil, "", model.NewAppError(400, model.ErrCodeInvalidInput, "name 不可超過 50 字元")
	}

	// 驗證 expires_at
	if expiresAt != nil && expiresAt.Before(time.Now()) {
		return nil, "", model.NewAppError(400, model.ErrCodeInvalidInput, "expires_at 必須是未來時間")
	}

	// 產生隨機 key
	rawKey, err := generateKey()
	if err != nil {
		return nil, "", fmt.Errorf("產生 key 失敗: %w", err)
	}

	// 計算 SHA-256 hash
	keyHash := hashKey(rawKey)

	apiKey := &model.ApiKey{
		ID:        uuid.New(),
		Name:      name,
		KeyHash:   keyHash,
		KeyPrefix: rawKey[:10],
		IsActive:  true,
		ExpiresAt: expiresAt,
		CreatedAt: time.Now().UTC(),
	}

	if err := s.repo.Create(ctx, apiKey); err != nil {
		return nil, "", err
	}

	return apiKey, rawKey, nil
}

// ValidateKey 驗證 API Key，回傳對應的 ApiKey 或錯誤
func (s *ApiKeyService) ValidateKey(ctx context.Context, rawKey string) (*model.ApiKey, error) {
	keyHash := hashKey(rawKey)

	apiKey, err := s.repo.FindByKeyHash(ctx, keyHash)
	if err != nil {
		return nil, err
	}

	if apiKey == nil {
		return nil, model.NewAppError(401, model.ErrCodeUnauthorized, "API Key 無效")
	}

	// 使用 constant-time compare 防止 timing attack
	storedHash, _ := hex.DecodeString(apiKey.KeyHash)
	providedHash, _ := hex.DecodeString(keyHash)
	if subtle.ConstantTimeCompare(storedHash, providedHash) != 1 {
		return nil, model.NewAppError(401, model.ErrCodeUnauthorized, "API Key 無效")
	}

	if !apiKey.IsActive {
		return nil, model.NewAppError(401, model.ErrCodeUnauthorized, "API Key 已停用")
	}

	if apiKey.IsExpired() {
		return nil, model.NewAppError(401, model.ErrCodeUnauthorized, "API Key 已過期")
	}

	// 非同步更新 last_used_at
	go func() {
		if err := s.repo.UpdateLastUsedAt(context.Background(), apiKey.ID); err != nil {
			slog.Error("更新 last_used_at 失敗", "error", err, "key_id", apiKey.ID)
		}
	}()

	return apiKey, nil
}

// List 列出所有 API Keys
func (s *ApiKeyService) List(ctx context.Context) ([]model.ApiKey, error) {
	return s.repo.List(ctx)
}

// Delete 刪除 API Key
func (s *ApiKeyService) Delete(ctx context.Context, id uuid.UUID) error {
	// 檢查 key 是否存在
	apiKey, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if apiKey == nil {
		return model.NewAppError(404, model.ErrCodeNotFound, "API Key 不存在")
	}

	// 如果要刪除的是有效 key，檢查是否為最後一把
	if apiKey.IsValid() {
		activeCount, err := s.repo.CountActiveValid(ctx)
		if err != nil {
			return err
		}
		if activeCount <= 1 {
			return model.NewAppError(400, model.ErrCodeLastKeyProtected, "不能刪除最後一把有效的 API Key")
		}
	}

	return s.repo.Delete(ctx, id)
}

// generateKey 產生隨機 API Key：aibo_ + 32 chars (a-z0-9)
func generateKey() (string, error) {
	b := make([]byte, keyRandomLen)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = keyCharset[int(b[i])%len(keyCharset)]
	}
	return keyPrefix + string(b), nil
}

// hashKey 計算 SHA-256 hash
func hashKey(key string) string {
	h := sha256.Sum256([]byte(key))
	return hex.EncodeToString(h[:])
}
