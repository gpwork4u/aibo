# Dropdown Menu 元件規格

## 概述

Dropdown Menu 基於 shadcn/ui DropdownMenu（Radix UI primitive），用於表格行操作、更多選項等場景。

## 基礎元件

- **來源**：`shadcn/ui` DropdownMenu
- **底層**：Radix UI DropdownMenu primitive
- **圖示**：Lucide Icons

## 子元件

| 元件 | 用途 |
|------|------|
| `DropdownMenu` | 外層 context |
| `DropdownMenuTrigger` | 觸發按鈕 |
| `DropdownMenuContent` | 選單面板 |
| `DropdownMenuItem` | 選單項目 |
| `DropdownMenuSeparator` | 分隔線 |
| `DropdownMenuLabel` | 群組標籤 |

## 樣式規格

### Content 面板

| 屬性 | 值 |
|------|-----|
| 最小寬度 | `min-w-[160px]` |
| 背景 | `bg-popover text-popover-foreground` |
| 邊框 | `border` |
| 圓角 | `rounded-md` |
| 陰影 | `shadow-md` |
| 內距 | `p-1` |
| 動畫 | Radix 預設（fade + scale） |

### MenuItem

| 屬性 | 值 |
|------|-----|
| 內距 | `px-2 py-1.5` |
| 字級 | `text-sm` |
| 圓角 | `rounded-sm` |
| Hover | `bg-accent text-accent-foreground` |
| Focus | `bg-accent text-accent-foreground`（鍵盤） |
| Disabled | `opacity-50 pointer-events-none` |
| 高度 | 自然高度（約 36px 含內距，滿足觸控目標） |

### Separator

| 屬性 | 值 |
|------|-----|
| 高度 | `1px` |
| 色彩 | `bg-muted` |
| 邊距 | `my-1 -mx-1` |

## 使用範例

### 表格行操作

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">操作選單</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>操作</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => router.push(`/entries/${id}`)}>
      <Eye className="mr-2 h-4 w-4" />
      查看
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => openEditDialog(id)}>
      <Pencil className="mr-2 h-4 w-4" />
      編輯
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onClick={() => openDeleteDialog(id)}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      刪除
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## aibo 專案使用場景

### Entry 行操作

| 項目 | Icon | 動作 |
|------|------|------|
| 查看 | `Eye` | 導航到詳情頁 |
| 編輯 | `Pencil` | 開啟編輯 Dialog |
| 移至分類 | `FolderInput` | 開啟分類選擇 |
| 歸檔 | `Archive` | 設為 is_archived = true |
| 刪除 | `Trash2` | 開啟刪除確認 AlertDialog |

### Category 行操作

| 項目 | Icon | 動作 |
|------|------|------|
| 編輯 | `Pencil` | 開啟編輯 Dialog |
| 刪除 | `Trash2` | 開啟刪除確認 AlertDialog |

### LLM Provider 行操作

| 項目 | Icon | 動作 |
|------|------|------|
| 編輯 | `Pencil` | 開啟編輯 Dialog |
| 設為預設 | `Star` | 設為 default provider |
| 健康檢查 | `Activity` | 發送健康檢查請求 |
| 刪除 | `Trash2` | 開啟刪除確認 AlertDialog |

### API Key 行操作

API Key 列表較簡單，直接使用按鈕而非 DropdownMenu：

| 操作 | 元件 | 說明 |
|------|------|------|
| 撤銷 | Button（destructive ghost） | 直接開啟 AlertDialog |

## Accessibility

- Trigger 按鈕有 `aria-haspopup="menu"` 和 `aria-expanded`
- 選單開啟時 focus 移到第一個項目
- 方向鍵（上/下）瀏覽項目
- Enter / Space 選擇項目
- Escape 關閉選單，focus 回到 trigger
- 破壞性項目使用 `text-destructive` 視覺強調
- Icon-only trigger 必須有 `sr-only` 文字
