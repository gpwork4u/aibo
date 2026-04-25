# GcalReauthBanner

當後端任一 API 回 `401 GCAL_REAUTH_REQUIRED` 時，於 app shell 頂部出現的全域 banner。

提示使用者：refresh token 失效，必須重新授權才能繼續同步。

---

## 結構

```
┌──────────────────────────────────────────────────────────────────┐
│ ⚠  Google Calendar 連線已失效，請重新授權以繼續同步事件。         │
│                                       [重新連線]    [✕]          │
└──────────────────────────────────────────────────────────────────┘
   destructive 底色 + border（`bg-destructive/10 border-destructive/40`）
```

放置位置：sidebar layout 的 `<main>` 上方，所有頁面共用。

---

## Props

```ts
interface GcalReauthBannerProps {
  visible: boolean;            // 由 global state 控制（如 zustand）
  onReconnect: () => void;
  onDismiss?: () => void;      // 暫時關閉（session 內），下次 401 再開
}
```

---

## Tailwind / 範例

```tsx
import { cn } from "@/lib/utils";
import { AlertTriangleIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GCAL_SETTINGS_TESTIDS } from "@/lib/testids/gcal-settings";

if (!visible) return null;

<div
  role="alert"
  aria-live="assertive"
  data-testid={GCAL_SETTINGS_TESTIDS.reauthBanner}
  className={cn(
    "sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b px-4 py-2.5 text-sm",
    "border-destructive/40 bg-destructive/10 text-destructive-foreground",
  )}
>
  <AlertTriangleIcon className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
  <p className="min-w-0 flex-1">
    <strong className="font-medium">Google Calendar 連線已失效</strong>
    <span className="ml-1 text-muted-foreground">
      ，請重新授權以繼續同步事件。
    </span>
  </p>
  <div className="flex shrink-0 items-center gap-1">
    <Button
      size="sm"
      onClick={onReconnect}
      data-testid={GCAL_SETTINGS_TESTIDS.reauthBannerCta}
      className="h-8 gap-1"
    >
      <ExternalLinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
      重新連線
    </Button>
    {onDismiss && (
      <Button
        variant="ghost"
        size="icon"
        onClick={onDismiss}
        aria-label="暫時關閉提示"
        data-testid={GCAL_SETTINGS_TESTIDS.reauthBannerDismiss}
        className="h-8 w-8 hover:bg-destructive/10"
      >
        <XIcon className="h-4 w-4" aria-hidden="true" />
      </Button>
    )}
  </div>
</div>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 任一 API 回 401 GCAL_REAUTH_REQUIRED | global axios interceptor 設 `visible=true` |
| 點「重新連線」 | onReconnect()：跳轉 OAuth 重新授權（同 GcalStatusCard） |
| 重新授權成功 | 清掉 `visible=false`（status API 再次回 connected=true 後） |
| 點 ✕ | onDismiss()：當前 session 內隱藏（reload 後若仍 401 會重出現） |

### 出現規則

1. 第一次偵測到 401 時自動顯示
2. 在 `/settings` 頁面顯示時不需重複（GcalStatusCard 已有 reauth 提示），可由該頁主動 dismiss
3. Sticky top，z-index 高於主導航但低於 modal

### data-testid

| 元素 | testid |
|------|--------|
| Banner | `GCAL_SETTINGS_TESTIDS.reauthBanner` |
| 重新連線 | `GCAL_SETTINGS_TESTIDS.reauthBannerCta` |
| 關閉 | `GCAL_SETTINGS_TESTIDS.reauthBannerDismiss` |

---

## States

| 狀態 | 視覺 |
|------|------|
| Visible | 顯示在頁面頂部，destructive 底色 |
| Hidden | 不渲染（`return null`） |
| Reconnect 進行中 | parent 控制按鈕 disabled + spinner |

---

## a11y

- `role="alert"` + `aria-live="assertive"`：讀屏器立即播報
- 圖示 + 顏色 + 文字三重提示（不單靠顏色傳達）
- 按鈕高度 32px（緊湊），字級清楚；提供「重新連線」純文字
- 關閉按鈕 `aria-label="暫時關閉提示"`
- 對比：`text-destructive-foreground` vs `bg-destructive/10`（透明疊在 `bg-background`）≥ 4.5:1
- 不阻擋頁面操作（非 modal）；使用者可繼續查看其他資料

---

## 響應式

| 斷點 | 變化 |
|------|------|
| `< 640px` | 訊息與按鈕 stack 排列；按鈕全寬 |
| `≥ 640px` | 一行排列 |

---

## 範例文案

- 主訊息：「Google Calendar 連線已失效，請重新授權以繼續同步事件。」
- 動作：「重新連線」
- 關閉 aria-label：「暫時關閉提示」
- 成功重連 toast（由 parent）：「已重新連線 Google Calendar」
