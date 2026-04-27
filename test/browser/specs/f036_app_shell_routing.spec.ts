/**
 * F-036: App Shell + Hybrid Routing
 *
 * Spec: specs/features/f036-app-shell-routing.md
 * Issue: #195
 * QA Issue: #198
 *
 * 涵蓋 QA scenarios C-1 ~ C-9。
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie, expireSessionCookie } from "../helpers/cookie-auth";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8081";

test.describe("F-036 App Shell + Parallel Routes", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("C-1 Dashboard 4 slot 並排：inbox/library/today/copilot 皆渲染", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 2 skeleton：等 /dashboard parallel routes 實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");

    for (const slot of ["inbox", "library", "today", "copilot"]) {
      await expect(page.getByTestId(`slot-${slot}`)).toBeVisible();
    }
  });

  test("C-2 slot 之一失敗不影響其他：mock /entries?inbox=1 → 503，inbox slot 顯示 ErrorCard", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 2 skeleton：parallel error boundary 實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);

    await page.route("**/api/v1/entries**inbox=1**", (route) =>
      route.fulfill({ status: 503, body: JSON.stringify({ error: "down" }) }),
    );
    await page.goto("/dashboard");

    await expect(page.getByTestId("slot-inbox-error")).toBeVisible();
    await expect(page.getByTestId("slot-inbox-retry")).toBeVisible();
    // 其他三 slot 不受影響
    for (const slot of ["library", "today", "copilot"]) {
      await expect(page.getByTestId(`slot-${slot}`)).toBeVisible();
    }
  });

  test("C-3 點 retry 重試成功：mock 改回 200 → slot 恢復", async ({ page, context }) => {
    test.skip(true, "Wave 2 skeleton：retry 行為");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);

    let calls = 0;
    await page.route("**/api/v1/entries**inbox=1**", (route) => {
      calls++;
      if (calls < 2) {
        route.fulfill({ status: 503, body: "{}" });
      } else {
        route.continue();
      }
    });

    await page.goto("/dashboard");
    await page.getByTestId("slot-inbox-retry").click();

    await expect(page.getByTestId("slot-inbox-error")).toBeHidden();
    await expect(page.getByTestId("slot-inbox")).toBeVisible();
  });

  test("C-4 深連結 /library 直達：未經 /dashboard，shell + library 內容", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 2 skeleton：deep-link 直達");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);

    await page.goto("/library");
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByTestId("app-sidebar")).toBeVisible();
    await expect(page.getByTestId("library-page")).toBeVisible();
  });

  test("C-5 Sidebar 不重 mount：/dashboard → /library，sidebar DOM 同一 instance", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 2 skeleton：layout 不重渲染");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);

    await page.goto("/dashboard");
    const sidebar = page.getByTestId("app-sidebar");
    await expect(sidebar).toBeVisible();

    // 注入 marker 到 sidebar DOM
    const markerBefore = await sidebar.evaluate((el) => {
      (el as HTMLElement).dataset.aiboMountMarker = "marker-1";
      return (el as HTMLElement).dataset.aiboMountMarker;
    });

    await page.getByTestId("nav-library").click();
    await expect(page).toHaveURL(/\/library/);

    // marker 仍應存在（DOM 沒被 unmount）
    const markerAfter = await page.getByTestId("app-sidebar").evaluate(
      (el) => (el as HTMLElement).dataset.aiboMountMarker,
    );
    expect(markerAfter).toBe(markerBefore);
  });

  test("C-6 未登入存取受保護路由：清 cookie → /library → /login?next=/library，登入後回 /library", async ({
    page,
    context,
  }) => {
    test.skip(true, "Wave 2 skeleton：等 /login 頁面 + 守衛實作");
    await context.clearCookies();
    await page.goto("/library");
    await expect(page).toHaveURL(/\/login\?next=%2Flibrary/);

    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await page.getByTestId("login-api-key-input").fill(apiKey);
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/library/);
  });

  test("C-7 Sidebar 收合持久化：toggle → reload → 仍收合", async ({ page, context }) => {
    test.skip(true, "Wave 2 skeleton：等 SidebarToggle 實作");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");

    const sidebar = page.getByTestId("app-sidebar");
    await page.getByTestId("sidebar-toggle").click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");

    await page.reload();
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  });

  test("C-8 default.tsx 存在：直接訪問 /inbox 不會 404", async ({ page, context }) => {
    test.skip(true, "Wave 2 skeleton：parallel routes default.tsx 檢查");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);

    for (const path of ["/inbox", "/library", "/today", "/copilot"]) {
      const resp = await page.goto(path);
      expect(resp?.status(), `${path} 應 200`).toBeLessThan(400);
      await expect(page).toHaveURL(new RegExp(path + "$"));
    }
  });

  test("C-9 Theme 在所有 shell 頁面一致：切 theme 後跨頁保持", async ({ page, context }) => {
    test.skip(true, "Wave 2 skeleton：theme + shell 整合");
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
    await page.goto("/dashboard");

    // 切到 dark
    await page.getByTestId("theme-toggle").click();
    await page.getByTestId("theme-option-dark").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    for (const path of ["/library", "/today", "/dashboard"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    }
  });
});
