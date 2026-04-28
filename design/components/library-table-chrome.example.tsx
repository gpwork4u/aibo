// LibraryTableChrome 使用範例
// TanStack Table v8 + shadcn/ui Table + 自訂 chrome 樣式

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookmarkPlus,
  Inbox,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// --- Types ---

interface LibraryEntry {
  id: string;
  title: string;
  category: { id: string; name: string } | null;
  tags: string[];
  status: "inbox" | "library" | "archived";
  confidence: number;
  updatedAt: string;
}

interface LibraryTableChromeProps {
  data: LibraryEntry[];
  onEdit?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onBatchArchive?: (ids: string[]) => void;
  onBatchMoveToLibrary?: (ids: string[]) => void;
  onBatchDelete?: (ids: string[]) => void;
  onRowClick?: (id: string) => void;
}

// --- Sub-components ---

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
  if (isSorted === "asc") return <ArrowUp className="ml-1.5 h-3.5 w-3.5" />;
  if (isSorted === "desc") return <ArrowDown className="ml-1.5 h-3.5 w-3.5" />;
  return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />;
}

function ConfidenceCell({ value }: { value: number }) {
  const colorClass =
    value >= 80
      ? "text-green-700 dark:text-green-400"
      : value >= 50
        ? "text-amber-700 dark:text-amber-400"
        : "text-muted-foreground";
  return <span className={cn("text-sm tabular-nums", colorClass)}>{value}</span>;
}

function StatusBadge({ status }: { status: LibraryEntry["status"] }) {
  if (status === "library") return <Badge variant="default" className="text-xs">Library</Badge>;
  if (status === "inbox") return <Badge variant="secondary" className="text-xs">Inbox</Badge>;
  return <Badge variant="outline" className="text-xs text-muted-foreground">Archived</Badge>;
}

function TagsCell({ tags }: { tags: string[] }) {
  const visible = tags.slice(0, 3);
  const overflow = tags.length - 3;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">{tag}</Badge>
      ))}
      {overflow > 0 && (
        <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">+{overflow}</Badge>
      )}
    </div>
  );
}

// --- Sticky Batch Toolbar ---

function BatchToolbar({
  selectedCount,
  onClear,
  onArchive,
  onMoveToLibrary,
  onDelete,
}: {
  selectedCount: number;
  onClear: () => void;
  onArchive: () => void;
  onMoveToLibrary: () => void;
  onDelete: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="批次操作"
      className={cn(
        "sticky top-0 z-10 flex items-center gap-2 px-4 py-2",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "border-b border-border",
        "animate-in slide-in-from-top duration-200"
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        aria-label="Clear selection"
        className="h-8 px-2 text-muted-foreground"
      >
        已選 {selectedCount} 筆 &times;
      </Button>

      <div className="flex items-center gap-1 ml-2">
        <Button variant="outline" size="sm" onClick={onArchive} className="h-8 gap-1.5">
          <Archive className="h-3.5 w-3.5" />
          Archive
        </Button>
        <Button variant="outline" size="sm" onClick={onMoveToLibrary} className="h-8 gap-1.5">
          <BookmarkPlus className="h-3.5 w-3.5" />
          移至 Library
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="h-8 gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          刪除
        </Button>
      </div>
    </div>
  );
}

// --- Empty State ---

function TableEmptyState({ onReset }: { onReset?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Inbox className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
      <p className="text-base font-medium text-foreground">找不到符合條件的項目</p>
      <p className="text-sm text-muted-foreground">嘗試調整篩選條件或搜尋關鍵字</p>
      {onReset && (
        <Button variant="outline" onClick={onReset}>
          重置篩選
        </Button>
      )}
    </div>
  );
}

// --- Main Table Component ---

export function LibraryTableChrome({
  data,
  onEdit,
  onArchive,
  onDelete,
  onBatchArchive,
  onBatchMoveToLibrary,
  onBatchDelete,
  onRowClick,
}: LibraryTableChromeProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const parentRef = useRef<HTMLDivElement>(null);

  const columns: ColumnDef<LibraryEntry>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all entries"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label={`Select ${row.original.title}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 48,
      enableSorting: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <button
          className={cn(
            "flex items-center min-h-[44px] cursor-pointer select-none",
            "hover:text-foreground transition-colors",
            column.getIsSorted() ? "text-foreground font-medium" : "text-muted-foreground"
          )}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          aria-sort={
            column.getIsSorted() === "asc"
              ? "ascending"
              : column.getIsSorted() === "desc"
                ? "descending"
                : "none"
          }
        >
          標題
          <SortIcon isSorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm font-medium line-clamp-1 cursor-pointer hover:underline">
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "分類",
      cell: ({ getValue }) => {
        const cat = getValue() as LibraryEntry["category"];
        return cat ? <Badge variant="secondary" className="text-xs">{cat.name}</Badge> : null;
      },
      enableSorting: false,
    },
    {
      accessorKey: "tags",
      header: "標籤",
      cell: ({ getValue }) => <TagsCell tags={getValue() as string[]} />,
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: "狀態",
      cell: ({ getValue }) => <StatusBadge status={getValue() as LibraryEntry["status"]} />,
      enableSorting: false,
    },
    {
      accessorKey: "confidence",
      header: ({ column }) => (
        <button
          className={cn(
            "flex items-center min-h-[44px] cursor-pointer select-none",
            "hover:text-foreground transition-colors",
            column.getIsSorted() ? "text-foreground font-medium" : "text-muted-foreground"
          )}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          aria-sort={column.getIsSorted() === "asc" ? "ascending" : column.getIsSorted() === "desc" ? "descending" : "none"}
        >
          可信度
          <SortIcon isSorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => <ConfidenceCell value={getValue() as number} />,
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <button
          className={cn(
            "flex items-center min-h-[44px] cursor-pointer select-none",
            "hover:text-foreground transition-colors",
            column.getIsSorted() ? "text-foreground font-medium" : "text-muted-foreground"
          )}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          aria-sort={column.getIsSorted() === "asc" ? "ascending" : column.getIsSorted() === "desc" ? "descending" : "none"}
        >
          更新時間
          <SortIcon isSorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(getValue() as string), { addSuffix: true, locale: zhTW })}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Row actions</span>,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover/row:opacity-100 transition-opacity"
              aria-label="Row actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(row.original.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              編輯
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive?.(row.original.id)}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete?.(row.original.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              刪除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 48,
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  });

  const { rows } = table.getRowModel();
  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 5,
  });

  return (
    <div className="flex flex-col">
      <BatchToolbar
        selectedCount={selectedIds.length}
        onClear={() => setRowSelection({})}
        onArchive={() => onBatchArchive?.(selectedIds)}
        onMoveToLibrary={() => onBatchMoveToLibrary?.(selectedIds)}
        onDelete={() => onBatchDelete?.(selectedIds)}
      />

      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: "calc(100vh - 160px)" }}
      >
        <Table role="grid" aria-label="Library 知識項目">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    scope="col"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    className="bg-background sticky top-0 z-[1]"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <TableEmptyState />
                </TableCell>
              </TableRow>
            ) : (
              <>
                {/* Virtualizer spacer top */}
                {rowVirtualizer.getVirtualItems()[0]?.start > 0 && (
                  <tr style={{ height: rowVirtualizer.getVirtualItems()[0].start }} />
                )}

                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      aria-selected={row.getIsSelected()}
                      className={cn(
                        "group/row cursor-pointer transition-colors duration-100",
                        row.getIsSelected() && "bg-accent/20"
                      )}
                      onClick={() => onRowClick?.(row.original.id)}
                      style={{ height: virtualRow.size }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}

                {/* Virtualizer spacer bottom */}
                {rowVirtualizer.getTotalSize() -
                  (rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0) > 0 && (
                  <tr
                    style={{
                      height:
                        rowVirtualizer.getTotalSize() -
                        (rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0),
                    }}
                  />
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
