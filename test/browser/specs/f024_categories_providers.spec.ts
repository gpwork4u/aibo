/**
 * F-024: Categories + LLM Providers 管理頁
 *
 * 對應 spec: specs/features/f024-categories-llm-providers-pages.md
 * 對應 issue: #63
 */

import { test, expect } from "@playwright/test";
import { createAuthenticatedSession } from "../helpers/auth";
import { cleanupAll, seedCategory, seedLLMProvider } from "../helpers/api-setup";
import { ApiClient } from "../helpers/api-client";

test.describe("F-024 Categories 管理", () => {
  let client: ApiClient;

  test.beforeEach(async ({ page, request }) => {
    const s = await createAuthenticatedSession(page, request, `cat-test-${Date.now()}`);
    client = s.client;
    await cleanupAll(client);
  });

  test.afterEach(async () => {
    await cleanupAll(client);
  });

  test("Scenario 1+7: 空狀態 + 列表顯示", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.getByTestId("categories-empty-state")).toBeVisible();

    await seedCategory(client, "程式筆記");
    await seedCategory(client, "生活雜記");
    await page.reload();

    const rows = page.getByTestId("category-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.first().getByTestId("category-entry-count")).toBeVisible();
  });

  test("Scenario 2: 建立分類", async ({ page }) => {
    await page.goto("/categories");

    await page.getByTestId("create-category-button").click();
    const dialog = page.getByTestId("category-form-dialog");

    await dialog.getByTestId("category-name-input").fill("新分類");
    await dialog.getByTestId("category-description-input").fill("描述文字");
    await dialog.getByTestId("category-submit").click();

    await expect(page.getByText(/分類已建立|建立成功/)).toBeVisible();
    await expect(page.getByText("新分類")).toBeVisible();
  });

  test("Scenario 3: 編輯分類", async ({ page }) => {
    const cat = await seedCategory(client, "原名");
    await page.goto("/categories");

    const row = page.getByTestId("category-row").filter({ hasText: "原名" });
    await row.getByTestId("edit-category-button").click();

    const dialog = page.getByTestId("category-form-dialog");
    const nameInput = dialog.getByTestId("category-name-input");
    await nameInput.clear();
    await nameInput.fill("新名");
    await dialog.getByTestId("category-submit").click();

    await expect(page.getByText("新名")).toBeVisible();
  });

  test("Scenario 4: 名稱重複（case-insensitive）→ error toast", async ({ page }) => {
    await seedCategory(client, "MyCategory");
    await page.goto("/categories");

    await page.getByTestId("create-category-button").click();
    const dialog = page.getByTestId("category-form-dialog");
    await dialog.getByTestId("category-name-input").fill("mycategory");
    await dialog.getByTestId("category-submit").click();

    await expect(page.getByText(/名稱已存在/)).toBeVisible();
  });

  test("Scenario 5: 刪除分類 AlertDialog + 顯示 entry 將移回 Inbox", async ({ page }) => {
    await seedCategory(client, "待刪");
    await page.goto("/categories");

    const row = page.getByTestId("category-row").filter({ hasText: "待刪" });
    await row.getByTestId("delete-category-button").click();

    const alert = page.getByTestId("delete-category-confirm-dialog");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Inbox|移至/);
    await alert.getByTestId("delete-confirm-button").click();

    await expect(page.getByText("待刪")).toHaveCount(0);
  });
});

test.describe("F-024 LLM Providers 管理", () => {
  let client: ApiClient;

  test.beforeEach(async ({ page, request }) => {
    const s = await createAuthenticatedSession(page, request, `llm-test-${Date.now()}`);
    client = s.client;
    await cleanupAll(client);
  });

  test.afterEach(async () => {
    await cleanupAll(client);
  });

  test("Scenario 8: Providers 列表 + Default badge + 健康狀態", async ({ page }) => {
    await seedLLMProvider(client, { name: "provider-A", is_default: true });
    await seedLLMProvider(client, { name: "provider-B" });

    await page.goto("/settings/llm-providers");

    const rows = page.getByTestId("provider-row");
    await expect(rows).toHaveCount(2);

    const defaultRow = rows.filter({ hasText: "provider-A" });
    await expect(defaultRow.getByTestId("default-badge")).toBeVisible();

    // 健康狀態初始 unknown
    await expect(defaultRow.getByTestId("health-status-unknown")).toBeVisible();
  });

  test("Scenario 9: 新增 Provider（含進階設定 Collapsible）", async ({ page }) => {
    await page.goto("/settings/llm-providers");

    await page.getByTestId("create-provider-button").click();
    const dialog = page.getByTestId("provider-form-dialog");

    await dialog.getByTestId("provider-name-input").fill("test-provider");
    await dialog.getByTestId("provider-endpoint-input").fill("https://api.openai.com/v1");
    await dialog.getByTestId("provider-api-key-input").fill("sk-test");
    await dialog.getByTestId("provider-model-input").fill("gpt-4o-mini");

    // 進階設定展開
    await dialog.getByTestId("advanced-settings-toggle").click();
    await expect(dialog.getByTestId("provider-temperature-input")).toBeVisible();

    await dialog.getByTestId("provider-submit").click();

    await expect(page.getByText("test-provider")).toBeVisible();
  });

  test("Scenario 10: 編輯 Provider API Key 欄位顯示「已設定」", async ({ page }) => {
    const p = await seedLLMProvider(client, { name: "edit-target", api_key: "sk-secret" });
    await page.goto("/settings/llm-providers");

    const row = page.getByTestId("provider-row").filter({ hasText: "edit-target" });
    await row.getByTestId("edit-provider-button").click();

    const dialog = page.getByTestId("provider-form-dialog");
    await expect(dialog.getByTestId("api-key-status")).toContainText(/已設定/);

    // 「更新 API Key」按鈕
    await expect(dialog.getByTestId("update-api-key-button")).toBeVisible();
  });

  test("Scenario 12: 健康檢查 → healthy + 回應時間 toast（mock provider 可能失敗）", async ({
    page,
  }) => {
    await seedLLMProvider(client, {
      name: "health-check",
      endpoint_url: "https://invalid.example.com/v1",
    });
    await page.goto("/settings/llm-providers");

    const row = page.getByTestId("provider-row").filter({ hasText: "health-check" });
    await row.getByTestId("health-check-button").click();

    // loading
    await expect(row.getByTestId("health-status-loading")).toBeVisible();

    // 等待結果（healthy 或 unhealthy）
    await expect(
      row.getByTestId("health-status-healthy").or(row.getByTestId("health-status-unhealthy"))
    ).toBeVisible({ timeout: 15_000 });

    // toast 應出現
    await expect(page.getByText(/連線正常|連線失敗|回應時間/)).toBeVisible();
  });

  test("Scenario 14: URL 格式驗證錯誤訊息", async ({ page }) => {
    await page.goto("/settings/llm-providers");

    await page.getByTestId("create-provider-button").click();
    const dialog = page.getByTestId("provider-form-dialog");

    await dialog.getByTestId("provider-name-input").fill("bad-url");
    await dialog.getByTestId("provider-endpoint-input").fill("not-a-url");
    await dialog.getByTestId("provider-model-input").fill("gpt-4");
    await dialog.getByTestId("provider-submit").click();

    await expect(dialog.getByText(/URL 格式|格式不正確/)).toBeVisible();
  });
});
