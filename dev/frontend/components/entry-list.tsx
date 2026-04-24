"use client";

import * as React from "react";
import Link from "next/link";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EntryRowActions } from "@/components/entry-row-actions";
import type { Category, EntryListItem, ListEntriesResponse } from "@/lib/api/entries";

export interface EntryListProps {
  data: ListEntriesResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  categories: Category[];
  /** 是否顯示「分類」欄（inbox 不顯示） */
  showCategoryColumn?: boolean;
  /** Inbox variant — 動作列重點為「移至分類」 */
  variant?: "default" | "inbox";
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (entry: EntryListItem) => void;
  /** 空狀態自訂渲染（例：Inbox 慶祝版） */
  emptyState?: React.ReactNode;
  /** 搜尋無結果時的訊息 */
  hasActiveSearch?: boolean;
}

export function EntryList({
  data,
  isLoading,
  isError,
  errorMessage,
  categories,
  showCategoryColumn = true,
  variant = "default",
  page,
  onPageChange,
  onEdit,
  emptyState,
  hasActiveSearch = false,
}: EntryListProps) {
  const categoryMap = React.useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  if (isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        載入失敗：{errorMessage ?? "請稍後再試"}
      </div>
    );
  }

  if (isLoading && rows.length === 0) {
    return <ListSkeleton columns={showCategoryColumn ? 5 : 4} />;
  }

  if (!isLoading && rows.length === 0) {
    if (hasActiveSearch) {
      return (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          找不到符合的條目
        </div>
      );
    }
    return <>{emptyState}</>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted/50 [&_tr]:border-b">
            <tr className="border-b">
              <th className="h-10 px-3 text-left align-middle font-semibold text-muted-foreground">
                標題
              </th>
              {showCategoryColumn && (
                <th className="h-10 w-[140px] px-3 text-left align-middle font-semibold text-muted-foreground">
                  分類
                </th>
              )}
              <th className="hidden h-10 w-[200px] px-3 text-left align-middle font-semibold text-muted-foreground sm:table-cell">
                Tags
              </th>
              <th className="h-10 w-[140px] px-3 text-left align-middle font-semibold text-muted-foreground">
                {variant === "inbox" ? "建立時間" : "更新時間"}
              </th>
              <th className="h-10 w-[100px] px-3 text-right align-middle font-semibold text-muted-foreground">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {rows.map((entry) => {
              const cat = entry.category_id ? categoryMap.get(entry.category_id) : null;
              const showTags = entry.tags.slice(0, 3);
              const moreTagCount = Math.max(0, entry.tags.length - 3);
              const timeValue = variant === "inbox" ? entry.created_at : entry.updated_at;
              return (
                <tr
                  key={entry.id}
                  className="border-b transition-colors hover:bg-muted/50"
                  data-testid="entry-row"
                >
                  <td className="p-3 align-middle">
                    <Link
                      href={`/entries/${entry.id}`}
                      className="block max-w-[36ch] truncate hover:underline"
                      data-testid="entry-title-or-preview"
                    >
                      {entry.title ? (
                        <span className="font-medium">{entry.title}</span>
                      ) : (
                        <span className="italic text-muted-foreground">
                          {entry.content_preview ?? "(無內容)"}
                        </span>
                      )}
                    </Link>
                  </td>
                  {showCategoryColumn && (
                    <td className="p-3 align-middle">
                      {cat ? (
                        <Badge variant="secondary">{cat.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  <td className="hidden p-3 align-middle sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {showTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {moreTagCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          +{moreTagCount}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 align-middle text-xs text-muted-foreground">
                    {formatRelativeTime(timeValue)}
                  </td>
                  <td className="p-3 align-middle">
                    <EntryRowActions
                      entry={entry}
                      onEdit={() => onEdit(entry)}
                      variant={variant}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total_pages > 1 && (
        <div
          className={cn(
            "flex items-center justify-between gap-2 text-sm text-muted-foreground",
            isLoading && "opacity-60",
          )}
        >
          <div>
            共 {pagination.total} 筆，第 {pagination.page} / {pagination.total_pages} 頁
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              上一頁
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.total_pages || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ListSkeleton({ columns }: { columns: number }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="border-b bg-muted/50 p-3">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-3 p-3">
            <Skeleton className="col-span-5 h-4" />
            {columns >= 5 && <Skeleton className="col-span-2 hidden h-4 sm:block" />}
            <Skeleton className="col-span-3 h-4" />
            <Skeleton className="col-span-2 h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
