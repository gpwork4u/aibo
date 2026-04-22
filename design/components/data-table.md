# DataTable 元件規格

## 概述

DataTable 基於 TanStack Table v8 + shadcn/ui Table 元件，提供排序、分頁、行操作等功能。為 aibo 的列表頁面提供統一的表格介面。

## 基礎元件

- **來源**：`shadcn/ui` Table + TanStack Table v8
- **圖示**：Lucide Icons

## Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `columns` | `ColumnDef<TData>[]` | - | 欄位定義 |
| `data` | `TData[]` | - | 資料陣列 |
| `pagination` | `{ page, per_page, total, total_pages }` | - | 分頁資訊（server-side） |
| `onPageChange` | `(page: number) => void` | - | 換頁回呼 |
| `onSortChange` | `(sort: string, order: string) => void` | - | 排序回呼 |
| `isLoading` | `boolean` | `false` | 是否載入中 |
| `emptyMessage` | `string` | `"沒有資料"` | 空狀態文字 |
| `emptyIcon` | `LucideIcon` | `FileText` | 空狀態圖示 |

## 表格樣式

### 結構

```tsx
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="px-4 py-3 text-sm font-semibold text-muted-foreground">
          {/* 欄位名稱 */}
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="hover:bg-muted/50">
        <TableCell className="px-4 py-3 text-sm">
          {/* 資料 */}
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

### 表格列樣式

| 元素 | 樣式 |
|------|------|
| Table 外框 | `rounded-md border` |
| Header 行 | `bg-muted/50` |
| Header cell | `px-4 py-3 text-sm font-semibold text-muted-foreground` |
| Body row | `border-b hover:bg-muted/50 transition-colors` |
| Body cell | `px-4 py-3 text-sm` |
| 最後一行 | 無 `border-b` |

## 排序

可排序的欄位在 header 顯示排序圖示：

```tsx
<Button variant="ghost" onClick={toggleSort} className="-ml-4">
  標題
  <ArrowUpDown className="ml-2 h-4 w-4" />
</Button>
```

| 狀態 | 圖示 |
|------|------|
| 未排序 | `ArrowUpDown`（灰色） |
| 升序 | `ArrowUp` |
| 降序 | `ArrowDown` |

## 分頁

分頁元件位於表格下方：

```tsx
<div className="flex items-center justify-between px-2 py-4">
  <p className="text-sm text-muted-foreground">
    共 {total} 筆，第 {page} / {totalPages} 頁
  </p>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" disabled={page <= 1}>
      <ChevronLeft className="h-4 w-4" />
      上一頁
    </Button>
    <Button variant="outline" size="sm" disabled={page >= totalPages}>
      下一頁
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
</div>
```

## 行操作（Row Actions）

每行最後一欄為操作選單：

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">操作選單</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>
      <Eye className="mr-2 h-4 w-4" />
      查看
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Pencil className="mr-2 h-4 w-4" />
      編輯
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">
      <Trash2 className="mr-2 h-4 w-4" />
      刪除
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## 載入狀態（Loading）

```tsx
// Skeleton rows
<TableBody>
  {Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i}>
      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
    </TableRow>
  ))}
</TableBody>
```

## 空狀態（Empty State）

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
  <h3 className="text-lg font-semibold">沒有資料</h3>
  <p className="text-sm text-muted-foreground mt-1">
    {emptyMessage}
  </p>
  <Button className="mt-4">
    <Plus className="mr-2 h-4 w-4" />
    建立第一筆
  </Button>
</div>
```

## aibo 專案表格定義

### Entry 列表

| 欄位 | 寬度 | 排序 | 內容 |
|------|------|------|------|
| 標題 | flex-1 | 是 | `title`（truncate），無 title 時顯示 content_preview |
| 分類 | 120px | 否 | Badge 顯示 category name |
| Tags | 200px | 否 | Badge 列表（最多顯示 3 個 + `+N`） |
| 更新時間 | 140px | 是 | 相對時間（如「3 分鐘前」） |
| 操作 | 50px | 否 | DropdownMenu |

### Category 列表

| 欄位 | 寬度 | 排序 | 內容 |
|------|------|------|------|
| 名稱 | flex-1 | 否 | `name` |
| 描述 | flex-1 | 否 | `description`（truncate） |
| 條目數 | 100px | 否 | `entry_count` Badge |
| 排序 | 80px | 否 | `sort_order` |
| 操作 | 50px | 否 | DropdownMenu |

### API Key 列表

| 欄位 | 寬度 | 排序 | 內容 |
|------|------|------|------|
| 名稱 | flex-1 | 否 | `name` |
| Key 前綴 | 120px | 否 | `key_prefix`（monospace） |
| 狀態 | 100px | 否 | Badge（Active / Expired） |
| 到期日 | 140px | 否 | 日期或「永不過期」 |
| 最後使用 | 140px | 否 | 相對時間或「從未使用」 |
| 操作 | 50px | 否 | 刪除按鈕 |

### LLM Provider 列表

| 欄位 | 寬度 | 排序 | 內容 |
|------|------|------|------|
| 名稱 | flex-1 | 否 | `name` + Default badge |
| Endpoint | 200px | 否 | URL（truncate） |
| Model | 120px | 否 | `model_name` |
| 狀態 | 100px | 否 | Active / Inactive badge |
| 健康 | 100px | 否 | HealthStatus 指示器 |
| 操作 | 50px | 否 | DropdownMenu |

## 響應式

| 斷點 | 行為 |
|------|------|
| Desktop (>= 1024px) | 完整表格 |
| Tablet (768-1023px) | 隱藏較不重要的欄位（如 tags、描述） |
| Mobile (< 768px) | 改用 Card list 排版替代表格 |

## Accessibility

- 使用語義化 `<table>` 標籤
- 排序按鈕包含 `aria-sort` 屬性
- 分頁按鈕包含明確的 `aria-label`
- 空狀態使用 `role="status"` 標記
- 行操作 DropdownMenu 可透過鍵盤操作（Enter 展開、方向鍵瀏覽）
