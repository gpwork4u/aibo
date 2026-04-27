# Label

## 用途
表單欄位的可見標籤，必須永遠顯示（不可用 placeholder 替代）。

## 外觀
- Font: `text.label`（`font-sm`，`font-weight-medium`）
- Color: `color.fg.default`
- Disabled 狀態（parent disabled）: `color.fg.muted`，`cursor: not-allowed`

## Required Indicator
- 顯示位置：label 文字後方
- 樣式：`color.danger.default`，`font-size: xs`
- 建議以 `aria-hidden="true"` + `aria-required="true"` on input 雙保險

## Hint Text
- 顯示位置：label 右側（`flex justify-between`）或 input 下方
- Font: `xs`，`color: fg.muted`

## HTML 標籤
- 語義化 `<label>` + `htmlFor` 關聯 input `id`
- 避免使用 `div` 或 `span` 替代
