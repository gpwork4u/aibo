"use client";

/**
 * F-046 useEntryLinks
 * TanStack Query: 查詢 + 樂觀更新 mutations
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEntryLink,
  deleteEntryLink,
  EntryLink,
  EntryLinksResponse,
  getEntryLinks,
  updateEntryLink,
  CreateEntryLinkInput,
  UpdateEntryLinkInput,
} from "@/lib/api/entry-links";
import { toast } from "sonner";

export const entryLinksQueryKey = (entryId: string) =>
  ["entry-links", entryId] as const;

export function useEntryLinks(entryId: string | null | undefined) {
  return useQuery<EntryLinksResponse>({
    queryKey: entryLinksQueryKey(entryId ?? ""),
    queryFn: () => getEntryLinks(entryId as string),
    enabled: !!entryId,
  });
}

/** 新增連結（帶樂觀更新） */
export function useCreateEntryLink(entryId: string) {
  const qc = useQueryClient();
  const key = entryLinksQueryKey(entryId);

  return useMutation({
    mutationFn: (input: CreateEntryLinkInput) => createEntryLink(entryId, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<EntryLinksResponse>(key);

      // 樂觀更新：插入暫時 chip
      const optimistic: EntryLink = {
        id: `optimistic-${Date.now()}`,
        from_id: entryId,
        to_id: input.to_id,
        link_type: input.link_type,
        relation: input.relation ?? null,
        confidence: 1,
        source: "manual",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      qc.setQueryData<EntryLinksResponse>(key, (old) => ({
        outgoing: [...(old?.outgoing ?? []), optimistic],
        incoming: old?.incoming ?? [],
      }));

      return { previous };
    },
    onError: (_err, _input, ctx) => {
      // rollback
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      toast.error("Failed to add link");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** 更新連結 */
export function useUpdateEntryLink(entryId: string) {
  const qc = useQueryClient();
  const key = entryLinksQueryKey(entryId);

  return useMutation({
    mutationFn: ({ linkId, input }: { linkId: string; input: UpdateEntryLinkInput }) =>
      updateEntryLink(linkId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
    },
    onError: () => {
      toast.error("Failed to update link");
    },
  });
}

/** 刪除連結 */
export function useDeleteEntryLink(entryId: string) {
  const qc = useQueryClient();
  const key = entryLinksQueryKey(entryId);

  return useMutation({
    mutationFn: (linkId: string) => deleteEntryLink(linkId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
    },
    onError: () => {
      toast.error("Failed to delete link");
    },
  });
}
