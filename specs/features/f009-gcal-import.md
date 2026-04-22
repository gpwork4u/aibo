# F-009: Google Calendar 整合

## Status: active
## Sprint: 3
## Priority: P2

## 使用者故事

As a 開發者，I want 將 Google Calendar 事件匯入知識庫，so that 我能記錄和搜尋會議與行程相關的筆記。

## API Contract

### `POST /api/v1/integrations/gcal/auth`

Auth：X-API-Key header

開始 Google OAuth 2.0 授權流程。

Request Body: 無

Response 200:
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 500 | INTERNAL_ERROR | OAuth client 未設定 |

---

### `GET /api/v1/integrations/gcal/callback`

OAuth callback endpoint。由 Google 重導向呼叫，帶有 authorization code。

Query Parameters:
| Param | Type | Required |
|-------|------|----------|
| code | string | yes |
| state | string | yes |

Response 200:
```json
{
  "message": "Google Calendar connected",
  "email": "user@gmail.com"
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | code 或 state 無效 |
| 500 | INTERNAL_ERROR | token 交換失敗 |

---

### `POST /api/v1/import/gcal`

Auth：X-API-Key header

同步匯入 Google Calendar 事件為知識條目。

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| calendar_id | string | no | 預設 "primary" |
| since | string (ISO 8601) | no | 預設 7 天前 |
| until | string (ISO 8601) | no | 預設 7 天後 |
| include_recurring | boolean | no | 預設 true |

Response 200:
```json
{
  "events_found": 20,
  "entries_created": 18,
  "entries_skipped": 2
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | since/until 格式無效 |
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 401 | GCAL_NOT_CONNECTED | Google Calendar 尚未授權 |
| 401 | GCAL_TOKEN_EXPIRED | Token 過期且 refresh 失敗 |

## Data Model

```
GcalIntegration {
  id: UUID (PK, auto-generated)
  email: VARCHAR(200) NOT NULL
  client_id: VARCHAR(500) NOT NULL
  client_secret: VARCHAR(500) NOT NULL (encrypted AES-256)
  access_token: TEXT NOT NULL (encrypted AES-256)
  refresh_token: TEXT NOT NULL (encrypted AES-256)
  token_expiry: TIMESTAMPTZ NOT NULL
  created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
}
```

### Calendar 事件對應 Entry 欄位

| Entry Field | Calendar 來源 |
|-------------|--------------|
| title | `[GCal] {event_summary}` |
| content | `時間: {start} ~ {end}\n地點: {location}\n\n{description}` |
| tags | `["gcal", "meeting"]` |
| source_type | `"gcal"` |
| source_ref | event ID |
| source | calendar_id |

## Business Rules

1. 只支援一組 Google 帳號（GcalIntegration 最多一筆）
2. 重新授權會覆蓋舊的 token
3. 去重：以 source_ref (event ID) 判斷，已存在的事件不重複匯入
4. 只匯入有 summary（標題）的事件，無 summary 的事件跳過
5. since 未指定時預設為 7 天前
6. until 未指定時預設為 7 天後
7. access_token 過期時自動使用 refresh_token 更新
8. refresh_token 也過期時，回傳 GCAL_TOKEN_EXPIRED 要求重新授權
9. 匯入的 entry 無 category_id（進入 Inbox）
10. 匯入為同步操作
11. client_id 和 client_secret 透過環境變數或設定檔提供

## Scenarios

### Happy Path

#### Scenario: 開始 OAuth 授權
GIVEN 使用者已認證
AND OAuth client 已設定
WHEN POST /api/v1/integrations/gcal/auth
THEN response status = 200
AND response body auth_url starts with "https://accounts.google.com"

#### Scenario: OAuth callback 成功
GIVEN valid authorization code
WHEN GET /api/v1/integrations/gcal/callback?code={code}&state={state}
THEN response status = 200
AND response body contains { "message": "Google Calendar connected", "email": "user@gmail.com" }
AND GcalIntegration record created/updated

#### Scenario: 匯入 Calendar 事件
GIVEN Google Calendar 已授權
AND calendar has 10 events with summary in date range
WHEN POST /api/v1/import/gcal
THEN response status = 200
AND events_found = 10
AND entries_created = 10
AND 新建的 entries 有 source_type = "gcal"

#### Scenario: 指定 calendar 和日期範圍
GIVEN Google Calendar 已授權
WHEN POST /api/v1/import/gcal with { "calendar_id": "work@group.calendar.google.com", "since": "2024-01-01T00:00:00Z", "until": "2024-01-31T23:59:59Z" }
THEN response status = 200
AND 只匯入指定 calendar 和日期範圍的事件

#### Scenario: 重複匯入跳過已存在的
GIVEN 第一次匯入已建立 10 entries
WHEN POST /api/v1/import/gcal (same params)
THEN response status = 200
AND entries_created = 0
AND entries_skipped = 10

### Error Handling

#### Scenario: 未授權 Google Calendar 就匯入
GIVEN no GcalIntegration record exists
WHEN POST /api/v1/import/gcal
THEN response status = 401
AND response body code = "GCAL_NOT_CONNECTED"

#### Scenario: Token 過期且 refresh 失敗
GIVEN GcalIntegration exists but both tokens expired
WHEN POST /api/v1/import/gcal
THEN response status = 401
AND response body code = "GCAL_TOKEN_EXPIRED"

#### Scenario: OAuth client 未設定
GIVEN OAuth client_id/client_secret not configured
WHEN POST /api/v1/integrations/gcal/auth
THEN response status = 500
AND response body code = "INTERNAL_ERROR"

#### Scenario: 未認證
WHEN POST /api/v1/import/gcal without X-API-Key header
THEN response status = 401
AND response body code = "UNAUTHORIZED"

### Edge Cases

#### Scenario: 跳過無 summary 的事件
GIVEN calendar has 5 events, 2 without summary
WHEN POST /api/v1/import/gcal
THEN events_found = 5
AND entries_created = 3
AND entries_skipped = 2

#### Scenario: 日期範圍內無事件
GIVEN calendar has no events in date range
WHEN POST /api/v1/import/gcal with { "since": "2099-01-01T00:00:00Z" }
THEN response status = 200
AND events_found = 0
AND entries_created = 0

#### Scenario: 重新授權覆蓋舊 token
GIVEN GcalIntegration already exists for "old@gmail.com"
WHEN complete OAuth flow for "new@gmail.com"
THEN GcalIntegration.email = "new@gmail.com"
AND old tokens replaced

#### Scenario: Entry content 格式
GIVEN event with summary = "Sprint Review", start = "2024-01-15T10:00:00Z", end = "2024-01-15T11:00:00Z", location = "Meeting Room A", description = "Demo new features"
WHEN event is imported
THEN entry.title = "[GCal] Sprint Review"
AND entry.content contains "時間: 2024-01-15T10:00:00Z ~ 2024-01-15T11:00:00Z"
AND entry.content contains "地點: Meeting Room A"
AND entry.content contains "Demo new features"
AND entry.tags = ["gcal", "meeting"]
