# TASK_TESTIDS

> Sprint 10 Task 相關元件 `data-testid` 命名表（List 視圖、Sheet、RefsPicker、Upcoming widget）。

```ts
export const TASK_TESTIDS = {
  // List view (project detail List tab)
  listTable: "task-list-table",
  listEmpty: "task-list-empty",
  listSkeleton: "task-list-skeleton",
  listRow: "task-list-row",                       // suffix -{taskId}
  listRowCheckbox: "task-list-row-checkbox",      // suffix -{taskId}
  listRowTitle: "task-list-row-title",            // suffix -{taskId}
  listRowStatus: "task-list-row-status",          // suffix -{taskId}
  listRowPriority: "task-list-row-priority",      // suffix -{taskId}
  listRowDue: "task-list-row-due",                // suffix -{taskId}
  listRowRefs: "task-list-row-refs",              // suffix -{taskId}
  listRowMenu: "task-list-row-menu",              // suffix -{taskId}

  // Task Sheet (right-side drawer)
  sheet: "task-sheet",
  sheetTitle: "task-sheet-title",
  sheetClose: "task-sheet-close",
  sheetTitleInput: "task-sheet-title-input",
  sheetDescriptionInput: "task-sheet-description-input",
  sheetStatusSelect: "task-sheet-status-select",
  sheetStatusOption: "task-sheet-status-option",  // suffix -{status}
  sheetPrioritySelect: "task-sheet-priority-select",
  sheetPriorityOption: "task-sheet-priority-option", // suffix -{priority}
  sheetDuePicker: "task-sheet-due-picker",
  sheetDueClear: "task-sheet-due-clear",
  sheetRefsSection: "task-sheet-refs-section",
  sheetRefsAddButton: "task-sheet-refs-add",      // 開啟 RefsPicker
  sheetRefItem: "task-sheet-ref-item",            // suffix -{refType}-{refId}
  sheetRefRemove: "task-sheet-ref-remove",        // suffix -{refType}-{refId}
  sheetCompleteButton: "task-sheet-complete",
  sheetDeleteButton: "task-sheet-delete",
  sheetSavingIndicator: "task-sheet-saving",
  sheetErrorBanner: "task-sheet-error",

  // Refs Picker (Dialog/Popover)
  refsPicker: "refs-picker",
  refsPickerTabs: "refs-picker-tabs",
  refsPickerTab: "refs-picker-tab",               // suffix -{refType} entry|journal|gcal_event
  refsPickerSearchInput: "refs-picker-search",
  refsPickerLoading: "refs-picker-loading",
  refsPickerEmpty: "refs-picker-empty",
  refsPickerResultList: "refs-picker-result-list",
  refsPickerResultItem: "refs-picker-result-item",     // suffix -{refType}-{refId}
  refsPickerSelectedChips: "refs-picker-selected-chips",
  refsPickerSelectedChip: "refs-picker-selected-chip", // suffix -{refType}-{refId}
  refsPickerChipRemove: "refs-picker-chip-remove",     // suffix -{refType}-{refId}
  refsPickerConfirm: "refs-picker-confirm",
  refsPickerCancel: "refs-picker-cancel",
  refsPickerDeletedBadge: "refs-picker-deleted-badge", // 顯示「已刪除」狀態

  // Upcoming Tasks Widget (sidebar)
  upcomingWidget: "upcoming-tasks-widget",
  upcomingWidgetTitle: "upcoming-tasks-widget-title",
  upcomingWidgetEmpty: "upcoming-tasks-widget-empty",
  upcomingWidgetLoading: "upcoming-tasks-widget-loading",
  upcomingWidgetItem: "upcoming-tasks-widget-item",   // suffix -{taskId}
  upcomingWidgetItemDue: "upcoming-tasks-widget-item-due", // suffix -{taskId}
  upcomingWidgetSeeAll: "upcoming-tasks-widget-see-all",
  upcomingWidgetOverdueBadge: "upcoming-tasks-widget-overdue-badge", // suffix -{taskId}
} as const;
```

## 命名規則

- prefix：列表用 `task-list-`、Sheet 用 `task-sheet-`、RefsPicker 用 `refs-picker-`、Widget 用 `upcoming-tasks-widget-`
- 動態 suffix：`taskId` / `refType-refId` / `status` / `priority`
- ref 複合 key：`{refType}-{refId}`，refType 為 `entry` | `journal` | `gcal_event`
