/**
 * F-032b — Projects 詳情頁 /projects/:id（Overview tab + 詳情頁基礎）
 *
 * 對應 issue：#127（Wave 0 skeleton；Wave 3 補完整 assertion）
 * 對應 spec：specs/features/f032-projects-frontend.md
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  PROJECTS_TESTIDS as P,
  installProjectsMock,
  makeMockProject,
} from "../fixtures/projects";

const PROJECT_ID = "p-detail-1";

test.describe("Projects — 詳情頁 / Overview（F-032b）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(
      request,
      `qa10-projects-detail-${Date.now()}`,
    );
    await page.goto("/");
    await setupAuth(page, key);
  });

  test("Scenario: 進入 /projects/:id → 預設顯示 Board tab", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 ProjectDetailPage tabs 完成再啟用");
    // GIVEN 既有專案
    const projects = {
      [PROJECT_ID]: makeMockProject({ id: PROJECT_ID, name: "aibo v2" }),
    };
    await installProjectsMock(page, { projects });

    // WHEN 進入 detail
    await page.goto(`/projects/${PROJECT_ID}`);

    // THEN 顯示 detail page 與 board tab 為 active
    await expect(page.getByTestId(P.detailPage)).toBeVisible();
    await expect(page.getByTestId(P.detailTabBoard)).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  test("Scenario: 切換到 Overview tab → 顯示 description / progress / 時程", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 OverviewPanel 完成再啟用");
    // GIVEN 專案有 description / progress / start_date / end_date
    const projects = {
      [PROJECT_ID]: makeMockProject({
        id: PROJECT_ID,
        name: "aibo v2",
        description: "AI 個人助理 v2",
        progress: 42,
        start_date: "2026-04-01",
        end_date: "2026-06-30",
      }),
    };
    await installProjectsMock(page, { projects });
    await page.goto(`/projects/${PROJECT_ID}`);

    // WHEN 點 Overview tab
    await page.getByTestId(P.detailTabOverview).click();

    // THEN 顯示對應欄位
    const panel = page.getByTestId(P.overviewPanel);
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId(P.overviewDescription)).toContainText(
      "AI 個人助理 v2",
    );
    await expect(panel.getByTestId(P.overviewProgressText)).toContainText("42");
    await expect(panel.getByTestId(P.overviewStartDate)).toContainText("2026-04-01");
    await expect(panel.getByTestId(P.overviewEndDate)).toContainText("2026-06-30");
  });

  test("Scenario: header 顯示 name + status badge + edit/archive/delete 按鈕", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 detail header 完成再啟用");
    const projects = {
      [PROJECT_ID]: makeMockProject({ id: PROJECT_ID, name: "aibo v2" }),
    };
    await installProjectsMock(page, { projects });
    await page.goto(`/projects/${PROJECT_ID}`);

    await expect(page.getByTestId(P.detailHeaderName)).toContainText("aibo v2");
    await expect(page.getByTestId(P.detailHeaderStatusBadge)).toBeVisible();
    await expect(page.getByTestId(P.detailEditButton)).toBeVisible();
    await expect(page.getByTestId(P.detailArchiveButton)).toBeVisible();
    await expect(page.getByTestId(P.detailDeleteButton)).toBeVisible();
  });

  test("Scenario: 刪除有 task 的專案 → 409 → 二次確認 → force delete", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 delete force flow 完成再啟用");
    // GIVEN 專案有 tasks，DELETE 預設回 409
    const projects = {
      [PROJECT_ID]: makeMockProject({
        id: PROJECT_ID,
        name: "aibo v2",
        task_counts: { total: 3, by_status: { todo: 3 } },
      }),
    };
    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };
    await installProjectsMock(page, { projects, deleteHasTasks: true, recorder });
    await page.goto(`/projects/${PROJECT_ID}`);

    // WHEN 點 delete → API 回 409 → 顯示二次確認 → 確認 force
    await page.getByTestId(P.detailDeleteButton).click();
    // 第一次刪除被擋（409）→ 顯示二次確認 dialog
    await expect(page.getByTestId(P.deleteDialog)).toBeVisible();
    await expect(page.getByTestId(P.deleteDialogConfirmHasTasks)).toContainText(/3/);
    await page.getByTestId(P.deleteDialogForceButton).click();

    // THEN 第二次帶 ?force=true，回 204
    await expect(page).toHaveURL(/\/projects$/);
    expect(
      recorder.requests.some(
        (r) => r.method === "DELETE" && /force=true/.test(r.url),
      ),
    ).toBeTruthy();
  });

  test("Scenario: 點 archive → 呼叫 POST /:id/archive → status 變 archived", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 archive button 完成再啟用");
    const projects = {
      [PROJECT_ID]: makeMockProject({ id: PROJECT_ID, name: "aibo v2" }),
    };
    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };
    await installProjectsMock(page, { projects, recorder });
    await page.goto(`/projects/${PROJECT_ID}`);

    // WHEN 點 archive
    await page.getByTestId(P.detailArchiveButton).click();

    // THEN POST /:id/archive
    expect(
      recorder.requests.some(
        (r) => r.method === "POST" && /\/projects\/[^/]+\/archive/.test(r.url),
      ),
    ).toBeTruthy();
  });
});
