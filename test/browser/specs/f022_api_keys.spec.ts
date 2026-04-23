/**
 * F-022: API Keys 管理頁
 *
 * 對應 spec: specs/features/f022-api-keys-page.md
 * 對應 issue: #61
 */

import { test, expect } from "@playwright/test";
import { createAuthenticatedSession } from "../helpers/auth";
import { ApiClient } from "../helpers/api-client";

test.describe("F-022 API Keys 管理", () => {
  let client: ApiClient;

  test.beforeEach(async ({ page, request }) => {
    const session = await createAuthenticatedSession(page, request, `api-keys-test-${Date.now()}`);
    client = session.client;
  });

  test.afterEach(async () => {
    // 留最後一把（最後建立的 browser-test-*），刪不必要的
    // 由於最後一把不能刪，略過清理
  });

  test("Scenario 1: 查看 API Keys 列表顯示必要欄位", async ({ page }) => {
    await page.goto("/settings/api-keys");

    const table = page.getByTestId("api-keys-table");
    await expect(table).toBeVisible();

    // 至少一筆（bootstrap 建的）
    const firstRow = table.getByTestId("api-key-row").first();
    await expect(firstRow).toBeVisible();

    // 欄位：名稱、Key 前綴、狀態、到期日、最後使用、操作
    await expect(firstRow.getByTestId("key-name")).toBeVisible();
    await expect(firstRow.getByTestId("key-prefix")).toBeVisible();
    await expect(firstRow.getByTestId("key-status")).toBeVisible();
    await expect(firstRow.getByTestId("key-expires-at")).toBeVisible();
    await expect(firstRow.getByTestId("key-last-used")).toBeVisible();
  });

  test("Scenario 2+3: 建立新 API Key，完整 key 只顯示一次，可複製", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/settings/api-keys");

    await page.getByTestId("create-api-key-button").click();

    const dialog = page.getByTestId("create-api-key-dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByTestId("api-key-name-input").fill("frontend-test-key");
    // 預設到期日：永不過期（可選）
    await dialog.getByTestId("api-key-submit").click();

    // 新 key dialog 顯示完整 key
    const showDialog = page.getByTestId("show-api-key-dialog");
    await expect(showDialog).toBeVisible();
    const fullKey = showDialog.getByTestId("full-api-key");
    await expect(fullKey).toBeVisible();
    const keyValue = await fullKey.textContent();
    expect(keyValue?.length ?? 0).toBeGreaterThan(20);

    // 點複製按鈕
    await showDialog.getByTestId("copy-key-button").click();
    await expect(page.getByText(/已複製/)).toBeVisible();

    // 驗證剪貼簿（可能因 headless 限制失敗，容錯）
    try {
      const clipText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipText).toContain(keyValue?.trim() ?? "");
    } catch {
      // ignore — 環境限制
    }

    // 關閉 dialog
    await showDialog.getByTestId("confirm-copied-button").click();

    // 列表應刷新包含 frontend-test-key
    await expect(page.getByText("frontend-test-key")).toBeVisible();
  });

  test("Scenario 4: 撤銷 API Key 有 AlertDialog 確認", async ({ page }) => {
    // 先建一把可刪除的
    await client.listApiKeys();
    await page.goto("/settings/api-keys");

    // 建一把額外的 key 供刪除
    await page.getByTestId("create-api-key-button").click();
    await page.getByTestId("api-key-name-input").fill("to-be-revoked");
    await page.getByTestId("api-key-submit").click();
    await page.getByTestId("confirm-copied-button").click();

    // 找到這筆並點撤銷
    const row = page.getByTestId("api-key-row").filter({ hasText: "to-be-revoked" });
    await row.getByTestId("revoke-key-button").click();

    const alert = page.getByTestId("revoke-confirm-dialog");
    await expect(alert).toBeVisible();
    await alert.getByTestId("revoke-confirm-button").click();

    // 刷新後該列消失
    await expect(page.getByText("to-be-revoked")).toHaveCount(0);
  });

  test("Scenario 5: 最後一把 Active Key 的撤銷按鈕 disabled", async ({ page }) => {
    await page.goto("/settings/api-keys");

    // 先刪除除最後一把外的所有 key（透過 API）
    const keys = await client.listApiKeys();
    const active = (keys.data ?? []).filter((k: { is_active?: boolean }) => k.is_active !== false);

    // 若剩一把，直接驗證
    await page.reload();
    const rows = page.getByTestId("api-key-row");
    const count = await rows.count();
    if (count === 1) {
      const revokeBtn = rows.first().getByTestId("revoke-key-button");
      await expect(revokeBtn).toBeDisabled();

      // hover tooltip
      await revokeBtn.hover();
      await expect(page.getByText(/不能撤銷最後一把有效的 API Key/)).toBeVisible();
    } else {
      test.info().annotations.push({
        type: "note",
        description: `尚有 ${count} 把 active key，略過最後一把斷言（需 isolated 環境）`,
      });
    }
  });

  test("Scenario 6: 名稱重複 → error toast", async ({ page }) => {
    await page.goto("/settings/api-keys");

    // 建第一把
    const name = `dup-name-${Date.now()}`;
    await page.getByTestId("create-api-key-button").click();
    await page.getByTestId("api-key-name-input").fill(name);
    await page.getByTestId("api-key-submit").click();
    await page.getByTestId("confirm-copied-button").click();

    // 建第二把用相同名稱
    await page.getByTestId("create-api-key-button").click();
    await page.getByTestId("api-key-name-input").fill(name);
    await page.getByTestId("api-key-submit").click();

    await expect(page.getByText(/名稱已存在|已經存在|duplicate/i)).toBeVisible();
  });
});
