# Toast 元件規格

## 概述

Toast 通知使用 Sonner（shadcn/ui 推薦的 toast 方案），提供輕量級的操作結果回饋。自動消失，不阻擋使用者操作。

## 基礎元件

- **來源**：`shadcn/ui` Sonner integration
- **底層**：sonner library
- **圖示**：Lucide Icons（由 Sonner 內建處理）

## 全域設定

在 Layout 中放置 Toaster：

```tsx
// app/layout.tsx
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
```

## Toast 類型

| 類型 | 圖示 | 色彩 | 用途 |
|------|------|------|------|
| `success` | `CheckCircle2` | 綠色（success） | 建立、更新、刪除成功 |
| `error` | `XCircle` | 紅色（destructive） | API 錯誤、驗證失敗 |
| `warning` | `AlertTriangle` | 琥珀色（warning） | 不可復原操作的警告 |
| `info` | `Info` | 藍色 | 一般提示 |

## 使用方式

```tsx
import { toast } from "sonner"

// 成功
toast.success("條目已建立")

// 錯誤
toast.error("建立失敗", {
  description: "標題和內容至少需要填寫一項",
})

// 帶有操作按鈕
toast.success("API Key 已建立", {
  description: "請立即複製，關閉後無法再次查看",
  action: {
    label: "複製",
    onClick: () => copyToClipboard(key),
  },
})

// 已複製確認
toast.success("已複製到剪貼簿")

// 刪除成功
toast.success("分類已刪除", {
  description: "該分類下的條目已移至 Inbox",
})

// 健康檢查結果
toast.success("LLM Provider 連線正常", {
  description: "回應時間：150ms",
})
toast.error("LLM Provider 連線失敗", {
  description: "連線逾時",
})
```

## 樣式規格

| 屬性 | 值 |
|------|-----|
| 位置 | 右下角（`bottom-right`） |
| 最大寬度 | `356px` |
| 內距 | `p-4` |
| 圓角 | `rounded-lg` |
| 陰影 | `shadow-xl` |
| 背景 | `bg-background border` |
| 自動關閉 | 5 秒（success）/ 8 秒（error） |
| 堆疊 | 最多顯示 3 個，新的在最上方 |
| 動畫 | slide-in from right + fade |

## aibo 專案 Toast 場景

| 操作 | 類型 | 標題 | 描述 |
|------|------|------|------|
| 建立 Entry | success | 條目已建立 | - |
| 更新 Entry | success | 條目已更新 | - |
| 刪除 Entry | success | 條目已刪除 | - |
| 建立 Category | success | 分類已建立 | - |
| 更新 Category | success | 分類已更新 | - |
| 刪除 Category | success | 分類已刪除 | 該分類下的條目已移至 Inbox |
| 建立 API Key | success | API Key 已建立 | 請立即複製 |
| 刪除 API Key | success | API Key 已撤銷 | - |
| 刪除最後一把 Key | error | 無法刪除 | 不能刪除最後一把有效的 API Key |
| 建立 LLM Provider | success | Provider 已建立 | - |
| 更新 LLM Provider | success | Provider 已更新 | - |
| 刪除 LLM Provider | success | Provider 已刪除 | - |
| 健康檢查成功 | success | 連線正常 | 回應時間：{N}ms |
| 健康檢查失敗 | error | 連線失敗 | {error message} |
| 複製到剪貼簿 | success | 已複製到剪貼簿 | - |
| API 錯誤 | error | 操作失敗 | {error message} |
| 網路錯誤 | error | 網路錯誤 | 請檢查網路連線 |
| 驗證失敗 | error | 輸入錯誤 | {validation message} |
| 名稱重複 | error | 名稱已存在 | 請使用不同的名稱 |

## Accessibility

- Toast 使用 `role="status"` 和 `aria-live="polite"`
- Error toast 使用 `aria-live="assertive"`
- Toast 可透過鍵盤 dismiss
- 不依賴 toast 作為唯一的錯誤回饋（表單錯誤同時顯示在欄位旁）
- 自動消失時間足夠閱讀（success 5s，error 8s）
