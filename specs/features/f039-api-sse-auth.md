# F-039: API SSE Auth（Cookie Session + SSE Skeleton）

## Status: active (skeleton — router wiring pending)
## Sprint: 13
## Priority: P0
## GitHub Issues: #194 (feature), #203 (PR)

## 使用者故事
As a frontend app, I want to authenticate via cookie session (not API key), so that the browser-based UI can maintain a secure session without exposing API keys.

## 設計決策
- Cookie session auth 與既有 X-API-Key auth 並存（middleware 先查 cookie，fallback 至 API Key）
- Session 儲存於 PostgreSQL（`sessions` table），不使用 Redis
- SSE endpoint 為 skeleton，完整 Copilot SSE 由 F-048 實作
- Cookie：`HttpOnly; Secure; SameSite=Lax; Path=/`

## Data Model

```sql
-- migration 017
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(64) NOT NULL,          -- 目前單使用者，固定值 "admin"
  token_hash  CHAR(64) NOT NULL UNIQUE,      -- SHA-256(session_token)
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON sessions(token_hash);
CREATE INDEX ON sessions(expires_at);
```

## API Contract

### `POST /auth/login`
Auth：無（公開）

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| password | string | yes | bcrypt verify against ADMIN_PASSWORD_HASH env |

Response 200:
```json
{ "user_id": "admin", "expires_at": "ISO 8601" }
```
Set-Cookie: `aibo_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | password 為空 |
| 401 | INVALID_CREDENTIALS | 密碼錯誤 |
| 429 | TOO_MANY_REQUESTS | 同一 IP 5 次失敗後鎖定 60 秒 |

### `POST /auth/logout`
Auth：cookie session（必須）

Response 204：無 body
Set-Cookie：清除 `aibo_session`（Max-Age=0）

### `GET /auth/me`
Auth：cookie session（必須）

Response 200:
```json
{ "user_id": "admin", "expires_at": "ISO 8601" }
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | session 無效或已過期 |

### `GET /api/v1/copilot/stream`（SSE Skeleton）
Auth：cookie session（必須）

Response 200：`Content-Type: text/event-stream`
```
event: ping
data: {"ts": "ISO 8601", "msg_id": "uuid", "seq": 1}

（每 15 秒重複）
```

## CookieAuth Middleware

優先序：
1. 讀取 Cookie `aibo_session`
2. hash → 查 sessions table → 比對 expires_at
3. 若無效，fallback 至 X-API-Key header
4. 兩者皆無效 → 401

## Business Rules
1. Session token 為 32 bytes random，base64url encoded
2. 儲存 SHA-256 hash，原始 token 不落地
3. Session 有效期 7 天（604800 秒）；每次 `/auth/me` 成功更新 `last_seen`
4. Logout 從 DB 刪除 session（server-side invalidation）
5. ADMIN_PASSWORD_HASH 環境變數必須在啟動時存在，否則拒絕啟動（fail fast）
6. 已知 follow-up：Sprint 13 PR 中 router wiring 未完成，需在 Sprint 14 補上

## Scenarios

### Happy Path

#### Scenario: 登入成功
GIVEN ADMIN_PASSWORD_HASH 已設定
WHEN POST /auth/login with { "password": "correct-password" }
THEN response status = 200
AND Set-Cookie header 包含 `aibo_session=...`
AND response body 包含 `user_id: "admin"`

#### Scenario: 使用 cookie 存取受保護端點
GIVEN 已登入，持有有效 cookie
WHEN GET /auth/me（帶 cookie）
THEN response status = 200
AND body `user_id = "admin"`

#### Scenario: Logout 清除 session
GIVEN 已登入
WHEN POST /auth/logout（帶 cookie）
THEN response status = 204
AND Set-Cookie 設定 Max-Age=0（清除 cookie）
AND DB 中 session 記錄被刪除

#### Scenario: SSE ping stream
GIVEN 已登入
WHEN GET /api/v1/copilot/stream（帶 cookie，連線保持）
THEN Content-Type = text/event-stream
AND 每 15 秒收到 `event: ping` 訊息

### Error Handling

#### Scenario: 密碼錯誤
WHEN POST /auth/login with { "password": "wrong" }
THEN response status = 401
AND response body code = "INVALID_CREDENTIALS"

#### Scenario: Session 過期後 401
GIVEN session expires_at 已超過現在
WHEN GET /auth/me（帶過期 cookie）
THEN response status = 401
AND response body code = "UNAUTHORIZED"

#### Scenario: 5 次失敗後限速
GIVEN 同一 IP 已連續失敗 5 次
WHEN POST /auth/login（第 6 次）
THEN response status = 429
AND response body code = "TOO_MANY_REQUESTS"

### Edge Cases

#### Scenario: X-API-Key fallback
GIVEN 無 cookie，但有效 X-API-Key header
WHEN GET /api/v1/entries（帶 X-API-Key）
THEN response status = 200（auth 透過 API Key）
