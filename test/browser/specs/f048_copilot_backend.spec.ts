/**
 * F-048: Copilot Backend SSE
 *
 * Spec: specs/features/f048-copilot-backend-sse.md
 * Issue: #231
 * QA Issue: #236
 *
 * 涵蓋 Sprint 16 QA scenarios（API 層）：
 * CB-1  POST message → stream_ready + SSE token push
 * CB-2  POST sessions → 建立 session，回傳 session_id (UUID)
 * CB-3  GET sessions/:id/messages → 查詢歷史訊息（role + content）
 * CB-4  LLM 不可用時回傳 503 + LLM_UNAVAILABLE
 * CB-5  無效 session_id 回傳 404 + NOT_FOUND
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";

const FEATURE = "F-048";
const API_BASE = process.env.API_BASE_URL || "http://localhost:8081";

// UUID v4 pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test.describe(`[${FEATURE}] Copilot Backend SSE`, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
  });

  // --- CB-1: POST message → stream_ready + SSE ---

  test("CB-1 POST /api/v1/copilot/message → 200 stream_ready + SSE token push", async ({ page }) => {
    test.skip(true, "skeleton：等 F-048 POST /copilot/message endpoint + SSE 推送實作");

    const SESSION_ID = "session-cb1-uuid";

    // Mock POST message
    await page.route(`${API_BASE}/api/v1/copilot/message`, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            stream_ready: true,
            message_id: "msg-cb1",
            session_id: SESSION_ID,
          }),
        });
      } else {
        route.continue();
      }
    });

    // Mock SSE stream
    await page.route(`${API_BASE}/api/v1/copilot/sessions/${SESSION_ID}/stream*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: [
          `data: {"type":"message_start","message_id":"msg-cb1"}\n\n`,
          `data: {"type":"token","content":"Hello"}\n\n`,
          `data: {"type":"token","content":" world"}\n\n`,
          `data: {"type":"message_done","message_id":"msg-cb1","total_tokens":10}\n\n`,
        ].join(""),
      });
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // 直接呼叫 API via fetch in page context
    const result = await page.evaluate(async (apiBase) => {
      const resp = await fetch(`${apiBase}/api/v1/copilot/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: "session-cb1-uuid",
          content: "Hello copilot",
        }),
        credentials: "include",
      });
      const body = await resp.json();
      return { status: resp.status, body };
    }, API_BASE);

    expect(result.status).toBe(200);
    expect(result.body.stream_ready).toBe(true);
    expect(result.body.message_id).toBeDefined();

    await page.screenshot({ path: `../screenshots/${FEATURE}/cb1-post-message.png` });
  });

  // --- CB-2: POST sessions → 建立 session ---

  test("CB-2 POST /api/v1/copilot/sessions → 201 + session_id (UUID)", async ({ page }) => {
    test.skip(true, "skeleton：等 F-048 POST /copilot/sessions endpoint 實作");

    await page.route(`${API_BASE}/api/v1/copilot/sessions`, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            session_id: "550e8400-e29b-41d4-a716-446655440000",
            created_at: "2026-04-28T10:00:00Z",
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(async (apiBase) => {
      const resp = await fetch(`${apiBase}/api/v1/copilot/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      const body = await resp.json();
      return { status: resp.status, body };
    }, API_BASE);

    expect(result.status).toBe(201);
    expect(result.body.session_id).toMatch(UUID_PATTERN);

    await page.screenshot({ path: `../screenshots/${FEATURE}/cb2-create-session.png` });
  });

  // --- CB-3: GET sessions/:id/messages → 查詢歷史訊息 ---

  test("CB-3 GET /api/v1/copilot/sessions/:id/messages → 200 含 role + content", async ({ page }) => {
    test.skip(true, "skeleton：等 F-048 GET /copilot/sessions/:id/messages endpoint 實作");

    const SESSION_ID = "session-cb3-uuid";

    await page.route(`${API_BASE}/api/v1/copilot/sessions/${SESSION_ID}/messages`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          messages: [
            {
              id: "msg-1",
              session_id: SESSION_ID,
              role: "user",
              content: "What is aibo?",
              created_at: "2026-04-28T10:00:00Z",
            },
            {
              id: "msg-2",
              session_id: SESSION_ID,
              role: "assistant",
              content: "Aibo is your AI-powered knowledge companion.",
              created_at: "2026-04-28T10:00:01Z",
            },
          ],
          total: 2,
        }),
      });
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(
      async ({ apiBase, sessionId }) => {
        const resp = await fetch(`${apiBase}/api/v1/copilot/sessions/${sessionId}/messages`, {
          credentials: "include",
        });
        const body = await resp.json();
        return { status: resp.status, body };
      },
      { apiBase: API_BASE, sessionId: SESSION_ID },
    );

    expect(result.status).toBe(200);
    expect(result.body.messages).toHaveLength(2);
    expect(result.body.messages[0].role).toBe("user");
    expect(result.body.messages[0].content).toBe("What is aibo?");
    expect(result.body.messages[1].role).toBe("assistant");

    await page.screenshot({ path: `../screenshots/${FEATURE}/cb3-get-messages.png` });
  });

  // --- CB-4: LLM 不可用時回傳 503 ---

  test("CB-4 LLM 不可用時 POST /copilot/message → 503 + LLM_UNAVAILABLE", async ({ page }) => {
    test.skip(true, "skeleton：等 F-048 LLM provider 健康檢查 + 503 回應實作");

    await page.route(`${API_BASE}/api/v1/copilot/message`, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            code: "LLM_UNAVAILABLE",
            message: "No active LLM provider available",
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(async (apiBase) => {
      const resp = await fetch(`${apiBase}/api/v1/copilot/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: "any-session", content: "test" }),
        credentials: "include",
      });
      const body = await resp.json();
      return { status: resp.status, body };
    }, API_BASE);

    expect(result.status).toBe(503);
    expect(result.body.code).toBe("LLM_UNAVAILABLE");

    await page.screenshot({ path: `../screenshots/${FEATURE}/cb4-503-llm-unavailable.png` });
  });

  // --- CB-5: 無效 session_id → 404 ---

  test("CB-5 無效 session_id → POST /copilot/message → 404 + NOT_FOUND", async ({ page }) => {
    test.skip(true, "skeleton：等 F-048 session 驗證 + 404 回應實作");

    const INVALID_SESSION = "nonexistent-session-id";

    await page.route(`${API_BASE}/api/v1/copilot/message`, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            code: "NOT_FOUND",
            message: `Session ${INVALID_SESSION} not found`,
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(
      async ({ apiBase, sessionId }) => {
        const resp = await fetch(`${apiBase}/api/v1/copilot/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, content: "test" }),
          credentials: "include",
        });
        const body = await resp.json();
        return { status: resp.status, body };
      },
      { apiBase: API_BASE, sessionId: INVALID_SESSION },
    );

    expect(result.status).toBe(404);
    expect(result.body.code).toBe("NOT_FOUND");

    await page.screenshot({ path: `../screenshots/${FEATURE}/cb5-404-not-found.png` });
  });
});
