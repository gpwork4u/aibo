# Inbox 頁規格

## 概述

Inbox 是 aibo 的預設首頁，顯示所有未分類且未歸檔的知識條目。支援快速新增、搜尋、分類指派。

## 路由

`/inbox`（首頁 `/` redirect 至此）

## 頁面結構

```
┌──────────────────────────────────────────────────┐
│  Inbox                               [快速新增]  │
│  未分類的知識條目                                  │
├──────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────────────────────────────────┐    │
│  │ 🔍 搜尋 Inbox...              [排序 ▾]   │    │
│  └──────────────────────────────────────────┘    │
│                                                    │
│  ┌──────────────────────────────────────────┐    │
│  │ 標題            │ Tags      │ 建立時間  │ ⋮  │
│  ├─────────────────┼──────────┼──────────┼───┤
│  │ 快速筆記：明天要 │          │ 5 分鐘前  │ ⋮  │
│  │ 查 goroutine... │          │          │    │
│  │ React 效能優化  │ react    │ 1 天前   │ ⋮  │
│  └──────────────────────────────────────────┘    │
│                                                    │
│  共 12 筆，第 1 / 1 頁                            │
└──────────────────────────────────────────────────┘
```

## 與 Entry 列表頁的差異

| 特性 | Inbox | Entry 列表 |
|------|-------|-----------|
| 查詢參數 | `category_id=null&is_archived=false`（固定） | 使用者自選 |
| 分類篩選 | 無（固定未分類） | 有 |
| 行操作重點 | 移至分類、歸檔 | 查看、編輯 |
| 操作按鈕 | 快速新增 | 建立條目 |
| 空狀態 | 「太棒了，沒有待處理的條目！」 | 「還沒有知識條目」 |

## 元件組成

### PageHeader

```tsx
<PageHeader
  title="Inbox"
  description="未分類的知識條目"
  action={
    <Button onClick={() => setQuickAddOpen(true)}>
      <Plus className="mr-2 h-4 w-4" />
      快速新增
    </Button>
  }
/>
```

### 篩選列

Inbox 篩選較簡單（無分類篩選）：

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
  <SearchInput
    placeholder="搜尋 Inbox..."
    value={search}
    onChange={setSearch}
    className="sm:w-[300px]"
  />
  <Select value={sortBy} onValueChange={setSortBy}>
    <SelectTrigger className="w-[140px]">
      <SelectValue placeholder="排序" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="created_at:desc">最新建立</SelectItem>
      <SelectItem value="updated_at:desc">最近更新</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### DataTable 欄位

| 欄位 | 寬度 | 內容 |
|------|------|------|
| 標題/內容 | flex-1 | `title` 或 `content_preview`（灰色斜體） |
| Tags | 180px | Badge 列表 |
| 建立時間 | 140px | 相對時間 |
| 操作 | 50px | DropdownMenu |

### 行操作（DropdownMenu）

| 項目 | Icon | 說明 |
|------|------|------|
| 查看 | `Eye` | 導航到 `/entries/:id` |
| 編輯 | `Pencil` | 開啟編輯 Dialog |
| 移至分類 | `FolderInput` | 開啟分類選擇 Popover（重點操作） |
| 歸檔 | `Archive` | PATCH `is_archived: true` |
| 刪除 | `Trash2` | 開啟刪除確認 |

### 移至分類 Popover

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="sm">
      <FolderInput className="mr-2 h-4 w-4" />
      移至分類
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[200px] p-2">
    <div className="space-y-1">
      {categories.map((cat) => (
        <Button
          key={cat.id}
          variant="ghost"
          className="w-full justify-start"
          onClick={() => moveToCategory(entryId, cat.id)}
        >
          <FolderTree className="mr-2 h-4 w-4" />
          {cat.name}
        </Button>
      ))}
    </div>
  </PopoverContent>
</Popover>
```

## 快速新增 Dialog

簡化版的建立表單，只保留最關鍵的欄位：

```tsx
<Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>快速新增</DialogTitle>
      <DialogDescription>快速記錄想法，之後再整理</DialogDescription>
    </DialogHeader>
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">標題</Label>
        <Input id="title" placeholder="選填" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">內容</Label>
        <Textarea
          id="content"
          placeholder="在這裡記下你的想法..."
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label>Tags</Label>
        <TagInput value={tags} onChange={setTags} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setQuickAddOpen(false)}>取消</Button>
        <Button type="submit">新增</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

## 狀態

| 狀態 | 顯示 |
|------|------|
| 載入中 | Skeleton rows |
| 空（全部處理完） | 慶祝空狀態 |
| 正常 | DataTable |
| 搜尋無結果 | 「找不到符合的條目」 |
| 錯誤 | ErrorState |

### 空狀態（慶祝版）

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-4">
    <CheckCircle2 className="h-8 w-8 text-success" />
  </div>
  <h3 className="text-lg font-semibold">太棒了！</h3>
  <p className="text-sm text-muted-foreground mt-1">
    沒有待處理的條目，所有知識都已歸類
  </p>
  <Button variant="outline" className="mt-4" onClick={() => setQuickAddOpen(true)}>
    <Plus className="mr-2 h-4 w-4" />
    記錄新想法
  </Button>
</div>
```

## Sidebar Badge 連動

Inbox 頁的條目數量會同步顯示在 Sidebar 的 Inbox 項目旁：

```tsx
// Sidebar 中的 Inbox 項目
<SidebarMenuBadge>{inboxCount}</SidebarMenuBadge>
```

- 當 Inbox 為空時，不顯示 Badge
- 新增/移出/歸檔/刪除操作後，自動更新 Badge 數字

## Toast 通知

| 操作 | 類型 | 訊息 |
|------|------|------|
| 快速新增成功 | success | 已新增至 Inbox |
| 移至分類成功 | success | 已移至「{category.name}」 |
| 歸檔成功 | success | 條目已歸檔 |
| 刪除成功 | success | 條目已刪除 |
