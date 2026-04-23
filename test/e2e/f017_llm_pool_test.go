package e2e

import (
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-017: LLM Client 連線池 — 回歸測試
// ============================================================
//
// F-017 為內部重構（client 快取 + per-provider rate limiter），
// 無 API 變更。測試重點在於「行為不變」和「效能不退化」。
// ============================================================

// --- 回歸測試：分類功能 ---

func TestF017_Regression_ClassifyStillWorks(t *testing.T) {
	// 回歸：POST /api/v1/entries/{id}/classify 在連線池重構後仍正常運作
	// GIVEN entry exists AND LLM provider is configured
	// WHEN POST /api/v1/entries/{id}/classify
	// THEN 202 Accepted

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f017-classify-"+t.Name())
	authedClient := client.WithKey(key)

	// 建立 LLM provider
	CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "f017-pool-provider",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model",
		"is_default":   true,
		"is_active":    true,
	})

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"content": "Kubernetes Pod 重啟策略和健康檢查機制",
	})

	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/classify", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, status, "分類 API 應回傳 202 Accepted")
	assert.Equal(t, "Classification started", body["message"])
	assert.Equal(t, entryID, body["entry_id"])
}

// --- 回歸測試：搜尋功能 ---

func TestF017_Regression_SearchStillWorks(t *testing.T) {
	// 回歸：GET /api/v1/search?q=xxx 在連線池重構後仍正常運作
	// GIVEN entries exist AND LLM provider is configured
	// WHEN GET /api/v1/search?q=kubernetes
	// THEN 200, response 包含 data 陣列

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f017-search-"+t.Name())
	authedClient := client.WithKey(key)

	// 建立 LLM provider（搜尋同義詞展開需要 LLM）
	CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "f017-search-provider",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model",
		"is_default":   true,
		"is_active":    true,
	})

	// 建立測試 entry
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "Kubernetes 入門",
		"content": "Kubernetes 是容器編排平台",
	})

	status, _, err := authedClient.Do("GET", "/api/v1/search?q=kubernetes", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "搜尋 API 應回傳 200")
}

// --- 連續呼叫效能不退化 ---

func TestF017_Performance_ConsecutiveClassifyCalls(t *testing.T) {
	// 連續多次分類呼叫，驗證效能不退化（連線池應重用 client）
	// GIVEN LLM provider is configured
	// WHEN 連續建立 3 筆 entry 並觸發分類
	// THEN 每次回傳 202，且總耗時不超過合理範圍

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f017-perf-"+t.Name())
	authedClient := client.WithKey(key)

	CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "f017-perf-provider",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model",
		"is_default":   true,
		"is_active":    true,
	})

	contents := []string{
		"Docker 容器化部署最佳實踐",
		"PostgreSQL 索引優化策略",
		"Redis 快取穿透防護方案",
	}

	start := time.Now()

	for i, content := range contents {
		entryID := CreateEntry(t, authedClient, map[string]interface{}{
			"content": content,
		})

		status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/classify", nil)
		require.NoError(t, err)
		assert.Equal(t, http.StatusAccepted, status,
			"第 %d 次分類呼叫應回傳 202", i+1)
		assert.Equal(t, entryID, body["entry_id"])
	}

	elapsed := time.Since(start)
	// 3 次 API 呼叫（建立 + 分類 = 6 次 HTTP request）應在 30 秒內完成
	assert.Less(t, elapsed, 30*time.Second,
		"連續 3 次分類呼叫總耗時應在 30 秒內，實際: %v", elapsed)
	t.Logf("連續 3 次分類呼叫總耗時: %v", elapsed)
}

// --- Provider 更新後 client 重建 ---

func TestF017_ClientCache_InvalidatedOnProviderUpdate(t *testing.T) {
	// WHEN provider 的 endpoint_url 被更新（PUT /api/v1/llm-providers/:id）
	// THEN 下次 LLM 呼叫使用新的設定（舊 client 被丟棄）
	// 驗證：更新 provider 後分類仍正常運作

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f017-update-"+t.Name())
	authedClient := client.WithKey(key)

	providerID := CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "f017-update-provider",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model",
		"is_default":   true,
		"is_active":    true,
	})

	// 第一次分類（建立 client 快取）
	entryID1 := CreateEntry(t, authedClient, map[string]interface{}{
		"content": "第一次分類測試：建立 client 快取",
	})
	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryID1+"/classify", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, status)

	// 更新 provider（應使快取失效）
	status, _, err = authedClient.Do("PUT", "/api/v1/llm-providers/"+providerID, map[string]interface{}{
		"name":         "f017-update-provider-v2",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model-v2",
		"is_default":   true,
		"is_active":    true,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "更新 provider 應回傳 200")

	// 第二次分類（應使用新 client）
	entryID2 := CreateEntry(t, authedClient, map[string]interface{}{
		"content": "第二次分類測試：使用新 client",
	})
	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID2+"/classify", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, status,
		"更新 provider 後分類仍應正常運作")
	assert.Equal(t, entryID2, body["entry_id"])
}

// --- Provider 刪除後快取清除 ---

func TestF017_ClientCache_RemovedOnProviderDelete(t *testing.T) {
	// WHEN provider 被刪除（DELETE /api/v1/llm-providers/:id）
	// THEN 快取中移除該 provider 的 client

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f017-delete-"+t.Name())
	authedClient := client.WithKey(key)

	providerID := CreateLLMProvider(t, authedClient, map[string]interface{}{
		"name":         "f017-delete-provider",
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model",
		"is_default":   false,
		"is_active":    true,
	})

	// 刪除 provider
	status, _, err := authedClient.Do("DELETE", "/api/v1/llm-providers/"+providerID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, status, "刪除 provider 應回傳 204")

	// 確認已刪除
	status, _, err = authedClient.Do("GET", "/api/v1/llm-providers/"+providerID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, status, "已刪除的 provider 應回傳 404")
}
