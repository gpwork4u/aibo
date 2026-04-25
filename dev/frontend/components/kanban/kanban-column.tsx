"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  KANBAN_TESTIDS,
  TASK_STATUS_DOT_CLASS,
} from "@/lib/projects/kanban-testids";
import type { KanbanStatus } from "@/lib/projects/kanban-utils";
import { KanbanCard, type KanbanCardData } from "./kanban-card";

interface KanbanColumnProps {
  status: KanbanStatus;
  label: string;
  tasks: KanbanCardData[];
  onAddTask: (status: KanbanStatus) => void;
  onOpenTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  isDraggingOver?: boolean;
}

export function KanbanColumn({
  status,
  label,
  tasks,
  onAddTask,
  onOpenTask,
  onCompleteTask,
  isDraggingOver,
}: KanbanColumnProps) {
  const dropId = `col-${status}`;
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { columnStatus: status, type: "column" },
  });
  const draggingOver = isDraggingOver ?? isOver;

  const itemIds = React.useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <section
      data-testid={`${KANBAN_TESTIDS.column}-${status}`}
      aria-label={`${label} 欄，共 ${tasks.length} 筆任務`}
      className="flex w-full shrink-0 flex-col rounded-lg bg-muted/40 dark:bg-muted/20 md:w-72"
    >
      <header
        data-testid={`${KANBAN_TESTIDS.columnHeader}-${status}`}
        className="flex items-center gap-2 border-b px-3 py-2"
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            TASK_STATUS_DOT_CLASS[status],
          )}
        />
        <h3
          data-testid={`${KANBAN_TESTIDS.columnLabel}-${status}`}
          className="text-sm font-medium"
        >
          {label}
        </h3>
        <span
          data-testid={`${KANBAN_TESTIDS.columnCount}-${status}`}
          className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground"
          aria-label={`共 ${tasks.length} 筆`}
        >
          {tasks.length}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7"
          onClick={() => onAddTask(status)}
          data-testid={`${KANBAN_TESTIDS.columnAddTask}-${status}`}
          aria-label={`在 ${label} 欄新增任務`}
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </header>

      <div
        ref={setNodeRef}
        data-testid={`${KANBAN_TESTIDS.columnDropZone}-${status}`}
        className={cn(
          "min-h-[120px] flex-1 space-y-2 p-2 transition-colors",
          draggingOver &&
            "bg-blue-50 ring-2 ring-blue-400 ring-inset dark:bg-blue-950/30",
        )}
      >
        <SortableContext
          id={status}
          items={itemIds}
          strategy={verticalListSortingStrategy}
        >
          <ul
            data-testid={`${KANBAN_TESTIDS.columnList}-${status}`}
            className="space-y-2"
          >
            {tasks.length === 0 ? (
              <li
                data-testid={`${KANBAN_TESTIDS.columnEmpty}-${status}`}
                className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground"
              >
                尚無任務
                <button
                  type="button"
                  onClick={() => onAddTask(status)}
                  className="ml-1 underline underline-offset-2 hover:text-foreground"
                >
                  點 + 新增
                </button>
              </li>
            ) : (
              tasks.map((task) => (
                <li key={task.id}>
                  <KanbanCard
                    task={task}
                    onOpen={() => onOpenTask(task.id)}
                    onComplete={() => onCompleteTask(task.id)}
                  />
                </li>
              ))
            )}
          </ul>
        </SortableContext>
      </div>
    </section>
  );
}
