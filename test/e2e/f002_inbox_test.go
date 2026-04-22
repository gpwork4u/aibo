package e2e

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-002: Inbox 暫存區
// ============================================================

func TestF002_HappyPath_QueryInbox(t *testing.T) {
	// GIVEN entry#1 category_id=null, is_archived=false (Inbox)
	// AND entry#2 category_id=some_uuid (分類過的)
	// AND entry#3 category_id=null, is_archived=true (已歸檔)
	// WHEN GET ?category_id=null&is_archived=false
	// THEN 只回傳 entry#1

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "inbox-query-key")
	authedClient := client.WithKey(key)

	catID := CreateCategory(t, authedClient, "InboxTestCat")

	// entry#1: Inbox 項目
	entry1ID := CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Inbox Item",
	})

	// entry#2: 已分類
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":       "Categorized Item",
		"category_id": catID,
	})

	// entry#3: 已歸檔的 Inbox 項目
	entry3ID := CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Archived Inbox Item",
	})
	authedClient.Do("PATCH", "/api/v1/entries/"+entry3ID, map[string]interface{}{
		"is_archived": true,
	})

	// 查詢 Inbox
	status, body, err := authedClient.Do("GET", "/api/v1/entries?category_id=null&is_archived=false", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	// 應只包含 entry#1
	ids := make([]string, 0)
	for _, item := range data {
		entry := item.(map[string]interface{})
		ids = append(ids, entry["id"].(string))
	}
	assert.Contains(t, ids, entry1ID, "Inbox 應包含未分類未歸檔的項目")
}

func TestF002_HappyPath_QuickAddToInbox(t *testing.T) {
	// WHEN POST without category_id
	// THEN 201, category_id=null, is_archived=false

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "inbox-add-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/entries", map[string]interface{}{
		"content": "快速筆記：明天要查 goroutine leak",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
	assert.Nil(t, body["category_id"], "不帶 category_id 應為 null")
	assert.Equal(t, false, body["is_archived"])
}

func TestF002_HappyPath_MoveOutOfInbox(t *testing.T) {
	// GIVEN entry in Inbox
	// WHEN PATCH category_id = some_uuid
	// THEN entry 不再出現在 Inbox 查詢中

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "inbox-move-key")
	authedClient := client.WithKey(key)

	catID := CreateCategory(t, authedClient, "MoveTarget")
	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Move Me Out",
	})

	// 移出 Inbox
	status, body, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"category_id": catID,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, catID, body["category_id"])

	// 驗證不再出現在 Inbox
	status, body, err = authedClient.Do("GET", "/api/v1/entries?category_id=null&is_archived=false", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	for _, item := range data {
		entry := item.(map[string]interface{})
		assert.NotEqual(t, entryID, entry["id"], "移出的 entry 不應出現在 Inbox")
	}
}

func TestF002_Edge_EmptyInbox(t *testing.T) {
	// GIVEN 所有 entries 都已分類
	// WHEN GET Inbox
	// THEN data=[], pagination.total=0

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "inbox-empty-key")
	authedClient := client.WithKey(key)

	catID := CreateCategory(t, authedClient, "AllCategorized")

	// 建立 entry 並立即分類
	CreateEntry(t, authedClient, map[string]interface{}{
		"title":       "Already Categorized",
		"category_id": catID,
	})

	// 先清理未分類 entries（如果有）
	status, body, err := authedClient.Do("GET", "/api/v1/entries?category_id=null&is_archived=false", nil)
	require.NoError(t, err)
	if status == http.StatusOK {
		data := GetDataArray(t, body)
		for _, item := range data {
			entry := item.(map[string]interface{})
			// 將 Inbox 項目歸檔或分類
			authedClient.Do("PATCH", "/api/v1/entries/"+entry["id"].(string), map[string]interface{}{
				"category_id": catID,
			})
		}
	}

	// 再次查詢 Inbox
	status, body, err = authedClient.Do("GET", "/api/v1/entries?category_id=null&is_archived=false", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	assert.Equal(t, 0, len(data), "Inbox 應為空")

	pagination := GetPagination(t, body)
	assert.Equal(t, float64(0), pagination["total"])
}

func TestF002_Edge_ArchiveInboxItem(t *testing.T) {
	// GIVEN entry in Inbox
	// WHEN PATCH is_archived=true
	// THEN 不再出現在 Inbox

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "inbox-archive-key")
	authedClient := client.WithKey(key)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Archive From Inbox",
	})

	// 歸檔
	status, body, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"is_archived": true,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, true, body["is_archived"])

	// 驗證不在 Inbox
	status, body, err = authedClient.Do("GET", "/api/v1/entries?category_id=null&is_archived=false", nil)
	require.NoError(t, err)

	data := GetDataArray(t, body)
	for _, item := range data {
		entry := item.(map[string]interface{})
		assert.NotEqual(t, entryID, entry["id"], "已歸檔 entry 不應出現在 Inbox")
	}
}

func TestF002_Edge_SearchWithinInbox(t *testing.T) {
	// GIVEN entry#1 in Inbox title="Golang 筆記"
	// AND entry#2 in Inbox title="Python 筆記"
	// WHEN GET Inbox + search=golang
	// THEN 只回傳 entry#1

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "inbox-search-key")
	authedClient := client.WithKey(key)

	entry1ID := CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Golang 筆記 inbox-search",
	})
	CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Python 筆記 inbox-search",
	})

	status, body, err := authedClient.Do("GET", "/api/v1/entries?category_id=null&is_archived=false&search=Golang", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	require.True(t, len(data) > 0, "應有搜尋結果")

	// 驗證只包含 Golang 相關
	found := false
	for _, item := range data {
		entry := item.(map[string]interface{})
		if entry["id"] == entry1ID {
			found = true
		}
	}
	assert.True(t, found, "搜尋結果應包含 Golang 筆記")
}
