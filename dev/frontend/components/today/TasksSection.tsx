"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckSquare, AlertCircle, Circle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listTodayTasks } from "@/lib/api/today";
import type { TodayTask } from "@/lib/api/today";

interface TasksSectionProps {
  today: string; // YYYY-MM-DD
}

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "緊急",
  high: "高",
  medium: "中",
  low: "低",
};

const PRIORITY_COLOR: Record<
  string,
  "destructive" | "default" | "secondary" | "outline"
> = {
  urgent: "destructive",
  high: "default",
  medium: "secondary",
  low: "outline",
};

export function TasksSection({ today }: TasksSectionProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["today-tasks", today],
    queryFn: () => listTodayTasks(today),
  });

  const tasks: TodayTask[] = data?.data ?? [];

  return (
    <Card data-testid="tasks-section">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CheckSquare className="h-4 w-4" />
          今日待辦
          {tasks.length > 0 && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {tasks.length} 項
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div
            className="text-xs text-muted-foreground animate-pulse"
            data-testid="tasks-loading"
          >
            載入中…
          </div>
        )}

        {error && !isLoading && (
          <div
            className="flex items-center gap-2 text-xs text-destructive"
            data-testid="tasks-error"
          >
            <AlertCircle className="h-4 w-4" />
            <span>Could not load tasks</span>
          </div>
        )}

        {!isLoading && !error && tasks.length === 0 && (
          <p
            className="text-xs text-muted-foreground"
            data-testid="tasks-empty"
          >
            今天沒有待辦事項
          </p>
        )}

        {!isLoading && !error && tasks.length > 0 && (
          <ul className="space-y-2" data-testid="tasks-list">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-start gap-2 text-sm"
                data-testid="task-item"
              >
                <Circle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{task.title}</p>
                </div>
                {task.priority && task.priority !== "medium" && (
                  <Badge
                    variant={PRIORITY_COLOR[task.priority] ?? "outline"}
                    className="text-xs shrink-0"
                  >
                    {PRIORITY_LABEL[task.priority] ?? task.priority}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
