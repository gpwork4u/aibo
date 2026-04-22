package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

// ============================================================
// 環境變數 & 常數
// ============================================================

const defaultBaseURL = "http://localhost:8080"

func baseURL() string {
	if v := os.Getenv("API_BASE_URL"); v != "" {
		return strings.TrimRight(v, "/")
	}
	return defaultBaseURL
}

// ============================================================
// HTTP Client Helper
// ============================================================

type APIClient struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

func NewAPIClient() *APIClient {
	return &APIClient{
		BaseURL: baseURL(),
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *APIClient) WithKey(key string) *APIClient {
	clone := *c
	clone.APIKey = key
	return &clone
}

// Do 發送 HTTP 請求並回傳 response body（已讀取）+ status code
func (c *APIClient) Do(method, path string, body interface{}) (int, map[string]interface{}, error) {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return 0, nil, fmt.Errorf("marshal body: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, reqBody)
	if err != nil {
		return 0, nil, fmt.Errorf("new request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("X-API-Key", c.APIKey)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	// 204 No Content — 不解析 body
	if resp.StatusCode == http.StatusNoContent {
		return resp.StatusCode, nil, nil
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, nil, fmt.Errorf("read body: %w", err)
	}

	if len(respBody) == 0 {
		return resp.StatusCode, nil, nil
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return resp.StatusCode, nil, fmt.Errorf("unmarshal body: %w (raw: %s)", err, string(respBody))
	}

	return resp.StatusCode, result, nil
}

// DoRaw 回傳原始 bytes（用於需要陣列等非 map 的情況）
func (c *APIClient) DoRaw(method, path string, body interface{}) (int, []byte, error) {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return 0, nil, fmt.Errorf("marshal body: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, reqBody)
	if err != nil {
		return 0, nil, fmt.Errorf("new request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("X-API-Key", c.APIKey)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, nil, fmt.Errorf("read body: %w", err)
	}

	return resp.StatusCode, respBody, nil
}

// ============================================================
// API Key Bootstrap Helper
// ============================================================

// BootstrapAPIKey 建立第一把 API Key（bootstrap 模式，不需認證）
// 回傳完整的 key 明文
func BootstrapAPIKey(t *testing.T, client *APIClient, name string) string {
	t.Helper()

	status, body, err := client.Do("POST", "/api/v1/auth/api-keys", map[string]interface{}{
		"name": name,
	})
	require.NoError(t, err)
	require.Equal(t, http.StatusCreated, status, "bootstrap API key should return 201")
	require.NotNil(t, body)

	key, ok := body["key"].(string)
	require.True(t, ok, "response should contain key string")
	require.True(t, strings.HasPrefix(key, "aibo_"), "key should start with aibo_")

	return key
}

// CreateAPIKeyWithAuth 使用已有的 API Key 建立新的 key
func CreateAPIKeyWithAuth(t *testing.T, client *APIClient, name string, expiresAt *string) (string, string) {
	t.Helper()

	payload := map[string]interface{}{
		"name": name,
	}
	if expiresAt != nil {
		payload["expires_at"] = *expiresAt
	}

	status, body, err := client.Do("POST", "/api/v1/auth/api-keys", payload)
	require.NoError(t, err)
	require.Equal(t, http.StatusCreated, status, "create API key should return 201")
	require.NotNil(t, body)

	id, _ := body["id"].(string)
	key, _ := body["key"].(string)
	return id, key
}

// ============================================================
// Category Helper
// ============================================================

// CreateCategory 建立分類，回傳 id
func CreateCategory(t *testing.T, client *APIClient, name string) string {
	t.Helper()

	status, body, err := client.Do("POST", "/api/v1/categories", map[string]interface{}{
		"name": name,
	})
	require.NoError(t, err)
	require.Equal(t, http.StatusCreated, status, "create category should return 201")

	id, ok := body["id"].(string)
	require.True(t, ok, "response should contain id")
	return id
}

// ============================================================
// Entry Helper
// ============================================================

// CreateEntry 建立知識條目，回傳 id
func CreateEntry(t *testing.T, client *APIClient, payload map[string]interface{}) string {
	t.Helper()

	status, body, err := client.Do("POST", "/api/v1/entries", payload)
	require.NoError(t, err)
	require.Equal(t, http.StatusCreated, status, "create entry should return 201")

	id, ok := body["id"].(string)
	require.True(t, ok, "response should contain id")
	return id
}

// ============================================================
// LLM Provider Helper
// ============================================================

// CreateLLMProvider 建立 LLM Provider，回傳 id
func CreateLLMProvider(t *testing.T, client *APIClient, payload map[string]interface{}) string {
	t.Helper()

	status, body, err := client.Do("POST", "/api/v1/llm-providers", payload)
	require.NoError(t, err)
	require.Equal(t, http.StatusCreated, status, "create LLM provider should return 201")

	id, ok := body["id"].(string)
	require.True(t, ok, "response should contain id")
	return id
}

// ============================================================
// DB Cleanup（測試結束時清理資料）
// ============================================================

// CleanupAll 清除所有測試資料（透過 API 刪除）
// 注意：需要 API 提供 cleanup endpoint 或直接連 DB。
// 目前先透過 API 逐筆刪除，未來可替換為直接 DB truncate。
func CleanupAll(t *testing.T, client *APIClient) {
	t.Helper()

	// 刪除所有 entries
	status, body, _ := client.Do("GET", "/api/v1/entries?per_page=100", nil)
	if status == http.StatusOK && body != nil {
		if data, ok := body["data"].([]interface{}); ok {
			for _, item := range data {
				if entry, ok := item.(map[string]interface{}); ok {
					if id, ok := entry["id"].(string); ok {
						client.Do("DELETE", "/api/v1/entries/"+id, nil)
					}
				}
			}
		}
	}

	// 刪除所有 categories
	status, body, _ = client.Do("GET", "/api/v1/categories", nil)
	if status == http.StatusOK && body != nil {
		if data, ok := body["data"].([]interface{}); ok {
			for _, item := range data {
				if cat, ok := item.(map[string]interface{}); ok {
					if id, ok := cat["id"].(string); ok {
						client.Do("DELETE", "/api/v1/categories/"+id, nil)
					}
				}
			}
		}
	}

	// 刪除所有 LLM providers
	status, body, _ = client.Do("GET", "/api/v1/llm-providers", nil)
	if status == http.StatusOK && body != nil {
		if data, ok := body["data"].([]interface{}); ok {
			for _, item := range data {
				if p, ok := item.(map[string]interface{}); ok {
					if id, ok := p["id"].(string); ok {
						client.Do("DELETE", "/api/v1/llm-providers/"+id, nil)
					}
				}
			}
		}
	}
}

// ============================================================
// Assertion Helper
// ============================================================

// AssertErrorCode 驗證 error response 的 code 欄位
func AssertErrorCode(t *testing.T, body map[string]interface{}, expectedCode string) {
	t.Helper()
	code, ok := body["code"].(string)
	require.True(t, ok, "response should contain code field")
	require.Equal(t, expectedCode, code)
}

// GetDataArray 從 response body 取得 data 陣列
func GetDataArray(t *testing.T, body map[string]interface{}) []interface{} {
	t.Helper()
	data, ok := body["data"].([]interface{})
	require.True(t, ok, "response should contain data array")
	return data
}

// GetPagination 從 response body 取得 pagination 物件
func GetPagination(t *testing.T, body map[string]interface{}) map[string]interface{} {
	t.Helper()
	pagination, ok := body["pagination"].(map[string]interface{})
	require.True(t, ok, "response should contain pagination object")
	return pagination
}

// StringPtr 回傳 string pointer（方便傳遞 optional string）
func StringPtr(s string) *string {
	return &s
}

// RepeatStr 重複字串 n 次
func RepeatStr(s string, n int) string {
	return strings.Repeat(s, n)
}
