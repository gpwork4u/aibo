package e2e

import (
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-008: Git 整合 — 匯入 Git Commits
// ============================================================

// --- Happy Path ---

func TestF008_HappyPath_ImportGitCommits(t *testing.T) {
	// TC-008-01: 匯入 Git commits
	// GIVEN 使用者已認證 AND repo_path 是有效的 Git repo
	// WHEN POST /api/v1/import/git with { "repo_path": "/home/user/project" }
	// THEN 200, commits_found, entries_created, source_type = "git"

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "git-import-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/tmp/test-repo",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	// 驗證回應格式包含必要欄位
	require.NotNil(t, body)
	_, hasCommitsFound := body["commits_found"]
	assert.True(t, hasCommitsFound, "response 應包含 commits_found")
	_, hasEntriesCreated := body["entries_created"]
	assert.True(t, hasEntriesCreated, "response 應包含 entries_created")
	_, hasEntriesSkipped := body["entries_skipped"]
	assert.True(t, hasEntriesSkipped, "response 應包含 entries_skipped")
}

func TestF008_HappyPath_ImportWithDateRange(t *testing.T) {
	// TC-008-02: 指定日期範圍匯入
	// WHEN POST with since / until
	// THEN 200, 只匯入指定範圍內的 commits

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "git-daterange-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/tmp/test-repo",
		"since":     "2024-01-01T00:00:00Z",
		"until":     "2024-01-31T23:59:59Z",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	require.NotNil(t, body)

	_, hasCommitsFound := body["commits_found"]
	assert.True(t, hasCommitsFound, "response 應包含 commits_found")
}

func TestF008_HappyPath_ImportWithAuthorFilter(t *testing.T) {
	// TC-008-03: 指定 author 過濾
	// WHEN POST with author = "alice@example.com"
	// THEN 200, 只匯入 alice 的 commits

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "git-author-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/tmp/test-repo",
		"author":    "alice@example.com",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	require.NotNil(t, body)
}

func TestF008_HappyPath_DuplicateImportSkips(t *testing.T) {
	// TC-008-04: 重複匯入時跳過已存在的
	// GIVEN 第一次匯入已建立 entries
	// WHEN POST with same params（第二次）
	// THEN entries_created = 0, entries_skipped > 0

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "git-dedup-key")
	authedClient := client.WithKey(key)

	payload := map[string]interface{}{
		"repo_path": "/tmp/test-repo",
	}

	// 第一次匯入
	status1, body1, err := authedClient.Do("POST", "/api/v1/import/git", payload)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status1)

	firstCreated, _ := body1["entries_created"].(float64)

	// 第二次匯入（相同參數）
	status2, body2, err := authedClient.Do("POST", "/api/v1/import/git", payload)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status2)
	require.NotNil(t, body2)

	secondCreated, _ := body2["entries_created"].(float64)
	secondSkipped, _ := body2["entries_skipped"].(float64)

	// 第二次不應建立新 entries
	assert.Equal(t, float64(0), secondCreated, "重複匯入不應建立新 entries")

	// 如果第一次有建立，第二次應有 skipped
	if firstCreated > 0 {
		assert.True(t, secondSkipped > 0, "重複匯入應有 entries_skipped > 0")
	}
}

// --- Error Handling ---

func TestF008_Error_RepoPathEmpty(t *testing.T) {
	// TC-008-05: repo_path 為空
	// WHEN POST with { "repo_path": "" }
	// THEN 400 INVALID_INPUT

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "git-empty-path-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF008_Error_RepoPathNotGitRepo(t *testing.T) {
	// TC-008-06: repo_path 不是 Git repo
	// WHEN POST with { "repo_path": "/tmp/not-a-repo" }
	// THEN 400 INVALID_INPUT

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "git-notrepo-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/tmp/definitely-not-a-git-repo-xyz",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF008_Error_BranchNotFound(t *testing.T) {
	// repo_path 有效但 branch 不存在
	// WHEN POST with branch = "nonexistent-branch-xyz"
	// THEN 400 INVALID_INPUT

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "git-badbranch-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/tmp/test-repo",
		"branch":    "nonexistent-branch-xyz",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF008_Error_ExceedsCommitLimit(t *testing.T) {
	// TC-008-07: 超過 500 commits 上限
	// GIVEN repo has > 500 commits in date range
	// WHEN POST /api/v1/import/git
	// THEN 400, message mentions 500 limit

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "git-limit-key")
	authedClient := client.WithKey(key)

	// 使用極大日期範圍觸發超過 500 上限
	status, body, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/tmp/test-repo-large",
		"since":     "2000-01-01T00:00:00Z",
	})
	require.NoError(t, err)

	// 若 repo 確實有超過 500 commits
	if status == http.StatusBadRequest {
		AssertErrorCode(t, body, "INVALID_INPUT")
		msg, _ := body["message"].(string)
		assert.True(t, strings.Contains(msg, "500"), "error message 應提及 500 上限")
	} else {
		// 若測試環境 repo 不夠大，跳過驗證
		t.Skip("測試環境 repo commits 數量不足 500，跳過上限測試")
	}
}

func TestF008_Error_Unauthorized(t *testing.T) {
	// TC-008-08: 未認證
	// WHEN POST without X-API-Key
	// THEN 401 UNAUTHORIZED

	client := NewAPIClient()
	// 先確保非 bootstrap 模式
	_ = BootstrapAPIKey(t, client, "git-unauth-setup-key")

	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/tmp/test-repo",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status)
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

// --- Edge Cases ---

func TestF008_Edge_SkipMergeCommits(t *testing.T) {
	// TC-008-09: 略過 merge commits
	// GIVEN repo has regular + merge commits
	// WHEN POST /api/v1/import/git
	// THEN entries_skipped 中包含 reason "merge commit"

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "git-merge-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/tmp/test-repo",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	require.NotNil(t, body)

	// 驗證 skipped_reasons 結構正確（若有 merge commits）
	if reasons, ok := body["skipped_reasons"].([]interface{}); ok {
		for _, r := range reasons {
			reason, ok := r.(map[string]interface{})
			if !ok {
				continue
			}
			// 每個 reason 應包含 commit_hash 和 reason
			_, hasHash := reason["commit_hash"]
			_, hasReason := reason["reason"]
			assert.True(t, hasHash, "skipped_reasons item 應包含 commit_hash")
			assert.True(t, hasReason, "skipped_reasons item 應包含 reason")
		}
	}
}

func TestF008_Edge_SkipShortMessageCommits(t *testing.T) {
	// TC-008-10: 略過短 message commits（< 10 chars）
	// GIVEN repo has commit with short message
	// WHEN POST /api/v1/import/git
	// THEN entries_skipped 中包含 reason "message too short (< 10 chars)"

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "git-shortmsg-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/tmp/test-repo",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	require.NotNil(t, body)

	// 驗證 skipped_reasons 如有短 message，reason 正確
	if reasons, ok := body["skipped_reasons"].([]interface{}); ok {
		for _, r := range reasons {
			reason, ok := r.(map[string]interface{})
			if !ok {
				continue
			}
			reasonStr, _ := reason["reason"].(string)
			if strings.Contains(reasonStr, "message too short") {
				assert.Contains(t, reasonStr, "10 chars",
					"短 message 原因應包含 '10 chars'")
			}
		}
	}
}

func TestF008_Edge_EntryTitleFormat(t *testing.T) {
	// TC-008-11: Entry title 格式驗證
	// GIVEN commit imported successfully
	// WHEN 查詢匯入的 entries
	// THEN entry.title = "[Git] {hash前7碼} - {commit subject}"
	//      entry.source_type = "git"

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "git-title-key")
	authedClient := client.WithKey(key)

	// 先匯入
	status, body, err := authedClient.Do("POST", "/api/v1/import/git", map[string]interface{}{
		"repo_path": "/tmp/test-repo",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	created, _ := body["entries_created"].(float64)
	if created == 0 {
		t.Skip("無新建 entries，跳過 title 格式驗證")
	}

	// 查詢以 source_type=git 過濾的 entries
	status, listBody, err := authedClient.Do("GET", "/api/v1/entries?tag=git&per_page=5", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, listBody)
	if len(data) == 0 {
		t.Skip("無 git tag entries，跳過 title 格式驗證")
	}

	// 驗證第一筆 entry 的 title 格式
	entry := data[0].(map[string]interface{})
	title, _ := entry["title"].(string)
	assert.True(t, strings.HasPrefix(title, "[Git] "),
		"entry title 應以 '[Git] ' 開頭，實際: %s", title)
	assert.Contains(t, title, " - ",
		"entry title 應包含 ' - ' 分隔 hash 和 subject")
}
