# Google Calendar Settings Components — Sprint 9

對應 issue #105、F-030。沿用 Sprint 8 的 shadcn/ui + Tailwind v4 風格與 design tokens（`design/tokens/`），新增 token expiry status token（見 `design/tokens/mood.md` § 4）。

## 元件清單

| 元件 | 檔案 | 用途 |
|------|------|------|
| GcalStatusCard | `gcal-status-card.md` | 設定頁主卡片（未連 / 已連 / reauth） |
| GcalCalendarMultiselect | `gcal-calendar-multiselect.md` | 多曆選擇 popover（checkbox + 顏色） |
| GcalDisconnectConfirm | `gcal-disconnect-confirm.md` | 中斷連線 AlertDialog |
| GcalReauthBanner | `gcal-reauth-banner.md` | 全域頂部 reauth 提示帶 |

## testid 規範

統一在 `testids.md` 定義（`GCAL_SETTINGS_TESTIDS` 常數）。

含 `@` 等特殊字元的 calendar id 需先 `encodeURIComponent` 後再做 testid suffix。

## API 對應

| 元件 | API |
|------|-----|
| GcalStatusCard | `GET /integrations/gcal/status`、`PUT /integrations/gcal/settings` |
| GcalCalendarMultiselect | `GET /integrations/gcal/calendars` |
| GcalDisconnectConfirm | `DELETE /integrations/gcal` |
| GcalReauthBanner | 由全域 axios interceptor 偵測 401 GCAL_REAUTH_REQUIRED 觸發 |

## 共通 a11y

- 連線狀態用 dot + 文字標籤雙重呈現（不單靠顏色）
- Reauth banner `role="alert"`，讀屏立即播報
- AlertDialog 預設 focus 在 cancel 按鈕（防破壞性誤觸）
- 對比 ≥ WCAG AA
