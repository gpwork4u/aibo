# F-026: 行事曆頁面（月/週/日視圖）

## Status: active
## Sprint: 8
## Priority: P0

## 使用者故事
As a 個人知識庫使用者,
I want 在行事曆上同時看到每天新增的知識條目與 Google Calendar 事件,
so that 能以時間軸重溫當日發生的事與學到的東西，作為後續日記與代理人格的原料。

## 範圍
- 前端新增 `/calendar` 頁面，支援 **月 / 週 / 日** 三種檢視模式
- 後端新增彙整 API：依日期區間一次撈回 **entries（依 created_at）** + **gcal events（依 start_time）**
- Gcal 事件**不再自動匯入成 entries**（維持既有 `/api/v1/import/gcal` 手動操作），行事曆用新的 read-through API 即時撈 Google Calendar
- 點擊某天 → 彈出右側 Day Detail Panel（不另開頁面）
- Day Detail Panel 內可將 gcal 事件 **一鍵轉成 entry**

## 不做（Non-Goals）
- 雙向同步（不會寫回 Google Calendar）
- Gantt / Resource timeline
- 跨帳號共享

## API Contract

### `GET /api/v1/calendar`
彙整指定區間的 entries 與 gcal events（read-through，不落 DB）

Auth：API Key

Query Params:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| since | ISO 8601 date | yes | e.g. `2026-04-01` |
| until | ISO 8601 date | yes | until > since, max span 92 天 |
| view | enum | no | `month` \| `week` \| `day`，預設 `month`（僅影響 payload 聚合粒度）|
| include_gcal | bool | no | 預設 true；若使用者未連 gcal 則忽略 |
| calendar_id | string | no | 預設 `primary` |

Response 200:
```json
{
  "since": "2026-04-01",
  "until": "2026-04-30",
  "days": [
    {
      "date": "2026-04-24",
      "entry_count": 3,
      "event_count": 2,
      "has_journal": true,
      "entries": [
        { "id": "uuid", "title": "...", "summary": "...", "source_type": "manual", "tags": ["..."], "created_at": "2026-04-24T09:11:00Z" }
      ],
      "events": [
        { "gcal_id": "abc123", "summary": "Standup", "start": "2026-04-24T09:00:00Z", "end": "2026-04-24T09:30:00Z", "all_day": false, "linked_entry_id": null }
      ],
      "journal": { "id": "uuid", "mood": "ok" } 
    }
  ]
}
```

- `month` view：`entries` 僅回傳每天最多 3 筆（其餘看 count），`events` 全部回傳
- `week` / `day` view：`entries` 與 `events` 全量回傳
- `has_journal`：當日有 journal_entry 時為 true
- `linked_entry_id`：若該 gcal event 已被轉成 entry（entry.source_type='gcal' 且 source_ref=gcal_id）則回傳該 entry id

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | since/until 缺失、格式錯、until<=since、跨度>92 天 |
| 401 | UNAUTHORIZED | API key 無效 |
| 424 | GCAL_NOT_CONNECTED | include_gcal=true 但尚未連 Google Calendar（前端應引導到設定頁）|
| 502 | GCAL_UPSTREAM_ERROR | Google API 失敗；回應包含 fallback 的 entries-only 結果 |

### `GET /api/v1/calendar/days/:date`
取得單日完整資訊（替代 side panel 開啟時的詳細載入）

Path：`date` 格式 `YYYY-MM-DD`（以使用者 timezone 解釋）

Response 200：
```json
{
  "date": "2026-04-24",
  "entries": [ /* 完整 EntryListItem */ ],
  "events":  [ /* 完整 event with description, location, attendees */ ],
  "journal": null
}
```

### `POST /api/v1/calendar/events/:gcal_id/to-entry`
將 gcal event 轉成 entry（若已轉過回 409）

Request：
```json
{ "calendar_id": "primary", "title_override": null, "content_override": null }
```

Response 201：回傳新建的 Entry（source_type=gcal, source_ref=gcal_id）

Error：
| Status | Code |
|--------|------|
| 404 | EVENT_NOT_FOUND |
| 409 | ALREADY_LINKED |
| 424 | GCAL_NOT_CONNECTED |

## Data Model

**不新增資料表**。實作重點：
- 用既有 `entries.source_type='gcal'` + `entries.source_ref=<gcal_event_id>` 建立 event ↔ entry 關聯
- 新增 index（migration 012）：
  ```sql
  CREATE INDEX IF NOT EXISTS idx_entries_created_at_date ON entries ((created_at::date));
  CREATE UNIQUE INDEX IF NOT EXISTS uq_entries_gcal_ref ON entries (source_ref) WHERE source_type = 'gcal';
  ```

## Business Rules
1. 時區：後端以 UTC 儲存；API 接受 `X-Timezone` header（IANA，如 `Asia/Taipei`）決定「一天」的邊界，預設 `UTC`
2. Month view 一次最多載入 ~42 天（6 週），Week view 7 天，Day view 1 天
3. Entries 按 `created_at`、events 按 `start` 歸屬到日；跨日 event 歸屬到 start 所在日，但在 day/week view 中每一天仍顯示（client-side 重複渲染）
4. Gcal upstream 失敗時仍回傳 entries（degraded response），response header `X-Degraded: gcal`

## Scenarios

### Happy Path

#### Scenario: 取得本月彙整（含 gcal）
GIVEN 使用者已登入且已連 Google Calendar
AND 2026-04-24 有 3 筆 entries 與 2 筆 gcal events
WHEN GET /api/v1/calendar?since=2026-04-01&until=2026-04-30&view=month
THEN response status = 200
AND response.days[?(@.date=='2026-04-24')].entry_count = 3
AND response.days[?(@.date=='2026-04-24')].event_count = 2

#### Scenario: 切換到週視圖載入完整 entries
WHEN GET /api/v1/calendar?since=2026-04-20&until=2026-04-26&view=week
THEN response.days[*].entries 為每日全量（無 3 筆上限）

#### Scenario: 取得單日詳情
WHEN GET /api/v1/calendar/days/2026-04-24
THEN response status = 200
AND response.entries 為完整 Entry 結構
AND response.events[*] 包含 description 與 location

#### Scenario: 把 gcal event 轉成 entry
GIVEN gcal event `abc123` 尚未關聯 entry
WHEN POST /api/v1/calendar/events/abc123/to-entry
THEN response status = 201
AND response.source_type = "gcal"
AND response.source_ref = "abc123"

### Error Handling

#### Scenario: 跨度超過 92 天被拒絕
WHEN GET /api/v1/calendar?since=2026-01-01&until=2026-06-01
THEN response status = 400
AND response.code = "INVALID_INPUT"

#### Scenario: 未連 gcal 但要求 include_gcal
GIVEN 使用者尚未完成 gcal OAuth
WHEN GET /api/v1/calendar?since=2026-04-01&until=2026-04-30&include_gcal=true
THEN response status = 424
AND response.code = "GCAL_NOT_CONNECTED"

#### Scenario: gcal 上游失敗走 degraded
GIVEN Google Calendar API 回 500
WHEN GET /api/v1/calendar?...&include_gcal=true
THEN response status = 200
AND response.days[*].events = []
AND response header X-Degraded = "gcal"

#### Scenario: 重複轉同一個 gcal event
GIVEN gcal event `abc123` 已被轉成 entry
WHEN POST /api/v1/calendar/events/abc123/to-entry
THEN response status = 409
AND response.code = "ALREADY_LINKED"

### Edge Cases

#### Scenario: 跨日 event 在 day view 中每天都出現
GIVEN event 從 2026-04-24 23:00 至 2026-04-25 02:00
WHEN GET /api/v1/calendar/days/2026-04-25
THEN response.events 包含此 event

#### Scenario: 不同時區下的日期歸屬
GIVEN entry created_at = 2026-04-24T23:30:00+08:00
AND request header X-Timezone = Asia/Taipei
WHEN GET /api/v1/calendar?since=2026-04-24&until=2026-04-24
THEN 該 entry 歸屬於 2026-04-24
