"use client";

/**
 * EntriesSearchGroup — 即時後端搜尋結果群組（F-049）
 *
 * 業務規則：
 *   - query 3+ 字元才顯示（debounce 已在上層處理，此元件直接接收 debouncedQuery）
 *   - GET /api/v1/entries?q=...&status=library&per_page=5
 *   - API 失敗 → silent fail（不顯示此群組，不影響其他群組）
 *   - 點選結果 → 開啟 EntryDetailSheet（router.push to /library/:id）
 */

import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { apiClient } from "@/lib/api/client";
import type { ListEntriesResponse, EntryListItem } from "@/lib/api/entries";

interface EntriesSearchGroupProps {
  /** debounce 後的搜尋字串，父層負責 debounce 200ms */
  query: string;
  onSelect: () => void;
}

const MAX_RESULTS = 5;

export function EntriesSearchGroup({ query, onSelect }: EntriesSearchGroupProps) {
  const router = useRouter();

  const { data, isError, isFetching } = useQuery<ListEntriesResponse>({
    queryKey: ["cmdk-entries-search", query],
    queryFn: () =>
      apiClient.get<ListEntriesResponse>(
        `/api/v1/entries?q=${encodeURIComponent(query)}&status=library&per_page=5`,
      ),
    enabled: query.length >= 3,
    staleTime: 15_000,
    retry: false,
  });

  // 3 字元以下或 API 錯誤時不顯示群組（silent fail）
  if (query.length < 3 || isError) return null;

  const entries: EntryListItem[] = (data?.data ?? []).slice(0, MAX_RESULTS);

  // 還在 fetching 且沒有舊資料時顯示空 group（避免 layout shift）
  if (isFetching && entries.length === 0) return null;

  if (entries.length === 0) return null;

  return (
    <CommandGroup heading="Search Results">
      {entries.map((entry) => (
        <CommandItem
          key={entry.id}
          value={`search-${entry.id}-${entry.title ?? entry.id}`}
          onSelect={() => {
            router.push(`/library/${entry.id}`);
            onSelect();
          }}
        >
          <FileText className="mr-2 h-4 w-4 text-[--fg-subtle]" />
          <span className="truncate">{entry.title ?? "(無標題)"}</span>
          {entry.content_preview && (
            <span className="ml-2 truncate text-xs text-[--fg-muted]">
              {entry.content_preview}
            </span>
          )}
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
