/**
 * F-039: Cookie Session Auth + API Client + SSE
 *
 * Spec: specs/features/f039-api-sse-auth.md
 * Issue: #194
 * QA Issue: #198
 *
 * 涵蓋 Sprint 13 QA scenarios A-1 ~ A-9 + F-1 ~ F-2。
 *
 * 注意：Sprint 13 起前端從「localStorage api_key」遷移到「cookie session」。
 * 本檔測試新流程（cookie），舊流程仍由 f021 等 spec 涵蓋（待 engineer 完成 F-036/F-039 後一併修正）。
 */

import { test, expect } from "@playwright/test";
import {
  loginWithCookie,
  loginViaUI,
  logoutCookie,
  getSessionCookie,
  expireSessionCookie,
  getMe,
  SESSION_COOKIE_NAME,
} from "../helpers/cookie-auth";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8081";

test.describe("F-039 Cookie Session Auth", () => {
  test.beforeEach(async ({ context }) => {
    // 確保乾淨 cookie jar
    await context.clearCookies();
  });

  test("A-1 登入成功：未登入訪問 /library → redirect /login?next=/library，登入後回 /library", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 1 skeleton：等 F-036 /library 路由 + F-039 /login 頁完成");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    expect(apiKey, "需要 shared key").toBeTruthy();

    await page.goto("/library");
    await expect(page).toHaveURL(/\/login\?next=%2Flibrary/);

    await loginViaUI(page, apiKey, { next: "/library" });

    await expect(page).toHaveURL(/\/library/);
    const cookie = await getSessionCookie(context);
    expect(cookie?.name).toBe(SESSION_COOKIE_NAME);
  });

  test("A-2 登入失敗：錯誤 api_key → 顯示錯誤訊息（INVALID_API_KEY），仍在 /login", async ({
    page,
  }) => {
    test.skip(true, "Wave 1 skeleton：等 /login 頁面實作");
    await page.goto("/login");
    await loginViaUI(page, "wrong-key-xxx");

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText(/INVALID_API_KEY|API Key 不正確|登入失敗/i),
    ).toBeVisible();
  });

  test("A-3 登入限流：同 IP 連 5 次失敗 → 第 6 次回 429", async ({ context }) => {
    test.skip(true, "Wave 1 skeleton：429 rate limit 需在 backend 實作完成後跑");
    const wrongs = Array.from({ length: 6 }, () => loginWithCookie(context, "definitely-wrong"));
    const results = await Promise.all(wrongs);
    const last = results[results.length - 1];
    expect([401, 429]).toContain(last.status);
    // 至少其中一個應為 429
    expect(results.some((r) => r.status === 429)).toBeTruthy();
  });

  test("A-4 cookie 屬性正確：HttpOnly / SameSite=Lax / Path=/ / Max-Age 約 30 天", async ({
    context,
  }) => {
    test.skip(true, "Wave 1 skeleton：等 /auth/login 後端實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    const res = await loginWithCookie(context, apiKey);
    expect(res.status).toBe(200);

    const cookie = res.cookie;
    expect(cookie).toBeDefined();
    expect(cookie!.name).toBe(SESSION_COOKIE_NAME);
    expect(cookie!.httpOnly).toBe(true);
    expect(cookie!.sameSite).toMatch(/Lax/i);
    expect(cookie!.path).toBe("/");

    // expires_at 應在 ~30 天後（容忍 ±1 天）
    const now = Date.now() / 1000;
    const days = (cookie!.expires - now) / 86400;
    expect(days).toBeGreaterThan(28);
    expect(days).toBeLessThan(32);
  });

  test("A-5 logout：UserMenu → Logout → cookie 清除 + redirect /login", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 1 skeleton：等 UserMenu 元件 + /auth/logout 實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");

    await page.getByTestId("user-menu-trigger").click();
    await page.getByTestId("user-menu-logout").click();

    await expect(page).toHaveURL(/\/login/);
    const cookie = await getSessionCookie(context);
    expect(cookie).toBeUndefined();
  });

  test("A-6 滑動續期：mock expires_at 為 5 天後 → API 請求後 Max-Age 重設", async ({
    context,
  }) => {
    test.skip(
      true,
      "Wave 4 skeleton：需要 test-api 提供 __test/sessions/expire-soon endpoint 才能 mock",
    );
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);

    // 透過 test-only endpoint 將 sessions.expires_at 設為 5 天後
    await context.request.post(`${API_BASE_URL}/api/v1/__test/sessions/expire-soon`, {
      data: { days: 5 },
    });

    // 任一請求觸發續期
    await context.request.get(`${API_BASE_URL}/api/v1/entries`);

    const cookie = await getSessionCookie(context);
    const days = (cookie!.expires - Date.now() / 1000) / 86400;
    expect(days).toBeGreaterThan(28);
  });

  test("A-7 cookie 過期：expires_at 設為過去 → 請求 /entries → 401，前端 redirect /login", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 1 skeleton：等前端 401 攔截邏輯實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);

    await expireSessionCookie(context);

    await page.goto("/library");
    await expect(page).toHaveURL(/\/login/);
  });

  test("A-8 X-API-Key 仍可用（無 cookie）→ 200", async ({ request, context }) => {
    test.skip(true, "Wave 1 skeleton：等 /auth/me 實作");
    await context.clearCookies();
    const apiKey = process.env.AIBO_E2E_API_KEY!;

    const res = await request.get(`${API_BASE_URL}/api/v1/entries`, {
      headers: { "X-API-Key": apiKey },
    });
    expect(res.status()).toBe(200);

    const me = await getMe(request, { apiKey });
    expect(me.status).toBe(200);
    expect((me.body as any)?.auth_method).toBe("api_key");
  });

  test("A-9 同時帶 cookie + X-API-Key → 後端優先 cookie（auth_method=cookie）", async ({
    context,
  }) => {
    test.skip(true, "Wave 1 skeleton：等 middleware 雙模式實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);

    const resp = await context.request.get(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: { "X-API-Key": apiKey },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.auth_method).toBe("cookie");
  });
});

test.describe("F-039 SSE Client（cookie 帶上）", () => {
  test("F-1 EventSource 帶 cookie → 後端認證通過", async ({ page, context }) => {
    test.skip(true, "Wave 4 skeleton：等 /api/v1/copilot/stream 實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);

    await page.goto("/dashboard");
    // 在 page context 中開 EventSource，等到第一個 message
    const firstEvent = await page.evaluate(async () => {
      return new Promise<{ ok: boolean; data?: string; error?: string }>(
        (resolve) => {
          const es = new EventSource("/api/v1/copilot/stream");
          const timer = setTimeout(() => {
            es.close();
            resolve({ ok: false, error: "timeout" });
          }, 5000);
          es.onmessage = (e) => {
            clearTimeout(timer);
            es.close();
            resolve({ ok: true, data: e.data });
          };
          es.onerror = () => {
            clearTimeout(timer);
            es.close();
            resolve({ ok: false, error: "es_error" });
          };
        },
      );
    });
    expect(firstEvent.ok, JSON.stringify(firstEvent)).toBeTruthy();
  });

  test("F-2 EventSource close cleanup → 後端 context cancel", async ({ page, context }) => {
    test.skip(true, "Wave 4 skeleton：close cleanup 觀察需要 backend metric/log，留待整合");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);

    await page.goto("/dashboard");
    const closed = await page.evaluate(async () => {
      const es = new EventSource("/api/v1/copilot/stream");
      await new Promise((r) => setTimeout(r, 500));
      es.close();
      return es.readyState === 2; // CLOSED
    });
    expect(closed).toBeTruthy();
  });
});
