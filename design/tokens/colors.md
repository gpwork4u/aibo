# 色彩系統（Color Tokens）

## 概述

aibo 使用基於 HSL 的語義色彩系統，搭配 Tailwind CSS v4 的 CSS 自訂屬性。支援 Light / Dark 雙主題，所有色彩對比度符合 WCAG 2.1 AA 標準（>= 4.5:1）。

## 基礎色彩變數

以下定義於 `globals.css`，使用 Tailwind CSS v4 的 `@theme` 語法：

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;

    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;

    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;

    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;

    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;

    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;

    --warning: 38 92% 50%;
    --warning-foreground: 38 92% 14%;

    --success: 142 76% 36%;
    --success-foreground: 0 0% 98%;

    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;

    --radius: 0.5rem;

    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 240 5.9% 10%;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;

    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;

    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;

    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;

    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;

    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;

    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;

    --warning: 38 92% 50%;
    --warning-foreground: 38 92% 14%;

    --success: 142 76% 36%;
    --success-foreground: 0 0% 98%;

    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;

    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 0 0% 98%;
    --sidebar-primary-foreground: 240 5.9% 10%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 240 4.9% 83.9%;
  }
}
```

## 語義色彩對照表

| Token | 用途 | Light 色值 | Dark 色值 |
|-------|------|-----------|----------|
| `primary` | 主要按鈕、重要操作、連結 | 深灰藍 `hsl(240 5.9% 10%)` | 白色 `hsl(0 0% 98%)` |
| `secondary` | 次要按鈕、輔助操作 | 淺灰 `hsl(240 4.8% 95.9%)` | 深灰 `hsl(240 3.7% 15.9%)` |
| `accent` | 高亮元素、hover 狀態 | 同 secondary | 同 secondary |
| `destructive` | 刪除、危險操作 | 紅色 `hsl(0 84.2% 60.2%)` | 深紅 `hsl(0 62.8% 30.6%)` |
| `warning` | 警告訊息、過期提醒 | 琥珀色 `hsl(38 92% 50%)` | 同 light |
| `success` | 成功訊息、健康狀態 | 綠色 `hsl(142 76% 36%)` | 同 light |
| `muted` | 次要文字、禁用狀態 | 淺灰 `hsl(240 4.8% 95.9%)` | 深灰 `hsl(240 3.7% 15.9%)` |

## 業務語義色彩

以下為 aibo 專案特定的語義色彩，使用基礎 token 組合：

| 場景 | 色彩 Token | 說明 |
|------|-----------|------|
| API Key 已啟用 | `success` | 綠色圓點指示器 |
| API Key 已停用 | `muted` | 灰色圓點指示器 |
| API Key 已過期 | `warning` | 琥珀色圓點指示器 |
| LLM Provider 健康 | `success` | 綠色 badge |
| LLM Provider 不健康 | `destructive` | 紅色 badge |
| LLM Provider 未測試 | `muted` | 灰色 badge |
| Inbox 數量指示 | `primary` | Sidebar badge |
| 刪除確認 | `destructive` | 刪除按鈕、AlertDialog |
| 預設 Provider | `primary` | Default badge |

## 對比度驗證

所有前景/背景組合必須通過以下檢查：

| 組合 | 最低對比度 | 標準 |
|------|----------|------|
| foreground / background | 4.5:1 | AA 正文 |
| primary-foreground / primary | 4.5:1 | AA 正文 |
| destructive-foreground / destructive | 4.5:1 | AA 正文 |
| muted-foreground / background | 4.5:1 | AA 正文 |
| 大字（>= 18pt）前景 / 背景 | 3:1 | AA 大字 |

## Tailwind 使用範例

```tsx
// 主要按鈕
<Button className="bg-primary text-primary-foreground">建立</Button>

// 刪除按鈕
<Button variant="destructive">刪除</Button>

// 成功 Badge
<Badge className="bg-success text-success-foreground">Healthy</Badge>

// 警告文字
<p className="text-warning">此 API Key 即將過期</p>

// Muted 次要文字
<p className="text-muted-foreground">上次使用：3 天前</p>
```
