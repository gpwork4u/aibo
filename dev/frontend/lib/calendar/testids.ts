/**
 * Calendar 頁面 data-testid 常數。
 *
 * 內容必須與 `test/browser/fixtures/calendar.ts` 的 `CALENDAR_TESTIDS` 保持一致，
 * 以確保 Wave 3 e2e 測試能對齊。修改時請同步更新兩邊。
 */
export const CALENDAR_TESTIDS = {
  // 頁面容器
  page: "calendar-page",

  // Toolbar
  toolbar: "calendar-toolbar",
  toolbarTitle: "calendar-toolbar-title",
  prevButton: "calendar-prev-button",
  nextButton: "calendar-next-button",
  todayButton: "calendar-today-button",
  viewTabs: "calendar-view-tabs",
  viewTabMonth: "calendar-view-tab-month",
  viewTabWeek: "calendar-view-tab-week",
  viewTabDay: "calendar-view-tab-day",

  // 月視圖
  monthView: "calendar-month-view",
  dayCell: (date: string) => `calendar-day-cell-${date}`,
  dayCellToday: "calendar-day-cell-today",
  entryBadge: "calendar-entry-badge",
  eventBadge: "calendar-event-badge",
  eventOverflowBadge: "calendar-event-overflow-badge",
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
