/**
 * F-037: Command Palette (CmdK) Skeleton
 *
 * Spec: specs/features/f037-command-palette-skeleton.md
 * Issue: #196
 * QA Issue: #198
 *
 * 涵蓋 QA scenarios E-1 ~ E-9。
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";

const isMac = process.platform === "darwin";
const META = isMac ? "Meta" : "Control";

test.describe("F-037 Command Palette", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("E-1 ⌘K 開啟：palette 顯示 + input 取得焦點", async ({ page, context }) => {
    test.skip(true, "Wave 3 skeleton：等 CmdK 元件實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");

    await page.keyboard.press(`${META}+KeyK`);
    const palette = page.getByTestId("cmdk-palette");
    await expect(palette).toBeVisible();

    const focused = await page.evaluate(() =>
      document.activeElement?.getAttribute("data-testid"),
    );
    expect(focused).toBe("cmdk-input");
  });

  test("E-2 Ctrl+K 在非 Mac 開啟（強制使用 Control）", async ({ page, context }) => {
    test.skip(true, "Wave 3 skeleton");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");

    await page.keyboard.press("Control+KeyK");
    await expect(page.getByTestId("cmdk-palette")).toBeVisible();
  });

  test("E-3 Esc 關閉 + 焦點回到 trigger button", async ({ page, context }) => {
    test.skip(true, "Wave 3 skeleton");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");

    const trigger = page.getByTestId("cmdk-trigger");
    await trigger.focus();
    await trigger.click();
    await expect(page.getByTestId("cmdk-palette")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("cmdk-palette")).toBeHidden();

    const focused = await page.evaluate(() =>
      document.activeElement?.getAttribute("data-testid"),
    );
    expect(focused).toBe("cmdk-trigger");
  });

  test("E-4 Pages 分組：預設顯示 Pages（5 nav items）+ Quick Actions", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 3 skeleton");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");
    await page.keyboard.press(`${META}+KeyK`);

    const pagesGroup = page.getByTestId("cmdk-group-pages");
    await expect(pagesGroup).toBeVisible();
    const items = pagesGroup.locator('[role="option"]');
    expect(await items.count()).toBeGreaterThanOrEqual(5);

    await expect(page.getByTestId("cmdk-group-quick-actions")).toBeVisible();
  });

  test("E-5 搜尋 entry 200ms debounce", async ({ page, context }) => {
    test.skip(true, "Wave 3 skeleton：等 entries 搜尋整合");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");
    await page.keyboard.press(`${META}+KeyK`);

    let requestCount = 0;
    let firstRequestAt: number | null = null;
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/v1/entries") && url.includes("q=")) {
        requestCount++;
        if (firstRequestAt === null) firstRequestAt = Date.now();
      }
    });

    const startedAt = Date.now();
    const input = page.getByTestId("cmdk-input");
    // 連續快速輸入 → 應只觸發一次請求（debounce）
    await input.type("go interface", { delay: 30 });

    await page.waitForTimeout(500);
    expect(requestCount).toBeGreaterThanOrEqual(1);
    expect(requestCount).toBeLessThan(5);
    expect(firstRequestAt! - startedAt).toBeGreaterThan(150);
  });

  test("E-6 點選 entry → navigate /library/{id}", async ({ page, context }) => {
    test.skip(true, "Wave 3 skeleton：等 cmdk → /library deep link");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    const { client } = await (
      await import("../helpers/api-client")
    ).ApiClient.bootstrap(page.request, "cmdk-test");
    const entry = await client.createEntry({
      title: "go interface 測試 entry",
      content: "search target",
    });

    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");
    await page.keyboard.press(`${META}+KeyK`);
    await page.getByTestId("cmdk-input").type("go interface");

    await page.waitForTimeout(300);
    const result = page.getByTestId(`cmdk-entry-${entry.id}`);
    await expect(result).toBeVisible();
    await result.click();

    await expect(page).toHaveURL(new RegExp(`/library/${entry.id}`));
  });

  test("E-7 切頁面：輸入 'library' → Pages → Enter → /library", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 3 skeleton");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");
    await page.keyboard.press(`${META}+KeyK`);

    await page.getByTestId("cmdk-input").type("library");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/library$/);
  });

  test("E-8 API 503 graceful：palette 仍開啟，Recent Entries 顯示『搜尋暫時不可用』", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 3 skeleton");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);

    await page.route("**/api/v1/entries**q=**", (route) =>
      route.fulfill({ status: 503, body: '{"error":"down"}' }),
    );

    await page.goto("/dashboard");
    await page.keyboard.press(`${META}+KeyK`);
    await page.getByTestId("cmdk-input").type("anything");

    await expect(page.getByTestId("cmdk-palette")).toBeVisible();
    await expect(
      page.getByText(/搜尋暫時不可用|search unavailable/i),
    ).toBeVisible();
  });

  test("E-9 IME 組字 isComposing=true 按 Enter → palette 不關閉、不執行", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 3 skeleton：CompositionEvent 模擬");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");
    await page.keyboard.press(`${META}+KeyK`);

    const palette = page.getByTestId("cmdk-palette");
    await expect(palette).toBeVisible();

    const inputSelector = '[data-testid="cmdk-input"]';
    await page.evaluate((sel) => {
      const input = document.querySelector(sel) as HTMLInputElement;
      input.focus();
      input.dispatchEvent(new CompositionEvent("compositionstart"));
      // isComposing=true 期間發 Enter
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true }),
      );
    }, inputSelector);

    await expect(palette).toBeVisible();
    // URL 不應變動
    expect(page.url()).toMatch(/\/dashboard/);
  });
});
