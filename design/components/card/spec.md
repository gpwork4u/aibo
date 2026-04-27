# Card Chrome

## 用途
Dashboard hub 的基礎容器元件。提供統一的圓角、邊框、陰影「外殼」（chrome），內容由 slot 填入。

## 子元件

| 子元件         | 說明                                    |
|--------------|----------------------------------------|
| Card         | 根容器，提供外殼樣式                      |
| CardHeader   | 標題區（padding top + x，flex row）      |
| CardTitle    | 主標題（serif / heading-sm）             |
| CardDescription | 副標題 / 說明文字（body-sm, fg.muted） |
| CardContent  | 主體內容區（padding x + y）              |
| CardFooter   | 底部區域（通常放「查看更多」連結）         |

## Variants

| Variant   | 背景                     | 邊框                     | 陰影             |
|-----------|--------------------------|--------------------------|-----------------|
| default   | `color.card.default`     | `color.card.border`      | `shadow.sm`     |
| ghost     | 透明                     | `color.border.default`   | 無              |
| elevated  | `color.card.default`     | `color.card.border`      | `shadow.md`     |

## 尺寸規格

- `border-radius`: `radius.lg`（12px）
- `padding`（CardContent + CardHeader）: `spacing.6`（24px）
- `CardHeader`: padding-bottom `spacing.0`（與 CardContent 合併 gap）
- `CardFooter`: padding-top `spacing.4`，border-top `color.border.default`
- `gap`（CardHeader 內 icon + title）: `spacing.2`

## States

| State    | 外觀                                         |
|----------|---------------------------------------------|
| default  | 標準                                         |
| hover（interactive card）| `shadow.md`，border `color.border.strong` |
| loading  | 以 Skeleton 取代內容（見 skeleton spec）      |
| error    | border `color.danger.default`，顯示錯誤提示  |
| empty    | 居中灰色提示文字 + 選用 CTA 按鈕             |

## Dashboard Hub Card 特定規格

Dashboard hub 使用 4 個 parallel slot 卡片，每張需包含：
- 圖示（`w-4 h-4`，Lucide），色彩 `fg.muted`
- 卡片標題（heading-sm）
- 內容 slot（flexible height）
- CardFooter 含「查看更多 →」連結（Button variant=link, size=sm）

Grid 布局：
```
Desktop (>=1024px): 2x2 grid, gap-6
Tablet (768-1023px): 2x2 grid, gap-4
Mobile (<768px): 1-column stack, gap-4
```

## Accessibility
- 互動式 Card 須有 `role="article"` 或適當 landmark
- 卡片標題必須是語義化 `<h2>` / `<h3>`（視頁面層級）
- 錯誤狀態：`role="alert"` + `aria-live="polite"`
- Loading skeleton：`aria-busy="true"` on CardContent

## 使用範例
見 `example.tsx`
