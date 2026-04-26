/**
 * F-032a — Projects 列表頁 /projects
 *
 * 對應 issue：#127（Wave 0 skeleton；Wave 3 補完整 assertion）
 * 對應 spec：specs/features/f032-projects-frontend.md
 *
 * Wave 0：所有 test 皆 test.skip(false, ...)。
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  PROJECTS_TESTIDS as P,
  installProjectsMock,
  makeMockProject,
} from "../fixtures/projects";

test.describe("Projects — 列表頁（F-032a）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(
      request,
      `qa10-projects-list-${Date.now()}`,
    );
    await page.goto("/");
    await setupAuth(page, key);
  });

  test("Scenario: 進入 /projects → 顯示卡片 grid", async ({ page }) => {
    test.skip(false, "Wave 3 — 等 F-032a ProjectsListPage 完成再啟用");
    // GIVEN 使用者有 2 個 active projects
    const projects = {
      p1: makeMockProject({ id: "p1", name: "aibo v2", progress: 30 }),
      p2: makeMockProject({ id: "p2", name: "side hustle", progress: 0 }),
    };
    await installProjectsMock(page, { projects });

    // WHEN 進入 /projects
    await page.goto("/projects");

    // THEN 顯示 list page 與 2 張卡片
    await expect(page.getByTestId(P.listPage)).toBeVisible();
    await expect(page.getByTestId(P.listCard)).toHaveCount(2);
    await expect(page.getByTestId(P.listCardById("p1"))).toContainText("aibo v2");
  });

  test("Scenario: 列表為空 → 顯示空狀態 + 「建立第一個」CTA", async ({ page }) => {
    test.skip(false, "Wave 3 — 等空狀態 UI 完成再啟用");
    // GIVEN 沒有任何 project
    await installProjectsMock(page, { projects: {}, list: [] });

    // WHEN 進入 /projects
    await page.goto("/projects");

    // THEN 顯示 empty + create-first CTA
    await expect(page.getByTestId(P.listEmpty)).toBeVisible();
    await expect(page.getByTestId(P.listEmptyCreateFirst)).toBeVisible();
  });

  test("Scenario: 點「新增」開啟 dialog → 填表 → 提交 → navigate /projects/:id", async ({
    page,
  }) => {
    test.skip(false, "Wave 3 — 等 ProjectDialog + create flow 完成再啟用");
    // GIVEN /projects 列表頁
    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };
    await installProjectsMock(page, { recorder });
    await page.goto("/projects");

    // WHEN 點「新增」→ dialog 開啟 → 填 name → submit
    await page.getByTestId(P.listCreateButton).click();
    await expect(page.getByTestId(P.dialog)).toBeVisible();
    await page.getByTestId(P.dialogNameInput).fill("aibo v2");
    await page.getByTestId(P.dialogSubmitButton).click();

    // THEN 呼叫 POST /api/v1/projects 且導向 /projects/:id（Board tab）
    await expect(page).toHaveURL(/\/projects\/[^/]+$/);
    expect(
      recorder.requests.some(
        (r) => r.method === "POST" && /\/projects(\?|$)/.test(r.url),
      ),
    ).toBeTruthy();
  });

  test("Scenario: 重名 → name 欄位顯示「名稱已存在」", async ({ page }) => {
    test.skip(false, "Wave 3 — 等 dialog 錯誤訊息處理完成再啟用");
    // GIVEN API 回 409 PROJECT_NAME_DUPLICATE
    await installProjectsMock(page, { createConflict: true });
    await page.goto("/projects");

    // WHEN 提交重名
    await page.getByTestId(P.listCreateButton).click();
    await page.getByTestId(P.dialogNameInput).fill("aibo v2");
    await page.getByTestId(P.dialogSubmitButton).click();

    // THEN dialog name 欄位顯示錯誤
    await expect(page.getByTestId(P.dialogNameError)).toBeVisible();
    await expect(page.getByTestId(P.dialogNameError)).toContainText(/已存在|duplicate/i);
  });

  test("Scenario: 切換 status tab → 套用正確 query", async ({ page }) => {
    test.skip(false, "Wave 3 — 等 status tabs 篩選完成再啟用");
    // GIVEN 列表頁
    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };
    await installProjectsMock(page, { recorder });
    await page.goto("/projects");

    // WHEN 點 archived tab
    await page.getByTestId(P.listStatusTab("archived")).click();

    // THEN 後端 query 帶 status=archived
    expect(
      recorder.requests.some(
        (r) => r.method === "GET" && /status=archived/.test(r.url),
      ),
    ).toBeTruthy();
  });

  test("Scenario: 卡片顯示 progress bar + 未完成 task 數 + 下一個 due", async ({
    page,
  }) => {
    test.skip(false, "Wave 3 — 等卡片設計完成再啟用");
    // GIVEN 1 project，progress=50, open=3
    const projects = {
      p1: makeMockProject({
        id: "p1",
        name: "aibo v2",
        progress: 50,
        task_counts: { total: 4, by_status: { todo: 2, in_progress: 1, done: 1 } },
      }),
    };
    await installProjectsMock(page, { projects });

    // WHEN 進入 /projects
    await page.goto("/projects");

    // THEN 顯示 progress bar / open count / next due
    const card = page.getByTestId(P.listCardById("p1"));
    await expect(card.getByTestId(P.listCardProgressBar)).toBeVisible();
    await expect(card.getByTestId(P.listCardOpenTaskCount)).toBeVisible();
    await expect(card.getByTestId(P.listCardStatusBadge)).toContainText(/active|進行中/i);
  });
});
