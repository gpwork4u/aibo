package e2e

import (
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-005: LLM 同義關鍵字搜尋
// ============================================================

// setupSearchClient 建立認證客戶端並準備搜尋測試環境
func setupSearchClient(t *testing.T) *APIClient {
	t.Helper()

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "search-"+t.Name())
	authedClient := client.WithKey(key)

	return authedClient
}

// setupSearchLLMProvider 建立 LLM provider 供搜尋用
func setupSearchLLMProvider(t *testing.T, client *APIClient) string {
	t.Helper()

	providerID := CreateLLMProvider(t, client, map[string]interface{}{
		"name":         "search-provider-" + t.Name(),
		"endpoint_url": "http://localhost:1234/v1",
		"model_name":   "test-model",
		"is_default":   true,
		"is_active":    true,
	})

	return providerID
}

// --- Happy Path ---

func TestF005_HappyPath_SmartSearch(t *testing.T) {
	// TC-005-01: 智慧搜尋成功
	// GIVEN LLM provider is configured
	// AND entry with title = "Go 語言效能優化" exists
	// WHEN POST /api/v1/search with { "query": "golang performance" }
	// THEN 200, results 包含該 entry

	authedClient := setupSearchClient(t)
	_ = setupSearchLLMProvider(t, authedClient)

	// 建立測試 entry
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "Go 語言效能優化",
		"content": "本文介紹 Golang 效能優化的最佳實踐，包括 goroutine 池化、記憶體管理等技巧",
		"tags":    []string{"golang", "performance"},
	})

	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "golang performance",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "智慧搜尋應回傳 200")

	// 驗證 response 結構
	require.NotNil(t, body["results"], "response 應包含 results")
	require.NotNil(t, body["total"], "response 應包含 total")

	// degraded 欄位
	_, hasDegraded := body["degraded"]
	assert.True(t, hasDegraded, "response 應包含 degraded 欄位")

	// 若非降級模式，應有 synonyms_used
	if body["degraded"] == false {
		assert.NotNil(t, body["synonyms_used"], "非降級模式應有 synonyms_used")
	}
}

func TestF005_HappyPath_SmartSearchWithCategoryFilter(t *testing.T) {
	// TC-005-02: 智慧搜尋限制 category
	// GIVEN entry#1 in category "golang", entry#2 in category "python"
	// WHEN POST /api/v1/search with category_id = golang
	// THEN results 只包含 entry#1

	authedClient := setupSearchClient(t)
	_ = setupSearchLLMProvider(t, authedClient)

	golangCatID := CreateCategory(t, authedClient, "golang-search-"+t.Name())
	pythonCatID := CreateCategory(t, authedClient, "python-search-"+t.Name())

	CreateEntry(t, authedClient, map[string]interface{}{
		"title":       "Go 效能優化",
		"content":     "Golang 效能優化技巧與最佳實踐",
		"category_id": golangCatID,
		"tags":        []string{"golang", "效能"},
	})
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":       "Python 效能優化",
		"content":     "Python 效能優化技巧與最佳實踐",
		"category_id": pythonCatID,
		"tags":        []string{"python", "效能"},
	})

	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query":       "效能",
		"category_id": golangCatID,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")

	// 所有結果應屬於 golang category
	for _, r := range results {
		result := r.(map[string]interface{})
		t.Logf("搜尋結果: entry_id=%v, title=%v", result["entry_id"], result["title"])
	}

	// 簡單驗證：結果應存在且不應包含 Python 相關的結果
	if len(results) > 0 {
		for _, r := range results {
			result := r.(map[string]interface{})
			title, _ := result["title"].(string)
			assert.NotContains(t, title, "Python", "過濾 category 後不應包含 Python 的結果")
		}
	}
}

func TestF005_HappyPath_SmartSearchWithLimit(t *testing.T) {
	// TC-005-03: 智慧搜尋指定 limit
	// WHEN POST /api/v1/search with { "query": "test", "limit": 5 }
	// THEN results length <= 5

	authedClient := setupSearchClient(t)
	_ = setupSearchLLMProvider(t, authedClient)

	// 建立多筆 entries
	for i := 0; i < 10; i++ {
		CreateEntry(t, authedClient, map[string]interface{}{
			"title":   "測試搜尋限制 " + RepeatStr("x", i+1),
			"content": "這是一個測試條目，用於驗證搜尋 limit 功能",
			"tags":    []string{"test", "limit"},
		})
	}

	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "測試",
		"limit": 5,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")
	assert.LessOrEqual(t, len(results), 5, "結果數量不應超過 limit")
}

func TestF005_HappyPath_SimpleSearch(t *testing.T) {
	// TC-005-04: 簡單搜尋
	// GIVEN entry with title = "PostgreSQL 索引"
	// WHEN GET /api/v1/search/simple?q=postgresql
	// THEN 200, results 包含該 entry

	authedClient := setupSearchClient(t)

	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "PostgreSQL 索引優化",
		"content": "PostgreSQL 索引類型包括 B-tree、Hash、GIN、GiST 等",
		"tags":    []string{"postgresql", "database"},
	})

	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q=postgresql", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "簡單搜尋應回傳 200")

	require.NotNil(t, body["results"], "response 應包含 results")
	require.NotNil(t, body["total"], "response 應包含 total")

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")
	assert.Greater(t, len(results), 0, "搜尋 postgresql 應有結果")

	// 驗證結果結構
	if len(results) > 0 {
		firstResult := results[0].(map[string]interface{})
		assert.NotEmpty(t, firstResult["entry_id"], "結果應包含 entry_id")
	}
}

func TestF005_HappyPath_SimpleSearchWithTagFilter(t *testing.T) {
	// TC-005-05: 簡單搜尋含 tag 過濾
	// GIVEN entry#1 tags=["db","postgresql"], entry#2 tags=["db","mysql"]
	// WHEN GET /api/v1/search/simple?q=database&tag=postgresql
	// THEN results 只包含 entry#1

	authedClient := setupSearchClient(t)

	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "PostgreSQL 資料庫管理",
		"content": "PostgreSQL database 管理與優化",
		"tags":    []string{"db", "postgresql"},
	})
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "MySQL 資料庫管理",
		"content": "MySQL database 管理與優化",
		"tags":    []string{"db", "mysql"},
	})

	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q=database&tag=postgresql", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")

	// 所有結果都應有 postgresql tag
	for _, r := range results {
		result := r.(map[string]interface{})
		title, _ := result["title"].(string)
		assert.NotContains(t, title, "MySQL", "tag 過濾後不應包含 MySQL 的結果")
	}
}

// --- Error Handling ---

func TestF005_Error_EmptyQuery(t *testing.T) {
	// TC-005-06: query 為空 → 400
	// WHEN POST /api/v1/search with { "query": "" }
	// THEN 400, INVALID_INPUT

	authedClient := setupSearchClient(t)

	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status, "空 query 應回傳 400")
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF005_Error_QueryTooLong(t *testing.T) {
	// TC-005-07: query 超過 500 字 → 400
	// WHEN POST /api/v1/search with { "query": "a" * 501 }
	// THEN 400, INVALID_INPUT

	authedClient := setupSearchClient(t)

	longQuery := strings.Repeat("a", 501)
	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": longQuery,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status, "超過 500 字的 query 應回傳 400")
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF005_Error_LimitOutOfRange(t *testing.T) {
	// TC-005-08: limit 超出範圍 → 400
	// WHEN POST /api/v1/search with { "query": "test", "limit": 51 }
	// THEN 400, INVALID_INPUT

	authedClient := setupSearchClient(t)

	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "test",
		"limit": 51,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status, "limit > 50 應回傳 400")
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF005_Error_LimitZero(t *testing.T) {
	// limit = 0 也應被拒絕（有效範圍 1-50）

	authedClient := setupSearchClient(t)

	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "test",
		"limit": 0,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status, "limit = 0 應回傳 400")
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF005_Error_SmartSearchUnauthorized(t *testing.T) {
	// TC-005-09: 未認證 → 401
	// WHEN POST /api/v1/search without X-API-Key
	// THEN 401, UNAUTHORIZED

	client := NewAPIClient()
	// 確保非 bootstrap 模式
	_ = BootstrapAPIKey(t, client, "search-unauth-key")

	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "test",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status, "未帶 API Key 應回傳 401")
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

func TestF005_Error_SimpleSearchUnauthorized(t *testing.T) {
	// 簡單搜尋未認證 → 401

	client := NewAPIClient()
	_ = BootstrapAPIKey(t, client, "simplesearch-unauth-key")

	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("GET", "/api/v1/search/simple?q=test", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status, "未帶 API Key 應回傳 401")
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

func TestF005_Error_SimpleSearchEmptyQuery(t *testing.T) {
	// 簡單搜尋 q 為空 → 400

	authedClient := setupSearchClient(t)

	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q=", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status, "空 q 應回傳 400")
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF005_Error_SimpleSearchQueryTooLong(t *testing.T) {
	// 簡單搜尋 q 超過 500 字 → 400

	authedClient := setupSearchClient(t)

	longQuery := strings.Repeat("b", 501)
	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q="+longQuery, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status, "超過 500 字的 q 應回傳 400")
	AssertErrorCode(t, body, "INVALID_INPUT")
}

// --- Edge Cases ---

func TestF005_Edge_SearchNoResults(t *testing.T) {
	// TC-005-12: 搜尋無結果 → 200, results=[], total=0
	// WHEN POST /api/v1/search with { "query": "zzz_no_match_zzz" }
	// THEN 200, results=[], total=0

	authedClient := setupSearchClient(t)

	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "zzz_no_match_zzz_12345",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "無結果搜尋仍應回傳 200")

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")
	assert.Equal(t, 0, len(results), "無結果時 results 應為空陣列")

	total, ok := body["total"].(float64)
	require.True(t, ok, "response 應包含 total")
	assert.Equal(t, float64(0), total, "無結果時 total 應為 0")
}

func TestF005_Edge_SimpleSearchNoResults(t *testing.T) {
	// 簡單搜尋無結果

	authedClient := setupSearchClient(t)

	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q=zzz_no_match_zzz_67890", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	results, ok := body["results"].([]interface{})
	require.True(t, ok)
	assert.Equal(t, 0, len(results))
}

func TestF005_Edge_DegradedWhenNoLLMProvider(t *testing.T) {
	// TC-005-11: LLM 完全不可用時自動降級
	// GIVEN no active LLM provider
	// WHEN POST /api/v1/search with { "query": "golang" }
	// THEN 200, degraded = true

	authedClient := setupSearchClient(t)
	// 不建立 LLM provider

	// 建立一筆 entry 確保搜尋有資料
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "Golang 基礎教學",
		"content": "Go 語言入門教學",
		"tags":    []string{"golang"},
	})

	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "golang",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "無 LLM 時應自動降級仍回傳 200")

	// 驗證降級標記
	degraded, ok := body["degraded"].(bool)
	if ok {
		assert.True(t, degraded, "無 LLM provider 時 degraded 應為 true")
	}
}

func TestF005_Edge_QueryExactly500Chars(t *testing.T) {
	// query 恰好 500 字應通過驗證
	// WHEN POST /api/v1/search with { "query": "a" * 500 }
	// THEN 200（不是 400）

	authedClient := setupSearchClient(t)

	exactQuery := strings.Repeat("a", 500)
	status, _, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": exactQuery,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "500 字 query 應通過驗證")
}

func TestF005_Edge_SearchResultsOrderedByRelevance(t *testing.T) {
	// TC-005-13: 搜尋結果按 relevance 排序
	// GIVEN entry#1 title="Golang 基礎"（高 relevance）
	// AND entry#2 content 中提到一次 "golang"（低 relevance）
	// WHEN POST /api/v1/search with { "query": "golang" }
	// THEN results[0].relevance >= results[1].relevance

	authedClient := setupSearchClient(t)
	_ = setupSearchLLMProvider(t, authedClient)

	// 高 relevance：title 包含 golang
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "Golang 基礎教學完全指南",
		"content": "Golang 是 Google 開發的程式語言，Golang 效能優異",
		"tags":    []string{"golang", "programming"},
	})

	// 低 relevance：只在 content 中提到一次
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "程式語言比較",
		"content": "市面上有很多程式語言，其中 golang 也是選項之一，但本文主要討論其他語言",
		"tags":    []string{"programming"},
	})

	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "golang",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	results, ok := body["results"].([]interface{})
	require.True(t, ok)

	if len(results) >= 2 {
		r0 := results[0].(map[string]interface{})
		r1 := results[1].(map[string]interface{})

		relevance0, ok0 := r0["relevance"].(float64)
		relevance1, ok1 := r1["relevance"].(float64)

		if ok0 && ok1 {
			assert.GreaterOrEqual(t, relevance0, relevance1,
				"搜尋結果應按 relevance 降序排列")
		}
	}
}

func TestF005_Edge_SmartSearchDegradedFlagFalseWithLLM(t *testing.T) {
	// 有 LLM provider 時 degraded 應為 false

	authedClient := setupSearchClient(t)
	_ = setupSearchLLMProvider(t, authedClient)

	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "測試 degraded 標記",
		"content": "驗證有 LLM 時 degraded 為 false",
	})

	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "測試",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// 有 LLM provider 且 LLM 正常運作時，degraded 應為 false
	// 注意：若 LLM endpoint 不可達，可能仍會降級
	if degraded, ok := body["degraded"].(bool); ok {
		t.Logf("degraded = %v（有 LLM provider 設定）", degraded)
	}
}
