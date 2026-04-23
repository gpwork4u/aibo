/**
 * F-025: 全文搜尋頁
 *
 * 對應 spec: specs/features/f025-search-page.md
 * 對應 issue: #64
 */

import { test, expect } from "@playwright/test";
import { createAuthenticatedSession } from "../helpers/auth";
import { cleanupAll, seedEntries } from "../helpers/api-setup";
import { ApiClient } from "../helpers/api-client";

test.describe("F-025 全文搜尋", () => {
  let client: ApiClient;

  test.beforeEach(async ({ page, request }) => {
    const s = await createAuthenticatedSession(page, request, `search-test-${Date.now()}`);
    client = s.client;
    await cleanupAll(client);
  });

  test.afterEach(async () => {
    await cleanupAll(client);
  });

  test("Scenario 1: 初始狀態顯示搜尋提示", async ({ page }) => {
    await page.goto("/search");

    await expect(page.getByTestId("search-input")).toBeVisible();
    await expect(page.getByTestId("search-hint")).toBeVisible();
    await expect(page.getByText(/輸入關鍵字/)).toBeVisible();

    // 不顯示結果
    await expect(page.getByTestId("search-result-card")).toHaveCount(0);
  });

  test("Scenario 2+3: 即時搜尋 500ms debounce → 顯示結果 Card", async ({ page }) => {
    await seedEntries(client, 3, { titlePrefix: "Golang 教學" });
    await seedEntries(client, 2, { titlePrefix: "Python 教學" });

    await page.goto("/search");

    await page.getByTestId("search-input").fill("Golang");
    await page.waitForTimeout(700);

    const results = page.getByTestId("search-result-card");
    const count = await results.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // 每張 card 應含必要元素
    const first = results.first();
    await expect(first.getByTestId("result-title")).toBeVisible();
    await expect(first.getByTestId("result-highlight")).toBeVisible();
  });

  test("Scenario 4: 無結果訊息", async ({ page }) => {
    await seedEntries(client, 2, { titlePrefix: "normal" });
    await page.goto("/search");

    await page.getByTestId("search-input").fill("絕對不會命中的關鍵字abc12345xyz");
    await page.waitForTimeout(700);

    await expect(page.getByTestId("search-no-results")).toBeVisible();
    await expect(page.getByText(/找不到符合的結果/)).toBeVisible();
  });

  test("Scenario 5: 篩選器展開", async ({ page }) => {
    await page.goto("/search");

    await page.getByTestId("advanced-filters-toggle").click();

    await expect(page.getByTestId("filter-category-select")).toBeVisible();
    await expect(page.getByTestId("filter-tags-input")).toBeVisible();
  });

  test("Scenario 8: URL 同步 — ?q= 重整後保留", async ({ page }) => {
    await seedEntries(client, 2, { titlePrefix: "URL同步測試" });
    await page.goto("/search");

    await page.getByTestId("search-input").fill("URL同步測試");
    await page.waitForTimeout(700);

    // URL 應更新
    await expect(page).toHaveURL(/\/search\?q=URL/);

    // 重整
    await page.reload();

    // search input 應有值
    await expect(page.getByTestId("search-input")).toHaveValue(/URL同步測試/);

    // 結果應回來
    await expect(page.getByTestId("search-result-card").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Scenario 3: 搜尋結果點擊進入 entry 詳情", async ({ page }) => {
    const [entry] = await seedEntries(client, 1, { titlePrefix: "點擊測試條目" });
    await page.goto("/search");

    await page.getByTestId("search-input").fill("點擊測試條目");
    await page.waitForTimeout(700);

    const first = page.getByTestId("search-result-card").first();
    await first.getByTestId("result-title").click();

    await expect(page).toHaveURL(new RegExp(`/entries/${entry.id}`));
  });

  test("Scenario 10: 搜尋框清除", async ({ page }) => {
    await page.goto("/search");

    const input = page.getByTestId("search-input");
    await input.fill("hello");
    await page.waitForTimeout(700);

    await page.getByTestId("search-clear-button").click();

    await expect(input).toHaveValue("");
    await expect(page).toHaveURL(/\/search(\?)?$/);
  });

  test("簡單搜尋切換（如有提供 toggle）", async ({ page }) => {
    await page.goto("/search");
    const toggle = page.getByTestId("search-mode-toggle");
    const exists = await toggle.count();
    if (exists === 0) {
      test.info().annotations.push({
        type: "note",
        description: "無 search-mode-toggle，略過此斷言（前端未實作）",
      });
      return;
    }
    await toggle.click();
    await expect(page.getByTestId("search-mode-simple")).toBeVisible();
  });
});
