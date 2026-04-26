import { defineConfig, devices } from "@playwright/test";

/**
 * Aibo Browser E2E Test 設定（Sprint 7+ / Sprint 11 起加入隔離環境）
 *
 * 環境變數：
 * - BASE_URL: 前端 URL（預設 http://localhost:3001 — test-frontend 隔離環境）
 * - API_BASE_URL: API URL（預設 http://localhost:8081 — test-api 隔離環境）
 * - AIBO_E2E_SKIP_DOCKER=1：跳過 globalSetup 的 docker compose（外部已起好或要 reuse）
 * - AIBO_E2E_KEEP=1：跑完不收環境，方便手動 debug
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
  globalSetup: require.resolve("./global-setup"),
  globalTeardown: require.resolve("./global-teardown"),
  reporter: [
    ["html", { outputFolder: "../screenshots/report", open: "never" }],
    ["list"],
    ["json", { outputFile: "../reports/browser-results.json" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3001",
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
