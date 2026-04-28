/**
 * F-040: Inbox Triage View
 *
 * Spec: specs/features/f040-inbox-triage.md
 * Issue: #206
 * QA Issue: #211
 *
 * 涵蓋 Sprint 14 QA scenarios：
 * - 載入 Inbox 列表
 * - Archive 單筆（樂觀更新）
 * - 批次 Archive（Space 選取）
 * - 樂觀更新 rollback（後端 500）
 * - Empty state
 * - 鍵盤快捷鍵 J/K/A/D/E
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";

const FEATURE = "F-040";

test.describe(`[${FEATURE}] Inbox Triage View`, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
  });

  // --- Happy Path ---

  test("IT-1 載入 Inbox 列表：顯示 status=inbox entries，依 created_at DESC 排序", async ({
    page,
  }) => {
    test.skip(true, "skeleton：等 F-040 InboxPage + GET /api/v1/entries?status=inbox 實作");

    await page.route("**/api/v1/entries*", (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("status") === "inbox") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              { id: "uuid-1", title: "Entry A", status: "inbox", created_at: "2026-04-28T10:00:00Z" },
              { id: "uuid-2", title: "Entry B", status: "inbox", created_at: "2026-04-27T10:00:00Z" },
            ],
            total: 2,
            page: 1,
            per_page: 20,
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/dashboard/inbox");
    await page.waitForLoadState("networkidle");

    // THEN 顯示 2 筆 entry cards
    await expect(page.getByTestId("inbox-card").first()).toBeVisible();
    const cards = page.getByTestId("inbox-card");
    await expect(cards).toHaveCount(2);

    // AND Entry A（較新）排在第一
    await expect(cards.nth(0)).toContainText("Entry A");
    await expect(cards.nth(1)).toContainText("Entry B");
  });

  test("IT-2 Archive 單筆 entry：樂觀更新移除，toast 顯示 Archived", async ({ page }) => {
    test.skip(true, "skeleton：等 F-040 Archive 按鈕 + 樂觀更新 + toast 實作");

    let patchCalled = false;
    await page.route("**/api/v1/entries/uuid-1", (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "uuid-1", status: "archived" }),
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: "uuid-1", title: "Entry A", status: "inbox", created_at: "2026-04-28T10:00:00Z" }],
          total: 1,
          page: 1,
          per_page: 20,
        }),
      });
    });

    await page.goto("/dashboard/inbox");
    await page.waitForLoadState("networkidle");

    // WHEN 點擊 Archive 按鈕
    await page.getByTestId("inbox-card").first().getByRole("button", { name: /archive/i }).click();

    // THEN entry 從列表移除（樂觀更新）
    await expect(page.getByTestId("inbox-card")).toHaveCount(0);

    // AND toast 顯示 "Archived"
    await expect(page.getByText(/archived/i)).toBeVisible();

    // AND PATCH /api/v1/entries/:id 被呼叫
    expect(patchCalled).toBe(true);
  });

  test("IT-3 批次 Archive 3 筆：Space 選取後 Batch Archive", async ({ page }) => {
    test.skip(true, "skeleton：等 F-040 批次選取 + POST /api/v1/entries/batch 實作");

    let batchCalled = false;
    let batchBody: unknown;
    await page.route("**/api/v1/entries/batch", (route) => {
      batchCalled = true;
      route.request().postDataJSON().then((body: unknown) => { batchBody = body; });
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ succeeded: ["uuid-1", "uuid-2", "uuid-3"], failed: [] }),
      });
    });

    await page.route("**/api/v1/entries*", (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.includes("/batch")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              { id: "uuid-1", title: "Entry A", status: "inbox", created_at: "2026-04-28T10:00:00Z" },
              { id: "uuid-2", title: "Entry B", status: "inbox", created_at: "2026-04-28T09:00:00Z" },
              { id: "uuid-3", title: "Entry C", status: "inbox", created_at: "2026-04-28T08:00:00Z" },
            ],
            total: 3,
            page: 1,
            per_page: 20,
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/dashboard/inbox");
    await page.waitForLoadState("networkidle");

    // WHEN 以 Space 選取 3 筆
    const cards = page.getByTestId("inbox-card");
    for (let i = 0; i < 3; i++) {
      await cards.nth(i).click();
      await page.keyboard.press("Space");
    }

    // AND 點擊 Batch Archive
    await page.getByRole("button", { name: /batch archive/i }).click();
    await page.waitForLoadState("networkidle");

    // THEN 3 筆從列表移除
    await expect(page.getByTestId("inbox-card")).toHaveCount(0);
    expect(batchCalled).toBe(true);
  });

  test("IT-4 Empty state：inbox 為空時顯示 'Your inbox is clear' 與 Browse Library CTA", async ({
    page,
  }) => {
    test.skip(true, "skeleton：等 F-040 empty state 元件實作");

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 20 }),
      });
    });

    await page.goto("/dashboard/inbox");
    await page.waitForLoadState("networkidle");

    // THEN empty state
    await expect(page.getByText(/your inbox is clear/i)).toBeVisible();
    // AND "Browse Library" CTA
    await expect(page.getByRole("link", { name: /browse library/i })).toBeVisible();
  });

  // --- Error Handling ---

  test("IT-5 樂觀更新 rollback：後端 PATCH 500 → entry 重新出現，toast 顯示 Action failed", async ({
    page,
  }) => {
    test.skip(true, "skeleton：等 F-040 樂觀更新 rollback + error toast 實作");

    await page.route("**/api/v1/entries/uuid-1", (route) => {
      if (route.request().method() === "PATCH") {
        route.fulfill({ status: 500, body: JSON.stringify({ error: "internal server error" }) });
      } else {
        route.continue();
      }
    });

    await page.route("**/api/v1/entries*", (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.includes("/uuid-1")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [{ id: "uuid-1", title: "Entry A", status: "inbox", created_at: "2026-04-28T10:00:00Z" }],
            total: 1,
            page: 1,
            per_page: 20,
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/dashboard/inbox");
    await page.waitForLoadState("networkidle");

    // WHEN 點擊 Archive（觸發樂觀更新）
    await page.getByTestId("inbox-card").first().getByRole("button", { name: /archive/i }).click();

    // THEN 等待 rollback：entry 重新出現
    await expect(page.getByTestId("inbox-card")).toHaveCount(1);

    // AND toast 顯示 "Action failed, please retry"
    await expect(page.getByText(/action failed|please retry/i)).toBeVisible();
  });

  // --- 鍵盤快捷鍵 ---

  test("IT-6 鍵盤 J/K：active card 游標上下移動", async ({ page }) => {
    test.skip(true, "skeleton：等 F-040 鍵盤導航（J/K）實作");

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            { id: "uuid-1", title: "Entry A", status: "inbox", created_at: "2026-04-28T10:00:00Z" },
            { id: "uuid-2", title: "Entry B", status: "inbox", created_at: "2026-04-27T10:00:00Z" },
            { id: "uuid-3", title: "Entry C", status: "inbox", created_at: "2026-04-26T10:00:00Z" },
          ],
          total: 3,
          page: 1,
          per_page: 20,
        }),
      });
    });

    await page.goto("/dashboard/inbox");
    await page.waitForLoadState("networkidle");

    // 點擊頁面讓 inbox 取得 focus
    await page.getByTestId("inbox-list").click();

    // 第一張預設 active
    await expect(page.getByTestId("inbox-card").nth(0)).toHaveAttribute("data-active", "true");

    // WHEN 按 J → 移到下一筆
    await page.keyboard.press("j");
    await expect(page.getByTestId("inbox-card").nth(1)).toHaveAttribute("data-active", "true");
    await expect(page.getByTestId("inbox-card").nth(0)).not.toHaveAttribute("data-active", "true");

    // WHEN 再按 J
    await page.keyboard.press("j");
    await expect(page.getByTestId("inbox-card").nth(2)).toHaveAttribute("data-active", "true");

    // WHEN 按 K → 往上
    await page.keyboard.press("k");
    await expect(page.getByTestId("inbox-card").nth(1)).toHaveAttribute("data-active", "true");
  });

  test("IT-7 鍵盤 A：active entry 執行 archive", async ({ page }) => {
    test.skip(true, "skeleton：等 F-040 鍵盤快捷鍵 A（archive）實作");

    let patchCalled = false;
    await page.route("**/api/v1/entries/uuid-1", (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "uuid-1", status: "archived" }),
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/api/v1/entries*", (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.includes("/uuid-1")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [{ id: "uuid-1", title: "Entry A", status: "inbox", created_at: "2026-04-28T10:00:00Z" }],
            total: 1,
            page: 1,
            per_page: 20,
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/dashboard/inbox");
    await page.waitForLoadState("networkidle");

    // 讓 inbox list 取得 focus
    await page.getByTestId("inbox-list").click();

    // WHEN 按 A
    await page.keyboard.press("a");

    // THEN active entry 被 archived（樂觀更新，移除）
    await expect(page.getByTestId("inbox-card")).toHaveCount(0);
    expect(patchCalled).toBe(true);
  });

  test("IT-8 鍵盤 D/E：D 觸發 delete、E 觸發 edit", async ({ page }) => {
    test.skip(true, "skeleton：等 F-040 鍵盤快捷鍵 D（delete）/ E（edit）實作");

    let deleteCalled = false;
    await page.route("**/api/v1/entries/uuid-1", (route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true;
        route.fulfill({ status: 204 });
      } else {
        route.continue();
      }
    });

    await page.route("**/api/v1/entries*", (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.includes("/uuid-1")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [{ id: "uuid-1", title: "Entry A", status: "inbox", created_at: "2026-04-28T10:00:00Z" }],
            total: 1,
            page: 1,
            per_page: 20,
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/dashboard/inbox");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("inbox-list").click();

    // WHEN 按 D → 觸發 delete
    await page.keyboard.press("d");
    await expect(page.getByTestId("inbox-card")).toHaveCount(0);
    expect(deleteCalled).toBe(true);
  });

  test("IT-9 鍵盤 E：active entry 進入 edit 模式", async ({ page }) => {
    test.skip(true, "skeleton：等 F-040 鍵盤快捷鍵 E（edit）實作");

    await page.route("**/api/v1/entries*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: "uuid-1", title: "Entry A", status: "inbox", created_at: "2026-04-28T10:00:00Z" }],
          total: 1,
          page: 1,
          per_page: 20,
        }),
      });
    });

    await page.goto("/dashboard/inbox");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("inbox-list").click();

    // WHEN 按 E → 進入 edit 模式（展開 entry detail 或導向編輯頁）
    await page.keyboard.press("e");

    // THEN 顯示 entry 編輯介面
    await expect(
      page.getByTestId("entry-edit-sheet").or(page.getByRole("textbox", { name: /title/i })),
    ).toBeVisible();
  });
});
