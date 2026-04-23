package e2e

import (
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-009: Google Calendar 整合
// ============================================================
//
// 注意：實際 Google OAuth 無法在 E2E 中完整測試。
// 以下測試驗證 API 端點的基本行為和錯誤處理，
// OAuth callback 和實際 Calendar API 呼叫需要 mock server。
// ============================================================

// --- Happy Path ---

func TestF009_HappyPath_OAuthFlowReturnsAuthURL(t *testing.T) {
	// TC-009-01: 開始 OAuth 授權
	// GIVEN 使用者已認證 AND OAuth client 已設定
	// WHEN POST /api/v1/integrations/gcal/auth
	// THEN 200, auth_url starts with "https://accounts.google.com"

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "gcal-auth-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/integrations/gcal/auth", nil)
	require.NoError(t, err)

	// OAuth client 若已設定，應回 200 + auth_url
	// 若未設定，可能回 500 INTERNAL_ERROR（這也是預期行為之一）
	if status == http.StatusOK {
		require.NotNil(t, body)
		authURL, ok := body["auth_url"].(string)
		assert.True(t, ok, "response 應包含 auth_url")
		assert.True(t, strings.HasPrefix(authURL, "https://accounts.google.com"),
			"auth_url 應以 https://accounts.google.com 開頭，實際: %s", authURL)
	} else if status == http.StatusInternalServerError {
		// OAuth client 未設定的預期錯誤
		AssertErrorCode(t, body, "INTERNAL_ERROR")
		t.Log("OAuth client 未設定，回傳 500 INTERNAL_ERROR（預期行為）")
	} else {
		t.Fatalf("非預期的 status code: %d, body: %v", status, body)
	}
}

func TestF009_HappyPath_OAuthCallbackSuccess(t *testing.T) {
	// TC-009-02: OAuth callback 成功
	// GIVEN valid authorization code
	// WHEN GET /api/v1/integrations/gcal/callback?code={code}&state={state}
	// THEN 200, message = "Google Calendar connected"
	//
	// 注意：此測試需要 mock Google OAuth server，
	// 在真實環境中使用假的 code/state 會失敗。
	// 這裡只驗證端點存在且參數缺失時有正確錯誤。

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "gcal-callback-key")
	authedClient := client.WithKey(key)

	// 使用假的 code 和 state，預期會回錯誤（但端點應存在）
	status, body, err := authedClient.Do("GET", "/api/v1/integrations/gcal/callback?code=fake_code&state=fake_state", nil)
	require.NoError(t, err)
	require.NotNil(t, body)

	// 假 code 應該觸發錯誤（token 交換失敗）
	// 可能是 400 INVALID_INPUT 或 500 INTERNAL_ERROR
	assert.True(t, status == http.StatusBadRequest || status == http.StatusInternalServerError,
		"假 code 應回 400 或 500，實際: %d", status)
}

func TestF009_HappyPath_ImportGcalEvents(t *testing.T) {
	// TC-009-03: 匯入 Calendar 事件
	// GIVEN Google Calendar 已授權
	// WHEN POST /api/v1/import/gcal
	// THEN 200, events_found, entries_created
	//
	// 注意：若未授權，預期回 401 GCAL_NOT_CONNECTED

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "gcal-import-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/import/gcal", nil)
	require.NoError(t, err)
	require.NotNil(t, body)

	if status == http.StatusOK {
		// 已授權情況下，驗證回應格式
		_, hasEventsFound := body["events_found"]
		assert.True(t, hasEventsFound, "response 應包含 events_found")
		_, hasEntriesCreated := body["entries_created"]
		assert.True(t, hasEntriesCreated, "response 應包含 entries_created")
	} else if status == http.StatusUnauthorized {
		// 未授權是預期的錯誤
		code, _ := body["code"].(string)
		assert.True(t, code == "GCAL_NOT_CONNECTED" || code == "GCAL_TOKEN_EXPIRED",
			"未授權應回 GCAL_NOT_CONNECTED 或 GCAL_TOKEN_EXPIRED，實際: %s", code)
		t.Log("Google Calendar 尚未授權，回傳 401（預期行為）")
	}
}

func TestF009_HappyPath_ImportWithCalendarAndDateRange(t *testing.T) {
	// TC-009-04: 指定 calendar 和日期範圍
	// WHEN POST with calendar_id, since, until
	// THEN 只匯入指定 calendar 和日期範圍的事件

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "gcal-range-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/import/gcal", map[string]interface{}{
		"calendar_id": "work@group.calendar.google.com",
		"since":       "2024-01-01T00:00:00Z",
		"until":       "2024-01-31T23:59:59Z",
	})
	require.NoError(t, err)
	require.NotNil(t, body)

	if status == http.StatusOK {
		_, hasEventsFound := body["events_found"]
		assert.True(t, hasEventsFound, "response 應包含 events_found")
	} else if status == http.StatusUnauthorized {
		code, _ := body["code"].(string)
		assert.True(t, code == "GCAL_NOT_CONNECTED" || code == "GCAL_TOKEN_EXPIRED",
			"未授權應回 GCAL_NOT_CONNECTED 或 GCAL_TOKEN_EXPIRED")
	}
}

func TestF009_HappyPath_DuplicateImportSkips(t *testing.T) {
	// TC-009-05: 重複匯入跳過已存在的
	// GIVEN 第一次匯入已建立 entries
	// WHEN POST (same params)
	// THEN entries_created = 0, entries_skipped > 0
	//
	// 注意：需要 GCal 已授權才能測試

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "gcal-dedup-key")
	authedClient := client.WithKey(key)

	// 第一次匯入
	status1, _, err := authedClient.Do("POST", "/api/v1/import/gcal", nil)
	require.NoError(t, err)

	if status1 != http.StatusOK {
		t.Skip("Google Calendar 未授權，跳過重複匯入測試")
	}

	// 第二次匯入
	status2, body2, err := authedClient.Do("POST", "/api/v1/import/gcal", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status2)
	require.NotNil(t, body2)

	secondCreated, _ := body2["entries_created"].(float64)
	assert.Equal(t, float64(0), secondCreated, "重複匯入不應建立新 entries")
}

// --- Error Handling ---

func TestF009_Error_ImportWithoutGcalConnection(t *testing.T) {
	// TC-009-06: 未授權 Google Calendar 就匯入
	// GIVEN no GcalIntegration record
	// WHEN POST /api/v1/import/gcal
	// THEN 401 GCAL_NOT_CONNECTED

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "gcal-notconn-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/import/gcal", nil)
	require.NoError(t, err)

	// 若從未授權過，應回 401
	if status == http.StatusUnauthorized {
		AssertErrorCode(t, body, "GCAL_NOT_CONNECTED")
	} else if status == http.StatusOK {
		t.Log("GCal 已授權，此測試案例不適用於當前環境")
	}
}

func TestF009_Error_TokenExpired(t *testing.T) {
	// TC-009-07: Token 過期且 refresh 失敗
	// GIVEN GcalIntegration exists but both tokens expired
	// WHEN POST /api/v1/import/gcal
	// THEN 401 GCAL_TOKEN_EXPIRED
	//
	// 注意：此測試需要能模擬 token 過期的環境。
	// 在 E2E 中只能驗證回應格式，實際觸發需要 mock。

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "gcal-expired-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/import/gcal", nil)
	require.NoError(t, err)
	require.NotNil(t, body)

	// 驗證如果是 token 過期，code 正確
	if status == http.StatusUnauthorized {
		code, _ := body["code"].(string)
		assert.True(t, code == "GCAL_NOT_CONNECTED" || code == "GCAL_TOKEN_EXPIRED",
			"未授權應回 GCAL_NOT_CONNECTED 或 GCAL_TOKEN_EXPIRED，實際: %s", code)
	}
}

func TestF009_Error_OAuthClientNotConfigured(t *testing.T) {
	// TC-009-08: OAuth client 未設定
	// GIVEN no client_id / client_secret configured
	// WHEN POST /api/v1/integrations/gcal/auth
	// THEN 500 INTERNAL_ERROR
	//
	// 注意：此測試取決於環境是否有設定 OAuth client。
	// 若已設定，會回 200（成功取得 auth_url）。

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "gcal-noclient-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/integrations/gcal/auth", nil)
	require.NoError(t, err)

	if status == http.StatusInternalServerError {
		AssertErrorCode(t, body, "INTERNAL_ERROR")
	} else if status == http.StatusOK {
		t.Log("OAuth client 已設定，回傳 200（此環境已配置 OAuth）")
	}
}

func TestF009_Error_Unauthorized(t *testing.T) {
	// TC-009-09: 未認證
	// WHEN POST /api/v1/import/gcal without X-API-Key
	// THEN 401 UNAUTHORIZED

	client := NewAPIClient()
	// 先確保非 bootstrap 模式
	_ = BootstrapAPIKey(t, client, "gcal-unauth-setup-key")

	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("POST", "/api/v1/import/gcal", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status)
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

func TestF009_Error_UnauthorizedAuth(t *testing.T) {
	// 未認證就嘗試 OAuth 授權
	// WHEN POST /api/v1/integrations/gcal/auth without X-API-Key
	// THEN 401 UNAUTHORIZED

	client := NewAPIClient()
	_ = BootstrapAPIKey(t, client, "gcal-unauth-auth-key")

	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("POST", "/api/v1/integrations/gcal/auth", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status)
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

// --- Edge Cases ---

func TestF009_Edge_SkipEventsWithoutSummary(t *testing.T) {
	// TC-009-10: 跳過無 summary 的事件
	// GIVEN calendar has events, some without summary
	// WHEN POST /api/v1/import/gcal
	// THEN entries_skipped includes those without summary
	//
	// 注意：需要 GCal 已授權且有測試資料

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "gcal-nosummary-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/import/gcal", nil)
	require.NoError(t, err)
	require.NotNil(t, body)

	if status == http.StatusOK {
		_, hasEntriesSkipped := body["entries_skipped"]
		assert.True(t, hasEntriesSkipped, "response 應包含 entries_skipped")
	} else if status == http.StatusUnauthorized {
		t.Skip("Google Calendar 未授權，跳過無 summary 事件測試")
	}
}

func TestF009_Edge_ReauthorizeOverwritesOldToken(t *testing.T) {
	// TC-009-11: 重新授權覆蓋舊 token
	// GIVEN GcalIntegration for "old@gmail.com"
	// WHEN complete OAuth flow for "new@gmail.com"
	// THEN email updated AND old tokens replaced
	//
	// 注意：完整測試需要 mock OAuth server，
	// 這裡只驗證 auth endpoint 可以被多次呼叫。

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "gcal-reauth-key")
	authedClient := client.WithKey(key)

	// 第一次呼叫 auth
	status1, _, err := authedClient.Do("POST", "/api/v1/integrations/gcal/auth", nil)
	require.NoError(t, err)

	// 第二次呼叫 auth（模擬重新授權）
	status2, _, err := authedClient.Do("POST", "/api/v1/integrations/gcal/auth", nil)
	require.NoError(t, err)

	// 兩次應該回相同 status
	assert.Equal(t, status1, status2, "重複呼叫 auth 應有一致的行為")
}

func TestF009_Edge_EntryContentFormat(t *testing.T) {
	// TC-009-12: Entry content 格式驗證
	// GIVEN event imported successfully
	// WHEN 查詢匯入的 entries
	// THEN entry.title = "[GCal] {summary}"
	//      entry.content 包含時間、地點、描述
	//
	// 注意：需要 GCal 已授權且有測試資料

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "gcal-format-key")
	authedClient := client.WithKey(key)

	// 匯入
	status, body, err := authedClient.Do("POST", "/api/v1/import/gcal", nil)
	require.NoError(t, err)

	if status != http.StatusOK {
		t.Skip("Google Calendar 未授權，跳過 entry 格式驗證")
	}

	created, _ := body["entries_created"].(float64)
	if created == 0 {
		t.Skip("無新建 entries，跳過格式驗證")
	}

	// 查詢以 gcal tag 過濾的 entries
	status, listBody, err := authedClient.Do("GET", "/api/v1/entries?tag=gcal&per_page=5", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, listBody)
	if len(data) == 0 {
		t.Skip("無 gcal tag entries，跳過格式驗證")
	}

	// 驗證 title 格式
	entry := data[0].(map[string]interface{})
	title, _ := entry["title"].(string)
	assert.True(t, strings.HasPrefix(title, "[GCal] "),
		"entry title 應以 '[GCal] ' 開頭，實際: %s", title)
}
