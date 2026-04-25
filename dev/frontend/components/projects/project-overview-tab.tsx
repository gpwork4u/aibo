"use client";

import * as React from "react";
import {
  AlertOctagonIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockAlertIcon,
  ListTodoIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownViewer } from "@/components/markdown-viewer";
import {
  PROJECTS_TESTIDS,
  PROJECT_STATUS_LABEL,
} from "@/lib/projects/testids";
import type { Project } from "@/lib/api/projects";

interface ProjectOverviewTabProps {
  project: Project;
  overdueCount: number;
}

function formatDateZh(value: string): string {
  // YYYY-MM-DD → 2026/04/25
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  return `${m[1]}/${m[2]}/${m[3]}`;
}

function daysRemaining(endDate: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endDate);
  if (!m) return 0;
  const end = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

function StatCard({
  testid,
  icon,
  label,
  value,
  highlight,
}: {
  testid: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card
      data-testid={testid}
      className={cn(
        "transition-colors",
        highlight &&
          "border-orange-300 bg-orange-50/60 dark:border-orange-900/60 dark:bg-orange-950/20",
      )}
    >
      <CardContent className="flex flex-col gap-1 p-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}

export function ProjectOverviewTab({
  project,
  overdueCount,
}: ProjectOverviewTabProps) {
  const total = project.task_counts?.total ?? 0;
  const byStatus = project.task_counts?.by_status ?? {};
  const doneCount = byStatus.done ?? 0;
  const blockedCount = byStatus.blocked ?? 0;

  const remaining = project.end_date ? daysRemaining(project.end_date) : null;

  return (
    <div
      data-testid={PROJECTS_TESTIDS.detailContentOverview}
      className="space-y-6 py-4"
    >
      {/* Progress block */}
      <section
        data-testid={PROJECTS_TESTIDS.overviewProgress}
        aria-label="專案整體進度"
      >
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">進度</h2>
          <span className="text-2xl font-semibold tabular-nums">
            {project.progress}%
          </span>
        </div>
        <div
          data-testid={PROJECTS_TESTIDS.overviewProgressBar}
          role="progressbar"
          aria-valuenow={project.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`進度 ${project.progress}%`}
          className="h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(0, Math.min(100, project.progress))}%`,
              backgroundColor: project.color,
            }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
          {doneCount} / {total} 完成（狀態：
          {PROJECT_STATUS_LABEL[project.status]}）
        </p>
      </section>

      {/* Stats */}
      <section
        data-testid={PROJECTS_TESTIDS.overviewStats}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        aria-label="任務統計"
      >
        <StatCard
          testid={PROJECTS_TESTIDS.overviewStatTotal}
          icon={<ListTodoIcon className="h-4 w-4" aria-hidden="true" />}
          label="全部"
          value={total}
        />
        <StatCard
          testid={PROJECTS_TESTIDS.overviewStatDone}
          icon={
            <CheckCircle2Icon
              className="h-4 w-4 text-green-700 dark:text-green-300"
              aria-hidden="true"
            />
          }
          label="完成"
          value={doneCount}
        />
        <StatCard
          testid={PROJECTS_TESTIDS.overviewStatBlocked}
          icon={
            <AlertOctagonIcon
              className="h-4 w-4 text-red-700 dark:text-red-300"
              aria-hidden="true"
            />
          }
          label="卡住"
          value={blockedCount}
        />
        <StatCard
          testid={PROJECTS_TESTIDS.overviewStatOverdue}
          icon={
            <ClockAlertIcon
              className="h-4 w-4 text-orange-700 dark:text-orange-300"
              aria-hidden="true"
            />
          }
          label="逾期"
          value={overdueCount}
          highlight={overdueCount > 0}
        />
      </section>

      {/* Timeline */}
      <section
        data-testid={PROJECTS_TESTIDS.overviewTimeline}
        aria-label="專案時程"
      >
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">時程</h2>
        <p
          data-testid={PROJECTS_TESTIDS.overviewDates}
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <CalendarIcon
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span>
            {project.start_date ? formatDateZh(project.start_date) : "未設定"}
          </span>
          <span className="text-muted-foreground">→</span>
          <span>
            {project.end_date ? formatDateZh(project.end_date) : "未設定"}
          </span>
          {remaining !== null && (
            <span className="text-xs text-muted-foreground">
              （
              {remaining > 0
                ? `剩 ${remaining} 天`
                : remaining === 0
                  ? "今天結束"
                  : `已逾期 ${-remaining} 天`}
              ）
            </span>
          )}
        </p>
      </section>

      {/* Description */}
      {project.description && (
        <section
          data-testid={PROJECTS_TESTIDS.overviewDescription}
          aria-label="專案描述"
        >
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            描述
          </h2>
          <article className="rounded-md border bg-card p-4">
            <MarkdownViewer content={project.description} />
          </article>
        </section>
      )}

      {/* Activity placeholder（後端尚未提供 activity feed，預留 hook） */}
      <section
        data-testid={PROJECTS_TESTIDS.overviewActivity}
        aria-label="最近活動"
      >
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          最近活動
        </h2>
        <p className="text-sm italic text-muted-foreground">
          尚無活動紀錄
        </p>
      </section>
    </div>
  );
}
