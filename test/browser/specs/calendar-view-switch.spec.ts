/**
 * F-027b — month / week / day 視圖切換 + 鍵盤快捷鍵 + 手機 fallback
 *
 * 對應 issue：#85（Wave 0 skeleton）
 * 對應 spec：
 *   - specs/features/f027-calendar-frontend.md §Scenarios / Edge Cases
 *
 * 狀態：Wave 0 — 所有 test 先 skip。
 */

import { test, expect } from "@playwright/test";
import { CALENDAR_TESTIDS as T } from "../fixtures/calendar";

test.describe("Calendar — 視圖切換（F-027b）", () => {
  test("Scenario: 點 toolbar「週」tab 切到週視圖，URL 同步", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN 月視圖
    // WHEN 點擊「週」tab
    // THEN URL view=week，畫面渲染 WeekView
    await page.goto("/calendar?view=month&date=2026-04-24");
    await page.getByTestId(T.viewTabWeek).click();
    await expect(page).toHaveURL(/view=week/);
    await expect(page.getByTestId(T.weekView)).toBeVisible();
  });

  test("Scenario: 點「日」tab 切到日視圖", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    await page.goto("/calendar?view=month&date=2026-04-24");
    await page.getByTestId(T.viewTabDay).click();
    await expect(page).toHaveURL(/view=day/);
    await expect(page.getByTestId(T.dayView)).toBeVisible();
  });

  test("Scenario: 鍵盤快捷鍵 m / w / d 切換視圖", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // WHEN 分別按下 m/w/d
    // THEN view 切換到 month/week/day，URL 同步
    await page.goto("/calendar");
    await page.keyboard.press("w");
    await expect(page).toHaveURL(/view=week/);
    await page.keyboard.press("d");
    await expect(page).toHaveURL(/view=day/);
    await page.keyboard.press("m");
    await expect(page).toHaveURL(/view=month/);
  });

  test("Scenario: 鍵盤快捷鍵 t 回到今天", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN 切到 2026-01
    // WHEN 按下 t
    // THEN URL date 變為今日，today 格高亮可見
    await page.goto("/calendar?view=month&date=2026-01-10");
    await page.keyboard.press("t");
    await expect(page.getByTestId(T.dayCellToday)).toBeVisible();
  });

  test("Scenario: 切到週視圖保留原選日期所在週", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN 月視圖選中 2026-04-24（週五）
    // WHEN 切換到 week
    // THEN 顯示該週（週一 2026-04-20 ~ 週日 2026-04-26）
    await page.goto("/calendar?view=month&date=2026-04-24");
    await page.getByTestId(T.viewTabWeek).click();
    await expect(page.getByTestId(T.weekView)).toBeVisible();
    // TODO(Wave 3): assert 週視圖顯示的起始日 = 2026-04-20
  });

  test("Scenario: 左右方向鍵切換日", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // WHEN 按右方向鍵
    // THEN 選日往後 1 天；URL date 同步
    await page.goto("/calendar?view=day&date=2026-04-24");
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/date=2026-04-25/);
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(/date=2026-04-24/);
  });
});

test.describe("Calendar — 手機版 fallback（F-027b）", () => {
  // 以 viewport override 模擬手機
  test.use({ viewport: { width: 390, height: 844 } });

  test("Scenario: viewport < 768px 自動切 day view + toolbar 隱藏 view tabs", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // WHEN 以手機尺寸訪問 /calendar
    // THEN
    //   - 自動切到 view=day
    //   - toolbar 的 view tabs 隱藏
    await page.goto("/calendar");
    await expect(page).toHaveURL(/view=day/);
    await expect(page.getByTestId(T.viewTabs)).toBeHidden();
  });
});
