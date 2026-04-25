# KANBAN_TESTIDS

> Sprint 10 Kanban（@dnd-kit）元件 `data-testid` 命名表。

```ts
export const KANBAN_TESTIDS = {
  // Board container
  board: "kanban-board",
  boardScroll: "kanban-board-scroll",
  boardSkeleton: "kanban-board-skeleton",
  boardError: "kanban-board-error",
  boardLiveRegion: "kanban-board-live-region",       // a11y status announcement (aria-live=polite)

  // Mobile single-column switcher (< 768px)
  mobileStatusSwitcher: "kanban-mobile-status-switcher",
  mobileStatusOption: "kanban-mobile-status-option", // suffix -{status}

  // Column
  column: "kanban-column",                           // suffix -{status} e.g. kanban-column-todo
  columnHeader: "kanban-column-header",              // suffix -{status}
  columnLabel: "kanban-column-label",                // suffix -{status}
  columnCount: "kanban-column-count",                // suffix -{status}
  columnAddTask: "kanban-column-add-task",           // suffix -{status}
  columnEmpty: "kanban-column-empty",                // suffix -{status}
  columnDropZone: "kanban-column-drop-zone",         // suffix -{status}
  columnList: "kanban-column-list",                  // suffix -{status} (sortable list)

  // Card
  card: "kanban-card",                               // suffix -{taskId}
  cardDragHandle: "kanban-card-drag-handle",         // suffix -{taskId}
  cardTitle: "kanban-card-title",                    // suffix -{taskId}
  cardPriorityBadge: "kanban-card-priority",         // suffix -{taskId}
  cardStatusDot: "kanban-card-status-dot",           // suffix -{taskId}
  cardDueDate: "kanban-card-due-date",               // suffix -{taskId}
  cardRefsCount: "kanban-card-refs-count",           // suffix -{taskId}
  cardCompleteToggle: "kanban-card-complete-toggle", // suffix -{taskId}
  cardOpenSheet: "kanban-card-open-sheet",           // suffix -{taskId}（與整張卡可點擊區重疊；卡為 button 即可）

  // Drag overlay (DragOverlay portal)
  dragOverlay: "kanban-drag-overlay",
  dragOverlayCard: "kanban-drag-overlay-card",
} as const;
```

## 命名規則

- prefix 一律 `kanban-`
- column / card 動態 suffix：column 用 `status`、card 用 `taskId`
- DragOverlay 是 `@dnd-kit` 的 portal，獨立 testid 方便 QA 驗證拖移態
- 鍵盤拖移時的狀態播報區塊：`kanban-board-live-region`，內含繁中描述（如「任務「設計 schema」已從 待辦 移動到 進行中 第 2 個位置」）
