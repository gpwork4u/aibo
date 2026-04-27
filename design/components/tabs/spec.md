# Tabs

## 用途
在同一空間中切換不同內容視圖。基於 shadcn/ui Tabs（Radix）。

## Variants

本專案採用 **underline** variant（editorial 風格，避免 pill 造成視覺過重）。

| Variant   | Active 樣式                                            |
|-----------|-------------------------------------------------------|
| underline | 底部 2px 線，`color.accent.default`，無背景             |
| pill      | `color.secondary.default` 背景，`radius.md`（備用）    |

## 規格（Underline Variant）

- TabsList：`border-bottom: color.border.default`，`flex gap-0`
- TabsTrigger：
  - Height: `40px`
  - Padding: `px-4`
  - Font: `font-sm font-medium`
  - Default color: `fg.muted`
  - Active color: `fg.default`
  - Active indicator: `border-bottom: 2px solid color.accent.default`（`position: absolute bottom-0`）
  - Hover: `fg.default`
  - Focus: ring `color.border.focus`
  - Disabled: `fg.subtle`，`opacity: 0.5`

## TabsContent
- `padding-top: spacing.4`
- `outline: none`（focus style 由父元素管理）

## Accessibility
- `role="tablist"` on TabsList
- `role="tab"` on TabsTrigger，`aria-selected`，`aria-controls`
- `role="tabpanel"` on TabsContent，`aria-labelledby`
- Keyboard: `←→` 切換 tab，`Home`/`End` 跳到首尾 tab，`Tab` 進入 panel
