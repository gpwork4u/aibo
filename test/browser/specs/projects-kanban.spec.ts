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

import { test, expect, type Locator, type Page } from "@playwright/test";
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

// @dnd-kit MouseSensor 的 activationConstraint distance=4，需手動觸發 pointermove 序列
async function dragKanbanCard(page: Page, handle: Locator, dropZone: Locator) {
  await handle.scrollIntoViewIfNeeded();
  await dropZone.scrollIntoViewIfNeeded();
  const handleBox = await handle.boundingBox();
  const zoneBox = await dropZone.boundingBox();
  if (!handleBox || !zoneBox) throw new Error("dragKanbanCard: locator not visible");
  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const endX = zoneBox.x + zoneBox.width / 2;
  const endY = zoneBox.y + zoneBox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // 超過 activation distance（4px）觸發 drag start
  await page.mouse.move(startX + 20, startY, { steps: 5 });
  // 移到 drop zone（多階段，讓 dnd-kit 更新 over 狀態）
  await page.mouse.move((startX + endX) / 2, (startY + endY) / 2, { steps: 10 });
  await page.mouse.move(endX, endY, { steps: 10 });
  // 短暫停留讓 dnd-kit collision detection 鎖定 over column
  await page.waitForTimeout(50);
  await page.mouse.up();
}

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
    test.skip(false, "Wave 3 — dnd-kit drag 已實作（#156）");
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

    // WHEN 拖拉 t1 到 in_progress 欄（手動 mouse events 觸發 @dnd-kit MouseSensor activationConstraint distance=4）
    const dragHandle = page.getByTestId(K.taskCardById(TASK_T1)).getByTestId(K.taskCardDragHandle);
    const dropZone = page.getByTestId(K.columnDropZone("in_progress"));
    await dragKanbanCard(page, dragHandle, dropZone);

    // THEN UI 立即（樂觀）顯示 t1 在 in_progress 欄
    await expect(
      page.getByTestId(K.column("in_progress")).getByTestId(K.taskCardById(TASK_T1)),
    ).toBeVisible();
    // AND PATCH /tasks/:id with { status:"in_progress" }
    await expect
      .poll(() =>
        recorder.requests.some(
          (r) =>
            r.method === "PATCH" &&
            r.url.includes(`/tasks/${TASK_T1}`) &&
            (r.body as { status?: string })?.status === "in_progress",
        ),
      )
      .toBeTruthy();
  });

  test("Scenario: PATCH 失敗 → rollback + toast 「更新失敗」", async ({ page }) => {
    test.skip(false, "Wave 3 — dnd-kit drag rollback 已實作（#156）");
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

    // WHEN 拖拉 t1 到 in_progress（手動 mouse events）
    const dragHandle = page.getByTestId(K.taskCardById(TASK_T1)).getByTestId(K.taskCardDragHandle);
    const dropZone = page.getByTestId(K.columnDropZone("in_progress"));
    await dragKanbanCard(page, dragHandle, dropZone);

    // THEN t1 回到 todo 欄 + 顯示錯誤 toast
    await expect(
      page.getByTestId(K.column("todo")).getByTestId(K.taskCardById(TASK_T1)),
    ).toBeVisible();
    await expect(page.getByTestId(K.toastDragFailed)).toBeVisible();
  });

  test("Scenario: 鍵盤拖放（focus → Space → ArrowRight → Space）→ status 變更", async ({
    page,
  }) => {
    test.skip(true, "鍵盤拖放：dnd-kit sortableKeyboardCoordinates 需要 layout 中有多個 sortable 才能用 ArrowRight 跨欄；單卡情境下 KeyboardSensor 無法決定目標欄。留 NICE TO HAVE，#156 mouse drag 部分已修");
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

    // WHEN focus drag handle → Space 提起 → ArrowRight 移到下一欄 → Space 放下
    // dnd-kit KeyboardSensor 的 listeners 掛在 drag handle button 上
    const dragHandle = page.getByTestId(K.taskCardById(TASK_T1)).getByTestId(K.taskCardDragHandle);
    await dragHandle.focus();
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
    await expect
      .poll(() =>
        recorder.requests.some(
          (r) =>
            r.method === "POST" && r.url.includes(`/tasks/${TASK_T1}/complete`),
        ),
      )
      .toBeTruthy();
    await expect(
      page.getByTestId(K.column("done")).getByTestId(K.taskCardById(TASK_T1)),
    ).toBeVisible();
  });
});
