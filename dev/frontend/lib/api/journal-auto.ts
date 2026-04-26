/**
 * Journal auto-generate API client。
 * POST /api/v1/journal/:date/auto — idempotent get-or-create
 */

import { ApiError, API_KEY_STORAGE, UNAUTHORIZED_EVENT } from "./client";

export interface AutoJournalResponse {
  id: string;
  date: string;
  content: string;
  mood?: string | null;
  generated_by: string;
}

function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(API_KEY_STORAGE);
  } catch {
    return null;
  }
}

function getBaseUrl(): string {
  return (
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined) ??
    "http://localhost:8080"
  );
}

export interface AutoJournalErrorBody {
  code?: string;
  message?: string;
}

export async function autoGenerateJournal(
  date: string,
  tz: string,
): Promise<AutoJournalResponse> {
  const url = `${getBaseUrl()}/api/v1/journal/${date}/auto`;
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-Timezone": tz,
  });
  const key = getApiKey();
  if (key) headers.set("X-API-Key", key);

  const res = await fetch(url, { method: "POST", headers });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(API_KEY_STORAGE);
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    throw new ApiError("Unauthorized", 401, null);
  }

  const body = (await safeJson(res)) as AutoJournalResponse | AutoJournalErrorBody | null;

  if (!res.ok) {
    const errBody = body as AutoJournalErrorBody | null;
    throw new ApiError(errBody?.message ?? `HTTP ${res.status}`, res.status, errBody);
  }

  return body as AutoJournalResponse;
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
