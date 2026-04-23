import { defineConfig, devices } from "@playwright/test";

/**
 * Aibo Browser E2E Test 設定（Sprint 7）
 *
 * 環境變數：
 * - BASE_URL: 前端 URL（預設 http://localhost:3000）
 * - API_BASE_URL: API URL（預設 http://localhost:8080）
 */
export default defineConfig({
  testDir: "./specs",
  fullyParallel: false, // 改為序列以避免共用 API/DB state 衝突
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["html", { outputFolder: "../screenshots/report", open: "never" }],
    ["list"],
    ["json", { outputFile: "../reports/browser-results.json" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
      testMatch: /f021_layout\.spec\.ts/, // mobile 僅跑 layout 響應式測試
    },
  ],
});
