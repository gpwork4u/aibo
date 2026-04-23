package e2e

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-011: MCP Server 模式
//
// MCP Server 透過 stdio transport 運行，E2E 測試主要驗證
// MCP Server 所依賴的底層 API endpoint 是否正確運作。
// 實際的 MCP protocol 測試需要透過 mcp-go InProcess transport，
// 待 MCP Server 實作完成後補充。
// ============================================================

// setupF011Client 建立認證客戶端
func setupF011Client(t *testing.T) *APIClient {
	t.Helper()

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f011-"+t.Name())
	authedClient := client.WithKey(key)

	return authedClient
}

// --- S-011-01 底層 API: 搜尋知識（query tool 所依賴的 API） ---

func TestF011_S01_SearchAPIForMCPQuery(t *testing.T) {
	// MCP aibo_query tool 內部呼叫 POST /api/v1/search
	// 驗證搜尋 API 正常運作且回傳格式符合 MCP 需求

	authedClient := setupF011Client(t)

	// 建立測試資料
	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "MCP 搜尋測試 Golang error handling",
		"content": "Go 語言中使用 errors.Is 和 errors.As 來處理錯誤鏈",
		"tags":    []string{"golang", "error-handling"},
	})

	// 設定 summary（MCP query 結果需要 summary）
	_, _, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"summary": "Go 錯誤處理使用 errors.Is/As",
		"detail":  "詳細說明錯誤處理的最佳實踐",
		"action":  "在錯誤處理中優先使用 errors.Is 而非 == 比較",
	})
	require.NoError(t, err)

	// 搜尋
	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "golang error",
		"limit": 5,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")

	if len(results) > 0 {
		result := results[0].(map[string]interface{})
		// MCP query 需要的欄位
		assert.NotEmpty(t, result["entry_id"], "應包含 entry_id")
		assert.NotEmpty(t, result["title"], "應包含 title")
		_, hasSummary := result["summary"]
		assert.True(t, hasSummary, "應包含 summary 欄位")
	}
}

// --- S-011-02 底層 API: 搜尋無結果 ---

func TestF011_S02_SearchAPINoResults(t *testing.T) {
	// MCP aibo_query 搜尋無結果時，API 應回傳空陣列

	authedClient := setupF011Client(t)

	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "zzz_量子力學_不存在_zzz",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	results, ok := body["results"].([]interface{})
	require.True(t, ok)
	assert.Equal(t, 0, len(results), "無相關條目時應回傳空陣列")
}

// --- S-011-03 底層 API: 新增知識（propose tool 所依賴的 API） ---

func TestF011_S03_CreateEntryForMCPPropose(t *testing.T) {
	// MCP aibo_propose tool 內部呼叫 POST /api/v1/entries
	// 驗證建立 entry 後回傳 ID

	authedClient := setupF011Client(t)

	status, body, err := authedClient.Do("POST", "/api/v1/entries", map[string]interface{}{
		"content": "Go 1.23 新增了 range over func 語法，可以用自訂的迭代器",
		"tags":    []string{"golang", "go1.23"},
		"source":  "mcp-propose",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)

	id, ok := body["id"].(string)
	require.True(t, ok, "回應應包含 entry id")
	assert.NotEmpty(t, id, "entry id 不應為空")
}

// --- S-011-04 底層 API: confirm 確認知識 ---

func TestF011_S04_ConfirmEntryForMCP(t *testing.T) {
	// MCP aibo_confirm tool 內部呼叫 POST /api/v1/entries/:id/confirm

	authedClient := setupF011Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "MCP Confirm 測試",
		"content": "測試用內容",
	})

	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/confirm", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	confidence, ok := body["confidence"].(float64)
	require.True(t, ok, "回應應包含 confidence")
	assert.Greater(t, confidence, 0.5, "confirm 後 confidence 應大於 0.5")
}

// --- S-011-05 底層 API: flag 標記問題 ---

func TestF011_S05_FlagEntryForMCP(t *testing.T) {
	// MCP aibo_flag tool 內部呼叫 POST /api/v1/entries/:id/flag

	authedClient := setupF011Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "MCP Flag 測試",
		"content": "測試用內容",
	})

	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/flag", map[string]interface{}{
		"reason": "outdated",
		"note":   "Go 1.24 已改變此行為",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	confidence, ok := body["confidence"].(float64)
	require.True(t, ok, "回應應包含 confidence")
	assert.Less(t, confidence, 0.5, "flag 後 confidence 應小於 0.5")
}

// --- S-011-06 底層 API: 統計資訊（status tool 所依賴的 API） ---

func TestF011_S06_StatsAPIForMCPStatus(t *testing.T) {
	// MCP aibo_status tool 內部呼叫 GET /api/v1/stats

	authedClient := setupF011Client(t)

	// 建立一些測試資料
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "Stats 測試 1",
		"content": "內容 1",
	})
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "Stats 測試 2",
		"content": "內容 2",
	})

	status, body, err := authedClient.Do("GET", "/api/v1/stats", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "stats API 應回傳 200")

	// 驗證統計欄位
	totalEntries, ok := body["total_entries"].(float64)
	require.True(t, ok, "回應應包含 total_entries")
	assert.GreaterOrEqual(t, totalEntries, float64(2), "total_entries 應 >= 2")

	_, hasTotalCategories := body["total_categories"]
	assert.True(t, hasTotalCategories, "回應應包含 total_categories")

	_, hasEntriesByCategory := body["entries_by_category"]
	assert.True(t, hasEntriesByCategory, "回應應包含 entries_by_category")
}

// --- S-011-08 底層 API: API Key 無效 ---

func TestF011_S08_InvalidAPIKey(t *testing.T) {
	// MCP Server 使用無效 API Key 時，API 應回傳 401

	client := NewAPIClient()
	// 先建立一把 key 確保非 bootstrap 模式
	_ = BootstrapAPIKey(t, client, "f011-invalidkey")

	// 使用無效 key
	invalidClient := client.WithKey("aibo_invalid_key_12345")

	status, body, err := invalidClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "test",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status, "無效 API Key 應回傳 401")
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

func TestF011_S08_NoAPIKey(t *testing.T) {
	// MCP Server 未設定 API Key 時，API 應回傳 401

	client := NewAPIClient()
	_ = BootstrapAPIKey(t, client, "f011-nokey")

	noKeyClient := NewAPIClient()
	status, body, err := noKeyClient.Do("GET", "/api/v1/stats", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status, "無 API Key 應回傳 401")
	AssertErrorCode(t, body, "UNAUTHORIZED")
}
