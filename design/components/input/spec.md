# Input

## 用途
文字輸入欄位，支援前綴圖示、後綴元素、錯誤狀態。

## Variants / States

| State    | Border 色彩                 | 背景                     | 說明                   |
|----------|-----------------------------|--------------------------|----------------------|
| default  | `color.border.default`      | `color.bg.default`       | 標準                  |
| hover    | `color.border.strong`       | `color.bg.default`       |                      |
| focus    | `color.border.focus`        | `color.bg.default`       | ring 2px focus color |
| error    | `color.danger.default`      | `color.danger.subtle`    | 含錯誤訊息            |
| disabled | `color.border.default`      | `color.bg.muted`         | `opacity: 0.6`       |

## 尺寸

| Size | Height | Padding X | Padding Y | Font Size |
|------|--------|-----------|-----------|-----------|
| sm   | 32px   | 10px      | 6px       | `sm`      |
| md   | 40px   | 12px      | 8px       | `base`    |
| lg   | 48px   | 16px      | 10px      | `lg`      |

## Props

| Prop       | Type      | Default | 說明                       |
|------------|-----------|---------|--------------------------|
| label      | string    | -       | 必填，可見 label            |
| placeholder| string    | -       | 輔助提示（不替代 label）    |
| prefix     | ReactNode | -       | 前置圖示或文字              |
| suffix     | ReactNode | -       | 後置圖示或清除按鈕          |
| error      | string    | -       | 錯誤訊息（顯示於欄位下方）  |
| hint       | string    | -       | 輔助說明（顯示於 label 右側或欄位下方）|
| required   | boolean   | false   | 必填標示（label 旁紅點）    |
| disabled   | boolean   | false   | 禁用狀態                   |
| size       | 'sm' \| 'md' \| 'lg' | 'md' | 尺寸           |

## Label 規格
- Label 必須永遠可見（不使用 placeholder-only 模式）
- Font: `text.label`（font-sm, font-weight-medium）
- `required` 時顯示紅點（`color.danger.default`）或「必填」文字
- `htmlFor` 綁定對應 input `id`

## 錯誤訊息
- 顯示於欄位正下方（`margin-top: spacing.1`）
- Color: `color.danger.default`
- Font: `font.size.sm`
- 前置 AlertCircle icon（`w-3.5 h-3.5`）
- `role="alert"` 或關聯 `aria-describedby`

## Focus State
- `ring: 2px solid color.border.focus`
- `ring-offset: 2px`
- 對比度 >= 3:1

## Accessibility
- `<label>` 與 input 透過 `htmlFor` / `id` 關聯
- 錯誤訊息透過 `aria-describedby` 關聯
- `required` 時：`aria-required="true"`
- `disabled` 時：`aria-disabled="true"`

## 使用範例
見 `example.tsx`
