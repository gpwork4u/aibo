# Button

## 用途
觸發操作的基礎互動元件。覆蓋所有主要操作類型：確認、取消、危險操作、連結式跳轉。

## Variants

| Variant   | 用途             | 背景                    | 文字              | 邊框                    |
|-----------|-----------------|------------------------|------------------|------------------------|
| default   | 主要操作（CTA）   | `color.primary.default` | `color.primary.fg` | 無                   |
| secondary | 次要操作         | `color.secondary.default` | `color.secondary.fg` | `color.border.default` |
| ghost     | 低優先級 / icon 按鈕 | 透明               | `color.fg.default` | 無                   |
| danger    | 破壞性操作       | `color.danger.default`  | `color.danger.fg`  | 無                   |
| link      | 文字連結樣式     | 透明                    | `color.accent.default` | 無（底線 hover） |

## Sizes

| Size | Height | Padding X | Padding Y | Font Size | Min Width |
|------|--------|-----------|-----------|-----------|-----------|
| sm   | 32px   | 12px      | 6px       | `font.size.sm`  | 64px |
| md   | 40px   | 16px      | 8px       | `font.size.base`| 80px |
| lg   | 48px   | 24px      | 12px      | `font.size.lg`  | 96px |

注意：所有尺寸觸控目標最小 44x44pt（sm 按鈕在 mobile 需外加 padding 補足）。

## Props

| Prop      | Type                                              | Default     | 說明                   |
|-----------|---------------------------------------------------|-------------|----------------------|
| variant   | 'default' \| 'secondary' \| 'ghost' \| 'danger' \| 'link' | 'default' | 按鈕樣式 |
| size      | 'sm' \| 'md' \| 'lg'                             | 'md'        | 按鈕大小               |
| disabled  | boolean                                           | false       | 禁用狀態               |
| loading   | boolean                                           | false       | 載入中狀態             |
| icon      | ReactNode                                         | -           | 前置圖示（Lucide 元件）|
| iconRight | ReactNode                                         | -           | 後置圖示               |
| iconOnly  | boolean                                           | false       | 僅圖示模式（正方形）   |
| fullWidth | boolean                                           | false       | 撐滿父容器寬度         |
| asChild   | boolean                                           | false       | 渲染為子元素（Slot 模式）|

## States

| State    | 外觀變化                                                  |
|----------|----------------------------------------------------------|
| default  | 標準外觀                                                  |
| hover    | default: `primary.hover`；secondary: `secondary.hover`  |
| active   | scale(0.97) + 亮度 -5%，transition 150ms                 |
| focus    | `ring 2px color.border.focus`，`outline-offset: 2px`    |
| disabled | `opacity: 0.5`，`cursor: not-allowed`，pointer-events: none |
| loading  | 前置 Spinner（16px），文字不隱藏，`aria-busy: true`       |

## 動畫
- hover transition: `background-color 150ms ease`
- active: `transform scale(0.97) 150ms ease`
- 尊重 `prefers-reduced-motion`：移除 transform，保留顏色過渡

## Accessibility
- Role: `button`
- 鍵盤：Enter + Space 觸發
- `disabled` 時：`aria-disabled="true"`（不用 HTML disabled，保留 focus）
- `loading` 時：`aria-busy="true"` + `aria-label` 加上「載入中」後綴
- `iconOnly` 時：必須有 `aria-label` 描述操作
- Focus ring 對比度 >= 3:1

## 使用範例
見 `example.tsx`
