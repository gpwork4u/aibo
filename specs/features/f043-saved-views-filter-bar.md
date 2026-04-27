# F-043: Saved Views & Filter Bar

## Status: active
## Sprint: 14
## Priority: P1
## GitHub Issues: 待開

## 使用者故事
As a user, I want to save custom filter combinations as named views and quickly switch between them, so that I can access frequently used knowledge subsets without re-applying filters each time.

## 設計決策
- Saved Views 儲存於後端（新 DB table `saved_views`）
- 適用範圍：Library（初期），可未來延伸至 Inbox
- Filter 參數以 JSON 儲存（flexible schema，不強制 migration 每次新增欄位）
- UI：sidebar 下方新增 "Views" 區塊 + Library toolbar 右側快速切換

## Data Model

```sql
-- migration 018
CREATE TABLE saved_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  scope       VARCHAR(20) NOT NULL DEFAULT 'library',  -- library / inbox
  filters     JSONB NOT NULL DEFAULT '{}',
  sort_by     VARCHAR(50),
  sort_dir    VARCHAR(4) DEFAULT 'desc',
  icon        VARCHAR(50),                              -- emoji or icon name
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### filters JSONB 範例
```json
{
  "status": ["library"],
  "category_id": "uuid-or-null",
  "tags": ["tag1", "tag2"],
  "q": "keyword",
  "date_range": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }
}
```

## API Contract

### `GET /api/v1/views`
Auth：cookie session 或 API Key

Response 200:
```json
[{
  "id": "uuid",
  "name": "string",
  "scope": "library",
  "filters": {},
  "sort_by": "updated_at",
  "sort_dir": "desc",
  "icon": "📚",
  "position": 0
}]
```

### `POST /api/v1/views`
Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | yes | 1-100 chars |
| scope | string | no | `library`（預設）/ `inbox` |
| filters | object | no | JSONB，max 4KB |
| sort_by | string | no | 允許值同 Library sort |
| sort_dir | string | no | `asc` / `desc` |
| icon | string | no | max 10 chars（emoji） |
| position | integer | no | default: 最大 position + 1 |

Response 201：建立的 view 物件

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | name 為空 / filters 超過 4KB |
| 409 | DUPLICATE | 同 scope 下 name 已存在（大小寫不敏感） |

### `PATCH /api/v1/views/:id`
Request Body：同 POST，所有欄位 optional（partial update）
Response 200：更新後的 view 物件

### `DELETE /api/v1/views/:id`
Response 204：無 body

### `PATCH /api/v1/views/reorder`（批次更新 position）
Request Body:
```json
{ "ids": ["uuid1", "uuid2", "uuid3"] }
```
Response 200：`{ "updated": 3 }`

## Business Rules
1. 每個使用者（目前單使用者）最多 50 個 views
2. position 決定顯示順序，支援拖曳重排（PATCH /views/reorder）
3. 刪除 view 不影響 entries 資料
4. 內建 system views（"All"、"Inbox"）不可刪除（by convention，非 DB 記錄）
5. 切換 view 時，URL 更新為對應的 filter params（不儲存 view id 至 URL）

## Scenarios

### Happy Path

#### Scenario: 建立新 Saved View
GIVEN Library 中已設定 category=Programming, tags=["golang"] 的過濾
WHEN 使用者點擊 "Save View"，輸入名稱 "Go Resources"
THEN POST /api/v1/views 成功，response 201
AND 新 view 出現於 sidebar Views 區塊

#### Scenario: 套用 Saved View
GIVEN 有名為 "Go Resources" 的 view（filters: {tags: ["golang"]}）
WHEN 使用者點擊 sidebar 中的 "Go Resources"
THEN Library URL 更新含對應 filter params
AND Library 列表顯示 tags 含 golang 的 entries

#### Scenario: 刪除 Saved View
GIVEN view "Go Resources" 已存在
WHEN 使用者點擊 view 旁的 "⋯" > Delete
THEN DELETE /api/v1/views/:id，response 204
AND view 從 sidebar 移除

### Error Handling

#### Scenario: 名稱重複時拒絕
GIVEN 已有名為 "Go Resources" 的 view（scope=library）
WHEN POST /api/v1/views with { "name": "go resources" }
THEN response status = 409
AND code = "DUPLICATE"

### Edge Cases

#### Scenario: 超過 50 個 views
GIVEN 使用者已有 50 個 views
WHEN POST /api/v1/views（新增第 51 個）
THEN response status = 400
AND code = "LIMIT_EXCEEDED"
