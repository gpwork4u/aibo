package e2e

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================
// F-004: 分類管理
// ============================================================

// --- Happy Path ---

func TestF004_HappyPath_CreateCategory(t *testing.T) {
	// WHEN POST /api/v1/categories with { "name": "Golang", "description": "Go 語言相關" }
	// THEN 201, 回傳正確欄位

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-create-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/categories", map[string]interface{}{
		"name":        "Golang",
		"description": "Go 語言相關",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
	assert.Equal(t, "Golang", body["name"])
	assert.Equal(t, "Go 語言相關", body["description"])
	assert.Equal(t, float64(0), body["sort_order"])
	assert.NotEmpty(t, body["id"])
	assert.NotEmpty(t, body["created_at"])
	assert.NotEmpty(t, body["updated_at"])
}

func TestF004_HappyPath_ListWithEntryCount(t *testing.T) {
	// GIVEN category "Golang" exists with entries
	// WHEN GET /api/v1/categories
	// THEN 回傳 entry_count

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-list-key")
	authedClient := client.WithKey(key)

	catID := CreateCategory(t, authedClient, "Golang-count")

	// 建立 3 筆 entries 在此分類下
	for i := 0; i < 3; i++ {
		CreateEntry(t, authedClient, map[string]interface{}{
			"title":       "Entry " + RepeatStr("x", i+1),
			"category_id": catID,
		})
	}

	// 再建一個空分類
	CreateCategory(t, authedClient, "Python-count")

	status, body, err := authedClient.Do("GET", "/api/v1/categories", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	require.True(t, len(data) >= 2)

	// 找到 Golang-count 分類，驗證 entry_count
	for _, item := range data {
		cat := item.(map[string]interface{})
		if cat["name"] == "Golang-count" {
			assert.Equal(t, float64(3), cat["entry_count"], "Golang-count 應有 3 筆 entries")
		}
		if cat["name"] == "Python-count" {
			assert.Equal(t, float64(0), cat["entry_count"], "Python-count 應有 0 筆 entries")
		}
	}
}

func TestF004_HappyPath_ListSorting(t *testing.T) {
	// GIVEN category "B" sort_order=1, "A" sort_order=1, "C" sort_order=0
	// WHEN GET /api/v1/categories
	// THEN order = ["C", "A", "B"] (sort_order ASC, name ASC)

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-sort-key")
	authedClient := client.WithKey(key)

	authedClient.Do("POST", "/api/v1/categories", map[string]interface{}{
		"name": "B-sort", "sort_order": 1,
	})
	authedClient.Do("POST", "/api/v1/categories", map[string]interface{}{
		"name": "A-sort", "sort_order": 1,
	})
	authedClient.Do("POST", "/api/v1/categories", map[string]interface{}{
		"name": "C-sort", "sort_order": 0,
	})

	status, body, err := authedClient.Do("GET", "/api/v1/categories", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)

	// 過濾出我們建立的分類
	var names []string
	for _, item := range data {
		cat := item.(map[string]interface{})
		name := cat["name"].(string)
		if name == "A-sort" || name == "B-sort" || name == "C-sort" {
			names = append(names, name)
		}
	}

	require.Equal(t, 3, len(names))
	assert.Equal(t, "C-sort", names[0], "sort_order=0 應排第一")
	assert.Equal(t, "A-sort", names[1], "同 sort_order 時 name ASC")
	assert.Equal(t, "B-sort", names[2])
}

func TestF004_HappyPath_FullUpdate(t *testing.T) {
	// GIVEN category exists
	// WHEN PUT with new values
	// THEN 200, 回傳更新後的值

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-update-key")
	authedClient := client.WithKey(key)

	catID := CreateCategory(t, authedClient, "Old-Name")

	status, body, err := authedClient.Do("PUT", "/api/v1/categories/"+catID, map[string]interface{}{
		"name":        "New-Name",
		"description": "new desc",
		"sort_order":  5,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, "New-Name", body["name"])
	assert.Equal(t, "new desc", body["description"])
	assert.Equal(t, float64(5), body["sort_order"])
}

func TestF004_HappyPath_DeleteCategoryEntriesBackToInbox(t *testing.T) {
	// GIVEN category with entries
	// WHEN DELETE category
	// THEN 204, entries.category_id = null

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-del-key")
	authedClient := client.WithKey(key)

	catID := CreateCategory(t, authedClient, "ToDelete")

	entryID1 := CreateEntry(t, authedClient, map[string]interface{}{
		"title":       "Entry1-del",
		"category_id": catID,
	})
	entryID2 := CreateEntry(t, authedClient, map[string]interface{}{
		"title":       "Entry2-del",
		"category_id": catID,
	})

	// 刪除分類
	status, _, err := authedClient.Do("DELETE", "/api/v1/categories/"+catID, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, status)

	// 驗證 entries 的 category_id 變為 null
	status, body, err := authedClient.Do("GET", "/api/v1/entries/"+entryID1, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Nil(t, body["category_id"], "entry1 的 category_id 應為 null")

	status, body, err = authedClient.Do("GET", "/api/v1/entries/"+entryID2, nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Nil(t, body["category_id"], "entry2 的 category_id 應為 null")
}

// --- Error Handling ---

func TestF004_Error_EmptyName(t *testing.T) {
	// WHEN POST with { "name": "" }
	// THEN 400 INVALID_INPUT

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-emptyname-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/categories", map[string]interface{}{
		"name": "",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF004_Error_NameTooLong(t *testing.T) {
	// WHEN POST with name = 51 字
	// THEN 400 INVALID_INPUT

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-longname-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/categories", map[string]interface{}{
		"name": RepeatStr("a", 51),
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF004_Error_DuplicateNameCaseInsensitive(t *testing.T) {
	// GIVEN category "Golang" exists
	// WHEN POST with { "name": "golang" }（小寫）
	// THEN 409 DUPLICATE_CATEGORY

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-dup-key")
	authedClient := client.WithKey(key)

	CreateCategory(t, authedClient, "Golang-dup")

	status, body, err := authedClient.Do("POST", "/api/v1/categories", map[string]interface{}{
		"name": "golang-dup",
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusConflict, status)
	AssertErrorCode(t, body, "DUPLICATE_CATEGORY")
}

func TestF004_Error_NegativeSortOrder(t *testing.T) {
	// WHEN POST with sort_order = -1
	// THEN 400 INVALID_INPUT

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-negorder-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/categories", map[string]interface{}{
		"name":       "NegOrder",
		"sort_order": -1,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF004_Error_UpdateNameConflict(t *testing.T) {
	// GIVEN "Golang" and "Python" exist
	// WHEN PUT Golang's id with name = "python"
	// THEN 409 DUPLICATE_CATEGORY

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-conflict-key")
	authedClient := client.WithKey(key)

	golangID := CreateCategory(t, authedClient, "Golang-conflict")
	CreateCategory(t, authedClient, "Python-conflict")

	status, body, err := authedClient.Do("PUT", "/api/v1/categories/"+golangID, map[string]interface{}{
		"name":        "python-conflict",
		"description": nil,
		"sort_order":  0,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusConflict, status)
	AssertErrorCode(t, body, "DUPLICATE_CATEGORY")
}

func TestF004_Error_DeleteNotFound(t *testing.T) {
	// WHEN DELETE non-existent UUID
	// THEN 404

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-delnf-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("DELETE", "/api/v1/categories/00000000-0000-0000-0000-000000000000", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, status)
	AssertErrorCode(t, body, "NOT_FOUND")
}

// --- Edge Cases ---

func TestF004_Edge_NameExactly50Chars(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-50char-key")
	authedClient := client.WithKey(key)

	status, _, err := authedClient.Do("POST", "/api/v1/categories", map[string]interface{}{
		"name": RepeatStr("b", 50),
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
}

func TestF004_Edge_DescriptionExactly200Chars(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-200desc-key")
	authedClient := client.WithKey(key)

	status, _, err := authedClient.Do("POST", "/api/v1/categories", map[string]interface{}{
		"name":        "Desc200",
		"description": RepeatStr("d", 200),
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, status)
}

func TestF004_Edge_DescriptionTooLong(t *testing.T) {
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-201desc-key")
	authedClient := client.WithKey(key)

	status, body, err := authedClient.Do("POST", "/api/v1/categories", map[string]interface{}{
		"name":        "DescTooLong",
		"description": RepeatStr("d", 201),
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, status)
	AssertErrorCode(t, body, "INVALID_INPUT")
}

func TestF004_Edge_EmptyListReturnsEmptyArray(t *testing.T) {
	// 注意：此測試需要乾淨的 DB 狀態
	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-empty-key")
	authedClient := client.WithKey(key)

	// 先清理所有分類
	status, body, _ := authedClient.Do("GET", "/api/v1/categories", nil)
	if status == http.StatusOK && body != nil {
		data := GetDataArray(t, body)
		for _, item := range data {
			cat := item.(map[string]interface{})
			authedClient.Do("DELETE", "/api/v1/categories/"+cat["id"].(string), nil)
		}
	}

	status, body, err := authedClient.Do("GET", "/api/v1/categories", nil)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)

	data := GetDataArray(t, body)
	assert.Equal(t, 0, len(data))
}

func TestF004_Edge_UpdateNameToSameValue(t *testing.T) {
	// GIVEN category with name = "Golang"
	// WHEN PUT with same name
	// THEN 200（不算重複）

	client := NewAPIClient()
	key := BootstrapAPIKey(t, client, "cat-samename-key")
	authedClient := client.WithKey(key)

	catID := CreateCategory(t, authedClient, "SameName-cat")

	status, body, err := authedClient.Do("PUT", "/api/v1/categories/"+catID, map[string]interface{}{
		"name":        "SameName-cat",
		"description": nil,
		"sort_order":  0,
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, "SameName-cat", body["name"])
}
