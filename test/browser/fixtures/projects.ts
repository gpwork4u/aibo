/**
 * Projects 測試共用 fixtures 與 testid 常數（Sprint 10, F-031 / F-032）
 *
 * Wave 0 skeleton：
 *   - 集中所有 data-testid，engineer 實作 UI 時請沿用，避免 spec 散落字串。
 *   - Wave 3 解 skip 時直接以下面 helpers 建立 mock。
 *
 * 對應 issue：#127
 * 對應 spec：
 *   - specs/features/f031-projects-tasks.md
 *   - specs/features/f032-projects-frontend.md
 *
 * testid 三邊同步：
 *   design/components/projects/* ←→ dev/frontend/lib/projects/testids.ts ←→ 本檔
 */

import type { Page, Route } from "@playwright/test";

// ---------------------------------------------------------------------------
// data-testid 常數（與 engineer 對齊，見 F-032 spec）
// ---------------------------------------------------------------------------

export const PROJECTS_TESTIDS = {
  // ===== /projects 列表頁 =====
  listPage: "projects-list-page",
  listEmpty: "projects-list-empty",
  listEmptyCreateFirst: "projects-list-empty-create-first",
  listCreateButton: "projects-list-create-button",
  listStatusTabs: "projects-list-status-tabs",
  /** 動態：`projects-list-status-tab-active` / `paused` / `done` / `archived` */
  listStatusTab: (status: string) => `projects-list-status-tab-${status}`,
  listGrid: "projects-list-grid",
  listCard: "projects-list-card",
  /** 動態：`projects-list-card-{projectId}` */
  listCardById: (id: string) => `projects-list-card-${id}`,
  listCardName: "projects-list-card-name",
  listCardColor: "projects-list-card-color",
  listCardProgressBar: "projects-list-card-progress-bar",
  listCardStatusBadge: "projects-list-card-status-badge",
  listCardOpenTaskCount: "projects-list-card-open-task-count",
  listCardNextDue: "projects-list-card-next-due",

  // ===== Project Dialog（建立 / 編輯）=====
  dialog: "project-dialog",
  dialogNameInput: "project-dialog-name-input",
  dialogNameError: "project-dialog-name-error",
  dialogDescriptionInput: "project-dialog-description-input",
  dialogColorInput: "project-dialog-color-input",
  dialogStartDateInput: "project-dialog-start-date-input",
  dialogEndDateInput: "project-dialog-end-date-input",
  dialogSubmitButton: "project-dialog-submit-button",
  dialogCancelButton: "project-dialog-cancel-button",

  // ===== /projects/:id 詳情頁（Tabs 容器）=====
  detailPage: "project-detail-page",
  detailHeader: "project-detail-header",
  detailHeaderName: "project-detail-header-name",
  detailHeaderStatusBadge: "project-detail-header-status-badge",
  detailEditButton: "project-detail-edit-button",
  detailDeleteButton: "project-detail-delete-button",
  detailArchiveButton: "project-detail-archive-button",
  detailTabs: "project-detail-tabs",
  detailTabBoard: "project-detail-tab-board",
  detailTabList: "project-detail-tab-list",
  detailTabOverview: "project-detail-tab-overview",

  // ===== Overview Tab =====
  overviewPanel: "project-overview-panel",
  overviewDescription: "project-overview-description",
  overviewProgressBar: "project-overview-progress-bar",
  overviewProgressText: "project-overview-progress-text",
  overviewStartDate: "project-overview-start-date",
  overviewEndDate: "project-overview-end-date",
  overviewRecentUpdates: "project-overview-recent-updates",

  // ===== 刪除確認對話框 =====
  deleteDialog: "project-delete-dialog",
  deleteDialogConfirmHasTasks: "project-delete-dialog-confirm-has-tasks",
  deleteDialogConfirmButton: "project-delete-dialog-confirm-button",
  deleteDialogCancelButton: "project-delete-dialog-cancel-button",
  deleteDialogForceButton: "project-delete-dialog-force-button",

  // ===== Toast =====
  toastCreated: "project-toast-created",
  toastUpdated: "project-toast-updated",
  toastDeleted: "project-toast-deleted",
  toastError: "project-toast-error",
} as const;

// ---------------------------------------------------------------------------
// Mock data shapes
// ---------------------------------------------------------------------------

export type ProjectStatus = "active" | "paused" | "done" | "archived";

export interface MockProject {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  status: ProjectStatus;
  start_date?: string | null;
  end_date?: string | null;
  progress: number;
  task_counts?: {
    total: number;
    by_status: Partial<Record<string, number>>;
  };
  created_at?: string;
  updated_at?: string;
}

export interface InstallProjectsMockOpts {
  /** 既有 projects（依 id 索引） */
  projects?: Record<string, MockProject>;
  /** 列表回傳（若未提供則以 projects 值序列化） */
  list?: MockProject[];
  /** POST /projects 建立衝突 */
  createConflict?: boolean;
  /** POST /projects 驗證錯誤（end_date < start_date） */
  createInvalidInput?: boolean;
  /** DELETE /projects/:id 受 task 阻擋（除非 ?force=true） */
  deleteHasTasks?: boolean;
  /** 紀錄 request */
  recorder?: {
    requests: Array<{ url: string; method: string; body?: unknown }>;
  };
}

/**
 * 安裝 `/api/v1/projects*` 的 mock。
 * Wave 3 解 skip 時直接呼叫，目前 skeleton 不會執行。
 */
export async function installProjectsMock(
  page: Page,
  opts: InstallProjectsMockOpts = {},
): Promise<void> {
  const projects = opts.projects ?? {};

  await page.route("**/api/v1/projects**", async (route: Route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    if (opts.recorder) {
      let body: unknown = undefined;
      try {
        body = req.postDataJSON();
      } catch {
        // 非 JSON
      }
      opts.recorder.requests.push({ url, method, body });
    }

    // POST /projects/:id/archive
    const archiveMatch = url.match(/\/projects\/([^/?#]+)\/archive/);
    if (method === "POST" && archiveMatch) {
      const id = archiveMatch[1];
      const existing = projects[id] ?? makeMockProject({ id });
      const archived: MockProject = { ...existing, status: "archived" };
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(archived),
      });
      return;
    }

    // GET / PATCH / DELETE /projects/:id
    const idMatch = url.match(/\/projects\/([^/?#]+)(?:[?#]|$)/);
    if (idMatch) {
      const id = idMatch[1];
      if (method === "GET") {
        const p = projects[id];
        if (!p) {
          await route.fulfill({
            status: 404,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code: "NOT_FOUND" }),
          });
        } else {
          await route.fulfill({
            status: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(p),
          });
        }
        return;
      }
      if (method === "PATCH") {
        const existing = projects[id] ?? makeMockProject({ id });
        let patch: Record<string, unknown> = {};
        try {
          patch = req.postDataJSON() as Record<string, unknown>;
        } catch {
          patch = {};
        }
        const merged: MockProject = { ...existing, ...patch, id };
        await route.fulfill({
          status: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(merged),
        });
        return;
      }
      if (method === "DELETE") {
        const force = /[?&]force=true/.test(url);
        if (opts.deleteHasTasks && !force) {
          await route.fulfill({
            status: 409,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code: "PROJECT_HAS_TASKS" }),
          });
          return;
        }
        await route.fulfill({ status: 204, body: "" });
        return;
      }
    }

    // POST /projects （建立）
    if (method === "POST" && /\/projects(\?|$)/.test(url)) {
      if (opts.createConflict) {
        await route.fulfill({
          status: 409,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: "PROJECT_NAME_DUPLICATE" }),
        });
        return;
      }
      if (opts.createInvalidInput) {
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
      const created = makeMockProject({
        id: (payload.id as string) ?? `proj-${Date.now()}`,
        name: (payload.name as string) ?? "untitled",
        description: payload.description as string | undefined,
        color: (payload.color as string) ?? "#3b82f6",
        start_date: payload.start_date as string | undefined,
        end_date: payload.end_date as string | undefined,
        status: "active",
        progress: 0,
      });
      await route.fulfill({
        status: 201,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(created),
      });
      return;
    }

    // GET /projects （列表）
    if (method === "GET" && /\/projects(\?|$)/.test(url)) {
      const list = opts.list ?? Object.values(projects);
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          data: list,
          pagination: { page: 1, per_page: 20, total: list.length },
        }),
      });
      return;
    }

    await route.continue();
  });
}

/** 方便建立 mock project 物件 */
export function makeMockProject(opts: Partial<MockProject> = {}): MockProject {
  const id = opts.id ?? `proj-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    name: opts.name ?? `Project ${id.slice(0, 6)}`,
    description: opts.description ?? null,
    color: opts.color ?? "#3b82f6",
    status: opts.status ?? "active",
    start_date: opts.start_date ?? null,
    end_date: opts.end_date ?? null,
    progress: opts.progress ?? 0,
    task_counts: opts.task_counts ?? { total: 0, by_status: {} },
    created_at: opts.created_at ?? "2026-04-24T00:00:00Z",
    updated_at: opts.updated_at ?? "2026-04-24T00:00:00Z",
  };
}
