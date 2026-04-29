# F-047 Copilot 整合 Layout

## 對應 Feature
#232 F-047: Copilot Side Panel

## 概述
Copilot Panel 整合於 App Shell 的右側 slot，與 Sidebar + 主內容區並排。Panel 開啟時，主內容區縮小（不遮蓋）。CmdK Power Actions 和 ShortcutsModal 以 Portal 方式覆蓋在所有層級之上。

---

## 全局 Layout（Panel 關閉）

```
┌─────────────────────────────────────────────────────────┐
│  Navbar（height: 64px，full width）                      │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │  Main Content Area                          │
│ (240px   │  （flex-1，overflow hidden）                 │
│  fixed)  │                                             │
│          │   ┌─────────────────────────────────────┐  │
│ - Inbox  │   │ Page Content                        │  │
│ - Library│   │（各 feature 頁面在此渲染）           │  │
│ - Today  │   └─────────────────────────────────────┘  │
│ - Canvas │                                             │
│ ──────── │                                             │
│ [Copilot]│                                             │  ← Copilot icon（Lucide Bot）
│ [Settings]                                             │
└──────────┴──────────────────────────────────────────────┘
```

---

## 全局 Layout（Panel 開啟，預設 360px）

```
┌─────────────────────────────────────────────────────────────────┐
│  Navbar（height: 64px，full width）                              │
├──────────┬───────────────────────────────┬─────────────────────┤
│ Sidebar  │  Main Content Area            │  CopilotPanel       │
│ (240px)  │  （flex-1，縮小）              │  (360px，預設)      │
│          │                               │  ← ResizeHandle     │
│          │  ┌─────────────────────────┐  │                     │
│          │  │ Page Content            │  │  CopilotHeader      │
│          │  └─────────────────────────┘  │  ─────────────────  │
│          │                               │  MessageList        │
│          │                               │  （scroll area）    │
│          │                               │  ─────────────────  │
│          │                               │  InputArea          │
└──────────┴───────────────────────────────┴─────────────────────┘
```

---

## 響應式行為

| 斷點 | Sidebar | Main Content | CopilotPanel |
|------|---------|-------------|-------------|
| >= 1280px (xl) | 固定 240px | flex-1 | 固定 360px（預設），可 resize |
| 1024-1279px (lg) | 固定 240px | flex-1 | 固定 360px，可能擠壓 main content |
| 768-1023px (md) | 收合（icon only 64px）或漢堡選單 | flex-1 | 360px（覆蓋模式，overlay） |
| < 768px (sm) | 隱藏，漢堡選單 | 全寬 | 全屏 bottom sheet 模式（100vw × 75vh）|

**Mobile（< 768px）Copilot 模式**：
- Panel 以 bottom sheet 方式從底部滑入，`height: 75vh`
- ResizeHandle 改為 drag handle bar（水平，置頂）
- 主內容區完全被遮蓋（不縮小）

---

## Z-index 層級

| 元素 | z-index |
|------|---------|
| Navbar | 40 |
| Sidebar（mobile overlay） | 50 |
| CopilotPanel（desktop） | 30（inline，不需 z-index） |
| CopilotPanel（mobile bottom sheet） | 60 |
| CmdK Dialog | 70 |
| QuickCreateModal | 75 |
| ShortcutsModal | 70 |
| Toast | 80 |

---

## Sidebar Copilot Icon

**位置**：Sidebar 底部，Settings icon 上方

**規格**：
- Icon：Lucide `Bot`，`w-5 h-5`
- 標籤：`"Copilot"`
- 觸控目標：44×44px（最小）
- 激活狀態（Panel 開啟）：`color.sidebar.active-bg`，`color.sidebar.active-fg`
- Keyboard shortcut hint：Tooltip 顯示 `⌘J`
- `aria-label="開啟 Copilot AI 助手"`，`aria-pressed="true/false"`（反映 Panel 狀態）

---

## CmdK（⌘K）覆蓋層

**覆蓋所有內容**（包含 Sidebar、Navbar、CopilotPanel）：

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              ┌──────────────────────────────────┐              │
│              │ CommandDialog（640px）            │              │
│              │  [AIModePrefixIndicator]          │              │
│              │  [CommandInput]                  │              │
│              │  [CommandList]                   │              │
│              │  [CommandFooter]                 │              │
│              └──────────────────────────────────┘              │
│                                                                 │
│  [backdrop: bg-overlay backdrop-blur-sm]                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## ShortcutsModal 覆蓋層

與 CmdK 相同的覆蓋方式，Dialog 居中：

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│            ┌────────────────────────────────────┐              │
│            │ ShortcutsModal（560px）             │              │
│            │  [Header: Keyboard Shortcuts]      │              │
│            │  [Section: Navigation]             │              │
│            │  [Section: Inbox]                  │              │
│            │  ...                               │              │
│            └────────────────────────────────────┘              │
│                                                                 │
│  [backdrop: bg-overlay backdrop-blur-sm]                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 狀態管理（zustand store）

```typescript
// useCopilotStore（跨路由持久化）
interface CopilotStore {
  isOpen: boolean;
  panelWidth: number;          // 記憶 resize 寬度
  open(): void;
  close(): void;
  toggle(): void;
  setPanelWidth(w: number): void;
}
```

**⌘J 觸發流程**：
```
useKeyboardShortcuts（global）
  → e.key === "j" && e.metaKey
  → useCopilotStore.toggle()
  → isOpen 切換
  → CopilotPanel CSS transition 觸發
```

---

## 使用到的元件

| 元件 | 路徑 | 說明 |
|------|------|------|
| CopilotPanel | `design/components/copilot-panel/` | 右側面板（含所有子元件） |
| CmdKPower | `design/components/cmdk-power/` | 命令面板（延伸 F-037） |
| ShortcutsModal | `design/components/shortcuts-modal/` | 快捷鍵總覽 |
| Sidebar | `design/components/layout-shell/` | 現有 Sidebar（新增 Copilot icon） |
| Kbd | `design/components/kbd/` | 鍵盤按鍵 badge（ShortcutsModal 中使用） |

---

## 頁面切換時的狀態保持

- CopilotPanel 位於 `app/(shell)/layout.tsx`，路由切換時 **不重新 mount**
- `useCopilotStore` zustand store 跨路由持久化（`isOpen`、`messages`、`sessionId`）
- SSE EventSource 連線：Panel 開啟時建立，**路由切換不中斷**，Panel 關閉時才 `es.close()`

---

## Pre-delivery Checklist（此頁面）

| 類別 | 項目 | 狀態 |
|------|------|------|
| Accessibility | Copilot Panel `role="complementary"` | 已定義 |
| Accessibility | MessageList `role="log"` + `aria-live` | 已定義 |
| Accessibility | Sidebar Copilot icon `aria-pressed` | 已定義 |
| Interaction | ResizeHandle 44px+ 熱區 | 已定義（8px 視覺，drag area） |
| Interaction | Panel 開關 300ms ease-out 動畫 | 已定義 |
| Interaction | Mobile bottom sheet 模式 | 已定義 |
| Layout | Desktop 並排（Sidebar + Main + Panel） | 已定義 |
| Layout | Mobile 全屏 bottom sheet | 已定義 |
| Z-index | CmdK > CopilotPanel > Sidebar | 已定義 |
