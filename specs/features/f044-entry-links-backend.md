# F-044: Entry Links Backend

## Status: active
## Sprint: 15
## Priority: P0
## GitHub Issues: 待開

## 使用者故事
As a user, I want to create typed semantic links between knowledge entries (e.g., "derives from", "contradicts"), so that I can represent relationships between concepts and navigate the knowledge graph.

## 設計決策
- Schema B 帶語意版（定案）
- `link_type` ENUM：`derives_from / contradicts / duplicate_of / references / supersedes / related_to`
- `relation` 自由文字（補充說明語意）
- `confidence` 0.0-1.0（manual 建立時預設 1.0；LLM 建立時由模型輸出）
- `source` ENUM：`manual / llm / auto_merge`
- 雙向關係：link 為有向邊（from_id → to_id），查詢時 UNION 雙向

## Data Model

```sql
-- migration 019
CREATE TYPE link_type_enum AS ENUM (
  'derives_from',
  'contradicts',
  'duplicate_of',
  'references',
  'supersedes',
  'related_to'
);

CREATE TYPE link_source_enum AS ENUM ('manual', 'llm', 'auto_merge');

CREATE TABLE entry_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id     UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  to_id       UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  link_type   link_type_enum NOT NULL DEFAULT 'related_to',
  relation    VARCHAR(200),             -- 自由文字補充描述
  confidence  NUMERIC(4,3) NOT NULL DEFAULT 1.000
              CHECK (confidence >= 0 AND confidence <= 1),
  source      link_source_enum NOT NULL DEFAULT 'manual',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_entry_links UNIQUE (from_id, to_id, link_type)
);

CREATE INDEX ON entry_links(from_id);
CREATE INDEX ON entry_links(to_id);
```

## API Contract

### `GET /api/v1/entries/:id/links`
Auth：cookie session 或 API Key

Response 200:
```json
{
  "outgoing": [{
    "id": "uuid",
    "to_entry": { "id": "uuid", "title": "string", "summary": "string" },
    "link_type": "derives_from",
    "relation": "string or null",
    "confidence": 0.95,
    "source": "manual"
  }],
  "incoming": [{
    "id": "uuid",
    "from_entry": { "id": "uuid", "title": "string", "summary": "string" },
    "link_type": "references",
    "relation": null,
    "confidence": 1.0,
    "source": "llm"
  }]
}
```

### `POST /api/v1/entries/:id/links`
Auth：cookie session 或 API Key

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| to_id | UUID | yes | 目標 entry 必須存在 |
| link_type | string | no | ENUM 值，預設 `related_to` |
| relation | string | no | max 200 chars |
| confidence | float | no | 0.0-1.0，預設 1.0（manual source） |
| source | string | no | `manual`（預設）/ `llm` / `auto_merge` |

Response 201：建立的 link 物件

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | to_id 格式錯誤 / link_type 不在 ENUM / confidence 超出範圍 |
| 404 | NOT_FOUND | from_id 或 to_id entry 不存在 |
| 409 | DUPLICATE | 同 from_id + to_id + link_type 已存在 |
| 422 | SELF_LINK | from_id == to_id |

### `PATCH /api/v1/entries/links/:link_id`
Request Body：`relation`、`link_type`、`confidence`（partial update）
Response 200：更新後 link 物件

### `DELETE /api/v1/entries/links/:link_id`
Response 204：無 body

## Business Rules
1. from_id == to_id 拒絕（self-link 無意義）
2. 同 from_id + to_id + link_type 組合唯一（可有不同 link_type 的多條 link）
3. entry 刪除時 CASCADE 刪除關聯的 links（ON DELETE CASCADE）
4. LLM 建立的 links confidence < 0.5 不自動顯示（前端過濾，後端儲存）
5. `duplicate_of` link_type 的語意：建議前端提示合併，但後端不自動合併

## Scenarios

### Happy Path

#### Scenario: 建立 derives_from 連結
GIVEN entry A（#1）和 entry B（#2）均存在
WHEN POST /api/v1/entries/1/links with { "to_id": "2", "link_type": "derives_from", "relation": "基於 B 的概念延伸" }
THEN response status = 201
AND response body 包含 link_type = "derives_from"
AND confidence = 1.0（manual 預設）

#### Scenario: 查詢雙向連結
GIVEN entry A → B（derives_from），entry C → A（references）已存在
WHEN GET /api/v1/entries/A/links
THEN outgoing 包含 {to_entry: B, link_type: "derives_from"}
AND incoming 包含 {from_entry: C, link_type: "references"}

#### Scenario: 刪除連結
GIVEN link #L1 存在
WHEN DELETE /api/v1/entries/links/L1
THEN response status = 204
AND link 從 DB 移除

### Error Handling

#### Scenario: self-link 拒絕
WHEN POST /api/v1/entries/1/links with { "to_id": "1" }
THEN response status = 422
AND code = "SELF_LINK"

#### Scenario: 重複連結拒絕
GIVEN link（A→B, derives_from）已存在
WHEN POST /api/v1/entries/A/links with { "to_id": "B", "link_type": "derives_from" }
THEN response status = 409
AND code = "DUPLICATE"

#### Scenario: to_id 不存在
WHEN POST /api/v1/entries/1/links with { "to_id": "nonexistent-uuid" }
THEN response status = 404
AND code = "NOT_FOUND"

### Edge Cases

#### Scenario: 同 pair 不同 link_type 允許
GIVEN link（A→B, derives_from）已存在
WHEN POST /api/v1/entries/A/links with { "to_id": "B", "link_type": "contradicts" }
THEN response status = 201
AND 兩條 links 均存在

#### Scenario: Entry 刪除時 links cascade
GIVEN entry B 有 5 條 links（incoming + outgoing 均有）
WHEN DELETE /api/v1/entries/B
THEN 5 條 links 均從 DB 刪除
