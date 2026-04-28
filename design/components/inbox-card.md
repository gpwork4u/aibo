# InboxCard

## 概述

Inbox Triage 頁面的核心卡片元件。每一張卡片代表一筆尚未處理的知識項目（status = inbox）。
基於 shadcn/ui Card primitive，搭配 editorial paper design tokens。

## 用途

- 展示 inbox 項目的標題、摘要、標籤、來源、建立時間
- 提供快速操作入口（Archive、Move to Library、Delete、Classify）
- 支援鍵盤游標（J/K）瀏覽、批次勾選

## Variants / States

| State | 外觀 |
|-------|------|
| `default` | 白底卡片，細邊框 `border` token |
| `active`（鍵盤游標停留） | 左側 3px accent border（`ring-primary`），`bg-accent/30` 背景 |
| `selected`（checkbox 勾選） | checkbox checked，`bg-accent/20` 背景 |
| `loading`（Classify 進行中） | Shimmer overlay（skeleton animation），action buttons 隱藏 |
| `hover` | action buttons 浮現，`bg-accent/10` 背景 |

### 狀態 Badge

卡片右上角顯示分類狀態 badge（沿用 Badge 元件）：

| 值 | Badge variant | 說明 |
|----|--------------|------|
| `draft` | `secondary` | 草稿，尚未送出 |
| `classifying` | `outline`（+ spinner icon） | LLM 分類中 |
| `classified` | `default` | 已分類完成 |

## Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `entry` | `InboxEntry` | required | 資料物件 |
| `isActive` | `boolean` | `false` | 鍵盤游標是否停留於此 |
| `isSelected` | `boolean` | `false` | 批次勾選狀態 |
| `isLoading` | `boolean` | `false` | Classify 進行中 |
| `onSelect` | `(id: string) => void` | - | 勾選 callback |
| `onArchive` | `(id: string) => void` | - | Archive callback |
| `onDelete` | `(id: string) => void` | - | Delete callback |
| `onClassify` | `(id: string) => void` | - | Classify callback |
| `onMoveToLibrary` | `(id: string) => void` | - | Move to Library callback |
| `onClick` | `(id: string) => void` | - | 點擊展開 preview |
| `className` | `string` | - | 自訂 className |

### InboxEntry 型別

```ts
interface InboxEntry {
  id: string;
  title: string;
  summary: string;           // 最多 2 行截斷
  tags: string[];
  source: string;            // e.g. "manual" | "api" | "import"
  createdAt: string;         // ISO 8601
  classificationStatus: "draft" | "classifying" | "classified";
}
```

## 版面結構

```
┌─────────────────────────────────────────┐
│ [checkbox]  Title（1 行截斷）  [status badge] │
│             Summary（2 行截斷）             │
│             [tag chip] [tag chip] ...      │
│             source badge    created_at     │
│                         [action buttons]  │ ← hover 浮現
└─────────────────────────────────────────┘
```

## 尺寸與間距

- 卡片最小高度：80px（`min-h-20`）
- 卡片水平 padding：`px-4`
- 卡片垂直 padding：`py-3`
- Action buttons 右邊距：`pr-3`
- Tags 間距：`gap-1.5`

## Action Buttons（Hover 浮現）

| 按鈕 | Icon | Variant | aria-label |
|------|------|---------|------------|
| Archive | `ArchiveIcon` | `ghost` size=`icon` | "Archive entry" |
| Move to Library | `BookmarkIcon` | `ghost` size=`icon` | "Move to library" |
| Classify | `SparklesIcon` | `ghost` size=`icon` | "Classify entry" |
| Delete | `TrashIcon` | `ghost` size=`icon` | "Delete entry"（destructive 色） |

Hover 浮現動畫：`opacity-0 group-hover:opacity-100 transition-opacity duration-150`

## Accessibility

- `role="article"`，`aria-label="{entry.title}"`
- Checkbox：`aria-label="Select {entry.title}"`
- `isActive` 時：`aria-current="true"`
- `isLoading` 時：`aria-busy="true"`，action buttons 加 `aria-hidden="true"`
- 鍵盤：`tabIndex={0}`，Enter 觸發 `onClick`，Space 觸發 `onSelect`
- Focus ring：`focus-visible:ring-2 focus-visible:ring-ring`

## 觸控目標

- Checkbox 觸控區：`min-w-[44px] min-h-[44px]`
- Action buttons：`size-icon`（`h-9 w-9`）+ 外距補足 44px

## Shimmer Loading State

使用 `animate-pulse` skeleton overlay：

```tsx
// isLoading 時整張卡片覆蓋半透明 shimmer
<div className="absolute inset-0 bg-background/60 rounded-md animate-pulse" />
```

## 使用範例

見 `inbox-card.example.tsx`

## 依賴元件

- `components/ui/card`（shadcn）
- `components/ui/checkbox`（shadcn）
- `components/ui/badge`（shadcn）
- `components/ui/button`（shadcn）
- Lucide：`Archive`, `BookmarkPlus`, `Sparkles`, `Trash2`
