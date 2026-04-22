# F-002: Inbox 暫存區

## Status: active
## Sprint: 1
## Priority: P0

## 使用者故事

As a 開發者，I want 快速丟入未分類的知識片段到 Inbox，so that 我不需要當下就整理分類，之後再處理。

## API Contract

Inbox 完全複用 F-001 知識條目 CRUD 的 API，不需要額外的 endpoint。

### 查詢 Inbox（未分類 + 未歸檔）

`GET /api/v1/entries?category_id=null&is_archived=false`

此查詢組合即為 Inbox 內容：
- `category_id=null` — 過濾未分類的 entries
- `is_archived=false` — 排除已歸檔的 entries

### 快速新增到 Inbox

`POST /api/v1/entries`

不帶 category_id 即自動進入 Inbox。

### 從 Inbox 移出（分類）

`PATCH /api/v1/entries/:id` with `{ "category_id": "{uuid}" }`

指定 category_id 即從 Inbox 移出。

## Data Model

無額外 data model，完全使用 F-001 的 Entry model。

## Business Rules

1. Inbox = category_id 為 NULL 且 is_archived 為 FALSE 的 entries
2. 新建 entry 不帶 category_id 時自動成為 Inbox 項目
3. 指定 category_id 後即離開 Inbox
4. 歸檔（is_archived = true）的 entry 不顯示在 Inbox 中
5. Inbox 支援所有 F-001 的查詢參數（tag, search, sort, order, 分頁）

## Scenarios

### Happy Path

#### Scenario: 查詢 Inbox 內容
GIVEN entry #1 exists with category_id = null, is_archived = false
AND entry #2 exists with category_id = {some_uuid}, is_archived = false
AND entry #3 exists with category_id = null, is_archived = true
WHEN GET /api/v1/entries?category_id=null&is_archived=false
THEN response status = 200
AND response body data contains only entry #1

#### Scenario: 快速新增到 Inbox
GIVEN 使用者已認證
WHEN POST /api/v1/entries with { "content": "快速筆記：明天要查 goroutine leak" }
THEN response status = 201
AND response body category_id = null
AND response body is_archived = false

#### Scenario: 從 Inbox 移出（指定分類）
GIVEN entry exists in Inbox (category_id = null)
AND category "golang" exists with id = {cat_id}
WHEN PATCH /api/v1/entries/{id} with { "category_id": "{cat_id}" }
THEN response status = 200
AND response body category_id = "{cat_id}"
AND entry no longer appears in GET /api/v1/entries?category_id=null

### Edge Cases

#### Scenario: Inbox 為空
GIVEN 所有 entries 都已分類
WHEN GET /api/v1/entries?category_id=null&is_archived=false
THEN response status = 200
AND response body data = []
AND response body pagination.total = 0

#### Scenario: 歸檔 Inbox 項目
GIVEN entry exists in Inbox
WHEN PATCH /api/v1/entries/{id} with { "is_archived": true }
THEN response status = 200
AND entry no longer appears in GET /api/v1/entries?category_id=null&is_archived=false

#### Scenario: Inbox 內搜尋
GIVEN entry #1 in Inbox with title = "Golang 筆記"
AND entry #2 in Inbox with title = "Python 筆記"
WHEN GET /api/v1/entries?category_id=null&is_archived=false&search=golang
THEN response status = 200
AND response body data contains only entry #1
