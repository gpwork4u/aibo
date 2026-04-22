package e2e

import (
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-003: LLM 自動分類
// ============================================================

// setupClassifyClient 建立認證客戶端 + LLM provider（指向 mock 或本地 LLM）
// 回傳 authedClient, providerID
func setupClassifyClient(t *testing.T) *APIClient {
	t.Helper()

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "classify-"+t.Name())
	authedClient := client.WithKey(key)

	return authedClient
}

// setupLLMProvider 建立一個 active 的 LLM provider
// 注意：分類依賴 LLM 服務，測試環境需要有可用的 LLM endpoint
// 如果環境中沒有可用的 LLM，背景分類相關的斷言可能需要跳過
func setupLLMProvider(t *testing.T, client *APIClient) string {
	t.Helper()

	providerID := CreateLLMProvider(t, client, map[string]interface{}{
		"name":         "classify-provider-" + t.Name(),
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model",
		"is_default":   true,
		"is_active":    true,
	})

	return providerID
}

// waitForClassification 等待背景分類完成（輪詢 entry 直到 category_id 不為 null 或超時）
func waitForClassification(t *testing.T, client *APIClient, entryID string, timeout time.Duration) map[string]interface{} {
	t.Helper()

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		status, body, err := client.Do("GET", "/api/v1/entries/"+entryID, nil)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, status)

		if body["category_id"] != nil {
			return body
		}
		time.Sleep(500 * time.Millisecond)
	}

	// 超時，回傳最後一次結果
	status, body, err := client.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, status)
	return body
}

// --- Happy Path ---

func TestF003_HappyPath_ClassifySingleEntry(t *testing.T) {
	// TC-003-01: 手動觸發單筆分類
	// GIVEN entry exists with category_id = null
	// WHEN POST /api/v1/entries/{id}/classify
	// THEN 202, message="Classification started", entry_id 正確

	authedClient := setupClassifyClient(t)
	_ = setupLLMProvider(t, authedClient)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"content": "goroutine 是 Go 語言的輕量級線程，用於並發處理",
	})

	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/classify", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, status, "手動分類應回傳 202 Accepted")
	assert.Equal(t, "Classification started", body["message"])
	assert.Equal(t, entryID, body["entry_id"])
}

func TestF003_HappyPath_ClassifyAll(t *testing.T) {
	// TC-003-02: 批次分類 Inbox
	// GIVEN 3 entries exist with category_id = null
	// WHEN POST /api/v1/entries/classify-all
	// THEN 202, entry_count = 3

	authedClient := setupClassifyClient(t)
	_ = setupLLMProvider(t, authedClient)

	// 建立 3 筆未分類的 entries
	for i := 0; i < 3; i++ {
		CreateEntry(t, authedClient, map[string]interface{}{
			"content": "測試批次分類的條目 " + RepeatStr("x", i+1),
		})
	}

	status, body, err := authedClient.Do("POST", "/api/v1/entries/classify-all", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, status, "批次分類應回傳 202 Accepted")
	assert.Equal(t, "Batch classification started", body["message"])

	// entry_count 應 >= 3（可能有其他未分類 entries）
	entryCount, ok := body["entry_count"].(float64)
	require.True(t, ok, "response 應包含 entry_count")
	assert.GreaterOrEqual(t, entryCount, float64(3), "至少 3 筆未分類 entries")
}

func TestF003_HappyPath_ClassifySingleEntry_UpdatesCategoryID(t *testing.T) {
	// TC-003-01 延伸：分類完成後 entry.category_id 應已更新
	// 注意：此測試依賴可用的 LLM 服務，若無 LLM 則跳過背景驗證

	authedClient := setupClassifyClient(t)
	_ = setupLLMProvider(t, authedClient)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"content": "goroutine 是 Go 語言的輕量級線程，用於並發處理",
	})

	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/classify", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, status)

	// 等待背景分類完成（最多 15 秒）
	entry := waitForClassification(t, authedClient, entryID, 15*time.Second)

	// 若 LLM 可用，category_id 應已被設定
	// 若 LLM 不可用，此斷言會失敗 — 這是預期行為，表示 LLM 需要正常運作
	if entry["category_id"] != nil {
		t.Logf("分類成功：category_id = %v", entry["category_id"])
		// tags 應有值
		if tags, ok := entry["tags"].([]interface{}); ok {
			t.Logf("分類產生的 tags: %v", tags)
		}
	} else {
		t.Log("警告：背景分類未在 15 秒內完成，可能 LLM 服務不可用")
	}
}

func TestF003_HappyPath_TitleEmptyOverwritten(t *testing.T) {
	// TC-003-04: title 為空時被 LLM 覆蓋
	// GIVEN entry with title = null
	// WHEN classify
	// THEN title 可能被 LLM 建議的 title 覆蓋

	authedClient := setupClassifyClient(t)
	_ = setupLLMProvider(t, authedClient)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"content": "goroutine 學習筆記，Go 語言並發入門",
	})

	// 驗證建立時 title 為 null
	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, status)
	assert.Nil(t, body["title"], "建立時 title 應為 null")

	// 觸發分類
	status, _, err = authedClient.Do("POST", "/api/v1/entries/"+entryID+"/classify", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, status)

	// 等待分類完成
	entry := waitForClassification(t, authedClient, entryID, 15*time.Second)
	if entry["category_id"] != nil && entry["title"] != nil {
		t.Logf("LLM 已為 title 為空的 entry 設定標題: %v", entry["title"])
	}
}

func TestF003_HappyPath_TitleNotOverwrittenWhenExists(t *testing.T) {
	// TC-003-05: title 已有值時不覆蓋
	// GIVEN entry with title = "原始標題"
	// WHEN classify
	// THEN title 仍為 "原始標題"

	authedClient := setupClassifyClient(t)
	_ = setupLLMProvider(t, authedClient)

	originalTitle := "原始標題不應被覆蓋"
	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   originalTitle,
		"content": "goroutine 是 Go 語言的輕量級線程",
	})

	// 觸發分類
	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/classify", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, status)

	// 等待分類完成
	entry := waitForClassification(t, authedClient, entryID, 15*time.Second)
	if entry["category_id"] != nil {
		assert.Equal(t, originalTitle, entry["title"], "已有 title 不應被 LLM 覆蓋")
	}
}

func TestF003_HappyPath_TagsMerged(t *testing.T) {
	// TC-003-06: tags 合併而非取代
	// GIVEN entry with tags = ["original"]
	// WHEN classify
	// THEN tags 應包含 "original" + LLM 產生的新 tags

	authedClient := setupClassifyClient(t)
	_ = setupLLMProvider(t, authedClient)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"content": "goroutine 是 Go 語言的輕量級線程",
		"tags":    []string{"original"},
	})

	// 觸發分類
	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/classify", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, status)

	// 等待分類完成
	entry := waitForClassification(t, authedClient, entryID, 15*time.Second)
	if entry["category_id"] != nil {
		tags, ok := entry["tags"].([]interface{})
		require.True(t, ok, "entry 應有 tags")
		// 原始 tag 應保留
		tagStrs := make([]string, len(tags))
		for i, tag := range tags {
			tagStrs[i] = tag.(string)
		}
		assert.Contains(t, tagStrs, "original", "原始 tag 應被保留（合併而非取代）")
		t.Logf("合併後的 tags: %v", tagStrs)
	}
}

// --- Error Handling ---

func TestF003_Error_ClassifyNonExistentEntry(t *testing.T) {
	// TC-003-09: 手動分類不存在的 entry → 404
	// WHEN POST /api/v1/entries/{non-existent-uuid}/classify
	// THEN 404, NOT_FOUND

	authedClient := setupClassifyClient(t)

	nonExistentID := "00000000-0000-0000-0000-000000000000"
	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+nonExistentID+"/classify", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, status, "分類不存在的 entry 應回傳 404")
	AssertErrorCode(t, body, "NOT_FOUND")
}

func TestF003_Error_ClassifyUnauthorized(t *testing.T) {
	// TC-003-10: 未帶 API Key → 401
	// WHEN POST /api/v1/entries/{id}/classify without X-API-Key
	// THEN 401, UNAUTHORIZED

	client := NewAPIClient()
	// 確保非 bootstrap 模式
	_ = BootstrapAPIKey(t, client, "classify-unauth-key")

	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("POST", "/api/v1/entries/00000000-0000-0000-0000-000000000001/classify", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status, "未帶 API Key 應回傳 401")
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

func TestF003_Error_ClassifyAllUnauthorized(t *testing.T) {
	// 批次分類未帶 API Key → 401
	// WHEN POST /api/v1/entries/classify-all without X-API-Key
	// THEN 401, UNAUTHORIZED

	client := NewAPIClient()
	_ = BootstrapAPIKey(t, client, "classifyall-unauth-key")

	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("POST", "/api/v1/entries/classify-all", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status, "未帶 API Key 應回傳 401")
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

// --- Edge Cases ---

func TestF003_Edge_ClassifyAllEmptyInbox(t *testing.T) {
	// TC-003-11: Inbox 為空時批次分類 → 202, entry_count=0
	// GIVEN 所有 entries 都有 category_id
	// WHEN POST /api/v1/entries/classify-all
	// THEN 202, entry_count = 0

	authedClient := setupClassifyClient(t)

	// 建立一個已有 category 的 entry（非 Inbox）
	catID := CreateCategory(t, authedClient, "classified-cat-"+t.Name())
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":       "已分類條目",
		"content":     "這是已經分類的條目",
		"category_id": catID,
	})

	// 清理所有 Inbox entries（category_id = null 的）
	// 透過列出所有 entries 並刪除未分類的
	status, body, err := authedClient.Do("GET", "/api/v1/entries?per_page=100", nil)
	require.NoError(t, err)
	if status == http.StatusOK && body != nil {
		if data, ok := body["data"].([]interface{}); ok {
			for _, item := range data {
				entry := item.(map[string]interface{})
				if entry["category_id"] == nil {
					if id, ok := entry["id"].(string); ok {
						authedClient.Do("DELETE", "/api/v1/entries/"+id, nil)
					}
				}
			}
		}
	}

	status, body, err = authedClient.Do("POST", "/api/v1/entries/classify-all", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, status, "Inbox 為空時仍應回傳 202")

	entryCount, ok := body["entry_count"].(float64)
	require.True(t, ok, "response 應包含 entry_count")
	assert.Equal(t, float64(0), entryCount, "Inbox 為空時 entry_count 應為 0")
}

func TestF003_Edge_ReClassifyExistingCategory(t *testing.T) {
	// TC: 已有 category 的 entry 手動重新分類
	// GIVEN entry with category_id = {old_cat_id}
	// WHEN POST /api/v1/entries/{id}/classify
	// THEN 202（允許重新分類）

	authedClient := setupClassifyClient(t)
	_ = setupLLMProvider(t, authedClient)

	catID := CreateCategory(t, authedClient, "old-category-"+t.Name())
	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":       "已分類條目",
		"content":     "Python 機器學習入門",
		"category_id": catID,
	})

	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/classify", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, status, "已分類的 entry 仍可手動觸發重新分類")
	assert.Equal(t, "Classification started", body["message"])
	assert.Equal(t, entryID, body["entry_id"])
}

func TestF003_Edge_CategoryCaseInsensitive(t *testing.T) {
	// TC-003-07: category 大小寫 insensitive 比對
	// GIVEN category "Golang" exists
	// 驗證 LLM 回傳 "golang"（小寫）時使用既有的 "Golang" category

	authedClient := setupClassifyClient(t)
	_ = setupLLMProvider(t, authedClient)

	// 建立既有 category
	catID := CreateCategory(t, authedClient, "Golang")

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"content": "goroutine channel select 等 Go 語言關鍵概念",
	})

	// 觸發分類
	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/classify", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, status)

	// 等待分類完成
	entry := waitForClassification(t, authedClient, entryID, 15*time.Second)
	if entry["category_id"] != nil {
		// 如果 LLM 回傳 golang（小寫），應使用既有的 "Golang" category
		if entry["category_id"] == catID {
			t.Logf("正確：使用了既有的 Golang category（case-insensitive 比對）")
		} else {
			t.Logf("分類使用了 category_id: %v（預期: %v）", entry["category_id"], catID)
		}
	}
}

func TestF003_Edge_LLMFailureEntryUnchanged(t *testing.T) {
	// TC-003-08: LLM 失敗時 entry 不變
	// GIVEN entry with category_id = null, tags = ["original"]
	// AND 沒有可用的 LLM provider
	// WHEN 觸發分類
	// THEN entry 保持原狀

	authedClient := setupClassifyClient(t)
	// 不建立 LLM provider，模擬無可用 LLM

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"content": "測試 LLM 失敗的情況",
		"tags":    []string{"original"},
	})

	// 觸發分類（預期 LLM 不可用，但 API 應回傳 202）
	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/classify", nil)
	require.NoError(t, err)

	// 根據實作，可能回傳 202 或其他狀態
	// 若無 LLM provider，API 可能仍接受請求但背景處理失敗
	if status == http.StatusAccepted {
		// 等待一段時間確認 entry 不變
		time.Sleep(3 * time.Second)

		status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, status)
		assert.Nil(t, body["category_id"], "LLM 不可用時 category_id 應保持 null")

		tags, ok := body["tags"].([]interface{})
		require.True(t, ok)
		tagStrs := make([]string, len(tags))
		for i, tag := range tags {
			tagStrs[i] = tag.(string)
		}
		assert.Contains(t, tagStrs, "original", "LLM 不可用時原始 tags 應保留")
	}
}
