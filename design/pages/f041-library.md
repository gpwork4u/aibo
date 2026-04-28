# Library Page（Sprint 14）

## 對應 Feature

#207 F-041: Library Table View

## 路由

`/library`

## 版型

```
┌────────────────────────────────────────────────────────────────┐
│  App Shell Navbar (h-14)                                       │
├──────────┬─────────────────────────────────────────────────────┤
│ Sidebar  │  LibraryToolbar (sticky h-14)                       │
│ (w-60)   │  [Search]  [Filters...]  [Sort ▼]  [View ▼][View*] │
│          ├─────────────────────────────────────────────────────┤
│ [All]*   │  BatchToolbar (sticky h-10, 選取時浮現)             │
│ [Inbox]  ├─────────────────────────────────────────────────────┤
│ ─────    │  LibraryTable                                       │
│ [Views]  │  ┌──┬──────────┬──────┬──────┬─────┬──────┬─────┐  │
│          │  │☐ │ 標題 ↕  │ 分類 │ 標籤 │ 狀態│ 信度│ 時間│  │
│          │  ├──┼──────────┼──────┼──────┼─────┼──────┼─────┤  │
│          │  │☐ │ Title 1  │ cat  │ tags │ lib │  87 │ 3d  │  │
│          │  │☐ │ Title 2  │ cat  │ tags │ lib │  52 │ 1h  │  │
│          │  │  │ ...      │      │      │     │     │     │  │
│          │  └──┴──────────┴──────┴──────┴─────┴──────┴─────┘  │
│          │  (virtualized scroll)                               │
└──────────┴─────────────────────────────────────────────────────┘
```

## 區塊規格

### LibraryToolbar

- 高度：`h-14`，`sticky top-0 z-10`
- 背景：`bg-background/95 backdrop-blur`，`border-b border-border`
- 左側：`SearchInput`（`w-64` desktop，`w-full` mobile）
- 中間：FilterBar chips（status / category / tags / date range）
- 右側：
  - Sort Dropdown（建立時間 / 更新時間 / 標題 / 可信度）
  - View Toggle（Table / Card）
  - `ActiveViewChip`（若有 active saved view）

### BatchToolbar

- 顯示條件：`selectedCount > 0`，`sticky top-14 z-10`（toolbar 下方）
- 高度：`h-10`
- 動畫：`animate-in slide-in-from-top duration-200`
- 內容：已選 {N} 筆 × + [Archive] [Library] [Delete]
- 參考：`design/components/library-table-chrome.md` BatchToolbar

### LibraryTable

- 容器：`flex-1 overflow-hidden`，高度 `calc(100vh - 56px - [batch 40px?] - 8px)`
- 欄位：checkbox | title | category | tags | status | confidence | updatedAt | actions
- 虛擬化：`@tanstack/react-virtual`，row 高度 52px，overscan 5
- Row 點擊：開啟 `EntryDetailSheet`（shadcn Sheet 從右側滑出）
- Empty state：`InboxIcon` + "找不到符合條件的項目" + [重置篩選]
- 欄位 header / row / empty state 完整規格：`design/components/library-table-chrome.md`

### EntryDetailSheet

- shadcn `<Sheet side="right">`
- 寬度：`w-[480px]`（desktop），`w-full`（mobile）
- 內容：完整 entry 標題 + 正文 + metadata + edit / archive / delete actions

### FilterBar（inline chips）

- 每個篩選條件顯示為 `<Badge variant="secondary">` + X 清除
- 加號按鈕展開 Filter Popover（status / category / tags / date range）
- URL params 同步：`?status=library&category_id=xxx&tags=a,b&q=keyword`

## States

| State | 呈現方式 |
|-------|---------|
| Loading（首次） | 5 列 row skeleton（`animate-pulse`） |
| Empty（無過濾） | `InboxIcon` + "Library 空空如也" + 引導文字 |
| Empty（有過濾） | `InboxIcon` + "找不到符合條件的項目" + [重置篩選] |
| Error | `AlertCircleIcon` + "載入失敗" + [Retry] |

## URL 同步

- `?q=keyword`（搜尋）
- `?status=library,inbox`
- `?category_id=uuid`
- `?tags=tag1,tag2`
- `?sort_by=updated_at&sort_dir=desc`
- `?view={view_id}`（active saved view）
- `?entry={id}`（開啟 Sheet）

## 響應式

| 斷點 | 版型變化 |
|------|---------|
| >= 1024px | Sidebar + Table 全寬，Sheet 側開 |
| 768–1023px | Sidebar 收合，標籤欄位隱藏 |
| < 768px | Card view（Table 切換為 Card 列表）；Sidebar 漢堡 |

## Accessibility

- `<main aria-label="Library">`
- 參考 `design/components/library-table-chrome.md` 表格 accessibility 規格
- FilterBar：`role="search" aria-label="篩選條件"`

## 使用的元件

| 元件 | 規格來源 |
|------|---------|
| `LibraryTableChrome` | `design/components/library-table-chrome.md` |
| `SavedViewsList` / `ActiveViewChip` | `design/components/saved-views-chip.md` |
| `Sheet` | shadcn |
| `Button` | shadcn |
| `Badge` | shadcn |
