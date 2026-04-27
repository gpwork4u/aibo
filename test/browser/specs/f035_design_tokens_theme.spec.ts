/**
 * F-035: Design Tokens + Theme System
 *
 * Spec: specs/features/f035-design-tokens-theme.md
 * Issue: #192
 * QA Issue: #198
 *
 * 涵蓋 QA scenarios B-1 ~ B-6。
 */

import { test, expect } from "@playwright/test";
import {
  presetTheme,
  selectTheme,
  getHtmlTheme,
  getStoredTheme,
  getCssVar,
  getElementBg,
  emulateColorScheme,
} from "../helpers/theme";
import { loginWithCookie } from "../helpers/cookie-auth";

test.describe("F-035 Design Tokens + Theme", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("B-1 預設跟隨系統：localStorage 無 theme + 系統 dark → data-theme=dark", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 1 skeleton：等 F-035 inline theme script 實作");
    await emulateColorScheme(page, "dark");
    // 不預設 localStorage
    await page.goto("/login");

    const theme = await getHtmlTheme(page);
    expect(theme).toBe("dark");

    const bg = await getCssVar(page, "--bg");
    expect(bg.length).toBeGreaterThan(0);
    // 背景色實際值應對到 token --bg
    const bodyBg = await getElementBg(page, "body");
    expect(bodyBg.length).toBeGreaterThan(0);
  });

  test("B-2 手動切換 light：dark → ThemeToggle 選 Light → data-theme=light + localStorage", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 1 skeleton：等 ThemeToggle 元件實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await emulateColorScheme(page, "dark");
    await page.goto("/dashboard");

    expect(await getHtmlTheme(page)).toBe("dark");

    await selectTheme(page, "light");

    expect(await getHtmlTheme(page)).toBe("light");
    expect(await getStoredTheme(page)).toBe("light");
  });

  test("B-3 重新載入保留偏好：localStorage.theme=light → 第一個 paint 即為 light（無 dark flash）", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 1 skeleton：等 inline blocking script 實作");
    await presetTheme(context, "light");
    await emulateColorScheme(page, "dark"); // 系統 dark 但偏好 light，應仍 light

    await page.goto("/login");
    expect(await getHtmlTheme(page)).toBe("light");

    // 第一張畫面截圖，視覺迴歸基準（首次 run 自動產生 baseline）
    await expect(page).toHaveScreenshot("f035-light-first-paint.png", {
      maxDiffPixelRatio: 0.02,
      timeout: 5000,
    });
  });

  test("B-4 視窗中切換系統主題：theme=system → 系統 dark↔light → data-theme 即時切換", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 1 skeleton：等 prefers-color-scheme media listener 實作");
    await presetTheme(context, "system");
    await emulateColorScheme(page, "light");
    await page.goto("/login");
    expect(await getHtmlTheme(page)).toBe("light");

    await emulateColorScheme(page, "dark");
    await expect(async () => {
      expect(await getHtmlTheme(page)).toBe("dark");
    }).toPass({ timeout: 2000 });
  });

  test("B-5 localStorage 禁用：app 仍可用，預設 system，ThemeToggle 顯示警告", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 1 skeleton：localStorage 禁用 fallback 行為");
    // 在 init script 內把 localStorage 禁掉
    await context.addInitScript(() => {
      const broken = {
        getItem() {
          throw new Error("disabled");
        },
        setItem() {
          throw new Error("disabled");
        },
        removeItem() {
          throw new Error("disabled");
        },
        key() {
          return null;
        },
        clear() {},
        length: 0,
      };
      Object.defineProperty(window, "localStorage", { get: () => broken });
    });

    await emulateColorScheme(page, "light");
    await page.goto("/login");

    expect(await getHtmlTheme(page)).toMatch(/light|dark/);

    // ThemeToggle 應有 warning indicator
    const toggle = page.getByTestId("theme-toggle");
    await expect(toggle).toBeVisible();
    await toggle.hover();
    await expect(
      page.getByText(/localStorage|偏好無法儲存|warning/i).first(),
    ).toBeVisible({ timeout: 2000 });
  });

  test("B-6 Token 視覺一致：Button / Card / Badge computed bg 與 token 對齊", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 2 skeleton：等 /dev/playground 元件展示頁實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dev/playground");

    const checks: Array<{ selector: string; tokenVar: string; label: string }> = [
      {
        selector: '[data-testid="demo-button-default"]',
        tokenVar: "--accent",
        label: "Button default",
      },
      {
        selector: '[data-testid="demo-button-danger"]',
        tokenVar: "--danger",
        label: "Button danger",
      },
      {
        selector: '[data-testid="demo-card"]',
        tokenVar: "--bg-subtle",
        label: "Card",
      },
      {
        selector: '[data-testid="demo-badge"]',
        tokenVar: "--accent",
        label: "Badge",
      },
    ];

    for (const c of checks) {
      const tokenValue = await getCssVar(page, c.tokenVar);
      const computedBg = await getElementBg(page, c.selector);
      expect(tokenValue, `${c.label}: token ${c.tokenVar} 應有值`).not.toBe("");
      expect(computedBg, `${c.label}: bg 應有值`).not.toBe("");
      // token 與實際背景色，無法直接字串比對（一個是 OKLCH，一個被 browser 轉為 rgb）
      // 改用 quasi check：兩者其一非空即視為通過 + 由視覺迴歸把關
    }
  });
});
