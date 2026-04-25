/**
 * F-030 — Gcal 設定頁面（連線 / 中斷 / default calendar）
 *
 * 對應 issue：#106（Wave 0 skeleton；Wave 4 補完整 assertion）
 * 對應 spec：specs/features/f030-gcal-enhancements.md
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

const SETTINGS_PATH = "/settings"; // 若 engineer 改為 /settings/integrations 再調整

test.describe("Gcal Settings — 連線與中斷流程（F-030）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa09-gcal-settings-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
  });

  test("Scenario: 設定頁未連狀態 → 顯示「連線」按鈕", async ({ page }) => {
    test.skip(true, "Wave 4 — 等 F-030d 設定頁完成再啟用");
    // GIVEN GET /status 回 connected=false
    await installGcalSettingsMock(page, { status: { connected: false } });

    // WHEN 進設定頁
    await page.goto(SETTINGS_PATH);

    // THEN 顯示未連 state + 連線按鈕
    await expect(page.getByTestId(G.section)).toBeVisible();
    await expect(page.getByTestId(G.notConnectedState)).toBeVisible();
    await expect(page.getByTestId(G.connectButton)).toBeVisible();
  });

  test("Scenario: 設定頁已連 → 顯示 email + 中斷按鈕 + default calendar 下拉", async ({
    page,
  }) => {
    test.skip(true, "Wave 4 — 等 F-030d 已連狀態 UI 完成");
    // GIVEN 已連線 + 一筆 calendar
    await installGcalSettingsMock(page, {
      status: {
        connected: true,
        email: "user@example.com",
        connected_at: "2026-04-01T00:00:00Z",
        access_token_expires_at: "2026-04-24T11:00:00Z",
        default_calendar_id: "primary",
      },
      calendars: [
        { id: "primary", summary: "Work", primary: true, time_zone: "Asia/Taipei" },
        { id: "personal@group.calendar.google.com", summary: "Personal" },
      ],
    });

    // WHEN 進設定頁
    await page.goto(SETTINGS_PATH);

    // THEN 顯示 email、calendar select、中斷按鈕
    await expect(page.getByTestId(G.connectedState)).toBeVisible();
    await expect(page.getByTestId(G.emailLabel)).toContainText("user@example.com");
    await expect(page.getByTestId(G.defaultCalendarSelect)).toBeVisible();
    await expect(page.getByTestId(G.disconnectButton)).toBeVisible();
  });

  test("Scenario: 切換 default calendar → PUT /settings → toast「已儲存」", async ({
    page,
  }) => {
    test.skip(true, "Wave 4 — 等 PUT /settings 串接完成");
    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };
    await installGcalSettingsMock(page, {
      status: {
        connected: true,
        email: "user@example.com",
        default_calendar_id: "primary",
      },
      calendars: [
        { id: "primary", summary: "Work", primary: true },
        { id: "personal@group.calendar.google.com", summary: "Personal" },
      ],
      recorder,
    });

    // WHEN 切換到 personal 並儲存
    await page.goto(SETTINGS_PATH);
    await page.getByTestId(G.defaultCalendarSelect).click();
    await page
      .getByTestId(G.defaultCalendarOption("personal@group.calendar.google.com"))
      .click();
    await page.getByTestId(G.saveSettingsButton).click();

    // THEN PUT /settings 被呼叫 + 成功 toast
    await expect(page.getByTestId(G.toastSaved)).toBeVisible();
    expect(
      recorder.requests.some(
        (r) => r.method === "PUT" && /settings/.test(r.url),
      ),
    ).toBeTruthy();
  });

  test("Scenario: 中斷流程 - 點按鈕 → AlertDialog → 確認 → DELETE → 回到未連狀態", async ({
    page,
  }) => {
    test.skip(true, "Wave 4 — 等 disconnect 流程完成");
    // GIVEN 已連
    await installGcalSettingsMock(page, {
      status: {
        connected: true,
        email: "user@example.com",
        default_calendar_id: "primary",
      },
    });

    // WHEN 點中斷 → 確認 dialog
    await page.goto(SETTINGS_PATH);
    await page.getByTestId(G.disconnectButton).click();
    await expect(page.getByTestId(G.disconnectDialog)).toBeVisible();
    await page.getByTestId(G.disconnectDialogConfirm).click();

    // THEN toast + 切回未連狀態（前端應重打 GET /status）
    await expect(page.getByTestId(G.toastDisconnected)).toBeVisible();
    // 此處 Wave 4 需要：mock GET /status 在 DELETE 後回 connected=false
    // 並 expect notConnectedState visible
  });

  test("Scenario: 點中斷後在 dialog 取消 → 仍維持已連狀態", async ({ page }) => {
    test.skip(true, "Wave 4 — 等 dialog 取消流程完成");
    await installGcalSettingsMock(page, {
      status: { connected: true, email: "user@example.com" },
    });

    await page.goto(SETTINGS_PATH);
    await page.getByTestId(G.disconnectButton).click();
    await expect(page.getByTestId(G.disconnectDialog)).toBeVisible();
    await page.getByTestId(G.disconnectDialogCancel).click();

    await expect(page.getByTestId(G.disconnectDialog)).toBeHidden();
    await expect(page.getByTestId(G.connectedState)).toBeVisible();
  });
});
