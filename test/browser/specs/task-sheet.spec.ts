/**
 * F-032c — Task Sheet（右側抽屜）+ RefsPicker + 強制刪除
 *
 * 對應 issue：#127（Wave 0 skeleton；Wave 3 補完整 assertion）
 * 對應 spec：specs/features/f032-projects-frontend.md
 *
 * 重點：
 *   - 點 task card → 開啟 Sheet
 *   - 編輯 title / status / priority / due → PATCH
 *   - 完成按鈕 → POST /complete
 *   - 刪除按鈕 → 二次確認 → DELETE
 *   - RefsPicker：entry / journal / gcal 三 tab
 *   - refs 對應資源已刪除 → 顯示「已刪除」
 *   - 移除 ref（即時 PATCH）
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
import {
  TASK_TESTIDS as T,
  installTasksMock,
  makeMockTask,
} from "../fixtures/task";

const PROJECT_ID = "p-task-sheet-1";
const TASK_ID = "task-sheet-1";

test.describe("Task Sheet（F-032c）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(
      request,
      `qa10-task-sheet-${Date.now()}`,
    );
    await page.goto("/");
    await setupAuth(page, key);

    const projects = {
      [PROJECT_ID]: makeMockProject({ id: PROJECT_ID, name: "aibo v2" }),
    };
    await installProjectsMock(page, { projects });
  });

  test("Scenario: 點 Kanban task card → 開啟 Sheet", async ({ page }) => {
    test.skip(false, "Wave 3 — 等 task card click → sheet 完成再啟用");
    const tasks = {
      [TASK_ID]: makeMockTask({
        id: TASK_ID,
        project_id: PROJECT_ID,
        title: "設計 schema",
      }),
    };
    await installTasksMock(page, { tasks });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();

    // WHEN 點 task card
    await page.getByTestId(K.taskCardById(TASK_ID)).click();

    // THEN Sheet 開啟並顯示 title
    await expect(page.getByTestId(T.sheet)).toBeVisible();
    await expect(page.getByTestId(T.sheetTitleInput)).toHaveValue("設計 schema");
  });

  test("Scenario: Sheet 編輯 title 儲存 → PATCH /tasks/:id", async ({ page }) => {
    test.skip(false, "Wave 3 — 等 sheet save flow 完成再啟用");
    const tasks = {
      [TASK_ID]: makeMockTask({
        id: TASK_ID,
        project_id: PROJECT_ID,
        title: "設計 schema",
      }),
    };
    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };
    await installTasksMock(page, { tasks, recorder });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();
    await page.getByTestId(K.taskCardById(TASK_ID)).click();

    // WHEN 改 title 並按存檔
    await page.getByTestId(T.sheetTitleInput).fill("設計 schema v2");
    await page.getByTestId(T.sheetSaveButton).click();

    // THEN PATCH 呼叫 + toast
    expect(
      recorder.requests.some(
        (r) =>
          r.method === "PATCH" &&
          r.url.includes(`/tasks/${TASK_ID}`) &&
          (r.body as { title?: string })?.title === "設計 schema v2",
      ),
    ).toBeTruthy();
    await expect(page.getByTestId(T.toastTaskSaved)).toBeVisible();
  });

  test("Scenario: 完成按鈕 → POST /tasks/:id/complete", async ({ page }) => {
    test.skip(false, "Wave 3 — 等 sheet 完成按鈕完成再啟用");
    const tasks = {
      [TASK_ID]: makeMockTask({
        id: TASK_ID,
        project_id: PROJECT_ID,
        status: "todo",
      }),
    };
    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };
    await installTasksMock(page, { tasks, recorder });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();
    await page.getByTestId(K.taskCardById(TASK_ID)).click();

    // WHEN 點 sheet 內的「完成」
    await page.getByTestId(T.sheetCompleteButton).click();

    // THEN POST /complete
    expect(
      recorder.requests.some(
        (r) => r.method === "POST" && r.url.includes(`/tasks/${TASK_ID}/complete`),
      ),
    ).toBeTruthy();
  });

  test("Scenario: 刪除按鈕 → 二次確認 → DELETE", async ({ page }) => {
    test.skip(false, "Wave 3 — 等 sheet 刪除二次確認完成再啟用");
    const tasks = {
      [TASK_ID]: makeMockTask({
        id: TASK_ID,
        project_id: PROJECT_ID,
      }),
    };
    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };
    await installTasksMock(page, { tasks, recorder });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();
    await page.getByTestId(K.taskCardById(TASK_ID)).click();

    // WHEN 點刪除 → 出現確認 → 確認
    await page.getByTestId(T.sheetDeleteButton).click();
    await page.getByTestId(T.sheetDeleteConfirmButton).click();

    // THEN DELETE /tasks/:id
    expect(
      recorder.requests.some(
        (r) => r.method === "DELETE" && r.url.includes(`/tasks/${TASK_ID}`),
      ),
    ).toBeTruthy();
    await expect(page.getByTestId(T.toastTaskDeleted)).toBeVisible();
  });

  test("Scenario: RefsPicker — Entry tab 搜尋 → 選取 → 即時 PATCH refs", async ({
    page,
  }) => {
    test.skip(true, "Wave 3 — 等 RefsPicker Entry 搜尋完成再啟用");
    const tasks = {
      [TASK_ID]: makeMockTask({ id: TASK_ID, project_id: PROJECT_ID, refs: [] }),
    };
    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };
    await installTasksMock(page, { tasks, recorder });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();
    await page.getByTestId(K.taskCardById(TASK_ID)).click();

    // WHEN 開啟 RefsPicker → entry tab → 搜尋 → 選取
    await page.getByTestId(T.refsPicker).click();
    await page.getByTestId(T.refsPickerTabEntry).click();
    await page.getByTestId(T.refsPickerSearchInput).fill("schema");
    // 預留：搜尋結果由 entries search API 提供，Wave 3 補 mock
    await page.getByTestId(T.refsPickerResultItemById("entry-e1")).click();

    // THEN 即時 PATCH refs + 下方 refs 區塊新增一筆
    expect(
      recorder.requests.some(
        (r) =>
          r.method === "PATCH" &&
          r.url.includes(`/tasks/${TASK_ID}`) &&
          Array.isArray((r.body as { refs?: unknown[] })?.refs),
      ),
    ).toBeTruthy();
    await expect(
      page.getByTestId(T.refsItemById("entry", "entry-e1")),
    ).toBeVisible();
  });

  test("Scenario: RefsPicker — Journal tab 列出最近 90 天", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 RefsPicker Journal 完成再啟用");
    const tasks = {
      [TASK_ID]: makeMockTask({ id: TASK_ID, project_id: PROJECT_ID }),
    };
    await installTasksMock(page, { tasks });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();
    await page.getByTestId(K.taskCardById(TASK_ID)).click();

    // WHEN 切到 journal tab
    await page.getByTestId(T.refsPicker).click();
    await page.getByTestId(T.refsPickerTabJournal).click();

    // THEN 列出列表（不為空 / 或 empty state）
    await expect(page.getByTestId(T.refsPickerResultList)).toBeVisible();
  });

  test("Scenario: RefsPicker — Gcal tab 選日期 → 列 events", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 RefsPicker Gcal 完成再啟用");
    const tasks = {
      [TASK_ID]: makeMockTask({ id: TASK_ID, project_id: PROJECT_ID }),
    };
    await installTasksMock(page, { tasks });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();
    await page.getByTestId(K.taskCardById(TASK_ID)).click();

    // WHEN 切 gcal tab → 選日期
    await page.getByTestId(T.refsPicker).click();
    await page.getByTestId(T.refsPickerTabGcal).click();
    await page.getByTestId(T.refsPickerGcalDateInput).fill("2026-04-24");

    // THEN 顯示當日 events 列表
    await expect(page.getByTestId(T.refsPickerResultList)).toBeVisible();
  });

  test("Scenario: 移除 ref → PATCH refs 不含該項", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 ref 移除按鈕完成再啟用");
    const tasks = {
      [TASK_ID]: makeMockTask({
        id: TASK_ID,
        project_id: PROJECT_ID,
        refs: [{ ref_type: "entry", ref_id: "entry-e1", title: "Schema" }],
      }),
    };
    const recorder = { requests: [] as Array<{ url: string; method: string; body?: unknown }> };
    await installTasksMock(page, { tasks, recorder });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();
    await page.getByTestId(K.taskCardById(TASK_ID)).click();

    // WHEN 點該 ref 的「移除」
    const item = page.getByTestId(T.refsItemById("entry", "entry-e1"));
    await item.getByTestId(T.refsItemRemoveButton).click();

    // THEN PATCH refs = [] + UI 移除該項
    expect(
      recorder.requests.some(
        (r) =>
          r.method === "PATCH" &&
          r.url.includes(`/tasks/${TASK_ID}`) &&
          Array.isArray((r.body as { refs?: unknown[] })?.refs) &&
          ((r.body as { refs?: unknown[] }).refs as unknown[]).length === 0,
      ),
    ).toBeTruthy();
    await expect(item).toHaveCount(0);
  });

  test("Scenario: ref 對應資源已刪除 → 顯示「已刪除」badge", async ({ page }) => {
    test.skip(true, "Wave 3 — 等 ref 失效顯示完成再啟用");
    const tasks = {
      [TASK_ID]: makeMockTask({
        id: TASK_ID,
        project_id: PROJECT_ID,
        refs: [
          { ref_type: "entry", ref_id: "entry-deleted", deleted: true },
        ],
      }),
    };
    await installTasksMock(page, { tasks });
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.getByTestId(P.detailTabBoard).click();
    await page.getByTestId(K.taskCardById(TASK_ID)).click();

    // THEN 對應 ref item 顯示「已刪除」badge
    const item = page.getByTestId(T.refsItemById("entry", "entry-deleted"));
    await expect(item.getByTestId(T.refsItemDeletedBadge)).toBeVisible();
  });
});
