package e2e

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-015: 知識生命週期
// ============================================================

// setupF015Client 建立認證客戶端
func setupF015Client(t *testing.T) *APIClient {
	t.Helper()

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f015-"+t.Name())
	return client.WithKey(key)
}

// createF015Entry 建立測試用 entry，回傳 ID
func createF015Entry(t *testing.T, client *APIClient, title, content string) string {
	t.Helper()
	return CreateEntry(t, client, map[string]interface{}{
		"title":   title,
		"content": content,
		"tags":    []string{"lifecycle-test"},
	})
}

// --- S-015-1: 設定 Supersede 關係 ---

func TestF015_S01_SupersedeEntry(t *testing.T) {
	// GIVEN Entry A 和 Entry B 存在
	// WHEN POST /api/v1/entries/{A}/supersede {"new_entry_id": "{B}"}
	// THEN 200 AND A.superseded_by = B.id AND A.confidence <= 0.2

	authedClient := setupF015Client(t)

	entryA := createF015Entry(t, authedClient, "舊版知識 v1", "這是舊版知識內容")
	entryB := createF015Entry(t, authedClient, "新版知識 v2", "這是新版知識內容")

	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryA+"/supersede", map[string]interface{}{
		"new_entry_id": entryB,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "設定 supersede 應回傳 200")

	// 驗證 old_entry
	oldEntry, ok := body["old_entry"].(map[string]interface{})
	require.True(t, ok, "回應應包含 old_entry")
	assert.Equal(t, entryA, oldEntry["id"], "old_entry.id 應為 A")
	assert.Equal(t, entryB, oldEntry["superseded_by"], "old_entry.superseded_by 應為 B")

	confidence, ok := oldEntry["confidence"].(float64)
	require.True(t, ok, "old_entry 應包含 confidence")
	assert.LessOrEqual(t, confidence, 0.2, "supersede 後 confidence 應 <= 0.2")

	// 驗證 new_entry
	newEntry, ok := body["new_entry"].(map[string]interface{})
	require.True(t, ok, "回應應包含 new_entry")
	assert.Equal(t, entryB, newEntry["id"], "new_entry.id 應為 B")
}

// --- S-015-2: 循環引用檢測 ---

func TestF015_S02_CircularSupersedeDetection(t *testing.T) {
	// GIVEN A superseded_by B
	// WHEN POST /api/v1/entries/{B}/supersede {"new_entry_id": "{A}"}
	// THEN 409 AND error.code = "CIRCULAR_SUPERSEDE"

	authedClient := setupF015Client(t)

	entryA := createF015Entry(t, authedClient, "循環測試 A", "循環測試 A 內容")
	entryB := createF015Entry(t, authedClient, "循環測試 B", "循環測試 B 內容")

	// A -> B
	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryA+"/supersede", map[string]interface{}{
		"new_entry_id": entryB,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "第一次 supersede 應成功")

	// B -> A（循環引用）
	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryB+"/supersede", map[string]interface{}{
		"new_entry_id": entryA,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusConflict, status, "循環引用應回傳 409")
	AssertErrorCode(t, body, "CIRCULAR_SUPERSEDE")
}

// --- S-015-3: 不能 supersede 自己 ---

func TestF015_S03_CannotSupersedeItself(t *testing.T) {
	// WHEN POST /api/v1/entries/{A}/supersede {"new_entry_id": "{A}"}
	// THEN 400 AND error.code = "INVALID_INPUT"

	authedClient := setupF015Client(t)

	entryA := createF015Entry(t, authedClient, "自我 supersede 測試", "自我 supersede 內容")

	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryA+"/supersede", map[string]interface{}{
		"new_entry_id": entryA,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status, "supersede 自己應回傳 400")
	AssertErrorCode(t, body, "INVALID_INPUT")
}

// --- S-015-4: 查詢版本鏈 ---

func TestF015_S04_VersionChain(t *testing.T) {
	// GIVEN A -> B -> C（A superseded_by B, B superseded_by C）
	// WHEN GET /api/v1/entries/{A}/history
	// THEN chain = [A, B, C] AND latest = C

	authedClient := setupF015Client(t)

	entryA := createF015Entry(t, authedClient, "版本鏈 v1", "第一版知識")
	entryB := createF015Entry(t, authedClient, "版本鏈 v2", "第二版知識")
	entryC := createF015Entry(t, authedClient, "版本鏈 v3", "第三版知識")

	// A -> B
	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryA+"/supersede", map[string]interface{}{
		"new_entry_id": entryB,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// B -> C
	status, _, err = authedClient.Do("POST", "/api/v1/entries/"+entryB+"/supersede", map[string]interface{}{
		"new_entry_id": entryC,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// 查詢版本鏈
	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryA+"/history", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "查詢版本鏈應回傳 200")

	// 驗證 chain
	chain, ok := body["chain"].([]interface{})
	require.True(t, ok, "回應應包含 chain 陣列")
	require.Equal(t, 3, len(chain), "chain 應包含 3 個節點 (A -> B -> C)")

	// 驗證順序：從最舊到最新
	chainNode0 := chain[0].(map[string]interface{})
	chainNode1 := chain[1].(map[string]interface{})
	chainNode2 := chain[2].(map[string]interface{})

	assert.Equal(t, entryA, chainNode0["id"], "chain[0] 應為 A")
	assert.Equal(t, entryB, chainNode1["id"], "chain[1] 應為 B")
	assert.Equal(t, entryC, chainNode2["id"], "chain[2] 應為 C")

	// 驗證狀態
	assert.Equal(t, "superseded", chainNode0["status"], "A 的 status 應為 superseded")
	assert.Equal(t, "superseded", chainNode1["status"], "B 的 status 應為 superseded")
	assert.Equal(t, "active", chainNode2["status"], "C 的 status 應為 active")

	// 驗證 latest
	latest, ok := body["latest"].(map[string]interface{})
	require.True(t, ok, "回應應包含 latest 物件")
	assert.Equal(t, entryC, latest["id"], "latest 應為 C")
}

// --- S-015-5: 搜尋結果中 superseded entry 排名降低 ---

func TestF015_S05_SupersededEntryRankedLower(t *testing.T) {
	// GIVEN Entry A (active, confidence=0.8) 和 Entry B (superseded, confidence=0.2)
	// WHEN POST /api/v1/search {"query": "..."}
	// THEN A 排在 B 前面 AND B.lifecycle_status = "superseded"

	authedClient := setupF015Client(t)

	// 使用唯一的關鍵字避免干擾
	keyword := "zqwlifecycle"

	entryActive := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   keyword + " 有效知識條目",
		"content": keyword + " 這是目前有效的知識",
		"tags":    []string{keyword},
	})

	entryOld := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   keyword + " 舊版知識條目",
		"content": keyword + " 這是舊版的知識",
		"tags":    []string{keyword},
	})

	// 提升 active entry 的 confidence
	for i := 0; i < 6; i++ {
		_, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryActive+"/confirm", nil)
		require.NoError(t, err)
	}

	// 將 old entry supersede 為 active entry（confidence 降至 <= 0.2）
	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryOld+"/supersede", map[string]interface{}{
		"new_entry_id": entryActive,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// 搜尋
	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": keyword,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")

	if len(results) >= 2 {
		r0 := results[0].(map[string]interface{})
		assert.Equal(t, entryActive, r0["entry_id"],
			"active entry 應排在 superseded entry 前面")

		// 找到 superseded entry 並驗證 lifecycle_status
		for _, r := range results {
			result := r.(map[string]interface{})
			if result["entry_id"] == entryOld {
				assert.Equal(t, "superseded", result["lifecycle_status"],
					"被 supersede 的 entry 的 lifecycle_status 應為 superseded")
				break
			}
		}
	}
}

// --- S-015-6: 取消 Supersede ---

func TestF015_S06_CancelSupersede(t *testing.T) {
	// GIVEN A superseded_by B
	// WHEN DELETE /api/v1/entries/{A}/supersede
	// THEN A.superseded_by = null

	authedClient := setupF015Client(t)

	entryA := createF015Entry(t, authedClient, "取消 supersede A", "取消測試 A 內容")
	entryB := createF015Entry(t, authedClient, "取消 supersede B", "取消測試 B 內容")

	// 先設定 supersede
	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryA+"/supersede", map[string]interface{}{
		"new_entry_id": entryB,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// 取消 supersede
	status, body, err := authedClient.Do("DELETE", "/api/v1/entries/"+entryA+"/supersede", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "取消 supersede 應回傳 200")

	assert.Equal(t, entryA, body["id"], "回應的 id 應為 A")
	assert.Nil(t, body["superseded_by"], "取消後 superseded_by 應為 null")

	// 驗證 GET entry 也反映變更
	status, entryBody, err := authedClient.Do("GET", "/api/v1/entries/"+entryA, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Nil(t, entryBody["superseded_by"], "GET entry 後 superseded_by 應為 null")
}

// --- S-015-7: 按 lifecycle_status 過濾列表 ---

func TestF015_S07_FilterByLifecycleStatus(t *testing.T) {
	// GIVEN 有 active 和 superseded 的 entries
	// WHEN GET /api/v1/entries?lifecycle_status=active
	// THEN 只回傳 lifecycle_status 為 "active" 的 entries

	authedClient := setupF015Client(t)

	entryActive := createF015Entry(t, authedClient, "Active 知識", "Active 知識內容")
	entryOld := createF015Entry(t, authedClient, "Superseded 知識", "Superseded 知識內容")

	// 將 old entry supersede
	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryOld+"/supersede", map[string]interface{}{
		"new_entry_id": entryActive,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// 過濾 active
	status, body, err := authedClient.Do("GET", "/api/v1/entries?lifecycle_status=active", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	for _, item := range data {
		entry := item.(map[string]interface{})
		lifecycleStatus, ok := entry["lifecycle_status"].(string)
		if ok {
			assert.Equal(t, "active", lifecycleStatus,
				"過濾 active 時所有結果的 lifecycle_status 應為 active")
		}
		// 被 supersede 的 entry 不應出現
		assert.NotEqual(t, entryOld, entry["id"],
			"過濾 active 時不應出現被 supersede 的 entry")
	}

	// 過濾 superseded
	status, body, err = authedClient.Do("GET", "/api/v1/entries?lifecycle_status=superseded", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data = GetDataArray(t, body)
	foundOld := false
	for _, item := range data {
		entry := item.(map[string]interface{})
		lifecycleStatus, ok := entry["lifecycle_status"].(string)
		if ok {
			assert.Equal(t, "superseded", lifecycleStatus,
				"過濾 superseded 時所有結果的 lifecycle_status 應為 superseded")
		}
		if entry["id"] == entryOld {
			foundOld = true
		}
	}
	assert.True(t, foundOld, "過濾 superseded 時應包含被 supersede 的 entry")
}

// --- S-015-8: new_entry_id 不存在 ---

func TestF015_S08_SupersedeNonExistentEntry(t *testing.T) {
	// WHEN POST /api/v1/entries/{A}/supersede {"new_entry_id": "non-existent"}
	// THEN 404 AND error.code = "NOT_FOUND"

	authedClient := setupF015Client(t)

	entryA := createF015Entry(t, authedClient, "Supersede 不存在 entry", "測試內容")

	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryA+"/supersede", map[string]interface{}{
		"new_entry_id": "00000000-0000-0000-0000-000000000000",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, status, "supersede 不存在的 entry 應回傳 404")
	AssertErrorCode(t, body, "NOT_FOUND")
}

// --- 額外測試：supersede 未認證 ---

func TestF015_Error_SupersedeUnauthorized(t *testing.T) {
	// WHEN POST /api/v1/entries/:id/supersede 無 API Key
	// THEN 401

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f015-unauth")
	authedClient := client.WithKey(key)

	entryA := createF015Entry(t, authedClient, "未認證 supersede A", "內容 A")
	entryB := createF015Entry(t, authedClient, "未認證 supersede B", "內容 B")

	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("POST", "/api/v1/entries/"+entryA+"/supersede", map[string]interface{}{
		"new_entry_id": entryB,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status, "無 API Key 應回傳 401")
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

// --- 額外測試：三層循環引用檢測 ---

func TestF015_Edge_ThreeLevelCircularDetection(t *testing.T) {
	// GIVEN A -> B -> C
	// WHEN POST /api/v1/entries/{C}/supersede {"new_entry_id": "{A}"}
	// THEN 409 CIRCULAR_SUPERSEDE

	authedClient := setupF015Client(t)

	entryA := createF015Entry(t, authedClient, "三層循環 A", "三層循環 A 內容")
	entryB := createF015Entry(t, authedClient, "三層循環 B", "三層循環 B 內容")
	entryC := createF015Entry(t, authedClient, "三層循環 C", "三層循環 C 內容")

	// A -> B
	status, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryA+"/supersede", map[string]interface{}{
		"new_entry_id": entryB,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// B -> C
	status, _, err = authedClient.Do("POST", "/api/v1/entries/"+entryB+"/supersede", map[string]interface{}{
		"new_entry_id": entryC,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// C -> A（三層循環引用）
	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryC+"/supersede", map[string]interface{}{
		"new_entry_id": entryA,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusConflict, status, "三層循環引用應回傳 409")
	AssertErrorCode(t, body, "CIRCULAR_SUPERSEDE")
}

// --- 額外測試：entry 回應包含 lifecycle_status ---

func TestF015_EntryResponseIncludesLifecycleStatus(t *testing.T) {
	// WHEN GET /api/v1/entries/:id
	// THEN 回應包含 lifecycle_status 欄位

	authedClient := setupF015Client(t)

	entryID := createF015Entry(t, authedClient, "lifecycle_status 測試", "測試內容")

	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	lifecycleStatus, ok := body["lifecycle_status"].(string)
	require.True(t, ok, "回應應包含 lifecycle_status 欄位")
	assert.Equal(t, "active", lifecycleStatus, "新 entry 的 lifecycle_status 應為 active")
	assert.Nil(t, body["superseded_by"], "新 entry 的 superseded_by 應為 null")
}
