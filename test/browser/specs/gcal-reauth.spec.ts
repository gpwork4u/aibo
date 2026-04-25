/**
 * F-030 — Gcal Reauth 流程（refresh token 失效）
 *
 * 對應 issue：#106（Wave 0 skeleton；Wave 4 補完整 assertion）
 * 對應 spec：specs/features/f030-gcal-enhancements.md §Refresh token 失效
 *
 * Wave 0：所有 test 皆 test.skip(true, ...)。
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  GCAL_SETTINGS_TESTIDS as G,
  installGcalSettingsMock,
} from "../fixtures/gcal-settings";
import {
  CALENDAR_TESTIDS as C,
  installCalendarMock,
  emptyMonthGrid,
  todayTaipei,
} from "../fixtures/calendar";

const SETTINGS_PATH = "/settings";

test.describe("Gcal — Reauth 流程（F-030）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa09-gcal-reauth-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
  });

  test("Scenario: GET /events 回 401 GCAL_REAUTH_REQUIRED → 設定頁顯示 reauth banner", async ({
    page,
  }) => {
    test.skip(true, "Wave 4 — 等 reauth banner 完成");
    // GIVEN refresh token 失效，events 回 401
    await installGcalSettingsMock(page, {
      status: {
        connected: true,
        email: "user@example.com",
      },
      events: { status: 401, body: { code: "GCAL_REAUTH_REQUIRED" } },
    });

    // WHEN 進設定頁（前端應觸發 GET /events 或從 query state 偵測）
    await page.goto(SETTINGS_PATH);

    // THEN reauth banner 出現
    await expect(page.getByTestId(G.reauthBanner)).toBeVisible();
    await expect(page.getByTestId(G.reauthBannerReconnect)).toBeVisible();
  });

  test("Scenario: 點 reauth banner 重新連線按鈕 → 跳 OAuth", async ({ page }) => {
    test.skip(true, "Wave 4 — 等 reauth → OAuth redirect 完成");
    await installGcalSettingsMock(page, {
      status: { connected: true, email: "user@example.com" },
      events: { status: 401, body: { code: "GCAL_REAUTH_REQUIRED" } },
    });

    await page.goto(SETTINGS_PATH);
    await expect(page.getByTestId(G.reauthBanner)).toBeVisible();

    // WHEN 點重新連線
    // THEN 應 navigate 到 /api/v1/integrations/gcal/oauth/start 或外部 google url
    const [request] = await Promise.all([
      page.waitForRequest(/oauth|google/),
      page.getByTestId(G.reauthBannerReconnect).click(),
    ]);
    expect(request.url()).toMatch(/oauth|google/);
  });

  test("Scenario: /calendar 載入時 events 回 401 → 顯示 reauth toast/banner", async ({
    page,
  }) => {
    test.skip(true, "Wave 4 — 等 /calendar reauth integration 完成");
    // GIVEN /calendar 內部呼叫 events 回 401（gcal_connected=true 但 token 失效）
    // 這裡用 calendar mock 模擬：以 degraded + 自訂 status header
    // 實際 Wave 4 應改用 events mock（status 401）
    await installCalendarMock(page, {
      days: emptyMonthGrid(todayTaipei()),
      degraded: true,
    });
    await installGcalSettingsMock(page, {
      status: { connected: true },
      events: { status: 401, body: { code: "GCAL_REAUTH_REQUIRED" } },
    });

    // WHEN 進 /calendar
    await page.goto("/calendar");

    // THEN 顯示 reauth banner（在 /calendar 或全域）
    await expect(
      page.getByTestId(G.reauthBanner).or(page.getByTestId(C.gcalDegradedToast)),
    ).toBeVisible();
  });

  test("Scenario: Access token 過期 + refresh 成功 → events 200（無 banner）", async ({
    page,
  }) => {
    test.skip(true, "Wave 4 — 等 token refresh 流程完成");
    // GIVEN events 直接回 200（後端內部已自動 refresh）
    await installGcalSettingsMock(page, {
      status: { connected: true, email: "user@example.com" },
      events: { status: 200, body: { events: [] } },
    });

    // WHEN 進設定頁
    await page.goto(SETTINGS_PATH);

    // THEN 不顯示 reauth banner
    await expect(page.getByTestId(G.reauthBanner)).toBeHidden();
    await expect(page.getByTestId(G.connectedState)).toBeVisible();
  });
});
