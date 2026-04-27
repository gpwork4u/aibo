# Layout Shell

## 用途
整個 app 的骨架佈局，包含 Sidebar、TopBar、MainArea 三個 zone，以及可選的 CopilotSlot 右側抽屜。

## 整體結構

```
┌─────────────────────────────────────────────────────────┐
│  TopBar（fixed, h-14 = 56px, z-index: topbar）          │
├──────────┬──────────────────────────────────┬───────────┤
│ Sidebar  │  MainArea                        │ Copilot   │
│          │  (max-w-[1200px] mx-auto)        │ Slot      │
│  240px   │  px-6 py-6                       │ 400px     │
│  (expand)│                                  │ (hidden   │
│   64px   │                                  │  default) │
│  (collap)│                                  │           │
│          │                                  │           │
└──────────┴──────────────────────────────────┴───────────┘
```

## Zone 規格

### TopBar
- Height: `layout.topbar-height`（56px）
- Position: `fixed top-0 left-0 right-0`，`z-index: topbar`（300）
- Background: `color.bg.default`，`border-bottom: color.border.default`
- Shadow: `shadow.xs`
- 左側：`padding-left` 根據 sidebar 狀態動態調整（240px / 64px）
- 內容排列：
  - 左側：Search 觸發按鈕（SearchTrigger）
  - 右側：ThemeToggle + UserMenu（flex gap-2）

### SearchTrigger（TopBar 左側）
```
[ Search icon ]  Search...  Ctrl+K
```
- 外觀：類 input 的按鈕，`border color.border.default`，`radius.md`
- Width: `min-w-48 max-w-xs`
- Click / ⌘K：開啟 Command Palette

### Sidebar
- Width expand: `layout.sidebar-expanded`（240px）
- Width collapsed: `layout.sidebar-collapsed`（64px）
- Position: `fixed left-0 top-14`（topbar 高度以下），`bottom-0`
- Background: `color.sidebar.bg`
- Border-right: `color.sidebar.border`
- `z-index: sidebar`（300）
- Transition: `width 200ms cubic-bezier(0.4, 0, 0.2, 1)`
- 結構：
  - Logo 區（h-14，`border-bottom: color.sidebar.border`）
  - NavItems（`flex-1 overflow-y-auto`）
  - Bottom（Settings + UserSection，`border-top`）

### MainArea
- `margin-left`: sidebar width（240px / 64px），responsive
- `padding-top`: topbar height（56px）
- `padding`: `spacing.6`（24px）
- Inner `max-width`: `layout.main-max-width`（1200px），`mx-auto`

### CopilotSlot（右側抽屜）
- Width: `layout.copilot-width`（400px）
- Position: `fixed right-0 top-14 bottom-0`
- Toggle: ⌘\ 或右上角按鈕
- Open/close animation: `translateX` 200ms ease
- 開啟時 MainArea `margin-right` 增加 400px（避免遮擋）
- Mobile：以 Sheet（底部抽屜）取代

## 響應式行為

| 斷點          | Sidebar          | CopilotSlot         | MainArea         |
|-------------|------------------|---------------------|-----------------|
| >= 1024px   | 固定展開（240px） | 可開啟（push 模式） | 依兩側 margin   |
| 768-1023px  | 預設收合（64px） | 以 Sheet 取代       | margin-left: 64px |
| < 768px     | 隱藏，漢堡選單開啟 Drawer | 以 Sheet 取代 | 全寬            |

## Mobile Drawer（< 768px）
- 觸發：TopBar 左側漢堡 icon（Menu，Lucide）
- 使用 Sheet 元件（side="left"，width=280px）
- Overlay 遮罩 `color.overlay`

## Z-index 層疊
```
Toast (700)
CmdK (900)
Modal (600)
Overlay (500)
Popover (400)
Sidebar/TopBar (300)
Dropdown (100)
Base (0)
```

## Accessibility
- `<nav aria-label="主要導航">` 包覆 Sidebar
- `<header role="banner">` 包覆 TopBar
- `<main>` 包覆 MainArea
- Skip-to-content 連結（隱藏，focus 時顯示，在 TopBar 前）
- Sidebar toggle 按鈕：`aria-expanded`，`aria-controls="sidebar"`

## 使用範例
見 `example.tsx`
