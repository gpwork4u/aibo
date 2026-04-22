# 知識條目頁規格

## 概述

知識條目頁包含列表頁、詳情頁、建立/編輯功能。為 aibo 的核心頁面。

## 路由

| 路由 | 頁面 |
|------|------|
| `/entries` | 列表頁 |
| `/entries/:id` | 詳情頁 |

---

## 列表頁

### 頁面結構

```
┌──────────────────────────────────────────────────┐
│  知識條目                            [建立條目]  │
│  管理你的知識庫                                    │
├──────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────────────────────────────────┐    │
│  │ 🔍 搜尋條目...    [分類 ▾] [排序 ▾]      │    │
│  └──────────────────────────────────────────┘    │
│                                                    │
│  ┌──────────────────────────────────────────┐    │
│  │ 標題          │ 分類    │ Tags     │ 更新  │ ⋮ │
│  ├───────────────┼────────┼─────────┼──────┼───┤
│  │ Golang 筆記   │ Golang │ go, tip │ 3分前 │ ⋮ │
│  │ React Hook... │ 前端   │ react   │ 1天前 │ ⋮ │
│  │ [只有 content]│   —    │         │ 2天前 │ ⋮ │
│  └──────────────────────────────────────────┘    │
│                                                    │
│  共 25 筆，第 1 / 3 頁         [< 上一頁] [下一頁 >] │
└──────────────────────────────────────────────────┘
```

### 篩選列

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
  <SearchInput
    placeholder="搜尋條目..."
    value={search}
    onChange={setSearch}
    className="sm:w-[300px]"
  />
  <div className="flex gap-2">
    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="所有分類" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">所有分類</SelectItem>
        <SelectItem value="null">未分類</SelectItem>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={sortBy} onValueChange={setSortBy}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="排序" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="created_at:desc">最新建立</SelectItem>
        <SelectItem value="updated_at:desc">最近更新</SelectItem>
        <SelectItem value="title:asc">標題 A-Z</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

### DataTable 欄位

| 欄位 | 寬度 | 排序 | 內容 |
|------|------|------|------|
| 標題 | flex-1 | 是 | `title`（truncate）；無 title 時顯示 `content_preview` 灰色斜體 |
| 分類 | 120px | 否 | Badge（`secondary`）或 `—`（灰色） |
| Tags | 200px | 否 | Badge 列表（最多 3 個 + `+N`） |
| 更新時間 | 140px | 是 | 相對時間（`text-muted-foreground text-xs`） |
| 操作 | 50px | 否 | DropdownMenu（查看、編輯、移至分類、歸檔、刪除） |

### 標題欄位渲染

```tsx
function EntryTitleCell({ entry }) {
  if (entry.title) {
    return <span className="font-medium truncate">{entry.title}</span>
  }
  return (
    <span className="text-muted-foreground italic truncate">
      {entry.content_preview}
    </span>
  )
}
```

### 行操作（DropdownMenu）

| 項目 | Icon | 說明 |
|------|------|------|
| 查看 | `Eye` | 導航到 `/entries/:id` |
| 編輯 | `Pencil` | 開啟編輯 Dialog |
| 移至分類 | `FolderInput` | 開啟分類選擇 Popover |
| 歸檔 | `Archive` | PATCH `is_archived: true` |
| 刪除 | `Trash2` | 開啟刪除確認 AlertDialog |

---

## 詳情頁

### 路由

`/entries/:id`

### 頁面結構

```
┌──────────────────────────────────────────────────┐
│  ← 返回列表                                      │
│                                                    │
│  ┌──────────────────────────────────────────┐    │
│  │  Golang goroutine 筆記          [編輯] [⋮] │    │
│  │                                            │    │
│  │  分類：[Golang]  Tags：[go] [concurrency]  │    │
│  │  來源：manual  建立：2026-04-20            │    │
│  │  更新：2026-04-22 15:30                    │    │
│  ├──────────────────────────────────────────┤    │
│  │                                            │    │
│  │  ## 重要觀念                              │    │
│  │                                            │    │
│  │  Goroutine 是 Go 的輕量級執行緒...        │    │
│  │                                            │    │
│  │  ```go                                    │    │
│  │  go func() {                              │    │
│  │      // ...                               │    │
│  │  }()                                      │    │
│  │  ```                                      │    │
│  │                                            │    │
│  └──────────────────────────────────────────┘    │
│                                                    │
└──────────────────────────────────────────────────┘
```

### 元件結構

```tsx
<div className="space-y-6">
  {/* 返回連結 */}
  <Button variant="ghost" size="sm" asChild>
    <Link href="/entries">
      <ArrowLeft className="mr-2 h-4 w-4" />
      返回列表
    </Link>
  </Button>

  {/* Entry Card */}
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="text-xl">{entry.title}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Pencil className="mr-2 h-4 w-4" />
            編輯
          </Button>
          <DropdownMenu>{/* 更多操作 */}</DropdownMenu>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {entry.category && <Badge variant="secondary">{entry.category.name}</Badge>}
        {entry.tags.map((tag) => (
          <Badge key={tag} variant="outline">{tag}</Badge>
        ))}
        <span>建立：{formatDate(entry.created_at)}</span>
        <span>更新：{formatDate(entry.updated_at)}</span>
      </div>
    </CardHeader>
    <CardContent>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {/* Markdown 渲染 */}
      </div>
    </CardContent>
  </Card>
</div>
```

---

## 建立/編輯 Dialog

### 表單欄位

| 欄位 | 元件 | 驗證規則 |
|------|------|---------|
| 標題 | Input | max 100 chars，與內容至少填一項 |
| 內容 | Textarea（6 rows） | Markdown 格式，與標題至少填一項 |
| 分類 | Select（CategorySelector） | 選填，必須為已存在的 category |
| Tags | TagInput | 選填，陣列 |
| 來源 | Input | 選填，max 500 chars |
| 來源類型 | Select | 選填，enum: manual / git / gcal |

### CategorySelector

```tsx
<Select value={categoryId} onValueChange={setCategoryId}>
  <SelectTrigger>
    <SelectValue placeholder="選擇分類（選填）" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">不分類</SelectItem>
    {categories.map((cat) => (
      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Dialog 大小

- 建立/編輯 Dialog 使用中型（`sm:max-w-[600px]`）

### 表單提交

- 建立：POST `/api/v1/entries`
- 編輯：PATCH `/api/v1/entries/:id`
- 成功後關閉 Dialog + Toast 通知 + 刷新列表

---

## 刪除確認

```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>確認刪除</AlertDialogTitle>
      <AlertDialogDescription>
        此操作無法復原。確定要刪除「{entry.title}」嗎？
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>取消</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive text-destructive-foreground">
        刪除
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## 狀態

| 狀態 | 列表頁 | 詳情頁 |
|------|--------|--------|
| 載入中 | Skeleton table rows | Skeleton Card |
| 空 | EmptyState + 建立按鈕 | - |
| 正常 | DataTable | Entry Card |
| 搜尋無結果 | 「找不到符合的條目」 | - |
| 404 | - | 條目不存在 + 返回列表 |
| 錯誤 | ErrorState | ErrorState |

### 空狀態

```tsx
<EmptyState
  icon={FileText}
  title="還沒有知識條目"
  description="建立你的第一筆知識條目開始使用"
  action={
    <Button onClick={() => setCreateDialogOpen(true)}>
      <Plus className="mr-2 h-4 w-4" />
      建立條目
    </Button>
  }
/>
```

## Toast 通知

| 操作 | 類型 | 訊息 |
|------|------|------|
| 建立成功 | success | 條目已建立 |
| 更新成功 | success | 條目已更新 |
| 刪除成功 | success | 條目已刪除 |
| 歸檔成功 | success | 條目已歸檔 |
| 驗證失敗 | error | 標題和內容至少需要填寫一項 |
| 分類不存在 | error | 指定的分類不存在 |
