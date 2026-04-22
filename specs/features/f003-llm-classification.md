# F-003: LLM 自動分類

## Status: active
## Sprint: 2
## Priority: P0

## 使用者故事

As a 開發者，I want 新建的知識條目自動被 LLM 分類並加上 tags，so that 我不需要手動整理分類，節省時間。

## API Contract

### `POST /api/v1/entries/:id/classify`

Auth：X-API-Key header

手動觸發單筆 entry 的 LLM 分類。

Request Body: 無

Response 202:
```json
{
  "message": "Classification started",
  "entry_id": "uuid"
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 404 | NOT_FOUND | entry_id 不存在 |

---

### `POST /api/v1/entries/classify-all`

Auth：X-API-Key header

批次分類所有 Inbox 中的 entries（category_id = NULL）。

Request Body: 無

Response 202:
```json
{
  "message": "Batch classification started",
  "entry_count": 15
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key 無效或缺失 |

## Data Model

無額外 data model。分類結果直接更新 Entry 的 category_id、tags、title 欄位。

### LLM 回傳格式（內部）

```json
{
  "category": "string",
  "tags": ["string"],
  "title": "string"
}
```

## Business Rules

1. 新 entry 建立後，背景 goroutine 自動觸發 LLM 分類（非同步）
2. LLM 回傳的 category 使用 LOWER(TRIM()) 做 case-insensitive 比對
3. 若 category 不存在，自動建立新的 Category（name = LLM 回傳的 category）
4. 分類結果直接套用到 entry，不需使用者確認
5. title 僅在原本為空（NULL）時才覆蓋為 LLM 建議的 title
6. tags 會與 entry 現有 tags 合併（union），不是取代
7. LLM 分類失敗時，entry 保持原狀（不改任何欄位）
8. 批次分類（classify-all）序列執行，逐筆處理
9. 已有 category_id 的 entry 仍可透過手動觸發重新分類
10. 分類使用的 LLM provider 按照 F-007 的優先序選擇

## Scenarios

### Happy Path

#### Scenario: 新 entry 建立後自動分類
GIVEN LLM provider is configured and active
AND category "golang" exists
WHEN POST /api/v1/entries with { "content": "goroutine 是 Go 的輕量級線程..." }
THEN response status = 201
AND 背景觸發 LLM 分類
AND 分類完成後 entry.category_id = "golang" 的 id
AND entry.tags 包含 LLM 建議的 tags

#### Scenario: 手動觸發分類
GIVEN entry #1 exists with category_id = null
AND LLM provider is configured and active
WHEN POST /api/v1/entries/{id}/classify
THEN response status = 202
AND response body contains { "message": "Classification started", "entry_id": "{id}" }

#### Scenario: 批次分類 Inbox
GIVEN 3 entries exist with category_id = null
AND LLM provider is configured and active
WHEN POST /api/v1/entries/classify-all
THEN response status = 202
AND response body contains { "entry_count": 3 }
AND 3 entries 逐筆被 LLM 分類

#### Scenario: LLM 回傳新 category（自動建立）
GIVEN no category "machine-learning" exists
AND entry #1 content 與 ML 相關
WHEN LLM classify entry #1 returns { "category": "Machine Learning", "tags": ["ml"], "title": "..." }
THEN Category "Machine Learning" 被自動建立
AND entry #1.category_id = 新建立的 category id

#### Scenario: title 為空時覆蓋
GIVEN entry exists with title = null, content = "goroutine 學習筆記..."
WHEN LLM classify returns { "category": "golang", "tags": ["go"], "title": "Goroutine 學習筆記" }
THEN entry.title = "Goroutine 學習筆記"

#### Scenario: title 已有值時不覆蓋
GIVEN entry exists with title = "我的筆記", content = "..."
WHEN LLM classify returns { "category": "golang", "tags": ["go"], "title": "建議標題" }
THEN entry.title = "我的筆記" (不變)

### Error Handling

#### Scenario: LLM 分類失敗時 entry 不變
GIVEN entry exists with category_id = null, tags = ["original"]
AND LLM provider returns error
WHEN 背景分類被觸發
THEN entry.category_id remains null
AND entry.tags remains ["original"]

#### Scenario: 手動分類不存在的 entry
GIVEN 使用者已認證
WHEN POST /api/v1/entries/{non-existent-uuid}/classify
THEN response status = 404
AND response body code = "NOT_FOUND"

#### Scenario: 未認證呼叫分類 API
WHEN POST /api/v1/entries/{id}/classify without X-API-Key header
THEN response status = 401
AND response body code = "UNAUTHORIZED"

### Edge Cases

#### Scenario: 批次分類時 Inbox 為空
GIVEN 所有 entries 都已有 category_id
WHEN POST /api/v1/entries/classify-all
THEN response status = 202
AND response body contains { "entry_count": 0 }

#### Scenario: 已有 category 的 entry 手動重新分類
GIVEN entry exists with category_id = {old_cat_id}
AND LLM returns { "category": "new-category", "tags": ["new"], "title": "..." }
WHEN POST /api/v1/entries/{id}/classify
THEN response status = 202
AND 分類完成後 entry.category_id 更新為新 category

#### Scenario: LLM 回傳 category 大小寫不同但已存在
GIVEN category "Golang" exists
WHEN LLM returns { "category": "golang", "tags": [], "title": "..." }
THEN 使用既有的 "Golang" category（不建立新的）

#### Scenario: 無可用的 LLM provider
GIVEN no active LLM provider configured
WHEN 新 entry 建立觸發背景分類
THEN 分類被跳過，entry 保持原狀
