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

/**
 * 三邊對齊（F-033a）：
 *   - source of truth：`design/components/projects/testids.md`
 *   - frontend：`dev/frontend/lib/projects/testids.ts`
 *   - 本檔（test fixtures）
 *
 * 為避免大規模改 e2e specs，本物件部分 key 名沿用 fixture 既有命名
 * （例：`listEmptyCreateFirst`、`detailEditButton`），但 **value** 已對齊
 * design 命名表，使 frontend `data-testid={...}` 能被 fixture 正確選取。
 *
 * 新撰寫 spec 時請優先使用「正規」key（如 `listEmptyCta`、`detailHeaderEdit`），
 * deprecated alias 將於下一輪統一移除。
 */
export const PROJECTS_TESTIDS = {
  // ===== /projects 列表頁 =====
  listPage: "projects-list-page",
  listGrid: "projects-list-grid",
  listEmpty: "projects-list-empty",
  /** 正規 key */
  listEmptyCta: "projects-list-empty-cta",
  /** @deprecated 改用 `listEmptyCta`（value 已對齊 design） */
  listEmptyCreateFirst: "projects-list-empty-cta",
  /** value 對齊 design：`projects-list-create`（不再帶 `-button` 後綴） */
  listCreateButton: "projects-list-create",
  listSkeleton: "projects-list-skeleton",
  listError: "projects-list-error",

  // ===== Status Tabs =====
  /** 正規 key */
  statusTabs: "projects-status-tabs",
  /** @deprecated 改用 `statusTabs` */
  listStatusTabs: "projects-status-tabs",
  /** 正規 key（動態 suffix `-{status}`） */
  statusTab: (status: string) => `projects-status-tab-${status}`,
  /** @deprecated 改用 `statusTab` */
  listStatusTab: (status: string) => `projects-status-tab-${status}`,

  // ===== Project Card =====
  /** 正規 key */
  card: "project-card",
  /** @deprecated 改用 `card` */
  listCard: "project-card",
  cardById: (id: string) => `project-card-${id}`,
  /** @deprecated 改用 `cardById` */
  listCardById: (id: string) => `project-card-${id}`,
  cardName: "project-card-name",
  /** @deprecated 改用 `cardName` */
  listCardName: "project-card-name",
  cardColorStripe: "project-card-color-stripe",
  /** @deprecated 改用 `cardColorStripe` */
  listCardColor: "project-card-color-stripe",
  cardProgressBar: "project-card-progress-bar",
  /** @deprecated 改用 `cardProgressBar` */
  listCardProgressBar: "project-card-progress-bar",
  cardProgressLabel: "project-card-progress-label",
  cardStatusBadge: "project-card-status-badge",
  /** @deprecated 改用 `cardStatusBadge` */
  listCardStatusBadge: "project-card-status-badge",
  cardOpenTaskCount: "project-card-open-task-count",
  /** @deprecated 改用 `cardOpenTaskCount` */
  listCardOpenTaskCount: "project-card-open-task-count",
  cardNextDue: "project-card-next-due",
  /** @deprecated 改用 `cardNextDue` */
  listCardNextDue: "project-card-next-due",

  // ===== Project Dialog（建立 / 編輯）=====
  dialog: "project-dialog",
  dialogTitle: "project-dialog-title",
  /** value 對齊 design：`project-dialog-name`（不再帶 `-input` 後綴） */
  dialogNameInput: "project-dialog-name",
  dialogNameError: "project-dialog-name-error",
  /** value 對齊 design：`project-dialog-description` */
  dialogDescriptionInput: "project-dialog-description",
  dialogColorPicker: "project-dialog-color-picker",
  /** @deprecated 改用 `dialogColorPicker`（value 已對齊 design） */
  dialogColorInput: "project-dialog-color-picker",
  dialogColorSwatch: (key: string) => `project-dialog-color-swatch-${key}`,
  /** value 對齊 design：`project-dialog-start-date` */
  dialogStartDateInput: "project-dialog-start-date",
  dialogStartDate: "project-dialog-start-date",
  /** value 對齊 design：`project-dialog-end-date` */
  dialogEndDateInput: "project-dialog-end-date",
  dialogEndDate: "project-dialog-end-date",
  dialogDateError: "project-dialog-date-error",
  dialogStatusSelect: "project-dialog-status-select",
  /** value 對齊 design：`project-dialog-submit` */
  dialogSubmitButton: "project-dialog-submit",
  dialogSubmit: "project-dialog-submit",
  /** value 對齊 design：`project-dialog-cancel` */
  dialogCancelButton: "project-dialog-cancel",
  dialogCancel: "project-dialog-cancel",

  // ===== /projects/:id 詳情頁（Tabs 容器）=====
  detailPage: "project-detail-page",
  detailHeader: "project-detail-header",
  detailHeaderName: "project-detail-header-name",
  detailHeaderStatusBadge: "project-detail-header-status-badge",
  /** 正規 key */
  detailHeaderEdit: "project-detail-header-edit",
  /** @deprecated 改用 `detailHeaderEdit`（value 對齊 design） */
  detailEditButton: "project-detail-header-edit",
  /** 正規 key */
  detailHeaderArchive: "project-detail-header-archive",
  /** @deprecated 改用 `detailHeaderArchive` */
  detailArchiveButton: "project-detail-header-archive",
  /** 正規 key */
  detailHeaderDelete: "project-detail-header-delete",
  /** @deprecated 改用 `detailHeaderDelete` */
  detailDeleteButton: "project-detail-header-delete",
  detailNewTask: "project-detail-new-task",
  detailTabs: "project-detail-tabs",
  detailTabBoard: "project-detail-tab-board",
  detailTabList: "project-detail-tab-list",
  detailTabOverview: "project-detail-tab-overview",

  // ===== Overview Tab =====
  overviewPanel: "project-overview-panel",
  overviewProgress: "project-overview-progress",
  overviewProgressBar: "project-overview-progress-bar",
  overviewProgressText: "project-overview-progress-text",
  overviewDescription: "project-overview-description",
  overviewStartDate: "project-overview-start-date",
  overviewEndDate: "project-overview-end-date",
  overviewDates: "project-overview-dates",
  overviewActivity: "project-overview-activity",
  /** @deprecated 改用 `overviewActivity` */
  overviewRecentUpdates: "project-overview-activity",

  // ===== 刪除確認對話框 =====
  deleteDialog: "project-delete-dialog",
  deleteDialogTitle: "project-delete-dialog-title",
  deleteDialogTaskWarning: "project-delete-dialog-task-warning",
  deleteDialogTaskCount: "project-delete-dialog-task-count",
  /**
   * 顯示「N 筆任務」的警告區塊。
   * design 提供兩個別名：`...-confirm-has-tasks`（語意）與 `...-task-warning`（位置），
   * frontend 元件實際使用的是 `task-warning`，本欄回傳該值。
   */
  deleteDialogConfirmHasTasks: "project-delete-dialog-task-warning",
  deleteDialogForceCheckbox: "project-delete-dialog-force-checkbox",
  /**
   * 強制刪除送出按鈕。design 列出 `force-button` 別名，但實際元件以
   * 「force checkbox + confirm button」流程實作；本欄指向 `confirm`。
   */
  deleteDialogForceButton: "project-delete-dialog-confirm",
  /** value 對齊 design：`project-delete-dialog-confirm` */
  deleteDialogConfirmButton: "project-delete-dialog-confirm",
  deleteDialogConfirm: "project-delete-dialog-confirm",
  /** value 對齊 design：`project-delete-dialog-cancel` */
  deleteDialogCancelButton: "project-delete-dialog-cancel",
  deleteDialogCancel: "project-delete-dialog-cancel",

  // ===== Toast =====
  toastCreated: "projects-toast-created",
  toastUpdated: "projects-toast-updated",
  toastDeleted: "projects-toast-deleted",
  toastArchived: "projects-toast-archived",
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
