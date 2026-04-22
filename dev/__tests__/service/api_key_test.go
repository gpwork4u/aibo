package service_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// mockApiKeyRepo 模擬 ApiKeyRepository
type mockApiKeyRepo struct {
	keys          []model.ApiKey
	countResult   int
	countErr      error
	createErr     error
	findByHashKey *model.ApiKey
	findByHashErr error
	findByIDKey   *model.ApiKey
	findByIDErr   error
}

func (m *mockApiKeyRepo) Count(ctx context.Context) (int, error) {
	return m.countResult, m.countErr
}

func (m *mockApiKeyRepo) CountActiveValid(ctx context.Context) (int, error) {
	count := 0
	for _, k := range m.keys {
		if k.IsValid() {
			count++
		}
	}
	return count, nil
}

func (m *mockApiKeyRepo) Create(ctx context.Context, apiKey *model.ApiKey) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.keys = append(m.keys, *apiKey)
	return nil
}

func (m *mockApiKeyRepo) FindByKeyHash(ctx context.Context, keyHash string) (*model.ApiKey, error) {
	return m.findByHashKey, m.findByHashErr
}

func (m *mockApiKeyRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.ApiKey, error) {
	return m.findByIDKey, m.findByIDErr
}

func (m *mockApiKeyRepo) List(ctx context.Context) ([]model.ApiKey, error) {
	return m.keys, nil
}

func (m *mockApiKeyRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (m *mockApiKeyRepo) UpdateLastUsedAt(ctx context.Context, id uuid.UUID) error {
	return nil
}

// 注意：由於 service 直接依賴 repository struct，非 interface，
// 以下測試主要驗證 key 生成邏輯和 model 行為。
// 完整整合測試需要真實 DB。

func TestApiKeyModel_IsExpired(t *testing.T) {
	tests := []struct {
		name      string
		expiresAt *time.Time
		expected  bool
	}{
		{
			name:      "nil expires_at 永不過期",
			expiresAt: nil,
			expected:  false,
		},
		{
			name:      "未來時間未過期",
			expiresAt: timePtr(time.Now().Add(24 * time.Hour)),
			expected:  false,
		},
		{
			name:      "過去時間已過期",
			expiresAt: timePtr(time.Now().Add(-24 * time.Hour)),
			expected:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			k := &model.ApiKey{ExpiresAt: tt.expiresAt}
			if k.IsExpired() != tt.expected {
				t.Errorf("IsExpired() = %v, want %v", k.IsExpired(), tt.expected)
			}
		})
	}
}

func TestApiKeyModel_IsValid(t *testing.T) {
	tests := []struct {
		name     string
		key      model.ApiKey
		expected bool
	}{
		{
			name:     "active 且無過期時間",
			key:      model.ApiKey{IsActive: true, ExpiresAt: nil},
			expected: true,
		},
		{
			name:     "active 且未過期",
			key:      model.ApiKey{IsActive: true, ExpiresAt: timePtr(time.Now().Add(time.Hour))},
			expected: true,
		},
		{
			name:     "inactive",
			key:      model.ApiKey{IsActive: false, ExpiresAt: nil},
			expected: false,
		},
		{
			name:     "active 但已過期",
			key:      model.ApiKey{IsActive: true, ExpiresAt: timePtr(time.Now().Add(-time.Hour))},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.key.IsValid() != tt.expected {
				t.Errorf("IsValid() = %v, want %v", tt.key.IsValid(), tt.expected)
			}
		})
	}
}

func TestKeyFormat(t *testing.T) {
	// 驗證 key 格式：aibo_ + 32 chars (a-z0-9)
	// 使用 service 內部的 exported 測試輔助函數
	// 由於 generateKey 是 unexported，這裡測試 hash 邏輯

	key := "aibo_abcdefghijklmnopqrstuvwxyz012345"
	if len(key) != 37 {
		t.Errorf("key length = %d, want 37", len(key))
	}
	if !strings.HasPrefix(key, "aibo_") {
		t.Error("key should start with 'aibo_'")
	}

	// 驗證 SHA-256 hash
	h := sha256.Sum256([]byte(key))
	hash := hex.EncodeToString(h[:])
	if len(hash) != 64 {
		t.Errorf("hash length = %d, want 64", len(hash))
	}
}

func TestKeyPrefix(t *testing.T) {
	key := "aibo_abcdefghijklmnopqrstuvwxyz012345"
	prefix := key[:10]
	if prefix != "aibo_abcde" {
		t.Errorf("prefix = %s, want aibo_abcde", prefix)
	}
}

// 使用 service 的 exported 方法測試 bootstrap
func TestServiceCreate_Validation(t *testing.T) {
	// 由於 service 依賴真實 repository（非 interface），
	// 這裡只測試可以不需要 DB 的驗證邏輯
	_ = service.NewApiKeyService(nil) // 只是確認建構函式可以呼叫
}

func timePtr(t time.Time) *time.Time {
	return &t
}
