/**
 * Sprint 13 Visual Regression
 *
 * 對應 QA Issue #198 視覺迴歸（最小範圍）：
 * - /login light + dark
 * - /dashboard light + dark（4 slot 並排）
 * - CmdK overlay 開啟狀態
 *
 * 首次執行時 Playwright 會自動產生 baseline snapshot（test-results 下對應 *.png）。
 * 後續執行會 diff 比對；若需更新 baseline：
 *   cd test/browser && npx playwright test sprint13_visual_regression --update-snapshots
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";
import { presetTheme } from "../helpers/theme";

// 視覺迴歸對顏色 / 字體微差容忍 2%
const SNAP_OPTS = {
  maxDiffPixelRatio: 0.02,
  animations: "disabled" as const,
};

test.describe("Sprint 13 Visual Regression", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  for (const theme of ["light", "dark"] as const) {
    test(`/login ${theme}`, async ({ page, context }) => {
      test.skip(true, "Wave 4 skeleton：等 /login + theme system 完成後跑 baseline");
      await presetTheme(context, theme);
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot(`login-${theme}.png`, SNAP_OPTS);
    });
  }

  for (const theme of ["light", "dark"] as const) {
    test(`/dashboard ${theme}（4 slot 並排）`, async ({ page, context }) => {
      test.skip(true, "Wave 4 skeleton：等 /dashboard parallel routes 完成");
      await presetTheme(context, theme);
      const apiKey = process.env.AIBO_E2E_API_KEY!;
      await loginWithCookie(context, apiKey);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // 等所有 slot 都掛載
      for (const slot of ["inbox", "library", "today", "copilot"]) {
        await page.getByTestId(`slot-${slot}`).waitFor({ state: "visible" });
      }
      await expect(page).toHaveScreenshot(`dashboard-${theme}.png`, SNAP_OPTS);
    });
  }

  test("CmdK overlay 開啟狀態", async ({ page, context }) => {
    test.skip(true, "Wave 4 skeleton：等 F-037 CmdK 完成");
    await presetTheme(context, "light");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const meta = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${meta}+KeyK`);
    await page.getByTestId("cmdk-palette").waitFor({ state: "visible" });
    await expect(page).toHaveScreenshot("cmdk-overlay-light.png", SNAP_OPTS);
  });
});
