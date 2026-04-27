package e2e

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-039: Cookie Session Auth + API Client + SSE
//
// Spec: specs/features/f039-api-sse-auth.md
// Issue: #194
// QA Issue: #198（後端 API 整合測試段落）
//
// 涵蓋：
// - POST /auth/login 200 + Set-Cookie + sessions row created
// - POST /auth/login 401 wrong key
// - POST /auth/login 429 rate limited（5 次/分鐘）
// - POST /auth/logout 204 + sessions row deleted + cookie cleared
// - GET /auth/me with cookie → auth_method=cookie
// - GET /auth/me with X-API-Key → auth_method=api_key
// - GET /entries with cookie 200
// - GET /entries 過期 cookie → 401
// - 滑動續期：< 7 天到期觸發 UPDATE expires_at
//
// 注意：本檔在 dev/F-039 後端尚未合併前以 t.Skip() 跳過；
// engineer 完成後移除 skip。
// ============================================================

const sessionCookieName = "aibo_session"

func sprint13Skip(t *testing.T) {
	t.Helper()
	t.Skip("Wave 1 skeleton：等 F-039 後端 /auth/login + cookie middleware 實作完成")
}

// loginCookie 透過 master api_key 取得 cookie session token
// 回傳：cookie 物件（包含 attributes）+ raw response
func loginCookie(t *testing.T, apiKey string) (*http.Cookie, *http.Response) {
	t.Helper()
	body, _ := json.Marshal(map[string]string{"api_key": apiKey})
	req, err := http.NewRequest("POST", baseURL()+"/api/v1/auth/login", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)

	for _, c := range resp.Cookies() {
		if c.Name == sessionCookieName {
			return c, resp
		}
	}
	return nil, resp
}

// ---------------- Login ----------------

func TestF039_Login_Success_SetCookie(t *testing.T) {
	sprint13Skip(t)

	bootstrap := bootstrapKeyForTest(t)

	cookie, resp := loginCookie(t, bootstrap)
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)
	require.NotNil(t, cookie, "Set-Cookie aibo_session 必存在")

	assert.True(t, cookie.HttpOnly, "cookie 必須 HttpOnly")
	assert.Equal(t, http.SameSiteLaxMode, cookie.SameSite, "cookie 必須 SameSite=Lax")
	assert.Equal(t, "/", cookie.Path)

	// Max-Age 約 30 天 (2592000 秒)，容忍 ±1 天
	assert.GreaterOrEqual(t, cookie.MaxAge, 2592000-86400)
	assert.LessOrEqual(t, cookie.MaxAge, 2592000+86400)

	// Body 應包含 expires_at
	var body struct {
		User      map[string]string `json:"user"`
		ExpiresAt string            `json:"expires_at"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Equal(t, "owner", body.User["label"])
	expires, err := time.Parse(time.RFC3339, body.ExpiresAt)
	require.NoError(t, err)
	assert.WithinDuration(t, time.Now().Add(30*24*time.Hour), expires, 24*time.Hour)
}

func TestF039_Login_WrongKey_401(t *testing.T) {
	sprint13Skip(t)
	cookie, resp := loginCookie(t, "definitely-wrong-key")
	defer resp.Body.Close()
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	assert.Nil(t, cookie)

	var body map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Equal(t, "INVALID_API_KEY", body["error"])
}

func TestF039_Login_RateLimited_429(t *testing.T) {
	sprint13Skip(t)
	// 同一 IP 連發 6 次 wrong key，第 6 次應 429
	var lastStatus int
	for i := 0; i < 6; i++ {
		_, resp := loginCookie(t, "wrong-key")
		lastStatus = resp.StatusCode
		resp.Body.Close()
	}
	assert.Equal(t, http.StatusTooManyRequests, lastStatus)
}

// ---------------- Logout ----------------

func TestF039_Logout_204_ClearsCookie(t *testing.T) {
	sprint13Skip(t)
	bootstrap := bootstrapKeyForTest(t)
	cookie, resp := loginCookie(t, bootstrap)
	resp.Body.Close()
	require.NotNil(t, cookie)

	// 帶 cookie 呼叫 /auth/logout
	req, _ := http.NewRequest("POST", baseURL()+"/api/v1/auth/logout", nil)
	req.AddCookie(cookie)
	logoutResp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer logoutResp.Body.Close()

	assert.Equal(t, http.StatusNoContent, logoutResp.StatusCode)

	// Set-Cookie 必須有清除指令（Max-Age=0 或 expires past）
	cleared := false
	for _, c := range logoutResp.Cookies() {
		if c.Name == sessionCookieName && (c.MaxAge < 0 || c.MaxAge == 0 || c.Expires.Before(time.Now())) {
			cleared = true
		}
	}
	assert.True(t, cleared, "logout response 必須含清除 cookie 指令")

	// 之後用 same cookie 應 401
	req2, _ := http.NewRequest("GET", baseURL()+"/api/v1/auth/me", nil)
	req2.AddCookie(cookie)
	r2, err := http.DefaultClient.Do(req2)
	require.NoError(t, err)
	r2.Body.Close()
	assert.Equal(t, http.StatusUnauthorized, r2.StatusCode)
}

// ---------------- /auth/me ----------------

func TestF039_Me_WithCookie_AuthMethodCookie(t *testing.T) {
	sprint13Skip(t)
	bootstrap := bootstrapKeyForTest(t)
	cookie, resp := loginCookie(t, bootstrap)
	resp.Body.Close()
	require.NotNil(t, cookie)

	req, _ := http.NewRequest("GET", baseURL()+"/api/v1/auth/me", nil)
	req.AddCookie(cookie)
	r, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer r.Body.Close()

	assert.Equal(t, http.StatusOK, r.StatusCode)
	var body map[string]string
	require.NoError(t, json.NewDecoder(r.Body).Decode(&body))
	assert.Equal(t, "owner", body["label"])
	assert.Equal(t, "cookie", body["auth_method"])
}

func TestF039_Me_WithApiKey_AuthMethodApiKey(t *testing.T) {
	sprint13Skip(t)
	apiKey := bootstrapKeyForTest(t)

	req, _ := http.NewRequest("GET", baseURL()+"/api/v1/auth/me", nil)
	req.Header.Set("X-API-Key", apiKey)
	r, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer r.Body.Close()

	assert.Equal(t, http.StatusOK, r.StatusCode)
	var body map[string]string
	require.NoError(t, json.NewDecoder(r.Body).Decode(&body))
	assert.Equal(t, "api_key", body["auth_method"])
}

func TestF039_Me_BothCookieAndApiKey_PrefersCookie(t *testing.T) {
	sprint13Skip(t)
	apiKey := bootstrapKeyForTest(t)
	cookie, resp := loginCookie(t, apiKey)
	resp.Body.Close()
	require.NotNil(t, cookie)

	req, _ := http.NewRequest("GET", baseURL()+"/api/v1/auth/me", nil)
	req.AddCookie(cookie)
	req.Header.Set("X-API-Key", apiKey)
	r, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer r.Body.Close()

	var body map[string]string
	require.NoError(t, json.NewDecoder(r.Body).Decode(&body))
	assert.Equal(t, "cookie", body["auth_method"], "同時帶兩種時，優先 cookie")
}

// ---------------- /entries ----------------

func TestF039_Entries_WithCookie_200(t *testing.T) {
	sprint13Skip(t)
	bootstrap := bootstrapKeyForTest(t)
	cookie, resp := loginCookie(t, bootstrap)
	resp.Body.Close()
	require.NotNil(t, cookie)

	req, _ := http.NewRequest("GET", baseURL()+"/api/v1/entries", nil)
	req.AddCookie(cookie)
	r, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	r.Body.Close()
	assert.Equal(t, http.StatusOK, r.StatusCode)
}

func TestF039_Entries_ExpiredCookie_401(t *testing.T) {
	sprint13Skip(t)
	bootstrap := bootstrapKeyForTest(t)
	cookie, resp := loginCookie(t, bootstrap)
	resp.Body.Close()
	require.NotNil(t, cookie)

	// 透過 test-only endpoint 把 sessions row 設為過期
	expireBody, _ := json.Marshal(map[string]string{"token": cookie.Value})
	expireReq, _ := http.NewRequest("POST", baseURL()+"/api/v1/__test/sessions/expire", bytes.NewReader(expireBody))
	expireReq.Header.Set("Content-Type", "application/json")
	expireResp, err := http.DefaultClient.Do(expireReq)
	require.NoError(t, err)
	expireResp.Body.Close()

	req, _ := http.NewRequest("GET", baseURL()+"/api/v1/entries", nil)
	req.AddCookie(cookie)
	r, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	r.Body.Close()
	assert.Equal(t, http.StatusUnauthorized, r.StatusCode)
}

// ---------------- 滑動續期 ----------------

func TestF039_SlidingRenewal_When_Expires_Lt_7Days(t *testing.T) {
	sprint13Skip(t)
	bootstrap := bootstrapKeyForTest(t)
	cookie, resp := loginCookie(t, bootstrap)
	resp.Body.Close()
	require.NotNil(t, cookie)

	// 透過 test endpoint 把 sessions.expires_at 設為 5 天後
	body, _ := json.Marshal(map[string]any{"token": cookie.Value, "days": 5})
	soonReq, _ := http.NewRequest("POST", baseURL()+"/api/v1/__test/sessions/expire-soon", bytes.NewReader(body))
	soonReq.Header.Set("Content-Type", "application/json")
	soonResp, err := http.DefaultClient.Do(soonReq)
	require.NoError(t, err)
	soonResp.Body.Close()

	// 任一 API 請求觸發續期
	apiReq, _ := http.NewRequest("GET", baseURL()+"/api/v1/entries", nil)
	apiReq.AddCookie(cookie)
	r, err := http.DefaultClient.Do(apiReq)
	require.NoError(t, err)
	r.Body.Close()

	// 用 test endpoint 取出 sessions.expires_at 驗證是否 ~30 天後
	q, _ := http.NewRequest("GET", baseURL()+"/api/v1/__test/sessions/inspect?token="+cookie.Value, nil)
	insp, err := http.DefaultClient.Do(q)
	require.NoError(t, err)
	defer insp.Body.Close()
	require.Equal(t, http.StatusOK, insp.StatusCode)

	var inspBody struct {
		ExpiresAt string `json:"expires_at"`
	}
	require.NoError(t, json.NewDecoder(insp.Body).Decode(&inspBody))
	expires, err := time.Parse(time.RFC3339, inspBody.ExpiresAt)
	require.NoError(t, err)
	assert.WithinDuration(t, time.Now().Add(30*24*time.Hour), expires, 24*time.Hour)
}

// ---------------- helpers ----------------

// bootstrapKeyForTest 取得當前 test API 的 master api_key
// 優先用 AIBO_E2E_API_KEY；否則 fresh DB 上呼叫 POST /auth/api-keys
func bootstrapKeyForTest(t *testing.T) string {
	t.Helper()
	if k := strings.TrimSpace(os.Getenv("AIBO_E2E_API_KEY")); k != "" {
		return k
	}
	body, _ := json.Marshal(map[string]string{"name": "f039-test"})
	req, _ := http.NewRequest("POST", baseURL()+"/api/v1/auth/api-keys", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("bootstrap api key failed: %d", resp.StatusCode)
	}
	var b struct {
		Key string `json:"key"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&b))
	return b.Key
}

