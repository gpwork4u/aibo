# Popover

## 用途
點擊觸發的浮動面板，用於設定選項、日期選擇器、篩選器等。基於 shadcn/ui Popover（Radix）。

## 外觀
- Background: `color.card.default`
- Border: `color.border.default`（1px）
- Border-radius: `radius.lg`（12px）
- Shadow: `shadow.lg`
- Padding: `spacing.4`（16px）
- Min-width: `192px`
- Max-width: `320px`

## 方向
預設 `side="bottom"`，`align="start"`，Radix 自動調整避免溢出 viewport。
- `sideOffset`: `8px`

## 動畫
- Open: `fade-in scale(0.95) → scale(1) opacity(1)`，150ms
- Close: `scale(1) → scale(0.95) opacity(0)`，100ms

## Accessibility
- `role="dialog"` on PopoverContent
- 開啟時 focus 移入 Popover 第一個互動元素
- `Escape` 關閉並 restore focus
- `aria-haspopup="true"` on trigger
