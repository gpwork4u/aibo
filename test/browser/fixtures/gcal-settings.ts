/**
 * Gcal Settings 測試共用 fixtures 與 testid 常數（Sprint 9, F-030）
 *
 * Wave 0 skeleton：集中 testid + mock helpers，Wave 4 解 skip 時直接重用。
 *
 * 對應 issue：#106
 * 對應 spec：specs/features/f030-gcal-enhancements.md
 */

import type { Page, Route } from "@playwright/test";

// ---------------------------------------------------------------------------
// data-testid 常數
// ---------------------------------------------------------------------------

export const GCAL_SETTINGS_TESTIDS = {
  // 設定頁面 Gcal 區塊
  section: "gcal-settings-section",

  // 未連狀態
  notConnectedState: "gcal-settings-not-connected",
  connectButton: "gcal-settings-connect-button",

  // 已連狀態
  connectedState: "gcal-settings-connected",
  emailLabel: "gcal-settings-email",
  expiresAtLabel: "gcal-settings-expires-at",
  defaultCalendarSelect: "gcal-settings-default-calendar-select",
  /** 動態：`gcal-settings-default-calendar-option-primary` */
  defaultCalendarOption: (id: string) => `gcal-settings-default-calendar-option-${id}`,
  saveSettingsButton: "gcal-settings-save-button",
  disconnectButton: "gcal-settings-disconnect-button",

  // 中斷確認 Dialog
  disconnectDialog: "gcal-settings-disconnect-dialog",
  disconnectDialogConfirm: "gcal-settings-disconnect-dialog-confirm",
  disconnectDialogCancel: "gcal-settings-disconnect-dialog-cancel",

  // Toast / Banner
  toastSaved: "gcal-settings-toast-saved",
  toastDisconnected: "gcal-settings-toast-disconnected",
  reauthBanner: "gcal-settings-reauth-banner",
  reauthBannerReconnect: "gcal-settings-reauth-banner-reconnect",
} as const;

// ---------------------------------------------------------------------------
// Mock data shapes
// ---------------------------------------------------------------------------

export interface MockGcalStatus {
  connected: boolean;
  email?: string;
  connected_at?: string;
  access_token_expires_at?: string;
  default_calendar_id?: string;
}

export interface MockGcalCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  time_zone?: string;
}

export interface InstallGcalSettingsMockOpts {
  status?: MockGcalStatus;
  calendars?: MockGcalCalendar[];
  /** events 路由的回應（reauth / not connected / 200） */
  events?:
    | { status: 200; body: { events: unknown[] } }
    | { status: 401; body: { code: "GCAL_REAUTH_REQUIRED" } }
    | { status: 424; body: { code: "GCAL_NOT_CONNECTED" } }
    | { status: 502; body: { code: "GCAL_UPSTREAM_ERROR" } };
  /** PUT /settings 回應 */
  putSettings?: { status: 200 | 400; body?: unknown };
  /** DELETE /gcal 回應（預設 204） */
  deleteIntegration?: { status: 204 | 401; body?: unknown };
  recorder?: {
    requests: Array<{ url: string; method: string; body?: unknown }>;
  };
}

/**
 * 安裝 `/api/v1/integrations/gcal*` 的 mock。
 */
export async function installGcalSettingsMock(
  page: Page,
  opts: InstallGcalSettingsMockOpts = {},
): Promise<void> {
  const status: MockGcalStatus = opts.status ?? { connected: false };
  const calendars =
    opts.calendars ?? [
      { id: "primary", summary: "Primary", primary: true, time_zone: "Asia/Taipei" },
    ];

  await page.route("**/api/v1/integrations/gcal**", async (route: Route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    if (opts.recorder) {
      let body: unknown = undefined;
      try {
        body = req.postDataJSON();
      } catch {
        // ignore
      }
      opts.recorder.requests.push({ url, method, body });
    }

    // GET /status
    if (method === "GET" && /\/integrations\/gcal\/status/.test(url)) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(status),
      });
      return;
    }

    // GET /calendars
    if (method === "GET" && /\/integrations\/gcal\/calendars/.test(url)) {
      if (!status.connected) {
        await route.fulfill({
          status: 424,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: "GCAL_NOT_CONNECTED" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ calendars }),
      });
      return;
    }

    // GET /events
    if (method === "GET" && /\/integrations\/gcal\/events/.test(url)) {
      const e = opts.events ?? { status: 200, body: { events: [] } };
      await route.fulfill({
        status: e.status,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(e.body),
      });
      return;
    }

    // PUT /settings
    if (method === "PUT" && /\/integrations\/gcal\/settings/.test(url)) {
      const r = opts.putSettings ?? { status: 200, body: { ok: true } };
      await route.fulfill({
        status: r.status,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(r.body ?? {}),
      });
      return;
    }

    // DELETE /gcal （注意：要在 status / calendars / events / settings 之後 fallback）
    if (method === "DELETE" && /\/integrations\/gcal(\?|$|\/?$)/.test(url)) {
      const d = opts.deleteIntegration ?? { status: 204 };
      await route.fulfill({
        status: d.status,
        headers: d.body ? { "content-type": "application/json" } : {},
        body: d.body ? JSON.stringify(d.body) : "",
      });
      return;
    }

    await route.continue();
  });
}
