# F-007: LLM Provider 管理

## Status: active
## Sprint: 1
## Priority: P0

## 使用者故事

As a 開發者，I want 管理多個 LLM provider（LM Studio、第三方），so that 我能靈活切換和設定 LLM 服務。

## API Contract

### `POST /api/v1/llm-providers`

Auth：X-API-Key header

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | yes | max 50 chars, 不可重複 (case-insensitive) |
| endpoint_url | string | yes | max 500 chars, 有效 URL 格式 |
| api_key | string | no | max 500 chars |
| model_name | string | yes | max 100 chars |
| is_default | boolean | no | default false |
| config | object | no | { temperature, max_tokens, timeout_seconds } |
| is_active | boolean | no | default true |

Response 201:
```json
{
  "id": "uuid",
  "name": "string",
  "endpoint_url": "string",
  "api_key_set": true,
  "model_name": "string",
  "is_default": false,
  "config": {
    "temperature": 0.7,
    "max_tokens": 1000,
    "timeout_seconds": 30
  },
  "is_active": true,
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

注意：response 不回傳 api_key 明文，只回傳 api_key_set (boolean)。

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | name 為空或超過 50 字 |
| 400 | INVALID_INPUT | endpoint_url 為空、超過 500 字、或格式無效 |
| 400 | INVALID_INPUT | model_name 為空或超過 100 字 |
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 409 | DUPLICATE_PROVIDER | name 已存在（case-insensitive） |

---

### `GET /api/v1/llm-providers`

Auth：X-API-Key header

Response 200:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "endpoint_url": "string",
      "api_key_set": true,
      "model_name": "string",
      "is_default": false,
      "config": { ... },
      "is_active": true,
      "created_at": "ISO 8601",
      "updated_at": "ISO 8601"
    }
  ]
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key 無效或缺失 |

---

### `GET /api/v1/llm-providers/:id`

Auth：X-API-Key header

Response 200: 同列表中的單筆格式

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 404 | NOT_FOUND | id 不存在 |

---

### `PUT /api/v1/llm-providers/:id`

Auth：X-API-Key header

全量更新。

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | yes | max 50 chars |
| endpoint_url | string | yes | max 500 chars, 有效 URL 格式 |
| api_key | string | null | yes | max 500 chars, null 表示清除 |
| model_name | string | yes | max 100 chars |
| is_default | boolean | yes | - |
| config | object | null | yes | null 表示清除 |
| is_active | boolean | yes | - |

Response 200: 同 GET 格式

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | 同 POST 的驗證規則 |
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 404 | NOT_FOUND | id 不存在 |
| 409 | DUPLICATE_PROVIDER | name 已被其他 provider 使用 |

---

### `DELETE /api/v1/llm-providers/:id`

Auth：X-API-Key header

硬刪除。

Response 204: No Content

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 404 | NOT_FOUND | id 不存在 |

---

### `POST /api/v1/llm-providers/:id/health`

Auth：X-API-Key header

健康檢查：發送一個簡單的 request 到 provider 的 endpoint，確認是否可用。

Response 200:
```json
{
  "status": "healthy",
  "response_time_ms": 150
}
```

Response 200 (不健康):
```json
{
  "status": "unhealthy",
  "error": "connection timeout"
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key 無效或缺失 |
| 404 | NOT_FOUND | id 不存在 |

## Data Model

```
LlmProvider {
  id: UUID (PK, auto-generated)
  name: VARCHAR(50) NOT NULL UNIQUE (case-insensitive, via UNIQUE INDEX ON LOWER(name))
  endpoint_url: VARCHAR(500) NOT NULL
  api_key: VARCHAR(500) NULL (encrypted AES-256)
  model_name: VARCHAR(100) NOT NULL
  is_default: BOOLEAN NOT NULL DEFAULT FALSE
  config: JSONB NULL  -- { temperature: float, max_tokens: int, timeout_seconds: int }
  is_active: BOOLEAN NOT NULL DEFAULT TRUE
  created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
}

Constraints:
  - UNIQUE INDEX ON LOWER(name)
  - UNIQUE INDEX ON (is_default) WHERE is_default = TRUE  -- 最多一個 default
```

## Business Rules

1. name 不可重複，大小寫不敏感
2. api_key 以 AES-256 加密儲存於資料庫，API response 永不回傳明文
3. 最多只能有一個 is_default = TRUE 的 provider（partial unique index）
4. 設定新 default 時自動取消舊 default（transaction 內完成）
5. Provider 選擇優先序：default active > 任意 active > 503 Service Unavailable
6. config 為 JSONB，可選欄位包含 temperature、max_tokens、timeout_seconds
7. 健康檢查只確認連線和回應，不驗證回應內容的正確性
8. 刪除 provider 為硬刪除
9. 刪除 default provider 後，不自動指定新的 default

## Scenarios

### Happy Path

#### Scenario: 建立 LLM provider
GIVEN 使用者已認證
WHEN POST /api/v1/llm-providers with { "name": "LM Studio Local", "endpoint_url": "http://localhost:1234/v1", "model_name": "llama-3", "is_default": true }
THEN response status = 201
AND response body contains { "name": "LM Studio Local", "api_key_set": false, "is_default": true }
AND response body does NOT contain "api_key" field

#### Scenario: 建立含 api_key 的 provider
GIVEN 使用者已認證
WHEN POST /api/v1/llm-providers with { "name": "OpenAI", "endpoint_url": "https://api.openai.com/v1", "api_key": "sk-xxx", "model_name": "gpt-4" }
THEN response status = 201
AND response body api_key_set = true
AND api_key 以 AES-256 加密儲存

#### Scenario: 列表查詢
GIVEN 2 providers exist
WHEN GET /api/v1/llm-providers
THEN response status = 200
AND response body data length = 2
AND 每筆都有 api_key_set 而非 api_key

#### Scenario: 設定新 default 自動取消舊的
GIVEN provider #1 is_default = true
AND provider #2 is_default = false
WHEN PUT /api/v1/llm-providers/{id2} with { ..., "is_default": true, ... }
THEN response status = 200
AND provider #2 is_default = true
AND provider #1 is_default = false

#### Scenario: 健康檢查成功
GIVEN provider exists and is reachable
WHEN POST /api/v1/llm-providers/{id}/health
THEN response status = 200
AND response body status = "healthy"
AND response body response_time_ms > 0

#### Scenario: 健康檢查失敗
GIVEN provider exists but endpoint is unreachable
WHEN POST /api/v1/llm-providers/{id}/health
THEN response status = 200
AND response body status = "unhealthy"
AND response body error is not empty

### Error Handling

#### Scenario: name 為空
GIVEN 使用者已認證
WHEN POST /api/v1/llm-providers with { "name": "", "endpoint_url": "http://localhost:1234/v1", "model_name": "test" }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: name 重複
GIVEN provider "LM Studio" exists
WHEN POST /api/v1/llm-providers with { "name": "lm studio", "endpoint_url": "...", "model_name": "..." }
THEN response status = 409
AND response body code = "DUPLICATE_PROVIDER"

#### Scenario: endpoint_url 格式無效
GIVEN 使用者已認證
WHEN POST /api/v1/llm-providers with { "name": "Test", "endpoint_url": "not-a-url", "model_name": "test" }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: 未認證
WHEN GET /api/v1/llm-providers without X-API-Key header
THEN response status = 401
AND response body code = "UNAUTHORIZED"

#### Scenario: 查詢不存在的 provider
WHEN GET /api/v1/llm-providers/{non-existent-uuid}
THEN response status = 404
AND response body code = "NOT_FOUND"

### Edge Cases

#### Scenario: 刪除 default provider
GIVEN provider #1 is_default = true
WHEN DELETE /api/v1/llm-providers/{id1}
THEN response status = 204
AND 無任何 provider 是 default

#### Scenario: 無任何 active provider 時其他功能的行為
GIVEN no active LLM provider exists
WHEN 系統需要使用 LLM（分類、搜尋）
THEN 回傳 503 或降級行為（依功能定義）

#### Scenario: config 為 null
GIVEN 使用者已認證
WHEN POST /api/v1/llm-providers with { "name": "Test", "endpoint_url": "http://localhost:1234/v1", "model_name": "test", "config": null }
THEN response status = 201
AND response body config = null

#### Scenario: 更新 name 為自己原本的值
GIVEN provider exists with id = {id}, name = "Test"
WHEN PUT /api/v1/llm-providers/{id} with { "name": "Test", ... }
THEN response status = 200 (不算重複)
