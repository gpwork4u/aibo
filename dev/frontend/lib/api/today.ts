/**
 * Today Dashboard API helpers（F-042）。
 *
 * 全部使用現有 endpoints，無新後端 API：
 *   - GET /api/v1/journal/:date           → today's journal
 *   - GET /api/v1/calendar/days/:date     → today's calendar events
 *   - GET /api/v1/tasks                   → today's pending tasks
 *   - GET /api/v1/entries                 → today's recent entries
 *   - GET /api/v1/integrations/gcal/status → gcal connection status
 */

import { apiClient } from "./client";
import type { JournalEntry } from "./journal";
import type { EntryListItem, ListEntriesResponse } from "./entries";
import type { GcalStatus } from "./gcal-settings";

export type { JournalEntry, EntryListItem, ListEntriesResponse, GcalStatus };

export interface TodayTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TodayTasksResponse {
  data: TodayTask[];
}

export interface TodayCalendarEvent {
  id: string;
  gcal_id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location?: string | null;
  description?: string | null;
  calendar_id: string;
}

export interface TodayCalendarResponse {
  date: string;
  events: TodayCalendarEvent[];
  gcal_connected: boolean;
}

/**
 * 取得今日待辦（status=pending, due_date=today）。
 * 後端 GET /api/v1/tasks 支援 due_date + status 過濾。
 */
export async function listTodayTasks(
  today: string,
): Promise<TodayTasksResponse> {
  const sp = new URLSearchParams();
  sp.set("due_date", today);
  sp.set("status", "pending");
  return apiClient.get<TodayTasksResponse>(
    `/api/v1/tasks?${sp.toString()}`,
  );
}

/**
 * 取得今日 entries（updated_since=today_start, per_page=5）。
 */
export async function listTodayEntries(
  todayStart: string,
): Promise<ListEntriesResponse> {
  const sp = new URLSearchParams();
  sp.set("updated_since", todayStart);
  sp.set("per_page", "5");
  sp.set("sort", "updated_at");
  sp.set("order", "desc");
  return apiClient.get<ListEntriesResponse>(
    `/api/v1/entries?${sp.toString()}`,
  );
}

/**
 * 取得 GCal 連線狀態。
 */
export async function getGcalConnectionStatus(): Promise<GcalStatus> {
  return apiClient.get<GcalStatus>("/api/v1/integrations/gcal/status");
}
