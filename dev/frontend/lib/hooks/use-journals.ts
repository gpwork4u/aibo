"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateJournalInput,
  UpdateJournalInput,
  createJournal,
  deleteJournal,
  draftJournal,
  getJournal,
  listJournals,
  ListJournalsParams,
  ListJournalsResponse,
  JournalEntry,
} from "@/lib/api/journal";

export const JOURNALS_QUERY_KEY = ["journals"] as const;
export const journalKey = (date: string) => ["journal", date] as const;

export function useJournals(params: ListJournalsParams = {}) {
  return useQuery<ListJournalsResponse>({
    queryKey: [...JOURNALS_QUERY_KEY, params],
    queryFn: () => listJournals(params),
  });
}

export function useJournal(date: string | null | undefined) {
  return useQuery<JournalEntry>({
    queryKey: journalKey(date ?? ""),
    queryFn: () => getJournal(date as string),
    enabled: !!date,
  });
}

export function useCreateJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJournalInput) => createJournal(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: JOURNALS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: journalKey(vars.date) });
    },
  });
}

export function useUpdateJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, payload }: { date: string; payload: UpdateJournalInput }) =>
      updateJournalApi(date, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: JOURNALS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: journalKey(vars.date) });
    },
  });
}

// 重新匯出 update 以保留 hook 內 import 簡潔
import { updateJournal as updateJournalApi } from "@/lib/api/journal";

export function useDeleteJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => deleteJournal(date),
    onSuccess: (_data, date) => {
      qc.invalidateQueries({ queryKey: JOURNALS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: journalKey(date) });
    },
  });
}

export function useDraftJournal() {
  return useMutation({
    mutationFn: ({
      date,
      tz,
      calendarId,
    }: {
      date: string;
      tz?: string;
      calendarId?: string;
    }) => draftJournal(date, { tz, calendarId }),
  });
}
