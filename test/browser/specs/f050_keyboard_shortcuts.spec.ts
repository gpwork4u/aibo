/**
 * F-050: Keyboard Shortcuts
 *
 * Spec: specs/features/f050-keyboard-shortcuts.md
 * Issue: #234
 * QA Issue: #236
 *
 * 涵蓋 Sprint 16 QA scenarios：
 * KS-1  G+I sequential key → navigate to /dashboard/inbox
 * KS-2  ? 開啟 ShortcutsModal（含全部 sections）
 * KS-3  input focus 中按 J 不觸發 Library list 移動
 * KS-4  Sequential key 超時重置（G → 600ms → I 不觸發）
 * KS-5  ⌘S 儲存（Entry 編輯模式 → PATCH → toast "Saved"）
 * KS-6  ⌘K 開啟 Command Palette
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";

const FEATURE = "F-050";
const API_BASE = process.env.API_BASE_URL || "http://localhost:8081";
const ENTRY_ID = "entry-ks-test";

test.describe(`[${FEATURE}] Keyboard Shortcuts`, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
  });

  // --- KS-1: G+I sequential → /dashboard/inbox ---

  test("KS-1 G+I sequential（500ms 內）→ navigate to /dashboard/inbox", async ({ page }) => {
    test.skip(true, "skeleton：等 F-050 G+I sequential navigation 實作");

    await page.goto("/dashboard/library");
    await page.waitForLoadState("networkidle");

    // 確認無 input focus
    await page.keyboard.press("Escape");

    // 按 G，500ms 內按 I
    await page.keyboard.press("g");
    await page.waitForTimeout(100);
    await page.keyboard.press("i");

    await page.waitForLoadState("networkidle");

    expect(page.url()).toMatch(/\/dashboard\/inbox/);

    await page.screenshot({ path: `../screenshots/${FEATURE}/ks1-g-i-navigation.png` });
  });

  // --- KS-2: ? 開啟 ShortcutsModal ---

  test("KS-2 按 ? 開啟 ShortcutsModal，含全部 sections", async ({ page }) => {
    test.skip(true, "skeleton：等 F-050 ShortcutsModal + ? 快捷鍵實作");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // 確認無 input focus
    await page.keyboard.press("Escape");

    // 按 ?
    await page.keyboard.press("?");

    // ShortcutsModal 出現
    const modal = page.getByRole("dialog", { name: /keyboard shortcuts/i }).or(
      page.getByTestId("shortcuts-modal"),
    );
    await expect(modal).toBeVisible();

    // 包含必要 sections
    await expect(modal.getByText(/navigation/i)).toBeVisible();
    await expect(modal.getByText(/inbox/i)).toBeVisible();
    await expect(modal.getByText(/library/i)).toBeVisible();
    await expect(modal.getByText(/entry/i)).toBeVisible();
    await expect(modal.getByText(/copilot/i)).toBeVisible();

    await page.screenshot({ path: `../screenshots/${FEATURE}/ks2-shortcuts-modal.png`, fullPage: true });

    // 按 Escape 關閉
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });

  // --- KS-3: input focus 中 J 不觸發 ---

  test("KS-3 搜尋框 focused 時按 J 不觸發 Library list 移動", async ({ page }) => {
    test.skip(true, "skeleton：等 F-050 input focus 防止快捷鍵觸發實作");

    await page.route(`${API_BASE}/api/v1/entries/search*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0 }),
      });
    });

    await page.goto("/dashboard/library");
    await page.waitForLoadState("networkidle");

    // 找到搜尋框並 focus
    const searchInput = page.getByTestId("library-search-input").or(
      page.locator('input[type="search"]'),
    );
    await searchInput.click();
    await expect(searchInput).toBeFocused();

    // 記錄當前選中的 list item（如果有）
    const selectedItemBefore = await page
      .getByTestId("library-list-item[data-selected='true']")
      .count()
      .catch(() => 0);

    // 在 input focus 中輸入 j
    await page.keyboard.press("j");

    // Library list 選中項目不應改變
    const selectedItemAfter = await page
      .getByTestId("library-list-item[data-selected='true']")
      .count()
      .catch(() => 0);

    expect(selectedItemAfter).toBe(selectedItemBefore);

    // input 中應有字元 j（正常文字輸入）
    await expect(searchInput).toHaveValue(/j/);

    await page.screenshot({ path: `../screenshots/${FEATURE}/ks3-input-focus-no-shortcut.png` });
  });

  // --- KS-4: Sequential key 超時重置 ---

  test("KS-4 按 G 後等待 600ms 再按 I → URL 不變（G+I 超時未觸發）", async ({ page }) => {
    test.skip(true, "skeleton：等 F-050 sequential key timeout 重置實作");

    await page.goto("/dashboard/library");
    await page.waitForLoadState("networkidle");

    // 確認無 input focus
    await page.keyboard.press("Escape");

    const urlBefore = page.url();

    // 按 G
    await page.keyboard.press("g");

    // 等待超過 500ms timeout（600ms）
    await page.waitForTimeout(600);

    // 再按 I — 此時 G 已超時，不應觸發 G+I
    await page.keyboard.press("i");
    await page.waitForTimeout(200);

    // URL 應不變
    expect(page.url()).toBe(urlBefore);

    await page.screenshot({ path: `../screenshots/${FEATURE}/ks4-sequential-timeout.png` });
  });

  // --- KS-5: ⌘S 儲存 ---

  test("KS-5 Entry 編輯模式按 ⌘S → PATCH request 送出 + toast 'Saved'", async ({ page }) => {
    test.skip(true, "skeleton：等 F-050 ⌘S 儲存快捷鍵 + Entry 編輯模式實作");

    let patchCalled = false;

    await page.route(`${API_BASE}/api/v1/entries/${ENTRY_ID}`, (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: ENTRY_ID,
            title: "Test Entry",
            content: "Original content",
            status: "draft",
            updated_at: "2026-04-28T10:00:00Z",
          }),
        });
      } else if (route.request().method() === "PATCH") {
        patchCalled = true;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: ENTRY_ID,
            title: "Test Entry",
            content: "Original content",
            updated_at: "2026-04-28T10:01:00Z",
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto(`/entries/${ENTRY_ID}`);
    await page.waitForLoadState("networkidle");

    // 進入編輯模式
    const editButton = page.getByRole("button", { name: /edit/i });
    await editButton.click();

    // 確認在編輯模式
    const editor = page.getByTestId("entry-editor").or(
      page.locator("[contenteditable='true']"),
    );
    await expect(editor).toBeVisible();

    // 按 ⌘S
    await page.keyboard.press("Meta+s");
    await page.waitForLoadState("networkidle");

    // PATCH 應已送出
    expect(patchCalled).toBe(true);

    // toast "Saved" 出現
    await expect(page.getByText(/saved/i)).toBeVisible();

    await page.screenshot({ path: `../screenshots/${FEATURE}/ks5-cmd-s-saved.png` });
  });

  // --- KS-6: ⌘K 開啟 Command Palette ---

  test("KS-6 ⌘K → Command Palette 開啟（F-049 CmdK 整合）", async ({ page }) => {
    test.skip(true, "skeleton：等 F-050 ⌘K 快捷鍵 + F-049 CmdK 整合實作");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Palette 初始應隱藏
    const palette = page.getByTestId("cmdk-palette");
    await expect(palette).not.toBeVisible();

    // 按 ⌘K
    await page.keyboard.press("Meta+k");
    await expect(palette).toBeVisible();

    // Palette 內有搜尋輸入框
    const paletteInput = palette.getByRole("textbox").or(
      palette.getByTestId("cmdk-input"),
    );
    await expect(paletteInput).toBeVisible();
    await expect(paletteInput).toBeFocused();

    // 按 Escape 關閉
    await page.keyboard.press("Escape");
    await expect(palette).not.toBeVisible();

    await page.screenshot({ path: `../screenshots/${FEATURE}/ks6-cmdk-open-close.png` });
  });
});
