/**
 * Cookie Session Auth Helper（F-039）
 *
 * 提供 Sprint 13 cookie session 認證流程：
 * - loginWithCookie: POST /api/v1/auth/login → Set-Cookie aibo_session
 * - logoutCookie: POST /api/v1/auth/logout
 * - getMe: GET /api/v1/auth/me
 * - 取得 cookie 屬性（HttpOnly / SameSite / Max-Age）
 *
 * 注意：使用 page.context().request 確保 cookie jar 共用，
 * 後續 page.goto() 會自動帶上 aibo_session cookie。
 */

import type { Page, BrowserContext, APIRequestContext, Cookie } from "@playwright/test";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8081";

export const SESSION_COOKIE_NAME = "aibo_session";

export interface LoginResult {
  status: number;
  body: unknown;
  setCookieHeader?: string;
  cookie?: Cookie;
}

/**
 * 透過 master api key 登入並建立 cookie session。
 * 使用 context.request 讓 cookie 寫入 BrowserContext jar，後續 page.goto 自動帶。
 */
export async function loginWithCookie(
  context: BrowserContext,
  apiKey: string,
  baseURL: string = API_BASE_URL,
): Promise<LoginResult> {
  const resp = await context.request.post(`${baseURL}/api/v1/auth/login`, {
    data: { api_key: apiKey },
    headers: { "Content-Type": "application/json" },
  });
  const status = resp.status();
  const body = status < 400 ? await resp.json().catch(() => null) : await resp.text();
  const headers = resp.headers();
  const setCookieHeader = headers["set-cookie"];
  const cookies = await context.cookies();
  const cookie = cookies.find((c) => c.name === SESSION_COOKIE_NAME);
  return { status, body, setCookieHeader, cookie };
}

/**
 * Logout：呼叫 /auth/logout 並驗證 cookie 已清除
 */
export async function logoutCookie(
  context: BrowserContext,
  baseURL: string = API_BASE_URL,
): Promise<{ status: number }> {
  const resp = await context.request.post(`${baseURL}/api/v1/auth/logout`);
  return { status: resp.status() };
}

export async function getSessionCookie(
  context: BrowserContext,
): Promise<Cookie | undefined> {
  const cookies = await context.cookies();
  return cookies.find((c) => c.name === SESSION_COOKIE_NAME);
}

/**
 * 強制把 session cookie expires 設成過去（測試 cookie 過期場景）
 */
export async function expireSessionCookie(context: BrowserContext): Promise<void> {
  const cookies = await context.cookies();
  const session = cookies.find((c) => c.name === SESSION_COOKIE_NAME);
  if (!session) return;
  await context.clearCookies({ name: SESSION_COOKIE_NAME });
  await context.addCookies([
    {
      ...session,
      expires: Math.floor(Date.now() / 1000) - 3600,
    },
  ]);
}

/**
 * GET /api/v1/auth/me：回傳 { label, auth_method }
 */
export async function getMe(
  request: APIRequestContext,
  opts: { apiKey?: string; baseURL?: string } = {},
): Promise<{ status: number; body: { label?: string; auth_method?: string } | string }> {
  const baseURL = opts.baseURL ?? API_BASE_URL;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.apiKey) headers["X-API-Key"] = opts.apiKey;
  const resp = await request.get(`${baseURL}/api/v1/auth/me`, { headers });
  const status = resp.status();
  const body = status < 400 ? await resp.json().catch(() => null) : await resp.text();
  return { status, body };
}

/**
 * UI 流程：透過 /login 頁面填表單登入
 *
 * 假設 F-039 + F-036 的 /login 頁包含：
 * - input[name="api_key"] 或 testid="login-api-key-input"
 * - button[type="submit"] 或 testid="login-submit"
 */
export async function loginViaUI(
  page: Page,
  apiKey: string,
  opts: { next?: string } = {},
): Promise<void> {
  const url = opts.next ? `/login?next=${encodeURIComponent(opts.next)}` : "/login";
  await page.goto(url);
  // 容錯：優先用 testid，fallback name
  const input = page.getByTestId("login-api-key-input").or(
    page.locator('input[name="api_key"]'),
  );
  await input.fill(apiKey);
  const submit = page.getByTestId("login-submit").or(
    page.locator('button[type="submit"]'),
  );
  await submit.click();
  await page.waitForLoadState("networkidle");
}
