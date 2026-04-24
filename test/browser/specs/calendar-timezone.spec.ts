/**
 * F-026b — Asia/Taipei 時區下跨日 entry / event 分桶
 *
 * 對應 issue：#85（Wave 0 skeleton）
 * 對應 spec：
 *   - specs/features/f026-calendar-view.md §Scenario: 不同時區下的日期歸屬
 *   - specs/features/f026-calendar-view.md §Business Rules #1
 *
 * 狀態：Wave 0 — 所有 test 先 skip。
 */

import { test, expect } from "@playwright/test";
import { CALENDAR_TESTIDS as T, DEFAULT_TEST_TIMEZONE } from "../fixtures/calendar";

// 固定瀏覽器時區到 Asia/Taipei，讓 X-Timezone header 固定
test.use({ timezoneId: DEFAULT_TEST_TIMEZONE });

test.describe("Calendar — 時區分桶（F-026b, Asia/Taipei）", () => {
  test("Scenario: 23:30 建立的 entry 歸屬於當日（非隔日 UTC）", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN entry created_at = 2026-04-24T23:30:00+08:00
    //   （對應 UTC 2026-04-24T15:30:00Z —— 若誤用 UTC 會歸到 04-24，仍正確；
    //    但若 created_at = 2026-04-25T00:30:00+08:00，UTC 是 04-24T16:30Z，
    //    需 Asia/Taipei 才能正確歸到 04-25）
    // WHEN 以 X-Timezone: Asia/Taipei 載入該月
    // THEN 2026-04-24 格的 entry_count 包含該 entry
    await page.goto("/calendar?view=month&date=2026-04-24");
    const cell = page.getByTestId(T.dayCell("2026-04-24"));
    await expect(cell.getByTestId(T.entryBadge)).toContainText(/[1-9]/);
  });

  test("Scenario: 跨午夜 event（23:30–00:30）在 24 與 25 兩格都顯示", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN event start=2026-04-24T23:30+08:00, end=2026-04-25T00:30+08:00
    // WHEN 載入月視圖，X-Timezone: Asia/Taipei
    // THEN 2026-04-24 與 2026-04-25 兩格的 events 皆含該 event
    await page.goto("/calendar?view=month&date=2026-04-24");
    const day24 = page.getByTestId(T.dayCell("2026-04-24"));
    const day25 = page.getByTestId(T.dayCell("2026-04-25"));
    await expect(day24.getByTestId(T.eventBadge).first()).toBeVisible();
    await expect(day25.getByTestId(T.eventBadge).first()).toBeVisible();
  });

  test("Scenario: 跨日 event 在 day view 的 2026-04-25 Sheet 中仍可見", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN event 23:30–00:30 跨越 04-24 → 04-25
    // WHEN 以 view=day&date=2026-04-25 載入
    // THEN Sheet 事件 section 含該 event
    await page.goto("/calendar?view=day&date=2026-04-25");
    await expect(
      page.getByTestId(T.sheetSectionEvents).getByTestId(T.eventCard).first()
    ).toBeVisible();
  });

  test("Scenario: X-Timezone header 為 Asia/Taipei（由瀏覽器 timezoneId 決定）", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // WHEN 載入 /calendar
    // THEN 所有對 /api/v1/calendar* 的 request header X-Timezone = Asia/Taipei
    // TODO(Wave 3): 用 page.route 攔截 request，assert header
    const requests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/v1/calendar")) {
        requests.push(req.headers()["x-timezone"] ?? "");
      }
    });
    await page.goto("/calendar");
    expect(requests.length).toBeGreaterThan(0);
    expect(requests[0]).toBe("Asia/Taipei");
  });
});
