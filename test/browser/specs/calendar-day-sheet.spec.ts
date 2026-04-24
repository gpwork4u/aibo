/**
 * F-027c — DayDetailSheet 開啟 / 三區渲染 / URL 同步
 *
 * 對應 issue：#85（Wave 0 skeleton）
 * 對應 spec：
 *   - specs/features/f027-calendar-frontend.md §Scenario: 點日期開啟側邊詳情
 *   - specs/features/f026-calendar-view.md §Scenario: 取得單日詳情
 *
 * 狀態：Wave 0 — 所有 test 先 skip。
 */

import { test, expect } from "@playwright/test";
import { CALENDAR_TESTIDS as T } from "../fixtures/calendar";

test.describe("Calendar — Day Detail Sheet（F-027c）", () => {
  test("Scenario: 點月格 → Sheet 滑出 + URL date 同步", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // WHEN 在月視圖點擊 2026-04-24 的格子
    // THEN
    //   - 右側 Sheet 滑出（visible）
    //   - URL 更新為 ?view=month&date=2026-04-24
    //   - 已呼叫 GET /api/v1/calendar/days/2026-04-24
    await page.goto("/calendar?view=month&date=2026-04-01");
    await page.getByTestId(T.dayCell("2026-04-24")).click();
    await expect(page.getByTestId(T.sheet)).toBeVisible();
    await expect(page).toHaveURL(/date=2026-04-24/);
  });

  test("Scenario: Sheet 三區（條目 / 事件 / 日記）全部渲染", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN 2026-04-24 有 entries + events + journal
    // WHEN 開啟該日 Sheet
    // THEN 三個 section 皆可見，且分別顯示對應資料筆數
    await page.goto("/calendar?view=month&date=2026-04-24");
    await page.getByTestId(T.dayCell("2026-04-24")).click();
    const sheet = page.getByTestId(T.sheet);
    await expect(sheet.getByTestId(T.sheetSectionEntries)).toBeVisible();
    await expect(sheet.getByTestId(T.sheetSectionEvents)).toBeVisible();
    await expect(sheet.getByTestId(T.sheetSectionJournal)).toBeVisible();
  });

  test("Scenario: URL 直接帶 date 可直接開 Sheet", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // WHEN 直接訪問 /calendar?view=month&date=2026-04-24
    // THEN Sheet 已開啟（自動 open）
    await page.goto("/calendar?view=month&date=2026-04-24");
    await expect(page.getByTestId(T.sheet)).toBeVisible();
  });

  test("Scenario: 按 Esc 關閉 Sheet + 清除 URL date 參數", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN Sheet 已開啟
    // WHEN 按 Esc
    // THEN Sheet 關閉，URL 移除 date 參數
    await page.goto("/calendar?view=month&date=2026-04-24");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId(T.sheet)).toBeHidden();
    await expect(page).not.toHaveURL(/date=2026-04-24/);
  });

  test("Scenario: 點遮罩關閉 Sheet", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN Sheet 已開啟
    // WHEN 點擊 overlay
    // THEN Sheet 關閉，URL date 被清
    await page.goto("/calendar?view=month&date=2026-04-24");
    await page.getByTestId(T.sheetClose).click();
    await expect(page.getByTestId(T.sheet)).toBeHidden();
  });

  test("Scenario: Sheet 內「寫日記」CTA 跳 F-028 Journal 頁", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN Sheet 開啟，且當日沒有 journal
    // WHEN 點「寫日記」
    // THEN 跳轉到 /journal/2026-04-24（或相當路徑，以 F-028 為準）
    await page.goto("/calendar?view=month&date=2026-04-24");
    await page.getByTestId(T.sheetWriteJournalButton).click();
    await expect(page).toHaveURL(/\/journal/);
  });
});
