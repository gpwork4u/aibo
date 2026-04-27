# F-047: Copilot Side Panel（前端）

## Status: active
## Sprint: 16
## Priority: P0
## GitHub Issues: 待開

## 使用者故事
As a user, I want a Copilot side panel that I can open from anywhere in the app to have a contextual AI conversation about my knowledge base, so that I can get answers and insights without switching tools.

## 設計決策
- Copilot SSE：A 方案（SSE 單向 stream + POST 觸發 + cookie session auth）
- Side panel 為 app shell 右側的 resizable drawer（不遮蓋主內容）
- 狀態管理：zustand store（`useCopilotStore`），跨路由保持 session
- EventSource 客戶端由此 feature 實作（後端 SSE 由 F-048 實作）
- 完整 SSE 串流由後端 F-048 啟用；F-047 先串接骨架（ping events）

## UI 架構

```
app/(shell)/layout.tsx
└── CopilotSlot（右側，初始 hidden）
    └── CopilotPanel（寬度 360px，可 resize 至 240-600px）
        ├── CopilotHeader（標題 + 關閉 + 清除 session）
        ├── MessageList（虛擬化滾動）
        │   ├── UserMessage
        │   └── AssistantMessage（streaming：逐字渲染）
        ├── TypingIndicator（SSE 串流中顯示）
        └── InputArea
            ├── Textarea（Enter 送出，Shift+Enter 換行）
            └── SendButton（+ 鍵盤快捷鍵）
```

## 狀態（zustand）

```typescript
interface CopilotStore {
  isOpen: boolean;
  sessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  // actions
  open(): void;
  close(): void;
  sendMessage(content: string): Promise<void>;
  clearSession(): void;
}
```

## API 互動（依賴 F-048 後端）

### 觸發對話
`POST /api/v1/copilot/message`（F-048 定義）

### 接收 SSE stream
`GET /api/v1/copilot/stream`（F-039 skeleton，F-048 完整實作）

EventSource 連線生命週期：
- Copilot Panel 開啟時建立 EventSource
- Panel 關閉時關閉 EventSource（`es.close()`）
- 收到 `event: message` → append to MessageList
- 收到 `event: done` → 結束 streaming 狀態
- 收到 `event: error` → 顯示 error toast，重置 streaming 狀態

## Business Rules
1. Panel 預設關閉；⌘J 或 sidebar Copilot icon 開啟/關閉
2. Panel 開啟時建立 SSE 連線；Panel 關閉時終止連線
3. 跨路由切換時 Panel 狀態保持（zustand + shell layout）
4. 送出訊息時，user message 立即樂觀顯示
5. Streaming 中不允許再次送出（SendButton disabled）
6. MessageList 在新訊息時自動 scroll to bottom（除非使用者已手動向上滾動）
7. Session 清除後，下一則訊息建立新 session

## Scenarios

### Happy Path

#### Scenario: 開啟 Copilot Panel
GIVEN 使用者在 /library
WHEN 按下 ⌘J 或點擊 sidebar Copilot icon
THEN CopilotPanel 從右側滑入（300ms ease-out）
AND EventSource 連線建立至 /api/v1/copilot/stream
AND Panel 顯示歡迎訊息 "Ask me anything about your knowledge base."

#### Scenario: 送出訊息並接收 SSE stream
GIVEN CopilotPanel 已開啟，後端 F-048 已實作
WHEN 使用者輸入 "Summarize my Go-related entries" 並按 Enter
THEN user message 立即顯示
AND POST /api/v1/copilot/message 送出
AND AssistantMessage 逐字渲染（streaming）
AND 渲染完成後 TypingIndicator 消失

#### Scenario: 關閉 Panel 保持訊息
GIVEN CopilotPanel 中有 5 則對話
WHEN 使用者切換至 /today（不關閉 Panel）
THEN 對話訊息保留
AND SSE 連線持續

#### Scenario: 清除 Session
GIVEN Panel 中有對話記錄
WHEN 使用者點擊 "Clear session"
THEN messages 清空
AND sessionId 重置
AND 顯示空白歡迎狀態

### Error Handling

#### Scenario: SSE 連線中斷自動重連
GIVEN EventSource 連線
WHEN 網路短暫中斷（< 5 秒）
THEN EventSource 自動重試（瀏覽器原生行為，Last-Event-ID header）

#### Scenario: 訊息送出失敗
GIVEN 使用者送出訊息
WHEN POST /api/v1/copilot/message 回傳 503
THEN toast "Copilot unavailable, please try again"
AND streaming 狀態重置
AND user message 保留（不 rollback）

### Edge Cases

#### Scenario: Panel 關閉時中斷 SSE
GIVEN CopilotPanel 已開啟，SSE 串流中
WHEN 使用者按 ⌘J 關閉 Panel
THEN EventSource.close() 呼叫
AND streaming 中的訊息截斷（顯示已收到的部分 + "..." 標示未完成）
