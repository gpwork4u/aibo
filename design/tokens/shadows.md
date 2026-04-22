# 陰影系統（Shadow Tokens）

## 概述

aibo 使用分層陰影系統表達元素的視覺層級。陰影配合 Tailwind CSS v4 的預設 shadow 工具類別使用，並針對 Dark mode 做適配。

## 陰影層級

| Token | 值 | 用途 |
|-------|-----|------|
| `shadow-none` | none | 預設狀態、flat 元素 |
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Input 元素、subtle 浮起 |
| `shadow` | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` | Card 預設、hover 浮起 |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | Dropdown menu、Popover |
| `shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | Dialog、Modal |
| `shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` | Toast 通知 |

## 元件陰影對照

| 元件 | 預設陰影 | Hover 陰影 | 說明 |
|------|---------|-----------|------|
| Card | `shadow-sm` | `shadow` | hover 時微幅提升 |
| Input | `shadow-sm` | - | focus 使用 ring 而非陰影 |
| Button | `shadow-sm` | `shadow` | ghost/outline variant 無陰影 |
| Dropdown Menu | `shadow-md` | - | 浮層元素 |
| Dialog / Modal | `shadow-lg` | - | 最高層級浮層 |
| Toast | `shadow-xl` | - | 通知浮於所有內容之上 |
| Sidebar | `shadow-none` | - | 固定面板，使用 border 分隔 |
| Table | `shadow-none` | - | 嵌入頁面，使用 border 分隔 |
| Popover | `shadow-md` | - | 與 Dropdown 同層級 |

## Dark Mode 適配

Dark mode 下陰影效果較不明顯，主要靠 border 和背景色差異來區分層級：

```css
.dark {
  /* Card 在 dark mode 使用 border 替代陰影 */
  /* shadow-sm → border border-border */

  /* Dialog 保留輕量陰影 + border */
  /* shadow-lg + border border-border */
}
```

| 元件 | Light Mode | Dark Mode |
|------|-----------|-----------|
| Card | `shadow-sm` | `shadow-none border` |
| Dropdown | `shadow-md` | `shadow-md border` |
| Dialog | `shadow-lg` | `shadow-lg border` |
| Toast | `shadow-xl` | `shadow-lg border` |

## Focus Ring

Focus 狀態使用 ring 而非陰影，確保 Accessibility：

```css
/* 預設 focus ring */
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2

/* Ring 色彩 */
--ring: 240 5.9% 10%;        /* Light */
--ring: 240 4.9% 83.9%;      /* Dark */
```

| 元素 | Focus 樣式 |
|------|-----------|
| Button | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| Input | `focus-visible:ring-2 focus-visible:ring-ring` |
| Sidebar item | `focus-visible:ring-2 focus-visible:ring-sidebar-ring` |
| Dialog trigger | `focus-visible:ring-2 focus-visible:ring-ring` |

## 動畫與過渡

陰影變化需搭配過渡效果：

```css
/* Card hover 過渡 */
transition-shadow duration-200

/* 範例 */
<Card className="shadow-sm hover:shadow transition-shadow duration-200">
```

| 屬性 | 時長 | 緩動函數 | 用途 |
|------|------|---------|------|
| Shadow transition | 200ms | `ease-in-out` | Card hover |
| Opacity transition | 150ms | `ease-in-out` | Toast 出現/消失 |
| Transform transition | 200ms | `ease-out` | Dialog 開啟/關閉 |
| Color transition | 150ms | `ease-in-out` | Button hover 色彩變化 |
