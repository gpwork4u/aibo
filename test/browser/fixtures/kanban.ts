/**
 * Kanban 測試共用 fixtures 與 testid 常數（Sprint 10, F-032b）
 *
 * Wave 0 skeleton：data-testid 集中管理。
 * 對應 issue：#127
 * 對應 spec：specs/features/f032-projects-frontend.md（Board / List tabs）
 */

export const KANBAN_TESTIDS = {
  // Board tab
  board: "kanban-board",
  boardLoading: "kanban-board-loading",
  boardEmpty: "kanban-board-empty",

  // 4 個欄位（todo / in_progress / blocked / done）
  /** 動態：`kanban-column-todo` */
  column: (status: string) => `kanban-column-${status}`,
  columnHeader: (status: string) => `kanban-column-header-${status}`,
  columnCount: (status: string) => `kanban-column-count-${status}`,
  columnAddTask: (status: string) => `kanban-column-add-task-${status}`,
  columnDropZone: (status: string) => `kanban-column-drop-zone-${status}`,

  // Task card（位於 Kanban column 內）
  taskCard: "kanban-task-card",
  /** 動態：`kanban-task-card-{taskId}` */
  taskCardById: (id: string) => `kanban-task-card-${id}`,
  taskCardTitle: "kanban-task-card-title",
  taskCardPriority: "kanban-task-card-priority",
  taskCardDueDate: "kanban-task-card-due-date",
  taskCardCompleteButton: "kanban-task-card-complete-button",
  taskCardRefsCount: "kanban-task-card-refs-count",
  taskCardDragHandle: "kanban-task-card-drag-handle",

  // List tab
  listTab: "project-list-tab",
  listTable: "project-list-tab-table",
  listRow: "project-list-tab-row",
  /** 動態：`project-list-tab-row-{taskId}` */
  listRowById: (id: string) => `project-list-tab-row-${id}`,
  listColTitle: "project-list-tab-col-title",
  listColStatus: "project-list-tab-col-status",
  listColPriority: "project-list-tab-col-priority",
  listColDue: "project-list-tab-col-due",
  listColRefs: "project-list-tab-col-refs",

  // Toast
  toastDragFailed: "kanban-toast-drag-failed",
  toastDragSuccess: "kanban-toast-drag-success",
} as const;

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "done"
  | "cancelled";

/** Kanban 4 欄（不含 cancelled） */
export const KANBAN_COLUMNS: TaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "done",
];
