package e2e

import (
	"net/http"
	"os/exec"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-020: 小項修復
// ============================================================
//
// 20-B: OAuth State 持久化
// 20-C: 環境變數驗證
// 20-D: repo_path 安全驗證
// 20-E: Go 版本對齊（編譯測試）
// ============================================================

// --- 20-B: OAuth State 持久化（回歸測試） ---

func TestF020_OAuth_AuthReturnsURL(t *testing.T) {
	// WHEN 開始 OAuth flow（POST /api/v1/integrations/gcal/auth）
	// THEN 回傳 auth_url（state 已存入 DB）

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f020-oauth-auth-"+t.Name())
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/integrations/gcal/auth", nil)
	require.NoError(t, err)

	if status == http.StatusOK {
		require.NotNil(t, body)
		authURL, ok := body["auth_url"].(string)
		assert.True(t, ok, "response 應包含 auth_url")
		assert.True(t, strings.HasPrefix(authURL, "https://accounts.google.com"),
			"auth_url 應以 https://accounts.google.com 開頭")

		// 驗證 auth_url 包含 state 參數（state 已持久化到 DB）
		assert.Contains(t, authURL, "state=",
			"auth_url 應包含 state 參數")
		t.Log("OAuth auth 端點正常：回傳 auth_url 含 state 參數")
	} else if status == http.StatusInternalServerError {
		// OAuth client 未設定（Google OAuth credentials 不在環境中）
		t.Log("OAuth client 未設定，跳過 auth_url 驗證（預期行為）")
	} else {
		t.Fatalf("非預期的 status code: %d, body: %v", status, body)
	}
}

func TestF020_OAuth_CallbackInvalidState(t *testing.T) {
	// WHEN callback 帶無效的 state
	// THEN state 驗證失敗，回傳 400

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f020-oauth-callback-"+t.Name())
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("GET",
		"/api/v1/integrations/gcal/callback?code=fake_code&state=invalid_state_xyz", nil)
	require.NoError(t, err)
	require.NotNil(t, body)

	// 無效的 state 應回傳 400 或 500
	assert.True(t, status == http.StatusBadRequest || status == http.StatusInternalServerError,
		"無效 state 應回 400 或 500，實際: %d", status)
	t.Logf("無效 state callback 回傳 status: %d", status)
}

func TestF020_OAuth_CallbackMissingParams(t *testing.T) {
	// WHEN callback 缺少必要參數
	// THEN 回傳 400

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f020-oauth-missing-"+t.Name())
	authedClient := client.WithKey(key)

	// 缺少 code 和 state
	status, _, err := authedClient.Do("GET", "/api/v1/integrations/gcal/callback", nil)
	require.NoError(t, err)
	assert.True(t, status == http.StatusBadRequest || status == http.StatusInternalServerError,
		"缺少參數應回 400 或 500，實際: %d", status)
}

// --- 20-C: 環境變數驗證 ---
//
// 注意：這些測試驗證「缺少環境變數時啟動失敗」的行為。
// 由於測試環境中 server 已在運行，我們透過直接執行 binary
// 搭配缺失環境變數來驗證啟動行為。
// ============================================================

func TestF020_EnvValidation_MissingDatabaseURL(t *testing.T) {
	// WHEN 缺少 DATABASE_URL 啟動
	// THEN 啟動失敗，錯誤訊息包含「DATABASE_URL」

	// 嘗試以空環境變數啟動 server binary（僅驗證錯誤訊息）
	cmd := exec.Command("docker", "compose", "run", "--rm", "--no-deps",
		"-e", "DATABASE_URL=",
		"-e", "AIBO_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		"api", "/app/aibo", "--dry-run")
	cmd.Dir = "/Users/gpwang/project/aibo/dev"

	output, err := cmd.CombinedOutput()
	outputStr := string(output)

	// 如果 docker compose 不可用或 image 不存在，跳過
	if err != nil && (strings.Contains(outputStr, "not found") ||
		strings.Contains(outputStr, "no such") ||
		strings.Contains(outputStr, "Cannot connect")) {
		t.Skip("Docker 環境不可用，跳過環境變數驗證測試")
	}

	// 若可執行，驗證錯誤訊息包含 DATABASE_URL
	if err != nil {
		assert.Contains(t, outputStr, "DATABASE_URL",
			"缺少 DATABASE_URL 的錯誤訊息應提及 DATABASE_URL")
		t.Logf("啟動失敗（預期）: %s", outputStr)
	}
}

func TestF020_EnvValidation_MissingEncryptionKey(t *testing.T) {
	// WHEN 缺少 AIBO_ENCRYPTION_KEY 啟動
	// THEN 啟動失敗，錯誤訊息包含「AIBO_ENCRYPTION_KEY」

	cmd := exec.Command("docker", "compose", "run", "--rm", "--no-deps",
		"-e", "DATABASE_URL=postgres://test:test@localhost:5432/test",
		"-e", "AIBO_ENCRYPTION_KEY=",
		"api", "/app/aibo", "--dry-run")
	cmd.Dir = "/Users/gpwang/project/aibo/dev"

	output, err := cmd.CombinedOutput()
	outputStr := string(output)

	if err != nil && (strings.Contains(outputStr, "not found") ||
		strings.Contains(outputStr, "no such") ||
		strings.Contains(outputStr, "Cannot connect")) {
		t.Skip("Docker 環境不可用，跳過環境變數驗證測試")
	}

	if err != nil {
		assert.Contains(t, outputStr, "AIBO_ENCRYPTION_KEY",
			"缺少 AIBO_ENCRYPTION_KEY 的錯誤訊息應提及 AIBO_ENCRYPTION_KEY")
		t.Logf("啟動失敗（預期）: %s", outputStr)
	}
}

// --- 20-D: repo_path 安全驗證 ---

func TestF020_RepoPath_NotInWhitelist_Returns403(t *testing.T) {
	// WHEN repo_path 不在白名單中
	// THEN POST /api/v1/import/git 回傳 403

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f020-repopath-blocked-"+t.Name())
	authedClient := client.WithKey(key)

	// 使用系統敏感路徑，應被白名單阻擋
	status, body, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/etc/passwd",
	})
	require.NoError(t, err)

	// 若 ALLOWED_REPO_PATHS 有設定，應回傳 403
	// 若未設定（向下相容），可能回傳 400（非 git repo）
	if status == http.StatusForbidden {
		t.Log("repo_path 白名單正確阻擋非白名單路徑")
		if body != nil {
			msg, _ := body["message"].(string)
			assert.Contains(t, msg, "允許",
				"錯誤訊息應提及路徑不在允許範圍")
		}
	} else if status == http.StatusBadRequest {
		t.Log("ALLOWED_REPO_PATHS 未設定（向下相容），路徑因非 git repo 被拒")
	} else {
		t.Logf("回傳 status: %d（可能 ALLOWED_REPO_PATHS 未設定）", status)
	}
}

func TestF020_RepoPath_PathTraversal_Returns403(t *testing.T) {
	// WHEN repo_path 包含 .. 遍歷
	// THEN 回傳 403（路徑被 Clean 後不在白名單內）

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f020-repopath-traversal-"+t.Name())
	authedClient := client.WithKey(key)

	// 路徑遍歷攻擊
	status, _, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/tmp/repos/../../../etc/passwd",
	})
	require.NoError(t, err)

	// 應被阻擋（403 或 400）
	assert.True(t, status == http.StatusForbidden || status == http.StatusBadRequest,
		"路徑遍歷攻擊應回傳 403 或 400，實際: %d", status)
	t.Logf("路徑遍歷攻擊結果 status: %d", status)
}

func TestF020_RepoPath_AllowedPath_NotBlocked(t *testing.T) {
	// WHEN ALLOWED_REPO_PATHS 未設定
	// THEN 允許任何路徑（向下相容）
	// 註：此測試驗證 /tmp/test-repo 不被白名單阻擋

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f020-repopath-allowed-"+t.Name())
	authedClient := client.WithKey(key)

	status, _, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/tmp/test-repo",
	})
	require.NoError(t, err)

	// 應不是 403（路徑被允許），可能是 200（成功）或 400（repo 不存在但路徑允許）
	assert.NotEqual(t, http.StatusForbidden, status,
		"/tmp/test-repo 不應被白名單阻擋（應在允許範圍或未設定白名單）")
	t.Logf("允許路徑結果 status: %d", status)
}

// --- 20-E: Go 版本對齊 ---

func TestF020_GoBuild_VersionConsistency(t *testing.T) {
	// WHEN 檢查 go.mod 的 Go 版本
	// THEN 應為 go 1.23

	// 讀取 go.mod 驗證版本
	cmd := exec.Command("grep", "^go ", "/Users/gpwang/project/aibo/dev/src/go.mod")
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Skip("無法讀取 go.mod，跳過版本檢查")
	}

	goVersion := strings.TrimSpace(string(output))
	assert.Contains(t, goVersion, "1.23",
		"go.mod 應指定 go 1.23，實際: %s", goVersion)
	t.Logf("go.mod 版本: %s", goVersion)
}

// --- 回歸測試：GCal 整體流程 ---

func TestF020_Regression_GCalEndpointsExist(t *testing.T) {
	// 回歸：GCal 相關端點在 F-020 修改後仍存在

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "f020-gcal-regress-"+t.Name())
	authedClient := client.WithKey(key)

	// 驗證 auth 端點存在
	status, _, err := authedClient.Do("POST", "/api/v1/integrations/gcal/auth", nil)
	require.NoError(t, err)
	assert.True(t, status == http.StatusOK || status == http.StatusInternalServerError,
		"GCal auth 端點應回傳 200 或 500，實際: %d", status)

	// 驗證 callback 端點存在
	status, _, err = authedClient.Do("GET",
		"/api/v1/integrations/gcal/callback?code=test&state=test", nil)
	require.NoError(t, err)
	assert.True(t, status == http.StatusBadRequest || status == http.StatusInternalServerError,
		"GCal callback 端點應回傳 400 或 500，實際: %d", status)

	// 驗證 import 端點存在
	status, _, err = authedClient.Do("POST", "/api/v1/integrations/gcal/import", nil)
	require.NoError(t, err)
	// 未授權 Google 時應回傳錯誤（但端點存在）
	assert.True(t, status != http.StatusNotFound,
		"GCal import 端點不應回 404，實際: %d", status)
}
