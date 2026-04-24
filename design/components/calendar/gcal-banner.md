# GcalBanner + DegradedToast + EventActionMenu

三個輔助元件，處理 gcal 未連 / 降級 / 轉成 entry 互動。

---

## 1. GcalBanner（頂部未連接提示）

出現時機：API 回 **424 GCAL_NOT_CONNECTED**，或首次進入 `/calendar` 偵測到未連。

### 位置

- 於 CalendarPage 頂部、CalendarToolbar 上方，全寬橫幅

### 視覺

```
┌────────────────────────────────────────────────────────────────┐
│ ⓘ  尚未連接 Google Calendar，目前僅顯示知識條目  [前往設定 →]  [✕] │
└────────────────────────────────────────────────────────────────┘
```

### Tailwind

```tsx
<div role="status" aria-live="polite" className="flex items-center gap-3 border-b bg-primary/5 px-4 py-2 text-sm">
  <InfoIcon className="h-4 w-4 shrink-0 text-primary" />
  <p className="flex-1">尚未連接 Google Calendar，目前僅顯示知識條目。</p>
  <Button asChild variant="link" size="sm" className="h-auto p-0">
    <Link href="/settings">前往設定 →</Link>
  </Button>
  <button onClick={onDismiss} aria-label="關閉提示" className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
    <XIcon className="h-4 w-4" />
  </button>
</div>
```

### 行為

- 關閉後，使用 `localStorage.gcalBannerDismissedAt`（24h TTL），避免重複打擾
- 一旦成功連接 gcal，自動消失（不須手動關閉）

---

## 2. DegradedToast（非阻斷式 toast）

出現時機：API response header `X-Degraded: gcal`（entries 正常但 gcal upstream 失敗）。

### 文案

- **Title**：`Google Calendar 暫時無法載入`
- **Description**：`僅顯示知識條目，稍後會自動重試。`
- **Type**：`warning`
- **Duration**：5 秒
- **Action**（可選）：「重試」→ refetch

### 實作（使用 sonner）

```tsx
import { toast } from "sonner";

toast.warning("Google Calendar 暫時無法載入", {
  description: "僅顯示知識條目，稍後會自動重試。",
  duration: 5000,
  action: { label: "重試", onClick: () => refetch() },
});
```

### 規範

- **同一次頁面 session 只顯示 1 次**（以 query key 去重）
- 不可阻斷操作（絕對不可用 alert dialog）
- 配色：使用既有 `warning` token（黃色系），不使用 destructive 紅色

---

## 3. EventActionMenu（gcal event 的 dropdown 動作）

針對每個 gcal event 提供動作選單。使用 shadcn `DropdownMenu`（已安裝）。

### Props

```ts
interface EventActionMenuProps {
  event: EventDetail;
  isConverting?: boolean;
  disabled?: boolean;       // 已連結時 disabled
  onConvert: () => Promise<void>;
}
```

### 結構

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm" disabled={disabled || isConverting} aria-label="事件動作選單">
      {isConverting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <MoreHorizontalIcon className="h-4 w-4" />}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    <DropdownMenuItem onClick={onConvert} disabled={disabled}>
      <ArrowRightCircleIcon className="mr-2 h-4 w-4" />
      轉成 entry
    </DropdownMenuItem>
    {event.linked_entry_id && (
      <DropdownMenuItem asChild>
        <Link href={`/entries/${event.linked_entry_id}`}>
          <ExternalLinkIcon className="mr-2 h-4 w-4" />
          檢視已連結的 entry
        </Link>
      </DropdownMenuItem>
    )}
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild>
      <a href={event.html_link ?? "#"} target="_blank" rel="noreferrer">
        <CalendarIcon className="mr-2 h-4 w-4" />
        在 Google Calendar 開啟
      </a>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 狀態機

| 狀態 | 觸發 | 視覺 |
|------|------|------|
| idle | 預設 | `…` icon |
| converting | 使用者點「轉成 entry」 | spinner + trigger disabled |
| done（已連結） | API 201 回應 | trigger 仍可按，但「轉成 entry」disabled；顯示「檢視已連結的 entry」 |
| error 409 ALREADY_LINKED | API 回 409 | toast warning「此事件已連結」+ refetch 以取得 linked_entry_id |
| error 502 GCAL_UPSTREAM | API 回 502 | toast error「連線 Google Calendar 失敗，請稍後再試」 |

### 成功後回饋

- Toast success：`已轉成 entry`，action「檢視」→ `/entries/:id`
- DayDetailSheet 自動 refetch `/calendar/days/:date`（或使用 TanStack Query invalidate）

### a11y

- Trigger 必須有 `aria-label`
- spinner 狀態時 `aria-busy="true"`
- 選單項目使用 DropdownMenu 預設 keyboard nav（↑↓ Enter Esc）
