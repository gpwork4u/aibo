"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEntry,
  CreateEntryInput,
  deleteEntry,
  Entry,
  getEntry,
  listEntries,
  ListEntriesParams,
  ListEntriesResponse,
  updateEntry,
  UpdateEntryInput,
} from "@/lib/api/entries";

export { useCategories } from "@/lib/hooks/use-categories";

export const ENTRIES_QUERY_KEY = ["entries"] as const;
export const entryQueryKey = (id: string) => ["entry", id] as const;

export function useEntries(params: ListEntriesParams = {}) {
  return useQuery<ListEntriesResponse>({
    queryKey: [...ENTRIES_QUERY_KEY, params],
    queryFn: () => listEntries(params),
  });
}

export function useEntry(id: string | undefined | null) {
  return useQuery<Entry>({
    queryKey: entryQueryKey(id ?? ""),
    queryFn: () => getEntry(id as string),
    enabled: !!id,
  });
}

export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEntryInput) => createEntry(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["inbox-count"] });
    },
  });
}

export function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEntryInput }) =>
      updateEntry(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: entryQueryKey(variables.id) });
      qc.invalidateQueries({ queryKey: ["inbox-count"] });
    },
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: entryQueryKey(id) });
      qc.invalidateQueries({ queryKey: ["inbox-count"] });
    },
  });
}
