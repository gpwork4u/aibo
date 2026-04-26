"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Archive as ArchiveIcon,
  MoreHorizontal as MoreHorizontalIcon,
  Pencil as PencilIcon,
  Trash2 as Trash2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PROJECTS_TESTIDS,
  PROJECT_STATUS_BADGE_CLASS,
  PROJECT_STATUS_LABEL,
} from "@/lib/projects/testids";
import type { ProjectListItem } from "@/lib/api/projects";

interface ProjectCardProps {
  project: ProjectListItem;
  onEdit: (project: ProjectListItem) => void;
  onArchive: (project: ProjectListItem) => void;
  onDelete: (project: ProjectListItem) => void;
}

export function ProjectCard({ project, onEdit, onArchive, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const archived = project.status === "archived";

  const handleOpen = () => {
    router.push(`/projects/${project.id}`);
  };

  return (
    <div
      data-testid={PROJECTS_TESTIDS.card}
      data-project-id={project.id}
      className="contents"
    >
    <div
      data-testid={PROJECTS_TESTIDS.cardById(project.id)}
      className={cn(
        "group relative flex overflow-hidden rounded-lg border bg-card transition-all",
        "hover:bg-muted/40 hover:shadow-sm",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        archived && "opacity-70",
      )}
    >
      {/* Color stripe */}
      <span
        aria-hidden="true"
        data-testid={PROJECTS_TESTIDS.cardColorStripe}
        className={cn("w-1 shrink-0", archived && "saturate-50")}
        style={{ backgroundColor: project.color }}
      />

      {/* Click area */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`開啟專案：${project.name}（${PROJECT_STATUS_LABEL[project.status]}，進度 ${project.progress}%）`}
        className="flex-1 p-4 text-left focus:outline-none"
      >
        {/* Header */}
        <div className="mb-1 flex items-start gap-2 pr-8">
          <h3
            data-testid={PROJECTS_TESTIDS.cardName}
            className="line-clamp-1 flex-1 text-base font-semibold leading-snug"
          >
            {project.name}
          </h3>
          <Badge
            data-testid={PROJECTS_TESTIDS.cardStatusBadge}
            variant="outline"
            className={cn(
              "shrink-0 gap-1 border",
              PROJECT_STATUS_BADGE_CLASS[project.status],
            )}
            aria-label={`狀態：${PROJECT_STATUS_LABEL[project.status]}`}
          >
            {PROJECT_STATUS_LABEL[project.status]}
          </Badge>
        </div>

        {/* Progress */}
        <div className="mb-2 mt-3 flex items-center gap-3">
          <div
            data-testid={PROJECTS_TESTIDS.cardProgressBar}
            role="progressbar"
            aria-valuenow={project.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`進度 ${project.progress}%`}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, project.progress))}%`,
                backgroundColor: project.color,
              }}
            />
          </div>
          <span
            data-testid={PROJECTS_TESTIDS.cardProgressLabel}
            className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground"
          >
            {project.progress}%
          </span>
        </div>

        {/* Meta footer */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {project.task_counts && (
            <span data-testid={PROJECTS_TESTIDS.cardOpenTaskCount}>
              未完成{" "}
              {(project.task_counts.by_status.todo ?? 0) +
                (project.task_counts.by_status.in_progress ?? 0) +
                (project.task_counts.by_status.blocked ?? 0)}
            </span>
          )}
          {project.end_date && (
            <span data-testid={PROJECTS_TESTIDS.cardNextDue} className="truncate">
              至 {project.end_date}
            </span>
          )}
        </div>
      </button>

      {/* Action menu (絕對定位 overlay；不嵌套於主 button 內以避免 nested button) */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              data-testid={PROJECTS_TESTIDS.cardMenuTrigger}
              aria-label={`${project.name} 動作選單`}
            >
              <MoreHorizontalIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => onEdit(project)}
              data-testid={PROJECTS_TESTIDS.cardMenuEdit}
            >
              <PencilIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              編輯
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onArchive(project)}
              data-testid={PROJECTS_TESTIDS.cardMenuArchive}
            >
              <ArchiveIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              {archived ? "取消封存" : "封存"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDelete(project)}
              data-testid={PROJECTS_TESTIDS.cardMenuDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2Icon className="mr-2 h-4 w-4" aria-hidden="true" />
              刪除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    </div>
  );
}
