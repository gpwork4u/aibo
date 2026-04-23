package e2e

import (
	"encoding/json"
	"math"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-013: 信心度機制
// ============================================================

// setupF013Client 建立認證客戶端
func setupF013Client(t *testing.T) *APIClient {
	t.Helper()

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f013-"+t.Name())
	authedClient := client.WithKey(key)

	return authedClient
}

// createF013Entry 建立測試用 entry，回傳 ID
func createF013Entry(t *testing.T, client *APIClient, title string) string {
	t.Helper()
	return CreateEntry(t, client, map[string]interface{}{
		"title":   title,
		"content": "測試用內容 - " + title,
	})
}

// almostEqual 比較浮點數（容許 0.01 誤差）
func almostEqual(a, b float64) bool {
	return math.Abs(a-b) < 0.01
}

// --- S-013-01: confirm entry ---

func TestF013_S01_ConfirmEntry(t *testing.T) {
	// WHEN POST /api/v1/entries/:id/confirm
	// AND entry 存在且 confidence = 0.5, confirmations = 0
	// THEN confirmations = 1, confidence = 0.55

	authedClient := setupF013Client(t)
	entryID := createF013Entry(t, authedClient, "Confirm 測試")

	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/confirm", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	assert.Equal(t, entryID, body["entry_id"], "回應應包含正確的 entry_id")

	confidence, ok := body["confidence"].(float64)
	require.True(t, ok, "回應應包含 confidence")
	assert.True(t, almostEqual(confidence, 0.55),
		"confirm 一次後 confidence 應為 0.55，實際 %v", confidence)

	confirmations, ok := body["confirmations"].(float64)
	require.True(t, ok, "回應應包含 confirmations")
	assert.Equal(t, float64(1), confirmations, "confirmations 應為 1")
}

// --- S-013-02: 多次 confirm ---

func TestF013_S02_MultipleConfirms(t *testing.T) {
	// WHEN 使用者對同一 entry confirm 5 次
	// THEN confirmations = 5, confidence = 0.75

	authedClient := setupF013Client(t)
	entryID := createF013Entry(t, authedClient, "多次 Confirm 測試")

	var lastBody map[string]interface{}
	for i := 0; i < 5; i++ {
		status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/confirm", nil)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, status, "第 %d 次 confirm 應成功", i+1)
		lastBody = body
	}

	confidence, ok := lastBody["confidence"].(float64)
	require.True(t, ok)
	assert.True(t, almostEqual(confidence, 0.75),
		"confirm 5 次後 confidence 應為 0.75，實際 %v", confidence)

	confirmations, ok := lastBody["confirmations"].(float64)
	require.True(t, ok)
	assert.Equal(t, float64(5), confirmations, "confirmations 應為 5")
}

// --- S-013-03: flag entry ---

func TestF013_S03_FlagEntry(t *testing.T) {
	// WHEN POST /api/v1/entries/:id/flag WITH reason="outdated"
	// AND entry 存在且 confidence = 0.5, flags_count = 0
	// THEN flags_count = 1, confidence = 0.4

	authedClient := setupF013Client(t)
	entryID := createF013Entry(t, authedClient, "Flag 測試")

	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/flag", map[string]interface{}{
		"reason": "outdated",
		"note":   "已過時",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	assert.Equal(t, entryID, body["entry_id"], "回應應包含正確的 entry_id")

	confidence, ok := body["confidence"].(float64)
	require.True(t, ok, "回應應包含 confidence")
	assert.True(t, almostEqual(confidence, 0.4),
		"flag 一次後 confidence 應為 0.4，實際 %v", confidence)

	flagsCount, ok := body["flags_count"].(float64)
	require.True(t, ok, "回應應包含 flags_count")
	assert.Equal(t, float64(1), flagsCount, "flags_count 應為 1")
}

// --- S-013-04: flag 必填 reason ---

func TestF013_S04_FlagWithoutReason(t *testing.T) {
	// WHEN POST /api/v1/entries/:id/flag WITHOUT reason
	// THEN 400 INVALID_INPUT

	authedClient := setupF013Client(t)
	entryID := createF013Entry(t, authedClient, "Flag 無 reason 測試")

	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/flag", map[string]interface{}{})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status, "缺少 reason 應回傳 400")
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF013_S04_FlagWithEmptyReason(t *testing.T) {
	// WHEN POST /api/v1/entries/:id/flag WITH reason=""
	// THEN 400 INVALID_INPUT

	authedClient := setupF013Client(t)
	entryID := createF013Entry(t, authedClient, "Flag 空 reason 測試")

	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/flag", map[string]interface{}{
		"reason": "",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status, "空 reason 應回傳 400")
	AssertErrorCode(t, body, "INVALID_INPUT")
}

// --- S-013-05: flag 無效 reason ---

func TestF013_S05_FlagWithInvalidReason(t *testing.T) {
	// WHEN POST /api/v1/entries/:id/flag WITH reason="invalid_reason"
	// THEN 400 INVALID_INPUT

	authedClient := setupF013Client(t)
	entryID := createF013Entry(t, authedClient, "Flag 無效 reason 測試")

	status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/flag", map[string]interface{}{
		"reason": "invalid_reason",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status, "無效 reason 應回傳 400")
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF013_S05_FlagWithValidReasons(t *testing.T) {
	// 驗證所有合法 reason 都能成功
	validReasons := []string{"outdated", "inaccurate", "incomplete", "duplicate"}

	authedClient := setupF013Client(t)

	for _, reason := range validReasons {
		t.Run("reason_"+reason, func(t *testing.T) {
			entryID := createF013Entry(t, authedClient, "Flag reason "+reason)

			status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/flag", map[string]interface{}{
				"reason": reason,
			})
			require.NoError(t, err)
			assert.Equal(t, http.StatusOK, status, "reason=%s 應成功", reason)
			assert.NotNil(t, body["confidence"], "回應應包含 confidence")
		})
	}
}

// --- S-013-06: confidence 影響搜尋排序 ---

func TestF013_S06_ConfidenceAffectsSearchOrder(t *testing.T) {
	// GIVEN A(confidence=0.9) AND B(confidence=0.3) 且 B 的 ts_rank 稍高
	// WHEN 搜尋
	// THEN A 排在 B 前面（因 confidence 權重較高）

	authedClient := setupF013Client(t)

	// 建立兩筆 entry，使用相同關鍵字
	entryA := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "信心度排序 xqkzjw 高分條目",
		"content": "xqkzjw 這是高信心度的知識",
		"tags":    []string{"xqkzjw"},
	})
	entryB := CreateEntry(t, authedClient, map[string]interface{}{
		"title":   "信心度排序 xqkzjw 低分條目 xqkzjw xqkzjw",
		"content": "xqkzjw xqkzjw 這是低信心度但關鍵字更密集的知識 xqkzjw",
		"tags":    []string{"xqkzjw"},
	})

	// 提升 A 的信心度：confirm 8 次 → confidence = 0.5 + 8*0.05 = 0.9
	for i := 0; i < 8; i++ {
		_, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryA+"/confirm", nil)
		require.NoError(t, err)
	}

	// 降低 B 的信心度：flag 2 次 → confidence = 0.5 - 2*0.1 = 0.3
	for i := 0; i < 2; i++ {
		_, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryB+"/flag", map[string]interface{}{
			"reason": "outdated",
		})
		require.NoError(t, err)
	}

	// 搜尋
	status, body, err := authedClient.Do("POST", "/api/v1/search", map[string]interface{}{
		"query": "xqkzjw",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	results, ok := body["results"].([]interface{})
	require.True(t, ok, "results 應為陣列")

	if len(results) >= 2 {
		r0 := results[0].(map[string]interface{})
		r1 := results[1].(map[string]interface{})
		t.Logf("排序結果: 第一名 entry_id=%v, 第二名 entry_id=%v", r0["entry_id"], r1["entry_id"])

		// 高信心度的 A 應排在前面
		assert.Equal(t, entryA, r0["entry_id"],
			"高信心度的 entry 應排在前面")
	}
}

// --- S-013-07: confidence 上限 1.0 ---

func TestF013_S07_ConfidenceUpperBound(t *testing.T) {
	// WHEN entry 被 confirm 20 次
	// THEN confidence = 1.0（不超過上限）

	authedClient := setupF013Client(t)
	entryID := createF013Entry(t, authedClient, "Confidence 上限測試")

	var lastBody map[string]interface{}
	for i := 0; i < 20; i++ {
		status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/confirm", nil)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, status)
		lastBody = body
	}

	confidence, ok := lastBody["confidence"].(float64)
	require.True(t, ok)
	assert.Equal(t, 1.0, confidence, "confidence 上限應為 1.0")

	confirmations, ok := lastBody["confirmations"].(float64)
	require.True(t, ok)
	assert.Equal(t, float64(20), confirmations, "confirmations 應為 20")
}

// --- S-013-08: confidence 下限 0.0 ---

func TestF013_S08_ConfidenceLowerBound(t *testing.T) {
	// WHEN entry 被 flag 10 次
	// THEN confidence = 0.0（不低於下限）

	authedClient := setupF013Client(t)
	entryID := createF013Entry(t, authedClient, "Confidence 下限測試")

	var lastBody map[string]interface{}
	for i := 0; i < 10; i++ {
		status, body, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/flag", map[string]interface{}{
			"reason": "outdated",
		})
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, status)
		lastBody = body
	}

	confidence, ok := lastBody["confidence"].(float64)
	require.True(t, ok)
	assert.Equal(t, 0.0, confidence, "confidence 下限應為 0.0")

	flagsCount, ok := lastBody["flags_count"].(float64)
	require.True(t, ok)
	assert.Equal(t, float64(10), flagsCount, "flags_count 應為 10")
}

// --- S-013-09: confirm 不存在的 entry → 404 ---

func TestF013_S09_ConfirmNonExistentEntry(t *testing.T) {
	// WHEN POST /api/v1/entries/:id/confirm AND entry 不存在
	// THEN 404 NOT_FOUND

	authedClient := setupF013Client(t)

	status, body, err := authedClient.Do("POST", "/api/v1/entries/00000000-0000-0000-0000-000000000000/confirm", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, status, "confirm 不存在的 entry 應回傳 404")
	AssertErrorCode(t, body, "NOT_FOUND")
}

func TestF013_S09_FlagNonExistentEntry(t *testing.T) {
	// WHEN POST /api/v1/entries/:id/flag AND entry 不存在
	// THEN 404 NOT_FOUND

	authedClient := setupF013Client(t)

	status, body, err := authedClient.Do("POST", "/api/v1/entries/00000000-0000-0000-0000-000000000000/flag", map[string]interface{}{
		"reason": "outdated",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, status, "flag 不存在的 entry 應回傳 404")
	AssertErrorCode(t, body, "NOT_FOUND")
}

// --- S-013-10: 查看 flag 記錄 ---

func TestF013_S10_ListFlags(t *testing.T) {
	// WHEN GET /api/v1/entries/:id/flags
	// AND entry 有 2 筆 flag 記錄
	// THEN 回傳 200 + 2 筆 flag 記錄

	authedClient := setupF013Client(t)
	entryID := createF013Entry(t, authedClient, "Flag 記錄測試")

	// 建立 2 筆 flag
	_, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/flag", map[string]interface{}{
		"reason": "outdated",
		"note":   "第一筆 flag",
	})
	require.NoError(t, err)

	_, _, err = authedClient.Do("POST", "/api/v1/entries/"+entryID+"/flag", map[string]interface{}{
		"reason": "inaccurate",
		"note":   "第二筆 flag",
	})
	require.NoError(t, err)

	// 查看 flag 記錄
	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID+"/flags", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	assert.Equal(t, 2, len(data), "應有 2 筆 flag 記錄")

	// 驗證每筆 flag 的結構
	for _, item := range data {
		flag := item.(map[string]interface{})
		assert.NotEmpty(t, flag["id"], "flag 應有 id")
		assert.Equal(t, entryID, flag["entry_id"], "flag 的 entry_id 應正確")
		assert.NotEmpty(t, flag["reason"], "flag 應有 reason")
		assert.NotEmpty(t, flag["created_at"], "flag 應有 created_at")
	}

	// 驗證 total
	total, ok := body["total"].(float64)
	require.True(t, ok, "回應應包含 total")
	assert.Equal(t, float64(2), total, "total 應為 2")
}

func TestF013_S10_ListFlagsEmpty(t *testing.T) {
	// 沒有 flag 記錄時回傳空陣列

	authedClient := setupF013Client(t)
	entryID := createF013Entry(t, authedClient, "無 Flag 測試")

	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID+"/flags", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	assert.Equal(t, 0, len(data), "無 flag 時應為空陣列")
}

// --- S-013-11: Entry 回應包含信心度欄位 ---

func TestF013_S11_EntryResponseIncludesConfidenceFields(t *testing.T) {
	// WHEN GET /api/v1/entries/:id
	// THEN 回應包含 confidence, confirmations, flags_count, superseded_by

	authedClient := setupF013Client(t)
	entryID := createF013Entry(t, authedClient, "信心度欄位測試")

	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// 驗證預設值
	confidence, ok := body["confidence"].(float64)
	require.True(t, ok, "回應應包含 confidence 欄位")
	assert.True(t, almostEqual(confidence, 0.5),
		"新 entry 的 confidence 預設應為 0.5，實際 %v", confidence)

	confirmations, ok := body["confirmations"].(float64)
	require.True(t, ok, "回應應包含 confirmations 欄位")
	assert.Equal(t, float64(0), confirmations, "新 entry 的 confirmations 預設應為 0")

	flagsCount, ok := body["flags_count"].(float64)
	require.True(t, ok, "回應應包含 flags_count 欄位")
	assert.Equal(t, float64(0), flagsCount, "新 entry 的 flags_count 預設應為 0")

	// superseded_by 應存在但為 null
	_, hasSupersededBy := body["superseded_by"]
	assert.True(t, hasSupersededBy, "回應應包含 superseded_by 欄位")
	assert.Nil(t, body["superseded_by"], "新 entry 的 superseded_by 應為 null")
}

func TestF013_S11_EntryResponseAfterConfirmAndFlag(t *testing.T) {
	// confirm 2 次 + flag 1 次後，GET entry 應反映最新狀態

	authedClient := setupF013Client(t)
	entryID := createF013Entry(t, authedClient, "信心度更新後查詢測試")

	// confirm 2 次
	for i := 0; i < 2; i++ {
		_, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/confirm", nil)
		require.NoError(t, err)
	}

	// flag 1 次
	_, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/flag", map[string]interface{}{
		"reason": "incomplete",
	})
	require.NoError(t, err)

	// GET entry
	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// confidence = 0.5 + 2*0.05 - 1*0.1 = 0.5
	confidence, ok := body["confidence"].(float64)
	require.True(t, ok)
	assert.True(t, almostEqual(confidence, 0.5),
		"confirm 2 次 + flag 1 次後 confidence 應為 0.5，實際 %v", confidence)

	confirmations, ok := body["confirmations"].(float64)
	require.True(t, ok)
	assert.Equal(t, float64(2), confirmations)

	flagsCount, ok := body["flags_count"].(float64)
	require.True(t, ok)
	assert.Equal(t, float64(1), flagsCount)
}

// --- 額外測試：未認證 ---

func TestF013_Error_ConfirmUnauthorized(t *testing.T) {
	// WHEN POST /api/v1/entries/:id/confirm 無 API Key
	// THEN 401

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f013-unauth-confirm")
	authedClient := client.WithKey(key)

	entryID := createF013Entry(t, authedClient, "未認證 Confirm 測試")

	// 用無認證的 client
	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("POST", "/api/v1/entries/"+entryID+"/confirm", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status, "無 API Key 應回傳 401")
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

func TestF013_Error_FlagUnauthorized(t *testing.T) {
	// WHEN POST /api/v1/entries/:id/flag 無 API Key
	// THEN 401

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f013-unauth-flag")
	authedClient := client.WithKey(key)

	entryID := createF013Entry(t, authedClient, "未認證 Flag 測試")

	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("POST", "/api/v1/entries/"+entryID+"/flag", map[string]interface{}{
		"reason": "outdated",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status, "無 API Key 應回傳 401")
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

// --- 額外測試：flag 帶 note ---

func TestF013_FlagWithNote(t *testing.T) {
	// flag 帶 note 欄位應被正確儲存

	authedClient := setupF013Client(t)
	entryID := createF013Entry(t, authedClient, "Flag note 測試")

	_, _, err := authedClient.Do("POST", "/api/v1/entries/"+entryID+"/flag", map[string]interface{}{
		"reason": "outdated",
		"note":   "Go 1.24 已改變此行為",
	})
	require.NoError(t, err)

	// 查看 flags
	status, flagsRaw, err := authedClient.DoRaw("GET", "/api/v1/entries/"+entryID+"/flags", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	var flagsBody map[string]interface{}
	err = json.Unmarshal(flagsRaw, &flagsBody)
	require.NoError(t, err)

	data, ok := flagsBody["data"].([]interface{})
	require.True(t, ok)
	require.Equal(t, 1, len(data))

	flag := data[0].(map[string]interface{})
	assert.Equal(t, "outdated", flag["reason"])
	assert.Equal(t, "Go 1.24 已改變此行為", flag["note"])
}
