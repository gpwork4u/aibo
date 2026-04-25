import { apiClient } from "./client";

export type JournalMood = "great" | "ok" | "down" | string;

export interface SourceRef {
  source_type: "entry" | "gcal_event";
  source_id: string;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string | null;
  content: string;
  mood: string | null;
  highlights: string[];
  is_draft: boolean;
  generated_by: string | null;
  llm_provider_id: string | null;
  source_refs: SourceRef[];
  created_at: string;
  updated_at: string;
}

export interface ListJournalsParams {
  since?: string; // YYYY-MM-DD
  until?: string;
  mood?: string;
  q?: string;
}

export interface ListJournalsResponse {
  data: JournalEntry[];
}

export interface CreateJournalInput {
  date: string;
  title?: string | null;
  content: string;
  mood?: string | null;
  highlights?: string[];
  is_draft?: boolean;
  source_refs?: SourceRef[];
}

export type UpdateJournalInput = Partial<Omit<CreateJournalInput, "date">>;

export interface JournalDraftResponse {
  date: string;
  draft: string;
  used_refs?: string[];
  mood?: string;
  generated_by: string;
}

function buildQuery(params: ListJournalsParams): string {
  const sp = new URLSearchParams();
  if (params.since) sp.set("since", params.since);
  if (params.until) sp.set("until", params.until);
  if (params.mood) sp.set("mood", params.mood);
  if (params.q) sp.set("q", params.q);
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export async function listJournals(
  params: ListJournalsParams = {},
): Promise<ListJournalsResponse> {
  return apiClient.get<ListJournalsResponse>(`/api/v1/journal${buildQuery(params)}`);
}

export async function getJournal(date: string): Promise<JournalEntry> {
  return apiClient.get<JournalEntry>(`/api/v1/journal/${encodeURIComponent(date)}`);
}

export async function createJournal(input: CreateJournalInput): Promise<JournalEntry> {
  return apiClient.post<JournalEntry>("/api/v1/journal", input);
}

export async function updateJournal(
  date: string,
  input: UpdateJournalInput,
): Promise<JournalEntry> {
  return apiClient.patch<JournalEntry>(
    `/api/v1/journal/${encodeURIComponent(date)}`,
    input,
  );
}

export async function deleteJournal(date: string): Promise<void> {
  await apiClient.delete(`/api/v1/journal/${encodeURIComponent(date)}`);
}

export async function draftJournal(
  date: string,
  opts: { tz?: string; calendarId?: string } = {},
): Promise<JournalDraftResponse> {
  const sp = new URLSearchParams();
  if (opts.calendarId) sp.set("calendar_id", opts.calendarId);
  const qs = sp.toString();
  const url = `/api/v1/journal/${encodeURIComponent(date)}/draft${qs ? `?${qs}` : ""}`;
  const headers: Record<string, string> = {};
  if (opts.tz) headers["X-Timezone"] = opts.tz;
  return apiClient.post<JournalDraftResponse>(url, undefined, { headers });
}
