/**
 * F-032b — Kanban Board（拖拉改 status / position）
 *
 * 對應 issue：#127（Wave 0 skeleton；Wave 3 補完整 assertion）
 * 對應 spec：specs/features/f032-projects-frontend.md
 *
 * 重點：
 *   - 4 欄（todo / in_progress / blocked / done）
 *   - mouse drag 拖拉 → 樂觀更新 + PATCH
 *   - PATCH 失敗 → rollback + toast
 *   - 鍵盤拖放（focus → Space → ArrowRight → Space）
 *   - 一鍵完成（task card 勾勾）
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  PROJECTS_TESTIDS as P,
  installProjectsMock,
  makeMockProject,
} from "../fixtures/projects";
import { KANBAN_TESTIDS as K, KANBAN_COLUMNS } from "../fixtures/kanban";
import { installTasksMock, makeMockTask } from "../fixtures/task";

const PROJECT_ID = "p-kanban-1";
const TASK_T1 = "task-t1";

test.describe("Projects — Kanban Board（F-032b）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(
      request,
      `qa10-projects-kanban-${Date.now()}`,
    );
    await page.goto("/");
    await setupAuth(page, key);

    // 共用：1 project + 數個 tasks
    const projects = {
      [PROJECT_ID]: makeMockProject({ id: PROJECT_ID, name: "aibo v2" }),
    };
    await installProjectsMock(page, { projects });
  });

  test("Scenario: Board tab 顯示 4 欄（todo / in_progress / blocked / done）", async ({
    page,
  }) => {
    test.skip(false, "Wave 3 — 等 KanbanBoard 完成再啟用");
    // GIVEN 專案有 tasks 散落在 4 個 status
    const tasks = {
      [TASK_T1]: makeMockTask({ id: TASK_T1, project_id: PROJECT_ID, status: "todo" }),
      "task-t2": makeMockTask({ id: "task-t2", project_id: PROJECT_ID, status: "in_progress" }),
      "task-t3": makeMockTask({ id: "task-t3", project_id: PROJECT_ID, status: "blocked" }),
      "task-t4": makeMockTask({ id: "task-t4", project_id: PROJECT_ID, status: "done" }),
    };
    await installTasksMock(page, { tasks });

    // WHEN 進入 detail board
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();

    // THEN 顯示 4 欄
    await expect(page.getByTestId(K.board)).toBeVisible();
    for (const status of KANBAN_COLUMNS) {
      await expect(page.getByTestId(K.column(status))).toBeVisible();
    }
  });

  test("Scenario: 拖拉 task 從 todo 到 in_progress（mouse drag）→ 樂觀更新 + PATCH 成功", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 dnd-kit 拖拉實作完成再啟用");
    // GIVEN t1 在 todo 欄
    const tasks = {
      [TASK_T1]: makeMockTask({
        id: TASK_T1,
        project_id: PROJECT_ID,
        status: "todo",
        position: 0,
      }),
    };
    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };
    await installTasksMock(page, { tasks, recorder });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();

    // WHEN 拖拉 t1 到 in_progress 欄
    const card = page.getByTestId(K.taskCardById(TASK_T1));
    const dropZone = page.getByTestId(K.columnDropZone("in_progress"));
    // 預留：實際 drag 用 page.mouse + dragTo（dnd-kit 需 multi-step）
    await card.hover();
    await page.mouse.down();
    await dropZone.hover();
    await page.mouse.up();

    // THEN UI 立即（樂觀）顯示 t1 在 in_progress 欄
    await expect(
      page.getByTestId(K.column("in_progress")).getByTestId(K.taskCardById(TASK_T1)),
    ).toBeVisible();
    // AND PATCH /tasks/:id with { status:"in_progress" }
    expect(
      recorder.requests.some(
        (r) =>
          r.method === "PATCH" &&
          r.url.includes(`/tasks/${TASK_T1}`) &&
          (r.body as { status?: string })?.status === "in_progress",
      ),
    ).toBeTruthy();
  });

  test("Scenario: PATCH 失敗 → rollback + toast 「更新失敗」", async ({ page }) => {
    test.skip(true, "Wave 3 — 等錯誤 rollback 處理完成再啟用");
    const tasks = {
      [TASK_T1]: makeMockTask({
        id: TASK_T1,
        project_id: PROJECT_ID,
        status: "todo",
      }),
    };
    await installTasksMock(page, { tasks, patchFails: true });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();

    // WHEN 拖拉 t1 到 in_progress
    const card = page.getByTestId(K.taskCardById(TASK_T1));
    const dropZone = page.getByTestId(K.columnDropZone("in_progress"));
    await card.hover();
    await page.mouse.down();
    await dropZone.hover();
    await page.mouse.up();

    // THEN t1 回到 todo 欄 + 顯示錯誤 toast
    await expect(
      page.getByTestId(K.column("todo")).getByTestId(K.taskCardById(TASK_T1)),
    ).toBeVisible();
    await expect(page.getByTestId(K.toastDragFailed)).toBeVisible();
  });

  test("Scenario: 鍵盤拖放（focus → Space → ArrowRight → Space）→ status 變更", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等鍵盤無障礙拖放完成再啟用");
    const tasks = {
      [TASK_T1]: makeMockTask({
        id: TASK_T1,
        project_id: PROJECT_ID,
        status: "todo",
      }),
    };
    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };
    await installTasksMock(page, { tasks, recorder });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();

    // WHEN focus task card → Space 提起 → ArrowRight 移到下一欄 → Space 放下
    const card = page.getByTestId(K.taskCardById(TASK_T1));
    await card.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Space");

    // THEN PATCH /tasks/:id status=in_progress
    expect(
      recorder.requests.some(
        (r) =>
          r.method === "PATCH" &&
          r.url.includes(`/tasks/${TASK_T1}`) &&
          (r.body as { status?: string })?.status === "in_progress",
      ),
    ).toBeTruthy();
  });

  test("Scenario: 一鍵完成 → POST /complete → task 移到 done", async ({ page }) => {
    test.skip(false, "Wave 3 — 等 task card 完成按鈕完成再啟用");
    const tasks = {
      [TASK_T1]: makeMockTask({
        id: TASK_T1,
        project_id: PROJECT_ID,
        status: "todo",
      }),
    };
    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };
    await installTasksMock(page, { tasks, recorder });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();

    // WHEN 點 task card 上的「完成」勾勾
    await page
      .getByTestId(K.taskCardById(TASK_T1))
      .getByTestId(K.taskCardCompleteButton)
      .click();

    // THEN 呼叫 POST /tasks/:id/complete + task 移到 done 欄
    expect(
      recorder.requests.some(
        (r) =>
          r.method === "POST" && r.url.includes(`/tasks/${TASK_T1}/complete`),
      ),
    ).toBeTruthy();
    await expect(
      page.getByTestId(K.column("done")).getByTestId(K.taskCardById(TASK_T1)),
    ).toBeVisible();
  });
});
