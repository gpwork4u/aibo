/**
 * 行事曆測試共用 fixtures 與 helpers（Sprint 8, F-026 / F-027）
 *
 * 目前（Wave 0 skeleton 階段）僅提供 TODO 佔位實作；
 * Wave 3 補完時會：
 *   1. 呼叫真實 API 建立指定日期的 entries
 *   2. 透過 gcal mock server 設定指定日期的 events
 *   3. 提供 X-Timezone header 輔助
 *
 * 對應 issue：#85
 * 對應 spec：
 *   - specs/features/f026-calendar-view.md
 *   - specs/features/f027-calendar-frontend.md
 */

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
  eventCard: "calendar-event-card", // 動態加 gcal_id 亦可
  eventToEntryButton: "calendar-event-to-entry-button",
  eventLinkedEntryLink: "calendar-event-linked-entry-link", // 「查看 entry #N」
  eventActionMenu: "calendar-event-action-menu",

  // Banner / Toast / Degraded 狀態
  gcalNotConnectedBanner: "calendar-gcal-not-connected-banner",
  gcalDegradedToast: "calendar-gcal-degraded-toast",
  gcalDegradedInlineWarning: "calendar-gcal-degraded-inline-warning",
} as const;

// ---------------------------------------------------------------------------
// Seed helpers（TODO: Wave 3 實作）
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
 * Wave 3 實作要點：
 *   - 直接呼叫 `client.createEntry()`，但需覆寫 `created_at`（後端需支援 admin/test flag，或透過 DB fixture 插入）
 *   - 若後端不允許覆寫 created_at，改由 gofixture / 測試用路由插入
 *
 * 目前（Wave 0）為佔位 no-op。
 */
export async function seedEntriesOnDate(
  _client: ApiClient,
  _opts: SeedEntryAt
): Promise<Array<{ id: string }>> {
  // TODO(Wave 3): 實作跨日 seed；需與 engineer 確認是否提供 test-only endpoint
  return [];
}

export interface GcalEventSeed {
  gcal_id: string;
  summary: string;
  /** RFC3339，如 `2026-04-24T09:00:00+08:00` */
  start: string;
  end: string;
  all_day?: boolean;
  description?: string;
  location?: string;
}

/**
 * 設定 gcal mock server 下次回應的 events 清單。
 *
 * Wave 3 實作要點：
 *   - 沿用 Sprint 5 F-009 的 gcal mock server（見 `test/e2e/f009_gcal_import_test.go`）
 *   - 透過 mock server 的 admin endpoint（例：`POST http://gcal-mock/__set_events`）
 *     預設本次測試要回傳的事件
 *   - 也需能切換到「回 500」「回 404 specific event」等錯誤模式
 *
 * 目前（Wave 0）為佔位 no-op。
 */
export async function seedGcalEvents(_events: GcalEventSeed[]): Promise<void> {
  // TODO(Wave 3): 串接 gcal mock server admin API
}

/**
 * 將 gcal mock 切為「上游失敗 500」模式，觸發 X-Degraded: gcal。
 *
 * 目前（Wave 0）為佔位 no-op。
 */
export async function setGcalMockMode(
  _mode: "normal" | "degraded-500" | "not-connected" | "not-found"
): Promise<void> {
  // TODO(Wave 3): 串接 gcal mock server admin API
}

/**
 * 取得瀏覽器時區字串（例 `Asia/Taipei`）。
 *
 * 測試會以 Playwright `contextOptions.timezoneId` 固定時區，
 * 此 helper 方便 assertion 時組合日期。
 */
export const DEFAULT_TEST_TIMEZONE = "Asia/Taipei";

/**
 * 產生 YYYY-MM-DD 格式的日期字串（避免時區漂移）
 */
export function toDateStr(d: Date, tz = DEFAULT_TEST_TIMEZONE): string {
  // 使用 Intl.DateTimeFormat 確保依 tz 取得正確日期
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d); // en-CA 即 YYYY-MM-DD
}
