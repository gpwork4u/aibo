# PROJECTS_TESTIDS

> Sprint 10 Projects 元件統一 `data-testid` 命名表。所有 design / dev / qa 必須引用此命名。

```ts
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
  statusTab: "projects-status-tab",            // suffix -{status} e.g. projects-status-tab-active
  statusTabActive: "projects-status-tab-active",
  statusTabPaused: "projects-status-tab-paused",
  statusTabDone: "projects-status-tab-done",
  statusTabArchived: "projects-status-tab-archived",

  // Project Card
  card: "project-card",                         // suffix -{projectId}
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
  dialogColorSwatch: "project-dialog-color-swatch",     // suffix -{key} e.g. -blue
  dialogStartDate: "project-dialog-start-date",
  dialogEndDate: "project-dialog-end-date",
  dialogDateError: "project-dialog-date-error",
  dialogStatusSelect: "project-dialog-status-select",
  dialogSubmit: "project-dialog-submit",
  dialogCancel: "project-dialog-cancel",

  // Delete Confirm Dialog
  deleteDialog: "project-delete-dialog",
  deleteDialogTitle: "project-delete-dialog-title",
  deleteDialogTaskWarning: "project-delete-dialog-task-warning",
  deleteDialogTaskCount: "project-delete-dialog-task-count",
  deleteDialogForceCheckbox: "project-delete-dialog-force-checkbox",
  deleteDialogConfirm: "project-delete-dialog-confirm",
  deleteDialogCancel: "project-delete-dialog-cancel",
  deleteDialogError: "project-delete-dialog-error",

  // Refs Picker（TaskSheet 內）
  refsPicker: "projects-refs-picker",
  refsPickerTabs: "projects-refs-picker-tabs",
  refsPickerTab: "projects-refs-picker-tab",                  // suffix -{type}
  refsPickerSearch: "projects-refs-picker-search",
  refsPickerResults: "projects-refs-picker-results",
  refsPickerResultItem: "projects-refs-picker-result",        // suffix -{refId}
  refsPickerEmpty: "projects-refs-picker-empty",
  refsPickerSelected: "projects-refs-picker-selected",
  refsPickerSelectedEmpty: "projects-refs-picker-selected-empty",
  refsPickerChip: "projects-refs-picker-chip",                // suffix -{refId}
  refsPickerChipRemove: "projects-refs-picker-chip-remove",   // suffix -{refId}
  refsPickerChipMissing: "projects-refs-picker-chip-missing",

  // Sidebar Upcoming Tasks Widget
  upcomingWidget: "projects-upcoming-widget",
  upcomingWidgetCount: "projects-upcoming-count",
  upcomingWidgetRefresh: "projects-upcoming-refresh",
  upcomingWidgetSkeleton: "projects-upcoming-skeleton",
  upcomingWidgetError: "projects-upcoming-error",
  upcomingWidgetEmpty: "projects-upcoming-empty",
  upcomingWidgetCreateCta: "projects-upcoming-create-cta",
  upcomingWidgetItem: "projects-upcoming-item",                  // suffix -{taskId}
  upcomingWidgetItemTitle: "projects-upcoming-item-title",       // suffix -{taskId}
  upcomingWidgetItemDue: "projects-upcoming-item-due",           // suffix -{taskId}

  // Detail page (container)
  detailPage: "project-detail-page",
  detailHeader: "project-detail-header",
  detailHeaderName: "project-detail-header-name",
  detailHeaderEdit: "project-detail-header-edit",
  detailTabs: "project-detail-tabs",
  detailTabBoard: "project-detail-tab-board",
  detailTabList: "project-detail-tab-list",
  detailTabOverview: "project-detail-tab-overview",
  detailNewTaskButton: "project-detail-new-task",

  // Overview tab
  overviewProgress: "project-overview-progress",
  overviewProgressBar: "project-overview-progress-bar",
  overviewStats: "project-overview-stats",
  overviewStatTotal: "project-overview-stat-total",
  overviewStatDone: "project-overview-stat-done",
  overviewStatBlocked: "project-overview-stat-blocked",
  overviewStatOverdue: "project-overview-stat-overdue",
  overviewTimeline: "project-overview-timeline",
  overviewDescription: "project-overview-description",
  overviewActivity: "project-overview-activity",
  overviewActivityItem: "project-overview-activity-item",   // suffix -{idx}
} as const;
```

## 命名規則

- 所有 testid 以 `project-` 或 `projects-` 為 prefix（list 多筆用複數，單筆用單數）
- 動態 suffix：`{base}-{id}`，id 不含空白
- QA 範例：`page.getByTestId('project-card-${projectId}')`
