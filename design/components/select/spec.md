# Select

## 用途
單選下拉選擇器。基於 shadcn/ui Select（Radix）。

## 外觀（Trigger）
- Height: `40px`（md），`32px`（sm），`48px`（lg）
- Padding: `px-3 py-2`
- Border: `color.border.default`，`radius.md`
- Background: `color.bg.default`
- Trailing icon: ChevronDown，`w-4 h-4`，`fg.muted`
- Placeholder color: `fg.subtle`
- Focus: `ring 2px color.border.focus`

## Dropdown Content
- Border: `color.border.default`
- Shadow: `shadow.lg`
- Radius: `radius.lg`
- Padding: `spacing.1`（container）

## SelectItem
- Height: `36px`
- Selected: CheckIcon 左側 + `fg.default`
- Hover: `bg.subtle`
- Disabled: `fg.subtle opacity-50`

## States
- Closed: 標準 trigger
- Open: ring + ChevronDown rotate 180deg
- Error: border `danger.default`，`bg danger.subtle`
- Disabled: `bg.muted`，`opacity-60`，`cursor-not-allowed`

## Accessibility
- `role="combobox"` on trigger，`aria-expanded`，`aria-haspopup="listbox"`
- `role="listbox"` on content
- `role="option"` on items，`aria-selected`
- Keyboard: `↑↓` 導航，`Enter`/`Space` 選擇，`Escape` 關閉
