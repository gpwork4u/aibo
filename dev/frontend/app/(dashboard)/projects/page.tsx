"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KanbanSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectStatusTabs } from "@/components/projects/project-status-tabs";
import { DeleteProjectConfirmDialog } from "@/components/projects/delete-project-confirm-dialog";
import {
  PROJECTS_TESTIDS,
  type ProjectStatus,
} from "@/lib/projects/testids";
import {
  useArchiveProject,
  useDeleteProject,
  useProjects,
} from "@/lib/hooks/use-projects";
import { ApiError } from "@/lib/api/client";
import type { Project, ProjectListItem } from "@/lib/api/projects";

export default function ProjectsListPage() {
  const router = useRouter();
  const [status, setStatus] = React.useState<ProjectStatus>("active");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ProjectListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ProjectListItem | null>(null);
  const [deleteTaskCount, setDeleteTaskCount] = React.useState<number | undefined>(
    undefined,
  );

  const { data, isLoading, isError, error, refetch } = useProjects({
    status,
    per_page: 100,
  });

  const archiveMut = useArchiveProject();
  const deleteMut = useDeleteProject();

  const projects = data?.data ?? [];

  const handleEdit = (p: ProjectListItem) => setEditTarget(p);

  const handleArchive = async (p: ProjectListItem) => {
    try {
      await archiveMut.mutateAsync(p.id);
      toast.success(
        p.status === "archived" ? "已取消封存" : "專案已封存",
        { id: PROJECTS_TESTIDS.toastArchived },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "封存失敗");
    }
  };

  const handleDeleteRequest = (p: ProjectListItem) => {
    // 暫時假設未知 task count；後端會在 409 回 task_count
    setDeleteTarget(p);
    setDeleteTaskCount(undefined);
    // 嘗試直接刪（taskCount === undefined → loading）
    void tryDelete(p, false, /*initial*/ true);
  };

  const tryDelete = async (
    p: ProjectListItem,
    force: boolean,
    initial = false,
  ): Promise<{ ok: true } | { ok: false; message: string }> => {
    try {
      await deleteMut.mutateAsync({ id: p.id, force });
      toast.success("專案已刪除", { id: PROJECTS_TESTIDS.toastDeleted });
      setDeleteTarget(null);
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as
          | { code?: string; task_count?: number; message?: string }
          | null
          | undefined;
        if (body?.code === "PROJECT_HAS_TASKS") {
          setDeleteTaskCount(body.task_count ?? 1);
          if (initial) {
            // 初次嘗試 → 留 dialog 開著等使用者勾 force
            return { ok: false, message: body.message ?? "此專案下仍有任務" };
          }
          return {
            ok: false,
            message: body.message ?? "此專案下仍有任務",
          };
        }
      }
      const message = err instanceof Error ? err.message : "刪除失敗";
      if (!initial) toast.error(message);
      return { ok: false, message };
    }
  };

  const handleCreated = (p: Project) => {
    // navigate 到 detail 的 Board tab（即使 detail 頁未實作也 OK）
    router.push(`/projects/${p.id}`);
  };

  return (
    <main
      data-testid={PROJECTS_TESTIDS.listPage}
      className="mx-auto max-w-6xl px-6 py-8"
    >
      <PageHeader
        title="專案"
        description="追蹤所有進行中的專案與任務"
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            data-testid={PROJECTS_TESTIDS.listCreateButton}
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            新增專案
          </Button>
        }
      />

      <ProjectStatusTabs value={status} onChange={setStatus} />

      {isLoading && (
        <div
          data-testid={PROJECTS_TESTIDS.listSkeleton}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <div data-testid={PROJECTS_TESTIDS.listError}>
          <ErrorState
            message={error instanceof Error ? error.message : "載入失敗，請稍後再試"}
            onRetry={() => refetch()}
          />
        </div>
      )}

      {!isLoading && !isError && projects.length === 0 && (
        <div data-testid={PROJECTS_TESTIDS.listEmpty}>
          <EmptyState
            icon={<KanbanSquare className="h-12 w-12" />}
            title="尚無專案"
            description="建立第一個專案來組織你的任務與筆記"
            action={
              <Button
                onClick={() => setCreateOpen(true)}
                data-testid={PROJECTS_TESTIDS.listEmptyCta}
              >
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                新增專案
              </Button>
            }
          />
        </div>
      )}

      {!isLoading && !isError && projects.length > 0 && (
        <div
          data-testid={PROJECTS_TESTIDS.listGrid}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <ProjectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      {/* Edit dialog */}
      <ProjectFormDialog
        open={!!editTarget}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
        project={editTarget ?? undefined}
      />

      {/* Delete dialog */}
      {deleteTarget && (
        <DeleteProjectConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => {
            if (!o) setDeleteTarget(null);
          }}
          project={{ id: deleteTarget.id, name: deleteTarget.name }}
          taskCount={deleteTaskCount}
          onConfirm={(force) => tryDelete(deleteTarget, force)}
        />
      )}
    </main>
  );
}
