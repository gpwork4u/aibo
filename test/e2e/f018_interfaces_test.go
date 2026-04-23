package e2e

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-018: Service Interface 化 — 回歸測試
// ============================================================
//
// F-018 為內部重構（repository 依賴改為 interface），
// 無 API 變更。測試重點在於所有 CRUD API「行為不變」。
// ============================================================

// --- 回歸測試：Entries CRUD ---

func TestF018_Regression_Entries_Create(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-entry-create-"+t.Name())
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/entries", map[string]interface{}{
		"title":   "F-018 回歸測試條目",
		"content": "Service interface 化後 entry 建立應正常運作",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status, "POST /entries 應回傳 201")
	assert.NotEmpty(t, body["id"], "response 應包含 id")
}

func TestF018_Regression_Entries_Get(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-entry-get-"+t.Name())
	authedClient := client.WithKey(key)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "F-018 Get 測試",
		"content": "讀取測試",
	})

	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "GET /entries/:id 應回傳 200")
	assert.Equal(t, entryID, body["id"])
	assert.Equal(t, "F-018 Get 測試", body["title"])
}

func TestF018_Regression_Entries_Update(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-entry-update-"+t.Name())
	authedClient := client.WithKey(key)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "原始標題",
		"content": "原始內容",
	})

	status, body, err := authedClient.Do("PUT", "/api/v1/entries/"+entryID, map[string]interface{}{
		"title":   "更新後的標題",
		"content": "更新後的內容",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "PUT /entries/:id 應回傳 200")
	assert.Equal(t, "更新後的標題", body["title"])
}

func TestF018_Regression_Entries_Delete(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-entry-delete-"+t.Name())
	authedClient := client.WithKey(key)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"content": "即將被刪除的條目",
	})

	status, _, err := authedClient.Do("DELETE", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, status, "DELETE /entries/:id 應回傳 204")

	// 確認已刪除
	status, _, err = authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, status, "已刪除的 entry 應回傳 404")
}

func TestF018_Regression_Entries_List(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-entry-list-"+t.Name())
	authedClient := client.WithKey(key)

	// 建立幾筆 entries
	CreateEntry(t, authedClient, map[string]interface{}{"content": "列表測試 1"})
	CreateEntry(t, authedClient, map[string]interface{}{"content": "列表測試 2"})

	status, body, err := authedClient.Do("GET", "/api/v1/entries?per_page=10", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "GET /entries 應回傳 200")

	data := GetDataArray(t, body)
	assert.GreaterOrEqual(t, len(data), 2, "至少應有 2 筆 entries")
}

// --- 回歸測試：Categories CRUD ---

func TestF018_Regression_Categories_Create(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-cat-create-"+t.Name())
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/categories", map[string]interface{}{
		"name": "F018-回歸-分類",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status, "POST /categories 應回傳 201")
	assert.NotEmpty(t, body["id"])
}

func TestF018_Regression_Categories_Get(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-cat-get-"+t.Name())
	authedClient := client.WithKey(key)

	catID := CreateCategory(t, authedClient, "F018-Get-分類")

	status, body, err := authedClient.Do("GET", "/api/v1/categories/"+catID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "GET /categories/:id 應回傳 200")
	assert.Equal(t, catID, body["id"])
}

func TestF018_Regression_Categories_Update(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-cat-update-"+t.Name())
	authedClient := client.WithKey(key)

	catID := CreateCategory(t, authedClient, "F018-原始分類")

	status, body, err := authedClient.Do("PUT", "/api/v1/categories/"+catID, map[string]interface{}{
		"name": "F018-更新分類",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "PUT /categories/:id 應回傳 200")
	assert.Equal(t, "F018-更新分類", body["name"])
}

func TestF018_Regression_Categories_Delete(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-cat-delete-"+t.Name())
	authedClient := client.WithKey(key)

	catID := CreateCategory(t, authedClient, "F018-即將刪除")

	status, _, err := authedClient.Do("DELETE", "/api/v1/categories/"+catID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, status, "DELETE /categories/:id 應回傳 204")

	status, _, err = authedClient.Do("GET", "/api/v1/categories/"+catID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, status, "已刪除的 category 應回傳 404")
}

func TestF018_Regression_Categories_List(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-cat-list-"+t.Name())
	authedClient := client.WithKey(key)

	CreateCategory(t, authedClient, "F018-列表1")
	CreateCategory(t, authedClient, "F018-列表2")

	status, body, err := authedClient.Do("GET", "/api/v1/categories", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "GET /categories 應回傳 200")

	data := GetDataArray(t, body)
	assert.GreaterOrEqual(t, len(data), 2, "至少應有 2 個分類")
}

// --- 回歸測試：LLM Providers CRUD ---

func TestF018_Regression_LLMProviders_Create(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-llm-create-"+t.Name())
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/llm-providers", map[string]interface{}{
		"name":         "f018-provider",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model",
		"is_default":   false,
		"is_active":    true,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status, "POST /llm-providers 應回傳 201")
	assert.NotEmpty(t, body["id"])
}

func TestF018_Regression_LLMProviders_Get(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-llm-get-"+t.Name())
	authedClient := client.WithKey(key)

	providerID := CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "f018-get-provider",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model",
		"is_default":   false,
		"is_active":    true,
	})

	status, body, err := authedClient.Do("GET", "/api/v1/llm-providers/"+providerID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "GET /llm-providers/:id 應回傳 200")
	assert.Equal(t, providerID, body["id"])
}

func TestF018_Regression_LLMProviders_Update(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-llm-update-"+t.Name())
	authedClient := client.WithKey(key)

	providerID := CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "f018-original-provider",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model",
		"is_default":   false,
		"is_active":    true,
	})

	status, body, err := authedClient.Do("PUT", "/api/v1/llm-providers/"+providerID, map[string]interface{}{
		"name":         "f018-updated-provider",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "updated-model",
		"is_default":   false,
		"is_active":    true,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "PUT /llm-providers/:id 應回傳 200")
	assert.Equal(t, "f018-updated-provider", body["name"])
}

func TestF018_Regression_LLMProviders_Delete(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-llm-delete-"+t.Name())
	authedClient := client.WithKey(key)

	providerID := CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "f018-delete-provider",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model",
		"is_default":   false,
		"is_active":    true,
	})

	status, _, err := authedClient.Do("DELETE", "/api/v1/llm-providers/"+providerID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, status, "DELETE /llm-providers/:id 應回傳 204")

	status, _, err = authedClient.Do("GET", "/api/v1/llm-providers/"+providerID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, status, "已刪除的 provider 應回傳 404")
}

func TestF018_Regression_LLMProviders_List(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-llm-list-"+t.Name())
	authedClient := client.WithKey(key)

	CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "f018-list-provider-1",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "model-1",
		"is_default":   false,
		"is_active":    true,
	})

	status, body, err := authedClient.Do("GET", "/api/v1/llm-providers", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "GET /llm-providers 應回傳 200")

	data := GetDataArray(t, body)
	assert.GreaterOrEqual(t, len(data), 1, "至少應有 1 個 provider")
}

// --- 回歸測試：API Keys CRUD ---

func TestF018_Regression_APIKeys_Create(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-apikey-setup")
	authedClient := client.WithKey(key)

	id, newKey := CreateAPIKeyWithAuth(t, authedClient, "f018-new-key", nil)
	assert.NotEmpty(t, id, "新 API key 應有 id")
	assert.NotEmpty(t, newKey, "新 API key 應有 key 值")
}

func TestF018_Regression_APIKeys_List(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-apikey-list-"+t.Name())
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("GET", "/api/v1/auth/api-keys", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "GET /auth/api-keys 應回傳 200")
	require.NotNil(t, body)
}

func TestF018_Regression_APIKeys_Delete(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-apikey-delete-"+t.Name())
	authedClient := client.WithKey(key)

	id, _ := CreateAPIKeyWithAuth(t, authedClient, "f018-to-delete", nil)

	status, _, err := authedClient.Do("DELETE", "/api/v1/auth/api-keys/"+id, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, status, "DELETE /auth/api-keys/:id 應回傳 204")
}

// --- 回歸測試：分類和搜尋 ---

func TestF018_Regression_Classify(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-classify-"+t.Name())
	authedClient := client.WithKey(key)

	CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "f018-classify-provider",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model",
		"is_default":   true,
		"is_active":    true,
	})

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"content": "React Hooks 入門教學",
	})

	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/classify", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, status, "POST /entries/:id/classify 應回傳 202")
}

func TestF018_Regression_Search(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-search-"+t.Name())
	authedClient := client.WithKey(key)

	status, _, err := authedClient.Do("GET", "/api/v1/search?q=test", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "GET /search 應回傳 200")
}

// --- 回歸測試：Git Import ---

func TestF018_Regression_GitImport(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-git-"+t.Name())
	authedClient := client.WithKey(key)

	status, _, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/tmp/test-repo",
	})
	require.NoError(t, err)
	// 可能是 200（成功）或 400（路徑不存在），但 API 端點應存在
	assert.True(t, status == http.StatusOK || status == http.StatusBadRequest || status == http.StatusForbidden,
		"POST /import/git 應回傳 200/400/403，實際: %d", status)
}

// --- 回歸測試：Stats 和 System Info ---

func TestF018_Regression_Stats(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-stats-"+t.Name())
	authedClient := client.WithKey(key)

	status, _, err := authedClient.Do("GET", "/api/v1/stats", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "GET /stats 應回傳 200")
}

func TestF018_Regression_SystemInfo(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f018-sysinfo-"+t.Name())
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("GET", "/api/v1/system/info", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "GET /system/info 應回傳 200")
	require.NotNil(t, body)
}
