"use client";

/**
 * RecentEntriesGroup — 搜尋結果群組
 * 使用 GET /api/v1/entries?q=...&per_page=10，每組最多顯示 5 筆。
 * API 失敗時顯示「搜尋暫時不可用」，其他群組不受影響。
 */

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText, AlertCircle } from "lucide-react";
import {
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { apiClient } from "@/lib/api/client";
import type { ListEntriesResponse, EntryListItem } from "@/lib/api/entries";

interface RecentEntriesGroupProps {
  query: string;
  onSelect: () => void;
}

const MAX_RESULTS = 5;

export function RecentEntriesGroup({ query, onSelect }: RecentEntriesGroupProps) {
  const router = useRouter();

  const { data, isError } = useQuery<ListEntriesResponse>({
    queryKey: ["cmdk-entries", query],
    queryFn: () =>
      apiClient.get<ListEntriesResponse>(
        `/api/v1/entries?q=${encodeURIComponent(query)}&per_page=10`,
      ),
    enabled: query.length >= 2,
    staleTime: 30_000,
    retry: false,
  });

  const entries: EntryListItem[] = (data?.data ?? []).slice(0, MAX_RESULTS);

  // query 不足 2 字元時不顯示此群組
  if (query.length < 2) return null;

  return (
    <CommandGroup heading="Recent Entries">
      {isError ? (
        <div className="flex items-center gap-2 px-2 py-3 text-sm text-[--fg-muted]">
          <AlertCircle className="h-4 w-4 shrink-0 text-[--tok-warning]" />
          搜尋暫時不可用
        </div>
      ) : entries.length === 0 ? (
        <div className="px-2 py-3 text-sm text-[--fg-muted]">找不到相關 entry</div>
      ) : (
        entries.map((entry) => (
          <CommandItem
            key={entry.id}
            value={`entry-${entry.id}-${entry.title ?? entry.id}`}
            onSelect={() => {
              router.push(`/library/${entry.id}`);
              onSelect();
            }}
          >
            <FileText className="mr-2 h-4 w-4 text-[--fg-subtle]" />
            <span className="truncate">{entry.title ?? "(無標題)"}</span>
          </CommandItem>
        ))
      )}
    </CommandGroup>
  );
}
