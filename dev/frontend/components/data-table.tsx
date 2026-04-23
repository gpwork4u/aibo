"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ColumnDef<T> = {
  id: string;
  header: React.ReactNode;
  accessor: (row: T) => React.ReactNode;
  sortKey?: (row: T) => string | number | Date | null | undefined;
  className?: string;
};

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pageSize?: number;
  emptyText?: string;
  rowKey: (row: T, idx: number) => React.Key;
  className?: string;
}

type SortDir = "asc" | "desc" | null;

/**
 * Minimal DataTable with client-side sort + pagination.
 * Wraps <table>; sort is enabled for columns with `sortKey` defined.
 */
export function DataTable<T>({
  data,
  columns,
  pageSize = 10,
  emptyText = "沒有資料",
  rowKey,
  className,
}: DataTableProps<T>) {
  const [sortId, setSortId] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>(null);
  const [page, setPage] = React.useState(0);

  const sorted = React.useMemo(() => {
    if (!sortId || !sortDir) return data;
    const col = columns.find((c) => c.id === sortId);
    if (!col?.sortKey) return data;
    const arr = data.slice();
    arr.sort((a, b) => {
      const va = col.sortKey!(a);
      const vb = col.sortKey!(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [data, columns, sortId, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const toggleSort = (id: string) => {
    if (sortId !== id) {
      setSortId(id);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortId(null);
      setSortDir(null);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted/50 [&_tr]:border-b">
            <tr className="border-b transition-colors">
              {columns.map((col) => {
                const sortable = !!col.sortKey;
                const isSorted = sortId === col.id;
                return (
                  <th
                    key={col.id}
                    className={cn(
                      "h-10 px-3 text-left align-middle font-semibold text-muted-foreground",
                      col.className,
                    )}
                  >
                    {sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => toggleSort(col.id)}
                        aria-label={`依 ${typeof col.header === "string" ? col.header : col.id} 排序`}
                      >
                        {col.header}
                        {isSorted && sortDir === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : isSorted && sortDir === "desc" ? (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                        )}
                      </Button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => (
                <tr
                  key={rowKey(row, idx)}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  {columns.map((col) => (
                    <td key={col.id} className={cn("p-3 align-middle", col.className)}>
                      {col.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="flex items-center justify-between gap-2 py-3 text-sm text-muted-foreground">
          <div>
            共 {sorted.length} 筆，第 {currentPage + 1} / {totalPages} 頁
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              上一頁
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
