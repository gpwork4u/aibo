/**
 * Kanban 元件 data-testid 命名表（F-032b）。
 *
 * 必須與 `design/components/kanban/testids.md` 與
 * QA fixture 保持完全一致。
 */
export const KANBAN_TESTIDS = {
  // Board container
  board: "kanban-board",
  boardScroll: "kanban-board-scroll",
  boardSkeleton: "kanban-board-skeleton",
  boardError: "kanban-board-error",
  boardLiveRegion: "kanban-board-live-region",

  // Mobile single-column switcher (< 768px)
  mobileStatusSwitcher: "kanban-mobile-status-switcher",
  mobileStatusOption: "kanban-mobile-status-option",

  // Column
  column: "kanban-column",
  columnHeader: "kanban-column-header",
  columnLabel: "kanban-column-label",
  columnCount: "kanban-column-count",
  columnAddTask: "kanban-column-add-task",
  columnEmpty: "kanban-column-empty",
  columnDropZone: "kanban-column-drop-zone",
  columnList: "kanban-column-list",

  // Card
  card: "kanban-card",
  cardDragHandle: "kanban-card-drag-handle",
  cardTitle: "kanban-card-title",
  cardPriorityBadge: "kanban-card-priority",
  cardStatusDot: "kanban-card-status-dot",
  cardDueDate: "kanban-card-due-date",
  cardRefsCount: "kanban-card-refs-count",
  cardCompleteToggle: "kanban-card-complete-toggle",
  cardOpenSheet: "kanban-card-open-sheet",

  // Drag overlay
  dragOverlay: "kanban-drag-overlay",
  dragOverlayCard: "kanban-drag-overlay-card",
} as const;

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "done"
  | "cancelled";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export const KANBAN_STATUSES: ReadonlyArray<{
  status: Exclude<TaskStatus, "cancelled">;
  label: string;
}> = [
  { status: "todo", label: "待辦" },
  { status: "in_progress", label: "進行中" },
  { status: "blocked", label: "卡住" },
  { status: "done", label: "完成" },
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "待辦",
  in_progress: "進行中",
  blocked: "卡住",
  done: "完成",
  cancelled: "取消",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "低",
  normal: "一般",
  high: "高",
  urgent: "急迫",
};

export const TASK_STATUS_DOT_CLASS: Record<TaskStatus, string> = {
  todo: "bg-zinc-400",
  in_progress: "bg-blue-500",
  blocked: "bg-red-500",
  done: "bg-green-500",
  cancelled: "bg-zinc-300",
};

export const TASK_STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  todo:
    "border-zinc-300 bg-zinc-100 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300",
  in_progress:
    "border-blue-300 bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  blocked:
    "border-red-300 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  done: "border-green-300 bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-200",
  cancelled:
    "border-zinc-300 bg-zinc-100 text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400",
};

export const TASK_PRIORITY_BADGE_CLASS: Record<TaskPriority, string> = {
  low: "border-zinc-300 bg-zinc-100 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300",
  normal:
    "border-blue-300 bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  high: "border-orange-300 bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
  urgent:
    "border-red-300 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
};
