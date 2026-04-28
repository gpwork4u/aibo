/**
 * F-046: Relation Editor
 *
 * Spec: specs/features/f046-relation-editor.md
 * Issue: #221
 * QA Issue: #223
 *
 * 涵蓋 Sprint 15 QA scenarios：
 * - 新增 derives_from 連結（E2E：搜尋→選擇→Add→chip 出現）
 * - Combobox autocomplete（輸入後顯示搜尋結果）
 * - self-link 前端阻止（Add button disabled）
 * - 刪除 manual link（含確認對話框）
 * - 編輯 link_type（chip badge 更新）
 * - incoming links 唯讀（無 Edit/Delete 按鈕）
 * - 樂觀更新 rollback（API 500 → chip 先出現後消失 + toast）
 * - confidence < 0.7 的 LLM chip 顯示虛線外框
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";

const FEATURE = "F-046";
const API_BASE = process.env.API_BASE_URL || "http://localhost:8081";
const CURRENT_ENTRY_ID = "entry-current";
const TARGET_ENTRY_ID = "entry-b";

// --- Helper: 假資料 ---

function makeSearchResults() {
  return {
    items: [
      { id: "entry-b", title: "Machine Learning Basics", category: "AI" },
      { id: "entry-c", title: "Machine Learning Advanced", category: "AI" },
    ],
    total: 2,
  };
}

function makeLinkChip(overrides: Record<string, unknown> = {}) {
  return {
    id: "link-uuid-1",
    from_id: CURRENT_ENTRY_ID,
    to_id: "entry-b",
    to_title: "Machine Learning Basics",
    link_type: "derives_from",
    relation: "",
    confidence: 1.0,
    source: "manual",
    created_at: "2026-04-28T10:00:00Z",
    ...overrides,
  };
}

function makeIncomingChip() {
  return {
    id: "link-incoming-1",
    from_id: "entry-c",
    from_title: "Some Other Entry",
    to_id: CURRENT_ENTRY_ID,
    link_type: "references",
    confidence: 0.9,
    source: "manual",
    created_at: "2026-04-28T10:00:00Z",
  };
}

test.describe(`[${FEATURE}] Relation Editor`, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
  });

  // --- Happy Path ---

  test("RE-1 新增 derives_from 連結（E2E）：搜尋→選擇→選 link_type→Add→chip 出現", async ({ page }) => {
    test.skip(true, "skeleton：等 F-046 RelationEditor + EntrySearch 元件實作");

    // Mock 搜尋 API
    await page.route(`${API_BASE}/api/v1/entries/search*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeSearchResults()),
      });
    });

    // Mock 建立 link API
    await page.route(`${API_BASE}/api/v1/entries/${CURRENT_ENTRY_ID}/links`, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(makeLinkChip()),
        });
      } else if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            outgoing: [makeLinkChip()],
            incoming: [],
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto(`/entries/${CURRENT_ENTRY_ID}`);
    await page.waitForLoadState("networkidle");

    // 在 EntrySearch combobox 輸入搜尋關鍵字
    const searchInput = page.getByTestId("entry-search-input");
    await searchInput.fill("machine");
    await page.waitForTimeout(300); // debounce

    // 選擇第一個搜尋結果
    const firstResult = page.getByText("Machine Learning Basics");
    await firstResult.click();

    // 選擇 link_type = derives_from
    const linkTypeSelect = page.getByTestId("link-type-select");
    await linkTypeSelect.selectOption("derives_from");

    // 點擊 Add 按鈕
    const addButton = page.getByRole("button", { name: /add/i });
    await addButton.click();
    await page.waitForLoadState("networkidle");

    // outgoing 區塊出現新 chip，badge = derives_from（blue）
    const outgoingSection = page.getByTestId("outgoing-links");
    await expect(outgoingSection).toBeVisible();
    const chip = outgoingSection.getByTestId("link-chip").first();
    await expect(chip).toBeVisible();
    await expect(chip.getByText("derives_from")).toBeVisible();
  });

  test("RE-2 Combobox autocomplete：輸入 'go lang' 後下拉顯示搜尋結果", async ({ page }) => {
    test.skip(true, "skeleton：等 F-046 EntrySearch Combobox 實作");

    await page.route(`${API_BASE}/api/v1/entries/search*`, (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("q")?.includes("go lang")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [{ id: "entry-go", title: "Go Language Basics", category: "Programming" }],
            total: 1,
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto(`/entries/${CURRENT_ENTRY_ID}`);
    await page.waitForLoadState("networkidle");

    const searchInput = page.getByTestId("entry-search-input");
    await searchInput.fill("go lang");
    await page.waitForTimeout(300); // 等待 debounce

    // Combobox 下拉顯示結果
    const dropdown = page.getByTestId("entry-search-dropdown");
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByText("Go Language Basics")).toBeVisible();
  });

  test("RE-3 self-link 前端阻止：選擇與當前 entry 相同時 Add button disabled", async ({ page }) => {
    test.skip(true, "skeleton：等 F-046 self-link 前端驗證實作");

    await page.route(`${API_BASE}/api/v1/entries/search*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: CURRENT_ENTRY_ID, title: "Current Entry (self)", category: "Test" }],
          total: 1,
        }),
      });
    });

    await page.goto(`/entries/${CURRENT_ENTRY_ID}`);
    await page.waitForLoadState("networkidle");

    const searchInput = page.getByTestId("entry-search-input");
    await searchInput.fill("Current");
    await page.waitForTimeout(300);

    // 選擇與當前 entry 相同的結果
    const selfResult = page.getByText("Current Entry (self)");
    await selfResult.click();

    // Add button 應為 disabled
    const addButton = page.getByRole("button", { name: /add/i });
    await expect(addButton).toBeDisabled();
  });

  test("RE-4 刪除 manual link：hover chip → Delete → 確認對話框 → 確認後 chip 消失", async ({ page }) => {
    test.skip(true, "skeleton：等 F-046 link chip delete 確認對話框實作");

    await page.route(`${API_BASE}/api/v1/entries/${CURRENT_ENTRY_ID}/links`, (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            outgoing: [makeLinkChip()],
            incoming: [],
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.route(`${API_BASE}/api/v1/entries/links/link-uuid-1`, (route) => {
      if (route.request().method() === "DELETE") {
        route.fulfill({ status: 204 });
      } else {
        route.continue();
      }
    });

    await page.goto(`/entries/${CURRENT_ENTRY_ID}`);
    await page.waitForLoadState("networkidle");

    const chip = page.getByTestId("link-chip").first();

    // hover chip 顯示 Delete 按鈕
    await chip.hover();
    const deleteButton = chip.getByRole("button", { name: /delete/i });
    await deleteButton.click();

    // 確認對話框出現
    const confirmDialog = page.getByRole("alertdialog");
    await expect(confirmDialog).toBeVisible();

    // 確認刪除
    await confirmDialog.getByRole("button", { name: /confirm|確認/i }).click();
    await page.waitForLoadState("networkidle");

    // chip 消失
    await expect(chip).not.toBeVisible();
  });

  test("RE-5 編輯 link_type：hover chip → Edit → 選 derives_from → chip badge 更新為 blue", async ({ page }) => {
    test.skip(true, "skeleton：等 F-046 link chip edit 功能實作");

    await page.route(`${API_BASE}/api/v1/entries/${CURRENT_ENTRY_ID}/links`, (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            outgoing: [makeLinkChip({ link_type: "related_to" })],
            incoming: [],
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.route(`${API_BASE}/api/v1/entries/links/link-uuid-1`, (route) => {
      if (route.request().method() === "PATCH") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeLinkChip({ link_type: "derives_from" })),
        });
      } else {
        route.continue();
      }
    });

    await page.goto(`/entries/${CURRENT_ENTRY_ID}`);
    await page.waitForLoadState("networkidle");

    const chip = page.getByTestId("link-chip").first();
    await chip.hover();

    // 點擊 Edit
    const editButton = chip.getByRole("button", { name: /edit/i });
    await editButton.click();

    // 選擇新的 link_type
    const linkTypeSelect = page.getByTestId("edit-link-type-select");
    await linkTypeSelect.selectOption("derives_from");
    await page.getByRole("button", { name: /save|儲存/i }).click();
    await page.waitForLoadState("networkidle");

    // chip badge 更新為 derives_from
    await expect(chip.getByText("derives_from")).toBeVisible();
  });

  // --- Edge Cases ---

  test("RE-6 incoming links 唯讀：hover incoming chip 無 Edit / Delete 按鈕", async ({ page }) => {
    test.skip(true, "skeleton：等 F-046 incoming links 唯讀 UI 實作");

    await page.route(`${API_BASE}/api/v1/entries/${CURRENT_ENTRY_ID}/links`, (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            outgoing: [],
            incoming: [makeIncomingChip()],
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto(`/entries/${CURRENT_ENTRY_ID}`);
    await page.waitForLoadState("networkidle");

    const incomingSection = page.getByTestId("incoming-links");
    const incomingChip = incomingSection.getByTestId("link-chip").first();

    await incomingChip.hover();

    // 無 Edit / Delete 按鈕
    await expect(incomingChip.getByRole("button", { name: /edit/i })).toHaveCount(0);
    await expect(incomingChip.getByRole("button", { name: /delete/i })).toHaveCount(0);
  });

  test("RE-7 樂觀更新 rollback：API 500 → chip 先出現後消失 + toast 顯示失敗訊息", async ({ page }) => {
    test.skip(true, "skeleton：等 F-046 樂觀更新 + rollback 邏輯實作");

    await page.route(`${API_BASE}/api/v1/entries/search*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeSearchResults()),
      });
    });

    // API 回傳 500
    await page.route(`${API_BASE}/api/v1/entries/${CURRENT_ENTRY_ID}/links`, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      } else if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ outgoing: [], incoming: [] }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto(`/entries/${CURRENT_ENTRY_ID}`);
    await page.waitForLoadState("networkidle");

    const searchInput = page.getByTestId("entry-search-input");
    await searchInput.fill("machine");
    await page.waitForTimeout(300);
    await page.getByText("Machine Learning Basics").click();
    await page.getByTestId("link-type-select").selectOption("derives_from");
    await page.getByRole("button", { name: /add/i }).click();

    // 樂觀更新：chip 先出現
    const chip = page.getByTestId("link-chip").first();
    await expect(chip).toBeVisible();

    // rollback：chip 消失
    await expect(chip).not.toBeVisible({ timeout: 5000 });

    // toast 顯示失敗訊息
    await expect(page.getByText(/Failed to add link/i)).toBeVisible();
  });

  test("RE-8 confidence < 0.7 的 LLM chip 顯示虛線外框樣式", async ({ page }) => {
    test.skip(true, "skeleton：等 F-046 LLM link chip 樣式實作");

    const llmLink = makeLinkChip({
      id: "link-llm-1",
      source: "llm",
      confidence: 0.5,
    });

    await page.route(`${API_BASE}/api/v1/entries/${CURRENT_ENTRY_ID}/links`, (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            outgoing: [llmLink],
            incoming: [],
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto(`/entries/${CURRENT_ENTRY_ID}`);
    await page.waitForLoadState("networkidle");

    const llmChip = page.getByTestId("link-chip-link-llm-1");
    await expect(llmChip).toBeVisible();

    // 驗證有虛線外框的 CSS class 或 style
    await expect(llmChip).toHaveClass(/border-dashed/);
  });
});
