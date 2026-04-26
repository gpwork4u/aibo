"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarIcon,
  ClockAlertIcon,
  GripVerticalIcon,
  PaperclipIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  KANBAN_TESTIDS,
  TASK_PRIORITY_BADGE_CLASS,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_DOT_CLASS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/projects/kanban-testids";

export interface KanbanCardData {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  refs_count: number;
}

interface KanbanCardProps {
  task: KanbanCardData;
  onOpen: () => void;
  onComplete: () => void;
  isDragOverlay?: boolean;
}

function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateShortZh(yyyyMmDd: string): string {
  // YYYY-MM-DD -> M/D
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd);
  if (!m) return yyyyMmDd;
  return `${Number(m[2])}/${Number(m[3])}`;
}

export function KanbanCard({
  task,
  onOpen,
  onComplete,
  isDragOverlay,
}: KanbanCardProps) {
  const sortable = useSortable({
    id: task.id,
    data: { columnStatus: task.status, type: "task" },
    disabled: isDragOverlay,
  });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    sortable;

  const isDone = task.status === "done";
  const dueDate = task.due_date;
  const isOverdue = !!(
    dueDate &&
    !isDone &&
    new Date(dueDate) < startOfTodayLocal()
  );

  const style = isDragOverlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  return (
    <article
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      data-testid={`${KANBAN_TESTIDS.card}-${task.id}`}
      onClick={(e) => {
        // 卡片整體點擊也視為開啟 sheet（除非點到 drag handle / checkbox / 內部按鈕）
        const target = e.target as HTMLElement;
        if (
          target.closest(
            `[data-testid="${KANBAN_TESTIDS.cardDragHandle}"],` +
              `[data-testid="${KANBAN_TESTIDS.cardCompleteToggle}"],` +
              `[data-testid="${KANBAN_TESTIDS.cardOpenSheet}"]`,
          )
        ) {
          return;
        }
        onOpen();
      }}
      className={cn(
        "group relative cursor-pointer rounded-md border bg-card shadow-sm transition-shadow",
        "hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
        isDragging && "opacity-40",
        isDragOverlay && "rotate-[2deg] shadow-2xl ring-2 ring-blue-400",
        isDone && "opacity-70",
      )}
    >
      <span
        aria-hidden="true"
        data-testid={KANBAN_TESTIDS.cardStatusDot}
        className={cn(
          "absolute inset-y-0 left-0 w-1 rounded-l-md",
          TASK_STATUS_DOT_CLASS[task.status],
        )}
      />

      <div className="flex items-start gap-2 p-2.5 pl-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          data-testid={KANBAN_TESTIDS.cardDragHandle}
          aria-label={`拖移任務「${task.title}」`}
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground",
            "hover:bg-muted hover:text-foreground active:cursor-grabbing",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <GripVerticalIcon className="h-4 w-4" aria-hidden="true" />
        </button>

        <Checkbox
          checked={isDone}
          onCheckedChange={() => onComplete()}
          data-testid={KANBAN_TESTIDS.cardCompleteToggle}
          aria-label={
            isDone ? `取消完成任務「${task.title}」` : `完成任務「${task.title}」`
          }
          className="mt-1"
        />

        <button
          type="button"
          onClick={onOpen}
          data-testid={KANBAN_TESTIDS.cardOpenSheet}
          className="flex-1 text-left focus:outline-none"
          aria-label={`開啟任務「${task.title}」詳情`}
        >
          <div className="mb-1 flex items-start gap-2">
            <h4
              data-testid={KANBAN_TESTIDS.cardTitle}
              className={cn(
                "line-clamp-2 flex-1 text-sm font-medium leading-snug",
                isDone && "line-through text-muted-foreground",
              )}
            >
              {task.title}
            </h4>
            {task.priority !== "normal" && (
              <Badge
                data-testid={KANBAN_TESTIDS.cardPriorityBadge}
                variant="outline"
                className={cn(
                  "shrink-0 border text-[10px] leading-tight",
                  TASK_PRIORITY_BADGE_CLASS[task.priority],
                )}
                aria-label={`優先級：${TASK_PRIORITY_LABEL[task.priority]}`}
              >
                {TASK_PRIORITY_LABEL[task.priority]}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {dueDate && (
              <span
                data-testid={KANBAN_TESTIDS.cardDueDate}
                className={cn(
                  "flex items-center gap-1 tabular-nums",
                  isOverdue && "text-destructive font-medium",
                )}
                aria-label={
                  isOverdue ? `逾期：${dueDate}` : `截止：${dueDate}`
                }
              >
                {isOverdue ? (
                  <ClockAlertIcon className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {formatDateShortZh(dueDate)}
              </span>
            )}
            {task.refs_count > 0 && (
              <span
                data-testid={KANBAN_TESTIDS.cardRefsCount}
                className="flex items-center gap-1"
                aria-label={`${task.refs_count} 個關聯項目`}
              >
                <PaperclipIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {task.refs_count}
              </span>
            )}
          </div>
        </button>
      </div>
    </article>
  );
}
