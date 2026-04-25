"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { KanbanBoard, type KanbanBoardTask } from "@/components/kanban/kanban-board";
import { ProjectOverviewTab } from "@/components/projects/project-overview-tab";
import { ProjectTaskListTab } from "@/components/projects/project-task-list-tab";
import { useProject } from "@/lib/hooks/use-projects";
import {
  tasksKey,
  useCompleteTask,
  useCreateTask,
  useProjectTasks,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import type { ListTasksResponse, Task } from "@/lib/api/tasks";
import { PROJECTS_TESTIDS } from "@/lib/projects/testids";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params?.id ?? "";

  const queryClient = useQueryClient();
  const projectQ = useProject(projectId);
  const tasksQ = useProjectTasks(projectId);
  const updateMut = useUpdateTask(projectId);
  const completeMut = useCompleteTask(projectId);
  const createMut = useCreateTask(projectId);

  const tasks = tasksQ.data?.data ?? [];
  const kanbanTasks: KanbanBoardTask[] = React.useMemo(
    () =>
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        position: t.position,
        refs_count: t.refs?.length ?? 0,
      })),
    [tasks],
  );

  const overdueCount = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter((t) => {
      if (t.status === "done" || t.status === "cancelled") return false;
      if (!t.due_date) return false;
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t.due_date);
      if (!m) return false;
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return d < today;
    }).length;
  }, [tasks]);

  const handleMove = React.useCallback(
    async ({
      taskId,
      toStatus,
      toIndex,
      optimisticTasks,
    }: {
      taskId: string;
      fromStatus: KanbanBoardTask["status"];
      toStatus: KanbanBoardTask["status"];
      toIndex: number;
      optimisticTasks: KanbanBoardTask[];
    }) => {
      const key = tasksKey(projectId);
      const snapshot = queryClient.getQueryData<ListTasksResponse>(key);
      // 樂觀更新：把 optimisticTasks（已套用拖放結果）寫回快取，立刻反映在 UI
      if (snapshot) {
        const byId = new Map<string, KanbanBoardTask>();
        for (const t of optimisticTasks) byId.set(t.id, t);
        const next: Task[] = snapshot.data.map((t) => {
          const o = byId.get(t.id);
          if (!o) return t;
          return { ...t, status: o.status, position: o.position };
        });
        queryClient.setQueryData<ListTasksResponse>(key, { ...snapshot, data: next });
      }
      try {
        await updateMut.mutateAsync({
          id: taskId,
          input: { status: toStatus, position: toIndex },
        });
      } catch (err) {
        // 失敗回滾到 snapshot
        if (snapshot) queryClient.setQueryData(key, snapshot);
        toast.error(err instanceof Error ? err.message : "更新失敗", {
          id: PROJECTS_TESTIDS.toastDragFailed,
        });
        throw err;
      }
    },
    [updateMut, queryClient, projectId],
  );

  const handleAddTask = React.useCallback(
    async (status: KanbanBoardTask["status"]) => {
      const title = window.prompt("任務標題");
      if (!title?.trim()) return;
      try {
        await createMut.mutateAsync({ title: title.trim(), status, priority: "normal" });
        toast.success("已建立任務");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "建立失敗");
      }
    },
    [createMut],
  );

  const handleOpenTask = React.useCallback((taskId: string) => {
    // F-032c TaskSheet 後續實作；此處先 navigate 到 hash 作 placeholder
    if (typeof window !== "undefined") window.location.hash = `task-${taskId}`;
  }, []);

  const handleCompleteTask = React.useCallback(
    async (taskId: string) => {
      try {
        await completeMut.mutateAsync(taskId);
        toast.success("任務已完成");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "標記完成失敗");
      }
    },
    [completeMut],
  );

  if (projectQ.isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (projectQ.isError || !projectQ.data) {
    return (
      <div className="container mx-auto p-6">
        <ErrorState
          message={
            projectQ.error instanceof Error
              ? projectQ.error.message
              : "載入專案失敗，請稍後重試"
          }
          onRetry={() => projectQ.refetch()}
        />
      </div>
    );
  }

  const project = projectQ.data;

  return (
    <div
      className="container mx-auto space-y-4 p-6"
      data-testid={PROJECTS_TESTIDS.detailPage}
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/projects")}
          aria-label="返回專案列表"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
      </div>

      <Tabs defaultValue="board" className="w-full">
        <TabsList data-testid={PROJECTS_TESTIDS.detailTabs}>
          <TabsTrigger value="board" data-testid={PROJECTS_TESTIDS.detailTabBoard}>
            Board
          </TabsTrigger>
          <TabsTrigger value="list" data-testid={PROJECTS_TESTIDS.detailTabList}>
            List
          </TabsTrigger>
          <TabsTrigger value="overview" data-testid={PROJECTS_TESTIDS.detailTabOverview}>
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4">
          <KanbanBoard
            projectId={projectId}
            tasks={kanbanTasks}
            isLoading={tasksQ.isLoading}
            isError={tasksQ.isError}
            errorMessage={
              tasksQ.error instanceof Error ? tasksQ.error.message : undefined
            }
            onRetry={() => tasksQ.refetch()}
            onMove={handleMove}
            onAddTask={handleAddTask}
            onOpenTask={handleOpenTask}
            onCompleteTask={handleCompleteTask}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <ProjectTaskListTab
            tasks={tasks}
            isLoading={tasksQ.isLoading}
            onOpenTask={handleOpenTask}
            onCompleteTask={handleCompleteTask}
          />
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <ProjectOverviewTab project={project} overdueCount={overdueCount} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
