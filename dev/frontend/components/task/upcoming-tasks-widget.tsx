"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpcomingTasks } from "@/lib/hooks/use-tasks";
import { PROJECTS_TESTIDS } from "@/lib/projects/testids";
import { cn } from "@/lib/utils";

interface UpcomingTasksWidgetProps {
  /** 顯示天數，預設 7 */
  days?: number;
  /** 最多顯示筆數 */
  limit?: number;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  if (!m) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) < today;
}

export function UpcomingTasksWidget({
  days = 7,
  limit = 5,
}: UpcomingTasksWidgetProps) {
  const { data, isLoading } = useUpcomingTasks(days);
  const items = (data?.data ?? []).slice(0, limit);

  return (
    <div
      className="rounded-md border bg-card p-3 text-sm"
      data-testid={PROJECTS_TESTIDS.upcomingWidget}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        即將到期（{days} 天內）
      </div>
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p
          className="text-xs text-muted-foreground"
          data-testid={PROJECTS_TESTIDS.upcomingWidgetEmpty}
        >
          目前無即將到期的任務
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((t) => (
            <li
              key={t.id}
              data-testid="upcoming-tasks-widget-item"
            >
              <span
                data-testid={`upcoming-tasks-widget-item-${t.id}`}
                style={{ display: "contents" }}
              >
                <Link
                  href={`/projects/${t.project_id}?task=${t.id}`}
                  className="flex items-center justify-between gap-2 rounded px-1.5 py-1 hover:bg-muted/50"
                >
                  <span
                    className="truncate"
                    data-testid="upcoming-tasks-widget-item-title"
                  >
                    {t.title}
                  </span>
                  <span
                    data-testid="upcoming-tasks-widget-item-due"
                    className={cn(
                      "shrink-0 text-xs",
                      isOverdue(t.due_date)
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {t.due_date ?? "—"}
                  </span>
                  {isOverdue(t.due_date) && (
                    <span
                      data-testid="upcoming-tasks-widget-item-overdue-badge"
                      className="shrink-0 rounded bg-destructive/10 px-1 text-[10px] font-medium text-destructive"
                    >
                      逾期
                    </span>
                  )}
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
