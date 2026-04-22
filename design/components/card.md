# Card 元件規格

## 概述

Card 元件基於 shadcn/ui Card，用於將相關內容分組顯示。在 aibo 中主要用於 Dashboard 統計、Entry 詳情預覽、設定區塊等場景。

## 基礎元件

- **來源**：`shadcn/ui` Card
- **圖示**：Lucide Icons

## 子元件

| 元件 | 用途 |
|------|------|
| `Card` | 外層容器 |
| `CardHeader` | 標題區域 |
| `CardTitle` | 標題文字 |
| `CardDescription` | 描述文字 |
| `CardContent` | 主要內容 |
| `CardFooter` | 底部操作區域 |

## 樣式規格

| 屬性 | 值 |
|------|-----|
| 背景 | `bg-card text-card-foreground` |
| 邊框 | `border rounded-lg` |
| 陰影 | `shadow-sm` |
| 內距 | Header: `p-6 pb-0`, Content: `p-6 pt-0`, Footer: `p-6 pt-0` |

## 基礎結構

```tsx
<Card>
  <CardHeader>
    <CardTitle>標題</CardTitle>
    <CardDescription>描述文字</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 內容 */}
  </CardContent>
  <CardFooter>
    {/* 操作按鈕 */}
  </CardFooter>
</Card>
```

## aibo 專案使用場景

### Dashboard 統計 Card

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Inbox 待處理
    </CardTitle>
    <Inbox className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">12</div>
    <p className="text-xs text-muted-foreground mt-1">
      較昨天 +3
    </p>
  </CardContent>
</Card>
```

Dashboard 統計 Card 網格：

```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <Card>{/* Inbox 數量 */}</Card>
  <Card>{/* 總條目數 */}</Card>
  <Card>{/* 分類數量 */}</Card>
  <Card>{/* LLM Provider 狀態 */}</Card>
</div>
```

### Entry 詳情 Card

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="text-lg">{entry.title}</CardTitle>
      <DropdownMenu>{/* 操作選單 */}</DropdownMenu>
    </div>
    <CardDescription className="flex items-center gap-2">
      {entry.category && <Badge variant="secondary">{entry.category.name}</Badge>}
      <span className="text-xs text-muted-foreground">{entry.updated_at}</span>
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {/* Markdown 渲染 */}
    </div>
  </CardContent>
  <CardFooter className="flex gap-1">
    {entry.tags.map((tag) => (
      <Badge key={tag} variant="outline">{tag}</Badge>
    ))}
  </CardFooter>
</Card>
```

### Mobile Entry Card（替代表格）

```tsx
<Card className="hover:bg-muted/50 transition-colors cursor-pointer">
  <CardContent className="p-4">
    <div className="flex items-start justify-between">
      <div className="space-y-1 flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{entry.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {entry.content_preview}
        </p>
      </div>
      <Button variant="ghost" size="icon" className="shrink-0">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
    <div className="flex items-center gap-2 mt-2">
      {entry.category && <Badge variant="secondary" className="text-xs">{entry.category.name}</Badge>}
      <span className="text-xs text-muted-foreground">{entry.updated_at}</span>
    </div>
  </CardContent>
</Card>
```

### 設定區塊 Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>LLM Provider</CardTitle>
    <CardDescription>管理你的 LLM 服務提供者</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Provider 列表或設定內容 */}
  </CardContent>
</Card>
```

## 響應式

| 斷點 | 排列方式 |
|------|---------|
| Mobile | 單欄（`grid-cols-1`） |
| Tablet | 雙欄（`md:grid-cols-2`） |
| Desktop | 四欄（`lg:grid-cols-4`）用於統計；雙欄用於設定 |

## Accessibility

- Card 本身為 `<div>` 無特殊語義
- 可點擊的 Card 需加 `role="button"` 和 `tabIndex={0}`
- Card 內的操作按鈕需有明確的 accessible name
- 使用 `CardTitle` 作為 Card 的語義標題（對應 heading level）
