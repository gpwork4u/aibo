"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  KANBAN_STATUSES,
  KANBAN_TESTIDS,
} from "@/lib/projects/kanban-testids";
import {
  KANBAN_STATUS_LIST,
  applyOptimisticMove,
  computeNewPosition,
  groupTasksByStatus,
  isKanbanStatus,
  type KanbanStatus,
} from "@/lib/projects/kanban-utils";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { KanbanCard, type KanbanCardData } from "./kanban-card";
import { KanbanColumn } from "./kanban-column";

export interface KanbanBoardTask extends KanbanCardData {
  position: number;
}

interface KanbanBoardProps {
  projectId: string;
  tasks: KanbanBoardTask[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onMove: (input: {
    taskId: string;
    fromStatus: KanbanStatus;
    toStatus: KanbanStatus;
    toIndex: number;
    optimisticTasks: KanbanBoardTask[];
  }) => Promise<void>;
  onAddTask: (status: KanbanStatus) => void;
  onOpenTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export function KanbanBoard({
  tasks,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onMove,
  onAddTask,
  onOpenTask,
  onCompleteTask,
}: KanbanBoardProps) {
  const isMobile = useIsMobile();
  const [mobileStatus, setMobileStatus] = React.useState<KanbanStatus>("todo");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [overColumn, setOverColumn] = React.useState<KanbanStatus | null>(null);
  const [liveMessage, setLiveMessage] = React.useState("");

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const grouped = React.useMemo(() => groupTasksByStatus(tasks), [tasks]);
  const tasksById = React.useMemo(() => {
    const m: Record<string, KanbanBoardTask> = {};
    for (const t of tasks) m[t.id] = t;
    return m;
  }, [tasks]);

  const activeTask = activeId ? tasksById[activeId] : null;

  const announcements = React.useMemo(
    () => ({
      onDragStart: ({ active }: { active: { id: string | number } }) => {
        const t = tasksById[String(active.id)];
        return t ? `已抓起任務「${t.title}」` : "已抓起任務";
      },
      onDragOver: ({
        active,
        over,
      }: {
        active: { id: string | number };
        over: { id: string | number; data: { current?: Record<string, unknown> } } | null;
      }) => {
        if (!over) return "";
        const t = tasksById[String(active.id)];
        const overData = (over.data?.current ?? {}) as { columnStatus?: string };
        const targetCol = KANBAN_STATUSES.find(
          (c) => c.status === overData.columnStatus,
        );
        if (t && targetCol)
          return `任務「${t.title}」位於 ${targetCol.label} 欄`;
        return "";
      },
      onDragEnd: ({
        active,
        over,
      }: {
        active: { id: string | number };
        over: { id: string | number; data: { current?: Record<string, unknown> } } | null;
      }) => {
        if (!over) return "已取消拖移";
        const t = tasksById[String(active.id)];
        const overData = (over.data?.current ?? {}) as { columnStatus?: string };
        const targetCol = KANBAN_STATUSES.find(
          (c) => c.status === overData.columnStatus,
        );
        if (t && targetCol)
          return `任務「${t.title}」已放到 ${targetCol.label} 欄`;
        return "";
      },
      onDragCancel: ({ active }: { active: { id: string | number } }) => {
        const t = tasksById[String(active.id)];
        return t ? `已取消移動任務「${t.title}」` : "已取消拖移";
      },
    }),
    [tasksById],
  );

  const screenReaderInstructions = React.useMemo(
    () => ({
      draggable:
        "請按 Space 或 Enter 開始拖移任務。拖移時，使用方向鍵移動到目標欄位或位置，再按 Space 或 Enter 放下。按 Esc 取消。",
    }),
    [],
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragOver = (e: DragOverEvent) => {
    const overData = (e.over?.data?.current ?? {}) as { columnStatus?: string };
    const s = overData.columnStatus;
    setOverColumn(s && isKanbanStatus(s) ? s : null);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const activeIdStr = String(e.active.id);
    setActiveId(null);
    setOverColumn(null);
    if (!e.over) return;
    const overIdStr = String(e.over.id);

    const result = computeNewPosition({
      activeId: activeIdStr,
      overId: overIdStr,
      tasks,
    });
    if (!result || !result.changed) return;

    const optimistic = applyOptimisticMove(tasks, result) as KanbanBoardTask[];
    const t = tasksById[activeIdStr];
    setLiveMessage(
      t
        ? `任務「${t.title}」已從 ${labelOf(result.fromStatus)} 移至 ${labelOf(result.toStatus)} 第 ${result.toIndex + 1} 個位置`
        : "",
    );

    try {
      await onMove({
        taskId: result.taskId,
        fromStatus: result.fromStatus,
        toStatus: result.toStatus,
        toIndex: result.toIndex,
        optimisticTasks: optimistic,
      });
    } catch {
      // parent 負責 rollback + toast；這裡只清 live 訊息
      setLiveMessage("更新失敗，已回復原位置");
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverColumn(null);
  };

  if (isLoading) {
    return (
      <div
        data-testid={KANBAN_TESTIDS.boardSkeleton}
        className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
      >
        {KANBAN_STATUSES.map((c) => (
          <div
            key={c.status}
            className="space-y-2 rounded-lg bg-muted/40 p-3"
          >
            <Skeleton className="h-6 w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid={KANBAN_TESTIDS.boardError}>
        <ErrorState
          message={errorMessage ?? "載入任務失敗"}
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{ announcements, screenReaderInstructions }}
    >
      {isMobile ? (
        <div data-testid={KANBAN_TESTIDS.board} className="space-y-3">
          <div
            role="tablist"
            aria-label="切換任務狀態欄位"
            data-testid={KANBAN_TESTIDS.mobileStatusSwitcher}
            className="sticky top-0 z-10 flex w-full overflow-x-auto rounded-md border bg-background p-1"
          >
            {KANBAN_STATUSES.map((c) => (
              <button
                key={c.status}
                type="button"
                role="tab"
                aria-selected={mobileStatus === c.status}
                data-testid={`${KANBAN_TESTIDS.mobileStatusOption}-${c.status}`}
                onClick={() => setMobileStatus(c.status)}
                className={cn(
                  "flex-1 whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  mobileStatus === c.status
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                {c.label}
                <span className="ml-1.5 rounded bg-muted px-1 text-xs tabular-nums">
                  {grouped[c.status].length}
                </span>
              </button>
            ))}
          </div>
          <KanbanColumn
            status={mobileStatus}
            label={KANBAN_STATUSES.find((c) => c.status === mobileStatus)!.label}
            tasks={grouped[mobileStatus]}
            onAddTask={onAddTask}
            onOpenTask={onOpenTask}
            onCompleteTask={onCompleteTask}
            isDraggingOver={overColumn === mobileStatus}
          />
        </div>
      ) : (
        <div
          data-testid={KANBAN_TESTIDS.board}
          className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
        >
          {KANBAN_STATUS_LIST.map((s) => {
            const cfg = KANBAN_STATUSES.find((c) => c.status === s)!;
            return (
              <KanbanColumn
                key={s}
                status={s}
                label={cfg.label}
                tasks={grouped[s]}
                onAddTask={onAddTask}
                onOpenTask={onOpenTask}
                onCompleteTask={onCompleteTask}
                isDraggingOver={overColumn === s}
              />
            );
          })}
        </div>
      )}

      <DragOverlay
        adjustScale={false}
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}
      >
        {activeTask ? (
          <div data-testid={KANBAN_TESTIDS.dragOverlay}>
            <KanbanCard
              task={activeTask}
              isDragOverlay
              onOpen={() => undefined}
              onComplete={() => undefined}
            />
          </div>
        ) : null}
      </DragOverlay>

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
  );
}

function labelOf(s: KanbanStatus): string {
  return KANBAN_STATUSES.find((c) => c.status === s)?.label ?? s;
}

