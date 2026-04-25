"use client";

import * as React from "react";
import { Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TASK_PRIORITY_BADGE_CLASS,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_BADGE_CLASS,
  TASK_STATUS_LABEL,
} from "@/lib/projects/kanban-testids";
import type { Task } from "@/lib/api/tasks";
import { PROJECTS_TESTIDS } from "@/lib/projects/testids";
import { cn } from "@/lib/utils";

interface ProjectTaskListTabProps {
  tasks: Task[];
  isLoading?: boolean;
  onOpenTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
}

function isOverdue(t: Task): boolean {
  if (t.status === "done" || t.status === "cancelled") return false;
  if (!t.due_date) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t.due_date);
  if (!m) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) < today;
}

export function ProjectTaskListTab({
  tasks,
  isLoading,
  onOpenTask,
  onCompleteTask,
}: ProjectTaskListTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div
        className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground"
        data-testid={PROJECTS_TESTIDS.taskListEmpty}
      >
        尚無任務
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-md border"
      data-testid={PROJECTS_TESTIDS.taskListTable}
    >
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">標題</th>
            <th className="px-3 py-2 font-medium">狀態</th>
            <th className="px-3 py-2 font-medium">優先級</th>
            <th className="px-3 py-2 font-medium">到期日</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr
              key={t.id}
              className="border-t hover:bg-muted/20"
              data-testid={PROJECTS_TESTIDS.taskListRow(t.id)}
            >
              <td className="px-3 py-2">
                <button
                  type="button"
                  className="text-left underline-offset-2 hover:underline"
                  onClick={() => onOpenTask(t.id)}
                >
                  {t.title}
                </button>
              </td>
              <td className="px-3 py-2">
                <Badge className={cn("border", TASK_STATUS_BADGE_CLASS[t.status])}>
                  {TASK_STATUS_LABEL[t.status]}
                </Badge>
              </td>
              <td className="px-3 py-2">
                <Badge className={cn("border", TASK_PRIORITY_BADGE_CLASS[t.priority])}>
                  {TASK_PRIORITY_LABEL[t.priority]}
                </Badge>
              </td>
              <td className={cn("px-3 py-2", isOverdue(t) && "text-destructive")}>
                {t.due_date ?? "—"}
              </td>
              <td className="px-3 py-2">
                <div className="flex justify-end gap-1">
                  {t.status !== "done" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="標記完成"
                      onClick={() => onCompleteTask(t.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="開啟任務"
                    onClick={() => onOpenTask(t.id)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
