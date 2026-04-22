# Badge 元件規格

## 概述

Badge 用於顯示狀態標籤、分類、tags 等簡短資訊。基於 shadcn/ui Badge 元件。

## 基礎元件

- **來源**：`shadcn/ui` Badge
- **圖示**：Lucide Icons（配合使用）

## Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `variant` | `"default" \| "secondary" \| "destructive" \| "outline"` | `"default"` | 樣式變體 |
| `className` | `string` | - | 自訂 className |

## 變體樣式

| Variant | 背景 | 文字 | 邊框 | 用途 |
|---------|------|------|------|------|
| `default` | `bg-primary` | `text-primary-foreground` | 無 | 預設、Default provider |
| `secondary` | `bg-secondary` | `text-secondary-foreground` | 無 | 分類名稱、一般 tag |
| `destructive` | `bg-destructive` | `text-destructive-foreground` | 無 | 錯誤狀態、Unhealthy |
| `outline` | 透明 | `text-foreground` | `border` | Entry tags |

## 大小規格

| 屬性 | 值 |
|------|-----|
| 內距 | `px-2.5 py-0.5` |
| 字級 | `text-xs` |
| 字重 | `font-semibold` |
| 圓角 | `rounded-full` |
| 行高 | `leading-none` 或 `leading-4` |

## 自訂語義 Badge

除了 shadcn/ui 預設變體，aibo 定義以下語義 Badge：

### 狀態 Badge

```tsx
// 成功 / Healthy / Active
<Badge className="bg-success text-success-foreground">
  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
  Healthy
</Badge>

// 警告 / Expiring
<Badge className="bg-warning text-warning-foreground">
  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
  即將過期
</Badge>

// 錯誤 / Unhealthy / Inactive
<Badge variant="destructive">
  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
  Unhealthy
</Badge>

// 未測試 / Unknown
<Badge variant="secondary">
  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
  未測試
</Badge>
```

### 圓點指示器

```tsx
// Active 狀態（綠色圓點）
<span className="relative flex h-2 w-2">
  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
</span>

// Inactive 狀態（灰色圓點）
<span className="h-2 w-2 rounded-full bg-muted-foreground" />
```

## aibo 專案使用場景

| 場景 | Variant / 樣式 | 範例文字 |
|------|---------------|---------|
| Entry tag | `outline` | `golang`, `learning` |
| Category 名稱（表格中） | `secondary` | `Golang`, `Python` |
| API Key Active | 自訂 success | `Active` |
| API Key Expired | 自訂 warning | `Expired` |
| API Key Inactive | `secondary` | `Inactive` |
| LLM Provider Default | `default` | `Default` |
| LLM Provider Active | 自訂 success | `Active` |
| LLM Provider Inactive | `secondary` | `Inactive` |
| Health: Healthy | 自訂 success | `Healthy` |
| Health: Unhealthy | `destructive` | `Unhealthy` |
| Health: 未測試 | `secondary` | `未測試` |
| Entry count | `secondary` | `15 條目` |
| Inbox count（sidebar） | `default`（圓形） | `12` |

## Tag 列表顯示

當 tags 過多時，限制顯示數量：

```tsx
function TagList({ tags, max = 3 }: { tags: string[]; max?: number }) {
  const visible = tags.slice(0, max)
  const remaining = tags.length - max

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <Badge key={tag} variant="outline" className="text-xs">
          {tag}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{remaining}
        </Badge>
      )}
    </div>
  )
}
```

## Accessibility

- Badge 為純展示元素，使用 `<span>` 或 `<div>`
- 若 Badge 傳達重要狀態資訊，配合 `aria-label` 或 sr-only 文字
- 色彩圓點指示器需搭配文字標籤（不單純依賴色彩傳達資訊）
- Badge 文字對比度符合 WCAG 2.1 AA
