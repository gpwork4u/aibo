# GcalDisconnectConfirm

中斷 Google Calendar 連線的確認 dialog（AlertDialog）。

---

## 結構

```
┌──────────────────────────────────────────────────┐
│ ⚠  確定要中斷 Google Calendar 連線？             │
│                                                  │
│    中斷後：                                       │
│    • 行事曆將不再顯示 Google Calendar 事件        │
│    • 已建立的條目和日記不會被刪除                 │
│    • 可隨時重新連線                               │
│                                                  │
│                  [ 取消 ]   [ 中斷連線 ]         │
└──────────────────────────────────────────────────┘
```

---

## Props

```ts
interface GcalDisconnectConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email?: string;            // 顯示哪個帳號將被中斷
  onConfirm: () => Promise<void>;
  isPending?: boolean;
}
```

---

## Tailwind / 範例

```tsx
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Loader2Icon, AlertTriangleIcon } from "lucide-react";
import { GCAL_SETTINGS_TESTIDS } from "@/lib/testids/gcal-settings";

<AlertDialog open={open} onOpenChange={onOpenChange}>
  <AlertDialogContent
    data-testid={GCAL_SETTINGS_TESTIDS.disconnectDialog}
    className="max-w-md"
  >
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2">
        <AlertTriangleIcon className="h-5 w-5 text-warning" aria-hidden="true" />
        確定要中斷 Google Calendar 連線？
      </AlertDialogTitle>
      <AlertDialogDescription className="space-y-2 pt-2 text-sm">
        {email && (
          <p>
            將中斷帳號 <strong className="font-medium text-foreground">{email}</strong> 的連線。
          </p>
        )}
        <p>中斷後：</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>行事曆將不再顯示 Google Calendar 事件</li>
          <li>已建立的條目和日記不會被刪除</li>
          <li>可隨時重新連線（需要重新授權）</li>
        </ul>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel
        disabled={isPending}
        data-testid={GCAL_SETTINGS_TESTIDS.disconnectDialogCancel}
      >
        取消
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={(e) => {
          e.preventDefault();
          onConfirm();
        }}
        disabled={isPending}
        data-testid={GCAL_SETTINGS_TESTIDS.disconnectDialogConfirm}
        className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive"
      >
        {isPending && <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />}
        中斷連線
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 點 取消 / Esc | onOpenChange(false)；不執行任何 API |
| 點 中斷連線 | onConfirm()（DELETE /integrations/gcal）；按鈕 disabled + spinner |
| 成功 | parent 關閉 dialog + toast「已中斷 Google Calendar 連線」 |
| 失敗 | parent 顯示 toast 錯誤訊息；dialog 保持開啟 |
| 點背景遮罩 | 預設不關閉（AlertDialog 標準行為，避免誤觸） |

### data-testid

| 元素 | testid |
|------|--------|
| Dialog content | `GCAL_SETTINGS_TESTIDS.disconnectDialog` |
| 取消 | `GCAL_SETTINGS_TESTIDS.disconnectDialogCancel` |
| 確認中斷 | `GCAL_SETTINGS_TESTIDS.disconnectDialogConfirm` |

---

## States

| 狀態 | 視覺 |
|------|------|
| 預設 | confirm 按鈕 destructive 主色 |
| Pending | 兩個按鈕 disabled、confirm 顯示 spinner |

---

## a11y

- 使用 shadcn `AlertDialog`（基於 Radix），預設處理：
  - Focus trap
  - Esc 關閉
  - 開啟時自動 focus 在 cancel button（破壞性操作預設不 focus 在 confirm 上 → 防止 Enter 誤觸）
  - `role="alertdialog"` + `aria-labelledby` + `aria-describedby`
- 標題附 warning icon 強化視覺，文字說明後果三條
- Confirm 按鈕用 destructive 色 + 文字「中斷連線」明確
- 對比：destructive bg vs destructive-foreground ≥ 4.5:1（既有 token）

---

## 範例文案

- 標題：「確定要中斷 Google Calendar 連線？」
- 說明三條：
  - 行事曆將不再顯示 Google Calendar 事件
  - 已建立的條目和日記不會被刪除
  - 可隨時重新連線（需要重新授權）
- 動作：「取消」 / 「中斷連線」
- 成功 toast：「已中斷 Google Calendar 連線」
- 失敗 toast：「中斷連線失敗，請稍後再試」
