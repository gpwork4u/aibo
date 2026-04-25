"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateTaskInput,
  ListTasksResponse,
  Task,
  UpdateTaskInput,
  UpcomingTasksResponse,
  completeTask,
  createTask,
  deleteTask,
  getTask,
  listTasksByProject,
  listUpcomingTasks,
  updateTask,
} from "@/lib/api/tasks";
import { projectKey, PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects";

export const tasksKey = (projectId: string) =>
  ["tasks", projectId] as const;
export const taskKey = (id: string) => ["task", id] as const;
export const UPCOMING_TASKS_KEY = ["tasks", "upcoming"] as const;

export function useProjectTasks(projectId: string | null | undefined) {
  return useQuery<ListTasksResponse>({
    queryKey: tasksKey(projectId ?? ""),
    queryFn: () => listTasksByProject(projectId as string),
    enabled: !!projectId,
  });
}

export function useTask(id: string | null | undefined) {
  return useQuery<Task>({
    queryKey: taskKey(id ?? ""),
    queryFn: () => getTask(id as string),
    enabled: !!id,
  });
}

function invalidateTaskQueries(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
) {
  qc.invalidateQueries({ queryKey: tasksKey(projectId) });
  qc.invalidateQueries({ queryKey: projectKey(projectId) });
  qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
  qc.invalidateQueries({ queryKey: UPCOMING_TASKS_KEY });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(projectId, input),
    onSuccess: () => invalidateTaskQueries(qc, projectId),
  });
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      updateTask(id, input),
    onSettled: (_data, _err, vars) => {
      invalidateTaskQueries(qc, projectId);
      if (vars?.id) qc.invalidateQueries({ queryKey: taskKey(vars.id) });
    },
  });
}

export function useCompleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeTask(id),
    onSettled: (_data, _err, id) => {
      invalidateTaskQueries(qc, projectId);
      if (id) qc.invalidateQueries({ queryKey: taskKey(id) });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => invalidateTaskQueries(qc, projectId),
  });
}

export function useUpcomingTasks(days = 7) {
  return useQuery<UpcomingTasksResponse>({
    queryKey: [...UPCOMING_TASKS_KEY, days],
    queryFn: () => listUpcomingTasks(days),
  });
}
