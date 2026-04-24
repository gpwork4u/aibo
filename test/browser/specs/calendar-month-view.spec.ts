/**
 * F-026 / F-027 — 月視圖載入、格子顯示、今日高亮
 *
 * 對應 issue：#85（Wave 0 skeleton）
 * 對應 spec：
 *   - specs/features/f026-calendar-view.md §Scenarios / Happy Path
 *   - specs/features/f027-calendar-frontend.md §Scenario: 開啟行事曆預設為當月
 *
 * 狀態：Wave 0 — 所有 test 先 skip，等 Wave 1/2 feature 完成後由 Wave 3 補 assertion。
 */

import { test, expect } from "@playwright/test";
import { CALENDAR_TESTIDS as T } from "../fixtures/calendar";

test.describe("Calendar — 月視圖（F-026b + F-027a）", () => {
  test("Scenario: 預設載入當月月視圖 + toolbar 年月", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // WHEN 使用者 navigate 到 /calendar
    // THEN
    //   - 顯示 6×7 月視圖
    //   - toolbar 顯示「<當前年> 年 <當前月> 月」
    //   - 已呼叫 GET /api/v1/calendar?since=...&until=...&view=month
    //   - request header 含 X-Timezone=<browser tz>
    await page.goto("/calendar");
    await expect(page.getByTestId(T.monthView)).toBeVisible();
    await expect(page.getByTestId(T.toolbarTitle)).toContainText(/\d{4}\s*年\s*\d{1,2}\s*月/);
  });

  test("Scenario: 今天格子有高亮樣式", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // WHEN 月視圖渲染完成
    // THEN 當日格子帶有 data-testid="calendar-day-cell-today" 或 aria-current="date"
    await page.goto("/calendar");
    await expect(page.getByTestId(T.dayCellToday)).toBeVisible();
  });

  test("Scenario: 月格顯示 entry badge / event title / journal icon", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN 2026-04-24 有 3 筆 entries + 3 筆 gcal events + 1 筆 journal
    // WHEN 載入 /calendar?view=month&date=2026-04-24
    // THEN 該格：
    //   - entry badge 顯示「3」
    //   - 前 2 個 event title 可見
    //   - 第 3 個以「+1」overflow badge 呈現
    //   - journal icon 可見
    await page.goto("/calendar?view=month&date=2026-04-24");
    const cell = page.getByTestId(T.dayCell("2026-04-24"));
    await expect(cell.getByTestId(T.entryBadge)).toContainText("3");
    await expect(cell.getByTestId(T.eventBadge)).toHaveCount(2);
    await expect(cell.getByTestId(T.eventOverflowBadge)).toContainText("+1");
    await expect(cell.getByTestId(T.journalIcon)).toBeVisible();
  });

  test("Scenario: 點「下個月」/「上個月」更新 URL 並重新 fetch", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // WHEN 點「下個月」
    // THEN URL date 參數往後 1 個月，toolbar 年月更新
    await page.goto("/calendar?view=month&date=2026-04-15");
    await page.getByTestId(T.nextButton).click();
    await expect(page).toHaveURL(/date=2026-05/);
    await expect(page.getByTestId(T.toolbarTitle)).toContainText("2026 年 5 月");
  });

  test("Scenario: 點「今天」按鈕回到當月", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN 使用者已切到 2026-01
    // WHEN 點「今天」
    // THEN URL date 參數變為當日，月視圖切回當月
    await page.goto("/calendar?view=month&date=2026-01-10");
    await page.getByTestId(T.todayButton).click();
    await expect(page.getByTestId(T.dayCellToday)).toBeVisible();
  });

  test("Scenario: 側邊欄「行事曆」項目導航 + active 樣式", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // WHEN 點 sidebar「行事曆」
    // THEN 導航到 /calendar，該 nav item 取得 active 樣式
    await page.goto("/");
    await page.getByRole("link", { name: /行事曆/ }).click();
    await expect(page).toHaveURL(/\/calendar/);
  });

  test("Scenario: URL 直接指定 date 參數可正確顯示該月", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // WHEN 直接訪問 /calendar?view=month&date=2026-03-15
    // THEN 顯示 2026-03 月視圖，toolbar 標題為「2026 年 3 月」
    await page.goto("/calendar?view=month&date=2026-03-15");
    await expect(page.getByTestId(T.toolbarTitle)).toContainText("2026 年 3 月");
  });
});
