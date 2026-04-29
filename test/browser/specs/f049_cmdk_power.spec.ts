/**
 * F-049: CmdK Power Actions
 *
 * Spec: specs/features/f049-cmdk-power-actions.md
 * Issue: #233
 * QA Issue: #236
 *
 * 涵蓋 Sprint 16 QA scenarios：
 * CP-1  3+ 字元觸發搜尋（200ms debounce），結果分組出現
 * CP-2  點擊搜尋結果開啟 EntryDetailSheet
 * CP-3  QuickCreate：輸入 "new" → "New Entry" → QuickCreateModal → toast
 * CP-4  > prefix AI mode：只顯示 AI Actions 分組
 * CP-5  搜尋失敗 silent fail：Navigation 正常，Search Results 不顯示
 * CP-6  grouped results：Navigation / Search / AI 分組標題顯示正確
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";

const FEATURE = "F-049";
const API_BASE = process.env.API_BASE_URL || "http://localhost:8081";

// --- Helpers ---

function makeSearchResults(items?: Array<{ id: string; title: string; category: string }>) {
  return {
    items: items ?? [
      { id: "entry-golang", title: "Golang Concurrency", category: "Programming" },
      { id: "entry-go2", title: "Go Channels Explained", category: "Programming" },
    ],
    total: items?.length ?? 2,
  };
}

test.describe(`[${FEATURE}] CmdK Power Actions`, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
  });

  // --- CP-1: 3+ 字元觸發搜尋 debounce ---

  test("CP-1 輸入 3+ 字元後 200ms debounce 觸發搜尋，Search Results 分組出現", async ({ page }) => {
    test.skip(true, "skeleton：等 F-049 CmdK 搜尋 debounce + Search Results 分組實作");

    let searchCallCount = 0;

    await page.route(`${API_BASE}/api/v1/entries/search*`, (route) => {
      searchCallCount++;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeSearchResults()),
      });
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // 開啟 CmdK palette
    await page.keyboard.press("Meta+k");
    const palette = page.getByTestId("cmdk-palette");
    await expect(palette).toBeVisible();

    // 輸入 1 字元，不應觸發搜尋
    await page.keyboard.type("c");
    await page.waitForTimeout(250);
    expect(searchCallCount).toBe(0);

    // 繼續輸入到 3+ 字元
    await page.keyboard.type("on");
    // 等待 debounce（200ms）+ 緩衝
    await page.waitForTimeout(400);

    // 搜尋應已觸發
    expect(searchCallCount).toBeGreaterThanOrEqual(1);

    // "Search Results" 分組出現
    const searchGroup = palette.getByTestId("cmdk-group-search");
    await expect(searchGroup).toBeVisible();
    await expect(searchGroup.getByText("Golang Concurrency")).toBeVisible();

    await page.screenshot({ path: `../screenshots/${FEATURE}/cp1-search-results.png` });
  });

  // --- CP-2: 點擊搜尋結果開啟 EntryDetailSheet ---

  test("CP-2 點擊搜尋結果 → EntryDetailSheet 開啟", async ({ page }) => {
    test.skip(true, "skeleton：等 F-049 搜尋結果 → EntryDetailSheet 跳轉實作");

    await page.route(`${API_BASE}/api/v1/entries/search*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeSearchResults()),
      });
    });

    await page.route(`${API_BASE}/api/v1/entries/entry-golang`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "entry-golang",
          title: "Golang Concurrency",
          content: "Goroutines and channels...",
          category: "Programming",
        }),
      });
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Meta+k");
    const palette = page.getByTestId("cmdk-palette");
    await expect(palette).toBeVisible();

    await page.keyboard.type("conc");
    await page.waitForTimeout(400);

    // 點擊第一個搜尋結果
    const firstResult = palette.getByTestId("cmdk-result-entry-golang");
    await firstResult.click();

    // EntryDetailSheet 開啟
    const detailSheet = page.getByTestId("entry-detail-sheet");
    await expect(detailSheet).toBeVisible();
    await expect(detailSheet.getByText("Golang Concurrency")).toBeVisible();

    // Palette 關閉
    await expect(palette).not.toBeVisible();

    await page.screenshot({ path: `../screenshots/${FEATURE}/cp2-entry-detail-sheet.png` });
  });

  // --- CP-3: QuickCreate entry ---

  test("CP-3 ⌘K → 選 'New Entry' → QuickCreateModal → 建立後 toast", async ({ page }) => {
    test.skip(true, "skeleton：等 F-049 QuickCreate flow + toast 實作");

    await page.route(`${API_BASE}/api/v1/entries`, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "entry-new-1",
            title: "My New Draft Entry",
            status: "draft",
            created_at: "2026-04-28T10:00:00Z",
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Meta+k");
    const palette = page.getByTestId("cmdk-palette");
    await expect(palette).toBeVisible();

    // 輸入 "new" 並選擇 "New Entry"
    await page.keyboard.type("new");
    await page.waitForTimeout(200);

    const newEntryOption = palette.getByText(/new entry/i);
    await newEntryOption.click();

    // QuickCreateModal 出現
    const modal = page.getByTestId("quick-create-modal");
    await expect(modal).toBeVisible();

    // 輸入 title 並選 "Create as Draft"
    const titleInput = modal.getByTestId("quick-create-title");
    await titleInput.fill("My New Draft Entry");
    await modal.getByRole("button", { name: /create as draft/i }).click();

    await page.waitForLoadState("networkidle");

    // toast 出現
    await expect(page.getByText(/entry created/i)).toBeVisible();
    await expect(page.getByText(/open/i)).toBeVisible();

    await page.screenshot({ path: `../screenshots/${FEATURE}/cp3-quick-create-toast.png` });
  });

  // --- CP-4: > prefix AI mode ---

  test("CP-4 輸入 '>sum' → 只顯示 AI Actions（含 'summarize'），其他分組不顯示", async ({ page }) => {
    test.skip(true, "skeleton：等 F-049 > prefix AI mode 分組過濾實作");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Meta+k");
    const palette = page.getByTestId("cmdk-palette");
    await expect(palette).toBeVisible();

    // 輸入 > prefix
    await page.keyboard.type(">sum");
    await page.waitForTimeout(200);

    // AI Actions 分組顯示，含 summarize
    const aiGroup = palette.getByTestId("cmdk-group-ai-actions");
    await expect(aiGroup).toBeVisible();
    await expect(aiGroup.getByText(/summarize/i)).toBeVisible();

    // Navigation 和 Search 分組不顯示
    const navGroup = palette.getByTestId("cmdk-group-navigation");
    await expect(navGroup).not.toBeVisible();

    const searchGroup = palette.getByTestId("cmdk-group-search");
    await expect(searchGroup).not.toBeVisible();

    await page.screenshot({ path: `../screenshots/${FEATURE}/cp4-ai-mode.png` });
  });

  // --- CP-5: 搜尋失敗 silent fail ---

  test("CP-5 搜尋 API 500 → Search Results 不顯示，Navigation 分組正常", async ({ page }) => {
    test.skip(true, "skeleton：等 F-049 搜尋失敗 silent fail 實作");

    await page.route(`${API_BASE}/api/v1/entries/search*`, (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Meta+k");
    const palette = page.getByTestId("cmdk-palette");
    await expect(palette).toBeVisible();

    await page.keyboard.type("conc");
    await page.waitForTimeout(400);

    // Search Results 不顯示（silent fail）
    const searchGroup = palette.getByTestId("cmdk-group-search");
    await expect(searchGroup).not.toBeVisible();

    // Navigation 分組仍正常顯示
    const navGroup = palette.getByTestId("cmdk-group-navigation");
    await expect(navGroup).toBeVisible();

    await page.screenshot({ path: `../screenshots/${FEATURE}/cp5-silent-fail.png` });
  });

  // --- CP-6: grouped results 分組標題 ---

  test("CP-6 空白狀態下 CmdK 顯示 Navigation 分組與快捷操作", async ({ page }) => {
    test.skip(true, "skeleton：等 F-049 CmdK 預設分組顯示實作");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Meta+k");
    const palette = page.getByTestId("cmdk-palette");
    await expect(palette).toBeVisible();

    // 未輸入時顯示 Navigation 分組
    const navGroup = palette.getByTestId("cmdk-group-navigation");
    await expect(navGroup).toBeVisible();

    // 應包含常見導航選項
    await expect(palette.getByText(/inbox|library|settings/i)).toBeVisible();

    await page.screenshot({ path: `../screenshots/${FEATURE}/cp6-default-groups.png` });
  });
});
