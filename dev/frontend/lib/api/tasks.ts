import { apiClient } from "./client";
import type {
  TaskPriority,
  TaskStatus,
} from "@/lib/projects/kanban-testids";

export type { TaskPriority, TaskStatus };

export interface TaskRef {
  ref_type: "entry" | "journal" | "gcal_event";
  ref_id: string;
  exists?: boolean;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  position: number;
  refs: TaskRef[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ListTasksResponse {
  data: Task[];
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  position?: number;
  refs?: TaskRef[];
}

/**
 * UpdateTaskInput
 *
 * 後端使用 `**string` 區分「不更動」與「更新為 null」。
 * 前端：欄位省略 = 不更動；明確帶 null = 清空為 NULL。
 */
export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  position?: number;
  refs?: TaskRef[];
}

export async function listTasksByProject(
  projectId: string,
): Promise<ListTasksResponse> {
  return apiClient.get<ListTasksResponse>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/tasks`,
  );
}

export async function createTask(
  projectId: string,
  input: CreateTaskInput,
): Promise<Task> {
  return apiClient.post<Task>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/tasks`,
    input,
  );
}

export async function getTask(id: string): Promise<Task> {
  return apiClient.get<Task>(`/api/v1/tasks/${encodeURIComponent(id)}`);
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<Task> {
  return apiClient.patch<Task>(
    `/api/v1/tasks/${encodeURIComponent(id)}`,
    input,
  );
}

export async function completeTask(id: string): Promise<Task> {
  return apiClient.post<Task>(
    `/api/v1/tasks/${encodeURIComponent(id)}/complete`,
  );
}

export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/tasks/${encodeURIComponent(id)}`);
}

export interface UpcomingTaskItem {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  updated_at: string;
  completed_at: string | null;
}

export interface UpcomingTasksResponse {
  data: UpcomingTaskItem[];
}

export async function listUpcomingTasks(
  days = 7,
): Promise<UpcomingTasksResponse> {
  const sp = new URLSearchParams();
  sp.set("days", String(days));
  return apiClient.get<UpcomingTasksResponse>(
    `/api/v1/tasks/upcoming?${sp.toString()}`,
  );
}
