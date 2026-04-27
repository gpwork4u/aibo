/**
 * Theme Helper（F-035 Design Tokens / Theme System）
 *
 * 提供 light / dark / system 主題操作 + token 讀取。
 */

import type { Page, BrowserContext } from "@playwright/test";

export type Theme = "light" | "dark" | "system";

/**
 * 在每個 document load 前注入 localStorage.theme。
 * 必須在 page.goto 之前呼叫，避免初次 paint 取錯主題。
 */
export async function presetTheme(context: BrowserContext, theme: Theme): Promise<void> {
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("aibo_theme", t);
    } catch {}
  }, theme);
}

/**
 * 透過 ThemeToggle 切換到指定主題（UI 流程）
 *
 * 假設 ThemeToggle 用 testid="theme-toggle" 觸發，下拉項目用
 * testid="theme-option-light|dark|system"。
 */
export async function selectTheme(page: Page, theme: Theme): Promise<void> {
  const toggle = page.getByTestId("theme-toggle");
  await toggle.click();
  const option = page.getByTestId(`theme-option-${theme}`);
  await option.click();
}

export async function getHtmlTheme(page: Page): Promise<string | null> {
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

export async function getStoredTheme(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    try {
      return window.localStorage.getItem("aibo_theme");
    } catch {
      return null;
    }
  });
}

/**
 * 從 :root 讀取 CSS variable（token 值）
 */
export async function getCssVar(page: Page, name: string): Promise<string> {
  return page.evaluate((n) => {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  }, name);
}

/**
 * 取得元素的 computed background-color
 */
export async function getElementBg(page: Page, selector: string): Promise<string> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return "";
    return getComputedStyle(el as Element).backgroundColor;
  }, selector);
}

/**
 * 模擬 prefers-color-scheme（依賴 Playwright emulateMedia）
 */
export async function emulateColorScheme(
  page: Page,
  scheme: "light" | "dark" | "no-preference",
): Promise<void> {
  await page.emulateMedia({ colorScheme: scheme === "no-preference" ? null : scheme });
}
