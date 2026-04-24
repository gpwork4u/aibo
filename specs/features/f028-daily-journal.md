# F-028: 每日日記

## Status: active
## Sprint: 9
## Priority: P0

## 使用者故事
As a 使用者,
I want 每天寫一篇日記，並能一鍵讓 LLM 根據當日 entries 與 gcal 事件產生初稿,
so that 日記成為「代理人格」的主要訓練材料。

## 設計決策
- **每日最多一篇**（`journal_entries` 對 (user_scope, date) 唯一）
- **獨立資料表**：與 entries 分離，欄位偏向敘事/情緒；透過 `journal_source_refs` 關聯 entries 與 gcal events
- 支援 **LLM draft**：以當日 entries + events 為 context 請 LLM 產初稿
- Journal 內容會被 **MCP Server（F-011）** 以特別 tool 暴露給 LLM 代理人格

## Data Model

### Migration 013: journal_entries

```sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,                -- 每日一篇
  title TEXT,
  content TEXT NOT NULL,                    -- Markdown
  mood TEXT,                                -- enum: great/ok/down/null
  highlights TEXT[],                        -- LLM 萃取的當日亮點
  is_draft BOOLEAN NOT NULL DEFAULT false,  -- true = LLM 產生尚未確認
  generated_by TEXT,                        -- NULL / 'llm' / 'user'
  llm_provider_id UUID REFERENCES llm_providers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE journal_source_refs (
  journal_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,                -- 'entry' | 'gcal_event'
  source_id TEXT NOT NULL,                  -- entry.id (uuid) or gcal event id
  PRIMARY KEY (journal_id, source_type, source_id)
);
```

## API Contract

### `GET /api/v1/journal`
List (分頁)

Query：`page`, `per_page`, `since`, `until`, `mood`, `is_draft`

Response 200：`{ data: [...], pagination: {...} }`

### `GET /api/v1/journal/:date`
取得某日 journal（date 格式 YYYY-MM-DD）

- 存在 → 200 + 完整物件（含 `source_refs`）
- 不存在 → 404 `JOURNAL_NOT_FOUND`

### `POST /api/v1/journal`
建立

Request：
```json
{
  "date": "2026-04-24",
  "title": "...",
  "content": "...",
  "mood": "ok",
  "highlights": ["..."],
  "source_refs": [
    { "source_type": "entry", "source_id": "uuid" },
    { "source_type": "gcal_event", "source_id": "abc123" }
  ]
}
```

Error：
| Status | Code |
|--------|------|
| 400 | INVALID_INPUT |
| 409 | JOURNAL_EXISTS |

### `PATCH /api/v1/journal/:date`
更新（partial）。若原為 draft 且 is_draft=false 則代表「使用者確認 LLM 草稿」，`generated_by` 保持 `llm` 但 `is_draft=false`。

### `DELETE /api/v1/journal/:date`

### `POST /api/v1/journal/:date/draft`
讓 LLM 根據當日資料產生 draft（若已存在且 `is_draft=false` → 409）

Request：
```json
{
  "llm_provider_id": "uuid (optional)",
  "tone": "reflective",            // enum: reflective / concise / narrative
  "include_entries": true,
  "include_events": true
}
```

Response 201：回傳完整 journal 物件（`is_draft=true`, `generated_by='llm'`），並自動填入 `source_refs`

Error：
| Status | Code |
|--------|------|
| 409 | JOURNAL_EXISTS | 當日已有非 draft journal |
| 503 | LLM_UNAVAILABLE |

## Business Rules
1. Date 使用 `X-Timezone` header 解釋（同 F-026）
2. LLM Prompt 由後端組裝：包含使用者當日每筆 entry 的 title + summary + tags + gcal events 的 summary + start/end
3. `content` 最大 20k chars
4. Draft 可重複重生（舊 draft 被覆寫），但非 draft 不得被 draft 覆寫

## Scenarios

### Happy Path

#### Scenario: 建立今日日記
WHEN POST /api/v1/journal with { "date": "2026-04-24", "content": "Good day.", "mood": "great" }
THEN response status = 201
AND response.is_draft = false
AND response.generated_by = "user"

#### Scenario: LLM 生成 draft
GIVEN 當日尚無 journal
AND 當日有 5 筆 entries 與 2 筆 gcal events
WHEN POST /api/v1/journal/2026-04-24/draft with { "tone": "reflective" }
THEN response status = 201
AND response.is_draft = true
AND response.generated_by = "llm"
AND response.source_refs 長度 = 7
AND response.content 不為空

#### Scenario: 確認並編輯 draft
GIVEN 今日已有 draft journal
WHEN PATCH /api/v1/journal/2026-04-24 with { "content": "edited", "is_draft": false }
THEN response status = 200
AND response.is_draft = false
AND response.generated_by = "llm"

### Error Handling

#### Scenario: 重複建立
GIVEN 2026-04-24 已有 journal
WHEN POST /api/v1/journal with { "date": "2026-04-24", ... }
THEN response status = 409
AND response.code = "JOURNAL_EXISTS"

#### Scenario: LLM 失敗
GIVEN 所有 LLM provider inactive
WHEN POST /api/v1/journal/2026-04-24/draft
THEN response status = 503
AND response.code = "LLM_UNAVAILABLE"

#### Scenario: content 超長
WHEN POST /api/v1/journal with content = "a" * 20001
THEN response status = 400
AND response.code = "INVALID_INPUT"

### Edge Cases

#### Scenario: Draft 覆蓋舊 draft
GIVEN 今日已有 is_draft=true 的 journal
WHEN POST /api/v1/journal/2026-04-24/draft
THEN response status = 201
AND 舊 draft 內容被新 draft 取代
