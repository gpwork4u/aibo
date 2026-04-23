# F-011: MCP Server 模式

## 功能描述

讓 Claude Code / Cursor 等 LLM 應用透過 MCP（Model Context Protocol）直接查詢 aibo 知識庫。不僅查詢知識，更能「代表使用者回應」-- 這是 aibo 走向「人格代理」的第一步。

## 使用者故事

As a 開發者, I want 在 Claude Code / Cursor 中透過 MCP 查詢我的 aibo 知識庫, so that LLM 能用我的知識來回答問題、代表我做決策。

## 技術選型

使用 **mark3labs/mcp-go** SDK，透過 stdio transport 提供 MCP Server。

### 理由
- 社群最廣泛採用（8.6k stars），API 簡潔直觀
- 支援 stdio / SSE / StreamableHTTP 多種 transport
- aibo 作為個人工具，stdio transport 最簡單直接
- Claude Code / Cursor 原生支援 stdio MCP server

### 架構

```
Claude Code / Cursor
    |
    | (stdio: JSON-RPC 2.0)
    |
aibo MCP Server (獨立 binary: aibo-mcp)
    |
    | (HTTP: localhost:8080)
    |
aibo API Server (既有 Gin server)
```

MCP Server 作為獨立的 CLI binary，透過 HTTP 呼叫既有的 aibo API。這樣不需要修改現有的 API Server 架構，MCP Server 只是一個「客戶端包裝」。

## MCP Tools 定義

### Tool 1: query

搜尋知識庫，複用 F-005 智慧搜尋邏輯。

```json
{
  "name": "aibo_query",
  "description": "搜尋使用者的個人知識庫。回傳最相關的知識條目，包含 summary、detail、action。用這些知識來代表使用者回答問題。",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "搜尋查詢字串"
      },
      "category": {
        "type": "string",
        "description": "限定分類名稱（可選）"
      },
      "limit": {
        "type": "integer",
        "description": "回傳數量上限（預設 5，最大 20）",
        "default": 5
      }
    },
    "required": ["query"]
  }
}
```

### Tool 2: propose

新增知識條目（複用 F-001 + F-003 自動分類）。

```json
{
  "name": "aibo_propose",
  "description": "向使用者的知識庫提出新的知識條目。會自動進行 LLM 分類。",
  "inputSchema": {
    "type": "object",
    "properties": {
      "content": {
        "type": "string",
        "description": "知識內容"
      },
      "title": {
        "type": "string",
        "description": "標題（可選，LLM 會自動產生）"
      },
      "tags": {
        "type": "array",
        "items": { "type": "string" },
        "description": "標籤（可選）"
      },
      "source": {
        "type": "string",
        "description": "知識來源（可選）"
      }
    },
    "required": ["content"]
  }
}
```

### Tool 3: confirm

確認知識有用，提升信心度（F-013）。

```json
{
  "name": "aibo_confirm",
  "description": "確認某筆知識條目有用且正確，提升其信心度。",
  "inputSchema": {
    "type": "object",
    "properties": {
      "entry_id": {
        "type": "string",
        "description": "知識條目 UUID"
      }
    },
    "required": ["entry_id"]
  }
}
```

### Tool 4: flag

標記知識問題（F-013）。

```json
{
  "name": "aibo_flag",
  "description": "標記某筆知識條目有問題（過時、不正確、需更新）。",
  "inputSchema": {
    "type": "object",
    "properties": {
      "entry_id": {
        "type": "string",
        "description": "知識條目 UUID"
      },
      "reason": {
        "type": "string",
        "enum": ["outdated", "inaccurate", "incomplete", "duplicate"],
        "description": "標記原因"
      },
      "note": {
        "type": "string",
        "description": "補充說明（可選）"
      }
    },
    "required": ["entry_id", "reason"]
  }
}
```

### Tool 5: status

知識庫統計。

```json
{
  "name": "aibo_status",
  "description": "查看知識庫統計資訊：條目總數、分類分布、最近更新。",
  "inputSchema": {
    "type": "object",
    "properties": {}
  }
}
```

## Data Model

無新增 table。MCP Server 透過 HTTP 呼叫既有 API。

### 需要的新 API endpoint

```
GET /api/v1/stats
```

回應：
```json
{
  "total_entries": 150,
  "total_categories": 12,
  "entries_by_category": [
    { "category": "golang", "count": 30 },
    { "category": "devops", "count": 25 }
  ],
  "recent_entries": 5,
  "avg_confidence": 0.72
}
```

## MCP Server 設定

### Claude Code 設定（~/.claude/claude_code_config.json 或 .mcp.json）

```json
{
  "mcpServers": {
    "aibo": {
      "command": "aibo-mcp",
      "args": [],
      "env": {
        "AIBO_API_URL": "http://localhost:8080",
        "AIBO_API_KEY": "aibo_xxxxx"
      }
    }
  }
}
```

### 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| AIBO_API_URL | aibo API Server URL | http://localhost:8080 |
| AIBO_API_KEY | API Key | (必填) |

## Business Rules

1. MCP Server 是獨立的 CLI binary（`aibo-mcp`），不嵌入現有 API server
2. 透過 stdio transport 溝通（JSON-RPC 2.0）
3. 所有操作透過 HTTP 呼叫既有 aibo API（需 API Key）
4. query tool 的回傳格式要對 LLM 友好：包含 summary（優先）、detail、action
5. propose 建立的 entry 會自動觸發 LLM 分類（既有邏輯）
6. confirm/flag 操作對應 F-013 的 API

## Scenarios

### S-011-01: query 搜尋知識

```
WHEN MCP client 呼叫 aibo_query tool
  WITH query = "golang error handling"
THEN MCP server 呼叫 POST /api/v1/search
  AND 回傳格式化的搜尋結果
  AND 每筆結果包含 title, summary, detail, action, tags, confidence
```

### S-011-02: query 搜尋無結果

```
WHEN MCP client 呼叫 aibo_query tool
  WITH query = "量子力學"
  AND 知識庫中無相關條目
THEN 回傳空結果
  AND 提示訊息 "知識庫中未找到相關條目"
```

### S-011-03: propose 新增知識

```
WHEN MCP client 呼叫 aibo_propose tool
  WITH content = "Go 1.23 新增了 range over func 語法"
THEN MCP server 呼叫 POST /api/v1/entries
  AND 回傳建立成功的 entry ID
  AND entry 會自動進行 LLM 分類
```

### S-011-04: confirm 確認知識

```
WHEN MCP client 呼叫 aibo_confirm tool
  WITH entry_id = "valid-uuid"
THEN MCP server 呼叫 POST /api/v1/entries/:id/confirm
  AND 回傳更新後的 confidence 值
```

### S-011-05: flag 標記問題

```
WHEN MCP client 呼叫 aibo_flag tool
  WITH entry_id = "valid-uuid"
  AND reason = "outdated"
  AND note = "Go 1.24 已改變此行為"
THEN MCP server 呼叫 POST /api/v1/entries/:id/flag
  AND 回傳確認訊息
```

### S-011-06: status 查看統計

```
WHEN MCP client 呼叫 aibo_status tool
THEN MCP server 呼叫 GET /api/v1/stats
  AND 回傳格式化的統計資訊
```

### S-011-07: API 連線失敗

```
WHEN MCP client 呼叫任何 tool
  AND aibo API server 未啟動
THEN 回傳錯誤訊息 "無法連線到 aibo API server"
  AND 不 crash MCP server
```

### S-011-08: API Key 無效

```
WHEN MCP client 呼叫任何 tool
  AND AIBO_API_KEY 環境變數未設定或無效
THEN 回傳錯誤訊息 "API Key 無效或未設定"
```

## 檔案結構

```
dev/src/
├── cmd/
│   └── mcp/
│       └── main.go          # MCP server 進入點
├── mcp/
│   ├── server.go            # MCP server 設定 + tool 註冊
│   ├── tools.go             # tool handler 實作
│   ├── client.go            # aibo API HTTP client
│   └── formatter.go         # 搜尋結果格式化（LLM 友好）
```

## 依賴

- 依賴 F-012（知識結構升級）：query 回傳需要 summary/detail/action 欄位
- 依賴 F-013（信心度機制）：confirm/flag tool 需要對應 API
