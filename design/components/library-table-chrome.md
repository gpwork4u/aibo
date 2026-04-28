# LibraryTableChrome

## 概述

Library 頁面的表格視覺層（chrome）。基於 TanStack Table v8（headless）自行樣式，搭配 editorial paper design tokens。
不包含資料邏輯——僅定義欄位 header、row、sticky toolbar、empty state 的視覺規格。

## 欄位定義

| 欄位 key | 標題 | 寬度 | 可排序 | 說明 |
|----------|------|------|--------|------|
| `select` | — | 48px | N | 全選 Checkbox |
| `title` | 標題 | flex-1（min 200px） | Y | 主要內容 |
| `category` | 分類 | 140px | N | 分類名稱 badge |
| `tags` | 標籤 | 180px | N | 最多 3 個，超出 "+N" |
| `status` | 狀態 | 100px | N | inbox / library / archived badge |
| `confidence` | 可信度 | 80px | Y | 0-100 數字 + 顏色指示 |
| `updatedAt` | 更新時間 | 120px | Y | 相對時間（e.g. "3 天前"） |
| `actions` | — | 48px | N | "..." kebab menu |

## Column Header 規格

### Sortable Header

```
┌──────────────────────┐
│ 標題文字  ↑ (asc)    │  ← 有排序
│ 標題文字  ↕ (unsorted)│ ← hover 顯示
└──────────────────────┘
```

- 預設：文字 + 排序狀態 icon
- 排序 icon：`ArrowUpIcon`（asc）/ `ArrowDownIcon`（desc）/ `ArrowUpDownIcon`（unsorted）
- Hover：背景 `hover:bg-muted/50`，游標 `cursor-pointer`
- 排序中：文字 `text-foreground font-medium`；未排序：`text-muted-foreground`
- 觸控目標：完整欄位寬度可點擊，`min-h-[44px]`

### Checkbox Header（全選）

- `Checkbox` indeterminate state 當部分勾選時
- `aria-label="Select all entries"`

### Actions Header

- 空白，右對齊
- `aria-label="Row actions"`

## Row 狀態規格

| State | 外觀變化 |
|-------|---------|
| `default` | 白底，`border-b border-border` |
| `hover` | `bg-muted/30`，action column 的 "..." button 顯示 |
| `selected` | Checkbox checked + `bg-accent/20` |
| `loading`（skeleton） | 全列 shimmer（`animate-pulse bg-muted rounded`） |

### Row 內容規格

- Title：`text-sm font-medium text-foreground line-clamp-1`，可點擊展開 Sheet
- Category：`<Badge variant="secondary">`
- Tags：最多 3 個 `<Badge variant="outline" className="text-xs">`，多餘顯示 `+N`
- Status：
  - `inbox` → `<Badge variant="secondary">Inbox</Badge>`
  - `library` → `<Badge variant="default">Library</Badge>`
  - `archived` → `<Badge variant="outline" className="text-muted-foreground">Archived</Badge>`
- Confidence：
  - >= 80：`text-success-foreground`（綠色）
  - 50-79：`text-warning-foreground`（橘黃色）
  - < 50：`text-muted-foreground`（灰色）
- UpdatedAt：`formatDistanceToNow`（date-fns），`text-xs text-muted-foreground`

### Row Action Menu（"..." Kebab）

- Trigger：`<Button variant="ghost" size="icon">`，`opacity-0 group-hover:opacity-100`
- 展開：`<DropdownMenu>`（shadcn）
- 項目：Edit（`PencilIcon`）/ Archive（`ArchiveIcon`）/ Delete（`Trash2Icon`，destructive 色）
- Delete 項目：`className="text-destructive focus:text-destructive"`

## Sticky Toolbar（批次操作列）

當有 row 被勾選時，表格頂部顯示 sticky toolbar，浮於 header 之上。

```
┌─────────────────────────────────────────────────────┐
│ [x] 已選 {N} 筆    [Archive]  [Move to Library]  [Delete]  │
└─────────────────────────────────────────────────────┘
```

- 位置：`sticky top-0 z-10`
- 背景：`bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`
- 邊框：`border-b border-border`
- 顯示條件：`selectedCount > 0`，`animate-in slide-in-from-top duration-200`
- 隱藏條件：`selectedCount === 0`，`animate-out slide-out-to-top duration-200`
- X 按鈕：清除全部選取，`aria-label="Clear selection"`

### Toolbar Buttons

| 按鈕 | Icon | Variant |
|------|------|---------|
| Archive | `ArchiveIcon` | `outline` |
| Move to Library | `BookmarkPlusIcon` | `outline` |
| Delete | `Trash2Icon` | `destructive` |

## Empty State

```
┌─────────────────────────────┐
│                             │
│      📭  （不用 emoji icon） │
│  [InboxIcon]                │
│  No entries found           │
│  ← 找不到符合條件的項目        │
│                             │
│  [Reset Filters]（outline） │
│                             │
└─────────────────────────────┘
```

- Icon：`<InboxIcon className="h-12 w-12 text-muted-foreground/50">`
- 標題：`text-base font-medium text-foreground`
- 說明文字：`text-sm text-muted-foreground`
- CTA：`<Button variant="outline">重置篩選</Button>`

## Virtualized Scroll

- 使用 `@tanstack/react-virtual`（rowVirtualizer）
- 容器固定高度：`calc(100vh - {toolbar_height} - {header_height})`
- `overscrollBehavior: "contain"`
- Row 渲染只含可見視窗（+ overscan 5 行）

## Accessibility

- `<table role="grid" aria-label="Library 知識項目">`
- `<th scope="col">`
- 排序 header：`aria-sort="ascending" | "descending" | "none"`
- Selected row：`aria-selected="true"`
- 全選 checkbox：`aria-label="Select all entries"` / `aria-label="Deselect all entries"`
- Sticky toolbar：`role="toolbar" aria-label="批次操作"` 並在出現時 focus

## 使用範例

見 `library-table-chrome.example.tsx`

## 依賴

- TanStack Table v8 (`@tanstack/react-table`)
- TanStack Virtual (`@tanstack/react-virtual`)
- shadcn：`Table`, `Checkbox`, `Button`, `Badge`, `DropdownMenu`
- Lucide：`ArrowUp`, `ArrowDown`, `ArrowUpDown`, `Archive`, `BookmarkPlus`, `Trash2`, `Pencil`, `MoreHorizontal`, `Inbox`
- date-fns：`formatDistanceToNow`
