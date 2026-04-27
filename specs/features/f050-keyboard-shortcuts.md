# F-050: Keyboard Shortcuts

## Status: active
## Sprint: 16
## Priority: P1
## GitHub Issues: 待開

## 使用者故事
As a power user, I want a comprehensive keyboard shortcut system so that I can navigate and operate the entire app without lifting my hands from the keyboard.

## 設計決策
- 全域快捷鍵：`useKeyboardShortcuts` hook（全域 keydown listener）
- 情境快捷鍵：個別 component 內部管理（Inbox list、Library table 等）
- Vim-inspired sequential keys：G 系列導航（G I / G L / G T / G C）
- 快捷鍵總覽：`?` 開啟 ShortcutsModal（列出所有快捷鍵）
- 避免與系統快捷鍵衝突（使用 `⌘` prefix 或特殊序列）

## 全域快捷鍵清單

### App Navigation
| 快捷鍵 | 動作 |
|--------|------|
| `⌘K` | 開啟 Command Palette |
| `⌘J` | 開啟/關閉 Copilot Panel |
| `G I` | Go to Inbox |
| `G L` | Go to Library |
| `G T` | Go to Today |
| `G C` | Go to Canvas |
| `G S` | Go to Settings |
| `?` | 開啟 Shortcuts Modal |
| `Escape` | 關閉任何 overlay（modal / sheet / panel） |

### Inbox（情境，當 Inbox 有 focus 時）
| 快捷鍵 | 動作 |
|--------|------|
| `J` | 下一筆 |
| `K` | 上一筆 |
| `Enter` | 展開/編輯選中 entry |
| `A` | Archive 選中項目 |
| `D` | Delete（需確認） |
| `E` | 快速編輯 title inline |
| `Space` | 多選 toggle |

### Library Table（情境）
| 快捷鍵 | 動作 |
|--------|------|
| `J` / `K` | 上下移動 |
| `Enter` | 開啟詳情 Sheet |
| `/` | Focus 搜尋欄 |
| `Escape` | 清除搜尋 / 關閉 Sheet |

### Entry Detail Sheet
| 快捷鍵 | 動作 |
|--------|------|
| `E` | 進入編輯模式 |
| `⌘S` | 儲存 |
| `Escape` | 關閉 Sheet |

### Copilot Panel
| 快捷鍵 | 動作 |
|--------|------|
| `Enter` | 送出訊息 |
| `Shift+Enter` | 換行 |
| `⌘K` | Focus CmdK（從 Copilot 呼叫） |

## ShortcutsModal 內容

```
ShortcutsModal（Dialog，trigger: ?）
├── Section: Navigation
├── Section: Inbox
├── Section: Library
├── Section: Entry
└── Section: Copilot
```

每個快捷鍵以 `<Kbd>` 元件（F-038）渲染。

## 實作架構

```typescript
// hooks/useKeyboardShortcuts.ts
interface ShortcutConfig {
  key: string;           // "k", "j", "?"
  meta?: boolean;        // ⌘/Ctrl
  shift?: boolean;
  sequential?: string;   // "g" for G-series
  scope: 'global' | 'inbox' | 'library' | 'entry';
  action: () => void;
  description: string;
}
```

### Sequential Key 處理
- G 系列：記錄 `lastKey` + `lastKeyTime`
- 若 lastKey = "g" 且 time < 500ms → 觸發 G+key action
- 超過 500ms 重置

## Business Rules
1. Input / Textarea focus 中，字母快捷鍵（J/K/A/D/E/G 系列）不觸發
2. `⌘` 快捷鍵不受 input focus 影響
3. `Escape` 優先關閉最頂層 overlay
4. 情境快捷鍵只在對應 scope 啟用（用 React context 或 focus 偵測）
5. 快捷鍵衝突時，更細節的 scope 優先（entry > library > global）
6. 所有快捷鍵必須在 ShortcutsModal 中列出（`?` 鍵開啟）

## Scenarios

### Happy Path

#### Scenario: G I 導航至 Inbox
GIVEN 使用者在 /library，無 input focus
WHEN 鍵入 G，500ms 內再鍵入 I
THEN URL 改為 /dashboard/inbox
AND sidebar Inbox 項目標記 active

#### Scenario: Inbox J/K 上下移動
GIVEN Inbox 列表有 5 筆，第 1 筆 focused
WHEN 按 J
THEN focus 移至第 2 筆
AND preview pane 顯示第 2 筆 entry

#### Scenario: ? 開啟 ShortcutsModal
GIVEN 使用者在任意 shell 路由，無 input focus
WHEN 按 ?
THEN ShortcutsModal 開啟，顯示所有快捷鍵
AND 按 Escape 或點 × 關閉

#### Scenario: ⌘S 儲存 Entry
GIVEN Entry 在編輯模式
WHEN 按 ⌘S
THEN PATCH /api/v1/entries/:id 送出（自動儲存）
AND toast "Saved"

### Error Handling

#### Scenario: Input focus 中字母快捷鍵不觸發
GIVEN 使用者正在 Library 搜尋框輸入 "java"
WHEN 輸入字母 j
THEN Library list 不移動（J 快捷鍵不觸發）

### Edge Cases

#### Scenario: Sequential key 超時重置
GIVEN 使用者按 G，等待超過 500ms
WHEN 再按 I
THEN 不觸發 "Go to Inbox"
AND I 視為獨立按鍵（無動作）

#### Scenario: Escape 關閉最頂層 overlay
GIVEN CopilotPanel 開啟中，同時有 EntrySheet 開啟
WHEN 按 Escape
THEN EntrySheet 關閉（最頂層）
AND CopilotPanel 保持開啟
AND 再按 Escape 關閉 CopilotPanel
