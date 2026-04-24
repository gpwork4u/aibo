/**
 * F-026c / F-027c — Gcal event 轉 entry（成功 / 409 / 502 / linked_entry_id 顯示）
 *
 * 對應 issue：#85（Wave 0 skeleton）
 * 對應 spec：
 *   - specs/features/f026-calendar-view.md §POST /events/:gcal_id/to-entry
 *   - specs/features/f027-calendar-frontend.md §Scenario: 從事件轉為 entry
 *
 * 狀態：Wave 0 — 所有 test 先 skip。
 */

import { test, expect } from "@playwright/test";
import { CALENDAR_TESTIDS as T } from "../fixtures/calendar";

test.describe("Calendar — Gcal event → Entry（F-026c + F-027c）", () => {
  test("Scenario: 成功轉換 — toast + event 卡片變「查看 entry」+ 條目列表多一筆", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN Sheet 開啟，顯示 gcal event「Standup」未關聯
    // WHEN 點該 event 卡片的「轉成 entry」
    // THEN
    //   - 呼叫 POST /api/v1/calendar/events/:gcal_id/to-entry，回 201
    //   - toast 顯示「已轉為知識條目」
    //   - 該 event 卡片變成「查看 entry #N」連結（linked_entry_id 顯示）
    //   - Sheet 條目 section 多一筆新 entry（query 重新 fetch）
    await page.goto("/calendar?view=month&date=2026-04-24");
    const eventCard = page.getByTestId(T.eventCard).first();
    await eventCard.getByTestId(T.eventToEntryButton).click();

    await expect(page.getByText(/已轉為知識條目/)).toBeVisible();
    await expect(eventCard.getByTestId(T.eventLinkedEntryLink)).toBeVisible();
  });

  test("Scenario: 重複轉（409 ALREADY_LINKED）顯示「已轉過」toast", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN event 已被轉過一次
    // WHEN 再次點「轉成 entry」（可能並發或使用者重複點）
    // THEN
    //   - 後端回 409 ALREADY_LINKED
    //   - toast 顯示「已轉過」
    //   - React Query invalidate，卡片刷新為「查看 entry #N」
    await page.goto("/calendar?view=month&date=2026-04-24");
    const eventCard = page.getByTestId(T.eventCard).first();
    await eventCard.getByTestId(T.eventToEntryButton).click();

    await expect(page.getByText(/已轉過/)).toBeVisible();
    await expect(eventCard.getByTestId(T.eventLinkedEntryLink)).toBeVisible();
  });

  test("Scenario: Gcal 上游失敗（502 GCAL_UPSTREAM_ERROR）顯示錯誤 toast", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN gcal mock 設為 500（導致後端回 502）
    // WHEN 點「轉成 entry」
    // THEN toast 顯示失敗訊息，event 卡片狀態不變
    await page.goto("/calendar?view=month&date=2026-04-24");
    const eventCard = page.getByTestId(T.eventCard).first();
    await eventCard.getByTestId(T.eventToEntryButton).click();

    await expect(page.getByText(/無法轉換|失敗|上游/)).toBeVisible();
  });

  test("Scenario: 預先已 linked 的 event 直接顯示「查看 entry」不顯示轉換按鈕", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN /calendar/days API 回傳的 events[].linked_entry_id != null
    // WHEN 開啟 Sheet
    // THEN 該 event 卡片僅顯示「查看 entry #N」連結，無「轉成 entry」按鈕
    await page.goto("/calendar?view=month&date=2026-04-24");
    const linkedCard = page.getByTestId(T.eventCard).first();
    await expect(linkedCard.getByTestId(T.eventLinkedEntryLink)).toBeVisible();
    await expect(linkedCard.getByTestId(T.eventToEntryButton)).toHaveCount(0);
  });

  test("Scenario: 點「查看 entry」跳轉到該 entry 詳情頁", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 feature 完成再啟用");

    // GIVEN event 卡片已 linked
    // WHEN 點「查看 entry #N」
    // THEN 導航到 /entries/<entry_id>
    await page.goto("/calendar?view=month&date=2026-04-24");
    const linkedCard = page.getByTestId(T.eventCard).first();
    await linkedCard.getByTestId(T.eventLinkedEntryLink).click();
    await expect(page).toHaveURL(/\/entries\/[0-9a-f-]+/);
  });
});
