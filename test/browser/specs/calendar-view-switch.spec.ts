/**
 * F-027b — month / week / day 視圖切換 + 鍵盤快捷鍵 + 手機 fallback
 *
 * 對應 issue：#85（Wave 3 完整 assertion）
 * 對應 spec：
 *   - specs/features/f027-calendar-frontend.md §Scenarios / Edge Cases
 *   - dev/frontend/lib/hooks/use-calendar-shortcuts.ts（key map: m/w/d、1/2/3、t、h/j/k/l、Arrow*）
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  CALENDAR_TESTIDS as T,
  DEFAULT_TEST_TIMEZONE,
  installCalendarMock,
  emptyMonthGrid,
  todayTaipei,
} from "../fixtures/calendar";

test.use({ timezoneId: DEFAULT_TEST_TIMEZONE });

test.describe("Calendar — 視圖切換（F-027b, desktop）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa08-view-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
    await installCalendarMock(page, { days: emptyMonthGrid(todayTaipei()) });
  });

  test("Scenario: 點 toolbar「週」tab → URL view=week, WeekView 可見", async ({ page }) => {
    await page.goto("/calendar?view=month&date=2026-04-24");
    await expect(page.getByTestId(T.monthView)).toBeVisible();

    await page.getByTestId(T.viewTabWeek).click();

    await expect(page).toHaveURL(/view=week/);
    await expect(page.getByTestId(T.weekView)).toBeVisible();
  });

  test("Scenario: 點「日」tab → URL view=day, DayView 可見", async ({ page }) => {
    await page.goto("/calendar?view=month&date=2026-04-24");
    await page.getByTestId(T.viewTabDay).click();

    await expect(page).toHaveURL(/view=day/);
    await expect(page.getByTestId(T.dayView)).toBeVisible();
  });

  test("Scenario: 鍵盤快捷鍵 m / w / d 切換視圖（URL 同步）", async ({ page }) => {
    await page.goto("/calendar?view=month&date=2026-04-24");
    await expect(page.getByTestId(T.monthView)).toBeVisible();

    // 將 focus 放在 body 以確保 hotkey 生效
    await page.locator("body").click({ position: { x: 5, y: 5 } });

    await page.keyboard.press("w");
    await expect(page).toHaveURL(/view=week/);

    await page.keyboard.press("d");
    await expect(page).toHaveURL(/view=day/);

    await page.keyboard.press("m");
    await expect(page).toHaveURL(/view=month/);
  });

  test("Scenario: 數字快捷鍵 1/2/3 也能切換視圖", async ({ page }) => {
    await page.goto("/calendar?view=month&date=2026-04-24");
    await page.locator("body").click({ position: { x: 5, y: 5 } });

    await page.keyboard.press("2");
    await expect(page).toHaveURL(/view=week/);

    await page.keyboard.press("3");
    await expect(page).toHaveURL(/view=day/);

    await page.keyboard.press("1");
    await expect(page).toHaveURL(/view=month/);
  });

  test("Scenario: 鍵盤快捷鍵 t 回到今天", async ({ page }) => {
    await page.goto("/calendar?view=month&date=2026-01-10");
    await expect(page.getByTestId(T.monthView)).toBeVisible();
    await page.locator("body").click({ position: { x: 5, y: 5 } });

    await page.keyboard.press("t");

    // today 格子出現
    await expect(page.getByTestId(T.dayCellToday).first()).toBeVisible();
    const today = todayTaipei();
    // URL date 變為今日
    await expect(page).toHaveURL(new RegExp(`date=${today}`));
  });

  test("Scenario: 切到週視圖保留原選日期（view=week）", async ({ page }) => {
    await page.goto("/calendar?view=month&date=2026-04-24");
    await page.getByTestId(T.viewTabWeek).click();

    await expect(page.getByTestId(T.weekView)).toBeVisible();
    await expect(page).toHaveURL(/date=2026-04-24/);
  });

  test("Scenario: 方向鍵（h/j/k/l/Arrow*）切換日/週/月步長", async ({ page }) => {
    await page.goto("/calendar?view=day&date=2026-04-24");
    await expect(page.getByTestId(T.dayView)).toBeVisible();
    await page.locator("body").click({ position: { x: 5, y: 5 } });

    // 右方向：下一步（day = +1 天）
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/date=2026-04-25/);

    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(/date=2026-04-24/);

    // vim 風格：j = next, k = prev
    await page.keyboard.press("j");
    await expect(page).toHaveURL(/date=2026-04-25/);

    await page.keyboard.press("k");
    await expect(page).toHaveURL(/date=2026-04-24/);
  });
});

test.describe("Calendar — 手機版 fallback（F-027b）", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa08-mobile-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
    await installCalendarMock(page, { days: emptyMonthGrid(todayTaipei()) });
  });

  test("Scenario: viewport < 768px 自動切 day view + toolbar 隱藏 view tabs", async ({
    page,
  }) => {
    await page.goto("/calendar");
    // isMobile 讓 view 強制為 day，DayView 可見
    await expect(page.getByTestId(T.dayView)).toBeVisible();
    // view tabs 隱藏（toolbar 有 hideViewTabs prop）
    await expect(page.getByTestId(T.viewTabs)).toBeHidden();
  });
});
