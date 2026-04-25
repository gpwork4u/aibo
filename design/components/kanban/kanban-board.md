# KanbanBoard

`/projects/:id` Board tab 的核心元件。包裝 `@dnd-kit` 的 `DndContext`，管理跨欄 / 欄內拖移與樂觀更新。

---

## 用途

讀取 `/api/v1/projects/:id/tasks`，依 status 分組，render 4 個 `KanbanColumn`，並在拖放結束時呼叫 `PATCH /api/v1/tasks/:id` 更新 status + position。

---

## 結構

```
┌──────────────────────────────────────────────────────────────────────┐
│ ┌──── todo ─────┐ ┌── in_progress ──┐ ┌── blocked ──┐ ┌── done ────┐ │
│ │ 待辦  3        │ │ 進行中  2         │ │ 卡住  1     │ │ 完成  12   │ │
│ │ + 加入任務     │ │ + 加入任務        │ │ + 加入任務   │ │ + 加入任務 │ │
│ │ ┌────────────┐│ │ ┌──────────────┐  │ │ ┌─────────┐ │ │ ┌─────────┐│ │
│ │ │ Card A     ││ │ │ Card C       │  │ │ │ Card E  │ │ │ │ Card G  ││ │
│ │ ├────────────┤│ │ ├──────────────┤  │ │ └─────────┘ │ │ ├─────────┤│ │
│ │ │ Card B     ││ │ │ Card D       │  │ │             │ │ │ ...     ││ │
│ │ └────────────┘│ │ └──────────────┘  │ │             │ │ └─────────┘│ │
│ └────────────────┘ └─────────────────┘ └──────────────┘ └────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

`< 768px` 改為單欄垂直 + status switcher（見 README）。

---

## Props

```ts
type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

interface KanbanBoardProps {
  projectId: string;
  tasks: TaskCardData[];                    // 已含所有 status 的 tasks
  isLoading?: boolean;
  isError?: boolean;
  onMoveTask: (input: {
    taskId: string;
    fromStatus: TaskStatus;
    toStatus: TaskStatus;
    toIndex: number;                         // 0-based 在目標欄的位置
  }) => Promise<void>;                       // 失敗會 throw → board rollback
  onAddTask: (status: TaskStatus) => void;   // 開 TaskSheet (mode=create, defaultStatus)
  onOpenTask: (taskId: string) => void;      // 點擊卡片 → 開 TaskSheet (mode=edit)
  onCompleteTask: (taskId: string) => void;  // 點 checkbox
}
```

`KanbanCard` cancelled tasks 不顯示在 Board（只在 List tab 顯示）。

---

## DndContext 設定

```tsx
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KANBAN_TESTIDS } from "@/lib/testids/kanban";

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "待辦" },
  { status: "in_progress", label: "進行中" },
  { status: "blocked", label: "卡住" },
  { status: "done", label: "完成" },
];

const announcements = {
  onDragStart: ({ active }: { active: { id: string } }) => {
    const t = tasksById[active.id];
    return t ? `已抓起任務「${t.title}」` : "已抓起任務";
  },
  onDragOver: ({ active, over }: any) => {
    if (!over) return;
    const t = tasksById[active.id];
    const targetCol = COLUMNS.find((c) => c.status === over.data.current?.columnStatus);
    if (t && targetCol) return `任務「${t.title}」位於 ${targetCol.label} 欄`;
  },
  onDragEnd: ({ active, over }: any) => {
    if (!over) return "已取消拖移";
    const t = tasksById[active.id];
    const targetCol = COLUMNS.find((c) => c.status === over.data.current?.columnStatus);
    if (t && targetCol) return `任務「${t.title}」已放到 ${targetCol.label} 欄`;
  },
  onDragCancel: ({ active }: any) => {
    const t = tasksById[active.id];
    return t ? `已取消移動任務「${t.title}」` : "已取消拖移";
  },
};

const screenReaderInstructions = {
  draggable:
    "請按 Space 或 Enter 開始拖移任務。拖移時，使用方向鍵移動到目標欄位或位置，再按 Space 或 Enter 放下。按 Esc 取消。",
};

<DndContext
  sensors={sensors}
  collisionDetection={closestCorners}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragEnd={handleDragEnd}
  onDragCancel={handleDragCancel}
  accessibility={{ announcements, screenReaderInstructions }}
>
  <div
    data-testid={KANBAN_TESTIDS.board}
    className="flex h-full gap-3 overflow-x-auto pb-2"
  >
    {COLUMNS.map((col) => (
      <SortableContext
        key={col.status}
        id={col.status}
        items={tasksByStatus[col.status].map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <KanbanColumn
          status={col.status}
          label={col.label}
          tasks={tasksByStatus[col.status]}
          onAddTask={onAddTask}
          onOpenTask={onOpenTask}
          onCompleteTask={onCompleteTask}
          isDraggingOver={overColumn === col.status}
        />
      </SortableContext>
    ))}
  </div>

  <DragOverlay
    adjustScale={false}
    dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}
  >
    {activeTask ? (
      <div data-testid={KANBAN_TESTIDS.dragOverlay}>
        <KanbanCard
          task={activeTask}
          isDragOverlay
          onOpen={() => {}}
          onComplete={() => {}}
        />
      </div>
    ) : null}
  </DragOverlay>

  {/* a11y 額外的繁中 polite live region（@dnd-kit 內建是 assertive；複用相同訊息但延遲 100ms） */}
  <div
    data-testid={KANBAN_TESTIDS.boardLiveRegion}
    role="status"
    aria-live="polite"
    aria-atomic="true"
    className="sr-only"
  >
    {liveMessage}
  </div>
</DndContext>
```

---

## 拖放邏輯（簡化）

```ts
function handleDragEnd(e: DragEndEvent) {
  const { active, over } = e;
  if (!over) return;

  const activeTask = tasksById[active.id as string];
  if (!activeTask) return;

  // overId 可能是另一個 task id，或 column drop zone id（'col-{status}'）
  const overData = over.data.current ?? {};
  const toStatus =
    (overData.columnStatus as TaskStatus) ?? tasksById[over.id as string]?.status;
  if (!toStatus) return;

  const targetList = tasksByStatus[toStatus];
  let toIndex = targetList.findIndex((t) => t.id === over.id);
  if (toIndex === -1) toIndex = targetList.length; // dropped on column body

  const fromStatus = activeTask.status;

  // 1. 樂觀更新本地 state（含 arrayMove）
  applyOptimistic({ taskId: active.id as string, fromStatus, toStatus, toIndex });

  // 2. 呼叫 API；失敗 rollback
  onMoveTask({ taskId: active.id as string, fromStatus, toStatus, toIndex }).catch(() => {
    rollbackOptimistic();
    toast.error("更新失敗，請重試");
  });
}
```

---

## 響應式：< 768px

```tsx
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

{isMobile ? (
  <>
    <ToggleGroup
      type="single"
      value={mobileStatus}
      onValueChange={(v) => v && setMobileStatus(v as TaskStatus)}
      data-testid={KANBAN_TESTIDS.mobileStatusSwitcher}
      className="sticky top-0 z-10 mb-2 w-full justify-start overflow-x-auto bg-background py-1"
      aria-label="切換任務狀態欄位"
    >
      {COLUMNS.map((c) => (
        <ToggleGroupItem
          key={c.status}
          value={c.status}
          data-testid={`${KANBAN_TESTIDS.mobileStatusOption}-${c.status}`}
        >
          {c.label}
          <span className="ml-1.5 rounded bg-muted px-1 text-xs tabular-nums">
            {tasksByStatus[c.status].length}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
    <KanbanColumn status={mobileStatus} {...} />
  </>
) : (
  /* desktop 4-column layout */
)}
```

行動版仍包在 `DndContext` 內，但只渲染當前欄；跨欄移動透過 ToggleGroup 切換後在新欄重新拖放。

---

## States

| 狀態 | 視覺 |
|------|------|
| Loading | 4 欄各顯示 3 張 skeleton card（`testid={KANBAN_TESTIDS.boardSkeleton}`） |
| Error | 替換為 `boardError` 區塊 + 重試按鈕 |
| 拖移中 | 來源卡 `opacity-40`、Drag overlay 顯示「正在拖移」副本（旋轉 2deg + 大陰影） |
| 跨欄 hover | 目標欄背景轉為 `kanban.column-drag-over-bg` + ring |
| Drop 後樂觀 | 卡片立即移到新欄；失敗 rollback + toast |

---

## a11y

- `<DndContext accessibility>` 提供繁中 announcements 與 screenReaderInstructions
- 額外 `aria-live="polite"` region：跨欄移動成功 / 失敗訊息
- 鍵盤：每張卡的 drag handle 為 `<button aria-label="拖移任務 {title}">`，Space 開始拖、方向鍵移動、Enter 放下、Esc 取消（@dnd-kit 內建）
- 不依賴 hover 狀態才能拖移（鍵盤即可完成完整流程）
- 對比通過 4.5:1
- 尊重 `prefers-reduced-motion`：移除 dropAnimation
- `aria-grabbed`、`aria-dropeffect` 由 `useSortable` 自動處理（@dnd-kit）

---

## 已知限制

- TOO_MANY_TASKS（超過 500）：Board 顯示空狀態 + 提示「請使用 List 視圖並加上篩選」
- cancelled status 不顯示在 Board，只在 List tab
