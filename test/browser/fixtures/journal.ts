/**
 * Journal 測試共用 fixtures 與 testid 常數（Sprint 9, F-028 / F-029）
 *
 * Wave 0 skeleton：
 *   - 集中所有 data-testid，engineer 實作 UI 時請沿用，避免 spec 散落字串。
 *   - Wave 4 解 skip 時直接以下面 helpers 建立 mock。
 *
 * 對應 issue：#106
 * 對應 spec：
 *   - specs/features/f028-daily-journal.md
 *   - specs/features/f029-journal-frontend.md
 */

import type { Page, Route } from "@playwright/test";

// ---------------------------------------------------------------------------
// data-testid 常數（與 engineer 對齊，見 F-029 spec）
// ---------------------------------------------------------------------------

export const JOURNAL_TESTIDS = {
  // 列表頁 /journal
  listPage: "journal-list-page",
  listEmpty: "journal-list-empty",
  listEmptyWriteFirst: "journal-list-empty-write-first",
  listMoodFilter: "journal-list-mood-filter",
  /** 動態：`journal-list-mood-option-great` */
  listMoodOption: (mood: string) => `journal-list-mood-option-${mood}`,
  listItem: "journal-list-item",
  /** 動態：`journal-list-item-2026-04-24` */
  listItemByDate: (date: string) => `journal-list-item-${date}`,
  listItemDraftBadge: "journal-list-item-draft-badge",
  listItemMoodEmoji: "journal-list-item-mood-emoji",
  listItemPreview: "journal-list-item-preview",

  // Heatmap（年度/月度日記覆蓋熱力圖）
  heatmap: "journal-heatmap",
  /** 動態：`journal-heatmap-cell-2026-04-24` */
  heatmapCell: (date: string) => `journal-heatmap-cell-${date}`,
  heatmapLegend: "journal-heatmap-legend",

  // 編輯頁 /journal/:date
  editorPage: "journal-editor-page",
  editorTitle: "journal-editor-title",
  editorContent: "journal-editor-content",
  editorPreviewTab: "journal-editor-preview-tab",
  editorWriteTab: "journal-editor-write-tab",
  editorSaveButton: "journal-editor-save-button",
  editorDeleteButton: "journal-editor-delete-button",
  editorEmptyState: "journal-editor-empty-state",

  // Mood Picker
  moodPicker: "journal-mood-picker",
  /** 動態：`journal-mood-option-great` */
  moodOption: (mood: string) => `journal-mood-option-${mood}`,

  // LLM Draft 流程
  llmDraftButton: "journal-llm-draft-button",
  llmDraftLoading: "journal-llm-draft-loading",
  draftBanner: "journal-draft-banner",
  draftBannerConfirmButton: "journal-draft-banner-confirm-button",
  draftBannerRegenerateButton: "journal-draft-banner-regenerate-button",

  // Source Refs Panel
  sourceRefsPanel: "journal-source-refs-panel",
  sourceRefEntry: "journal-source-ref-entry",
  sourceRefEvent: "journal-source-ref-event",

  // Toast / Dialog
  toastSaved: "journal-toast-saved",
  toastLlmUnavailable: "journal-toast-llm-unavailable",
  dialogConflict: "journal-dialog-conflict",
  dialogConflictReload: "journal-dialog-conflict-reload",
} as const;

// ---------------------------------------------------------------------------
// Mock data shapes
// ---------------------------------------------------------------------------

export type JournalMood = "great" | "ok" | "down";

export interface MockSourceRef {
  source_type: "entry" | "gcal_event";
  source_id: string;
}

export interface MockJournal {
  id: string;
  date: string;
  title?: string | null;
  content: string;
  mood?: JournalMood | null;
  highlights?: string[];
  is_draft: boolean;
  generated_by?: "user" | "llm" | null;
  source_refs?: MockSourceRef[];
  created_at?: string;
  updated_at?: string;
}

export interface InstallJournalMockOpts {
  /** 既有 journals（依 date 索引） */
  journals?: Record<string, MockJournal>;
  /** list 回傳（若未提供則以 journals 值序列化） */
  list?: MockJournal[];
  /** POST /journal/:date/draft 的回應 */
  draft?:
    | { status: 201; body: MockJournal }
    | { status: 409; body: { code: "JOURNAL_EXISTS" } }
    | { status: 503; body: { code: "LLM_UNAVAILABLE"; message?: string } };
  /** POST /journal 的衝突情境 */
  createConflict?: boolean;
  /** 紀錄被呼叫的 request */
  recorder?: {
    requests: Array<{ url: string; method: string; body?: unknown }>;
  };
}

/**
 * 安裝 `/api/v1/journal*` 的 mock。
 * Wave 4 解 skip 時直接呼叫，目前 skeleton 不會執行。
 */
export async function installJournalMock(
  page: Page,
  opts: InstallJournalMockOpts = {},
): Promise<void> {
  const journals = opts.journals ?? {};

  await page.route("**/api/v1/journal**", async (route: Route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    if (opts.recorder) {
      let body: unknown = undefined;
      try {
        body = req.postDataJSON();
      } catch {
        // 非 JSON body
      }
      opts.recorder.requests.push({ url, method, body });
    }

    // POST /journal/:date/draft
    const draftMatch = url.match(/\/journal\/(\d{4}-\d{2}-\d{2})\/draft/);
    if (method === "POST" && draftMatch) {
      const d = opts.draft ?? {
        status: 201,
        body: makeMockJournal(draftMatch[1], {
          is_draft: true,
          generated_by: "llm",
          content: "AI 產出的初稿（mock）",
        }),
      };
      await route.fulfill({
        status: d.status,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(d.body),
      });
      return;
    }

    // GET /journal/:date  or  PATCH/DELETE
    const dateMatch = url.match(/\/journal\/(\d{4}-\d{2}-\d{2})(?:[?#]|$)/);
    if (dateMatch) {
      const date = dateMatch[1];
      if (method === "GET") {
        const j = journals[date];
        if (!j) {
          await route.fulfill({
            status: 404,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code: "JOURNAL_NOT_FOUND" }),
          });
        } else {
          await route.fulfill({
            status: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(j),
          });
        }
        return;
      }
      if (method === "PATCH") {
        const existing = journals[date] ?? makeMockJournal(date, {});
        let patch: Record<string, unknown> = {};
        try {
          patch = req.postDataJSON() as Record<string, unknown>;
        } catch {
          patch = {};
        }
        const merged: MockJournal = { ...existing, ...patch, date };
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

    // POST /journal
    if (method === "POST" && /\/journal(\?|$)/.test(url)) {
      if (opts.createConflict) {
        await route.fulfill({
          status: 409,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: "JOURNAL_EXISTS" }),
        });
        return;
      }
      let payload: Record<string, unknown> = {};
      try {
        payload = req.postDataJSON() as Record<string, unknown>;
      } catch {
        payload = {};
      }
      const date = (payload.date as string) ?? "1970-01-01";
      const created = makeMockJournal(date, {
        ...payload,
        is_draft: false,
        generated_by: "user",
      } as Partial<MockJournal>);
      await route.fulfill({
        status: 201,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(created),
      });
      return;
    }

    // GET /journal （列表）
    if (method === "GET" && /\/journal(\?|$)/.test(url)) {
      const list = opts.list ?? Object.values(journals);
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

/** 方便建立 mock journal 物件 */
export function makeMockJournal(
  date: string,
  opts: Partial<MockJournal> = {},
): MockJournal {
  return {
    id: opts.id ?? `journal-${date}`,
    date,
    title: opts.title ?? null,
    content: opts.content ?? "",
    mood: opts.mood ?? null,
    highlights: opts.highlights ?? [],
    is_draft: opts.is_draft ?? false,
    generated_by: opts.generated_by ?? null,
    source_refs: opts.source_refs ?? [],
    created_at: opts.created_at ?? `${date}T00:00:00Z`,
    updated_at: opts.updated_at ?? `${date}T00:00:00Z`,
  };
}
