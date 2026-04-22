import { test, expect } from "@playwright/test";

/**
 * Placeholder Tests - 等前端完成後補充實際測試
 *
 * 目前先建立測試框架和基本的 smoke test。
 * Sprint 1 的前端頁面完成後，將補充以下測試：
 *
 * - auth.spec.ts: API Key 管理頁面
 * - entry.spec.ts: Entry CRUD 頁面
 * - category.spec.ts: Category 管理頁面
 * - llm-provider.spec.ts: LLM Provider 設定頁面
 */

test.describe("Placeholder - 前端開發完成後補充", () => {
  test("框架驗證 - Playwright 正常運作", async ({ page }) => {
    // 此測試僅驗證 Playwright 框架能正常執行
    // 前端部署後替換為實際的 smoke test
    await page.goto("/");

    // 等前端完成後，驗證頁面標題或關鍵元素
    // await expect(page).toHaveTitle(/Aibo/);
    expect(true).toBe(true);
  });

  test.skip("API Key 管理頁面 - 等前端完成", async ({ page }) => {
    // TODO: 驗證 API Key 列表頁面
    // TODO: 驗證建立 API Key 對話框
    // TODO: 驗證刪除 API Key 確認
  });

  test.skip("知識條目 CRUD - 等前端完成", async ({ page }) => {
    // TODO: 驗證 Entry 列表頁面
    // TODO: 驗證建立 Entry 表單
    // TODO: 驗證編輯 Entry
    // TODO: 驗證刪除 Entry 確認
    // TODO: 驗證分頁
    // TODO: 驗證搜尋
    // TODO: 驗證 Tag 過濾
  });

  test.skip("分類管理 - 等前端完成", async ({ page }) => {
    // TODO: 驗證 Category 列表
    // TODO: 驗證建立 Category
    // TODO: 驗證編輯 Category
    // TODO: 驗證刪除 Category（確認 entries 回到 Inbox）
  });

  test.skip("LLM Provider 管理 - 等前端完成", async ({ page }) => {
    // TODO: 驗證 Provider 列表
    // TODO: 驗證建立 Provider
    // TODO: 驗證設定 Default
    // TODO: 驗證健康檢查
    // TODO: 驗證 API Key 不顯示明文
  });

  test.skip("Inbox 暫存區 - 等前端完成", async ({ page }) => {
    // TODO: 驗證 Inbox 頁面
    // TODO: 驗證快速新增
    // TODO: 驗證移出到分類
    // TODO: 驗證歸檔
  });
});
