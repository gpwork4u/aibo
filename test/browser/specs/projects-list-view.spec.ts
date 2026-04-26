/**
 * F-032b — Projects 詳情頁 List tab（表格檢視）
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
import { KANBAN_TESTIDS as K } from "../fixtures/kanban";
import { installTasksMock, makeMockTask } from "../fixtures/task";

const PROJECT_ID = "p-list-tab-1";

test.describe("Projects — List tab 表格（F-032b）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(
      request,
      `qa10-projects-list-tab-${Date.now()}`,
    );
    await page.goto("/");
    await setupAuth(page, key);

    const projects = {
      [PROJECT_ID]: makeMockProject({ id: PROJECT_ID, name: "aibo v2" }),
    };
    await installProjectsMock(page, { projects });
  });

  test("Scenario: List tab 顯示表格欄位（title / status / priority / due / refs）", async ({
    page,
  }) => {
    test.skip(false, "Wave 3 — 等 List tab 表格完成再啟用");
    // GIVEN 專案內 2 個 tasks
    const tasks = {
      "task-a": makeMockTask({
        id: "task-a",
        project_id: PROJECT_ID,
        title: "設計 schema",
        status: "todo",
        priority: "high",
        due_date: "2026-04-30",
      }),
      "task-b": makeMockTask({
        id: "task-b",
        project_id: PROJECT_ID,
        title: "API 實作",
        status: "in_progress",
        priority: "normal",
        due_date: "2026-05-02",
      }),
    };
    await installTasksMock(page, { tasks });

    // WHEN 切換到 List tab
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabList).click();

    // THEN 顯示表格 + 2 列
    await expect(page.getByTestId(K.listTable)).toBeVisible();
    await expect(page.getByTestId(K.listRow)).toHaveCount(2);
    const rowA = page.getByTestId(K.listRowById("task-a"));
    await expect(rowA.getByTestId(K.listColTitle)).toContainText("設計 schema");
    await expect(rowA.getByTestId(K.listColPriority)).toContainText(/high|高/i);
    await expect(rowA.getByTestId(K.listColDue)).toContainText("2026-04-30");
  });

  test("Scenario: 點 List tab 列 → 開啟 Task Sheet", async ({ page }) => {
    test.skip(false, "Wave 3 — 等 row click → sheet 完成再啟用");
    const tasks = {
      "task-a": makeMockTask({
        id: "task-a",
        project_id: PROJECT_ID,
        title: "設計 schema",
      }),
    };
    await installTasksMock(page, { tasks });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabList).click();

    // WHEN 點某一列
    await page.getByTestId(K.listRowById("task-a")).click();

    // THEN Task Sheet 開啟（sheet 開啟邏輯由 task-sheet.spec.ts 詳細覆蓋）
    await expect(page.locator('[data-testid="task-sheet"]')).toBeVisible();
  });
});
