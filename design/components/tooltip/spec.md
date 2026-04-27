# Tooltip

## 用途
hovering 或 focusing 互動元素時顯示的輔助說明文字。基於 shadcn/ui Tooltip（Radix）。

## 外觀
- Background: `color.fg.default`（深色，與頁面背景高對比）
- Text color: `color.bg.default`（淺色文字）
- Font: `xs`，`font-weight: medium`
- Padding: `px-3 py-1.5`
- Border-radius: `radius.sm`（4px）
- Shadow: `shadow.md`
- Max-width: `256px`，`text-wrap: balance`

## 延遲（Delay）
- Open delay: `300ms`（避免 accidental trigger）
- Close delay: `0ms`（立即消失）
- Sidebar 收合模式 Tooltip: `300ms`

## 方向
預設 `side="top"`，根據空間自動調整（Radix auto-placement）。
- `sideOffset`: `6px`（與觸發元素的間距）

## 箭頭
- 不顯示箭頭（editorial 風格，簡潔）

## 動畫
- `opacity(0) scale(0.95) → opacity(1) scale(1)`，`100ms`
- 尊重 `prefers-reduced-motion`（移除 scale，保留 opacity）

## Accessibility
- `role="tooltip"` on tooltip content
- 觸發元素有 `aria-describedby` 指向 tooltip id
- keyboard focus 也會觸發（不只 hover）
- 不在 tooltip 內放互動元素
