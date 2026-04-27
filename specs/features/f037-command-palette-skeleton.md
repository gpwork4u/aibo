# F-037: Command Palette Skeleton

## Status: active
## Sprint: 13
## Priority: P0
## GitHub Issues: #196 (feature), #205 (PR)

## 使用者故事
As a user, I want a keyboard-driven command palette (⌘K) that I can invoke from anywhere in the app, so that I can quickly navigate and trigger actions without using the mouse.

## 設計決策
- Sprint 13 實作 skeleton（UI + 基礎導航 actions）
- 完整 power actions（建立 entry、搜尋、AI 指令）由 F-049 Sprint 16 實作
- 使用 `cmdk` library（Radix 基礎，keyboard accessible）
- 呈現：全螢幕 overlay + 置中 modal，backdrop blur

## 元件架構

```
components/cmdk/
├── CommandPalette.tsx      # 主元件（Dialog + Command）
├── CommandPalette.css      # 視覺覆蓋（editorial 主題）
├── useCommandPalette.ts    # open/close state + 鍵盤事件
└── commands/
    └── navigation.ts       # 導航指令定義
```

## Sprint 13 支援的 Actions

| 指令 | 觸發關鍵字 | 動作 |
|------|-----------|------|
| Go to Inbox | inbox | navigate /dashboard/inbox |
| Go to Library | library | navigate /library |
| Go to Today | today | navigate /today |
| Go to Canvas | canvas | navigate /canvas |
| Go to Settings | settings | navigate /settings |
| Toggle Theme | theme, dark, light | toggle theme |

## API Contract（無後端，純前端）

### 鍵盤觸發
- `⌘K`（macOS）/ `Ctrl+K`（Windows/Linux）：開啟
- `Escape`：關閉
- `↑ ↓`：項目選擇
- `Enter`：執行選中項目

## Business Rules
1. 全域監聽 keydown，在任何 shell 路由均可觸發
2. Input focus 中（`<input>`, `<textarea>`）時，⌘K 不觸發（避免干擾）
3. Sprint 13 僅支援導航型指令；搜尋 / 建立 entry 等由 F-049 擴充
4. 開啟 palette 時，body scroll 鎖定
5. 指令清單支援 fuzzy filter（`cmdk` 內建）

## Scenarios

### Happy Path

#### Scenario: ⌘K 開啟 Command Palette
GIVEN 使用者在任意 shell 路由，無 input focus
WHEN 按下 ⌘K
THEN Command Palette overlay 開啟
AND input 自動 focus

#### Scenario: 輸入 "inbox" 過濾並導航
GIVEN Command Palette 已開啟
WHEN 輸入 "inbox" 後按 Enter
THEN URL 改為 /dashboard/inbox
AND Command Palette 關閉

#### Scenario: Escape 關閉
GIVEN Command Palette 已開啟
WHEN 按下 Escape
THEN Command Palette 關閉

### Error Handling

#### Scenario: 在 input focus 時 ⌘K 不觸發
GIVEN 使用者正在 `<input>` 欄位輸入
WHEN 按下 ⌘K
THEN Command Palette 不開啟

### Edge Cases

#### Scenario: 搜尋無結果時顯示 empty state
GIVEN Command Palette 已開啟
WHEN 輸入 "xyzzzz"（無匹配）
THEN 顯示 "No results" empty state

#### Scenario: 多次快速開關不造成 focus trap
GIVEN 使用者連續按 ⌘K 開啟又 Escape 關閉三次
WHEN 最後關閉後
THEN focus 回到觸發前的元素，無 aria/focus trap 殘留
