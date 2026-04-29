/**
 * F-047: Copilot Side Panel
 *
 * Spec: specs/features/f047-copilot-side-panel.md
 * Issue: #232
 * QA Issue: #236
 *
 * 涵蓋 Sprint 16 QA scenarios：
 * CP-1  ⌘J 開啟 Panel
 * CP-2  ⌘J 關閉 Panel
 * CP-3  跨路由切換 Panel 保持
 * CP-4  送出訊息 streaming 顯示
 * CP-5  Clear session 清空訊息
 * CP-6  resize Panel 寬度
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";

const FEATURE = "F-047";
const API_BASE = process.env.API_BASE_URL || "http://localhost:8081";
const SESSION_ID = "session-test-uuid-001";

// --- Helpers ---

function makeSession() {
  return { session_id: SESSION_ID, created_at: "2026-04-28T10:00:00Z" };
}

function makeMessages(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i + 1}`,
    session_id: SESSION_ID,
    role: i % 2 === 0 ? "user" : "assistant",
    content: `Message ${i + 1}`,
    created_at: "2026-04-28T10:00:00Z",
  }));
}

test.describe(`[${FEATURE}] Copilot Side Panel`, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
  });

  // --- CP-1: ⌘J 開啟 Panel ---

  test("CP-1 ⌘J 開啟 CopilotPanel（slide-in from right）", async ({ page }) => {
    test.skip(true, "skeleton：等 F-047 CopilotPanel + ⌘J 快捷鍵實作");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Panel 初始應為隱藏
    const panel = page.getByTestId("copilot-panel");
    await expect(panel).not.toBeVisible();

    // 按 ⌘J 開啟
    await page.keyboard.press("Meta+j");
    await expect(panel).toBeVisible();

    await page.screenshot({ path: `../screenshots/${FEATURE}/cp1-panel-open.png` });
  });

  // --- CP-2: ⌘J 關閉 Panel ---

  test("CP-2 ⌘J 再次按下關閉 CopilotPanel", async ({ page }) => {
    test.skip(true, "skeleton：等 F-047 CopilotPanel toggle 實作");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const panel = page.getByTestId("copilot-panel");

    // 開啟
    await page.keyboard.press("Meta+j");
    await expect(panel).toBeVisible();

    // 關閉
    await page.keyboard.press("Meta+j");
    await expect(panel).not.toBeVisible();

    await page.screenshot({ path: `../screenshots/${FEATURE}/cp2-panel-closed.png` });
  });

  // --- CP-3: 跨路由切換 Panel 保持 ---

  test("CP-3 跨路由切換後 Panel 仍顯示且訊息保留", async ({ page }) => {
    test.skip(true, "skeleton：等 F-047 Panel 跨路由持久化實作");

    // Mock sessions + messages
    await page.route(`${API_BASE}/api/v1/copilot/sessions`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sessions: [makeSession()] }),
      });
    });

    await page.route(`${API_BASE}/api/v1/copilot/sessions/${SESSION_ID}/messages`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ messages: makeMessages(3) }),
      });
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // 開啟 Panel，確認有 3 則訊息
    await page.keyboard.press("Meta+j");
    const panel = page.getByTestId("copilot-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId("copilot-message")).toHaveCount(3);

    // 切換路由
    await page.goto("/dashboard/library");
    await page.waitForLoadState("networkidle");

    // Panel 仍顯示，訊息保留
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId("copilot-message")).toHaveCount(3);

    await page.screenshot({ path: `../screenshots/${FEATURE}/cp3-panel-persists.png` });
  });

  // --- CP-4: 送出訊息 SSE streaming 顯示 ---

  test("CP-4 送出訊息後 streaming 逐字顯示，TypingIndicator 在 message_done 後消失", async ({ page }) => {
    test.skip(true, "skeleton：等 F-047 streaming UI + F-048 SSE backend 實作");

    // Mock POST message → stream_ready
    await page.route(`${API_BASE}/api/v1/copilot/message`, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ stream_ready: true, message_id: "msg-new" }),
        });
      } else {
        route.continue();
      }
    });

    // Mock SSE stream endpoint
    await page.route(`${API_BASE}/api/v1/copilot/sessions/${SESSION_ID}/stream*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: [
          "data: {\"type\":\"message_start\",\"message_id\":\"msg-new\"}\n\n",
          "data: {\"type\":\"token\",\"content\":\"Hello\"}\n\n",
          "data: {\"type\":\"token\",\"content\":\" world\"}\n\n",
          "data: {\"type\":\"message_done\",\"message_id\":\"msg-new\"}\n\n",
        ].join(""),
      });
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Meta+j");
    const panel = page.getByTestId("copilot-panel");
    await expect(panel).toBeVisible();

    // 輸入訊息並 Enter
    const input = panel.getByTestId("copilot-input");
    await input.fill("Hello copilot");
    await input.press("Enter");

    // user message 立即顯示
    await expect(panel.getByText("Hello copilot")).toBeVisible();

    // TypingIndicator 在 streaming 時顯示
    const typingIndicator = panel.getByTestId("typing-indicator");
    await expect(typingIndicator).toBeVisible();

    // streaming 結束後 assistant message 出現，TypingIndicator 消失
    await expect(panel.getByText("Hello world")).toBeVisible({ timeout: 10_000 });
    await expect(typingIndicator).not.toBeVisible();

    await page.screenshot({ path: `../screenshots/${FEATURE}/cp4-streaming-done.png` });
  });

  // --- CP-5: Clear session 清空 ---

  test("CP-5 Clear session → messages 清空，顯示 welcome message", async ({ page }) => {
    test.skip(true, "skeleton：等 F-047 Clear session 功能實作");

    await page.route(`${API_BASE}/api/v1/copilot/sessions/${SESSION_ID}`, (route) => {
      if (route.request().method() === "DELETE") {
        route.fulfill({ status: 204 });
      } else {
        route.continue();
      }
    });

    await page.route(`${API_BASE}/api/v1/copilot/sessions/${SESSION_ID}/messages`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ messages: makeMessages(3) }),
      });
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Meta+j");
    const panel = page.getByTestId("copilot-panel");
    await expect(panel).toBeVisible();

    // 點擊 Clear session
    const clearButton = panel.getByRole("button", { name: /clear session/i });
    await clearButton.click();

    // 確認 messages 清空，welcome message 出現
    await expect(panel.getByTestId("copilot-message")).toHaveCount(0);
    await expect(panel.getByTestId("copilot-welcome")).toBeVisible();

    await page.screenshot({ path: `../screenshots/${FEATURE}/cp5-session-cleared.png` });
  });

  // --- CP-6: resize Panel 寬度 ---

  test("CP-6 拖拉 resize handle 可調整 Panel 寬度", async ({ page }) => {
    test.skip(true, "skeleton：等 F-047 Panel resize 功能實作");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Meta+j");
    const panel = page.getByTestId("copilot-panel");
    await expect(panel).toBeVisible();

    // 取得初始寬度
    const initialWidth = await panel.evaluate((el) => el.getBoundingClientRect().width);

    // 拖拉 resize handle 往左移動 100px（擴大 Panel）
    const resizeHandle = page.getByTestId("copilot-resize-handle");
    const handleBox = await resizeHandle.boundingBox();
    if (handleBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x - 100, handleBox.y + handleBox.height / 2);
      await page.mouse.up();
    }

    // Panel 寬度應增加
    const newWidth = await panel.evaluate((el) => el.getBoundingClientRect().width);
    expect(newWidth).toBeGreaterThan(initialWidth);

    await page.screenshot({ path: `../screenshots/${FEATURE}/cp6-panel-resized.png` });
  });
});
