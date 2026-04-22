# 整體 Layout 規格

## 概述

aibo 使用固定左側 Sidebar + Header + Main Content 的經典管理介面佈局。基於 shadcn/ui Sidebar + Next.js App Router layout。

## 結構

```
┌──────────────────────────────────────────────────┐
│                                                    │
│  ┌─────────┬──────────────────────────────────┐  │
│  │         │  Header（頁面標題 + 操作按鈕）    │  │
│  │         ├──────────────────────────────────┤  │
│  │ Sidebar │                                    │  │
│  │         │  Main Content                      │  │
│  │ - Inbox │                                    │  │
│  │ - 條目  │                                    │  │
│  │ - 分類  │                                    │  │
│  │         │                                    │  │
│  │ 設定    │                                    │  │
│  │ - API   │                                    │  │
│  │ - LLM   │                                    │  │
│  │         │                                    │  │
│  │         │                                    │  │
│  │ v1.0.0  │                                    │  │
│  └─────────┴──────────────────────────────────┘  │
│                                                    │
└──────────────────────────────────────────────────┘
```

## Next.js App Router 結構

```
app/
├── layout.tsx              ← Root layout（SidebarProvider + Toaster）
├── page.tsx                ← Redirect to /inbox
├── (dashboard)/
│   ├── layout.tsx          ← Dashboard layout（Sidebar + SidebarInset）
│   ├── inbox/
│   │   └── page.tsx
│   ├── entries/
│   │   ├── page.tsx        ← 列表頁
│   │   └── [id]/
│   │       └── page.tsx    ← 詳情頁
│   ├── categories/
│   │   └── page.tsx
│   └── settings/
│       ├── api-keys/
│       │   └── page.tsx
│       └── llm-providers/
│           └── page.tsx
```

## Root Layout

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
```

## Dashboard Layout

```tsx
// app/(dashboard)/layout.tsx
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-6">
          <SidebarTrigger className="-ml-2" />
          {/* 麵包屑或頁面標題由各頁面提供 */}
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

## 尺寸規格

### Sidebar

| 屬性 | 值 |
|------|-----|
| 展開寬度 | 256px (`w-64`) |
| 收合寬度 | 64px (`w-16`) |
| 高度 | `h-screen`（固定滿版） |
| 位置 | `sticky top-0` |

### Header

| 屬性 | 值 |
|------|-----|
| 高度 | 56px (`h-14`) |
| 內距 | `px-6` |
| 邊框 | `border-b` |
| 背景 | `bg-background` |
| 位置 | `sticky top-0 z-10` |

### Main Content

| 屬性 | 值 |
|------|-----|
| 內距 | `p-6`（desktop）/ `p-4`（mobile） |
| 最大寬度 | 無限制（隨 Sidebar 狀態自適應） |
| 背景 | `bg-background` |
| 溢出 | `overflow-y-auto` |

## 頁面標題區域

每個頁面頂部包含統一的標題區域：

```tsx
// 共用 PageHeader 元件
function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
```

### 各頁面標題

| 頁面 | 標題 | 描述 | 操作按鈕 |
|------|------|------|---------|
| Inbox | Inbox | 未分類的知識條目 | 快速新增 |
| 知識條目 | 知識條目 | 管理你的知識庫 | 建立條目 |
| 條目詳情 | {entry.title} | - | 編輯 / 刪除 |
| 分類管理 | 分類管理 | 組織你的知識條目 | 建立分類 |
| API Key | API Key 管理 | 管理 API 存取金鑰 | 建立 API Key |
| LLM Provider | LLM Provider | 管理 LLM 服務提供者 | 新增 Provider |

## 響應式斷點

| 斷點 | Sidebar | Header | Content |
|------|---------|--------|---------|
| Mobile (< 768px) | 隱藏（overlay） | hamburger + 標題 | `p-4` 滿版 |
| Tablet (768-1023px) | 收合（icon only） | 標題 + 操作 | `p-6` |
| Desktop (>= 1024px) | 展開 | 標題 + 操作 | `p-6` |

## 載入狀態

頁面初始載入時顯示 skeleton：

```tsx
function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-md" />
    </div>
  )
}
```

## 錯誤狀態

API 錯誤頁面：

```tsx
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold">發生錯誤</h3>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        重試
      </Button>
    </div>
  )
}
```

## Accessibility

- `<html lang="zh-Hant">` 設定語言
- `<main>` 標籤包裹主內容
- `<nav>` 標籤包裹 Sidebar
- `<header>` 標籤包裹頂部列
- Skip link：頁面頂部提供「跳到主要內容」連結
- 所有頁面標題使用適當的 heading level（h1 唯一）
