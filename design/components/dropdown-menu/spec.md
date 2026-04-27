# Dropdown Menu

## 用途
點擊觸發的下拉選單，用於 UserMenu、操作清單、更多選項（⋯）。基於 shadcn/ui DropdownMenu（Radix）。

## 外觀
- Background: `color.card.default`
- Border: `color.border.default`
- Border-radius: `radius.lg`（12px）
- Shadow: `shadow.lg`
- Padding（Container）: `spacing.1`（4px，上下）
- Min-width: `160px`
- Max-width: `240px`

## Item 規格

| State    | Background                    | Text Color         |
|----------|-------------------------------|--------------------|
| default  | 透明                           | `fg.default`       |
| hover    | `color.bg.subtle`             | `fg.default`       |
| focus    | `color.bg.subtle`             | `fg.default`       |
| danger   | 透明（hover: `danger.subtle`） | `danger.default`  |
| disabled | 透明                           | `fg.subtle`，`opacity: 0.5`|
| checked  | 透明                           | `fg.default` + check icon |

- Item height: `36px`（觸控目標 >= 44px 需 margin）
- Item padding: `px-3 py-1.5`
- Icon（左側）: `w-4 h-4`，`color: fg.muted`，`gap: spacing.2`
- Kbd hint（右側）: `Kbd` 元件，`xs` size

## 分隔線
- `color.border.default`，`height: 1px`，`margin: spacing.1 0`

## Sub Menu（選用）
- ChevronRight icon 在 item 右側
- 展開方向：右側，`sideOffset: 4px`

## 動畫
- Open: `fade-in scale(0.96)`，150ms
- Close: `fade-out scale(0.96)`，100ms

## Accessibility
- `role="menu"` on content
- `role="menuitem"` on items
- `role="menuitemcheckbox"` on checkbox items
- Keyboard: `↑↓` 導航，`Enter`/`Space` 選擇，`Escape` 關閉
- 開啟時 focus 第一個非 disabled item
