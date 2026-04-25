/**
 * Projects 頁面 / 元件統一 data-testid 命名表。
 *
 * 必須與 `design/components/projects/testids.md` 與
 * `test/browser/fixtures/projects.ts` 保持完全一致。
 */
export const PROJECTS_TESTIDS = {
  // List page
  listPage: "projects-list-page",
  listGrid: "projects-list-grid",
  listEmpty: "projects-list-empty",
  listEmptyCta: "projects-list-empty-cta",
  listSkeleton: "projects-list-skeleton",
  listError: "projects-list-error",
  listCreateButton: "projects-list-create",

  // Status tabs
  statusTabs: "projects-status-tabs",
  statusTab: (status: string) => `projects-status-tab-${status}`,
  statusTabActive: "projects-status-tab-active",
  statusTabPaused: "projects-status-tab-paused",
  statusTabDone: "projects-status-tab-done",
  statusTabArchived: "projects-status-tab-archived",

  // Project Card
  card: "project-card", // suffix -{projectId}
  cardById: (id: string) => `project-card-${id}`,
  cardColorStripe: "project-card-color-stripe",
  cardName: "project-card-name",
  cardDescription: "project-card-description",
  cardProgressBar: "project-card-progress-bar",
  cardProgressLabel: "project-card-progress-label",
  cardStatusBadge: "project-card-status-badge",
  cardOpenTaskCount: "project-card-open-task-count",
  cardNextDue: "project-card-next-due",
  cardMenuTrigger: "project-card-menu",
  cardMenuEdit: "project-card-menu-edit",
  cardMenuArchive: "project-card-menu-archive",
  cardMenuDelete: "project-card-menu-delete",

  // Project Dialog (Create / Edit)
  dialog: "project-dialog",
  dialogTitle: "project-dialog-title",
  dialogNameInput: "project-dialog-name",
  dialogNameError: "project-dialog-name-error",
  dialogDescriptionInput: "project-dialog-description",
  dialogColorPicker: "project-dialog-color-picker",
  dialogColorSwatch: (key: string) => `project-dialog-color-swatch-${key}`,
  dialogStartDate: "project-dialog-start-date",
  dialogEndDate: "project-dialog-end-date",
  dialogDateError: "project-dialog-date-error",
  dialogStatusSelect: "project-dialog-status-select",
  dialogSubmit: "project-dialog-submit",
  dialogCancel: "project-dialog-cancel",
  dialogError: "project-dialog-error",

  // Delete Confirm Dialog
  deleteDialog: "project-delete-dialog",
  deleteDialogTitle: "project-delete-dialog-title",
  deleteDialogTaskWarning: "project-delete-dialog-task-warning",
  deleteDialogTaskCount: "project-delete-dialog-task-count",
  deleteDialogForceCheckbox: "project-delete-dialog-force-checkbox",
  deleteDialogConfirm: "project-delete-dialog-confirm",
  deleteDialogCancel: "project-delete-dialog-cancel",
  deleteDialogError: "project-delete-dialog-error",

  // Toasts
  toastCreated: "projects-toast-created",
  toastUpdated: "projects-toast-updated",
  toastDeleted: "projects-toast-deleted",
  toastArchived: "projects-toast-archived",
  toastDragFailed: "project-toast-drag-failed",
  toastTaskCompleted: "project-toast-task-completed",

  // Detail page (F-032b)
  detailPage: "project-detail-page",
  detailHeader: "project-detail-header",
  detailHeaderName: "project-detail-header-name",
  detailHeaderEdit: "project-detail-header-edit",
  detailNewTask: "project-detail-new-task",
  detailLoading: "project-detail-loading",
  detailError: "project-detail-error",
  detailNotFound: "project-detail-not-found",
  detailTabs: "project-detail-tabs",
  detailTabBoard: "project-detail-tab-board",
  detailTabList: "project-detail-tab-list",
  detailTabOverview: "project-detail-tab-overview",
  detailContentBoard: "project-detail-content-board",
  detailContentList: "project-detail-content-list",
  detailContentOverview: "project-detail-content-overview",

  // Overview tab
  overviewProgress: "project-overview-progress",
  overviewProgressBar: "project-overview-progress-bar",
  overviewStats: "project-overview-stats",
  overviewStatTotal: "project-overview-stat-total",
  overviewStatDone: "project-overview-stat-done",
  overviewStatBlocked: "project-overview-stat-blocked",
  overviewStatOverdue: "project-overview-stat-overdue",
  overviewTimeline: "project-overview-timeline",
  overviewDates: "project-overview-dates",
  overviewDescription: "project-overview-description",
  overviewActivity: "project-overview-activity",
  overviewActivityItem: "project-overview-activity-item",

  // Task list tab
  taskListSearch: "task-list-search",
  taskListFilterStatus: "task-list-filter-status",
  taskListFilterPriority: "task-list-filter-priority",
  taskListTable: "project-task-list-table",
  taskListEmpty: "project-task-list-empty",
  taskListRow: (id: string) => `task-list-row-${id}`,
  taskListRowCheck: (id: string) => `task-list-row-${id}-check`,

  // Task Sheet (F-032c)
  taskSheet: "task-sheet",
  taskSheetTitle: "task-sheet-title",
  taskSheetDescription: "task-sheet-description",
  taskSheetStatus: "task-sheet-status",
  taskSheetPriority: "task-sheet-priority",
  taskSheetDueDate: "task-sheet-due-date",
  taskSheetRefs: "task-sheet-refs",
  taskSheetSave: "task-sheet-save",
  taskSheetComplete: "task-sheet-complete",
  taskSheetDelete: "task-sheet-delete",
  taskSheetClose: "task-sheet-close",

  // Refs Picker
  refsPicker: "refs-picker",
  refsPickerTab: (kind: string) => `refs-picker-tab-${kind}`,
  refsPickerSearch: "refs-picker-search",
  refsPickerResultItem: (id: string) => `refs-picker-result-${id}`,
  refsPickerChip: (id: string) => `refs-picker-chip-${id}`,
  refsPickerChipRemove: (id: string) => `refs-picker-chip-${id}-remove`,
  refsPickerEmpty: "refs-picker-empty",
  refsPickerSourceDeleted: "refs-picker-source-deleted",

  // Upcoming Tasks Widget
  upcomingWidget: "upcoming-tasks-widget",
  upcomingWidgetEmpty: "upcoming-tasks-widget-empty",
  upcomingWidgetItem: (id: string) => `upcoming-tasks-widget-item-${id}`,
} as const;

/** Project color palette（與 design/tokens/projects.json `project-color-palette` 對齊） */
export const PROJECT_COLOR_PALETTE: Record<string, string> = {
  blue: "#3b82f6",
  violet: "#8b5cf6",
  pink: "#ec4899",
  rose: "#f43f5e",
  orange: "#f97316",
  amber: "#f59e0b",
  lime: "#84cc16",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  slate: "#64748b",
  zinc: "#71717a",
};

export const DEFAULT_PROJECT_COLOR = PROJECT_COLOR_PALETTE.blue;

export type ProjectStatus = "active" | "paused" | "done" | "archived";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "進行中",
  paused: "暫停",
  done: "已完成",
  archived: "封存",
};

export const PROJECT_STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  active:
    "border-green-300 bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-200",
  paused:
    "border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  done: "border-blue-300 bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  archived:
    "border-zinc-300 bg-zinc-100 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300",
};
