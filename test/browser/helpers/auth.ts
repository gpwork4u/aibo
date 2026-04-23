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

const LOCAL_STORAGE_KEY = "aibo_api_key";

/**
 * 將 API Key 寫入瀏覽器 localStorage
 *
 * 必須已經 navigate 到 baseURL domain 之後才能呼叫。
 */
export async function setupAuth(page: Page, apiKey: string): Promise<void> {
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: LOCAL_STORAGE_KEY, value: apiKey }
  );
}

/**
 * 建立已認證的測試環境
 *
 * - 透過 API bootstrap 或 create 一把 key
 * - 開啟首頁並注入 localStorage
 */
export async function createAuthenticatedSession(
  page: Page,
  request: APIRequestContext,
  keyName = `browser-test-${Date.now()}`
): Promise<{ client: ApiClient; apiKey: string }> {
  const { client, key } = await ApiClient.bootstrap(request, keyName);

  // 先導航到首頁，localStorage domain 才會正確
  await page.goto("/");
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
