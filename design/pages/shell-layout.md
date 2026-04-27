# App Shell Layout

## 對應 Feature
#195 F-036: App Shell + Hybrid Routing

## 用途
所有認證後頁面的共用骨架，定義 Sidebar / TopBar / MainArea / CopilotSlot 的位置關係與互動規則。

## 完整結構圖

```
┌──────────────────────────────────────────────────────────────────┐
│  [Skip to content 隱藏連結（focus 時顯示）]                       │
│  ─────────────────────────────────────────────────────────────── │
│  TopBar（fixed, z-300）                                           │
│  ┌────────┬──────────────────────────────┬───────────────────┐   │
│  │[Toggle]│ [Search...          ⌘K]      │[Bot][Theme][User] │   │
│  └────────┴──────────────────────────────┴───────────────────┘   │
│                                                                    │
│  Sidebar（fixed, z-300）       MainArea                           │
│  ┌────────────────┐            ┌──────────────────────────────┐  │
│  │ [Logo] aibo    │            │  pt-14（topbar offset）       │  │
│  │ ────────────── │            │  max-w-[1200px] mx-auto      │  │
│  │ [i] Inbox   3  │            │  px-6 py-6                   │  │
│  │ [i] Library    │            │                              │  │
│  │ [i] 今日       │            │  {page content}              │  │
│  │ [i] Canvas     │            │                              │  │
│  │ ────────────── │            │                              │  │
│  │ flex-1 nav     │            │                              │  │
│  │ ────────────── │            │                              │  │
│  │ [i] Settings   │            └──────────────────────────────┘  │
│  │ ────────────── │                                               │
│  │ [Ava] Username │                                               │
│  └────────────────┘                                               │
│                                          CopilotSlot（z-400）     │
│                                          ┌─────────────────────┐  │
│                                          │[Copilot] ────── [X] │  │
│                                          │                     │  │
│                                          │  chat interface     │  │
│                                          │                     │  │
│                                          └─────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## 尺寸一覽

| Zone            | 規格                                          |
|----------------|----------------------------------------------|
| TopBar          | `height: 56px`，`fixed top-0`，`z-300`       |
| Sidebar expand  | `width: 240px`，`fixed left-0 top-0 bottom-0`|
| Sidebar collapse| `width: 64px`                                |
| MainArea        | `margin-left: sidebar-width`，`padding-top: 56px` |
| MainArea inner  | `max-width: 1200px`，`margin: 0 auto`，`padding: 24px` |
| CopilotSlot     | `width: 400px`，`fixed right-0 top-56px`     |

## 互動規則

### Sidebar Toggle（Desktop）
- 按鈕：TopBar 左側 PanelLeft icon
- 動作：`width 240px ↔ 64px`，`transition 200ms cubic-bezier(0.4,0,0.2,1)`
- 收合時：icon 對齊中央，label 隱藏，hover 顯示 Tooltip
- 狀態持久化：儲存至 localStorage（`sidebar-collapsed`）

### Mobile Sidebar（< 768px）
- TopBar 左側改顯示 Menu icon
- 點擊開啟 `Sheet`（side="left"，width=280px）
- Sheet 外點擊自動關閉
- Sheet 內結構與展開 Sidebar 相同（不收合）

### CopilotSlot（Desktop）
- 觸發：`⌘\`（macOS）/ `Ctrl+\`（Windows）或 TopBar Bot icon
- 開啟：`translateX(0)`，MainArea `margin-right += 400px`
- 關閉：`translateX(100%)`，MainArea `margin-right = 0`
- Mobile：以 `Sheet`（side="bottom"）取代

## 色彩 Token 對應

| 區域                | Token                           |
|--------------------|---------------------------------|
| TopBar background  | `color.bg.default`              |
| TopBar border-bottom| `color.border.default`         |
| Sidebar background | `color.sidebar.bg`              |
| Sidebar border     | `color.sidebar.border`          |
| MainArea background| `color.bg.default`              |
| CopilotSlot border | `color.border.default`          |
| Logo text          | `color.fg.default`              |
| Nav item（default）| `color.sidebar.fg`              |
| Nav item（active） | `color.sidebar.active-fg` + `color.sidebar.active-bg` |
| Active accent bar  | `color.accent.default`          |

## Skip-to-content
```html
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] focus:px-4 focus:py-2 focus:rounded-md focus:bg-background focus:border focus:text-sm">
  跳至主要內容
</a>
```

## 元件參照

| 元件            | 規格文件                              |
|----------------|---------------------------------------|
| PillNav        | `components/pill-nav/spec.md`         |
| Button（ghost）| `components/button/spec.md`           |
| Sheet          | shadcn/ui（對齊 token）              |
| ThemeToggle    | `components/theme-toggle/spec.md`     |
| CommandPalette | `components/command/spec.md`          |
