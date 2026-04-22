# F-004: 分類管理

## Status: active
## Sprint: 1
## Priority: P1

## 使用者故事

As a 開發者，I want 建立和管理知識分類，so that 我能有系統地組織知識條目。

## API Contract

### `POST /api/v1/categories`

Auth：X-API-Key header

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | yes | max 50 chars, 不可重複 (case-insensitive) |
| description | string | no | max 200 chars |
| sort_order | integer | no | >= 0, default 0 |

Response 201:
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string | null",
  "sort_order": 0,
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | name 為空或超過 50 字 |
| 400 | INVALID_INPUT | description 超過 200 字 |
| 400 | INVALID_INPUT | sort_order < 0 |
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 409 | DUPLICATE_CATEGORY | name 已存在（case-insensitive） |

---

### `GET /api/v1/categories`

Auth：X-API-Key header

Response 200:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string | null",
      "sort_order": 0,
      "entry_count": 15,
      "created_at": "ISO 8601",
      "updated_at": "ISO 8601"
    }
  ]
}
```

排序：sort_order ASC, name ASC

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key 無效或缺失 |

---

### `GET /api/v1/categories/:id`

Auth：X-API-Key header

Response 200:
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string | null",
  "sort_order": 0,
  "entry_count": 15,
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

### `PUT /api/v1/categories/:id`

Auth：X-API-Key header

全量更新（所有欄位都要傳）。

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | yes | max 50 chars, 不可重複 (case-insensitive) |
| description | string | null | yes | max 200 chars, null 表示清除 |
| sort_order | integer | yes | >= 0 |

Response 200: 同 GET /api/v1/categories/:id 格式

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | name 為空或超過 50 字 |
| 400 | INVALID_INPUT | description 超過 200 字 |
| 400 | INVALID_INPUT | sort_order < 0 |
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 404 | NOT_FOUND | id 不存在 |
| 409 | DUPLICATE_CATEGORY | name 已被其他 category 使用（case-insensitive） |

---

### `DELETE /api/v1/categories/:id`

Auth：X-API-Key header

刪除分類，底下所有 entries 的 category_id 設為 NULL（回到 Inbox）。

Response 204: No Content

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 404 | NOT_FOUND | id 不存在 |

## Data Model

```
Category {
  id: UUID (PK, auto-generated)
  name: VARCHAR(50) NOT NULL UNIQUE (case-insensitive, via UNIQUE INDEX ON LOWER(name))
  description: VARCHAR(200) NULL
  sort_order: INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0)
  created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
}
```

## Business Rules

1. name 不可重複，大小寫不敏感（LOWER(name) UNIQUE）
2. sort_order 必須 >= 0
3. 刪除 category 時，該 category 底下所有 entries 的 category_id 設為 NULL（FK ON DELETE SET NULL）
4. 列表查詢包含 entry_count（該 category 底下的 entry 數量）
5. 列表排序：sort_order ASC, name ASC
6. PUT 為全量更新，所有欄位都必須傳
7. updated_at 在每次更新時自動設為 NOW()

## Scenarios

### Happy Path

#### Scenario: 建立分類
GIVEN 使用者已認證
WHEN POST /api/v1/categories with { "name": "Golang", "description": "Go 語言相關" }
THEN response status = 201
AND response body contains { "name": "Golang", "description": "Go 語言相關", "sort_order": 0 }

#### Scenario: 列表查詢含 entry_count
GIVEN category "Golang" exists with 5 entries
AND category "Python" exists with 3 entries
WHEN GET /api/v1/categories
THEN response status = 200
AND response body data[0] contains entry_count
AND "Golang".entry_count = 5
AND "Python".entry_count = 3

#### Scenario: 列表排序
GIVEN category "B" with sort_order = 1
AND category "A" with sort_order = 1
AND category "C" with sort_order = 0
WHEN GET /api/v1/categories
THEN response body data order = ["C", "A", "B"]

#### Scenario: 全量更新分類
GIVEN category exists with id = {id}, name = "Old", description = "old desc", sort_order = 0
WHEN PUT /api/v1/categories/{id} with { "name": "New", "description": "new desc", "sort_order": 5 }
THEN response status = 200
AND response body contains { "name": "New", "description": "new desc", "sort_order": 5 }

#### Scenario: 刪除分類後 entries 回到 Inbox
GIVEN category "Golang" exists with id = {cat_id}
AND entry #1 has category_id = {cat_id}
AND entry #2 has category_id = {cat_id}
WHEN DELETE /api/v1/categories/{cat_id}
THEN response status = 204
AND entry #1 category_id = null
AND entry #2 category_id = null

### Error Handling

#### Scenario: name 為空
GIVEN 使用者已認證
WHEN POST /api/v1/categories with { "name": "" }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: name 超過 50 字
GIVEN 使用者已認證
WHEN POST /api/v1/categories with { "name": "a" * 51 }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: name 重複（case-insensitive）
GIVEN category "Golang" exists
WHEN POST /api/v1/categories with { "name": "golang" }
THEN response status = 409
AND response body code = "DUPLICATE_CATEGORY"

#### Scenario: sort_order 為負數
GIVEN 使用者已認證
WHEN POST /api/v1/categories with { "name": "Test", "sort_order": -1 }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: 更新 name 與其他 category 衝突
GIVEN category "Golang" exists with id = {id1}
AND category "Python" exists with id = {id2}
WHEN PUT /api/v1/categories/{id1} with { "name": "python", "description": null, "sort_order": 0 }
THEN response status = 409
AND response body code = "DUPLICATE_CATEGORY"

#### Scenario: 刪除不存在的 category
GIVEN 使用者已認證
WHEN DELETE /api/v1/categories/{non-existent-uuid}
THEN response status = 404
AND response body code = "NOT_FOUND"

### Edge Cases

#### Scenario: name 恰好 50 字
GIVEN 使用者已認證
WHEN POST /api/v1/categories with { "name": "a" * 50 }
THEN response status = 201

#### Scenario: description 恰好 200 字
GIVEN 使用者已認證
WHEN POST /api/v1/categories with { "name": "Test", "description": "a" * 200 }
THEN response status = 201

#### Scenario: description 超過 200 字
GIVEN 使用者已認證
WHEN POST /api/v1/categories with { "name": "Test", "description": "a" * 201 }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: 沒有任何 category 時列表回空
WHEN GET /api/v1/categories
THEN response status = 200
AND response body data = []

#### Scenario: 更新 name 為自己原本的值（同 id）
GIVEN category exists with id = {id}, name = "Golang"
WHEN PUT /api/v1/categories/{id} with { "name": "Golang", "description": null, "sort_order": 0 }
THEN response status = 200 (不算重複)
