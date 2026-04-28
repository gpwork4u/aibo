/**
 * F-046 Entry Links API
 * 對應 F-044 後端 /api/v1/entries/:id/links 端點
 */
import { apiClient } from "./client";

export type LinkType =
  | "derives_from"
  | "contradicts"
  | "duplicate_of"
  | "references"
  | "supersedes"
  | "related_to";

export type LinkSource = "manual" | "llm";

export interface EntryLink {
  id: string;
  from_id: string;
  to_id: string;
  link_type: LinkType;
  relation: string | null;
  confidence: number;
  source: LinkSource;
  created_at: string;
  updated_at: string;
  /** 展開的對端 entry 資訊（由後端回傳） */
  from_entry?: { id: string; title: string | null };
  to_entry?: { id: string; title: string | null };
}

export interface EntryLinksResponse {
  outgoing: EntryLink[];
  incoming: EntryLink[];
}

export interface CreateEntryLinkInput {
  to_id: string;
  link_type: LinkType;
  relation?: string | null;
}

export interface UpdateEntryLinkInput {
  link_type?: LinkType;
  relation?: string | null;
}

/** GET /api/v1/entries/:id/links */
export async function getEntryLinks(entryId: string): Promise<EntryLinksResponse> {
  return apiClient.get<EntryLinksResponse>(`/api/v1/entries/${entryId}/links`);
}

/** POST /api/v1/entries/:id/links */
export async function createEntryLink(
  entryId: string,
  input: CreateEntryLinkInput,
): Promise<EntryLink> {
  return apiClient.post<EntryLink>(`/api/v1/entries/${entryId}/links`, input);
}

/** PATCH /api/v1/entries/links/:link_id */
export async function updateEntryLink(
  linkId: string,
  input: UpdateEntryLinkInput,
): Promise<EntryLink> {
  return apiClient.patch<EntryLink>(`/api/v1/entries/links/${linkId}`, input);
}

/** DELETE /api/v1/entries/links/:link_id */
export async function deleteEntryLink(linkId: string): Promise<void> {
  await apiClient.delete(`/api/v1/entries/links/${linkId}`);
}
