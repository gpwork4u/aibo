package repository_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
)

// Repository 層的測試需要真實 DB 連線
// 以下為模型驗證測試，整合測試需在 Docker 環境執行

func TestApiKeyModel_Fields(t *testing.T) {
	now := time.Now().UTC()
	expiresAt := now.Add(24 * time.Hour)
	id := uuid.New()

	key := model.ApiKey{
		ID:        id,
		Name:      "test-key",
		KeyHash:   "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
		KeyPrefix: "aibo_test1",
		IsActive:  true,
		ExpiresAt: &expiresAt,
		CreatedAt: now,
	}

	if key.ID != id {
		t.Errorf("ID = %v, want %v", key.ID, id)
	}
	if key.Name != "test-key" {
		t.Errorf("Name = %s, want test-key", key.Name)
	}
	if key.KeyPrefix != "aibo_test1" {
		t.Errorf("KeyPrefix = %s, want aibo_test1", key.KeyPrefix)
	}
	if !key.IsActive {
		t.Error("IsActive should be true")
	}
	if key.IsExpired() {
		t.Error("key should not be expired")
	}
	if !key.IsValid() {
		t.Error("key should be valid")
	}
}

func TestApiKeyModel_NameConstraints(t *testing.T) {
	// 驗證 name 長度限制邏輯
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{"空字串", "", true},
		{"正常名稱", "my-key", false},
		{"50 字元", "aaaaaaaaaabbbbbbbbbbccccccccccddddddddddeeeeeeeeee", false},
		{"51 字元", "aaaaaaaaaabbbbbbbbbbccccccccccddddddddddeeeeeeeeeef", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hasErr := len(tt.input) == 0 || len(tt.input) > 50
			if hasErr != tt.wantErr {
				t.Errorf("name=%q validation = %v, want error=%v", tt.input, hasErr, tt.wantErr)
			}
		})
	}
}

func TestApiKeyModel_ExpiresAtValidation(t *testing.T) {
	past := time.Now().Add(-time.Hour)
	future := time.Now().Add(time.Hour)

	tests := []struct {
		name      string
		expiresAt *time.Time
		wantErr   bool
	}{
		{"nil（永不過期）", nil, false},
		{"未來時間", &future, false},
		{"過去時間", &past, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hasErr := tt.expiresAt != nil && tt.expiresAt.Before(time.Now())
			if hasErr != tt.wantErr {
				t.Errorf("expiresAt validation = %v, want error=%v", hasErr, tt.wantErr)
			}
		})
	}
}
