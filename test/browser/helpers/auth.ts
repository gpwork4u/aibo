/**
 * Auth Helper - 處理 Browser Test 的認證流程
 *
 * 策略：
 * 1. 透過 API 建立 API Key（或 bootstrap 第一把）
 * 2. 將 API Key 注入到瀏覽器的 localStorage
 * 3. 後續頁面操作自動帶 X-API-Key header
 */

import { Page, APIRequestContext } from "@playwright/test";
import { ApiClient } from "./api-client";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8081";

const LOCAL_STORAGE_KEY = "aibo_api_key";

/**
 * 將 API Key 寫入瀏覽器 localStorage
 *
 * 透過 `addInitScript` 在每個 document load 前注入 localStorage，
 * 避免 root page（`app/page.tsx`）的 useEffect 因為「localStorage 還沒寫入」
 * 而 redirect 到 `/bootstrap` onboarding 頁面。
 *
 * 必須在 `page.goto(...)` 之前呼叫；作用於整個 BrowserContext。
 */
export async function setupAuth(page: Page, apiKey: string): Promise<void> {
  await page.context().addInitScript(
    ({ key, value }) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore storage failures (e.g. private mode safari) — app handles fallback
      }
    },
    { key: LOCAL_STORAGE_KEY, value: apiKey },
  );
}

/**
 * 建立已認證的測試環境
 *
 * - 透過 API bootstrap 或 create 一把 key
 * - 用 addInitScript 在頁面 load 前注入 localStorage（避免 onboarding redirect）
 * - 不主動 page.goto；caller 自己決定要去哪一頁
 */
export async function createAuthenticatedSession(
  page: Page,
  request: APIRequestContext,
  keyName = `browser-test-${Date.now()}`
): Promise<{ client: ApiClient; apiKey: string }> {
  const { client, key } = await ApiClient.bootstrap(request, keyName);
  await setupAuth(page, key);
  return { client, apiKey: key };
}

/**
 * 清除認證狀態
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate((k) => {
    localStorage.removeItem(k);
  }, LOCAL_STORAGE_KEY);
}

/**
 * 讀取目前 localStorage 中的 key（用於斷言）
 */
export async function getStoredKey(page: Page): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), LOCAL_STORAGE_KEY);
}

/**
 * Reset DB 並 bootstrap 新的 session
 *
 * 用於需要 fresh DB 的 test（例如 f021 Scenario 1「無 API Key」場景）。
 * 1. 呼叫 POST /api/v1/__test/reset（只在 AIBO_TEST_MODE=1 的 test-api 環境可用）
 * 2. 清除 localStorage 認證
 * 3. 不 bootstrap key（讓 test 自己控制是否要建立 key）
 */
export async function resetDbAndClearAuth(page: Page): Promise<void> {
  // Reset DB（移除所有 api_keys + user data）
  const res = await fetch(`${API_BASE_URL}/api/v1/__test/reset`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`[resetDbAndClearAuth] DB reset 失敗：${res.status} ${await res.text()}`);
  }
  // 清除 localStorage
  await clearAuth(page);
  // 清除 AIBO_E2E_API_KEY 只對此 page context 的 initScript 重設
  // （initScript 已在 createAuthenticatedSession 時注入，這裡透過 evaluate 移除）
  await page.evaluate((k) => { try { localStorage.removeItem(k); } catch {} }, LOCAL_STORAGE_KEY);
}

/**
 * Bootstrap 一把全新 API Key（DB reset 後使用）
 * 直接呼叫 POST /auth/api-keys（不需認證）
 */
export async function bootstrapNewKey(name = `e2e-fresh-${Date.now()}`): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/api-keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(`[bootstrapNewKey] bootstrap 失敗：${res.status} ${await res.text()}`);
  }
  const body = await res.json() as { key: string };
  if (!body.key) throw new Error("[bootstrapNewKey] bootstrap 沒返回 key");
  return body.key;
}
