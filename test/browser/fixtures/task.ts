/**
 * Task Sheet / RefsPicker / UpcomingTasks 測試共用 fixtures（Sprint 10, F-031c / F-032c）
 *
 * Wave 0 skeleton。對應 issue：#127
 */

import type { Page, Route } from "@playwright/test";
import type { TaskStatus } from "./kanban";

// ---------------------------------------------------------------------------
// data-testid
// ---------------------------------------------------------------------------

export const TASK_TESTIDS = {
  // Task Sheet（右側抽屜）
  sheet: "task-sheet",
  sheetTitle: "task-sheet-title",
  sheetTitleInput: "task-sheet-title-input",
  sheetDescriptionInput: "task-sheet-description-input",
  sheetStatusSelect: "task-sheet-status-select",
  sheetPrioritySelect: "task-sheet-priority-select",
  sheetDueDateInput: "task-sheet-due-date-input",
  sheetSaveButton: "task-sheet-save-button",
  sheetCloseButton: "task-sheet-close-button",
  sheetCompleteButton: "task-sheet-complete-button",
  sheetDeleteButton: "task-sheet-delete-button",
  sheetDeleteConfirmButton: "task-sheet-delete-confirm-button",

  // Refs 區域（Sheet 下方）
  refsPanel: "task-sheet-refs-panel",
  refsList: "task-sheet-refs-list",
  refsItem: "task-sheet-refs-item",
  /** 動態：`task-sheet-refs-item-{refType}-{refId}` */
  refsItemById: (refType: string, refId: string) =>
    `task-sheet-refs-item-${refType}-${refId}`,
  refsItemRemoveButton: "task-sheet-refs-item-remove-button",
  refsItemDeletedBadge: "task-sheet-refs-item-deleted-badge",

  // RefsPicker（內嵌或 popover）
  refsPicker: "refs-picker",
  refsPickerTabEntry: "refs-picker-tab-entry",
  refsPickerTabJournal: "refs-picker-tab-journal",
  refsPickerTabGcal: "refs-picker-tab-gcal",
  refsPickerSearchInput: "refs-picker-search-input",
  refsPickerResultList: "refs-picker-result-list",
  refsPickerResultItem: "refs-picker-result-item",
  /** 動態：`refs-picker-result-item-{id}` */
  refsPickerResultItemById: (id: string) => `refs-picker-result-item-${id}`,
  refsPickerEmpty: "refs-picker-empty",
  refsPickerGcalDateInput: "refs-picker-gcal-date-input",

  // UpcomingTasks Widget（側邊欄底部）
  upcomingWidget: "upcoming-tasks-widget",
  upcomingWidgetTitle: "upcoming-tasks-widget-title",
  upcomingWidgetEmpty: "upcoming-tasks-widget-empty",
  upcomingWidgetItem: "upcoming-tasks-widget-item",
  /** 動態：`upcoming-tasks-widget-item-{taskId}` */
  upcomingWidgetItemById: (id: string) => `upcoming-tasks-widget-item-${id}`,
  upcomingWidgetItemTitle: "upcoming-tasks-widget-item-title",
  upcomingWidgetItemDue: "upcoming-tasks-widget-item-due",
  upcomingWidgetItemOverdueBadge: "upcoming-tasks-widget-item-overdue-badge",

  // Toast
  toastTaskSaved: "task-toast-saved",
  toastTaskCompleted: "task-toast-completed",
  toastTaskDeleted: "task-toast-deleted",
} as const;

// ---------------------------------------------------------------------------
// Mock shapes
// ---------------------------------------------------------------------------

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface MockTaskRef {
  ref_type: "entry" | "journal" | "gcal_event";
  ref_id: string;
  /** 對應資源是否已被刪除（顯示「已刪除」badge） */
  deleted?: boolean;
  /** 顯示用 title（後端 hydrate 出來的） */
  title?: string;
}

export interface MockTask {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  position: number;
  completed_at?: string | null;
  refs?: MockTaskRef[];
  created_at?: string;
  updated_at?: string;
}

export interface InstallTasksMockOpts {
  /** 依 id 索引 */
  tasks?: Record<string, MockTask>;
  /** GET /projects/:id/tasks 回傳（若未提供則以 tasks 值） */
  listByProject?: Record<string, MockTask[]>;
  /** GET /tasks/upcoming 回傳 */
  upcoming?: MockTask[];
  /** GET /tasks/overdue 回傳 */
  overdue?: MockTask[];
  /** PATCH /tasks/:id 回 500（測試 rollback） */
  patchFails?: boolean;
  /** 建立 task with 不存在的 entry ref → 400 */
  createInvalidRef?: boolean;
  /** GET tasks 超過 500 → 400 TOO_MANY_TASKS */
  tooManyTasks?: boolean;
  recorder?: {
    requests: Array<{ url: string; method: string; body?: unknown }>;
  };
}

/**
 * 安裝 `/api/v1/tasks*` + `/api/v1/projects/:id/tasks*` 的 mock。
 */
export async function installTasksMock(
  page: Page,
  opts: InstallTasksMockOpts = {},
): Promise<void> {
  const tasks = opts.tasks ?? {};

  // /api/v1/tasks*
  await page.route("**/api/v1/tasks**", async (route: Route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    if (opts.recorder) {
      let body: unknown = undefined;
      try {
        body = req.postDataJSON();
      } catch {
        // ignore
      }
      opts.recorder.requests.push({ url, method, body });
    }

    // GET /tasks/upcoming
    if (method === "GET" && /\/tasks\/upcoming(\?|$)/.test(url)) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: opts.upcoming ?? [] }),
      });
      return;
    }
    // GET /tasks/overdue
    if (method === "GET" && /\/tasks\/overdue(\?|$)/.test(url)) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: opts.overdue ?? [] }),
      });
      return;
    }

    // POST /tasks/:id/complete
    const completeMatch = url.match(/\/tasks\/([^/?#]+)\/complete/);
    if (method === "POST" && completeMatch) {
      const id = completeMatch[1];
      const existing = tasks[id] ?? makeMockTask({ id });
      const done: MockTask = {
        ...existing,
        status: "done",
        completed_at: "2026-04-24T00:00:00Z",
      };
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(done),
      });
      return;
    }

    // GET / PATCH / DELETE /tasks/:id
    const idMatch = url.match(/\/tasks\/([^/?#]+)(?:[?#]|$)/);
    if (idMatch) {
      const id = idMatch[1];
      if (method === "GET") {
        const t = tasks[id];
        if (!t) {
          await route.fulfill({
            status: 404,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code: "NOT_FOUND" }),
          });
        } else {
          await route.fulfill({
            status: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(t),
          });
        }
        return;
      }
      if (method === "PATCH") {
        if (opts.patchFails) {
          await route.fulfill({
            status: 500,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code: "INTERNAL_ERROR" }),
          });
          return;
        }
        const existing = tasks[id] ?? makeMockTask({ id });
        let patch: Record<string, unknown> = {};
        try {
          patch = req.postDataJSON() as Record<string, unknown>;
        } catch {
          patch = {};
        }
        const merged: MockTask = { ...existing, ...patch, id };
        await route.fulfill({
          status: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(merged),
        });
        return;
      }
      if (method === "DELETE") {
        await route.fulfill({ status: 204, body: "" });
        return;
      }
    }

    await route.continue();
  });

  // /api/v1/projects/:id/tasks（建立 / 列表）
  await page.route("**/api/v1/projects/**/tasks**", async (route: Route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    if (opts.recorder) {
      let body: unknown = undefined;
      try {
        body = req.postDataJSON();
      } catch {
        // ignore
      }
      opts.recorder.requests.push({ url, method, body });
    }

    const projectMatch = url.match(/\/projects\/([^/?#]+)\/tasks/);
    const projectId = projectMatch?.[1] ?? "unknown";

    if (method === "GET") {
      if (opts.tooManyTasks) {
        await route.fulfill({
          status: 400,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: "TOO_MANY_TASKS" }),
        });
        return;
      }
      const list =
        opts.listByProject?.[projectId] ??
        Object.values(tasks).filter((t) => t.project_id === projectId);
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: list }),
      });
      return;
    }

    if (method === "POST") {
      if (opts.createInvalidRef) {
        await route.fulfill({
          status: 400,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: "INVALID_INPUT" }),
        });
        return;
      }
      let payload: Record<string, unknown> = {};
      try {
        payload = req.postDataJSON() as Record<string, unknown>;
      } catch {
        payload = {};
      }
      const created = makeMockTask({
        id: `task-${Date.now()}`,
        project_id: projectId,
        title: (payload.title as string) ?? "untitled",
        description: payload.description as string | undefined,
        status: (payload.status as TaskStatus) ?? "todo",
        priority: (payload.priority as TaskPriority) ?? "normal",
        due_date: payload.due_date as string | undefined,
        refs: (payload.refs as MockTaskRef[]) ?? [],
      });
      await route.fulfill({
        status: 201,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(created),
      });
      return;
    }

    await route.continue();
  });
}

export function makeMockTask(opts: Partial<MockTask> = {}): MockTask {
  const id = opts.id ?? `task-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    project_id: opts.project_id ?? "proj-default",
    title: opts.title ?? `Task ${id.slice(0, 6)}`,
    description: opts.description ?? null,
    status: opts.status ?? "todo",
    priority: opts.priority ?? "normal",
    due_date: opts.due_date ?? null,
    position: opts.position ?? 0,
    completed_at: opts.completed_at ?? null,
    refs: opts.refs ?? [],
    created_at: opts.created_at ?? "2026-04-24T00:00:00Z",
    updated_at: opts.updated_at ?? "2026-04-24T00:00:00Z",
  };
}
