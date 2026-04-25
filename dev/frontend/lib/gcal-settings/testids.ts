/**
 * Gcal Settings 頁面 data-testid 常數。
 *
 * 必須與 `test/browser/fixtures/gcal-settings.ts` 的 `GCAL_SETTINGS_TESTIDS` 一致。
 */
export const GCAL_SETTINGS_TESTIDS = {
  section: "gcal-settings-section",

  notConnectedState: "gcal-settings-not-connected",
  connectButton: "gcal-settings-connect-button",

  connectedState: "gcal-settings-connected",
  emailLabel: "gcal-settings-email",
  expiresAtLabel: "gcal-settings-expires-at",
  defaultCalendarSelect: "gcal-settings-default-calendar-select",
  defaultCalendarOption: (id: string) => `gcal-settings-default-calendar-option-${id}`,
  saveSettingsButton: "gcal-settings-save-button",
  disconnectButton: "gcal-settings-disconnect-button",

  disconnectDialog: "gcal-settings-disconnect-dialog",
  disconnectDialogConfirm: "gcal-settings-disconnect-dialog-confirm",
  disconnectDialogCancel: "gcal-settings-disconnect-dialog-cancel",

  toastSaved: "gcal-settings-toast-saved",
  toastDisconnected: "gcal-settings-toast-disconnected",
  reauthBanner: "gcal-settings-reauth-banner",
  reauthBannerReconnect: "gcal-settings-reauth-banner-reconnect",
} as const;
