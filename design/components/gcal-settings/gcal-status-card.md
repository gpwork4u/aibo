# GcalStatusCard

設定頁中 Google Calendar 區塊的狀態卡片。三種主狀態：未連 / 已連 / 需重新授權。

---

## 三種狀態

### 1. 未連線（disconnected）

```
┌──────────────────────────────────────────────────┐
│ 📅  Google Calendar                              │
│      將 Google Calendar 事件同步到 aibo，         │
│      自動建立 entry 和日記來源。                  │
│                                                  │
│      [ 連線 Google Calendar ]                    │
└──────────────────────────────────────────────────┘
```

### 2. 已連線（connected）

```
┌──────────────────────────────────────────────────┐
│ 📅  Google Calendar         ● 已連線（健康）      │
│      user@example.com                            │
│      於 2026-04-01 連線（23 天前）                │
│      Token 將於 58 分鐘後到期 · 將自動更新        │
│ ─────────────────────────────────────────────── │
│ 預設行事曆                                        │
│ [ Work（primary） ▾ ]                            │
│                                                  │
│ 顯示行事曆（多選）                                │
│ [ ☑ Work  ☑ 家庭  ☐ 朋友 ▾ ]                    │
│ ─────────────────────────────────────────────── │
│                            [ 中斷連線 ]          │
└──────────────────────────────────────────────────┘
```

### 3. 需重新授權（reauth_required）

```
┌──────────────────────────────────────────────────┐
│ 📅  Google Calendar         ● 需要重新授權        │
│      user@example.com                            │
│      Refresh token 失效，請重新連線以繼續同步。   │
│                                                  │
│      [ 重新連線 ]    [ 中斷連線 ]                │
└──────────────────────────────────────────────────┘
```

---

## Props

```ts
type GcalConnectionStatus =
  | { connected: false }
  | {
      connected: true;
      email: string;
      connected_at: string;          // ISO
      access_token_expires_at: string;
      default_calendar_id: string;
      reauth_required?: boolean;
    };

interface GcalStatusCardProps {
  status: GcalConnectionStatus;
  calendars?: Array<{ id: string; summary: string; primary: boolean; background_color?: string }>;
  selectedCalendarIds?: string[];
  onConnect: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;        // 開啟 confirm dialog
  onDefaultCalendarChange: (id: string) => void;
  onSelectedCalendarsChange: (ids: string[]) => void;
  isLoading?: boolean;
  isConnecting?: boolean;
}
```

---

## Tailwind / 範例

```tsx
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2Icon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { GcalCalendarMultiselect } from "./gcal-calendar-multiselect";
import { GCAL_SETTINGS_TESTIDS } from "@/lib/testids/gcal-settings";

const expiryStatus = computeExpiryStatus(status);   // 'healthy' | 'warning' | 'critical' | 'reauth' | 'disconnected'
const dotClass = {
  healthy: "bg-success",
  warning: "bg-warning",
  critical: "bg-destructive animate-pulse",
  reauth: "bg-destructive",
  disconnected: "bg-muted-foreground/40",
}[expiryStatus];

<section
  data-testid={GCAL_SETTINGS_TESTIDS.statusCard}
  aria-labelledby="gcal-status-title"
  className="rounded-lg border bg-card p-5"
>
  {/* Header */}
  <div className="flex items-start gap-3">
    <CalendarIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="gcal-status-title" className="text-base font-semibold">
          Google Calendar
        </h3>
        <span
          className="inline-flex items-center gap-1.5 text-xs"
          data-testid={GCAL_SETTINGS_TESTIDS.statusDot}
        >
          <span className={cn("inline-block h-2 w-2 rounded-full", dotClass)} aria-hidden="true" />
          <span>{statusLabel(expiryStatus)}</span>
        </span>
      </div>

      {!status.connected ? (
        <p className="mt-1 text-sm text-muted-foreground">
          將 Google Calendar 事件同步到 aibo，自動建立條目和日記來源。
        </p>
      ) : (
        <div className="mt-1 space-y-0.5 text-sm">
          <p data-testid={GCAL_SETTINGS_TESTIDS.statusEmail}>{status.email}</p>
          <p
            className="text-xs text-muted-foreground"
            data-testid={GCAL_SETTINGS_TESTIDS.statusConnectedAt}
          >
            於 {formatDateZh(status.connected_at)} 連線（{formatRelativeZh(status.connected_at)}）
          </p>
          {!status.reauth_required ? (
            <p
              className="text-xs text-muted-foreground"
              data-testid={GCAL_SETTINGS_TESTIDS.statusExpiry}
            >
              Token 將於 {formatTimeUntil(status.access_token_expires_at)} 到期 · 將自動更新
            </p>
          ) : (
            <p
              className="text-xs text-destructive"
              data-testid={GCAL_SETTINGS_TESTIDS.statusExpiry}
            >
              Refresh token 失效，請重新連線以繼續同步。
            </p>
          )}
        </div>
      )}
    </div>
  </div>

  {/* 動作區 */}
  {!status.connected && (
    <div className="mt-4">
      <Button
        size="lg"
        onClick={onConnect}
        disabled={isConnecting}
        data-testid={GCAL_SETTINGS_TESTIDS.connectButton}
        className="gap-2"
      >
        {isConnecting && <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />}
        <ExternalLinkIcon className="h-4 w-4" aria-hidden="true" />
        連線 Google Calendar
      </Button>
    </div>
  )}

  {status.connected && status.reauth_required && (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button
        onClick={onReconnect}
        data-testid={GCAL_SETTINGS_TESTIDS.reconnectButton}
        className="gap-2"
      >
        <ExternalLinkIcon className="h-4 w-4" aria-hidden="true" />
        重新連線
      </Button>
      <Button
        variant="outline"
        onClick={onDisconnect}
        data-testid={GCAL_SETTINGS_TESTIDS.disconnectButton}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        中斷連線
      </Button>
    </div>
  )}

  {status.connected && !status.reauth_required && (
    <>
      <hr className="my-4 border-border" />

      {/* 預設行事曆 */}
      <div className="space-y-1.5">
        <label htmlFor="default-cal" className="text-xs font-medium">預設行事曆</label>
        <Select
          value={status.default_calendar_id}
          onValueChange={onDefaultCalendarChange}
        >
          <SelectTrigger
            id="default-cal"
            data-testid={GCAL_SETTINGS_TESTIDS.defaultCalendarSelect}
            className="max-w-sm"
          >
            <SelectValue placeholder="選擇預設行事曆" />
          </SelectTrigger>
          <SelectContent>
            {calendars?.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.summary}{c.primary && "（primary）"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 多曆選擇 */}
      <div className="mt-3 space-y-1.5">
        <label className="text-xs font-medium">顯示行事曆（多選）</label>
        <GcalCalendarMultiselect
          calendars={calendars ?? []}
          value={selectedCalendarIds ?? []}
          onChange={onSelectedCalendarsChange}
        />
      </div>

      <hr className="my-4 border-border" />

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={onDisconnect}
          data-testid={GCAL_SETTINGS_TESTIDS.disconnectButton}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
        >
          中斷連線
        </Button>
      </div>
    </>
  )}
</section>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 點「連線」 | onConnect()：跳轉 OAuth flow（new tab 或 popup） |
| 點「重新連線」 | onReconnect()：同上但會夾帶 `prompt=consent` |
| 點「中斷連線」 | onDisconnect()：開啟 GcalDisconnectConfirm dialog |
| 切換預設行事曆 | onDefaultCalendarChange(id) → PUT /integrations/gcal/settings |
| 多曆勾選 | onSelectedCalendarsChange(ids) → 同上 |
| Token 到期偵測 | 由 parent 計算 expiryStatus；critical 狀態 dot pulse |

### data-testid

| 元素 | testid |
|------|--------|
| Card root | `GCAL_SETTINGS_TESTIDS.statusCard` |
| Status dot | `GCAL_SETTINGS_TESTIDS.statusDot` |
| Email | `GCAL_SETTINGS_TESTIDS.statusEmail` |
| Connected at | `GCAL_SETTINGS_TESTIDS.statusConnectedAt` |
| Token expiry | `GCAL_SETTINGS_TESTIDS.statusExpiry` |
| Connect button | `GCAL_SETTINGS_TESTIDS.connectButton` |
| Reconnect button | `GCAL_SETTINGS_TESTIDS.reconnectButton` |
| Disconnect button | `GCAL_SETTINGS_TESTIDS.disconnectButton` |
| Default calendar select | `GCAL_SETTINGS_TESTIDS.defaultCalendarSelect` |

---

## States

| State | dot | 文字 | 顯示 |
|-------|-----|------|------|
| disconnected | 灰 | 「未連線」 | Connect button |
| healthy | 綠 | 「已連線（健康）」 | 完整功能 + Disconnect |
| warning | 黃 | 「Token 即將到期」 | 完整功能 + Disconnect |
| critical | 紅（pulse） | 「Token 已過期，正在更新」 | 完整功能 + Disconnect |
| reauth_required | 紅 | 「需要重新授權」 | Reconnect + Disconnect |

---

## a11y

- `<section>` + `aria-labelledby` 構成地標
- Status dot 純裝飾 + 旁邊文字標籤同時呈現（不單靠顏色）
- Connect button 高 44px ✓ 滿足觸控目標
- Disconnect button 用 `text-destructive` + hover bg 區分風險，文字明確
- Email 為純文字（不可選複製需另加 `select-text`，可不加）
- 對比：`text-destructive` vs `bg-card` ≥ 4.5:1

---

## 範例文案

- 「將 Google Calendar 事件同步到 aibo，自動建立條目和日記來源。」
- 「於 2026-04-01 連線（23 天前）」
- 「Token 將於 58 分鐘後到期 · 將自動更新」
- 「Refresh token 失效，請重新連線以繼續同步。」
