/**
 * F-026b / F-027a / F-027c — Gcal 降級 + 未連接路徑
 *
 * 對應 issue：#85（Wave 0 skeleton）
 * 對應 spec：
 *   - specs/features/f026-calendar-view.md §Scenario: gcal 上游失敗走 degraded
 *   - specs/features/f026-calendar-view.md §Scenario: 未連 gcal 但要求 include_gcal
 *   - specs/features/f027-calendar-frontend.md §Error Handling
 *   - Issue #85 §Gcal degraded 路徑 / 未連 gcal 路徑
 *
 * 狀態：Wave 0 — 所有 test 先 skip。
 */

import { test, expect } from "@playwright/test";
import { CALENDAR_TESTIDS as T } from "../fixtures/calendar";

test.describe("Calendar — Gcal Degraded（X-Degraded: gcal）", () => {
  test("Scenario: 上游 500 → X-Degraded header + degraded toast + entries 正常顯示", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN gcal mock 設為 500
    // WHEN 載入 /calendar
    // THEN
    //   - response header X-Degraded: gcal
    //   - 顯示 sonner toast「Google Calendar 暫時無法載入，僅顯示知識條目」
    //   - 月格 events 區塊空，entries 正常
    await page.goto("/calendar");
    await expect(page.getByTestId(T.gcalDegradedToast)).toBeVisible();
    await expect(
      page.getByText(/Google Calendar 暫時無法載入|僅顯示知識條目/)
    ).toBeVisible();
  });

  test("Scenario: Degraded 狀態下開 Day Sheet，事件 section 顯示 inline warning", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN 月視圖為 degraded 狀態
    // WHEN 點格子開 Sheet
    // THEN 事件 section 顯示 inline warning；條目 / 日記 section 仍正常渲染
    await page.goto("/calendar?view=month&date=2026-04-24");
    const sheet = page.getByTestId(T.sheet);
    await expect(
      sheet.getByTestId(T.gcalDegradedInlineWarning)
    ).toBeVisible();
    await expect(sheet.getByTestId(T.sheetSectionEntries)).toBeVisible();
    await expect(sheet.getByTestId(T.sheetSectionJournal)).toBeVisible();
  });
});

test.describe("Calendar — Gcal 未連接路徑", () => {
  test("Scenario: 首次載入 → banner「尚未連接 Google Calendar」+ /settings 連結", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN 使用者未完成 gcal OAuth（後端可能回 424 或 200 + gcal_connected=false）
    // WHEN 載入 /calendar
    // THEN 頂部 banner 可見，含前往 /settings 的連結
    await page.goto("/calendar");
    const banner = page.getByTestId(T.gcalNotConnectedBanner);
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("link", { name: /設定|前往/ })).toHaveAttribute(
      "href",
      /\/settings/
    );
  });

  test("Scenario: 未連接時自動以 include_gcal=false 重試，並寫入 localStorage（TTL 1 小時）", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN 尚未連 gcal
    // WHEN 首次載入 /calendar?include_gcal=true
    // THEN
    //   - 收 424 / gcal_connected=false 後自動重試 include_gcal=false
    //   - localStorage 寫入 aibo_gcal_connected=false（含 1h TTL）
    //   - 後續重整不再打 include_gcal=true
    await page.goto("/calendar");
    const stored = await page.evaluate(() =>
      localStorage.getItem("aibo_gcal_connected")
    );
    expect(stored).toContain("false");
  });

  test("Scenario: localStorage 已記錄 not-connected → 直接以 include_gcal=false 載入", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN localStorage 已寫 aibo_gcal_connected=false（TTL 未過期）
    // WHEN 再次載入 /calendar
    // THEN 不再呼叫 include_gcal=true 的 API（避免 424 噪音）
    await page.goto("/");
    await page.evaluate(() => {
      const payload = { connected: false, expiresAt: Date.now() + 60 * 60 * 1000 };
      localStorage.setItem("aibo_gcal_connected", JSON.stringify(payload));
    });
    // 用 request interception 驗證 include_gcal 參數
    // TODO(Wave 3): page.route + assert request url 不含 include_gcal=true
    await page.goto("/calendar");
    await expect(page.getByTestId(T.gcalNotConnectedBanner)).toBeVisible();
  });

  test("Scenario: TTL 過期 → 重新嘗試 include_gcal=true", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN localStorage 中的 TTL 已過期
    // WHEN 載入 /calendar
    // THEN 重新嘗試 include_gcal=true
    await page.goto("/");
    await page.evaluate(() => {
      const payload = { connected: false, expiresAt: Date.now() - 1000 };
      localStorage.setItem("aibo_gcal_connected", JSON.stringify(payload));
    });
    // TODO(Wave 3): assert request url 含 include_gcal=true
    await page.goto("/calendar");
  });
});
