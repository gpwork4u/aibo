# Inbox Triage Page（Sprint 14）

## 對應 Feature

#206 F-040: Inbox Triage View

## 路由

`/dashboard/inbox`

## 版型

```
┌────────────────────────────────────────────────────────────────┐
│  App Shell Navbar (h-14)                                       │
├──────────┬─────────────────────────────┬───────────────────────┤
│ Sidebar  │  InboxToolbar (sticky h-14) │                       │
│ (w-60)   ├─────────────────────────────┤  EntryPreviewPane     │
│          │  InboxList (virtualized)    │  (w-80, collapsible)  │
│ [All]    │                             │                       │
│ [Inbox]*─┤  [InboxCard]               │  Entry 標題            │
│ ─────    │  [InboxCard active]         │  Entry 正文摘要        │
│ [Views]  │  [InboxCard selected]       │  Tags / Metadata      │
│          │  [InboxCard loading]        │  ─────────────────    │
│          │  ...                        │  [Archive] [Library]  │
│          │                             │  [Classify] [Delete]  │
│          │                             │                       │
│          ├─────────────────────────────┴───────────────────────┤
│          │  InboxActionBar (sticky bottom, 選取時顯示, h-14)   │
└──────────┴─────────────────────────────────────────────────────┘
```

## 區塊規格

### InboxToolbar

- 高度：`h-14`，`sticky top-0 z-10`
- 背景：`bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`
- 邊框：`border-b border-border`
- 左側：Tabs（`全部` / `未分類` / `今日`）— shadcn `<Tabs>`
- 右側：
  - 全選 Checkbox（`aria-label="Select all"`）
  - Entry count badge
  - Sort dropdown（建立時間 / 更新時間 asc/desc）
  - Preview toggle（`PanelRightCloseIcon` / `PanelRightOpenIcon`）

### InboxList

- 容器：`flex-1 overflow-hidden`
- 虛擬化：`@tanstack/react-virtual`，容器高度 `calc(100vh - 56px - 56px - 56px)`
- padding：`px-3 py-2`，items 間距 `gap-1`
- 鍵盤支援：J 下 / K 上 / A Archive / D Delete / E Edit / Enter 展開 Preview

### EntryPreviewPane

- 寬度：`w-80 shrink-0`（fixed，不隨 list resize）
- 收合：`w-0 overflow-hidden transition-all duration-200`
- 內容：
  - Sticky header：entry title + close button
  - Body：正文（markdown render）
  - Metadata bar：source / tags / created_at / classification status
  - Action buttons：Archive / Move to Library / Classify / Delete
- Mobile：改為 shadcn `<Sheet>` 從右側 slide-in

### InboxActionBar（批次操作）

- 顯示條件：`selectedCount > 0`
- 高度：`h-14`，`sticky bottom-0`
- 背景：`bg-background border-t border-border`
- 動畫：`animate-in slide-in-from-bottom duration-200`
- 內容：已選 {N} 筆 + [Archive] [Library] [Classify] [Delete（destructive）]

## States

| State | 呈現方式 |
|-------|---------|
| Loading（首次） | `InboxCard` skeleton × 5 |
| Empty | `InboxIcon`（large, muted）+ "Inbox 清空了" + 說明文字 |
| Error | `AlertCircleIcon` + "載入失敗" + [Retry] |
| Loading More | 底部 `LoaderCircle` spinner |

## URL 同步

- `?filter=all|unclassified|today`（Tabs 狀態）
- `?entry={id}`（開啟 PreviewPane）
- `?sort=created_at|updated_at&dir=asc|desc`

## 響應式

| 斷點 | 版型變化 |
|------|---------|
| >= 1024px | 三欄（Sidebar + List + Preview） |
| 768–1023px | Sidebar 收合按鈕，Preview = Sheet |
| < 768px | 只有 List，Preview = 全螢幕 Sheet；Sidebar = 漢堡 |

## Accessibility

- `<main aria-label="Inbox">`
- 列表：`role="list" aria-label="Inbox 項目"`（共 {N} 筆）
- 工具列：`role="toolbar" aria-label="Inbox 篩選"`
- ActionBar：`role="toolbar" aria-label="批次操作"`，`aria-live="polite"` 宣告選取數量

## 使用的元件

| 元件 | 規格來源 |
|------|---------|
| `InboxCard` | `design/components/inbox-card.md` |
| `SavedViewsList` | `design/components/saved-views-chip.md` |
| `Tabs` | shadcn |
| `Sheet`（mobile preview） | shadcn |
| `Button` | shadcn |
