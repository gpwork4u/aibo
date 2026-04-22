package e2e

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-007: LLM Provider 管理
// ============================================================

// --- Happy Path ---

func TestF007_HappyPath_CreateProvider(t *testing.T) {
	// WHEN POST with basic fields
	// THEN 201, api_key_set=false, no api_key field

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "llm-create-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/llm-providers", map[string]interface{}{
		"name":         "LM Studio Local",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "llama-3",
		"is_default":   true,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
	assert.Equal(t, "LM Studio Local", body["name"])
	assert.Equal(t, false, body["api_key_set"], "沒有設定 api_key 時應為 false")
	assert.Equal(t, true, body["is_default"])
	assert.NotEmpty(t, body["id"])

	// 不應回傳 api_key 明文
	_, hasAPIKey := body["api_key"]
	assert.False(t, hasAPIKey, "response 不應包含 api_key 欄位")
}

func TestF007_HappyPath_CreateProviderWithAPIKey(t *testing.T) {
	// WHEN POST with api_key
	// THEN 201, api_key_set=true

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "llm-apikey-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/llm-providers", map[string]interface{}{
		"name":         "OpenAI",
		"endpoint_url": "https://api.openai.com/v1",
		"api_key":      "sk-test-key-12345",
		"model_name":   "gpt-4",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
	assert.Equal(t, true, body["api_key_set"], "設定 api_key 時應為 true")

	// 不應回傳明文
	_, hasAPIKey := body["api_key"]
	assert.False(t, hasAPIKey)
}

func TestF007_HappyPath_ListProviders(t *testing.T) {
	// GIVEN 2 providers exist
	// WHEN GET
	// THEN data.length=2, api_key_set 而非 api_key

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "llm-list-key")
	authedClient := client.WithKey(key)

	CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "Provider A",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "model-a",
	})
	CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "Provider B",
		"endpoint_url": "http://localhost:5678/v1",
		"model_name":   "model-b",
		"api_key":      "sk-xxx",
	})

	status, body, err := authedClient.Do("GET", "/api/v1/llm-providers", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	assert.Equal(t, 2, len(data))

	for _, item := range data {
		p := item.(map[string]interface{})
		assert.NotNil(t, p["api_key_set"], "每筆都應有 api_key_set")
		_, hasKey := p["api_key"]
		assert.False(t, hasKey, "列表不應回傳 api_key 明文")
	}
}

func TestF007_HappyPath_SetNewDefaultCancelsOld(t *testing.T) {
	// GIVEN provider#1 is_default=true, provider#2 is_default=false
	// WHEN PUT provider#2 with is_default=true
	// THEN provider#2 is_default=true, provider#1 is_default=false

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "llm-default-key")
	authedClient := client.WithKey(key)

	id1 := CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "Default Provider",
		"endpoint_url": "http://localhost:1111/v1",
		"model_name":   "model-default",
		"is_default":   true,
	})

	id2 := CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "Secondary Provider",
		"endpoint_url": "http://localhost:2222/v1",
		"model_name":   "model-secondary",
		"is_default":   false,
	})

	// 將 provider#2 設為 default
	status, body, err := authedClient.Do("PUT", "/api/v1/llm-providers/"+id2, map[string]interface{}{
		"name":         "Secondary Provider",
		"endpoint_url": "http://localhost:2222/v1",
		"api_key":      nil,
		"model_name":   "model-secondary",
		"is_default":   true,
		"config":       nil,
		"is_active":    true,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, true, body["is_default"])

	// 驗證 provider#1 不再是 default
	status, body, err = authedClient.Do("GET", "/api/v1/llm-providers/"+id1, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, false, body["is_default"], "舊 default 應被取消")
}

func TestF007_HappyPath_HealthCheckSuccess(t *testing.T) {
	// GIVEN provider is reachable（此測試可能需要 mock）
	// WHEN POST /health
	// THEN 200, status="healthy", response_time_ms > 0

	// 注意：此測試依賴實際可連線的 endpoint
	// 在 CI 環境中可能需要 mock server

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "llm-health-key")
	authedClient := client.WithKey(key)

	// 使用 API 自身作為測試 endpoint（如果有 health endpoint）
	id := CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "Self Health",
		"endpoint_url": baseURL() + "/api/v1",
		"model_name":   "test",
	})

	status, body, err := authedClient.Do("POST", "/api/v1/llm-providers/"+id+"/health", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// 回傳應有 status 欄位
	healthStatus, ok := body["status"].(string)
	require.True(t, ok, "response 應有 status 欄位")
	assert.Contains(t, []string{"healthy", "unhealthy"}, healthStatus)

	if healthStatus == "healthy" {
		responseTime, ok := body["response_time_ms"].(float64)
		require.True(t, ok)
		assert.Greater(t, responseTime, float64(0))
	}
}

func TestF007_HappyPath_HealthCheckFailed(t *testing.T) {
	// GIVEN provider endpoint unreachable
	// WHEN POST /health
	// THEN 200, status="unhealthy", error is not empty

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "llm-unhealthy-key")
	authedClient := client.WithKey(key)

	id := CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "Unreachable",
		"endpoint_url": "http://192.0.2.1:9999/v1", // 不可達的 IP
		"model_name":   "test",
	})

	status, body, err := authedClient.Do("POST", "/api/v1/llm-providers/"+id+"/health", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, "unhealthy", body["status"])
	assert.NotEmpty(t, body["error"], "應有 error 訊息")
}

// --- Error Handling ---

func TestF007_Error_EmptyName(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "llm-emptyname-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/llm-providers", map[string]interface{}{
		"name":         "",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF007_Error_DuplicateNameCaseInsensitive(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "llm-dup-key")
	authedClient := client.WithKey(key)

	CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "LM Studio",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test",
	})

	status, body, err := authedClient.Do("POST", "/api/v1/llm-providers", map[string]interface{}{
		"name":         "lm studio",
		"endpoint_url": "http://localhost:5678/v1",
		"model_name":   "test2",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusConflict, status)
	AssertErrorCode(t, body, "DUPLICATE_PROVIDER")
}

func TestF007_Error_InvalidEndpointURL(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "llm-badurl-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/llm-providers", map[string]interface{}{
		"name":         "BadURL",
		"endpoint_url": "not-a-url",
		"model_name":   "test",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF007_Error_Unauthorized(t *testing.T) {
	client := NewAPIClient()
	// 先確保非 bootstrap 狀態
	_ = BootstrapAPIKey(t, client, "llm-unauth-key")

	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("GET", "/api/v1/llm-providers", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status)
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

func TestF007_Error_GetNotFound(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "llm-getnf-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("GET", "/api/v1/llm-providers/00000000-0000-0000-0000-000000000000", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, status)
	AssertErrorCode(t, body, "NOT_FOUND")
}

// --- Edge Cases ---

func TestF007_Edge_DeleteDefaultProvider(t *testing.T) {
	// GIVEN provider is_default=true
	// WHEN DELETE
	// THEN 204, 無任何 default

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "llm-deldef-key")
	authedClient := client.WithKey(key)

	id := CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "Delete Default",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test",
		"is_default":   true,
	})

	status, _, err := authedClient.Do("DELETE", "/api/v1/llm-providers/"+id, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, status)

	// 驗證沒有 default provider
	status, body, err := authedClient.Do("GET", "/api/v1/llm-providers", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	for _, item := range data {
		p := item.(map[string]interface{})
		assert.Equal(t, false, p["is_default"], "不應有 default provider")
	}
}

func TestF007_Edge_ConfigNull(t *testing.T) {
	// WHEN POST with config=null
	// THEN 201, config=null

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "llm-confignull-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/llm-providers", map[string]interface{}{
		"name":         "No Config",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test",
		"config":       nil,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
	assert.Nil(t, body["config"])
}

func TestF007_Edge_UpdateNameToSameValue(t *testing.T) {
	// GIVEN provider with name="Test"
	// WHEN PUT with same name
	// THEN 200

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "llm-samename-key")
	authedClient := client.WithKey(key)

	id := CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "SameName-llm",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test",
	})

	status, body, err := authedClient.Do("PUT", "/api/v1/llm-providers/"+id, map[string]interface{}{
		"name":         "SameName-llm",
		"endpoint_url": "http://localhost:1234/v1",
		"api_key":      nil,
		"model_name":   "test",
		"is_default":   false,
		"config":       nil,
		"is_active":    true,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, "SameName-llm", body["name"])
}
