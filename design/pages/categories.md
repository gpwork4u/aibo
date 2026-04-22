# 分類管理頁規格

## 概述

分類管理頁提供 Category 的 CRUD 功能，顯示各分類下的條目數量。

## 路由

`/categories`

## 頁面結構

```
┌──────────────────────────────────────────────────┐
│  分類管理                            [建立分類]  │
│  組織你的知識條目                                  │
├──────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────────────────────────────────┐    │
│  │ 名稱      │ 描述         │ 條目 │ 排序 │ ⋮  │
│  ├───────────┼─────────────┼──────┼──────┼───┤
│  │ Golang    │ Go 語言相關  │  15  │  0   │ ⋮  │
│  │ Python    │ Python 相關  │   8  │  1   │ ⋮  │
│  │ 前端      │ 前端開發     │  12  │  2   │ ⋮  │
│  └──────────────────────────────────────────┘    │
│                                                    │
└──────────────────────────────────────────────────┘
```

## 元件組成

### PageHeader

```tsx
<PageHeader
  title="分類管理"
  description="組織你的知識條目"
  action={
    <Button onClick={() => setCreateDialogOpen(true)}>
      <Plus className="mr-2 h-4 w-4" />
      建立分類
    </Button>
  }
/>
```

### DataTable 欄位

| 欄位 | 寬度 | 內容 |
|------|------|------|
| 名稱 | flex-1 | `name`，`font-medium` |
| 描述 | flex-1 | `description`，`text-muted-foreground truncate`；null 時顯示 `—` |
| 條目數 | 100px | Badge（`secondary`），如 `15 條目` |
| 排序 | 80px | `sort_order`，`text-muted-foreground` |
| 操作 | 50px | DropdownMenu |

### 行操作（DropdownMenu）

| 項目 | Icon | 說明 |
|------|------|------|
| 編輯 | `Pencil` | 開啟編輯 Dialog |
| 查看條目 | `FileText` | 導航到 `/entries?category_id={id}` |
| 刪除 | `Trash2` | 開啟刪除確認 AlertDialog |

## 建立/編輯 Dialog

### 表單欄位

| 欄位 | 元件 | 驗證規則 |
|------|------|---------|
| 名稱 * | Input | 必填，max 50 chars，不可重複（case-insensitive） |
| 描述 | Textarea（2 rows） | 選填，max 200 chars |
| 排序 | Input (number) | 選填，>= 0，default 0 |

### Dialog 大小

小型（`sm:max-w-[425px]`）

### 建立 vs 編輯差異

| | 建立 | 編輯 |
|--|------|------|
| Dialog 標題 | 建立分類 | 編輯分類 |
| HTTP 方法 | POST | PUT（全量更新） |
| 按鈕文字 | 建立 | 儲存 |

### 表單結構

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>{isEdit ? "編輯分類" : "建立分類"}</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">名稱 *</Label>
        <Input id="name" placeholder="例如：Golang" maxLength={50} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Textarea id="description" placeholder="分類描述（選填）" rows={2} maxLength={200} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sort_order">排序</Label>
        <Input id="sort_order" type="number" min={0} defaultValue={0} />
        <p className="text-xs text-muted-foreground">數字越小排越前面</p>
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={() => setOpen(false)}>取消</Button>
        <Button type="submit">{isEdit ? "儲存" : "建立"}</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

## 刪除確認 AlertDialog

```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>確認刪除分類</AlertDialogTitle>
      <AlertDialogDescription>
        刪除「{category.name}」後，該分類下的 {category.entry_count} 筆條目將移至 Inbox。此操作無法復原。
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

| 狀態 | 顯示 |
|------|------|
| 載入中 | Skeleton rows |
| 空 | EmptyState：「還沒有分類」+ 建立按鈕 |
| 正常 | DataTable |
| 錯誤 | ErrorState |

### 空狀態

```tsx
<EmptyState
  icon={FolderTree}
  title="還沒有分類"
  description="建立分類來組織你的知識條目"
  action={
    <Button onClick={() => setCreateDialogOpen(true)}>
      <Plus className="mr-2 h-4 w-4" />
      建立分類
    </Button>
  }
/>
```

## Toast 通知

| 操作 | 類型 | 訊息 |
|------|------|------|
| 建立成功 | success | 分類已建立 |
| 更新成功 | success | 分類已更新 |
| 刪除成功 | success | 分類已刪除（描述：該分類下的條目已移至 Inbox） |
| 名稱重複 | error | 名稱已存在 |
| 驗證失敗 | error | 請檢查表單欄位 |
