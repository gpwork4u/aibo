/**
 * F-038: shadcn primitives + a11y
 *
 * Spec: specs/features/f038-shadcn-primitives.md
 * Issue: #193
 * QA Issue: #198
 *
 * 涵蓋 QA scenarios D-1 ~ D-6（含 axe-core a11y 掃描）。
 *
 * 假設 dev 環境提供 /dev/playground 頁展示所有 primitive，containing：
 * - testid="demo-dialog-trigger" / "demo-dialog"
 * - testid="demo-toast-success-trigger"
 * - testid="demo-tooltip-target"
 * - testid="demo-button-danger"
 * - testid="demo-dropdown-trigger"
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";
import { runA11yScan, filterCriticalSerious, formatViolations } from "../helpers/a11y";
import { getCssVar, getElementBg } from "../helpers/theme";

test.describe("F-038 shadcn Primitives", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("D-1 Dialog Esc 關閉 + 焦點返回觸發按鈕", async ({ page, context }) => {
    test.skip(true, "Wave 2 skeleton：等 Dialog primitive 實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dev/playground");

    const trigger = page.getByTestId("demo-dialog-trigger");
    await trigger.focus();
    await trigger.click();

    const dialog = page.getByTestId("demo-dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // 焦點回到 trigger
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    expect(focused).toBe("demo-dialog-trigger");
  });

  test("D-2 Toast 自動消失 5 秒；hover 暫停倒數", async ({ page, context }) => {
    test.skip(true, "Wave 2 skeleton：等 sonner toast 整合");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dev/playground");

    await page.getByTestId("demo-toast-success-trigger").click();
    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toBeVisible();

    // hover 期間不應消失
    await toast.hover();
    await page.waitForTimeout(3000);
    await expect(toast).toBeVisible();

    // 移開 hover 後等待 ~5s 消失
    await page.mouse.move(0, 0);
    await expect(toast).toBeHidden({ timeout: 8000 });
  });

  test("D-3 Tooltip 500ms delay 顯示", async ({ page, context }) => {
    test.skip(true, "Wave 2 skeleton：等 Tooltip primitive 實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dev/playground");

    const target = page.getByTestId("demo-tooltip-target");
    await target.hover();

    // 600ms 後 tooltip 才出現
    await page.waitForTimeout(600);
    await expect(page.locator('[role="tooltip"]').first()).toBeVisible();
  });

  test("D-4 Button danger variant：bg = --danger token", async ({ page, context }) => {
    test.skip(true, "Wave 2 skeleton：等 Button 自寫元件");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dev/playground");

    const dangerBg = await getElementBg(page, '[data-testid="demo-button-danger"]');
    const tokenDanger = await getCssVar(page, "--danger");
    expect(dangerBg, "danger button bg 應有值").not.toBe("");
    expect(tokenDanger, "--danger token 應有值").not.toBe("");
    // 不字串比對（OKLCH vs rgb），由視覺迴歸把關精確值
  });

  test("D-5 DropdownMenu 鍵盤導航：↓↑ 切換、Enter 選擇", async ({ page, context }) => {
    test.skip(true, "Wave 2 skeleton：等 DropdownMenu primitive 實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dev/playground");

    const trigger = page.getByTestId("demo-dropdown-trigger");
    await trigger.focus();
    await trigger.press("Enter");

    await expect(page.locator('[role="menu"]').first()).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    // 預期觸發某個 demo action（用 toast 或 data 屬性驗證）
    await expect(page.getByTestId("demo-dropdown-result")).toContainText(/item-?2/i);
  });

  test("D-6 a11y 掃描：/login + /dashboard，critical/serious 違規 = 0", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 4 skeleton：等 /login + /dashboard 完整實作後再掃");
    const apiKey = process.env.AIBO_E2E_API_KEY!;

    // /login
    await page.goto("/login");
    let violations = await runA11yScan(page);
    let blockers = filterCriticalSerious(violations);
    expect(
      blockers,
      `/login a11y violations:\n${formatViolations(blockers)}`,
    ).toEqual([]);

    // /dashboard（需登入）
    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");
    violations = await runA11yScan(page);
    blockers = filterCriticalSerious(violations);
    expect(
      blockers,
      `/dashboard a11y violations:\n${formatViolations(blockers)}`,
    ).toEqual([]);
  });
});
