# 字型系統（Typography Tokens）

## 概述

aibo 使用系統字型堆疊搭配 Tailwind CSS v4 的預設字級系統，確保跨平台一致的閱讀體驗。程式碼區塊使用等寬字型。

## 字型堆疊

```css
@layer base {
  :root {
    --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
      "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono",
      Menlo, Consolas, "Liberation Mono", monospace;
  }
}
```

| 類別 | 字型 | 用途 |
|------|------|------|
| Sans-serif | Inter | 所有 UI 文字 |
| Monospace | JetBrains Mono | 程式碼、API Key 顯示、Markdown 程式碼區塊 |

## 字級系統

使用 Tailwind CSS 預設字級，定義 aibo 中各場景的使用規範：

| Token | 大小 | 行高 | 用途 |
|-------|------|------|------|
| `text-xs` | 12px (0.75rem) | 16px (1rem) | Badge 文字、輔助標籤、時間戳 |
| `text-sm` | 14px (0.875rem) | 20px (1.25rem) | 表格內容、表單標籤、次要文字、Sidebar 項目 |
| `text-base` | 16px (1rem) | 24px (1.5rem) | 正文、表單輸入、按鈕文字 |
| `text-lg` | 18px (1.125rem) | 28px (1.75rem) | Card 標題、Section 標題 |
| `text-xl` | 20px (1.25rem) | 28px (1.75rem) | 頁面副標題 |
| `text-2xl` | 24px (1.5rem) | 32px (2rem) | 頁面主標題 |
| `text-3xl` | 30px (1.875rem) | 36px (2.25rem) | Dashboard 數據大字 |

## 字重系統

| Token | 字重 | 用途 |
|-------|------|------|
| `font-normal` | 400 | 正文、表格內容、描述文字 |
| `font-medium` | 500 | 表單標籤、Sidebar 項目、按鈕文字 |
| `font-semibold` | 600 | Card 標題、表格標頭、Badge |
| `font-bold` | 700 | 頁面標題、數據大字 |

## 頁面標題層級

| 層級 | 樣式 | 使用場景 |
|------|------|---------|
| H1 | `text-2xl font-bold tracking-tight` | 頁面主標題（如「知識條目」「API Key 管理」） |
| H2 | `text-xl font-semibold` | Section 標題（如「建立新條目」） |
| H3 | `text-lg font-semibold` | Card 標題、Dialog 標題 |
| H4 | `text-base font-medium` | 子區塊標題 |
| Body | `text-sm text-foreground` | 正文內容 |
| Caption | `text-xs text-muted-foreground` | 輔助說明、時間戳 |

## 文字截斷

| 場景 | 策略 | 樣式 |
|------|------|------|
| 表格中的標題 | 單行省略 | `truncate` |
| 條目預覽 | 多行省略（2 行） | `line-clamp-2` |
| Sidebar 項目名 | 單行省略 | `truncate` |
| Badge 文字 | 不截斷 | `whitespace-nowrap` |

## Markdown 內容排版

條目內容使用 Markdown 渲染，需套用 prose 排版：

```tsx
<div className="prose prose-sm dark:prose-invert max-w-none">
  {/* Markdown 渲染內容 */}
</div>
```

| 元素 | 樣式 |
|------|------|
| 標題 | 使用 prose 預設，自動處理 h1-h6 |
| 段落 | `text-sm leading-relaxed` |
| 程式碼區塊 | `font-mono text-sm bg-muted rounded-md p-4` |
| 行內程式碼 | `font-mono text-sm bg-muted px-1.5 py-0.5 rounded` |
| 連結 | `text-primary underline` |
| 列表 | prose 預設 |

## 使用範例

```tsx
// 頁面標題
<h1 className="text-2xl font-bold tracking-tight">知識條目</h1>
<p className="text-muted-foreground">管理你的知識庫條目</p>

// 表格標頭
<th className="text-sm font-semibold text-muted-foreground">名稱</th>

// 時間戳
<span className="text-xs text-muted-foreground">2026-04-22 15:30</span>

// API Key 顯示
<code className="font-mono text-sm">aibo_a1b2c3d4e5</code>
```
