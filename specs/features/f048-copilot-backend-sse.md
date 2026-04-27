# F-048: Copilot Backend SSE

## Status: active
## Sprint: 16
## Priority: P0
## GitHub Issues: 待開

## 使用者故事
As the Copilot frontend (F-047), I want a backend SSE endpoint that streams LLM responses based on the user's knowledge base context, so that users can have real-time AI conversations about their knowledge.

## 設計決策
- SSE 單向 stream（Server-Sent Events），POST 觸發，cookie session auth
- LLM 呼叫使用現有 LlmService（F-017 連線池）
- Context 組裝：使用者問題 → 語意搜尋 top-K entries → 注入 system prompt
- Session 管理：conversation history 儲存於後端（新 DB table `copilot_sessions`）
- 無多輪 function calling（Sprint 16 範圍），純文字 streaming

## Data Model

```sql
-- migration 020
CREATE TABLE copilot_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(64) NOT NULL DEFAULT 'admin',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE copilot_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES copilot_sessions(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, seq)
);

CREATE INDEX ON copilot_messages(session_id, seq);
```

## API Contract

### `POST /api/v1/copilot/sessions`（建立新 session）
Auth：cookie session（必須）

Response 201:
```json
{ "session_id": "uuid", "created_at": "ISO 8601" }
```

### `POST /api/v1/copilot/message`（送出訊息）
Auth：cookie session（必須）

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| session_id | UUID | yes | 必須為有效 session |
| content | string | yes | 1-4000 chars |

Response 200（啟動 streaming）:
```json
{ "msg_id": "uuid", "stream_ready": true }
```
之後由 SSE endpoint 推送

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | content 為空或超過 4000 chars |
| 404 | NOT_FOUND | session_id 不存在 |
| 503 | LLM_UNAVAILABLE | 無可用 LLM provider |

### `GET /api/v1/copilot/stream`（SSE stream）
Auth：cookie session（必須）
Connection：keep-alive

SSE Event 格式：
```
event: ping
data: {"ts": "ISO 8601", "msg_id": "uuid", "seq": 1}

event: message_start
data: {"msg_id": "uuid", "session_id": "uuid"}

event: token
data: {"token": "partial text chunk", "msg_id": "uuid", "seq": 2}

event: message_done
data: {"msg_id": "uuid", "total_tokens": 150, "finish_reason": "stop"}

event: error
data: {"code": "LLM_UNAVAILABLE", "msg_id": "uuid"}
```

### `GET /api/v1/copilot/sessions/:id/messages`（歷史訊息）
Auth：cookie session（必須）

Response 200:
```json
{
  "messages": [{
    "id": "uuid",
    "role": "user",
    "content": "string",
    "seq": 1,
    "created_at": "ISO 8601"
  }]
}
```

### `DELETE /api/v1/copilot/sessions/:id`（清除 session）
Auth：cookie session（必須）
Response 204

## Context 組裝邏輯

```
1. 接收 user message
2. 以 message 做語意搜尋（GET /api/v1/entries?q={message}&per_page=5）
3. 組裝 system prompt：
   "You are a knowledge assistant for the user's personal knowledge base.
    Relevant entries:\n{entries[0..4].title + summary}"
4. 加入 conversation history（最近 10 輪）
5. 呼叫 LlmService.StreamChat(messages)
6. 逐 token 推送 SSE event:token
7. 完成後推送 event:message_done
8. 儲存 assistant message 至 DB
```

## Business Rules
1. Session history 保留最近 10 輪（20 messages）；超過時截斷最舊的
2. LLM streaming timeout：90 秒（無 token 送出則關閉連線）
3. 一個 SSE 連線同時只服務一個 session 的一個 active stream
4. 若 LLM provider 全部不可用，回傳 event:error 且 code = "LLM_UNAVAILABLE"
5. context entries 注入 system prompt，不記錄於 copilot_messages
6. SSE ping 每 15 秒（防止代理 timeout），與訊息 stream 交錯

## Scenarios

### Happy Path

#### Scenario: 送出訊息並收到 SSE stream
GIVEN 使用者已登入，有有效 session，LLM provider 可用
WHEN POST /api/v1/copilot/message with { session_id, content: "What is TDD?" }
THEN response 200 with stream_ready=true
AND SSE 推送 event:message_start → 多個 event:token → event:message_done
AND assistant response 儲存至 copilot_messages

#### Scenario: Context 注入相關 entries
GIVEN 使用者知識庫有 entry "Test Driven Development Basics"
WHEN 使用者問 "Explain TDD"
THEN system prompt 包含該 entry 的 title + summary
AND LLM 回應參考知識庫內容

#### Scenario: 查詢歷史訊息
GIVEN session 中有 4 則對話
WHEN GET /api/v1/copilot/sessions/:id/messages
THEN response 200，包含 4 則 messages（含 user + assistant roles）

### Error Handling

#### Scenario: LLM 不可用
GIVEN 無 active LLM provider
WHEN POST /api/v1/copilot/message
THEN response 503
AND code = "LLM_UNAVAILABLE"

#### Scenario: SSE streaming timeout
GIVEN LLM 開始 streaming 但中途停滯
WHEN 90 秒無 token 輸出
THEN 後端推送 event:error { code: "STREAM_TIMEOUT" }
AND 關閉 SSE 連線

### Edge Cases

#### Scenario: Session 截斷舊訊息
GIVEN session 已有 20 則訊息（10 輪）
WHEN 使用者送出第 11 輪訊息
THEN 最舊的 1 輪（2 則）從 context 中移除
AND 繼續正常 streaming
AND DB 保留全部 22 則訊息記錄
