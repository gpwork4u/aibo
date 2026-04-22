# F-010: API Key 認證

## Status: active
## Sprint: 1
## Priority: P0

## 使用者故事

As a 開發者，I want 使用 API Key 保護我的知識庫 API，so that 只有授權的應用程式能存取我的資料。

## API Contract

### `POST /api/v1/auth/api-keys`

Auth：X-API-Key header（Bootstrap 例外：無任何 API Key 時免認證）

建立新的 API Key。**Key 明文只在建立時回傳一次，之後無法再取得。**

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | yes | max 50 chars, 不可重複 |
| expires_at | string (ISO 8601) | no | 必須是未來時間，null 表示永不過期 |

Response 201:
```json
{
  "id": "uuid",
  "name": "string",
  "key": "aibo_a1b2c3d4e5f6...",
  "key_prefix": "aibo_a1b2c",
  "expires_at": "ISO 8601 | null",
  "created_at": "ISO 8601"
}
```

注意：`key` 欄位只在這個 response 出現，之後的查詢都不會回傳。

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | name 為空或超過 50 字 |
| 400 | INVALID_INPUT | expires_at 不是未來時間 |
| 401 | UNAUTHORIZED | API Key 無效或缺失（非 bootstrap 情況） |
| 409 | DUPLICATE_KEY_NAME | name 已存在 |

---

### `GET /api/v1/auth/api-keys`

Auth：X-API-Key header

列出所有 API Keys（不含明文）。

Response 200:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "key_prefix": "aibo_a1b2c",
      "is_active": true,
      "expires_at": "ISO 8601 | null",
      "last_used_at": "ISO 8601 | null",
      "created_at": "ISO 8601"
    }
  ]
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key 無效或缺失 |

---

### `DELETE /api/v1/auth/api-keys/:id`

Auth：X-API-Key header

撤銷（刪除）API Key。

Response 204: No Content

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | LAST_KEY_PROTECTED | 不能刪除最後一把有效（active + 未過期）的 key |
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 404 | NOT_FOUND | id 不存在 |

## Data Model

```
ApiKey {
  id: UUID (PK, auto-generated)
  name: VARCHAR(50) NOT NULL UNIQUE
  key_hash: VARCHAR(64) NOT NULL UNIQUE  -- SHA-256 hex
  key_prefix: VARCHAR(10) NOT NULL       -- 前 10 字元，用於辨識
  is_active: BOOLEAN NOT NULL DEFAULT TRUE
  expires_at: TIMESTAMPTZ NULL           -- NULL = 永不過期
  last_used_at: TIMESTAMPTZ NULL
  created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
}
```

## Business Rules

### API Key 格式
1. Key 格式：`aibo_` + 32 chars random (a-z0-9)，共 37 字元
2. key_prefix：key 的前 10 字元（`aibo_` + 5 chars），用於列表辨識
3. 儲存：只儲存 SHA-256 hash，不儲存明文
4. 明文只在建立時回傳一次，之後無法取得

### 認證 Middleware
5. 所有 `/api/v1/*` endpoint 都需要 API Key 認證
6. API Key 透過 `X-API-Key` request header 傳遞
7. 驗證流程：取得 header → SHA-256 hash → 比對 key_hash → 檢查 is_active → 檢查 expires_at → 更新 last_used_at
8. 無效或過期的 key 回傳 401 UNAUTHORIZED

### Bootstrap 機制
9. 當資料庫中無任何 API Key 時，`POST /api/v1/auth/api-keys` 免認證
10. 建立第一把 key 後，所有 endpoint（包括建立新 key）都需要認證
11. Bootstrap 狀態只檢查 key 是否存在，不檢查 is_active 或 expires_at

### 安全規則
12. 不能刪除最後一把有效（is_active = true 且未過期）的 key，防止鎖死
13. 刪除為硬刪除
14. last_used_at 在每次成功認證時更新

## Scenarios

### Happy Path

#### Scenario: Bootstrap — 建立第一把 API Key
GIVEN 資料庫中無任何 API Key
WHEN POST /api/v1/auth/api-keys with { "name": "default" } without X-API-Key header
THEN response status = 201
AND response body key starts with "aibo_"
AND response body key length = 37
AND response body key_prefix = key 的前 10 字元

#### Scenario: 使用 API Key 認證
GIVEN API Key "aibo_abc123..." exists and is active
WHEN GET /api/v1/entries with X-API-Key: "aibo_abc123..."
THEN response status = 200 (正常回應)
AND last_used_at updated to now

#### Scenario: 建立第二把 API Key
GIVEN API Key "default" exists
WHEN POST /api/v1/auth/api-keys with { "name": "ci-bot", "expires_at": "2025-12-31T23:59:59Z" } with valid X-API-Key
THEN response status = 201
AND response body name = "ci-bot"
AND response body expires_at = "2025-12-31T23:59:59Z"

#### Scenario: 列出所有 API Keys
GIVEN 2 API keys exist
WHEN GET /api/v1/auth/api-keys with valid X-API-Key
THEN response status = 200
AND response body data length = 2
AND 每筆都有 key_prefix 而非完整 key
AND 每筆都有 last_used_at

#### Scenario: 撤銷 API Key
GIVEN 2 active API keys exist
WHEN DELETE /api/v1/auth/api-keys/{id} with valid X-API-Key
THEN response status = 204
AND 被刪除的 key 無法再用於認證

### Error Handling

#### Scenario: 無效的 API Key
WHEN GET /api/v1/entries with X-API-Key: "invalid-key"
THEN response status = 401
AND response body code = "UNAUTHORIZED"

#### Scenario: 缺少 API Key header
GIVEN 至少一把 API key 存在
WHEN GET /api/v1/entries without X-API-Key header
THEN response status = 401
AND response body code = "UNAUTHORIZED"

#### Scenario: 過期的 API Key
GIVEN API Key exists with expires_at = "2020-01-01T00:00:00Z"
WHEN GET /api/v1/entries with the expired key
THEN response status = 401
AND response body code = "UNAUTHORIZED"

#### Scenario: 不能刪除最後一把有效 key
GIVEN only 1 active, non-expired API key exists
WHEN DELETE /api/v1/auth/api-keys/{id} with valid X-API-Key
THEN response status = 400
AND response body code = "LAST_KEY_PROTECTED"

#### Scenario: name 重複
GIVEN API Key with name = "default" exists
WHEN POST /api/v1/auth/api-keys with { "name": "default" }
THEN response status = 409
AND response body code = "DUPLICATE_KEY_NAME"

#### Scenario: name 為空
WHEN POST /api/v1/auth/api-keys with { "name": "" }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: expires_at 為過去時間
WHEN POST /api/v1/auth/api-keys with { "name": "test", "expires_at": "2020-01-01T00:00:00Z" }
THEN response status = 400
AND response body code = "INVALID_INPUT"

### Edge Cases

#### Scenario: Bootstrap 後立即需要認證
GIVEN 資料庫中無任何 API Key
WHEN POST /api/v1/auth/api-keys with { "name": "first" } (bootstrap, no auth)
THEN response status = 201
AND 之後 POST /api/v1/auth/api-keys with { "name": "second" } without X-API-Key header
THEN response status = 401

#### Scenario: 多把 key 中只有一把有效時不能刪除
GIVEN key #1 is_active = true, not expired
AND key #2 is_active = false
AND key #3 expires_at = past
WHEN DELETE /api/v1/auth/api-keys/{id1}
THEN response status = 400
AND response body code = "LAST_KEY_PROTECTED"

#### Scenario: 刪除非最後一把有效 key
GIVEN key #1 is_active = true, not expired
AND key #2 is_active = true, not expired
WHEN DELETE /api/v1/auth/api-keys/{id1}
THEN response status = 204

#### Scenario: name 恰好 50 字
WHEN POST /api/v1/auth/api-keys with { "name": "a" * 50 }
THEN response status = 201

#### Scenario: expires_at 為 null（永不過期）
WHEN POST /api/v1/auth/api-keys with { "name": "permanent", "expires_at": null }
THEN response status = 201
AND response body expires_at = null
