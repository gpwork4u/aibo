/**
 * Calendar Day Detail API client（F-027c）。
 *
 *   - GET  /api/v1/calendar/days/:date           → fetchCalendarDay
 *   - POST /api/v1/calendar/events/:gcal_id/to-entry → convertEventToEntry
 *
 * 設計與 `calendar.ts` 一致：直接使用 fetch 以便讀取 header（如 `X-Degraded`）。
 */

import { ApiError, API_KEY_STORAGE, UNAUTHORIZED_EVENT } from "./client";
import type {
  CalendarEntrySummary,
  CalendarEventSummary,
  CalendarJournal,
} from "./calendar";

export interface CalendarDayResponse {
  date: string;
  entries: CalendarEntrySummary[];
  events: CalendarEventSummary[];
  journal: CalendarJournal | null;
  gcal_connected: boolean;
  degraded: boolean;
}

export interface FetchCalendarDayResult {
  data: CalendarDayResponse;
  /** 回傳 header `X-Degraded` 的值（若有，例如 "gcal"）。 */
  degradedHeader: string | null;
}

export interface ConvertEventToEntryBody {
  calendar_id?: string;
  title_override?: string;
  content_override?: string;
}

/**
 * 轉換 API 成功回傳的 entry（只列出 frontend 會用到的欄位）。
 * 後端會回完整 Entry，但這裡不綁死欄位集。
 */
export interface ConvertEventToEntryResult {
  id: string;
  title?: string | null;
  summary?: string | null;
  source_type?: string | null;
  source_ref?: string | null;
  [k: string]: unknown;
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

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * GET /api/v1/calendar/days/:date
 *
 * 成功：回傳 `{ data, degradedHeader }`。
 * 未連 gcal：後端回 200 `gcal_connected=false`（或 header），本函式忠實回傳（UI 端判斷）。
 * 其他非 2xx：拋 ApiError，`status` / `body.code` 供上層 mapping toast 文案。
 */
export async function fetchCalendarDay(
  date: string,
  tz: string,
  opts: { includeGcal?: boolean } = {},
): Promise<FetchCalendarDayResult> {
  const sp = new URLSearchParams();
  if (opts.includeGcal !== undefined) {
    sp.set("include_gcal", String(opts.includeGcal));
  }
  const qs = sp.toString();
  const url =
    `${getBaseUrl()}/api/v1/calendar/days/${encodeURIComponent(date)}` +
    (qs ? `?${qs}` : "");
  const headers = new Headers({ "X-Timezone": tz });
  const key = getApiKey();
  if (key) headers.set("X-API-Key", key);

  const res = await fetch(url, { method: "GET", headers });

  if (res.status === 401) {
    handleUnauthorized();
    const body = await safeJson(res);
    throw new ApiError("Unauthorized", 401, body);
  }

  if (!res.ok) {
    const body = await safeJson(res);
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : res.statusText || `HTTP ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  const degradedHeader = res.headers.get("X-Degraded");
  const raw = (await safeJson(res)) as Partial<CalendarDayResponse> | null;

  // 保底：即使後端缺欄位也保持 UI 穩定
  const data: CalendarDayResponse = {
    date: raw?.date ?? date,
    entries: raw?.entries ?? [],
    events: raw?.events ?? [],
    journal: raw?.journal ?? null,
    gcal_connected:
      typeof raw?.gcal_connected === "boolean" ? raw.gcal_connected : true,
    degraded:
      typeof raw?.degraded === "boolean"
        ? raw.degraded
        : degradedHeader === "gcal",
  };

  return { data, degradedHeader };
}

/**
 * POST /api/v1/calendar/events/:gcal_id/to-entry
 *
 * 錯誤碼（見 F-026c spec）：
 *   - 404 EVENT_NOT_FOUND
 *   - 409 ALREADY_LINKED（body.existing_entry_id 可能存在）
 *   - 424 GCAL_NOT_CONNECTED
 *   - 502 GCAL_UPSTREAM_ERROR
 *
 * 透過 ApiError.status + ApiError.body.code 讓上層 hook 對應 toast 文案。
 */
export async function convertEventToEntry(
  gcalId: string,
  body?: ConvertEventToEntryBody,
): Promise<ConvertEventToEntryResult> {
  const url = `${getBaseUrl()}/api/v1/calendar/events/${encodeURIComponent(gcalId)}/to-entry`;
  const headers = new Headers({ "Content-Type": "application/json" });
  const key = getApiKey();
  if (key) headers.set("X-API-Key", key);

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    handleUnauthorized();
    const errBody = await safeJson(res);
    throw new ApiError("Unauthorized", 401, errBody);
  }

  if (!res.ok) {
    const errBody = await safeJson(res);
    const message =
      errBody && typeof errBody === "object" && "message" in errBody
        ? String((errBody as { message: unknown }).message)
        : res.statusText || `HTTP ${res.status}`;
    throw new ApiError(message, res.status, errBody);
  }

  return ((await safeJson(res)) ?? {}) as ConvertEventToEntryResult;
}

/**
 * 依 `ApiError.body.code` 與 status 回傳對應的 toast 文案。
 *
 * 若無法對應則回傳 null，調用方可用 fallback「轉換失敗」。
 */
export function convertEventErrorMessage(err: unknown): {
  code: string | null;
  message: string;
  existingEntryId?: string | null;
} | null {
  if (!(err instanceof ApiError)) return null;
  const body =
    err.body && typeof err.body === "object"
      ? (err.body as Record<string, unknown>)
      : null;
  const code = body && typeof body.code === "string" ? body.code : null;
  const existingEntryId =
    body && typeof body.existing_entry_id === "string"
      ? (body.existing_entry_id as string)
      : null;

  if (err.status === 409 || code === "ALREADY_LINKED") {
    return {
      code: "ALREADY_LINKED",
      message: "此事件已轉過，重新整理中…",
      existingEntryId,
    };
  }
  if (err.status === 424 || code === "GCAL_NOT_CONNECTED") {
    return {
      code: "GCAL_NOT_CONNECTED",
      message: "請先連接 Google Calendar",
    };
  }
  if (err.status === 502 || code === "GCAL_UPSTREAM_ERROR") {
    return {
      code: "GCAL_UPSTREAM_ERROR",
      message: "Google Calendar 暫時無法存取，請稍後再試",
    };
  }
  if (err.status === 404 || code === "EVENT_NOT_FOUND") {
    return {
      code: "EVENT_NOT_FOUND",
      message: "找不到該事件",
    };
  }
  return { code, message: err.message || "轉換失敗" };
}
