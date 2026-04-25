"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import {
  CreateJournalInput,
  UpdateJournalInput,
  createJournal,
  deleteJournal,
  draftJournal,
  getJournal,
  listJournals,
  updateJournal,
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

/**
 * 讀取單日日記。
 *
 * 404 是「該日尚未撰寫」的正常狀態（編輯頁打開新一天），需要把錯誤
 * 暴露給 UI 來顯示空表單，但不應 retry / 重複 log。
 */
export function useJournal(date: string | null | undefined) {
  return useQuery<JournalEntry>({
    queryKey: journalKey(date ?? ""),
    queryFn: () => getJournal(date as string),
    enabled: !!date,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
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
      updateJournal(date, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: JOURNALS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: journalKey(vars.date) });
    },
  });
}

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
