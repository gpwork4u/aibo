# F-049: CmdK Power Actions

## Status: active
## Sprint: 16
## Priority: P0
## GitHub Issues: 待開

## 使用者故事
As a user, I want the Command Palette (⌘K) to support power actions beyond navigation — including creating entries, searching the knowledge base, and triggering AI actions — so that I can accomplish complex tasks entirely from the keyboard.

## 設計決策
- 延伸 F-037 skeleton，加入 Action Groups 架構
- 分組顯示：Navigation / Create / Search / AI Actions
- 搜尋模式：輸入 `>` prefix 進入 AI 指令模式
- 搜尋結果來自後端 `GET /api/v1/entries?q=...`（即時搜尋）
- 建立 entry：快速建立 modal（不離開當前頁面）

## Action Groups

### Navigation（沿用 F-037）
| 指令 | 關鍵字 |
|------|--------|
| Go to Inbox | inbox, go inbox |
| Go to Library | library |
| Go to Today | today |
| Go to Canvas | canvas |
| Go to Settings | settings |

### Create
| 指令 | 關鍵字 | 行為 |
|------|--------|------|
| New Entry | new, create, add | 開啟 Quick Create modal |
| New Journal Entry | journal, diary | 導向 /today/journal（新建） |
| New Task | task, todo | 開啟 Quick Task modal |

### Search（即時後端搜尋）
- 輸入 3+ 字元時自動觸發 `GET /api/v1/entries?q=...&per_page=5`
- 結果顯示在 "Search Results" 分組
- 點選結果 → 開啟 EntryDetailSheet

### AI Actions（`>` prefix）
| 指令 | 行為 |
|------|------|
| `> summarize` | 開啟 Copilot 並預填 "Summarize my recent entries" |
| `> find duplicates` | 開啟 Copilot 並預填重複檢測 prompt |
| `> classify all inbox` | 觸發批次分類（POST /api/v1/entries/batch { action: "classify", ids: all_inbox } |
| `> help` | 顯示鍵盤快捷鍵總覽 |

## API Contract

### Entry 搜尋（即時）
`GET /api/v1/entries?q={input}&status=library&per_page=5`
Debounce：200ms

### Quick Create Entry
`POST /api/v1/entries`（既有 F-001 API）
Request Body:
```json
{ "title": "string", "status": "inbox", "source_type": "manual" }
```
建立後導向 entry 詳情頁

## Quick Create Modal

```
QuickCreateModal（Dialog）
├── TitleInput（auto focus）
├── ContentTextarea（optional，可展開）
├── TagInput（optional）
└── Actions：[Create as Draft (inbox)] [Create & Classify]
```

## Business Rules
1. 輸入 1-2 字元：只顯示 Navigation + Create 動作
2. 輸入 3+ 字元：加入 Search Results 分組（debounce 200ms）
3. 輸入 `>` prefix：切換至 AI Actions 模式，隱藏其他分組
4. 每個分組最多顯示 5 筆（避免清單過長）
5. 快速建立 entry：建立後 toast "Entry created"，提供 "Open" 連結
6. 批次分類（AI Actions）：在背景執行，progress toast 更新

## Scenarios

### Happy Path

#### Scenario: 快速搜尋並跳轉 entry
GIVEN Library 中有 entry "Golang Concurrency"
WHEN 使用者開啟 ⌘K，輸入 "concurr"（3+ chars）
THEN 200ms 後顯示 "Search Results" 分組
AND "Golang Concurrency" 出現在結果中
AND 點選後 EntryDetailSheet 開啟

#### Scenario: 快速建立 Entry
WHEN 使用者開啟 ⌘K，輸入 "new"，選擇 "New Entry"
THEN QuickCreateModal 開啟（不關閉 CmdK，改為切換）
AND 使用者輸入 title "Notes on Rust"
AND 點擊 "Create as Draft"
THEN POST /api/v1/entries 成功
AND toast "Entry created — Open"
AND Modal 關閉，CmdK 關閉

#### Scenario: AI Action > classify all inbox
WHEN 使用者輸入 "> classify all inbox" 並 Enter
THEN 查詢 inbox entries（GET /api/v1/entries?status=inbox）
AND POST /api/v1/entries/batch { action: "classify", ids: [...] }
AND progress toast "Classifying N entries..."
AND 完成後 toast "Classification complete"

### Error Handling

#### Scenario: 搜尋 API 失敗時降級
GIVEN 後端搜尋回傳 500
WHEN 使用者在 CmdK 輸入 3+ chars
THEN Search Results 分組不顯示（silent fail）
AND Navigation / Create 分組仍正常

#### Scenario: 快速建立 title 為空
GIVEN QuickCreateModal 開啟
WHEN 使用者不輸入 title 直接點 Create
THEN Create 按鈕 disabled（前端驗證）
AND 顯示 "Title is required"

### Edge Cases

#### Scenario: `>` prefix 切換 AI mode
WHEN 使用者輸入 ">s"
THEN 顯示 AI Actions 含 "summarize" 等（以 "s" 過濾）
AND Navigation / Search 分組隱藏

#### Scenario: 多次快速輸入 debounce
GIVEN 使用者快速輸入 "gola"（每字母間隔 50ms）
WHEN 停止輸入 200ms 後
THEN 只觸發一次 API 搜尋（最後輸入值 "gola"）
