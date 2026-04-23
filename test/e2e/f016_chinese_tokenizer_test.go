package e2e

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-016: 中文分詞優化
// ============================================================

// setupF016Client 建立認證客戶端
func setupF016Client(t *testing.T) *APIClient {
	t.Helper()

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f016-"+t.Name())
	return client.WithKey(key)
}

// --- S-016-1: 中文關鍵字搜尋 ---

func TestF016_S01_ChineseKeywordSearch(t *testing.T) {
	// GIVEN Entry 內容為 "PostgreSQL資料庫效能調優指南"
	// WHEN GET /api/v1/search/simple?q=資料庫
	// THEN 回傳該 entry AND relevance > 0

	authedClient := setupF016Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "PostgreSQL資料庫效能調優指南",
		"content": "PostgreSQL資料庫效能調優指南，涵蓋索引策略與查詢最佳化",
		"tags":    []string{"postgresql", "database"},
	})

	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q=資料庫", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "中文關鍵字搜尋應回傳 200")

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")
	require.Greater(t, len(results), 0, "搜尋「資料庫」應有結果")

	// 驗證回傳的結果包含我們建立的 entry
	found := false
	for _, r := range results {
		result := r.(map[string]interface{})
		if result["entry_id"] == entryID {
			found = true
			relevance, ok := result["relevance"].(float64)
			if ok {
				assert.Greater(t, relevance, float64(0), "relevance 應大於 0")
			}
			break
		}
	}
	assert.True(t, found, "搜尋結果應包含建立的 entry (id=%s)", entryID)
}

// --- S-016-2: 中文部分匹配 ---

func TestF016_S02_ChinesePartialMatch(t *testing.T) {
	// GIVEN Entry 內容為 "使用Docker部署微服務架構"
	// WHEN GET /api/v1/search/simple?q=微服務
	// THEN 回傳該 entry

	authedClient := setupF016Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "使用Docker部署微服務架構",
		"content": "使用Docker部署微服務架構的完整指南",
		"tags":    []string{"docker", "microservices"},
	})

	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q=微服務", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "中文部分匹配搜尋應回傳 200")

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")
	require.Greater(t, len(results), 0, "搜尋「微服務」應有結果")

	found := false
	for _, r := range results {
		result := r.(map[string]interface{})
		if result["entry_id"] == entryID {
			found = true
			break
		}
	}
	assert.True(t, found, "搜尋結果應包含建立的 entry (id=%s)", entryID)
}

// --- S-016-3: 英文搜尋不受影響 ---

func TestF016_S03_EnglishSearchUnaffected(t *testing.T) {
	// GIVEN Entry 內容為 "Using Gin middleware for authentication"
	// WHEN GET /api/v1/search/simple?q=middleware
	// THEN 回傳該 entry

	authedClient := setupF016Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "Using Gin middleware for authentication",
		"content": "Using Gin middleware for authentication in Go applications",
		"tags":    []string{"gin", "middleware"},
	})

	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q=middleware", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "英文搜尋應回傳 200")

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")
	require.Greater(t, len(results), 0, "搜尋 middleware 應有結果")

	found := false
	for _, r := range results {
		result := r.(map[string]interface{})
		if result["entry_id"] == entryID {
			found = true
			break
		}
	}
	assert.True(t, found, "英文搜尋結果應包含建立的 entry (id=%s)", entryID)
}

// --- S-016-4: 中英混合搜尋 ---

func TestF016_S04_MixedChineseEnglishSearch(t *testing.T) {
	// GIVEN Entry 內容為 "Golang 效能優化最佳實踐"
	// WHEN GET /api/v1/search/simple?q=Golang效能
	// THEN 回傳該 entry

	authedClient := setupF016Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "Golang 效能優化最佳實踐",
		"content": "Golang 效能優化最佳實踐，包括 goroutine 管理與記憶體分配策略",
		"tags":    []string{"golang", "performance"},
	})

	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q=Golang效能", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "中英混合搜尋應回傳 200")

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")
	require.Greater(t, len(results), 0, "搜尋「Golang效能」應有結果")

	found := false
	for _, r := range results {
		result := r.(map[string]interface{})
		if result["entry_id"] == entryID {
			found = true
			break
		}
	}
	assert.True(t, found, "中英混合搜尋結果應包含建立的 entry (id=%s)", entryID)
}

// --- S-016-5: pg_bigm 擴展已安裝 ---

func TestF016_S05_PgBigmExtensionInstalled(t *testing.T) {
	// WHEN GET /api/v1/system/search-config
	// THEN response.extensions.pg_bigm = true

	authedClient := setupF016Client(t)

	status, body, err := authedClient.Do("GET", "/api/v1/system/search-config", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "search-config 應回傳 200")

	extensions, ok := body["extensions"].(map[string]interface{})
	require.True(t, ok, "回應應包含 extensions 物件")

	pgBigm, ok := extensions["pg_bigm"].(bool)
	require.True(t, ok, "extensions 應包含 pg_bigm 欄位")
	assert.True(t, pgBigm, "pg_bigm 擴展應為 true（已安裝）")

	// 額外驗證 chinese_support 欄位
	chineseSupport, ok := body["chinese_support"].(string)
	if ok {
		assert.Equal(t, "pg_bigm (2-gram)", chineseSupport,
			"chinese_support 應為 pg_bigm (2-gram)")
	}
}

// --- 回歸測試：英文搜尋效果不退化 ---

func TestF016_Regression_EnglishSearchNotDegraded(t *testing.T) {
	// 確認中文分詞優化後，英文搜尋仍正常運作
	// GIVEN 多筆英文 entries
	// WHEN 搜尋英文關鍵字
	// THEN 正確回傳匹配結果

	authedClient := setupF016Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "Docker container orchestration best practices",
		"content": "Docker container orchestration with Kubernetes and Docker Compose",
		"tags":    []string{"docker", "kubernetes"},
	})

	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q=orchestration", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")
	require.Greater(t, len(results), 0, "英文搜尋應有結果")

	found := false
	for _, r := range results {
		result := r.(map[string]interface{})
		if result["entry_id"] == entryID {
			found = true
			break
		}
	}
	assert.True(t, found, "英文搜尋回歸測試：應找到建立的 entry")
}

// --- 回歸測試：中文長句搜尋 ---

func TestF016_Edge_ChineseLongPhraseSearch(t *testing.T) {
	// 較長的中文片語也能正確搜尋
	// GIVEN Entry 內容包含多個中文技術詞彙
	// WHEN 搜尋其中一段中文片語
	// THEN 回傳該 entry

	authedClient := setupF016Client(t)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "分散式系統的一致性協議實作",
		"content": "本文介紹分散式系統中常見的一致性協議，包括 Raft 和 Paxos 演算法的實作細節",
		"tags":    []string{"distributed-systems"},
	})

	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q=一致性協議", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")
	require.Greater(t, len(results), 0, "搜尋「一致性協議」應有結果")

	found := false
	for _, r := range results {
		result := r.(map[string]interface{})
		if result["entry_id"] == entryID {
			found = true
			break
		}
	}
	assert.True(t, found, "中文長片語搜尋應找到建立的 entry")
}
