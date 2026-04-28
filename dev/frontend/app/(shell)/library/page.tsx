"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { listEntries, batchEntries, deleteEntry, type EntryListItem } from "@/lib/api/entries";
import { LibraryTable } from "@/components/library/library-table";
import { LibraryToolbar } from "@/components/library/library-toolbar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// nuqs URL state
function useLibraryParams() {
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const [status, setStatus] = useQueryState("status", parseAsString.withDefault("library"));
  const [sort, setSort] = useQueryState("sort", parseAsString.withDefault("updated_at"));
  const [dir, setDir] = useQueryState("dir", parseAsString.withDefault("desc"));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  return { q, setQ, status, setStatus, sort, setSort, dir, setDir, page, setPage };
}

function EntryDetailSheet({
  entry,
  open,
  onClose,
}: {
  entry: EntryListItem | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!entry) return null;
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{entry.title ?? "(無標題)"}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {entry.lifecycle_status && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">狀態</span>
              <Badge variant="secondary">{entry.lifecycle_status}</Badge>
            </div>
          )}
          {entry.content_preview && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {entry.content_preview}
              </p>
            </>
          )}
          {entry.tags.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-1">
                {entry.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </>
          )}
          <Separator />
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="block font-medium">信心度</span>
              {Math.round(entry.confidence * 100)}%
            </div>
            <div>
              <span className="block font-medium">更新時間</span>
              {new Date(entry.updated_at).toLocaleString("zh-TW")}
            </div>
            <div>
              <span className="block font-medium">建立時間</span>
              {new Date(entry.created_at).toLocaleString("zh-TW")}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PaginationBar({
  page,
  total,
  perPage,
  onPageChange,
}: {
  page: number;
  total: number;
  perPage: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between py-3 text-sm text-muted-foreground">
      <span>
        {total > 0 ? `${from}-${to} of ${total}` : "0 筆"}
      </span>
      <div className="flex gap-2">
        <button
          className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-muted"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          上一頁
        </button>
        <span className="px-2 py-1">
          {page} / {totalPages}
        </span>
        <button
          className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-muted"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          下一頁
        </button>
      </div>
    </div>
  );
}

const PER_PAGE = 20;

export default function LibraryPage() {
  const qc = useQueryClient();
  const { q, setQ, status, setStatus, sort, setSort, dir, setDir, page, setPage } =
    useLibraryParams();

  const [selectedEntry, setSelectedEntry] = React.useState<EntryListItem | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const queryParams = {
    q: q || undefined,
    status: status || undefined,
    sort: sort,
    order: (dir as "asc" | "desc"),
    page,
    per_page: PER_PAGE,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["entries", "library", queryParams],
    queryFn: () =>
      listEntries({
        search: queryParams.q,
        status: queryParams.status,
        sort: queryParams.sort,
        order: queryParams.order,
        page: queryParams.page,
        per_page: queryParams.per_page,
      }),
  });

  const entries: EntryListItem[] = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;

  const archiveMut = useMutation({
    mutationFn: (id: string) => batchEntries({ ids: [id], action: "archive" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries", "library"] }),
  });
  const deleteMut = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries", "library"] }),
  });

  const handleSortChange = React.useCallback(
    (newSort: string, newDir: "asc" | "desc") => {
      setSort(newSort);
      setDir(newDir);
      setPage(1);
    },
    [setSort, setDir, setPage]
  );

  const handleQChange = React.useCallback(
    (v: string) => {
      setQ(v || null);
      setPage(1);
    },
    [setQ, setPage]
  );

  const handleStatusChange = React.useCallback(
    (v: string) => {
      setStatus(v || null);
      setPage(1);
    },
    [setStatus, setPage]
  );

  const handleRowClick = React.useCallback((item: EntryListItem) => {
    setSelectedEntry(item);
    setSheetOpen(true);
  }, []);

  return (
    <div className="flex flex-col gap-2 p-6">
      <h1 className="text-xl font-semibold">Library</h1>

      <LibraryToolbar
        q={q}
        onQChange={handleQChange}
        sortBy={sort}
        onSortByChange={(v) => handleSortChange(v, dir as "asc" | "desc")}
        sortDir={dir as "asc" | "desc"}
        onSortDirChange={(v) => handleSortChange(sort, v)}
        statusFilter={status}
        onStatusFilterChange={handleStatusChange}
        totalCount={total}
        filteredCount={entries.length}
      />

      <LibraryTable
        data={entries}
        isLoading={isLoading}
        sortBy={sort}
        sortDir={dir as "asc" | "desc"}
        onSortChange={handleSortChange}
        onEdit={(id) => {
          const entry = entries.find((e) => e.id === id);
          if (entry) {
            setSelectedEntry(entry);
            setSheetOpen(true);
          }
        }}
        onArchive={(id) => archiveMut.mutate(id)}
        onDelete={(id) => deleteMut.mutate(id)}
        onRowClick={handleRowClick}
      />

      <PaginationBar
        page={page}
        total={total}
        perPage={PER_PAGE}
        onPageChange={(p) => setPage(p)}
      />

      <EntryDetailSheet
        entry={selectedEntry}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
