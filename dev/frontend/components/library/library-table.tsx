"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MoreHorizontal, ArrowUp, ArrowDown, ArrowUpDown, Pencil, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { EntryListItem } from "@/lib/api/entries";
import { cn } from "@/lib/utils";

interface LibraryTableProps {
  data: EntryListItem[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRowClick?: (item: EntryListItem) => void;
  /** 外部控制的排序（配合 URL state） */
  sortBy: string;
  sortDir: "asc" | "desc";
  onSortChange: (sortBy: string, sortDir: "asc" | "desc") => void;
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
  return dir === "asc"
    ? <ArrowUp className="ml-1 h-3 w-3" />
    : <ArrowDown className="ml-1 h-3 w-3" />;
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const variant =
    pct >= 80 ? "default" : pct >= 50 ? "secondary" : "outline";
  return <Badge variant={variant}>{pct}%</Badge>;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const map: Record<string, string> = {
    library: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  const label: Record<string, string> = {
    library: "Library",
    draft: "Inbox",
    archived: "封存",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        map[status] ?? "bg-gray-100 text-gray-600"
      )}
    >
      {label[status] ?? status}
    </span>
  );
}

export function LibraryTable({
  data,
  isLoading,
  onEdit,
  onArchive,
  onDelete,
  onRowClick,
  sortBy,
  sortDir,
  onSortChange,
}: LibraryTableProps) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  // TanStack sorting state — sync with external sort props
  const sorting: SortingState = [{ id: sortBy, desc: sortDir === "desc" }];

  const columns = React.useMemo<ColumnDef<EntryListItem>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="全選"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
            aria-label="選取此列"
          />
        ),
        enableSorting: false,
        size: 40,
      },
      {
        accessorKey: "title",
        id: "title",
        header: "標題",
        cell: ({ row }) => (
          <span className="font-medium line-clamp-1">
            {row.original.title ?? "(無標題)"}
          </span>
        ),
        size: 300,
      },
      {
        accessorKey: "lifecycle_status",
        id: "lifecycle_status",
        header: "狀態",
        cell: ({ row }) => <StatusBadge status={row.original.lifecycle_status} />,
        enableSorting: false,
        size: 100,
      },
      {
        accessorKey: "tags",
        id: "tags",
        header: "標籤",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {row.original.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-xs">
                {t}
              </Badge>
            ))}
            {row.original.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{row.original.tags.length - 3}
              </Badge>
            )}
          </div>
        ),
        enableSorting: false,
        size: 200,
      },
      {
        accessorKey: "confidence",
        id: "confidence",
        header: "信心度",
        cell: ({ row }) => <ConfidenceBadge value={row.original.confidence} />,
        size: 90,
      },
      {
        accessorKey: "updated_at",
        id: "updated_at",
        header: "更新時間",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {new Date(row.original.updated_at).toLocaleDateString("zh-TW")}
          </span>
        ),
        size: 110,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
                aria-label="操作"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(row.original.id);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                編輯
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive?.(row.original.id);
                }}
              >
                <Archive className="mr-2 h-4 w-4" />
                封存
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(row.original.id);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                刪除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
        size: 48,
      },
    ],
    [onEdit, onArchive, onDelete]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
    manualSorting: true, // 排序由外部 API 處理
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      if (next.length > 0) {
        onSortChange(next[0].id, next[0].desc ? "desc" : "asc");
      }
    },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = React.useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - virtualRows[virtualRows.length - 1].end
      : 0;

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border flex items-center justify-center h-48 text-muted-foreground">
        沒有找到符合條件的項目
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      {/* 表頭 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className={cn(
                        "px-3 py-2 text-left font-medium text-muted-foreground",
                        canSort && "cursor-pointer select-none hover:text-foreground"
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <SortIcon
                            active={!!sorted}
                            dir={sorted === "asc" ? "asc" : "desc"}
                          />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
        </table>
      </div>

      {/* 虛擬滾動表身 */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        <table className="w-full text-sm">
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: paddingTop }} />
              </tr>
            )}
            {virtualRows.map((vRow) => {
              const row = rows[vRow.index];
              return (
                <tr
                  key={row.id}
                  data-row-index={vRow.index}
                  className={cn(
                    "group border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors",
                    row.getIsSelected() && "bg-muted"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className="px-3 py-2.5 align-middle"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: paddingBottom }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
