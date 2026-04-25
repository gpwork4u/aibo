"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  PROJECTS_TESTIDS,
  PROJECT_STATUS_LABEL,
  type ProjectStatus,
} from "@/lib/projects/testids";

const TAB_ORDER: ProjectStatus[] = ["active", "paused", "done", "archived"];

interface ProjectStatusTabsProps {
  value: ProjectStatus;
  onChange: (value: ProjectStatus) => void;
  /** 各 status 的數量（可選） */
  counts?: Partial<Record<ProjectStatus, number>>;
}

export function ProjectStatusTabs({ value, onChange, counts }: ProjectStatusTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="專案狀態篩選"
      data-testid={PROJECTS_TESTIDS.statusTabs}
      className="mb-6 inline-flex rounded-md border bg-card p-1"
    >
      {TAB_ORDER.map((status) => {
        const active = value === status;
        const count = counts?.[status];
        return (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={PROJECTS_TESTIDS.statusTab(status)}
            onClick={() => onChange(status)}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {PROJECT_STATUS_LABEL[status]}
            {typeof count === "number" && (
              <span className="ml-1 text-xs tabular-nums">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
