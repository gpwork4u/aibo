/**
 * Calendar API client。
 *
 * 為了能讀取 response header（X-Degraded），這裡直接使用 fetch 而非 apiClient.get（apiClient.get
 * 僅回傳 body）。仍共用 apiClient 的 baseURL 與 X-API-Key 取得策略。
 */

import { ApiError, API_KEY_STORAGE, UNAUTHORIZED_EVENT } from "./client";

export type CalendarView = "month" | "week" | "day";

export interface CalendarEntrySummary {
  id: string;
  title: string | null;
  summary: string | null;
  source_type: string | null;
  tags: string[];
  created_at: string;
}

export interface CalendarEventSummary {
  gcal_id: string;
  summary: string;
  start: string;
  end: string;
  all_day: boolean;
  linked_entry_id: string | null;
}

export interface CalendarJournal {
  id: string;
  content?: string | null;
  mood?: string | null;
  generated_by?: string | null;
}

export interface CalendarDay {
  date: string;
  entry_count: number;
  event_count: number;
  has_journal: boolean;
  entries: CalendarEntrySummary[];
  events: CalendarEventSummary[];
  journal?: CalendarJournal | null;
}

export interface CalendarResponse {
  since: string;
  until: string;
  days: CalendarDay[];
}

export interface FetchCalendarParams {
  since: string;
  until: string;
  view: CalendarView;
  include_gcal?: boolean;
  calendar_id?: string;
  tz: string;
}

export interface FetchCalendarResult {
  data: CalendarResponse;
  /** response header `X-Degraded` 的值（若有，例如 "gcal"）。 */
  degraded: string | null;
  /** 若 API 回 424 GCAL_NOT_CONNECTED，則 gcalConnected=false 且 data 為 empty（上層需以 include_gcal=false 重打）。 */
  gcalConnected: boolean;
}

export interface CalendarApiErrorBody {
  code?: string;
  message?: string;
}

function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(API_KEY_STORAGE);
  } catch {
    return null;
  }
}

function handleUnauthorized() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}

function getBaseUrl(): string {
  return (
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL
      : undefined) ?? "http://localhost:8080"
  );
}

/**
 * 取得行事曆彙整資料。
 *
 * 行為：
 *   - 正常：回傳 `{ data, degraded, gcalConnected: true }`（degraded 可能為 "gcal"）
 *   - 424 GCAL_NOT_CONNECTED：不拋錯，回傳 `{ data: emptyEnvelope, gcalConnected: false }`
 *     由上層決定是否再以 include_gcal=false 重打
 *   - 其他非 2xx：拋 ApiError
 */
export async function fetchCalendar(
  params: FetchCalendarParams,
): Promise<FetchCalendarResult> {
  const sp = new URLSearchParams();
  sp.set("since", params.since);
  sp.set("until", params.until);
  sp.set("view", params.view);
  if (params.include_gcal !== undefined) {
    sp.set("include_gcal", String(params.include_gcal));
  }
  if (params.calendar_id) sp.set("calendar_id", params.calendar_id);

  const url = `${getBaseUrl()}/api/v1/calendar?${sp.toString()}`;
  const headers = new Headers({
    "X-Timezone": params.tz,
  });
  const key = getApiKey();
  if (key) headers.set("X-API-Key", key);

  const res = await fetch(url, { method: "GET", headers });

  if (res.status === 401) {
    handleUnauthorized();
    const body = await safeJson(res);
    throw new ApiError("Unauthorized", 401, body);
  }

  if (res.status === 424) {
    const body = (await safeJson(res)) as CalendarApiErrorBody | null;
    if (body?.code === "GCAL_NOT_CONNECTED") {
      return {
        data: {
          since: params.since,
          until: params.until,
          days: [],
        },
        degraded: null,
        gcalConnected: false,
      };
    }
    throw new ApiError(body?.message ?? "Failed dependency", 424, body);
  }

  if (!res.ok) {
    const body = await safeJson(res);
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : res.statusText || `HTTP ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  const degraded = res.headers.get("X-Degraded");
  const data = (await safeJson(res)) as CalendarResponse;
  return { data, degraded, gcalConnected: true };
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
