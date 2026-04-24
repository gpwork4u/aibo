# F-030: Google Calendar 整合強化

## Status: active
## Sprint: 9
## Priority: P1

## 使用者故事
As a 使用者,
I want 行事曆能即時讀到 gcal 事件、管理連線狀態並手動同步,
so that 不用等 import job 就能看到最新事件。

## 範圍（相對 F-009 既有單向 import 的增量）
- 新增 **read-through API**：`GET /api/v1/integrations/gcal/events?since=&until=&calendar_id=`（被 F-026 的 /calendar 內部使用，也對外暴露）
- 新增 **連線狀態 API**：`GET /api/v1/integrations/gcal/status` 回 `{ connected: bool, email, connected_at, expires_at }`
- 新增 **中斷連線**：`DELETE /api/v1/integrations/gcal`
- 新增 **列出可用日曆**：`GET /api/v1/integrations/gcal/calendars`
- Token refresh：自動 refresh expired access token；refresh token 失效則返回 401 `GCAL_REAUTH_REQUIRED`
- 設定頁面新增「Google Calendar」區塊（狀態 + 連線 / 中斷按鈕 + 預設 calendar_id 選擇）

## API Contract

### `GET /api/v1/integrations/gcal/status`
Response 200：
```json
{
  "connected": true,
  "email": "user@example.com",
  "connected_at": "2026-04-01T00:00:00Z",
  "access_token_expires_at": "2026-04-24T11:00:00Z",
  "default_calendar_id": "primary"
}
```
未連線：`{ "connected": false }`

### `GET /api/v1/integrations/gcal/calendars`
Response 200：
```json
{ "calendars": [ { "id": "primary", "summary": "Work", "primary": true, "time_zone": "Asia/Taipei" } ] }
```

### `GET /api/v1/integrations/gcal/events`
Query：`since`, `until`, `calendar_id`, `include_recurring`(default true)

Response 200：
```json
{
  "events": [
    {
      "gcal_id": "abc123",
      "summary": "...",
      "description": "...",
      "location": "...",
      "start": "ISO 8601",
      "end": "ISO 8601",
      "all_day": false,
      "recurring_event_id": null,
      "html_link": "https://calendar.google.com/...",
      "linked_entry_id": "uuid or null"
    }
  ]
}
```

Error：
| Status | Code |
|--------|------|
| 424 | GCAL_NOT_CONNECTED |
| 401 | GCAL_REAUTH_REQUIRED | refresh token 失效 |
| 502 | GCAL_UPSTREAM_ERROR |

### `PUT /api/v1/integrations/gcal/settings`
Request：`{ "default_calendar_id": "primary" }`

### `DELETE /api/v1/integrations/gcal`
刪除 OAuth token，回 204

## Data Model

Migration 014：擴充 `gcal_integrations`
```sql
ALTER TABLE gcal_integrations
  ADD COLUMN IF NOT EXISTS default_calendar_id TEXT NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS access_token_expires_at TIMESTAMPTZ;
```

## Scenarios

### Happy Path

#### Scenario: 查詢連線狀態（已連）
GIVEN 使用者已完成 OAuth
WHEN GET /api/v1/integrations/gcal/status
THEN response.connected = true
AND response.email 為 oauth 取得的 email

#### Scenario: 列出日曆
WHEN GET /api/v1/integrations/gcal/calendars
THEN response.calendars 至少有一筆 primary = true

#### Scenario: 中斷連線
WHEN DELETE /api/v1/integrations/gcal
THEN response status = 204
AND 後續 GET /status 回 { connected: false }

#### Scenario: Access token 自動 refresh
GIVEN access token 已過期
AND refresh token 仍有效
WHEN GET /api/v1/integrations/gcal/events
THEN response status = 200
AND DB 中 access_token_expires_at 被更新

### Error Handling

#### Scenario: Refresh token 失效
GIVEN refresh token 已被撤銷
WHEN GET /api/v1/integrations/gcal/events
THEN response status = 401
AND response.code = "GCAL_REAUTH_REQUIRED"

#### Scenario: 未連時呼叫 events
WHEN GET /api/v1/integrations/gcal/events（未 OAuth）
THEN response status = 424
AND response.code = "GCAL_NOT_CONNECTED"

### Edge Cases

#### Scenario: 多個日曆切換
GIVEN default_calendar_id = "work@group.calendar.google.com"
WHEN GET /api/v1/integrations/gcal/events（無指定 calendar_id）
THEN 使用 default_calendar_id 查詢
