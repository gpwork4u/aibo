/**
 * F-026b — Asia/Taipei 時區下跨日 entry / event 分桶
 *
 * 對應 issue：#85（Wave 3 完整 assertion）
 * 對應 spec：
 *   - specs/features/f026-calendar-view.md §Scenario: 不同時區下的日期歸屬
 *   - specs/features/f026-calendar-view.md §Business Rules #1
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  CALENDAR_TESTIDS as T,
  DEFAULT_TEST_TIMEZONE,
  installCalendarMock,
  makeMockDay,
  emptyMonthGrid,
} from "../fixtures/calendar";

// 固定瀏覽器時區到 Asia/Taipei
test.use({ timezoneId: DEFAULT_TEST_TIMEZONE });

test.describe("Calendar — 時區分桶（F-026b, Asia/Taipei）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa08-tz-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
  });

  test("Scenario: 23:30 entry 歸屬於當日（Taipei tz）", async ({ page }) => {
    const D = "2026-04-24";
    // mock 端已按 Asia/Taipei 分桶過：把 entry 放在 2026-04-24 格
    const day = makeMockDay(D, {
      entries: [
        {
          id: "late-entry",
          title: "深夜筆記",
          created_at: `${D}T23:30:00+08:00`,
        },
      ],
    });
    const days = emptyMonthGrid(D).map((d) => (d.date === D ? day : d));
    await installCalendarMock(page, { days });

    await page.goto(`/calendar?view=month&date=${D}`);

    const cell = page.getByTestId(T.dayCell(D));
    await expect(cell).toBeVisible();
    await expect(cell.getByTestId(T.entryBadge)).toContainText(/[1-9]/);
  });

  test("Scenario: 跨午夜 event（23:30–00:30）在 24 與 25 兩格都出現", async ({ page }) => {
    const D24 = "2026-04-24";
    const D25 = "2026-04-25";

    // 兩天都放同一筆 event（呼應 spec §分桶規則：跨日 event 在每個覆蓋的日期都出現）
    const evt = {
      gcal_id: "cross-midnight",
      summary: "跨日會議",
      start: `${D24}T23:30:00+08:00`,
      end: `${D25}T00:30:00+08:00`,
    };
    const day24 = makeMockDay(D24, { events: [evt] });
    const day25 = makeMockDay(D25, { events: [evt] });
    const days = emptyMonthGrid(D24).map((d) => {
      if (d.date === D24) return day24;
      if (d.date === D25) return day25;
      return d;
    });

    await installCalendarMock(page, { days });
    await page.goto(`/calendar?view=month&date=${D24}`);
    await expect(page.getByTestId(T.monthView)).toBeVisible();

    const cell24 = page.getByTestId(T.dayCell(D24));
    const cell25 = page.getByTestId(T.dayCell(D25));

    await expect(cell24).toBeVisible();
    await expect(cell25).toBeVisible();
    // 兩格都有至少一個 event 元素
    await expect(cell24.locator('[data-testid^="calendar-event"]').first()).toBeVisible();
    await expect(cell25.locator('[data-testid^="calendar-event"]').first()).toBeVisible();
  });

  test("Scenario: X-Timezone header = Asia/Taipei", async ({ page }) => {
    const recorder = { requests: [] as Array<{ url: string; method: string; headers: Record<string, string> }> };

    await installCalendarMock(page, {
      days: emptyMonthGrid("2026-04-24"),
      recorder,
    });

    await page.goto("/calendar?view=month&date=2026-04-24");
    await expect(page.getByTestId(T.monthView)).toBeVisible();
    await page.waitForTimeout(500);

    const calendarReqs = recorder.requests.filter(
      (r) => r.method === "GET" && /\/api\/v1\/calendar(\?|$|\/days)/.test(r.url),
    );
    expect(calendarReqs.length).toBeGreaterThan(0);
    // 至少一個 request header 帶 X-Timezone
    const hasTz = calendarReqs.some(
      (r) => (r.headers["x-timezone"] ?? "") === "Asia/Taipei",
    );
    expect(hasTz).toBeTruthy();
  });

  test("Scenario: 跨日 event 在 day view 的 2026-04-25 也可見", async ({ page }) => {
    const D25 = "2026-04-25";
    const evt = {
      gcal_id: "cross-into-25",
      summary: "跨日續",
      start: `2026-04-24T23:30:00+08:00`,
      end: `${D25}T00:30:00+08:00`,
    };
    const day25 = makeMockDay(D25, { events: [evt] });
    const days = emptyMonthGrid(D25).map((d) => (d.date === D25 ? day25 : d));

    await installCalendarMock(page, {
      days,
      dayDetails: { [D25]: day25 },
    });

    await page.goto(`/calendar?view=day&date=${D25}&sheet=${D25}`);
    const sheet = page.getByTestId(T.sheet);
    await expect(sheet).toBeVisible();

    const eventsSection = sheet.getByTestId(T.sheetSectionEvents);
    await expect(eventsSection).toBeVisible();
    await expect(eventsSection.getByTestId(T.eventCard).first()).toBeVisible();
  });
});
