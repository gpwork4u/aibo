/**
 * Auth Helper - 處理 Browser Test 的認證流程
 *
 * 策略：
 * 1. 透過 API 建立 API Key
 * 2. 將 API Key 注入到瀏覽器的 localStorage 或 cookie
 * 3. 後續頁面操作自動帶上認證
 */

import { Page, APIRequestContext } from "@playwright/test";
import { ApiClient } from "./api-client";

/**
 * 設定認證狀態
 *
 * 在前端實作完成前，此 helper 預留介面。
 * 前端認證機制確定後，填入實際的 localStorage/cookie 設定邏輯。
 */
export async function setupAuth(page: Page, apiKey: string): Promise<void> {
  // 方案 A: localStorage
  await page.evaluate((key) => {
    localStorage.setItem("aibo_api_key", key);
  }, apiKey);

  // 方案 B: cookie（備用）
  // await page.context().addCookies([{
  //   name: 'aibo_api_key',
  //   value: apiKey,
  //   domain: 'localhost',
  //   path: '/',
  // }]);
}

/**
 * 建立已認證的測試環境
 *
 * 回傳 ApiClient 和 API Key，並設定瀏覽器的認證狀態。
 */
export async function createAuthenticatedSession(
  page: Page,
  request: APIRequestContext,
  keyName = "browser-test-key"
): Promise<{ client: ApiClient; apiKey: string }> {
  const { client, key } = await ApiClient.bootstrap(request, keyName);

  // 導航到首頁（確保 localStorage domain 正確）
  await page.goto("/");

  // 設定認證
  await setupAuth(page, key);

  return { client, apiKey: key };
}

/**
 * 清除認證狀態
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("aibo_api_key");
  });
}
