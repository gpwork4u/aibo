# 間距系統（Spacing Tokens）

## 概述

aibo 使用 Tailwind CSS v4 的 4px 基數間距系統，確保介面元素之間的距離一致。所有間距值為 4 的倍數（4px grid）。

## 基礎間距表

| Token | 值 | 用途 |
|-------|-----|------|
| `0` | 0px | 無間距 |
| `0.5` | 2px | 微間距（icon 與文字的細微調整） |
| `1` | 4px | Badge 內距、極小元素間距 |
| `1.5` | 6px | 行內元素間距、小按鈕內距 |
| `2` | 8px | 表單元素間距、表格 cell 內距 |
| `3` | 12px | 按鈕內距（y）、Card 內元素間距 |
| `4` | 16px | 標準內距、表單群組間距 |
| `5` | 20px | Section 內距 |
| `6` | 24px | Card 內距、Dialog 內距 |
| `8` | 32px | 頁面區塊間距 |
| `10` | 40px | 頁面上下留白 |
| `12` | 48px | 大區塊間距 |
| `16` | 64px | 頁面最大留白 |

## 元件間距規範

### 頁面 Layout

| 區域 | 屬性 | Token |
|------|------|-------|
| Main content padding | `p-6` | 24px |
| Main content padding (mobile) | `p-4` | 16px |
| 頁面標題與內容間距 | `mb-6` | 24px |
| 頁面標題與描述間距 | `mt-1` | 4px |

### Card

| 屬性 | Token | 值 |
|------|-------|-----|
| 內距 | `p-6` | 24px |
| Card 之間間距 | `gap-4` | 16px |
| Card header 與 content 間距 | `space-y-1.5` | 6px |

### 表格（DataTable）

| 屬性 | Token | 值 |
|------|-------|-----|
| Cell 內距 | `px-4 py-3` | 16px / 12px |
| Header cell 內距 | `px-4 py-3` | 16px / 12px |
| 表格與其他元素間距 | `mt-4` | 16px |

### 表單

| 屬性 | Token | 值 |
|------|-------|-----|
| 欄位間距（垂直） | `space-y-4` | 16px |
| Label 與 input 間距 | `space-y-2` | 8px |
| Input 內距 | `px-3 py-2` | 12px / 8px |
| 表單群組間距 | `space-y-6` | 24px |
| 按鈕區域與表單間距 | `mt-6` | 24px |

### Dialog

| 屬性 | Token | 值 |
|------|-------|-----|
| 內距 | `p-6` | 24px |
| Header 與 content 間距 | `space-y-2` | 8px |
| Footer 與 content 間距 | `mt-6` | 24px |
| Footer 按鈕間距 | `gap-2` | 8px |

### Sidebar

| 屬性 | Token | 值 |
|------|-------|-----|
| 寬度 | `w-64` | 256px |
| 收合寬度 | `w-16` | 64px |
| 內距 | `p-4` | 16px |
| 項目內距 | `px-3 py-2` | 12px / 8px |
| 項目間距 | `gap-1` | 4px |
| 群組間距 | `gap-4` | 16px |

### 按鈕

| 屬性 | Token | 值 |
|------|-------|-----|
| Default 內距 | `px-4 py-2` | 16px / 8px |
| Small 內距 | `px-3 py-1.5` | 12px / 6px |
| Large 內距 | `px-6 py-3` | 24px / 12px |
| Icon button 大小 | `h-9 w-9` | 36px |
| 按鈕之間間距 | `gap-2` | 8px |

### Badge

| 屬性 | Token | 值 |
|------|-------|-----|
| 內距 | `px-2.5 py-0.5` | 10px / 2px |
| Badge 之間間距 | `gap-1` | 4px |

## 觸控目標

所有可互動元素的最小觸控目標為 44x44pt（WCAG 2.1 AA）：

| 元素 | 最小高度 | 實作方式 |
|------|---------|---------|
| Button (default) | `h-10` (40px) | 加 padding 達到 44px 觸控區 |
| Button (sm) | `h-9` (36px) | 透過 padding/margin 補足 |
| Input | `h-10` (40px) | 原生即滿足 |
| Table row | `h-12` (48px) | 滿足觸控要求 |
| Sidebar item | `h-10` (40px) | 加 padding 達到 44px |
| Checkbox / Radio | `h-4 w-4` (16px) | 透過 label 擴大觸控區域至 44px |
| Icon button | `h-9 w-9` (36px) | 透過 padding 補足 |

## 響應式斷點間距

| 斷點 | 頁面內距 | 容器最大寬度 |
|------|---------|-------------|
| Mobile (< 768px) | `p-4` (16px) | 100% |
| Tablet (768px-1023px) | `p-6` (24px) | 100% |
| Desktop (>= 1024px) | `p-6` (24px) | `max-w-7xl` (1280px) |
