/**
 * F-026b / F-027a / F-027c — Gcal 降級 + 未連接路徑
 *
 * 對應 issue：#85（Wave 3 完整 assertion）
 * 對應 spec：
 *   - specs/features/f026-calendar-view.md §Scenario: gcal 上游失敗走 degraded
 *   - specs/features/f026-calendar-view.md §Scenario: 未連 gcal 但要求 include_gcal
 *   - specs/features/f027-calendar-frontend.md §Error Handling
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  CALENDAR_TESTIDS as T,
  DEFAULT_TEST_TIMEZONE,
  installCalendarMock,
  emptyMonthGrid,
  makeMockDay,
  todayTaipei,
} from "../fixtures/calendar";

test.use({ timezoneId: DEFAULT_TEST_TIMEZONE });

const CACHE_KEY = "aibo_gcal_connected";

test.describe("Calendar — Gcal Degraded（X-Degraded: gcal）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa08-degrade-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
  });

  test("Scenario: 上游 500 → degraded toast 出現 + entries 正常顯示", async ({ page }) => {
    await installCalendarMock(page, {
      days: emptyMonthGrid(todayTaipei()),
      degraded: true,
    });

    await page.goto("/calendar");
    await expect(page.getByTestId(T.monthView)).toBeVisible();

    // sonner toast 文字
    await expect(
      page.getByText(/Google Calendar 暫時無法載入|僅顯示知識條目/),
    ).toBeVisible({ timeout: 5000 });
  });

  test("Scenario: Degraded 下開 Day Sheet，事件 section 顯示 inline warning", async ({
    page,
  }) => {
    const TARGET = "2026-04-24";
    const day = makeMockDay(TARGET, {
      entries: [{ id: "e1", title: "Still visible" }],
      events: [],
    });
    const days = emptyMonthGrid(TARGET).map((d) =>
      d.date === TARGET ? day : d,
    );

    await installCalendarMock(page, {
      days,
      dayDetails: { [TARGET]: day },
      degraded: true,
    });

    await page.goto(`/calendar?view=month&date=${TARGET}&sheet=${TARGET}`);
    const sheet = page.getByTestId(T.sheet);
    await expect(sheet).toBeVisible();

    await expect(sheet.getByTestId(T.gcalDegradedInlineWarning)).toBeVisible();
    // entries / journal 仍渲染
    await expect(sheet.getByTestId(T.sheetSectionEntries)).toBeVisible();
    await expect(sheet.getByTestId(T.sheetSectionJournal)).toBeVisible();
  });
});

test.describe("Calendar — Gcal 未連接路徑", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa08-notconn-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
    // 清掉先前可能殘留的快取
    await page.evaluate((k) => localStorage.removeItem(k), CACHE_KEY);
  });

  test("Scenario: gcal_connected=false → 頂部 banner 可見", async ({ page }) => {
    await installCalendarMock(page, {
      days: emptyMonthGrid(todayTaipei()),
      notConnected: "flag",
    });

    await page.goto("/calendar");
    await expect(page.getByTestId(T.monthView)).toBeVisible();

    const banner = page.getByTestId(T.gcalNotConnectedBanner).first();
    await expect(banner).toBeVisible();
  });

  test("Scenario: 回傳 gcal_connected=false → localStorage 寫入 aibo_gcal_connected", async ({
    page,
  }) => {
    await installCalendarMock(page, {
      days: emptyMonthGrid(todayTaipei()),
      notConnected: "flag",
    });

    await page.goto("/calendar");
    await expect(page.getByTestId(T.monthView)).toBeVisible();
    // 等待 banner 出現，確認 query 已完成
    await expect(page.getByTestId(T.gcalNotConnectedBanner).first()).toBeVisible();

    const stored = await page.evaluate(
      (k) => localStorage.getItem(k),
      CACHE_KEY,
    );
    expect(stored).toBeTruthy();
    expect(stored).toContain("false");
    // TTL 欄位名稱「until」
    expect(stored).toMatch(/"until"\s*:\s*\d+/);
  });

  test("Scenario: localStorage 已記錄 not-connected + TTL 未過期 → 後續請求 include_gcal=false", async ({
    page,
  }) => {
    const recorder = { requests: [] as Array<{ url: string; method: string; headers: Record<string, string> }> };

    await installCalendarMock(page, {
      days: emptyMonthGrid(todayTaipei()),
      notConnected: "flag",
      recorder,
    });

    // 先設 cache
    await page.goto("/");
    await page.evaluate(
      ([k, payload]) => {
        localStorage.setItem(k, payload);
      },
      [
        CACHE_KEY,
        JSON.stringify({
          connected: false,
          until: Date.now() + 60 * 60 * 1000,
        }),
      ],
    );

    await page.goto("/calendar");
    await expect(page.getByTestId(T.monthView)).toBeVisible();
    // 等 query 發出
    await page.waitForTimeout(500);

    // 找出至少一個對 /calendar 的 request，確認 include_gcal 參數
    const calendarGets = recorder.requests.filter(
      (r) => r.method === "GET" && /\/api\/v1\/calendar(\?|$)/.test(r.url),
    );
    expect(calendarGets.length).toBeGreaterThan(0);
    // 檢查所有 GET 皆為 include_gcal=false（避免再打 true 觸發 424）
    for (const req of calendarGets) {
      const sp = new URL(req.url).searchParams;
      expect(sp.get("include_gcal")).toBe("false");
    }
  });

  test("Scenario: TTL 過期 → 重新嘗試 include_gcal=true", async ({ page }) => {
    const recorder = { requests: [] as Array<{ url: string; method: string; headers: Record<string, string> }> };

    await installCalendarMock(page, {
      days: emptyMonthGrid(todayTaipei()),
      notConnected: "flag",
      recorder,
    });

    await page.goto("/");
    // 寫入已過期 cache
    await page.evaluate(
      ([k, payload]) => localStorage.setItem(k, payload),
      [
        CACHE_KEY,
        JSON.stringify({ connected: false, until: Date.now() - 1000 }),
      ],
    );

    await page.goto("/calendar");
    await expect(page.getByTestId(T.monthView)).toBeVisible();
    await page.waitForTimeout(500);

    const calendarGets = recorder.requests.filter(
      (r) => r.method === "GET" && /\/api\/v1\/calendar(\?|$)/.test(r.url),
    );
    expect(calendarGets.length).toBeGreaterThan(0);
    // TTL 過期 → 至少第一次會打 include_gcal=true（或未帶參數 = 預設 true）
    const firstReq = calendarGets[0];
    const sp = new URL(firstReq.url).searchParams;
    const includeGcal = sp.get("include_gcal");
    // 未指定（undefined）或 true 皆為 OK（未快取狀態，hook 預設 true）
    expect(includeGcal === null || includeGcal === "true").toBeTruthy();
  });
});
