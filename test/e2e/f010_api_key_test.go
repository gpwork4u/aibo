package e2e

import (
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-010: API Key 認證
// ============================================================

// --- Happy Path ---

func TestF010_HappyPath_BootstrapCreateFirstAPIKey(t *testing.T) {
	// GIVEN 資料庫中無任何 API Key
	// WHEN POST /api/v1/auth/api-keys with { "name": "default" } without X-API-Key header
	// THEN response status = 201
	// AND response body key starts with "aibo_"
	// AND response body key length = 37
	// AND response body key_prefix = key 的前 10 字元

	client := NewAPIClient()
	// 確保 bootstrap 狀態（無認證 header）

	status, body, err := client.Do("POST", "/api/v1/auth/api-keys", map[string]interface{}{
		"name": "default",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)

	// 驗證 key 格式
	key, ok := body["key"].(string)
	require.True(t, ok, "response 應包含 key")
	assert.True(t, strings.HasPrefix(key, "aibo_"), "key 應以 aibo_ 開頭")
	assert.Equal(t, 37, len(key), "key 長度應為 37（aibo_ + 32 chars）")

	// 驗證 key_prefix
	keyPrefix, ok := body["key_prefix"].(string)
	require.True(t, ok, "response 應包含 key_prefix")
	assert.Equal(t, key[:10], keyPrefix, "key_prefix 應等於 key 的前 10 字元")

	// 驗證其他欄位
	assert.Equal(t, "default", body["name"])
	assert.NotEmpty(t, body["id"])
	assert.NotEmpty(t, body["created_at"])

	// 清理：保留此 key 供後續測試使用
	t.Cleanup(func() {
		// bootstrap key 在其他測試中清理
	})
}

func TestF010_HappyPath_AuthenticateWithAPIKey(t *testing.T) {
	// GIVEN API Key exists and is active
	// WHEN GET /api/v1/entries with valid X-API-Key
	// THEN response status = 200
	// AND last_used_at updated

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "auth-test-key")

	authedClient := client.WithKey(key)
	status, _, err := authedClient.Do("GET", "/api/v1/entries", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status, "使用有效 API Key 應回 200")

	// 驗證 last_used_at 已更新
	status, body, err := authedClient.Do("GET", "/api/v1/auth/api-keys", nil)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	require.True(t, len(data) > 0)

	firstKey := data[0].(map[string]interface{})
	assert.NotNil(t, firstKey["last_used_at"], "last_used_at 應已更新")
}

func TestF010_HappyPath_CreateSecondAPIKey(t *testing.T) {
	// GIVEN API Key "default" exists
	// WHEN POST with { "name": "ci-bot", "expires_at": "2027-12-31T23:59:59Z" } with valid key
	// THEN 201

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "first-key")

	authedClient := client.WithKey(key)
	expires := "2027-12-31T23:59:59Z"
	status, body, err := authedClient.Do("POST", "/api/v1/auth/api-keys", map[string]interface{}{
		"name":       "ci-bot",
		"expires_at": expires,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
	assert.Equal(t, "ci-bot", body["name"])

	// expires_at 應包含指定時間
	expiresAt, ok := body["expires_at"].(string)
	require.True(t, ok)
	assert.Contains(t, expiresAt, "2027-12-31")
}

func TestF010_HappyPath_ListAllAPIKeys(t *testing.T) {
	// GIVEN 2 keys exist
	// WHEN GET /api/v1/auth/api-keys
	// THEN 200, data length=2, 有 key_prefix 無 key

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "list-key-1")

	authedClient := client.WithKey(key)
	CreateAPIKeyWithAuth(t, authedClient, "list-key-2", nil)

	status, body, err := authedClient.Do("GET", "/api/v1/auth/api-keys", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	assert.Equal(t, 2, len(data), "應有 2 把 keys")

	// 驗證每筆都有 key_prefix 而非完整 key
	for _, item := range data {
		k := item.(map[string]interface{})
		assert.NotEmpty(t, k["key_prefix"], "應有 key_prefix")
		assert.Nil(t, k["key"], "列表不應回傳完整 key")
		assert.NotNil(t, k["is_active"])
	}
}

func TestF010_HappyPath_RevokeAPIKey(t *testing.T) {
	// GIVEN 2 active keys
	// WHEN DELETE one
	// THEN 204, 被刪除的 key 無法再認證

	client := NewAPIClient()
	key1 := BootstrapAPIKey(t, client, "revoke-key-1")

	authedClient := client.WithKey(key1)
	id2, key2 := CreateAPIKeyWithAuth(t, authedClient, "revoke-key-2", nil)

	// 用 key1 刪除 key2
	status, _, err := authedClient.Do("DELETE", "/api/v1/auth/api-keys/"+id2, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, status)

	// 被刪除的 key2 無法再認證
	client2 := client.WithKey(key2)
	status, _, err = client2.Do("GET", "/api/v1/entries", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status, "已刪除的 key 應回 401")
}

// --- Error Handling ---

func TestF010_Error_InvalidAPIKey(t *testing.T) {
	// WHEN GET /api/v1/entries with X-API-Key: "invalid-key"
	// THEN response status = 401, code = "UNAUTHORIZED"

	client := NewAPIClient()
	// 先確保有 key 存在（非 bootstrap 狀態）
	key := BootstrapAPIKey(t, client, "invalid-test-key")
	_ = key

	invalidClient := client.WithKey("invalid-key-12345")
	status, body, err := invalidClient.Do("GET", "/api/v1/entries", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status)
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

func TestF010_Error_MissingAPIKeyHeader(t *testing.T) {
	// GIVEN 至少一把 API key 存在
	// WHEN GET /api/v1/entries without X-API-Key header
	// THEN response status = 401

	client := NewAPIClient()
	// 先建立一把 key（bootstrap）
	_ = BootstrapAPIKey(t, client, "missing-header-key")

	// 不帶 API Key header
	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("GET", "/api/v1/entries", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status)
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

func TestF010_Error_ExpiredAPIKey(t *testing.T) {
	// GIVEN API Key exists with expires_at = 過去時間
	// WHEN GET /api/v1/entries with the expired key
	// THEN response status = 401

	// 注意：需要能在 DB 直接設定過期時間的 key
	// 這裡透過 API 建立一個即將過期的 key（或需要 DB 直接操作）
	// 目前先用 API 建立帶過去 expires_at 的 key（應被 API 拒絕）
	// 因此此測試可能需要直接操作 DB 或 mock time

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "expired-test-key")
	authedClient := client.WithKey(key)

	// 嘗試建立過期的 key（API 應拒絕，因為 expires_at 是過去時間）
	status, body, err := authedClient.Do("POST", "/api/v1/auth/api-keys", map[string]interface{}{
		"name":       "already-expired",
		"expires_at": "2020-01-01T00:00:00Z",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status, "建立過期 key 應被拒絕")
	AssertErrorCode(t, body, "INVALID_INPUT")

	// TODO: 需要 DB 層面的 helper 來直接建立過期 key 並測試認證失敗
	t.Log("完整的過期 key 認證測試需要 DB 直接操作")
}

func TestF010_Error_CannotDeleteLastActiveKey(t *testing.T) {
	// GIVEN only 1 active, non-expired API key exists
	// WHEN DELETE /api/v1/auth/api-keys/{id}
	// THEN response status = 400, code = "LAST_KEY_PROTECTED"

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "last-key")
	authedClient := client.WithKey(key)

	// 取得這把 key 的 id
	status, body, err := authedClient.Do("GET", "/api/v1/auth/api-keys", nil)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	require.Equal(t, 1, len(data))
	keyID := data[0].(map[string]interface{})["id"].(string)

	// 嘗試刪除最後一把 key
	status, body, err = authedClient.Do("DELETE", "/api/v1/auth/api-keys/"+keyID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "LAST_KEY_PROTECTED")
}

func TestF010_Error_DuplicateKeyName(t *testing.T) {
	// GIVEN API Key with name = "default" exists
	// WHEN POST with { "name": "default" }
	// THEN response status = 409, code = "DUPLICATE_KEY_NAME"

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "dup-name")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/auth/api-keys", map[string]interface{}{
		"name": "dup-name",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusConflict, status)
	AssertErrorCode(t, body, "DUPLICATE_KEY_NAME")
}

func TestF010_Error_EmptyName(t *testing.T) {
	// WHEN POST with { "name": "" }
	// THEN response status = 400, code = "INVALID_INPUT"

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "empty-name-test")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/auth/api-keys", map[string]interface{}{
		"name": "",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF010_Error_ExpiresAtInPast(t *testing.T) {
	// WHEN POST with expires_at = 過去時間
	// THEN response status = 400, code = "INVALID_INPUT"

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "past-expire-test")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/auth/api-keys", map[string]interface{}{
		"name":       "past-key",
		"expires_at": "2020-01-01T00:00:00Z",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

// --- Edge Cases ---

func TestF010_Edge_BootstrapThenRequireAuth(t *testing.T) {
	// GIVEN 資料庫中無任何 API Key
	// WHEN POST bootstrap（成功 201）
	// THEN 之後 POST 不帶 header → 401

	client := NewAPIClient()
	_ = BootstrapAPIKey(t, client, "bootstrap-edge")

	// 第二次不帶 API Key
	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("POST", "/api/v1/auth/api-keys", map[string]interface{}{
		"name": "second-no-auth",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status, "bootstrap 後應需要認證")
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

func TestF010_Edge_MultipleKeysOnlyOneActive(t *testing.T) {
	// GIVEN key #1 active, key #2 inactive（透過 revoke）, key #3 expired
	// WHEN DELETE key #1
	// THEN 400 LAST_KEY_PROTECTED

	// 此測試需要能建立 inactive 和 expired keys
	// 目前先驗證：2 把 key 中刪除 1 把後，剩下的不能刪

	client := NewAPIClient()
	key1 := BootstrapAPIKey(t, client, "multi-key-1")
	authedClient := client.WithKey(key1)

	id2, _ := CreateAPIKeyWithAuth(t, authedClient, "multi-key-2", nil)

	// 刪除 key2（成功）
	status, _, err := authedClient.Do("DELETE", "/api/v1/auth/api-keys/"+id2, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, status)

	// 取得 key1 的 id
	status, body, err := authedClient.Do("GET", "/api/v1/auth/api-keys", nil)
	require.NoError(t, err)
	data := GetDataArray(t, body)
	require.Equal(t, 1, len(data), "應只剩 1 把 key")
	key1ID := data[0].(map[string]interface{})["id"].(string)

	// 嘗試刪除最後一把 → 400
	status, body, err = authedClient.Do("DELETE", "/api/v1/auth/api-keys/"+key1ID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "LAST_KEY_PROTECTED")
}

func TestF010_Edge_DeleteNonLastActiveKey(t *testing.T) {
	// GIVEN 2 把 active keys
	// WHEN DELETE 其中一把
	// THEN 204

	client := NewAPIClient()
	key1 := BootstrapAPIKey(t, client, "del-nonlast-1")
	authedClient := client.WithKey(key1)

	id2, _ := CreateAPIKeyWithAuth(t, authedClient, "del-nonlast-2", nil)

	status, _, err := authedClient.Do("DELETE", "/api/v1/auth/api-keys/"+id2, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, status)
}

func TestF010_Edge_NameExactly50Chars(t *testing.T) {
	// WHEN POST with name = 50 字
	// THEN 201

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "name50-bootstrap")
	authedClient := client.WithKey(key)

	longName := RepeatStr("a", 50)
	status, body, err := authedClient.Do("POST", "/api/v1/auth/api-keys", map[string]interface{}{
		"name": longName,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
	assert.Equal(t, longName, body["name"])
}

func TestF010_Edge_ExpiresAtNull(t *testing.T) {
	// WHEN POST with expires_at = null
	// THEN 201, expires_at = null

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "null-expire-boot")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/auth/api-keys", map[string]interface{}{
		"name":       "permanent-key",
		"expires_at": nil,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
	assert.Nil(t, body["expires_at"], "expires_at 應為 null")
}
