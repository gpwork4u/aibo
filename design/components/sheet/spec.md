# Sheet

## 用途
從頁面邊緣滑入的抽屜面板，用於 Mobile Sidebar、CopilotSlot mobile 模式、詳情面板。基於 shadcn/ui Sheet（Radix Dialog）。

## Sides

| Side     | 觸發場景                        | 預設寬度     |
|----------|---------------------------------|-------------|
| left     | Mobile sidebar drawer           | `280px`     |
| right    | Copilot panel（mobile），詳情   | `400px`（< 768px: 全寬）|
| bottom   | 行動裝置 Copilot，操作選單      | `auto`（max-h: 80vh）|

## 外觀
- Background: `color.bg.default`
- Border（left/right）: `color.border.default`（1px，對側邊）
- Overlay: `color.overlay`（點擊關閉）
- 無圓角（left/right），`radius.xl radius.xl 0 0`（bottom）

## 動畫
- left: `translateX(-100%) → translateX(0)`，200ms cubic-bezier(0.4,0,0.2,1)
- right: `translateX(100%) → translateX(0)`，200ms
- bottom: `translateY(100%) → translateY(0)`，200ms
- 尊重 `prefers-reduced-motion`

## SheetHeader
- 高度：56px
- 包含 SheetTitle + 關閉按鈕（X icon，absolute right-4 top-4）

## Accessibility
- 繼承 Dialog accessibility（role, aria-modal, focus trap, Escape 關閉）
- `aria-label` on SheetContent 描述面板用途
