# GCAL_SETTINGS_TESTIDS

> Google Calendar 設定區塊元件的 `data-testid` 統一命名表。

```ts
export const GCAL_SETTINGS_TESTIDS = {
  // Section card
  section: "gcal-settings-section",
  statusCard: "gcal-status-card",
  statusDot: "gcal-status-dot",
  statusEmail: "gcal-status-email",
  statusConnectedAt: "gcal-status-connected-at",
  statusExpiry: "gcal-status-expiry",

  // Actions
  connectButton: "gcal-connect-button",
  reconnectButton: "gcal-reconnect-button",
  disconnectButton: "gcal-disconnect-button",

  // Calendar multi-select / default picker
  calendarMultiselect: "gcal-calendar-multiselect",
  calendarMultiselectTrigger: "gcal-calendar-multiselect-trigger",
  calendarOption: "gcal-calendar-option",                 // 加 -{calendarId}
  calendarOptionCheckbox: "gcal-calendar-option-checkbox",
  calendarOptionColor: "gcal-calendar-option-color",
  calendarMultiselectEmpty: "gcal-calendar-multiselect-empty",
  defaultCalendarSelect: "gcal-default-calendar-select",

  // Disconnect confirm dialog
  disconnectDialog: "gcal-disconnect-dialog",
  disconnectDialogConfirm: "gcal-disconnect-dialog-confirm",
  disconnectDialogCancel: "gcal-disconnect-dialog-cancel",

  // Reauth banner（global）
  reauthBanner: "gcal-reauth-banner",
  reauthBannerCta: "gcal-reauth-banner-cta",
  reauthBannerDismiss: "gcal-reauth-banner-dismiss",

  // Loading / error states
  loading: "gcal-settings-loading",
  error: "gcal-settings-error",
  errorRetry: "gcal-settings-error-retry",
} as const;
```

## 命名規則

- 所有 testid 以 `gcal-` prefix
- Dialog 內部按鈕統一加上 `dialog-` 中綴避免與外部按鈕撞名
- 動態 testid（如多曆 checkbox）使用 `-{calendarId}` suffix；calendarId 含 `@` 等字元時必須先 URL-encode 後再做 testid（e.g. `work%40group.calendar.google.com`）
