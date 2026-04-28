/**
 * F-043: Saved Views & Filter Bar
 *
 * Spec: specs/features/f043-saved-views-filter-bar.md
 * Issue: #209
 * QA Issue: #211
 *
 * 涵蓋 Sprint 14 QA scenarios：
 * - 建立新 Saved View（POST → 出現在 sidebar）
 * - 套用 Saved View（點擊 → Library URL 更新）
 * - 刪除 Saved View（DELETE → 從 sidebar 移除）
 * - 重複名稱時 409 DUPLICATE 錯誤提示
 * - 超過 50 個 views 時 400 LIMIT_EXCEEDED 提示
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";

const FEATURE = "F-043";

test.describe(`[${FEATURE}] Saved Views & Filter Bar`, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
  });

  // --- Happy Path ---

  test("SV-1 建立新 Saved View：POST 201 → 新 view 出現於 sidebar", async ({ page }) => {
    test.skip(true, "skeleton：等 F-043 Save View 對話框 + POST /api/v1/views + sidebar 更新實作");

    // 初始 views 清單（空）
    await page.route("**/api/v1/views", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      } else if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "view-uuid-1",
            name: "Go Resources",
            scope: "library",
            filters: { category_id: "cat-go", tags: ["golang"] },
            sort_by: "updated_at",
            sort_dir: "desc",
            icon: null,
            position: 0,
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 20 }),
      });
    });

    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    // 設定過濾條件（假設已有 category 和 tags 選擇）
    // WHEN 點擊 "Save View"
    await page.getByRole("button", { name: /save view/i }).click();

    // 輸入名稱
    await page.getByRole("dialog").getByRole("textbox", { name: /name/i }).fill("Go Resources");
    await page.getByRole("dialog").getByRole("button", { name: /save|confirm/i }).click();
    await page.waitForLoadState("networkidle");

    // THEN "Go Resources" 出現於 sidebar Views 區塊
    await expect(page.getByTestId("sidebar-views")).toContainText("Go Resources");
  });

  test("SV-2 套用 Saved View：點擊 sidebar view → Library URL 更新 filter params", async ({
    page,
  }) => {
    test.skip(true, "skeleton：等 F-043 sidebar view click → URL 更新實作");

    const mockView = {
      id: "view-uuid-1",
      name: "Go Resources",
      scope: "library",
      filters: { tags: ["golang"] },
      sort_by: "updated_at",
      sort_dir: "desc",
      icon: null,
      position: 0,
    };

    await page.route("**/api/v1/views", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([mockView]),
        });
      } else {
        route.continue();
      }
    });

    let filteredCalled = false;
    await page.route("**/api/v1/entries*", (route) => {
      const url = new URL(route.request().url());
      const tags = url.searchParams.get("tags");
      if (tags === "golang") {
        filteredCalled = true;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              { id: "e-1", title: "Go Concurrency", tags: ["golang"], status: "library", updated_at: "2026-04-28T10:00:00Z" },
            ],
            total: 1,
            page: 1,
            per_page: 20,
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 20 }),
        });
      }
    });

    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    // WHEN 點擊 sidebar 中的 "Go Resources"
    await page.getByTestId("sidebar-views").getByText("Go Resources").click();
    await page.waitForLoadState("networkidle");

    // THEN Library URL 更新含對應 filter params
    expect(page.url()).toContain("tags=golang");

    // AND 列表顯示符合條件的 entries
    expect(filteredCalled).toBe(true);
    await expect(page.getByTestId("library-row")).toContainText("Go Concurrency");
  });

  test("SV-3 刪除 Saved View：DELETE 204 → view 從 sidebar 移除", async ({ page }) => {
    test.skip(true, "skeleton：等 F-043 view 刪除 UI（... > Delete）+ DELETE /api/v1/views/:id 實作");

    const mockView = {
      id: "view-uuid-1",
      name: "Go Resources",
      scope: "library",
      filters: {},
      sort_by: "updated_at",
      sort_dir: "desc",
      icon: null,
      position: 0,
    };

    let deleteCalled = false;
    await page.route("**/api/v1/views/view-uuid-1", (route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true;
        route.fulfill({ status: 204 });
      } else {
        route.continue();
      }
    });

    await page.route("**/api/v1/views", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([mockView]),
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 20 }),
      });
    });

    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    // 確認 view 存在
    await expect(page.getByTestId("sidebar-views")).toContainText("Go Resources");

    // WHEN 點擊 view 旁的 "⋯" > Delete
    await page.getByTestId("sidebar-views").getByText("Go Resources").hover();
    await page.getByTestId("view-menu-go-resources").click();
    await page.getByRole("menuitem", { name: /delete/i }).click();

    // 確認刪除對話框
    await page.getByRole("dialog").getByRole("button", { name: /confirm|delete/i }).click();
    await page.waitForLoadState("networkidle");

    // THEN view 從 sidebar 移除
    await expect(page.getByTestId("sidebar-views")).not.toContainText("Go Resources");
    expect(deleteCalled).toBe(true);
  });

  // --- Error Handling ---

  test("SV-4 名稱重複：POST 409 DUPLICATE → 顯示錯誤訊息", async ({ page }) => {
    test.skip(true, "skeleton：等 F-043 重複名稱 409 error 處理實作");

    await page.route("**/api/v1/views", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            { id: "view-uuid-1", name: "Go Resources", scope: "library", filters: {}, position: 0 },
          ]),
        });
      } else if (route.request().method() === "POST") {
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "DUPLICATE", message: "A view with this name already exists" }),
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 20 }),
      });
    });

    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    // WHEN 嘗試建立同名 view
    await page.getByRole("button", { name: /save view/i }).click();
    await page.getByRole("dialog").getByRole("textbox", { name: /name/i }).fill("go resources");
    await page.getByRole("dialog").getByRole("button", { name: /save|confirm/i }).click();
    await page.waitForLoadState("networkidle");

    // THEN 顯示 409 錯誤訊息
    await expect(page.getByRole("dialog")).toContainText(/duplicate|already exists|名稱已存在/i);
  });

  // --- Edge Cases ---

  test("SV-5 超過 50 個 views：POST 400 LIMIT_EXCEEDED → 顯示提示", async ({ page }) => {
    test.skip(true, "skeleton：等 F-043 LIMIT_EXCEEDED 400 error 處理實作");

    // 模擬已有 50 個 views
    const existingViews = Array.from({ length: 50 }, (_, i) => ({
      id: `view-uuid-${i + 1}`,
      name: `View ${i + 1}`,
      scope: "library",
      filters: {},
      position: i,
    }));

    await page.route("**/api/v1/views", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(existingViews),
        });
      } else if (route.request().method() === "POST") {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "LIMIT_EXCEEDED", message: "Maximum 50 views allowed" }),
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 20 }),
      });
    });

    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    // WHEN 嘗試新增第 51 個 view
    await page.getByRole("button", { name: /save view/i }).click();
    await page.getByRole("dialog").getByRole("textbox", { name: /name/i }).fill("View 51");
    await page.getByRole("dialog").getByRole("button", { name: /save|confirm/i }).click();
    await page.waitForLoadState("networkidle");

    // THEN 顯示 LIMIT_EXCEEDED 提示
    await expect(
      page.getByText(/limit exceeded|maximum.*views|已達上限/i),
    ).toBeVisible();
  });

  test("SV-6 拖曳重排 views：PATCH /api/v1/views/reorder 更新 position", async ({ page }) => {
    test.skip(true, "skeleton：等 F-043 drag-and-drop reorder + PATCH /views/reorder 實作");

    const views = [
      { id: "view-uuid-1", name: "View Alpha", scope: "library", filters: {}, position: 0 },
      { id: "view-uuid-2", name: "View Beta", scope: "library", filters: {}, position: 1 },
      { id: "view-uuid-3", name: "View Gamma", scope: "library", filters: {}, position: 2 },
    ];

    let reorderCalled = false;
    let reorderBody: unknown;
    await page.route("**/api/v1/views/reorder", (route) => {
      if (route.request().method() === "PATCH") {
        reorderCalled = true;
        reorderBody = route.request().postDataJSON();
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ updated: 3 }),
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/api/v1/views", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(views),
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 20 }),
      });
    });

    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    // WHEN 拖曳第一個 view 到第三位
    const firstView = page.getByTestId("sidebar-view-view-uuid-1");
    const thirdView = page.getByTestId("sidebar-view-view-uuid-3");

    const firstBox = await firstView.boundingBox();
    const thirdBox = await thirdView.boundingBox();
    if (firstBox && thirdBox) {
      await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(thirdBox.x + thirdBox.width / 2, thirdBox.y + thirdBox.height / 2, { steps: 10 });
      await page.mouse.up();
    }

    await page.waitForLoadState("networkidle");

    // THEN PATCH /api/v1/views/reorder 被呼叫，ids 順序已更新
    expect(reorderCalled).toBe(true);
  });
});
