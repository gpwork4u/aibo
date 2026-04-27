/**
 * F-034c — GitHub 設定頁面（/settings/github）
 *
 * 對應 issue：#181（Wave 0 skeleton；F-034c 實作完成後解 skip）
 * 對應 spec：specs/features/f034-github-commit-integration.md
 *
 * 涵蓋 scenarios：
 *  1. 訪問頁面顯示「未連接」狀態
 *  2. 填 valid PAT → 連接成功 → 顯示 username
 *  3. 填 invalid PAT → 顯示 422 GITHUB_TOKEN_INVALID 錯誤訊息
 *  4. 填 missing scope PAT → 顯示 422 GITHUB_TOKEN_INSUFFICIENT_SCOPE + 提示需 repo + read:user
 *  5. 已連接 → 點中斷 → 二次確認 → DELETE → 回未連接
 *  6. 已連接 → 點中斷後在 dialog 取消 → 仍維持已連接
 *  7. 未認證 → POST /connect without X-API-Key → 401 UNAUTHORIZED
 *  8. 重新連接（覆蓋既有 token）→ POST /connect 201，username 不變
 *
 * Wave 0：所有 test 皆 test.skip(true, ...) 包起來。
 * 等 F-034c 前端實作完成後 unskip 並確認 testid 對齊。
 *
 * testid 對應：dev/frontend/lib/github/testids.ts GITHUB_TESTIDS
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  GITHUB_SETTINGS_TESTIDS as G,
  installGithubMock,
} from "../fixtures/github";

const SETTINGS_PATH = "/settings/github";

test.describe("GitHub 設定頁面 — 連線與中斷流程（F-034c）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa12-github-settings-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
  });

  // ---------------------------------------------------------------------------
  // Scenario 1: 訪問頁面顯示「未連接」狀態
  // ---------------------------------------------------------------------------
  test("Scenario: 訪問 /settings/github → 顯示未連接狀態與 PAT 輸入欄", async ({ page }) => {
    test.skip(true, "Wave 0 — 等 F-034c /settings/github 頁面實作完成再啟用");

    // GIVEN GET /status 回 connected=false
    await installGithubMock(page, {
      status: { connected: false },
    });

    // WHEN 進設定頁
    await page.goto(SETTINGS_PATH);

    // THEN 顯示 PAT 輸入欄 + 連接按鈕（未連接狀態）
    await expect(page.getByTestId(G.patInput)).toBeVisible();
    await expect(page.getByTestId(G.connectButton)).toBeVisible();
    // 已連接才有的 username 不應顯示
    await expect(page.getByTestId(G.usernameLabel)).toBeHidden();
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: 填 valid PAT → 連接成功 → 顯示 username
  // ---------------------------------------------------------------------------
  test("Scenario: 填 valid PAT → POST /connect 成功 → 顯示已連接 + username", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034c connect 表單實作完成再啟用");

    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };

    // GIVEN 初始未連接，POST /connect 回 201
    await installGithubMock(page, {
      status: { connected: false },
      connectResponse: {
        status: 201,
        body: {
          connected: true,
          id: "mock-uuid-001",
          username: "gpwork4u",
          scopes: ["repo", "read:user"],
          token_set: true,
          last_synced_at: null,
          created_at: "2026-04-26T10:00:00Z",
          updated_at: "2026-04-26T10:00:00Z",
        },
      },
      recorder,
    });

    // WHEN 前往設定頁 + 填入 PAT + 點連接
    await page.goto(SETTINGS_PATH);
    await page.getByTestId(G.patInput).fill("ghp_validtoken123456");
    await page.getByTestId(G.connectButton).click();

    // THEN POST /connect 有被呼叫
    await expect
      .poll(() => recorder.requests.some((r) => r.method === "POST" && /connect/.test(r.url)))
      .toBeTruthy();

    // THEN 顯示已連接 username，PAT 輸入欄與連接按鈕隱藏
    await expect(page.getByTestId(G.usernameLabel)).toBeVisible();
    await expect(page.getByTestId(G.usernameLabel)).toContainText("gpwork4u");
    await expect(page.getByTestId(G.connectButton)).toBeHidden();

    // 確認 request body 含 token 欄位（前端有把 PAT 帶進去）
    const connectReq = recorder.requests.find((r) => /connect/.test(r.url));
    expect(connectReq?.body).toMatchObject({ token: expect.any(String) });
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: 填 invalid PAT → 顯示 GITHUB_TOKEN_INVALID 錯誤訊息
  // ---------------------------------------------------------------------------
  test("Scenario: 填 invalid PAT → POST /connect 回 422 GITHUB_TOKEN_INVALID → 顯示錯誤訊息", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034c 錯誤處理 UI 實作完成再啟用");

    // GIVEN POST /connect 回 422 GITHUB_TOKEN_INVALID
    await installGithubMock(page, {
      status: { connected: false },
      connectResponse: {
        status: 422,
        body: {
          code: "GITHUB_TOKEN_INVALID",
          message: "PAT 無法通過 GitHub 驗證，請確認 token 是否正確",
        },
      },
    });

    // WHEN 填入無效 PAT 並送出
    await page.goto(SETTINGS_PATH);
    await page.getByTestId(G.patInput).fill("ghp_invalid_token_xxx");
    await page.getByTestId(G.connectButton).click();

    // THEN 顯示即時錯誤訊息（github-error-message），仍維持未連接狀態
    await expect(page.getByTestId(G.errorMessage)).toBeVisible();
    await expect(page.getByTestId(G.usernameLabel)).toBeHidden();
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: 填 missing scope PAT → 顯示 422 + 提示需 repo + read:user
  // ---------------------------------------------------------------------------
  test("Scenario: 填缺少 scope 的 PAT → POST /connect 回 422 GITHUB_TOKEN_INSUFFICIENT_SCOPE → 提示缺少 repo/read:user", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034c scope 錯誤提示 UI 實作完成再啟用");

    // GIVEN POST /connect 回 422 GITHUB_TOKEN_INSUFFICIENT_SCOPE
    await installGithubMock(page, {
      status: { connected: false },
      connectResponse: {
        status: 422,
        body: {
          code: "GITHUB_TOKEN_INSUFFICIENT_SCOPE",
          message: "PAT 缺少 scopes，需要 repo + read:user",
        },
      },
    });

    // WHEN 填入 scope 不足的 PAT
    await page.goto(SETTINGS_PATH);
    await page.getByTestId(G.patInput).fill("ghp_noscope_token_xxx");
    await page.getByTestId(G.connectButton).click();

    // THEN 顯示錯誤提示，並包含 repo / read:user 字樣
    await expect(page.getByTestId(G.errorMessage)).toBeVisible();
    const errorText = await page.getByTestId(G.errorMessage).textContent();
    expect(errorText).toMatch(/repo|read:user/i);
    // 仍維持未連接
    await expect(page.getByTestId(G.usernameLabel)).toBeHidden();
  });

  // ---------------------------------------------------------------------------
  // Scenario 5: 已連接 → 點中斷 → 二次確認 → DELETE → 回未連接
  // ---------------------------------------------------------------------------
  test("Scenario: 已連接 → 點中斷按鈕 → AlertDialog 確認 → DELETE → 回到未連接狀態", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034c disconnect 流程實作完成再啟用");

    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };

    // GIVEN 已連接
    await installGithubMock(page, {
      status: {
        connected: true,
        id: "mock-uuid-001",
        username: "gpwork4u",
        scopes: ["repo", "read:user"],
        token_set: true,
        last_synced_at: "2026-04-26T10:00:00Z",
        last_error: null,
      },
      deleteResponse: { status: 204 },
      recorder,
    });

    // WHEN 進設定頁
    await page.goto(SETTINGS_PATH);
    await expect(page.getByTestId(G.usernameLabel)).toBeVisible();
    await expect(page.getByTestId(G.usernameLabel)).toContainText("gpwork4u");

    // WHEN 點中斷按鈕 → AlertDialog 的確認按鈕出現
    await page.getByTestId(G.disconnectButton).click();
    await expect(page.getByTestId(G.disconnectDialogConfirm)).toBeVisible();

    // WHEN 點確認中斷
    await page.getByTestId(G.disconnectDialogConfirm).click();

    // THEN DELETE 有被呼叫
    await expect
      .poll(() => recorder.requests.some((r) => r.method === "DELETE"))
      .toBeTruthy();

    // THEN 切回未連接狀態（PAT 輸入欄重新顯示，username 隱藏）
    await expect(page.getByTestId(G.patInput)).toBeVisible();
    await expect(page.getByTestId(G.usernameLabel)).toBeHidden();
  });

  // ---------------------------------------------------------------------------
  // Scenario 6: 已連接 → 點中斷後在 dialog 取消 → 仍維持已連接
  // ---------------------------------------------------------------------------
  test("Scenario: 已連接 → 點中斷 → 在 dialog 取消 → 仍維持已連接狀態", async ({ page }) => {
    test.skip(true, "Wave 0 — 等 F-034c dialog 取消流程完成再啟用");

    await installGithubMock(page, {
      status: {
        connected: true,
        username: "gpwork4u",
        scopes: ["repo", "read:user"],
        token_set: true,
      },
    });

    await page.goto(SETTINGS_PATH);
    await page.getByTestId(G.disconnectButton).click();
    await expect(page.getByTestId(G.disconnectDialogConfirm)).toBeVisible();

    // WHEN 取消（按 Escape 關閉 AlertDialog）
    await page.keyboard.press("Escape");

    // THEN dialog 關閉，仍顯示已連接 username
    await expect(page.getByTestId(G.disconnectDialogConfirm)).toBeHidden();
    await expect(page.getByTestId(G.usernameLabel)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Scenario 7: 未認證 → POST /connect without X-API-Key → 401 UNAUTHORIZED
  // ---------------------------------------------------------------------------
  test("Scenario: 未認證 → POST /connect without X-API-Key → 401 UNAUTHORIZED → 顯示錯誤", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034a auth middleware 整合完成再啟用");

    // GIVEN POST /connect mock 回應 401 auth error
    await installGithubMock(page, {
      status: { connected: false },
      connectResponse: {
        status: 422,
        body: {
          code: "UNAUTHORIZED",
          message: "API Key 無效或缺失",
        },
      },
    });

    // WHEN 填入 PAT 並送出（模擬無有效 API Key）
    await page.goto(SETTINGS_PATH);
    await page.getByTestId(G.patInput).fill("ghp_sometoken");
    await page.getByTestId(G.connectButton).click();

    // THEN 顯示錯誤訊息，仍維持未連接狀態
    await expect(page.getByTestId(G.errorMessage)).toBeVisible();
    await expect(page.getByTestId(G.usernameLabel)).toBeHidden();
  });

  // ---------------------------------------------------------------------------
  // Scenario 8: 重新連接（覆蓋既有 token）
  //   GIVEN 已連接 username = "alice"，token T1
  //   WHEN POST /connect with token T2（同帳號 alice）
  //   THEN response 201，username 仍為 alice，row 數量仍 1
  // ---------------------------------------------------------------------------
  test("Scenario: 已連接 alice → 更新 PAT（T2）→ POST /connect 201 → username 不變", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034c 更新 PAT 流程（UPDATE_PAT_BUTTON）實作完成再啟用");

    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };

    // GIVEN 已連接 alice，提供新 token T2
    await installGithubMock(page, {
      status: {
        connected: true,
        username: "alice",
        scopes: ["repo", "read:user"],
        token_set: true,
      },
      connectResponse: {
        status: 201,
        body: {
          connected: true,
          id: "mock-uuid-002",
          username: "alice",
          scopes: ["repo", "read:user"],
          token_set: true,
          last_synced_at: null,
          created_at: "2026-04-26T10:00:00Z",
          updated_at: "2026-04-26T11:00:00Z",
        },
      },
      recorder,
    });

    await page.goto(SETTINGS_PATH);
    await expect(page.getByTestId(G.usernameLabel)).toContainText("alice");

    // WHEN 填入新 PAT 並點更新按鈕
    await page.getByTestId(G.patInput).fill("ghp_newtoken_T2");
    await page.getByTestId(G.updatePatButton).click();

    // THEN POST /connect 被呼叫（覆蓋 token）
    await expect
      .poll(() => recorder.requests.some((r) => r.method === "POST" && /connect/.test(r.url)))
      .toBeTruthy();

    // THEN username 仍為 alice（row 被覆蓋，不新增）
    await expect(page.getByTestId(G.usernameLabel)).toContainText("alice");
  });
});
