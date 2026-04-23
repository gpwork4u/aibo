/**
 * F-023: Entries + Inbox 頁面
 *
 * 對應 spec: specs/features/f023-entries-inbox-pages.md
 * 對應 issue: #62
 */

import { test, expect } from "@playwright/test";
import { createAuthenticatedSession } from "../helpers/auth";
import { seedCategory, seedEntries, cleanupAll } from "../helpers/api-setup";
import { ApiClient } from "../helpers/api-client";

test.describe("F-023 Entries / Inbox", () => {
  let client: ApiClient;

  test.beforeEach(async ({ page, request }) => {
    const s = await createAuthenticatedSession(page, request, `entries-test-${Date.now()}`);
    client = s.client;
    await cleanupAll(client); // 清空再開始
  });

  test.afterEach(async () => {
    await cleanupAll(client);
  });

  test("Scenario 1+2: Inbox 空狀態顯示慶祝訊息", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page.getByTestId("inbox-empty-state")).toBeVisible();
    await expect(page.getByText(/太棒了|沒有待處理/)).toBeVisible();
  });

  test("Scenario 1+8: 建立新 entry（只填 content）→ Inbox 列出", async ({ page }) => {
    await page.goto("/inbox");

    await page.getByTestId("create-entry-button").click();
    const dialog = page.getByTestId("entry-form-dialog");
    await expect(dialog).toBeVisible();

    // 只填 content（不填 title）
    await dialog.getByTestId("entry-content-input").fill("這是一筆只有內容的條目");
    await dialog.getByTestId("entry-submit").click();

    await expect(dialog).not.toBeVisible();

    // 列表應顯示 content_preview（灰斜體）
    const row = page.getByTestId("entry-row").first();
    await expect(row).toBeVisible();
    const preview = row.getByTestId("entry-title-or-preview");
    await expect(preview).toHaveClass(/italic|text-muted/);
    await expect(preview).toContainText("這是一筆只有內容");
  });

  test("Scenario 3: Entries 列表顯示 + summary/標題", async ({ page }) => {
    await seedEntries(client, 3, { titlePrefix: "列表測試" });
    await page.goto("/entries");

    const rows = page.getByTestId("entry-row");
    await expect(rows).toHaveCount(3);
    await expect(rows.first().getByTestId("entry-title-or-preview")).toContainText("列表測試");
  });

  test("Scenario 4: 搜尋功能（debounce 300ms）", async ({ page }) => {
    await seedEntries(client, 3, { titlePrefix: "Alpha" });
    await seedEntries(client, 2, { titlePrefix: "Beta" });
    await page.goto("/entries");

    const searchInput = page.getByTestId("entries-search-input");
    await searchInput.fill("Alpha");

    // 等 debounce
    await page.waitForTimeout(500);

    const rows = page.getByTestId("entry-row");
    const count = await rows.count();
    expect(count).toBe(3);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText("Alpha");
    }
  });

  test("Scenario 5: 分類篩選", async ({ page }) => {
    const cat = await seedCategory(client, `filter-cat-${Date.now()}`);
    await seedEntries(client, 2, { categoryId: cat.id, titlePrefix: "已分類" });
    await seedEntries(client, 3, { titlePrefix: "Inbox" });

    await page.goto("/entries");

    await page.getByTestId("category-filter-select").click();
    await page.getByTestId(`category-option-${cat.id}`).click();

    await page.waitForTimeout(300);
    const rows = page.getByTestId("entry-row");
    const count = await rows.count();
    expect(count).toBe(2);
  });

  test("Scenario 7: Entry 詳情頁（Markdown 渲染）", async ({ page }) => {
    const [entry] = await seedEntries(client, 1, { titlePrefix: "詳情測試" });

    await page.goto(`/entries/${entry.id}`);

    await expect(page.getByTestId("entry-detail-title")).toContainText("詳情測試");
    const markdown = page.getByTestId("entry-markdown-content");
    await expect(markdown).toBeVisible();
    // markdown 應渲染為 h2（## 子標題）
    await expect(markdown.locator("h2")).toBeVisible();
    await expect(markdown.locator("li")).toHaveCount(2);
  });

  test("Scenario 9: 編輯 Entry → PATCH 更新", async ({ page }) => {
    const [entry] = await seedEntries(client, 1, { titlePrefix: "編輯測試" });

    await page.goto(`/entries/${entry.id}`);
    await page.getByTestId("edit-entry-button").click();

    const dialog = page.getByTestId("entry-form-dialog");
    const titleInput = dialog.getByTestId("entry-title-input");
    await titleInput.clear();
    await titleInput.fill("編輯後的標題");
    await dialog.getByTestId("entry-submit").click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId("entry-detail-title")).toContainText("編輯後的標題");
  });

  test("Scenario 1 / 10: Inbox 視圖只顯示未分類", async ({ page }) => {
    const cat = await seedCategory(client, `cat-inbox-${Date.now()}`);
    await seedEntries(client, 2, { categoryId: cat.id, titlePrefix: "已分類" });
    await seedEntries(client, 3, { titlePrefix: "Inbox-Only" });

    await page.goto("/inbox");

    const rows = page.getByTestId("entry-row");
    const count = await rows.count();
    expect(count).toBe(3);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText("Inbox-Only");
    }
  });

  test("Scenario 10: Inbox 移至分類（樂觀更新）", async ({ page }) => {
    const cat = await seedCategory(client, `move-cat-${Date.now()}`);
    await seedEntries(client, 1, { titlePrefix: "待移動" });

    await page.goto("/inbox");
    const row = page.getByTestId("entry-row").first();
    await row.getByTestId("move-to-category-button").click();

    const popover = page.getByTestId("move-to-category-popover");
    await expect(popover).toBeVisible();
    await popover.getByTestId(`category-option-${cat.id}`).click();

    // Toast
    await expect(page.getByText(/已移至/)).toBeVisible();

    // entry 從 Inbox 消失
    await expect(page.getByTestId("entry-row").filter({ hasText: "待移動" })).toHaveCount(0);
  });

  test("Scenario 12: 刪除 Entry AlertDialog 確認", async ({ page }) => {
    const [entry] = await seedEntries(client, 1, { titlePrefix: "刪除測試" });
    await page.goto("/entries");

    const row = page.getByTestId("entry-row").first();
    await row.getByTestId("entry-actions").click();
    await page.getByTestId("delete-entry-menu-item").click();

    const alert = page.getByTestId("delete-entry-confirm-dialog");
    await expect(alert).toBeVisible();
    await alert.getByTestId("delete-confirm-button").click();

    await expect(page.getByTestId("entry-row").filter({ hasText: "刪除測試" })).toHaveCount(0);
  });
});
