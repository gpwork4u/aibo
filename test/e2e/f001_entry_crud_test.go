package e2e

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-001: 知識條目 CRUD
// ============================================================

// --- Happy Path ---

func TestF001_HappyPath_CreateEntryWithTitleOnly(t *testing.T) {
	// WHEN POST with { "title": "Golang goroutine 筆記" }
	// THEN 201, content=null, tags=[], is_archived=false

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-title-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/entries", map[string]interface{}{
		"title": "Golang goroutine 筆記",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
	assert.Equal(t, "Golang goroutine 筆記", body["title"])
	assert.Nil(t, body["content"])
	assert.NotEmpty(t, body["id"])
	assert.Equal(t, false, body["is_archived"])

	// tags 應為空陣列
	tags, ok := body["tags"].([]interface{})
	require.True(t, ok)
	assert.Equal(t, 0, len(tags))
}

func TestF001_HappyPath_CreateEntryWithContentOnly(t *testing.T) {
	// WHEN POST with { "content": "# 重要觀念\n\n這是一段 Markdown" }
	// THEN 201, title=null

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-content-key")
	authedClient := client.WithKey(key)

	content := "# 重要觀念\n\n這是一段 Markdown"
	status, body, err := authedClient.Do("POST", "/api/v1/entries", map[string]interface{}{
		"content": content,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
	assert.Nil(t, body["title"])
	assert.Equal(t, content, body["content"])
}

func TestF001_HappyPath_CreateEntryWithCategoryAndTags(t *testing.T) {
	// GIVEN category "golang" exists
	// WHEN POST with category_id + tags
	// THEN 201

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-catag-key")
	authedClient := client.WithKey(key)

	catID := CreateCategory(t, authedClient, "golang-entry")

	status, body, err := authedClient.Do("POST", "/api/v1/entries", map[string]interface{}{
		"title":       "Go 學習",
		"content":     "goroutine 和 channel 筆記",
		"category_id": catID,
		"tags":        []string{"golang", "learning"},
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
	assert.Equal(t, catID, body["category_id"])

	tags := body["tags"].([]interface{})
	assert.Equal(t, 2, len(tags))
	assert.Contains(t, tags, "golang")
	assert.Contains(t, tags, "learning")
}

func TestF001_HappyPath_ListWithPagination(t *testing.T) {
	// GIVEN 25 筆 entries
	// WHEN GET ?page=2&per_page=10
	// THEN data.length=10, pagination 正確

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-page-key")
	authedClient := client.WithKey(key)

	// 建立 25 筆 entries
	for i := 1; i <= 25; i++ {
		CreateEntry(t, authedClient, map[string]interface{}{
			"title": "Pagination Entry " + RepeatStr("x", i),
		})
	}

	status, body, err := authedClient.Do("GET", "/api/v1/entries?page=2&per_page=10", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	assert.Equal(t, 10, len(data))

	pagination := GetPagination(t, body)
	assert.Equal(t, float64(2), pagination["page"])
	assert.Equal(t, float64(10), pagination["per_page"])
	assert.Equal(t, float64(25), pagination["total"])
	assert.Equal(t, float64(3), pagination["total_pages"])
}

func TestF001_HappyPath_FilterByTagAND(t *testing.T) {
	// GIVEN entry#1 tags=["golang","concurrency"], entry#2 tags=["golang","http"]
	// WHEN GET ?tag=golang&tag=concurrency
	// THEN only entry#1

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-tagand-key")
	authedClient := client.WithKey(key)

	entry1ID := CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Concurrency",
		"tags":  []string{"golang", "concurrency"},
	})
	CreateEntry(t, authedClient, map[string]interface{}{
		"title": "HTTP",
		"tags":  []string{"golang", "http"},
	})

	status, body, err := authedClient.Do("GET", "/api/v1/entries?tag=golang&tag=concurrency", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	assert.Equal(t, 1, len(data), "AND 過濾應只回傳同時含有兩個 tags 的 entry")
	assert.Equal(t, entry1ID, data[0].(map[string]interface{})["id"])
}

func TestF001_HappyPath_ContentPreviewInList(t *testing.T) {
	// GIVEN entry with content = 300 字
	// WHEN GET list
	// THEN content_preview = 前 200 字

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-preview-key")
	authedClient := client.WithKey(key)

	longContent := RepeatStr("a", 300)
	CreateEntry(t, authedClient, map[string]interface{}{
		"content": longContent,
	})

	status, body, err := authedClient.Do("GET", "/api/v1/entries?per_page=1&sort=created_at&order=desc", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	require.True(t, len(data) > 0)

	preview := data[0].(map[string]interface{})["content_preview"].(string)
	assert.Equal(t, 200, len(preview), "content_preview 應為前 200 字")
}

func TestF001_HappyPath_FullContentInSingleGet(t *testing.T) {
	// GIVEN entry with content = 300 字
	// WHEN GET single
	// THEN content = 完整 300 字

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-full-key")
	authedClient := client.WithKey(key)

	longContent := RepeatStr("b", 300)
	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"content": longContent,
	})

	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, longContent, body["content"])
}

func TestF001_HappyPath_PatchTagsFullReplace(t *testing.T) {
	// GIVEN entry with tags=["old1","old2"]
	// WHEN PATCH with tags=["new1"]
	// THEN tags=["new1"]

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-patchtag-key")
	authedClient := client.WithKey(key)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Tag Replace",
		"tags":  []string{"old1", "old2"},
	})

	status, body, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"tags": []string{"new1"},
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	tags := body["tags"].([]interface{})
	assert.Equal(t, 1, len(tags))
	assert.Equal(t, "new1", tags[0])
}

func TestF001_HappyPath_PatchIsArchived(t *testing.T) {
	// GIVEN entry is_archived=false
	// WHEN PATCH is_archived=true
	// THEN 200, is_archived=true

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-archive-key")
	authedClient := client.WithKey(key)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Archive Me",
	})

	status, body, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"is_archived": true,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, true, body["is_archived"])
}

func TestF001_HappyPath_HardDelete(t *testing.T) {
	// WHEN DELETE entry
	// THEN 204 + GET returns 404

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-delete-key")
	authedClient := client.WithKey(key)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Delete Me",
	})

	status, _, err := authedClient.Do("DELETE", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, status)

	// GET should 404
	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, status)
	AssertErrorCode(t, body, "NOT_FOUND")
}

// --- Error Handling ---

func TestF001_Error_TitleAndContentBothEmpty(t *testing.T) {
	// WHEN POST with {}
	// THEN 400 INVALID_INPUT

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-empty-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/entries", map[string]interface{}{})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF001_Error_TitleAndContentBothEmptyStrings(t *testing.T) {
	// WHEN POST with { "title": "", "content": "" }
	// THEN 400 INVALID_INPUT

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-emptystr-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/entries", map[string]interface{}{
		"title":   "",
		"content": "",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF001_Error_TitleTooLong(t *testing.T) {
	// WHEN POST with title = 101 字
	// THEN 400 INVALID_INPUT

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-longtitle-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/entries", map[string]interface{}{
		"title": RepeatStr("a", 101),
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF001_Error_CategoryNotFound(t *testing.T) {
	// WHEN POST with non-existent category_id
	// THEN 400 CATEGORY_NOT_FOUND

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-badcat-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/entries", map[string]interface{}{
		"title":       "test",
		"category_id": "00000000-0000-0000-0000-000000000000",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "CATEGORY_NOT_FOUND")
}

func TestF001_Error_Unauthorized(t *testing.T) {
	// WHEN POST without API Key
	// THEN 401 UNAUTHORIZED

	client := NewAPIClient()
	// 先確保非 bootstrap 狀態
	key := BootstrapAPIKey(t, client, "entry-unauth-key")
	_ = key

	noAuthClient := NewAPIClient()
	status, body, err := noAuthClient.Do("POST", "/api/v1/entries", map[string]interface{}{
		"title": "test",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, status)
	AssertErrorCode(t, body, "UNAUTHORIZED")
}

func TestF001_Error_GetNotFound(t *testing.T) {
	// WHEN GET non-existent entry
	// THEN 404 NOT_FOUND

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-getnf-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("GET", "/api/v1/entries/00000000-0000-0000-0000-000000000000", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, status)
	AssertErrorCode(t, body, "NOT_FOUND")
}

func TestF001_Error_PatchEmptyBody(t *testing.T) {
	// WHEN PATCH with {}
	// THEN 400 INVALID_INPUT

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-patchempty-key")
	authedClient := client.WithKey(key)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Patch Empty",
	})

	status, body, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF001_Error_PatchResultsInBothNull(t *testing.T) {
	// GIVEN entry with title="test", content=null
	// WHEN PATCH title=null
	// THEN 400 INVALID_INPUT

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-patchnull-key")
	authedClient := client.WithKey(key)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Will Be Null",
	})

	status, body, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"title": nil,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF001_Error_PerPageTooLarge(t *testing.T) {
	// WHEN GET ?per_page=101
	// THEN 400 INVALID_INPUT

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-perpage-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("GET", "/api/v1/entries?per_page=101", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

// --- Edge Cases ---

func TestF001_Edge_TitleExactly100Chars(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-100title-key")
	authedClient := client.WithKey(key)

	status, _, err := authedClient.Do("POST", "/api/v1/entries", map[string]interface{}{
		"title": RepeatStr("c", 100),
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
}

func TestF001_Edge_RemoveCategoryBySettingNull(t *testing.T) {
	// GIVEN entry with category_id
	// WHEN PATCH category_id=null
	// THEN 200, category_id=null

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-rmcat-key")
	authedClient := client.WithKey(key)

	catID := CreateCategory(t, authedClient, "RemoveCat")
	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title":       "Has Category",
		"category_id": catID,
	})

	status, body, err := authedClient.Do("PATCH", "/api/v1/entries/"+entryID, map[string]interface{}{
		"category_id": nil,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Nil(t, body["category_id"])
}

func TestF001_Edge_FullTextSearch(t *testing.T) {
	// GIVEN entry with title = "Golang 效能優化"
	// WHEN GET ?search=golang
	// THEN 回傳該 entry

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-search-key")
	authedClient := client.WithKey(key)

	entryID := CreateEntry(t, authedClient, map[string]interface{}{
		"title": "Golang 效能優化",
	})

	status, body, err := authedClient.Do("GET", "/api/v1/entries?search=Golang", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	require.True(t, len(data) > 0, "搜尋結果不應為空")

	// 檢查是否包含我們的 entry
	found := false
	for _, item := range data {
		entry := item.(map[string]interface{})
		if entry["id"] == entryID {
			found = true
			break
		}
	}
	assert.True(t, found, "搜尋結果應包含 Golang 效能優化 entry")
}

func TestF001_Edge_DeleteNotFound(t *testing.T) {
	// WHEN DELETE non-existent entry
	// THEN 404

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-delnf-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("DELETE", "/api/v1/entries/00000000-0000-0000-0000-000000000000", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, status)
	AssertErrorCode(t, body, "NOT_FOUND")
}

func TestF001_Edge_EmptyTagsArray(t *testing.T) {
	// WHEN POST with tags=[]
	// THEN 201, tags=[]

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "entry-emptytags-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/entries", map[string]interface{}{
		"title": "Empty Tags",
		"tags":  []string{},
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)

	tags := body["tags"].([]interface{})
	assert.Equal(t, 0, len(tags))
}
