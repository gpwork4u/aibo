# F-001: 知識條目 CRUD

## Status: active
## Sprint: 1
## Priority: P0

## 使用者故事

As a 開發者，I want 建立、查詢、更新、刪除知識條目，so that 我能集中管理我的知識庫。

## API Contract

### `POST /api/v1/entries`

Auth：X-API-Key header

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | no | max 100 chars，與 content 至少填一個 |
| content | string | no | Markdown 格式，與 title 至少填一個 |
| category_id | string (UUID) | no | 必須是已存在的 category |
| source | string | no | max 500 chars |
| source_type | string | no | enum: "manual", "git", "gcal" |
| source_ref | string | no | max 500 chars |
| tags | string[] | no | 預設 [] |

Response 201:
```json
{
  "id": "uuid",
  "title": "string | null",
  "content": "string | null",
  "category_id": "uuid | null",
  "source": "string | null",
  "source_type": "string | null",
  "source_ref": "string | null",
  "tags": ["string"],
  "is_archived": false,
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | title 和 content 都為空 |
| 400 | INVALID_INPUT | title 超過 100 字 |
| 400 | INVALID_INPUT | source 超過 500 字 |
| 400 | INVALID_INPUT | source_type 不在允許的 enum 中 |
| 400 | INVALID_INPUT | source_ref 超過 500 字 |
| 400 | CATEGORY_NOT_FOUND | category_id 指定的分類不存在 |
| 401 | UNAUTHORIZED | API Key 無效或缺失 |

---

### `GET /api/v1/entries`

Auth：X-API-Key header

Query Parameters:
| Param | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| page | integer | no | 1 | >= 1 |
| per_page | integer | no | 20 | 1-100 |
| category_id | string | no | - | UUID 或 "null"（過濾未分類） |
| tag | string | no | - | 可多次指定，AND 邏輯 |
| is_archived | boolean | no | - | true/false |
| search | string | no | - | 全文搜尋 keyword |
| sort | string | no | created_at | enum: "created_at", "updated_at", "title" |
| order | string | no | desc | enum: "asc", "desc" |

Response 200:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "string | null",
      "content_preview": "string (前 200 字)",
      "category_id": "uuid | null",
      "tags": ["string"],
      "is_archived": false,
      "created_at": "ISO 8601",
      "updated_at": "ISO 8601"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | page < 1 或 per_page 超出範圍 |
| 401 | UNAUTHORIZED | API Key 無效或缺失 |

---

### `GET /api/v1/entries/:id`

Auth：X-API-Key header

Response 200:
```json
{
  "id": "uuid",
  "title": "string | null",
  "content": "string | null (完整內容)",
  "category_id": "uuid | null",
  "source": "string | null",
  "source_type": "string | null",
  "source_ref": "string | null",
  "tags": ["string"],
  "is_archived": false,
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 404 | NOT_FOUND | id 不存在 |

---

### `PATCH /api/v1/entries/:id`

Auth：X-API-Key header

Request Body（部分更新，只傳要改的欄位）:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | null | no | max 100 chars |
| content | string | null | no | Markdown 格式 |
| category_id | string (UUID) | null | no | 必須是已存在的 category，null 表示移除分類 |
| source | string | null | no | max 500 chars |
| source_type | string | null | no | enum: "manual", "git", "gcal" |
| source_ref | string | null | no | max 500 chars |
| tags | string[] | no | 完整取代，非 merge |
| is_archived | boolean | no | - |

Response 200: 同 GET /api/v1/entries/:id 的完整 entry 格式

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | request body 為空（無任何欄位） |
| 400 | INVALID_INPUT | 更新後 title 和 content 都為 null |
| 400 | INVALID_INPUT | title 超過 100 字 |
| 400 | CATEGORY_NOT_FOUND | category_id 指定的分類不存在 |
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 404 | NOT_FOUND | id 不存在 |

---

### `DELETE /api/v1/entries/:id`

Auth：X-API-Key header

Response 204: No Content

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 404 | NOT_FOUND | id 不存在 |

## Data Model

```
Entry {
  id: UUID (PK, auto-generated)
  title: VARCHAR(100) NULL
  content: TEXT NULL (Markdown)
  category_id: UUID FK -> Category.id NULL (ON DELETE SET NULL)
  source: VARCHAR(500) NULL
  source_type: VARCHAR(20) NULL  -- enum: "manual", "git", "gcal"
  source_ref: VARCHAR(500) NULL
  tags: TEXT[] DEFAULT '{}'
  is_archived: BOOLEAN DEFAULT FALSE
  created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
}

Constraints:
  - CHECK: title IS NOT NULL OR content IS NOT NULL
  - UNIQUE INDEX idx_entries_source ON entries (source_type, source_ref) WHERE source_type IS NOT NULL
  - GIN INDEX on tags
  - GIN INDEX on to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))
```

## Business Rules

1. title 和 content 至少要有一個非空值（CHECK constraint）
2. tags 更新時完整取代，不做 merge
3. category_id 必須指向已存在的 category，否則回 CATEGORY_NOT_FOUND
4. 刪除為硬刪除（hard delete）
5. 列表查詢回傳 content_preview（content 前 200 字），單筆查詢回傳完整 content
6. category_id=null 過濾條件代表查詢未分類的 entries（Inbox）
7. 多個 tag 過濾為 AND 邏輯（entry 必須同時含有所有指定 tags）
8. search 參數使用 PostgreSQL 全文搜尋（simple config + pg_trgm）
9. source_type + source_ref 的組合在 source_type 非空時必須唯一（防止重複匯入）
10. updated_at 在每次更新時自動設為 NOW()

## Scenarios

### Happy Path

#### Scenario: 建立只有 title 的 entry
GIVEN 使用者已認證
WHEN POST /api/v1/entries with { "title": "Golang goroutine 筆記" }
THEN response status = 201
AND response body contains { "id": any(uuid), "title": "Golang goroutine 筆記", "content": null, "tags": [], "is_archived": false }

#### Scenario: 建立只有 content 的 entry
GIVEN 使用者已認證
WHEN POST /api/v1/entries with { "content": "# 重要觀念\n\n這是一段 Markdown" }
THEN response status = 201
AND response body contains { "title": null, "content": "# 重要觀念\n\n這是一段 Markdown" }

#### Scenario: 建立含 category 和 tags 的 entry
GIVEN 使用者已認證
AND category "golang" exists with id = {cat_id}
WHEN POST /api/v1/entries with { "title": "Go 學習", "content": "...", "category_id": "{cat_id}", "tags": ["golang", "learning"] }
THEN response status = 201
AND response body category_id = "{cat_id}"
AND response body tags = ["golang", "learning"]

#### Scenario: 列表查詢含分頁
GIVEN 25 筆 entries 存在
WHEN GET /api/v1/entries?page=2&per_page=10
THEN response status = 200
AND response body data length = 10
AND response body pagination = { "page": 2, "per_page": 10, "total": 25, "total_pages": 3 }

#### Scenario: 以 tag 過濾（AND 邏輯）
GIVEN entry #1 tags = ["golang", "concurrency"]
AND entry #2 tags = ["golang", "http"]
WHEN GET /api/v1/entries?tag=golang&tag=concurrency
THEN response status = 200
AND response body data contains only entry #1

#### Scenario: 列表回傳 content_preview
GIVEN entry exists with content = "a" * 300
WHEN GET /api/v1/entries
THEN response body data[0].content_preview = "a" * 200

#### Scenario: 單筆查詢回傳完整 content
GIVEN entry exists with content = "a" * 300
WHEN GET /api/v1/entries/{id}
THEN response body content = "a" * 300

#### Scenario: 部分更新 tags（完整取代）
GIVEN entry exists with tags = ["old1", "old2"]
WHEN PATCH /api/v1/entries/{id} with { "tags": ["new1"] }
THEN response status = 200
AND response body tags = ["new1"]

#### Scenario: 部分更新 is_archived
GIVEN entry exists with is_archived = false
WHEN PATCH /api/v1/entries/{id} with { "is_archived": true }
THEN response status = 200
AND response body is_archived = true

#### Scenario: 硬刪除 entry
GIVEN entry exists with id = {id}
WHEN DELETE /api/v1/entries/{id}
THEN response status = 204
AND GET /api/v1/entries/{id} returns 404

### Error Handling

#### Scenario: title 和 content 都為空
GIVEN 使用者已認證
WHEN POST /api/v1/entries with { }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: title 和 content 都為空字串
GIVEN 使用者已認證
WHEN POST /api/v1/entries with { "title": "", "content": "" }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: title 超過 100 字
GIVEN 使用者已認證
WHEN POST /api/v1/entries with { "title": "a" * 101 }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: category_id 不存在
GIVEN 使用者已認證
WHEN POST /api/v1/entries with { "title": "test", "category_id": "non-existent-uuid" }
THEN response status = 400
AND response body code = "CATEGORY_NOT_FOUND"

#### Scenario: 未帶 API Key
WHEN POST /api/v1/entries with { "title": "test" } without X-API-Key header
THEN response status = 401
AND response body code = "UNAUTHORIZED"

#### Scenario: 查詢不存在的 entry
GIVEN 使用者已認證
WHEN GET /api/v1/entries/{non-existent-uuid}
THEN response status = 404
AND response body code = "NOT_FOUND"

#### Scenario: PATCH 空 body
GIVEN 使用者已認證
AND entry exists with id = {id}
WHEN PATCH /api/v1/entries/{id} with { }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: PATCH 導致 title 和 content 都為 null
GIVEN entry exists with title = "test", content = null
WHEN PATCH /api/v1/entries/{id} with { "title": null }
THEN response status = 400
AND response body code = "INVALID_INPUT"

### Edge Cases

#### Scenario: title 恰好 100 字
GIVEN 使用者已認證
WHEN POST /api/v1/entries with { "title": "a" * 100 }
THEN response status = 201

#### Scenario: category_id 設為 null（移除分類）
GIVEN entry exists with category_id = {cat_id}
WHEN PATCH /api/v1/entries/{id} with { "category_id": null }
THEN response status = 200
AND response body category_id = null

#### Scenario: 全文搜尋
GIVEN entry exists with title = "Golang 效能優化"
WHEN GET /api/v1/entries?search=golang
THEN response status = 200
AND response body data contains the entry

#### Scenario: 刪除不存在的 entry
GIVEN 使用者已認證
WHEN DELETE /api/v1/entries/{non-existent-uuid}
THEN response status = 404
AND response body code = "NOT_FOUND"

#### Scenario: per_page 超過 100
GIVEN 使用者已認證
WHEN GET /api/v1/entries?per_page=101
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: 空 tags 陣列
GIVEN 使用者已認證
WHEN POST /api/v1/entries with { "title": "test", "tags": [] }
THEN response status = 201
AND response body tags = []
