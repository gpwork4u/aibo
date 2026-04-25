# Settings — Google Calendar Section Mock

位於 `/settings` 頁面的一個區塊（與 LLM Providers、API Keys 等並列）。

## Desktop（≥ 1024px）— 已連線（healthy）

```
┌─── Sidebar ───┬──────────────── /settings ─────────────────────────┐
│ ...           │ 設定                                                │
│ Settings ●    │                                                    │
│               │ ┌── LLM Providers ────────────────────────────┐   │
│               │ │ ...                                          │   │
│               │ └──────────────────────────────────────────────┘   │
│               │                                                    │
│               │ ┌── Google Calendar ──────────────────────────┐    │
│               │ │ 📅 Google Calendar     ● 已連線（健康）       │    │
│               │ │    user@example.com                         │    │
│               │ │    於 2026-04-01 連線（23 天前）             │    │
│               │ │    Token 將於 58 分鐘後到期 · 將自動更新     │    │
│               │ │ ───────────────────────────────────────────  │    │
│               │ │ 預設行事曆                                    │    │
│               │ │ [ Work（primary） ▾ ]                        │    │
│               │ │                                              │    │
│               │ │ 顯示行事曆（多選）                            │    │
│               │ │ [ ☑ Work、☑ 家庭、+1 ▾ ]                    │    │
│               │ │ ───────────────────────────────────────────  │    │
│               │ │                          [ 中斷連線 ]        │    │
│               │ └──────────────────────────────────────────────┘    │
│               │                                                    │
│               │ ┌── API Keys ─────────────────────────────────┐   │
│               │ │ ...                                          │   │
│               │ └──────────────────────────────────────────────┘   │
└───────────────┴────────────────────────────────────────────────────┘
```

## 變體

### A. 未連線（disconnected）

```
┌── Google Calendar ──────────────────────────┐
│ 📅 Google Calendar       ● 未連線            │
│    將 Google Calendar 事件同步到 aibo，      │
│    自動建立條目和日記來源。                   │
│                                              │
│    [ 連線 Google Calendar ]                  │
└──────────────────────────────────────────────┘
```

### B. 即將到期（warning）

```
┌── Google Calendar ──────────────────────────┐
│ 📅 Google Calendar       ● Token 即將到期    │  ← 黃 dot
│    user@example.com                         │
│    Token 將於 8 分鐘後到期 · 將自動更新       │
│    ...（其他同 healthy）                      │
└──────────────────────────────────────────────┘
```

### C. 已過期（critical）

```
┌── Google Calendar ──────────────────────────┐
│ 📅 Google Calendar  ● Token 已過期，正在更新 │  ← 紅 pulse dot
│    ...                                       │
└──────────────────────────────────────────────┘
```

### D. 需重新授權（reauth_required）

```
┌── Google Calendar ──────────────────────────┐
│ 📅 Google Calendar       ● 需要重新授權      │  ← 紅 dot
│    user@example.com                         │
│    Refresh token 失效，請重新連線以繼續同步。│
│                                              │
│    [ 重新連線 ]    [ 中斷連線 ]              │
└──────────────────────────────────────────────┘
```

> 同時於 app shell 頂部出現 GcalReauthBanner（global），但於本頁可主動 dismiss（重複資訊）。

### E. 中斷連線確認（dialog 開啟）

```
   ┌─────── overlay ──────────┐
   │                          │
   │ ┌─ AlertDialog ────────┐ │
   │ │ ⚠ 確定要中斷？        │ │
   │ │ 將中斷帳號 user@...   │ │
   │ │ 中斷後：              │ │
   │ │  • 不再顯示 GCal 事件 │ │
   │ │  • 條目/日記不刪除     │ │
   │ │  • 可隨時重連         │ │
   │ │           [取消][中斷]│ │
   │ └──────────────────────┘ │
   └──────────────────────────┘
```

### F. Loading（初次載入 status）

- 整個 card 顯示 skeleton（h-48），testid `gcal-settings-loading`

### G. Error（API 失敗）

```
┌── Google Calendar ──────────────────────────┐
│ 📅 Google Calendar                          │
│ ⚠ 無法載入連線狀態                          │
│ {error message}                             │
│                              [ 重試 ]       │
└──────────────────────────────────────────────┘
```
- testid `gcal-settings-error`

## Mobile（< 768px）

```
┌────────────────────────────────────┐
│ 設定                                │
├────────────────────────────────────┤
│ Google Calendar     ● 已連線        │
│ user@example.com                   │
│ 於 4/1 連線                         │
│ Token 58 分後到期                   │
│ ─────────────────────────────────  │
│ 預設行事曆                          │
│ [ Work ▾ ]                         │
│                                    │
│ 顯示行事曆                          │
│ [ ☑ Work、+2 ▾ ]                  │
│ ─────────────────────────────────  │
│ [        中斷連線        ]         │  ← 全寬按鈕
└────────────────────────────────────┘
```

## 互動流程

1. **進入** → `GET /api/v1/integrations/gcal/status`
   - 若 connected → 額外 fire `GET /api/v1/integrations/gcal/calendars`
2. **點「連線 Google Calendar」** → 跳 OAuth → callback 回來 refetch status
3. **切預設行事曆** → `PUT /integrations/gcal/settings { default_calendar_id }`
4. **多曆勾選** → 同上（後端可擴充欄位 `selected_calendar_ids` 或暫存於 frontend）
5. **點「中斷連線」** → 開 GcalDisconnectConfirm dialog
6. **dialog 確認** → `DELETE /api/v1/integrations/gcal` → status refetch → 顯示「未連線」
7. **點「重新連線」（reauth）** → 跳 OAuth `prompt=consent` → 同 #2

## 用到的元件

| 元件 | 路徑 |
|------|------|
| GcalStatusCard | `design/components/gcal-settings/gcal-status-card.md` |
| GcalCalendarMultiselect | `design/components/gcal-settings/gcal-calendar-multiselect.md` |
| GcalDisconnectConfirm | `design/components/gcal-settings/gcal-disconnect-confirm.md` |
| GcalReauthBanner | `design/components/gcal-settings/gcal-reauth-banner.md`（全域，非本頁但相關） |

## a11y

- 區塊以 `<section aria-labelledby="gcal-status-title">` 構成地標
- Status dot + 文字（不單靠顏色傳達）
- Disconnect button 使用 destructive 樣式 + 文字明確
- AlertDialog 預設 focus 在 cancel 按鈕（防誤觸）
- Connect button 高度 44px ✓ 觸控

## 對比驗證

- `text-success`、`text-warning`、`text-destructive` 對 `bg-card` ≥ 4.5:1（既有 token 已驗證）
- dot pulse 動畫遵循 `prefers-reduced-motion`：可在全域 CSS 控制 `.animate-pulse` 暫停
