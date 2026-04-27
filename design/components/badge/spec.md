# Badge

## 用途
顯示狀態、計數、標籤等 inline 資訊片段。

## Variants

| Variant   | 背景                          | 文字                         | 邊框                         |
|-----------|-------------------------------|------------------------------|------------------------------|
| default   | `color.primary.default`       | `color.primary.fg`           | 無                           |
| secondary | `color.secondary.default`     | `color.secondary.fg`         | 無                           |
| outline   | 透明                          | `color.fg.default`           | `color.border.default`       |
| danger    | `color.danger.subtle`         | `color.danger.default`       | `color.danger.default`（1px）|
| success   | `color.success.subtle`        | `color.success.default`      | `color.success.default`（1px）|
| warning   | `color.warning.subtle`        | `color.warning.default`      | `color.warning.default`（1px）|

## 尺寸

| Size | Height | Padding X | Font Size | 用途              |
|------|--------|-----------|-----------|-----------------|
| sm   | 18px   | 6px       | `xs`      | sidebar 未讀計數 |
| md   | 22px   | 8px       | `xs`      | 標準用途（預設） |
| lg   | 26px   | 10px      | `sm`      | 強調用途         |

- Border-radius: `radius.full`（pill 形）
- Font-weight: `medium`

## Props

| Prop    | Type                                                          | Default     | 說明    |
|---------|---------------------------------------------------------------|-------------|--------|
| variant | 'default' \| 'secondary' \| 'outline' \| 'danger' \| 'success' \| 'warning' | 'secondary' | 樣式 |
| size    | 'sm' \| 'md' \| 'lg'                                         | 'md'        | 大小   |
| dot     | boolean                                                       | false       | 前置圓點 |

## Accessibility
- 純展示用途（無互動）：`aria-hidden="true"` 或用 `aria-label` 補充語意
- 狀態類 badge（danger/success）建議搭配文字說明，不只靠顏色傳達
