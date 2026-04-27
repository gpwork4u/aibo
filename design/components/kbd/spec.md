# Kbd（鍵盤按鍵樣式）

## 用途
以視覺方式呈現鍵盤快捷鍵或按鍵提示，常用於 Command Palette、Tooltip、Help 頁面。

## 外觀
- 背景：`color.bg.muted`
- Border：`color.border.default`（1px）
- Bottom shadow：`0 1px 0 0 color.border.default`（立體感）
- Border-radius：`radius.sm`（4px）
- Font-family：`font.family.mono`
- Font-size：`font.size.xs`（12px）
- Color：`color.fg.muted`
- Padding：`px-1.5 py-0.5`

## Sizes

| Size | Height | Padding X | Font Size |
|------|--------|-----------|-----------|
| xs   | 20px   | 4px       | `10px`    |
| sm   | 24px   | 6px       | `xs`      |

## 常用 Kbd 組合
- `⌘K`：Command Palette
- `⌘N`：新增筆記
- `⌘,`：設定
- `⌘\`：Copilot toggle
- `Esc`：關閉
- `↑` `↓`：上下導航
- `↵`（Enter）：確認選擇
- `Tab`：切換焦點

## HTML 標籤
使用語義化 `<kbd>` 標籤。

## Accessibility
- `<kbd>` 元素本身具語義，螢幕閱讀器會讀出內容
- 複合快捷鍵（如 ⌘K）建議 `aria-label="Command K"` 補充
