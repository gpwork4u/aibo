package service

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"testing"
	"time"

	"github.com/gpwork4u/aibo/model"
)

func TestGenerateKey_Format(t *testing.T) {
	key, err := generateKey()
	if err != nil {
		t.Fatalf("generateKey() error = %v", err)
	}

	if len(key) != 37 {
		t.Errorf("key length = %d, want 37", len(key))
	}

	if !strings.HasPrefix(key, "aibo_") {
		t.Error("key should start with 'aibo_'")
	}

	// 驗證只包含 a-z0-9
	for _, c := range key[5:] {
		if !((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) {
			t.Errorf("key contains invalid character: %c", c)
		}
	}
}

func TestGenerateKey_Uniqueness(t *testing.T) {
	keys := make(map[string]bool)
	for i := 0; i < 100; i++ {
		key, err := generateKey()
		if err != nil {
			t.Fatalf("generateKey() error = %v", err)
		}
		if keys[key] {
			t.Errorf("duplicate key generated: %s", key)
		}
		keys[key] = true
	}
}

func TestHashKey(t *testing.T) {
	key := "aibo_abcdefghijklmnopqrstuvwxyz012345"
	hash := hashKey(key)

	// 驗證是 64 字元的 hex string
	if len(hash) != 64 {
		t.Errorf("hash length = %d, want 64", len(hash))
	}

	// 驗證一致性
	hash2 := hashKey(key)
	if hash != hash2 {
		t.Error("same key should produce same hash")
	}

	// 驗證與標準 SHA-256 一致
	h := sha256.Sum256([]byte(key))
	expected := hex.EncodeToString(h[:])
	if hash != expected {
		t.Errorf("hash = %s, want %s", hash, expected)
	}
}

func TestApiKeyModel_IsExpired(t *testing.T) {
	tests := []struct {
		name      string
		expiresAt *time.Time
		expected  bool
	}{
		{"nil 永不過期", nil, false},
		{"未來時間", timePtr(time.Now().Add(24 * time.Hour)), false},
		{"過去時間", timePtr(time.Now().Add(-24 * time.Hour)), true},
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
		{"active 且無過期時間", model.ApiKey{IsActive: true}, true},
		{"active 且未過期", model.ApiKey{IsActive: true, ExpiresAt: timePtr(time.Now().Add(time.Hour))}, true},
		{"inactive", model.ApiKey{IsActive: false}, false},
		{"active 但已過期", model.ApiKey{IsActive: true, ExpiresAt: timePtr(time.Now().Add(-time.Hour))}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.key.IsValid() != tt.expected {
				t.Errorf("IsValid() = %v, want %v", tt.key.IsValid(), tt.expected)
			}
		})
	}
}

func timePtr(t time.Time) *time.Time {
	return &t
}
