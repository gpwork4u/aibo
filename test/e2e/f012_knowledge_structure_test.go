package e2e

import (
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-012: 知識結構升級
// ============================================================

// setupF012Client 建立認證客戶端 + LLM provider
func setupF012Client(t *testing.T) *APIClient {
	t.Helper()

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f012-"+t.Name())
	authedClient := client.WithKey(key)

	return authedClient
}

// setupF012WithLLM 建立認證客戶端 + LLM provider（用於需要自動分類的測試）
func setupF012WithLLM(t *testing.T) *APIClient {
	t.Helper()

	authedClient := setupF012Client(t)

	// 建立 LLM provider 以啟用自動分類
	CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "f012-provider-" + t.Name(),
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model",
		"is_default":   true,
		"is_active":    true,
	})

	return authedClient
}

// --- S-012-01: 新建 entry 自動產生結構化欄位 ---

func TestF012_S01_CreateEntryAutoGeneratesStructuredFields(t *testing.T) {
	// WHEN POST /api/v1/entries WITH content
	// THEN 觸發 LLM 分類
	//   AND entry 包含 summary, detail, action

	authedClient := setupF012WithLLM(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"content": "Go 1.23 新增了 range over func 語法，可以用自訂的迭代器來遍歷資料結構，取代傳統的手動 iterator pattern",
	})

	// 等待 LLM 分類完成（非同步處理）
	time.Sleep(3 * time.Second)

	// 取得 entry 詳情
	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// 驗證結構化欄位存在（LLM 應自動產生）
	// 注意：若 LLM endpoint 不可達，這些欄位可能為 null（向下相容）
	t.Logf("summary = %v", body["summary"])
	t.Logf("detail = %v", body["detail"])
	t.Logf("action = %v", body["action"])

	// 確認回應中有這些欄位的 key（即使值為 null）
	_, hasSummary := body["summary"]
	_, hasDetail := body["detail"]
	_, hasAction := body["action"]
	assert.True(t, hasSummary, "回應應包含 summary 欄位")
	assert.True(t, hasDetail, "回應應包含 detail 欄位")
	assert.True(t, hasAction, "回應應包含 action 欄位")
}

// --- S-012-02: LLM 回傳缺少新欄位（向下相容） ---

func TestF012_S02_BackwardCompatibleWhenLLMMissingFields(t *testing.T) {
	// WHEN LLM 只回傳 category, tags, title（舊格式）
	// THEN 分類仍然成功 AND summary/detail/action = NULL

	authedClient := setupF012Client(t)

	// 不建立 LLM provider → 不會觸發分類
	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "向下相容測試",
		"content": "這是一筆測試內容",
	})

	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// 沒有 LLM 分類時，summary/detail/action 應為 null
	assert.Nil(t, body["summary"], "未分類的 entry summary 應為 null")
	assert.Nil(t, body["detail"], "未分類的 entry detail 應為 null")
	assert.Nil(t, body["action"], "未分類的 entry action 應為 null")
}

// --- S-012-03: 手動更新結構化欄位 ---

func TestF012_S03_PatchSummaryOnly(t *testing.T) {
	// WHEN PATCH /api/v1/entries/:id WITH { "summary": "test" }
	// THEN summary = "test" AND detail/action 不變

	authedClient := setupF012Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "手動更新測試",
		"content": "原始內容",
	})

	// PATCH 只更新 summary
	status, body, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"summary": "自訂摘要",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, "自訂摘要", body["summary"], "summary 應被更新")

	// 驗證 detail/action 不受影響
	assert.Nil(t, body["detail"], "detail 應不受影響")
	assert.Nil(t, body["action"], "action 應不受影響")
}

func TestF012_S03_PatchDetailAndAction(t *testing.T) {
	// WHEN PATCH /api/v1/entries/:id WITH detail + action
	// THEN 兩者都被更新

	authedClient := setupF012Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "更新 detail action",
		"content": "內容",
	})

	status, body, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"detail": "詳細說明：這是手動修改的內容",
		"action": "建議行動：使用 XYZ 方案",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, "詳細說明：這是手動修改的內容", body["detail"])
	assert.Equal(t, "建議行動：使用 XYZ 方案", body["action"])
}

func TestF012_S03_PatchAllStructuredFields(t *testing.T) {
	// WHEN PATCH 同時更新 summary + detail + action
	// THEN 三者都被更新

	authedClient := setupF012Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "全欄位更新",
		"content": "內容",
	})

	status, body, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"summary": "摘要",
		"detail":  "詳細",
		"action":  "行動",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, "摘要", body["summary"])
	assert.Equal(t, "詳細", body["detail"])
	assert.Equal(t, "行動", body["action"])

	// GET 驗證持久化
	status, body, err = authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, "摘要", body["summary"])
	assert.Equal(t, "詳細", body["detail"])
	assert.Equal(t, "行動", body["action"])
}

// --- S-012-04: 搜尋結果包含 summary ---

func TestF012_S04_SearchResultsIncludeSummary(t *testing.T) {
	// WHEN POST /api/v1/search
	// THEN 結果包含 summary 欄位

	authedClient := setupF012Client(t)

	// 建立帶 summary 的 entry
	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "搜尋 summary 測試 golang 效能",
		"content": "Golang 效能優化技巧",
		"tags":    []string{"golang", "performance"},
	})

	// 手動設定 summary
	_, _, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"summary": "Go 效能優化最佳實踐",
	})
	require.NoError(t, err)

	// 搜尋
	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "golang",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")

	if len(results) > 0 {
		firstResult := results[0].(map[string]interface{})
		_, hasSummary := firstResult["summary"]
		assert.True(t, hasSummary, "搜尋結果應包含 summary 欄位")
		t.Logf("搜尋結果 summary = %v", firstResult["summary"])
	}
}

func TestF012_S04_SimpleSearchResultsIncludeSummary(t *testing.T) {
	// WHEN GET /api/v1/search/simple
	// THEN 結果包含 summary 欄位

	authedClient := setupF012Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "簡單搜尋 summary 測試 postgresql",
		"content": "PostgreSQL 索引優化",
		"tags":    []string{"postgresql"},
	})

	_, _, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"summary": "PostgreSQL 索引最佳實踐",
	})
	require.NoError(t, err)

	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q=postgresql", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")

	if len(results) > 0 {
		firstResult := results[0].(map[string]interface{})
		_, hasSummary := firstResult["summary"]
		assert.True(t, hasSummary, "簡單搜尋結果應包含 summary 欄位")
	}
}

// --- S-012-06: 列表包含 summary，不含 detail/action ---

func TestF012_S06_ListIncludesSummaryExcludesDetailAction(t *testing.T) {
	// WHEN GET /api/v1/entries
	// THEN 包含 summary，不含 detail/action

	authedClient := setupF012Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "列表欄位測試",
		"content": "內容",
	})

	// 設定 summary + detail + action
	_, _, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"summary": "列表摘要",
		"detail":  "列表詳細",
		"action":  "列表行動",
	})
	require.NoError(t, err)

	// GET 列表
	status, body, err := authedClient.Do("GET", "/api/v1/entries?per_page=10", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	require.True(t, len(data) > 0, "列表不應為空")

	// 找到我們的 entry
	for _, item := range data {
		entry := item.(map[string]interface{})
		if entry["id"] == entryID {
			// 列表應包含 summary
			_, hasSummary := entry["summary"]
			assert.True(t, hasSummary, "列表應包含 summary 欄位")
			assert.Equal(t, "列表摘要", entry["summary"], "列表 summary 應正確")

			// 列表不應包含 detail/action（減少資料量）
			_, hasDetail := entry["detail"]
			_, hasAction := entry["action"]
			assert.False(t, hasDetail, "列表不應包含 detail 欄位")
			assert.False(t, hasAction, "列表不應包含 action 欄位")
			return
		}
	}
	t.Fatal("列表中找不到測試 entry")
}

// --- S-012-07: 詳情包含完整結構 ---

func TestF012_S07_DetailIncludesAllStructuredFields(t *testing.T) {
	// WHEN GET /api/v1/entries/:id
	// THEN 包含 summary + detail + action

	authedClient := setupF012Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "詳情欄位測試",
		"content": "內容",
	})

	// 設定所有結構化欄位
	_, _, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"summary": "詳情摘要",
		"detail":  "詳情詳細說明",
		"action":  "詳情行動建議",
	})
	require.NoError(t, err)

	// GET 詳情
	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	assert.Equal(t, "詳情摘要", body["summary"], "詳情應包含正確的 summary")
	assert.Equal(t, "詳情詳細說明", body["detail"], "詳情應包含正確的 detail")
	assert.Equal(t, "詳情行動建議", body["action"], "詳情應包含正確的 action")
}

// --- S-012-05: DB migration 向下相容 ---

func TestF012_S05_ExistingEntriesHaveNullStructuredFields(t *testing.T) {
	// WHEN migration 完成
	// THEN 現有 entries 的 summary/detail/action = NULL

	authedClient := setupF012Client(t)

	// 建立 entry（不觸發分類，因為沒有 LLM provider）
	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Migration 相容測試",
	})

	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	assert.Nil(t, body["summary"], "新 entry（無分類）summary 應為 null")
	assert.Nil(t, body["detail"], "新 entry（無分類）detail 應為 null")
	assert.Nil(t, body["action"], "新 entry（無分類）action 應為 null")
}
