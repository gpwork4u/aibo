/**
 * 行事曆測試共用 fixtures 與 helpers（Sprint 8, F-026 / F-027）
 *
 * Wave 3 實作策略：
 *   1. 以 `page.route` 攔截 `/api/v1/calendar*` response，避免依賴真實 Google Calendar OAuth。
 *   2. 讓 seed helpers 同時作用於「後端 DB（真實 entry）」與「mock 回傳（gcal events / degraded）」。
 *   3. Timezone 以 Playwright `test.use({ timezoneId })` 固定。
 *
 * 對應 issue：#85
 * 對應 spec：
 *   - specs/features/f026-calendar-view.md
 *   - specs/features/f027-calendar-frontend.md
 */

import type { Page, Route } from "@playwright/test";
import type { ApiClient } from "../helpers/api-client";

// ---------------------------------------------------------------------------
// 共用 data-testid 常數（與 engineer 對齊，見 F-027 spec）
// ---------------------------------------------------------------------------

/**
 * Calendar 頁面所有 data-testid 命名慣例統一集中於此。
 * Engineer 在實作 UI 時請沿用這些 testid，避免 spec 中散落字串。
 */
export const CALENDAR_TESTIDS = {
  // 頁面容器
  page: "calendar-page",

  // Toolbar
  toolbar: "calendar-toolbar",
  toolbarTitle: "calendar-toolbar-title", // 例：「2026 年 4 月」
  prevButton: "calendar-prev-button",
  nextButton: "calendar-next-button",
  todayButton: "calendar-today-button",
  viewTabs: "calendar-view-tabs",
  viewTabMonth: "calendar-view-tab-month",
  viewTabWeek: "calendar-view-tab-week",
  viewTabDay: "calendar-view-tab-day",

  // 月視圖
  monthView: "calendar-month-view",
  /** 動態：`calendar-day-cell-2026-04-24` */
  dayCell: (date: string) => `calendar-day-cell-${date}`,
  dayCellToday: "calendar-day-cell-today",
  entryBadge: "calendar-entry-badge",
  eventBadge: "calendar-event-badge",
  eventOverflowBadge: "calendar-event-overflow-badge", // 「+1」
  journalIcon: "calendar-journal-icon",

  // 週/日視圖
  weekView: "calendar-week-view",
  dayView: "calendar-day-view",

  // Day Detail Sheet
  sheet: "calendar-day-sheet",
  sheetClose: "calendar-day-sheet-close",
  sheetSectionEntries: "calendar-day-sheet-entries",
  sheetSectionEvents: "calendar-day-sheet-events",
  sheetSectionJournal: "calendar-day-sheet-journal",
  sheetWriteJournalButton: "calendar-day-sheet-write-journal",

  // Gcal event 卡片 + 轉 entry
  eventCard: "calendar-event-card",
  eventToEntryButton: "calendar-event-to-entry-button",
  eventLinkedEntryLink: "calendar-event-linked-entry-link",
  eventActionMenu: "calendar-event-action-menu",

  // Banner / Toast / Degraded 狀態
  gcalNotConnectedBanner: "calendar-gcal-not-connected-banner",
  gcalDegradedToast: "calendar-gcal-degraded-toast",
  gcalDegradedInlineWarning: "calendar-gcal-degraded-inline-warning",
} as const;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

export const DEFAULT_TEST_TIMEZONE = "Asia/Taipei";

/** 產生 YYYY-MM-DD 格式字串（依時區）。 */
export function toDateStr(d: Date, tz = DEFAULT_TEST_TIMEZONE): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

/** 以 Asia/Taipei 產生今天 YYYY-MM-DD。 */
export function todayTaipei(): string {
  return toDateStr(new Date(), DEFAULT_TEST_TIMEZONE);
}

/** 在指定日期上加 n 天（以 tz 為基準），回傳 YYYY-MM-DD。 */
export function shiftDay(ymd: string, delta: number, tz = DEFAULT_TEST_TIMEZONE): string {
  const [y, m, d] = ymd.split("-").map(Number);
  // 以 UTC 中午建 anchor，避免 DST 干擾
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + delta);
  return toDateStr(base, tz);
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

export interface SeedEntryAt {
  /** 日期（YYYY-MM-DD），以使用者 timezone 解釋 */
  date: string;
  /** 建立數量 */
  count: number;
  /** 自訂 title prefix */
  titlePrefix?: string;
}

/**
 * 於指定日期建立若干 entries。
 *
 * 目前後端的 createEntry 會用 server now() 當 created_at，無 admin flag 可覆寫。
 * Wave 3 的跨日 seed 改為：
 *   - 在 mock calendar response 時直接放進對應日的 entries
 *   - 若為真實呼叫（非 mock），我們只能以「今天」的日期驗證（本機 run 即 tz 日期）
 *
 * 回傳建立的 entries 讓 caller 可自行放進 mock payload。
 */
export async function seedEntriesOnDate(
  client: ApiClient,
  opts: SeedEntryAt,
): Promise<Array<{ id: string; title: string; date: string }>> {
  const prefix = opts.titlePrefix ?? `E2E ${opts.date}`;
  const out: Array<{ id: string; title: string; date: string }> = [];
  for (let i = 0; i < opts.count; i++) {
    const title = `${prefix} #${i + 1}`;
    const e = await client.createEntry({
      title,
      content: `Seed entry on ${opts.date} (test #${i + 1})`,
      tags: ["qa-08", "e2e", `date-${opts.date}`],
    });
    if (e && typeof e === "object" && "id" in e && typeof e.id === "string") {
      out.push({ id: e.id as string, title, date: opts.date });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mock helpers — 以 page.route 攔截 /api/v1/calendar*
// ---------------------------------------------------------------------------

export interface MockCalendarEvent {
  gcal_id: string;
  summary: string;
  start: string; // RFC3339
  end: string;
  all_day?: boolean;
  linked_entry_id?: string | null;
}

export interface MockCalendarEntry {
  id: string;
  title: string | null;
  summary?: string | null;
  source_type?: string | null;
  tags?: string[];
  created_at?: string;
}

export interface MockCalendarDay {
  date: string;
  entry_count: number;
  event_count: number;
  has_journal: boolean;
  entries: MockCalendarEntry[];
  events: MockCalendarEvent[];
  journal?: { id: string; mood?: string | null } | null;
}

export interface InstallCalendarMockOpts {
  /** days 陣列 */
  days?: MockCalendarDay[];
  /** `/calendar/days/:date` 的 response（若未提供則以 days 內容為準） */
  dayDetails?: Record<string, MockCalendarDay>;
  /** degraded 模式：回 200 + X-Degraded: gcal + events 清空 */
  degraded?: boolean;
  /** gcal 未連：回 424（或 200 + gcal_connected=false） */
  notConnected?: "424" | "flag" | false;
  /** POST /events/:gcal_id/to-entry 的回應 */
  convert?:
    | { status: 201; body: { id: string; source_ref: string } }
    | { status: 409; body: { code: "ALREADY_LINKED"; existing_entry_id: string } }
    | { status: 502; body: { code: "GCAL_UPSTREAM_ERROR"; message?: string } }
    | { status: 404; body: { code: "EVENT_NOT_FOUND" } }
    | { status: 424; body: { code: "GCAL_NOT_CONNECTED" } };
  /** 記錄被呼叫的 request（讓 test 可 assert query / header） */
  recorder?: {
    requests: Array<{ url: string; method: string; headers: Record<string, string> }>;
  };
}

/**
 * 安裝 `/api/v1/calendar*` 的 mock。所有 test 共用這支以確保一致性。
 *
 * 匹配規則：
 *   - GET /api/v1/calendar?...      → 彙整回應
 *   - GET /api/v1/calendar/days/:date → 單日回應
 *   - POST /api/v1/calendar/events/:gcal_id/to-entry → convert 回應
 */
export async function installCalendarMock(
  page: Page,
  opts: InstallCalendarMockOpts = {},
): Promise<void> {
  const days = opts.days ?? [];
  const dayDetails =
    opts.dayDetails ??
    Object.fromEntries(days.map((d) => [d.date, d] as const));

  await page.route("**/api/v1/calendar**", async (route: Route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    // Recorder
    if (opts.recorder) {
      opts.recorder.requests.push({
        url,
        method,
        headers: req.headers(),
      });
    }

    // POST /events/:gcal_id/to-entry
    if (method === "POST" && /\/calendar\/events\/[^/]+\/to-entry/.test(url)) {
      const c = opts.convert ?? {
        status: 201,
        body: { id: "mock-entry-converted", source_ref: "mock-gcal-id" },
      };
      await route.fulfill({
        status: c.status,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(c.body),
      });
      return;
    }

    // GET /calendar/days/:date
    const dayMatch = url.match(/\/calendar\/days\/(\d{4}-\d{2}-\d{2})/);
    if (method === "GET" && dayMatch) {
      const date = dayMatch[1];

      if (opts.notConnected === "424") {
        await route.fulfill({
          status: 424,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: "GCAL_NOT_CONNECTED" }),
        });
        return;
      }

      const detail =
        dayDetails[date] ??
        ({
          date,
          entry_count: 0,
          event_count: 0,
          has_journal: false,
          entries: [],
          events: [],
          journal: null,
        } satisfies MockCalendarDay);

      const responseBody = {
        date,
        entries: detail.entries,
        events: opts.degraded ? [] : detail.events,
        journal: detail.journal ?? null,
        gcal_connected: opts.notConnected !== "flag",
        degraded: opts.degraded ? true : false,
      };

      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "application/json",
          ...(opts.degraded ? { "x-degraded": "gcal" } : {}),
        },
        body: JSON.stringify(responseBody),
      });
      return;
    }

    // GET /calendar (彙整)
    if (method === "GET" && /\/calendar(\?|$)/.test(url)) {
      if (opts.notConnected === "424") {
        await route.fulfill({
          status: 424,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: "GCAL_NOT_CONNECTED" }),
        });
        return;
      }

      const since =
        new URL(url).searchParams.get("since") ??
        (days[0]?.date ?? "1970-01-01");
      const until =
        new URL(url).searchParams.get("until") ??
        (days[days.length - 1]?.date ?? "1970-01-01");

      const body = {
        since,
        until,
        days: opts.degraded
          ? days.map((d) => ({ ...d, events: [], event_count: 0 }))
          : days,
        gcal_connected: opts.notConnected !== "flag",
      };

      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "application/json",
          ...(opts.degraded ? { "x-degraded": "gcal" } : {}),
        },
        body: JSON.stringify(body),
      });
      return;
    }

    // 非預期的 path → 放行
    await route.continue();
  });
}

/** 方便建立 happy path mock day 物件 */
export function makeMockDay(
  date: string,
  opts: Partial<MockCalendarDay> = {},
): MockCalendarDay {
  return {
    date,
    entry_count: opts.entries?.length ?? 0,
    event_count: opts.events?.length ?? 0,
    has_journal: opts.has_journal ?? !!opts.journal,
    entries: opts.entries ?? [],
    events: opts.events ?? [],
    journal: opts.journal ?? null,
  };
}

/** 產生 N 天連續的空 day 物件，方便月 grid 基底 */
export function emptyMonthGrid(anchorYmd: string, daysCount = 42): MockCalendarDay[] {
  const out: MockCalendarDay[] = [];
  // 往前推幾天讓 anchor 落在週中（僅為資料夠用，實際 layout 由前端算）
  let cur = shiftDay(anchorYmd, -7);
  for (let i = 0; i < daysCount; i++) {
    out.push(makeMockDay(cur));
    cur = shiftDay(cur, 1);
  }
  return out;
}
