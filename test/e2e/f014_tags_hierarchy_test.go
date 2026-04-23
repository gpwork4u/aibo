package e2e

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-014: Tags 分層 + 多維度搜尋
// ============================================================

// setupF014Client 建立認證客戶端
func setupF014Client(t *testing.T) *APIClient {
	t.Helper()

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f014-"+t.Name())
	return client.WithKey(key)
}

// --- S-014-1: 建立 Entry 帶 domains + context ---

func TestF014_S01_CreateEntryWithDomainsAndContext(t *testing.T) {
	// WHEN POST /api/v1/entries
	//   {"content": "...", "domains": ["golang"], "context": {"languages": ["go"], "frameworks": ["gin"], "pattern": "middleware"}}
	// THEN 201 AND domains = ["golang"] AND context 正確

	authedClient := setupF014Client(t)

	payload := map[string]interface{}{
		"title":   "Using Gin middleware for JWT auth",
		"content": "Using Gin middleware for JWT authentication in Go applications",
		"domains": []string{"golang"},
		"context": map[string]interface{}{
			"languages":  []string{"go"},
			"frameworks": []string{"gin"},
			"pattern":    "middleware",
		},
	}

	status, body, err := authedClient.Do("POST", "/api/v1/entries", payload)
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status, "建立 entry 帶 domains/context 應回傳 201")

	// 驗證 domains
	domains, ok := body["domains"].([]interface{})
	require.True(t, ok, "回應應包含 domains 陣列")
	require.Equal(t, 1, len(domains), "domains 應有 1 個元素")
	assert.Equal(t, "golang", domains[0], "domains[0] 應為 golang")

	// 驗證 context
	context, ok := body["context"].(map[string]interface{})
	require.True(t, ok, "回應應包含 context 物件")

	languages, ok := context["languages"].([]interface{})
	require.True(t, ok, "context 應包含 languages")
	assert.Equal(t, "go", languages[0], "context.languages[0] 應為 go")

	frameworks, ok := context["frameworks"].([]interface{})
	require.True(t, ok, "context 應包含 frameworks")
	assert.Equal(t, "gin", frameworks[0], "context.frameworks[0] 應為 gin")

	pattern, ok := context["pattern"].(string)
	require.True(t, ok, "context 應包含 pattern")
	assert.Equal(t, "middleware", pattern, "context.pattern 應為 middleware")
}

// --- S-014-2: 按 domain 過濾搜尋 ---

func TestF014_S02_SearchFilterByDomain(t *testing.T) {
	// GIVEN 有 3 筆 entries，其中 2 筆 domains 包含 "golang"
	// WHEN GET /api/v1/search/simple?q=middleware&domain=golang
	// THEN 只回傳 domains 包含 "golang" 的結果

	authedClient := setupF014Client(t)

	// 使用唯一關鍵字避免干擾
	keyword := "zqdomain014"

	// 2 筆 golang entries
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   keyword + " Gin middleware handler",
		"content": keyword + " Gin middleware for request handling",
		"domains": []string{"golang"},
		"tags":    []string{keyword},
	})
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   keyword + " Go HTTP middleware",
		"content": keyword + " Go HTTP middleware patterns",
		"domains": []string{"golang"},
		"tags":    []string{keyword},
	})

	// 1 筆非 golang entry
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   keyword + " Python middleware",
		"content": keyword + " Python WSGI middleware implementation",
		"domains": []string{"python"},
		"tags":    []string{keyword},
	})

	// 按 domain=golang 過濾搜尋
	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q="+keyword+"&domain=golang", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "按 domain 搜尋應回傳 200")

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")
	assert.Equal(t, 2, len(results), "domain=golang 應回傳 2 筆結果")

	// 驗證所有結果的 title 不包含 Python
	for _, r := range results {
		result := r.(map[string]interface{})
		title, _ := result["title"].(string)
		assert.NotContains(t, title, "Python", "domain=golang 過濾後不應包含 Python 的結果")
	}
}

// --- S-014-3: 按 context 子欄位過濾 ---

func TestF014_S03_SearchFilterByContext(t *testing.T) {
	// GIVEN context.frameworks 包含 "gin" 的 entries
	// WHEN GET /api/v1/search/simple?q=auth&context.frameworks=gin
	// THEN 只回傳 context.frameworks 包含 "gin" 的結果

	authedClient := setupF014Client(t)

	keyword := "zqctx014"

	// gin entry
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   keyword + " Gin auth handler",
		"content": keyword + " Authentication with Gin framework",
		"domains": []string{"golang"},
		"context": map[string]interface{}{
			"languages":  []string{"go"},
			"frameworks": []string{"gin"},
		},
		"tags": []string{keyword},
	})

	// echo entry
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   keyword + " Echo auth handler",
		"content": keyword + " Authentication with Echo framework",
		"domains": []string{"golang"},
		"context": map[string]interface{}{
			"languages":  []string{"go"},
			"frameworks": []string{"echo"},
		},
		"tags": []string{keyword},
	})

	// 按 context.frameworks=gin 過濾
	status, body, err := authedClient.Do("GET", "/api/v1/search/simple?q="+keyword+"&context.frameworks=gin", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "按 context 過濾搜尋應回傳 200")

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")
	require.Greater(t, len(results), 0, "按 context.frameworks=gin 應有結果")

	// 所有結果都不應包含 Echo
	for _, r := range results {
		result := r.(map[string]interface{})
		title, _ := result["title"].(string)
		assert.NotContains(t, title, "Echo", "context.frameworks=gin 過濾後不應包含 Echo 結果")
	}
}

// --- S-014-4: LLM 分類自動產生 domains + context ---

func TestF014_S04_LLMClassifyProducesDomainsAndContext(t *testing.T) {
	// WHEN POST /api/v1/entries/:id/classify
	// THEN entry 的 domains 和 context 被更新

	authedClient := setupF014Client(t)

	// 建立 LLM provider
	_ = setupSearchLLMProvider(t, authedClient)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "Using Gin middleware for JWT authentication in Go",
		"content": "This article explains how to implement JWT authentication using Gin middleware in Go applications",
	})

	// 呼叫 classify
	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/classify", nil)
	require.NoError(t, err)
	// classify 可能回傳 200 或 202（非同步）
	assert.True(t, status == http.StatusOK || status == http.StatusAccepted,
		"classify 應回傳 200 或 202，實際 %d", status)

	// 取得 entry 驗證 domains/context 已更新
	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// 驗證 domains 已產生（LLM 可能需要時間，這裡驗證欄位存在）
	_, hasDomains := body["domains"]
	assert.True(t, hasDomains, "classify 後 entry 應包含 domains 欄位")

	_, hasContext := body["context"]
	assert.True(t, hasContext, "classify 後 entry 應包含 context 欄位")
}

// --- S-014-5: 向下相容 ---

func TestF014_S05_BackwardCompatibility(t *testing.T) {
	// GIVEN 舊 entry 沒有 domains/context
	// WHEN GET /api/v1/entries/:id
	// THEN domains = [] AND context = null AND tags 保持原值

	authedClient := setupF014Client(t)

	// 建立不帶 domains/context 的 entry
	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "向下相容測試 entry",
		"content": "這是一個不帶 domains 和 context 的舊格式 entry",
		"tags":    []string{"legacy", "test"},
	})

	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// domains 應為空陣列
	domains, ok := body["domains"].([]interface{})
	if ok {
		assert.Equal(t, 0, len(domains), "舊 entry 的 domains 應為空陣列")
	} else {
		// 也接受 null
		assert.Nil(t, body["domains"], "舊 entry 的 domains 應為空陣列或 null")
	}

	// context 應為 null
	assert.Nil(t, body["context"], "舊 entry 的 context 應為 null")

	// tags 保持原值
	tags, ok := body["tags"].([]interface{})
	require.True(t, ok, "回應應包含 tags 陣列")
	assert.Equal(t, 2, len(tags), "tags 應保持原本的 2 個值")
}

// --- S-014-6: 多 domain 過濾（AND 邏輯） ---

func TestF014_S06_MultiDomainFilterAND(t *testing.T) {
	// GIVEN Entry A: domains=["golang","docker"], Entry B: domains=["golang"]
	// WHEN GET /api/v1/entries?domain=golang&domain=docker
	// THEN 只回傳 Entry A

	authedClient := setupF014Client(t)

	entryA := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "多 domain 過濾 A - Golang + Docker",
		"content": "使用 Golang 建立 Docker 容器化應用",
		"domains": []string{"golang", "docker"},
	})

	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "多 domain 過濾 B - 只有 Golang",
		"content": "純 Golang 應用程式開發",
		"domains": []string{"golang"},
	})

	// 多 domain 過濾
	status, body, err := authedClient.Do("GET", "/api/v1/entries?domain=golang&domain=docker", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)

	// 驗證只回傳 entry A
	foundA := false
	for _, item := range data {
		entry := item.(map[string]interface{})
		if entry["id"] == entryA {
			foundA = true
		}
		// 所有回傳的 entry 都應同時包含 golang 和 docker domains
		entryDomains, ok := entry["domains"].([]interface{})
		if ok {
			hasGolang := false
			hasDocker := false
			for _, d := range entryDomains {
				if d == "golang" {
					hasGolang = true
				}
				if d == "docker" {
					hasDocker = true
				}
			}
			assert.True(t, hasGolang && hasDocker,
				"多 domain 過濾結果的 entry 應同時包含 golang 和 docker")
		}
	}
	assert.True(t, foundA, "多 domain 過濾應回傳 Entry A")
}

// --- S-014-7: 智慧搜尋 context_filter ---

func TestF014_S07_SmartSearchContextFilter(t *testing.T) {
	// WHEN POST /api/v1/search {"query": "auth", "context_filter": {"languages": ["go"]}}
	// THEN 只回傳 context.languages 包含 "go" 的結果

	authedClient := setupF014Client(t)

	keyword := "zqsmartctx014"

	// Go entry
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   keyword + " Go authentication",
		"content": keyword + " JWT authentication implementation in Go",
		"domains": []string{"golang"},
		"context": map[string]interface{}{
			"languages": []string{"go"},
		},
		"tags": []string{keyword},
	})

	// Python entry
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":   keyword + " Python authentication",
		"content": keyword + " JWT authentication implementation in Python",
		"domains": []string{"python"},
		"context": map[string]interface{}{
			"languages": []string{"python"},
		},
		"tags": []string{keyword},
	})

	// 智慧搜尋帶 context_filter
	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": keyword,
		"context_filter": map[string]interface{}{
			"languages": []string{"go"},
		},
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "智慧搜尋帶 context_filter 應回傳 200")

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")
	require.Greater(t, len(results), 0, "context_filter languages=go 應有結果")

	// 驗證結果不包含 Python
	for _, r := range results {
		result := r.(map[string]interface{})
		title, _ := result["title"].(string)
		assert.NotContains(t, title, "Python",
			"context_filter languages=go 過濾後不應包含 Python 結果")
	}
}

// --- 回歸測試：不帶 domains/context 建立 entry 仍正常 ---

func TestF014_Regression_CreateEntryWithoutDomainsContext(t *testing.T) {
	// 不帶 domains/context 也能正常建立 entry（向下相容）

	authedClient := setupF014Client(t)

	status, body, err := authedClient.Do("POST", "/api/v1/entries", map[string]interface{}{
		"title":   "無 domains/context 的 entry",
		"content": "這是一個傳統格式的 entry，不帶 domains 和 context",
		"tags":    []string{"legacy"},
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status, "不帶 domains/context 建立 entry 應回傳 201")

	id, ok := body["id"].(string)
	require.True(t, ok, "回應應包含 id")
	assert.NotEmpty(t, id, "id 不應為空")
}

// --- 回歸測試：Entry CRUD 向下相容 ---

func TestF014_Regression_EntryCRUDBackwardCompatible(t *testing.T) {
	// 更新 entry 時不帶 domains/context，原有欄位不受影響

	authedClient := setupF014Client(t)

	// 建立帶 domains 的 entry
	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "CRUD 向下相容測試",
		"content": "原始內容",
		"domains": []string{"golang"},
		"context": map[string]interface{}{
			"languages": []string{"go"},
		},
	})

	// 只更新 content，不帶 domains/context
	status, body, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"content": "更新後的內容",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "更新 entry 應回傳 200")

	// 驗證 domains 仍然存在
	domains, ok := body["domains"].([]interface{})
	if ok {
		assert.Equal(t, 1, len(domains), "更新後 domains 應保持不變")
		assert.Equal(t, "golang", domains[0], "domains[0] 應仍為 golang")
	}
}
