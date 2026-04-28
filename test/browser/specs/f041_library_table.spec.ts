/**
 * F-041: Library Table View
 *
 * Spec: specs/features/f041-library-table.md
 * Issue: #207
 * QA Issue: #211
 *
 * 涵蓋 Sprint 14 QA scenarios：
 * - 載入 Library 預設視圖（20 筆 / 頁）
 * - 全文搜尋 → URL 同步 ?q=
 * - 欄位排序 → URL 同步 ?sort=&dir=
 * - 點選 row 展開 Sheet
 * - URL 直接含過濾參數（深連結）
 * - 清空搜尋 → 移除 q 參數
 * - 後端 500 → error state
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";

const FEATURE = "F-041";

/** 產生假 entries 資料 */
function makeEntries(count: number, overrides: Record<string, unknown> = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: `uuid-${i + 1}`,
    title: `Entry ${i + 1}`,
    summary: `Summary ${i + 1}`,
    category: { id: "cat-uuid", name: "Programming" },
    tags: ["go"],
    status: "library",
    confidence: parseFloat((0.9 - i * 0.01).toFixed(2)),
    source_type: "manual",
    created_at: "2026-04-28T10:00:00Z",
    updated_at: "2026-04-28T10:00:00Z",
    ...overrides,
  }));
}

test.describe(`[${FEATURE}] Library Table View`, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
  });

  // --- Happy Path ---

  test("LT-1 載入 Library 預設視圖：顯示第 1 頁 20 筆，依 updated_at DESC", async ({ page }) => {
    test.skip(true, "skeleton：等 F-041 LibraryPage + TanStack Table 實作");

    await page.route("**/api/v1/entries*", (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("status") === "library") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: makeEntries(20),
            total: 30,
            page: 1,
            per_page: 20,
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    // THEN 顯示 20 筆
    const rows = page.getByTestId("library-row");
    await expect(rows).toHaveCount(20);

    // AND pagination 顯示 "1-20 of 30"
    await expect(page.getByText(/1-20 of 30/i)).toBeVisible();
  });

  test("LT-2 全文搜尋：輸入 'ml' 後 URL 更新含 ?q=ml", async ({ page }) => {
    test.skip(true, "skeleton：等 F-041 SearchInput + URL sync 實作");

    let searchCalled = false;
    await page.route("**/api/v1/entries*", (route) => {
      const url = new URL(route.request().url());
      const q = url.searchParams.get("q");
      if (q === "ml") {
        searchCalled = true;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: makeEntries(3),
            total: 3,
            page: 1,
            per_page: 20,
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: makeEntries(20), total: 30, page: 1, per_page: 20 }),
        });
      }
    });

    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    // WHEN 在 SearchInput 輸入 "ml" 並停頓 300ms
    await page.getByRole("searchbox").fill("ml");
    await page.waitForTimeout(400);

    // THEN URL 更新含 ?q=ml
    expect(page.url()).toContain("q=ml");

    // AND 列表重新載入
    expect(searchCalled).toBe(true);
    await expect(page.getByTestId("library-row")).toHaveCount(3);
  });

  test("LT-3 依 confidence 排序：點擊欄位標頭，URL 更新 ?sort=confidence&dir=desc", async ({
    page,
  }) => {
    test.skip(true, "skeleton：等 F-041 column sort + URL sync 實作");

    let sortCalled = false;
    await page.route("**/api/v1/entries*", (route) => {
      const url = new URL(route.request().url());
      const sortBy = url.searchParams.get("sort_by");
      const sortDir = url.searchParams.get("sort_dir");
      if (sortBy === "confidence" && sortDir === "desc") {
        sortCalled = true;
        // 回傳 confidence 由高到低
        const sorted = makeEntries(5).sort((a, b) => b.confidence - a.confidence);
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: sorted, total: 5, page: 1, per_page: 20 }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: makeEntries(5), total: 5, page: 1, per_page: 20 }),
        });
      }
    });

    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    // WHEN 點擊 "Confidence" 欄位標頭
    await page.getByRole("columnheader", { name: /confidence/i }).click();
    await page.waitForLoadState("networkidle");

    // THEN URL 更新
    expect(page.url()).toContain("sort=confidence");
    expect(page.url()).toContain("dir=desc");
    expect(sortCalled).toBe(true);
  });

  test("LT-4 點選 row 展開 EntryDetailSheet", async ({ page }) => {
    test.skip(true, "skeleton：等 F-041 row click → Sheet 實作");

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: makeEntries(5), total: 5, page: 1, per_page: 20 }),
      });
    });

    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    // WHEN 點選第一個 row
    await page.getByTestId("library-row").first().click();

    // THEN 右側 Sheet 展開，顯示 entry 詳情
    await expect(page.getByTestId("entry-detail-sheet")).toBeVisible();
    await expect(page.getByTestId("entry-detail-sheet")).toContainText("Entry 1");
  });

  // --- URL 深連結 ---

  test("LT-5 URL 直接含過濾參數：/library?status=archived&sort=created_at → FilterBar 已選中", async ({
    page,
  }) => {
    test.skip(true, "skeleton：等 F-041 URL params 反向同步 FilterBar 實作");

    await page.route("**/api/v1/entries*", (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get("status");
      const sortBy = url.searchParams.get("sort_by");
      if (status === "archived" && sortBy === "created_at") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: makeEntries(3, { status: "archived" }),
            total: 3,
            page: 1,
            per_page: 20,
          }),
        });
      } else {
        route.continue();
      }
    });

    // WHEN 直接訪問含參數 URL
    await page.goto("/library?status=archived&sort=created_at");
    await page.waitForLoadState("networkidle");

    // THEN FilterBar 顯示 status=archived 已選中
    await expect(page.getByTestId("filter-status-archived")).toHaveAttribute("aria-selected", "true");

    // AND 列表以 created_at 排序
    await expect(page.getByTestId("library-row")).toHaveCount(3);
  });

  test("LT-6 清空搜尋：URL 移除 q 參數，列表顯示全部", async ({ page }) => {
    test.skip(true, "skeleton：等 F-041 clear search → URL update 實作");

    await page.route("**/api/v1/entries*", (route) => {
      const url = new URL(route.request().url());
      const q = url.searchParams.get("q");
      if (q === "test") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: makeEntries(2), total: 2, page: 1, per_page: 20 }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: makeEntries(10), total: 10, page: 1, per_page: 20 }),
        });
      }
    });

    // GIVEN URL 含 ?q=test
    await page.goto("/library?q=test");
    await page.waitForLoadState("networkidle");

    // WHEN 清空 SearchInput
    await page.getByRole("searchbox").clear();
    await page.waitForTimeout(400);

    // THEN URL 移除 q 參數
    expect(page.url()).not.toContain("q=");

    // AND 列表顯示全部
    await expect(page.getByTestId("library-row")).toHaveCount(10);
  });

  // --- Error Handling ---

  test("LT-7 後端 500：顯示 error state，保留上次結果", async ({ page }) => {
    test.skip(true, "skeleton：等 F-041 error boundary + stale-while-revalidate 實作");

    let callCount = 0;
    await page.route("**/api/v1/entries*", (route) => {
      callCount++;
      if (callCount === 1) {
        // 第一次成功
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: makeEntries(5), total: 5, page: 1, per_page: 20 }),
        });
      } else {
        // 之後模擬 500
        route.fulfill({ status: 500, body: JSON.stringify({ error: "internal server error" }) });
      }
    });

    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    // 觸發重新載入（例如搜尋）
    await page.getByRole("searchbox").fill("trigger-reload");
    await page.waitForTimeout(400);

    // THEN 顯示 error state
    await expect(page.getByText(/failed to load|retry/i)).toBeVisible();
  });
});
