/**
 * F-021: 前端基礎 + Layout + Bootstrap 流程
 *
 * 對應 spec: specs/features/f021-frontend-foundation.md
 * 對應 issue: #60
 *
 * 涵蓋 Scenarios 1-7：Bootstrap 流程、Layout、認證、Sidebar、Toast。
 */

import { test, expect } from "@playwright/test";
import { clearAuth, createAuthenticatedSession, getStoredKey, setupAuth } from "../helpers/auth";
import { ApiClient } from "../helpers/api-client";

test.describe("F-021 Layout / Bootstrap", () => {
  test.beforeEach(async ({ page }) => {
    // 確保每個 test 開始前 localStorage 是乾淨的
    await page.goto("/");
    await clearAuth(page);
  });

  test("Scenario 1: 首次進入無 API Key 導向 /bootstrap 並可建立第一把 key", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    // 無 key → 應該導向 /bootstrap
    await expect(page).toHaveURL(/\/bootstrap/);
    await expect(page.getByTestId("bootstrap-welcome")).toBeVisible();

    // 填寫名稱 + 送出
    await page.getByTestId("bootstrap-name-input").fill("first-key");
    await page.getByTestId("bootstrap-submit").click();

    // 顯示新 key dialog（包含完整 key）
    const keyDisplay = page.getByTestId("bootstrap-created-key");
    await expect(keyDisplay).toBeVisible();
    const keyText = await keyDisplay.textContent();
    expect(keyText?.length ?? 0).toBeGreaterThan(10);

    // 點繼續 → 導向 /inbox
    await page.getByTestId("bootstrap-continue").click();
    await expect(page).toHaveURL(/\/inbox/);

    // localStorage 應有 key
    const stored = await getStoredKey(page);
    expect(stored).toBeTruthy();
  });

  test("Scenario 2: 已有 API Key 進入 / → 導向 /inbox", async ({ page, request }) => {
    await createAuthenticatedSession(page, request, "layout-test-1");

    await page.goto("/");
    await expect(page).toHaveURL(/\/inbox/);
  });

  test("Scenario 3: 401 → 清除 localStorage + 導向 /bootstrap + 顯示錯誤 toast", async ({
    page,
  }) => {
    // 塞一把無效 key
    await page.goto("/");
    await setupAuth(page, "invalid-key-xxx");

    await page.goto("/entries");

    // 預期被踢回 bootstrap
    await expect(page).toHaveURL(/\/bootstrap/, { timeout: 15_000 });

    // localStorage 應被清除
    const stored = await getStoredKey(page);
    expect(stored).toBeFalsy();

    // Toast 顯示「API Key 無效」
    await expect(page.getByText(/API Key 無效|請重新設定/)).toBeVisible();
  });

  test("Scenario 4: Dashboard Layout 顯示 Sidebar + Header + Main", async ({
    page,
    request,
  }) => {
    await createAuthenticatedSession(page, request, "layout-test-2");
    await page.goto("/inbox");

    // Sidebar 存在
    const sidebar = page.getByTestId("app-sidebar");
    await expect(sidebar).toBeVisible();

    // Header 存在
    await expect(page.getByTestId("app-header")).toBeVisible();

    // Main content
    await expect(page.getByTestId("app-main")).toBeVisible();

    // Sidebar 包含所有導航項目
    const navItems = ["nav-inbox", "nav-entries", "nav-categories", "nav-search", "nav-api-keys", "nav-llm-providers"];
    for (const id of navItems) {
      await expect(sidebar.getByTestId(id)).toBeVisible();
    }
  });

  test("Scenario 4b: Sidebar 導航項目點擊後跳轉正確", async ({ page, request }) => {
    await createAuthenticatedSession(page, request, "nav-test");
    await page.goto("/inbox");

    const targets: Array<[string, RegExp]> = [
      ["nav-entries", /\/entries/],
      ["nav-categories", /\/categories/],
      ["nav-search", /\/search/],
      ["nav-api-keys", /\/settings\/api-keys/],
      ["nav-llm-providers", /\/settings\/llm-providers/],
      ["nav-inbox", /\/inbox/],
    ];

    for (const [testId, urlRe] of targets) {
      await page.getByTestId(testId).click();
      await expect(page).toHaveURL(urlRe);
    }
  });

  test("Scenario 5: 前端呼叫 API 自動帶 X-API-Key header", async ({ page, request }) => {
    const { apiKey } = await createAuthenticatedSession(page, request, "header-test");

    // 監聽 request header
    const reqPromise = page.waitForRequest((r) =>
      r.url().includes("/api/v1/") && !!r.headers()["x-api-key"]
    );

    await page.goto("/inbox");
    const req = await reqPromise;
    expect(req.headers()["x-api-key"]).toBe(apiKey);
  });

  test("Scenario 6: Sidebar Inbox Badge 顯示數量", async ({ page, request }) => {
    const { client } = await createAuthenticatedSession(page, request, "badge-test");

    // 先建 3 筆 inbox entries
    for (let i = 0; i < 3; i++) {
      await client.createEntry({ title: `badge ${i}`, content: `x${i}` });
    }

    await page.goto("/inbox");
    const badge = page.getByTestId("sidebar-inbox-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(/3/);

    await client.cleanupAll();
  });

  test("Scenario 7: Toast 成功通知顯示", async ({ page, request }) => {
    await createAuthenticatedSession(page, request, "toast-test");
    await page.goto("/inbox");

    // 透過建立 entry 觸發 success toast
    await page.getByTestId("create-entry-button").click();
    await page.getByTestId("entry-content-input").fill("toast 測試內容");
    await page.getByTestId("entry-submit").click();

    await expect(page.locator("[data-sonner-toast], [data-testid='toast']")).toBeVisible();
  });

  test("Dark Mode 切換", async ({ page, request }) => {
    await createAuthenticatedSession(page, request, "dark-mode-test");
    await page.goto("/inbox");

    const toggle = page.getByTestId("theme-toggle");
    await toggle.click();

    // dark class 應出現在 <html> 上
    await expect(page.locator("html")).toHaveClass(/dark/);

    await toggle.click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("響應式：Mobile viewport Sidebar 變成 overlay", async ({ page, request }) => {
    // 使用 mobile-chromium project 時 viewport 自動小於 768
    await page.setViewportSize({ width: 375, height: 812 });
    await createAuthenticatedSession(page, request, "mobile-test");
    await page.goto("/inbox");

    // Sidebar 預設應 collapsed（或 hidden）
    const sidebar = page.getByTestId("app-sidebar");
    // 可能用 hidden 或 translate 隱藏
    const visible = await sidebar.isVisible().catch(() => false);

    // 點擊漢堡按鈕打開 overlay
    const menuBtn = page.getByTestId("mobile-menu-toggle");
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Overlay 或 sidebar 應該變可見
    const overlay = page.getByTestId("sidebar-overlay").or(sidebar);
    await expect(overlay.first()).toBeVisible();
  });
});
