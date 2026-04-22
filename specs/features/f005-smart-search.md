# F-005: LLM 同義關鍵字搜尋

## Status: active
## Sprint: 2
## Priority: P0

## 使用者故事

As a 開發者，I want 用自然語言搜尋知識庫並自動展開同義詞，so that 我能找到相關但用詞不同的知識條目。

## API Contract

### `POST /api/v1/search`

Auth：X-API-Key header

智慧搜尋：LLM 展開同義關鍵字後進行 PostgreSQL 全文搜尋。

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| query | string | yes | 1-500 chars |
| category_id | string (UUID) | no | 過濾指定分類 |
| limit | integer | no | 1-50, default 10 |

Response 200:
```json
{
  "results": [
    {
      "entry_id": "uuid",
      "title": "string | null",
      "content_preview": "string (前 200 字)",
      "tags": ["string"],
      "relevance": 0.85,
      "matched_keywords": ["golang", "go"]
    }
  ],
  "synonyms_used": ["golang", "go", "go語言"],
  "total": 15,
  "degraded": false
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | query 為空或超過 500 字 |
| 400 | INVALID_INPUT | limit 超出 1-50 範圍 |
| 401 | UNAUTHORIZED | API Key 無效或缺失 |

---

### `GET /api/v1/search/simple`

Auth：X-API-Key header

簡單搜尋：純資料庫全文搜尋，不經過 LLM。作為降級方案或快速搜尋使用。

Query Parameters:
| Param | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| q | string | yes | - | 1-500 chars |
| category_id | string (UUID) | no | - | 過濾指定分類 |
| tag | string | no | - | 可多次指定，AND 邏輯 |
| limit | integer | no | 10 | 1-50 |
| offset | integer | no | 0 | >= 0 |

Response 200:
```json
{
  "results": [
    {
      "entry_id": "uuid",
      "title": "string | null",
      "content_preview": "string (前 200 字)",
      "tags": ["string"],
      "relevance": 0.75
    }
  ],
  "total": 15,
  "degraded": false
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | q 為空或超過 500 字 |
| 400 | INVALID_INPUT | limit 超出 1-50 範圍 |
| 401 | UNAUTHORIZED | API Key 無效或缺失 |

## Data Model

無額外 data model。搜尋使用 Entry 的既有 GIN indexes：
- `to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))` -- 全文搜尋
- `pg_trgm` extension -- 模糊比對

搜尋權重：
- title: 權重 A
- tags: 權重 A
- content: 權重 B

## Business Rules

1. 智慧搜尋流程：query -> LLM 展開同義詞 (10s timeout) -> PostgreSQL tsvector + trgm 搜尋 -> 回傳結果
2. LLM 同義詞展開 timeout 為 10 秒
3. LLM 失敗（timeout/error）時自動降級：使用原始 query 進行資料庫搜尋，degraded = true
4. LLM 完全不可用時，POST /api/v1/search 自動降級為 simple search 邏輯，degraded = true
5. 搜尋結果按 relevance 降序排列
6. content_preview 為前 200 字
7. matched_keywords 欄位只在智慧搜尋（非降級）時有值
8. synonyms_used 欄位只在智慧搜尋（非降級）時有值

## Scenarios

### Happy Path

#### Scenario: 智慧搜尋成功
GIVEN LLM provider is configured and active
AND entry exists with title = "Go 語言效能優化"
WHEN POST /api/v1/search with { "query": "golang performance" }
THEN response status = 200
AND response body degraded = false
AND response body synonyms_used contains ["golang", "go", "performance", "效能"]
AND response body results contains the entry
AND results[0].matched_keywords is not empty

#### Scenario: 智慧搜尋限制 category
GIVEN entry #1 in category "golang" with title = "Go 效能"
AND entry #2 in category "python" with title = "Python 效能"
WHEN POST /api/v1/search with { "query": "效能", "category_id": "{golang_cat_id}" }
THEN response status = 200
AND response body results contains only entry #1

#### Scenario: 智慧搜尋指定 limit
GIVEN 20 entries 與 "golang" 相關
WHEN POST /api/v1/search with { "query": "golang", "limit": 5 }
THEN response status = 200
AND response body results length = 5

#### Scenario: 簡單搜尋
GIVEN entry exists with title = "PostgreSQL 索引"
WHEN GET /api/v1/search/simple?q=postgresql
THEN response status = 200
AND response body results contains the entry
AND response body degraded = false

#### Scenario: 簡單搜尋含 tag 過濾
GIVEN entry #1 with tags = ["db", "postgresql"]
AND entry #2 with tags = ["db", "mysql"]
WHEN GET /api/v1/search/simple?q=database&tag=postgresql
THEN response status = 200
AND response body results contains only entry #1

### Error Handling

#### Scenario: query 為空
GIVEN 使用者已認證
WHEN POST /api/v1/search with { "query": "" }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: query 超過 500 字
GIVEN 使用者已認證
WHEN POST /api/v1/search with { "query": "a" * 501 }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: limit 超出範圍
GIVEN 使用者已認證
WHEN POST /api/v1/search with { "query": "test", "limit": 51 }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: 未認證
WHEN POST /api/v1/search with { "query": "test" } without X-API-Key header
THEN response status = 401
AND response body code = "UNAUTHORIZED"

### Edge Cases

#### Scenario: LLM timeout 自動降級
GIVEN LLM provider 回應超過 10 秒
WHEN POST /api/v1/search with { "query": "golang" }
THEN response status = 200
AND response body degraded = true
AND response body synonyms_used = [] or null
AND results 使用原始 query 搜尋

#### Scenario: LLM 完全不可用自動降級
GIVEN no active LLM provider configured
WHEN POST /api/v1/search with { "query": "golang" }
THEN response status = 200
AND response body degraded = true

#### Scenario: 搜尋無結果
GIVEN 沒有任何匹配的 entries
WHEN POST /api/v1/search with { "query": "zzz_no_match_zzz" }
THEN response status = 200
AND response body results = []
AND response body total = 0

#### Scenario: query 恰好 500 字
GIVEN 使用者已認證
WHEN POST /api/v1/search with { "query": "a" * 500 }
THEN response status = 200

#### Scenario: 搜尋結果按 relevance 排序
GIVEN entry #1 with title = "Golang 基礎" (高 relevance)
AND entry #2 with content 中提到一次 "golang" (低 relevance)
WHEN POST /api/v1/search with { "query": "golang" }
THEN response body results[0].entry_id = entry #1 的 id
AND results[0].relevance >= results[1].relevance
