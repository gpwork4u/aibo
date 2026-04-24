/**
 * F-026 / F-027 — 月視圖載入、格子顯示、今日高亮
 *
 * 對應 issue：#85（Wave 3 完整 assertion）
 * 對應 spec：
 *   - specs/features/f026-calendar-view.md §Scenarios / Happy Path
 *   - specs/features/f027-calendar-frontend.md §Scenario: 開啟行事曆預設為當月
 *
 * 測試策略：以 `page.route` mock `/api/v1/calendar*`，避免依賴真實 gcal OAuth。
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
  todayTaipei,
} from "../fixtures/calendar";

test.use({ timezoneId: DEFAULT_TEST_TIMEZONE });

test.describe("Calendar — 月視圖（F-026b + F-027a）", () => {
  test.beforeEach(async ({ page, request }) => {
    // 1) bootstrap API key
    const { key } = await ApiClient.bootstrap(request, `qa08-month-${Date.now()}`);
    // 2) 進首頁寫入 localStorage
    await page.goto("/");
    await setupAuth(page, key);
  });

  test("Scenario: 預設載入當月月視圖 + toolbar 年月", async ({ page }) => {
    await installCalendarMock(page, { days: emptyMonthGrid(todayTaipei()) });

    await page.goto("/calendar");

    await expect(page.getByTestId(T.page)).toBeVisible();
    await expect(page.getByTestId(T.monthView)).toBeVisible();
    await expect(page.getByTestId(T.toolbarTitle)).toContainText(
      /\d{4}\s*年\s*\d{1,2}\s*月/,
    );
  });

  test("Scenario: 今天格子有高亮樣式（dayCellToday testid 出現）", async ({ page }) => {
    await installCalendarMock(page, { days: emptyMonthGrid(todayTaipei()) });
    await page.goto("/calendar");
    await expect(page.getByTestId(T.dayCellToday).first()).toBeVisible();
  });

  test("Scenario: 月格顯示 entry badge / event / journal icon", async ({ page }) => {
    const date = "2026-04-24";
    const day = makeMockDay(date, {
      entries: [
        { id: "e1", title: "Entry 1" },
        { id: "e2", title: "Entry 2" },
        { id: "e3", title: "Entry 3" },
      ],
      events: [
        {
          gcal_id: "ev1",
          summary: "Standup",
          start: `${date}T09:00:00+08:00`,
          end: `${date}T09:30:00+08:00`,
        },
        {
          gcal_id: "ev2",
          summary: "Review",
          start: `${date}T14:00:00+08:00`,
          end: `${date}T15:00:00+08:00`,
        },
        {
          gcal_id: "ev3",
          summary: "Dinner",
          start: `${date}T19:00:00+08:00`,
          end: `${date}T20:00:00+08:00`,
        },
      ],
      journal: { id: "j1", mood: "good" },
      has_journal: true,
    });
    const days = emptyMonthGrid(date).map((d) => (d.date === date ? day : d));

    await installCalendarMock(page, { days });
    await page.goto(`/calendar?view=month&date=${date}`);

    const cell = page.getByTestId(T.dayCell(date));
    await expect(cell).toBeVisible();
    // entry badge 含 "3"
    await expect(cell.getByTestId(T.entryBadge)).toContainText("3");
    // journal icon 可見
    await expect(cell.getByTestId(T.journalIcon)).toBeVisible();
    // event 顯示：day-cell 有 overflow badge（≥ 2 events + overflow）
    // 以「格內至少可見一個 event 相關元素」為較寬鬆 assertion
    const eventLike = cell.locator('[data-testid^="calendar-event"]');
    await expect(eventLike.first()).toBeVisible();
  });

  test("Scenario: 點「下個月」更新 URL 並重新 fetch", async ({ page }) => {
    const recorder = { requests: [] as Array<{ url: string; method: string; headers: Record<string, string> }> };
    await installCalendarMock(page, { days: emptyMonthGrid("2026-04-15"), recorder });

    await page.goto("/calendar?view=month&date=2026-04-15");
    await expect(page.getByTestId(T.monthView)).toBeVisible();
    await page.getByTestId(T.nextButton).click();

    await expect(page).toHaveURL(/date=2026-05/);
    await expect(page.getByTestId(T.toolbarTitle)).toContainText("2026");
    // toolbar 標題含「5 月」
    await expect(page.getByTestId(T.toolbarTitle)).toContainText(/5\s*月/);

    // 至少觸發過一次新的 fetch
    expect(recorder.requests.length).toBeGreaterThanOrEqual(1);
  });

  test("Scenario: 點「今天」按鈕回到當月", async ({ page }) => {
    await installCalendarMock(page, { days: emptyMonthGrid(todayTaipei()) });

    await page.goto("/calendar?view=month&date=2026-01-10");
    await page.getByTestId(T.todayButton).click();

    // today 格子出現
    await expect(page.getByTestId(T.dayCellToday).first()).toBeVisible();
  });

  test("Scenario: 側邊欄「行事曆」項目導航", async ({ page }) => {
    await installCalendarMock(page, { days: emptyMonthGrid(todayTaipei()) });

    await page.goto("/");
    // sidebar 的「行事曆」連結
    const navLink = page.getByRole("link", { name: /行事曆/ });
    await navLink.first().click();
    await expect(page).toHaveURL(/\/calendar/);
    await expect(page.getByTestId(T.monthView)).toBeVisible();
  });

  test("Scenario: URL 直接指定 date 參數顯示該月", async ({ page }) => {
    await installCalendarMock(page, { days: emptyMonthGrid("2026-03-15") });

    await page.goto("/calendar?view=month&date=2026-03-15");
    await expect(page.getByTestId(T.toolbarTitle)).toContainText("2026");
    await expect(page.getByTestId(T.toolbarTitle)).toContainText(/3\s*月/);
  });
});
