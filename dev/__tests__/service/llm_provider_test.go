package service_test

import (
	"encoding/json"
	"testing"

	"github.com/gpwork4u/aibo/model"
)

func TestLlmProvider_ApiKeySet(t *testing.T) {
	tests := []struct {
		name     string
		apiKey   *string
		expected bool
	}{
		{
			name:     "nil api_key",
			apiKey:   nil,
			expected: false,
		},
		{
			name:     "empty api_key",
			apiKey:   strPtr(""),
			expected: false,
		},
		{
			name:     "non-empty api_key",
			apiKey:   strPtr("encrypted_value"),
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := &model.LlmProvider{ApiKey: tt.apiKey}
			if p.ApiKeySet() != tt.expected {
				t.Errorf("ApiKeySet() = %v, want %v", p.ApiKeySet(), tt.expected)
			}
		})
	}
}

func TestLlmProviderConfig_JSON(t *testing.T) {
	// 測試 config JSONB 的序列化/反序列化
	cfg := model.LlmProviderConfig{
		Temperature:    float64Ptr(0.7),
		MaxTokens:      intPtr(1000),
		TimeoutSeconds: intPtr(30),
	}

	data, err := json.Marshal(cfg)
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}

	var decoded model.LlmProviderConfig
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Unmarshal() error = %v", err)
	}

	if decoded.Temperature == nil || *decoded.Temperature != 0.7 {
		t.Errorf("Temperature = %v, want 0.7", decoded.Temperature)
	}
	if decoded.MaxTokens == nil || *decoded.MaxTokens != 1000 {
		t.Errorf("MaxTokens = %v, want 1000", decoded.MaxTokens)
	}
	if decoded.TimeoutSeconds == nil || *decoded.TimeoutSeconds != 30 {
		t.Errorf("TimeoutSeconds = %v, want 30", decoded.TimeoutSeconds)
	}
}

func TestLlmProviderConfig_PartialJSON(t *testing.T) {
	// 只設定部分欄位
	cfg := model.LlmProviderConfig{
		Temperature: float64Ptr(0.5),
	}

	data, err := json.Marshal(cfg)
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}

	// 應該只包含 temperature
	var m map[string]interface{}
	json.Unmarshal(data, &m)

	if _, ok := m["temperature"]; !ok {
		t.Error("should contain temperature")
	}
	if _, ok := m["max_tokens"]; ok {
		t.Error("should not contain max_tokens (omitempty)")
	}
	if _, ok := m["timeout_seconds"]; ok {
		t.Error("should not contain timeout_seconds (omitempty)")
	}
}

func TestLlmProviderConfig_NullJSON(t *testing.T) {
	// 完全空的 config
	cfg := model.LlmProviderConfig{}

	data, err := json.Marshal(cfg)
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}

	// 所有欄位都是 omitempty，應該是空 object
	expected := "{}"
	if string(data) != expected {
		t.Errorf("Marshal() = %s, want %s", string(data), expected)
	}
}

func strPtr(s string) *string {
	return &s
}

func float64Ptr(f float64) *float64 {
	return &f
}

func intPtr(i int) *int {
	return &i
}
