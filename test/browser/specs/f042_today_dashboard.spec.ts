/**
 * F-042: Today Dashboard
 *
 * Spec: specs/features/f042-today-dashboard.md
 * Issue: #208
 * QA Issue: #211
 *
 * 涵蓋 Sprint 14 QA scenarios：
 * - 載入完整 Today 頁面（4 個 sections 全顯示）
 * - 今日無日記時顯示 CTA
 * - 點擊 Journal Edit → 導向 /today/journal
 * - GCal 未連線時 CalendarSection 不顯示
 * - Tasks API 500 時只影響 TasksSection，其他 section 正常
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";

const FEATURE = "F-042";

const TODAY_DATE = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

test.describe(`[${FEATURE}] Today Dashboard`, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
  });

  // --- Happy Path ---

  test("TD-1 載入完整 Today 頁面：4 個 sections 全顯示，無全頁 loading spinner", async ({
    page,
  }) => {
    test.skip(true, "skeleton：等 F-042 TodayPage + 4 sections 實作");

    // Mock 所有 Today 頁面需要的 APIs
    await page.route(`**/api/v1/journal/${TODAY_DATE}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ date: TODAY_DATE, content: "Today's journal content", exists: true }),
      });
    });

    await page.route(`**/api/v1/calendar/days/${TODAY_DATE}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          events: [
            { id: "ev-1", title: "Standup", start: `${TODAY_DATE}T09:00:00`, end: `${TODAY_DATE}T09:30:00` },
            { id: "ev-2", title: "Planning", start: `${TODAY_DATE}T14:00:00`, end: `${TODAY_DATE}T15:00:00` },
          ],
        }),
      });
    });

    await page.route("**/api/v1/tasks*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            { id: "task-1", title: "Write tests", status: "pending", due_date: TODAY_DATE, priority: "high" },
            { id: "task-2", title: "Review PR", status: "pending", due_date: TODAY_DATE, priority: "medium" },
            { id: "task-3", title: "Deploy", status: "pending", due_date: TODAY_DATE, priority: "low" },
          ],
        }),
      });
    });

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: "entry-1", title: "New finding", status: "inbox", created_at: `${TODAY_DATE}T10:00:00Z` }],
          total: 1,
          page: 1,
          per_page: 5,
        }),
      });
    });

    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    // THEN 全部 4 個 sections 顯示
    await expect(page.getByTestId("journal-section")).toBeVisible();
    await expect(page.getByTestId("calendar-section")).toBeVisible();
    await expect(page.getByTestId("tasks-section")).toBeVisible();
    await expect(page.getByTestId("recent-entries-section")).toBeVisible();

    // AND 無全頁 loading spinner
    await expect(page.getByTestId("page-loading-spinner")).not.toBeVisible();
  });

  test("TD-2 今日無日記：JournalSection 顯示 'Start today's journal' CTA", async ({ page }) => {
    test.skip(true, "skeleton：等 F-042 JournalSection empty state + CTA 實作");

    // Journal API 回傳 404（今日尚無日記）
    await page.route(`**/api/v1/journal/${TODAY_DATE}`, (route) => {
      route.fulfill({ status: 404, body: JSON.stringify({ error: "not found" }) });
    });

    await page.route("**/api/v1/tasks*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
    });

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 5 }),
      });
    });

    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    // THEN JournalSection 顯示 CTA
    await expect(page.getByText(/start today's journal/i)).toBeVisible();
  });

  test("TD-3 點擊 JournalSection Edit → 導向 /today/journal", async ({ page }) => {
    test.skip(true, "skeleton：等 F-042 JournalSection Edit 按鈕實作");

    await page.route(`**/api/v1/journal/${TODAY_DATE}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ date: TODAY_DATE, content: "Some content", exists: true }),
      });
    });

    await page.route("**/api/v1/tasks*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
    });

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 5 }),
      });
    });

    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    // WHEN 點擊 JournalSection "Edit" 按鈕
    await page.getByTestId("journal-section").getByRole("button", { name: /edit/i }).click();

    // THEN 導向 /today/journal
    await expect(page).toHaveURL(/\/today\/journal/);
  });

  // --- Error Handling ---

  test("TD-4 GCal 未連線：CalendarSection 不顯示（不報 error）", async ({ page }) => {
    test.skip(true, "skeleton：等 F-042 CalendarSection 條件渲染（GCal 整合狀態）實作");

    await page.route(`**/api/v1/journal/${TODAY_DATE}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ date: TODAY_DATE, content: "Journal content", exists: true }),
      });
    });

    // GCal calendar API 回傳 401（未連線）
    await page.route(`**/api/v1/calendar/**`, (route) => {
      route.fulfill({ status: 401, body: JSON.stringify({ error: "gcal_not_connected" }) });
    });

    await page.route("**/api/v1/tasks*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
    });

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 5 }),
      });
    });

    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    // THEN CalendarSection 不顯示
    await expect(page.getByTestId("calendar-section")).not.toBeVisible();

    // AND 沒有 error 訊息（靜默隱藏）
    await expect(page.getByText(/gcal.*error|calendar.*failed/i)).not.toBeVisible();
  });

  test("TD-5 Tasks API 500：只有 TasksSection 顯示 error，其他 section 正常", async ({ page }) => {
    test.skip(true, "skeleton：等 F-042 獨立 section error boundary 實作");

    await page.route(`**/api/v1/journal/${TODAY_DATE}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ date: TODAY_DATE, content: "Journal content", exists: true }),
      });
    });

    await page.route(`**/api/v1/calendar/days/${TODAY_DATE}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          events: [{ id: "ev-1", title: "Standup", start: `${TODAY_DATE}T09:00:00`, end: `${TODAY_DATE}T09:30:00` }],
        }),
      });
    });

    // Tasks API 回傳 500
    await page.route("**/api/v1/tasks*", (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: "internal server error" }) });
    });

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: "entry-1", title: "New finding", status: "inbox", created_at: `${TODAY_DATE}T10:00:00Z` }],
          total: 1,
          page: 1,
          per_page: 5,
        }),
      });
    });

    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    // THEN TasksSection 顯示 error
    await expect(page.getByTestId("tasks-section")).toContainText(/could not load tasks/i);

    // AND 其他 sections 正常顯示
    await expect(page.getByTestId("journal-section")).toBeVisible();
    await expect(page.getByTestId("calendar-section")).toBeVisible();
    await expect(page.getByTestId("recent-entries-section")).toBeVisible();
  });
});
