# Button 元件規格

## 概述

按鈕元件基於 shadcn/ui Button，提供一致的互動操作入口。所有按鈕變體皆符合 WCAG 2.1 AA 標準。

## 基礎元件

- **來源**：`shadcn/ui` Button
- **底層**：HTML `<button>` 元素
- **圖示**：Lucide Icons

## Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `variant` | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"` | `"default"` | 按鈕樣式變體 |
| `size` | `"default" \| "sm" \| "lg" \| "icon"` | `"default"` | 按鈕大小 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `asChild` | `boolean` | `false` | 使用子元素作為渲染載體 |
| `className` | `string` | - | 自訂 className |

## 變體樣式

| Variant | 背景 | 文字 | 邊框 | 用途 |
|---------|------|------|------|------|
| `default` | `bg-primary` | `text-primary-foreground` | 無 | 主要操作（建立、儲存） |
| `destructive` | `bg-destructive` | `text-destructive-foreground` | 無 | 刪除、危險操作 |
| `outline` | 透明 | `text-foreground` | `border` | 次要操作（取消） |
| `secondary` | `bg-secondary` | `text-secondary-foreground` | 無 | 輔助操作 |
| `ghost` | 透明 | `text-foreground` | 無 | 工具列按鈕、table action |
| `link` | 透明 | `text-primary underline` | 無 | 導航連結樣式 |

## 大小規格

| Size | 高度 | 內距 | 字級 | 觸控目標 |
|------|------|------|------|---------|
| `sm` | `h-9` (36px) | `px-3` | `text-xs` | 44px（透過外距補足） |
| `default` | `h-10` (40px) | `px-4 py-2` | `text-sm` | 44px |
| `lg` | `h-11` (44px) | `px-8` | `text-sm` | 44px |
| `icon` | `h-10 w-10` (40px) | - | - | 44px |

## 狀態

| 狀態 | 樣式 |
|------|------|
| Default | 如變體定義 |
| Hover | `opacity-90` 或對應 hover 色 |
| Active | `scale-[0.98]`（微縮） |
| Focus | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| Disabled | `opacity-50 pointer-events-none` |
| Loading | 顯示 `Loader2` icon 旋轉 + 文字灰化 |

## Loading 狀態

```tsx
import { Loader2 } from "lucide-react"

<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  處理中...
</Button>
```

## Icon Button

```tsx
import { Plus, Trash2, MoreHorizontal } from "lucide-react"

// Icon + 文字
<Button>
  <Plus className="mr-2 h-4 w-4" />
  建立條目
</Button>

// 純 Icon
<Button variant="ghost" size="icon">
  <Trash2 className="h-4 w-4" />
  <span className="sr-only">刪除</span>
</Button>

// Table 行內操作
<Button variant="ghost" size="icon">
  <MoreHorizontal className="h-4 w-4" />
  <span className="sr-only">更多操作</span>
</Button>
```

## aibo 專案使用場景

| 場景 | Variant | Size | Icon |
|------|---------|------|------|
| 建立 API Key | `default` | `default` | `Plus` |
| 建立條目 | `default` | `default` | `Plus` |
| 建立分類 | `default` | `default` | `Plus` |
| 新增 LLM Provider | `default` | `default` | `Plus` |
| 儲存表單 | `default` | `default` | 無 |
| 取消操作 | `outline` | `default` | 無 |
| 刪除項目 | `destructive` | `default` | `Trash2` |
| 刪除確認（AlertDialog 內） | `destructive` | `default` | 無 |
| 表格行操作 | `ghost` | `icon` | `MoreHorizontal` |
| 複製 API Key | `ghost` | `icon` | `Copy` |
| 健康檢查 | `outline` | `sm` | `Activity` |
| Sidebar 收合 | `ghost` | `icon` | `PanelLeftClose` |

## Accessibility

- 所有按鈕必須有可辨識的 accessible name
- Icon-only button 必須包含 `<span className="sr-only">` 或 `aria-label`
- 禁用按鈕使用 `disabled` 屬性而非僅視覺灰化
- Focus ring 在 keyboard navigation 時可見（`focus-visible`）
- 按鈕間距確保觸控目標不重疊（最小 8px 間距）
