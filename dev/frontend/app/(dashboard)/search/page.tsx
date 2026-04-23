"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, X, Loader2, SlidersHorizontal, AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SearchResultCard } from "@/components/search-result-card";
import { SearchFilters, SearchFiltersValue } from "@/components/search-filters";

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useSearchQuery } from "@/lib/hooks/use-search";
import { SearchMode } from "@/lib/schemas/search";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 從 URL 讀取初始 query
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = React.useState(initialQ);
  const [mode, setMode] = React.useState<SearchMode>("smart");
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState<SearchFiltersValue>({
    categoryId: "",
    tags: [],
    domains: [],
  });
  const [pageCount, setPageCount] = React.useState(1);

  // 500ms debounce
  const debounced = useDebouncedValue(query, 500);
  const trimmed = debounced.trim();

  // URL 同步：debounced value 變動時以 router.replace 更新 ?q=
  React.useEffect(() => {
    const currentQ = searchParams.get("q") ?? "";
    if (trimmed === currentQ) return;
    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
  }, [trimmed, router, searchParams]);

  // 換新 query 時重置分頁
  React.useEffect(() => {
    setPageCount(1);
  }, [trimmed, mode, filters.categoryId, filters.tags, filters.domains]);

  const searchQueryParams = {
    q: trimmed,
    mode,
    categoryId: filters.categoryId || undefined,
    tags: filters.tags,
    domains: filters.domains,
    limit: mode === "simple" ? PAGE_SIZE * pageCount : Math.max(PAGE_SIZE, pageCount * PAGE_SIZE),
    offset: 0,
  };

  const { data, isFetching, isLoading, isError, error } = useSearchQuery(searchQueryParams);

  const results = data?.results ?? [];
  const total = data?.total ?? 0;
  const degraded = data?.degraded ?? false;
  const synonymsUsed = data?.synonyms_used ?? [];

  const canLoadMore =
    mode === "simple" && results.length < total && results.length > 0;

  const hasQuery = trimmed.length > 0;
  const showNoResults = hasQuery && !isLoading && !isFetching && results.length === 0 && !isError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="搜尋"
        description="跨知識庫的全文與語意搜尋"
        action={
          <div
            className="inline-flex overflow-hidden rounded-md border text-sm"
            data-testid="search-mode-toggle"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "smart"}
              data-testid="search-mode-smart"
              className={cn(
                "px-3 py-1.5 transition-colors",
                mode === "smart"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
              onClick={() => setMode("smart")}
            >
              智慧搜尋
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "simple"}
              data-testid="search-mode-simple"
              className={cn(
                "border-l px-3 py-1.5 transition-colors",
                mode === "simple"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
              onClick={() => setMode("simple")}
            >
              簡單搜尋
            </button>
          </div>
        }
      />

      {/* 搜尋框 */}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="輸入關鍵字搜尋知識庫…"
          data-testid="search-input"
          className="h-14 pl-11 pr-24 text-base md:text-lg"
          autoFocus
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {isFetching && hasQuery && (
            <Loader2
              className="h-4 w-4 animate-spin text-muted-foreground"
              data-testid="search-loading"
              aria-label="搜尋中"
            />
          )}
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              data-testid="search-clear-button"
              aria-label="清除搜尋"
              onClick={() => setQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 進階篩選 toggle */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="advanced-filters-toggle"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          進階篩選
          {(filters.categoryId || filters.tags.length || filters.domains.length) ? (
            <Badge variant="secondary" className="ml-2">
              {(filters.categoryId ? 1 : 0) + filters.tags.length + filters.domains.length}
            </Badge>
          ) : null}
        </Button>
        {hasQuery && !isLoading && results.length > 0 && (
          <span className="text-sm text-muted-foreground">
            找到 {total} 筆結果
          </span>
        )}
      </div>

      {showFilters && (
        <SearchFilters value={filters} onChange={setFilters} />
      )}

      {/* Degraded 模式提示 */}
      {degraded && (
        <div
          className="flex items-start gap-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm"
          data-testid="search-degraded-notice"
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
          <div>
            <p className="font-medium">降級模式</p>
            <p className="text-muted-foreground">
              LLM 同義詞擴展暫時不可用，目前僅以原始關鍵字搜尋。
            </p>
          </div>
        </div>
      )}

      {/* 同義詞顯示 */}
      {mode === "smart" && synonymsUsed.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>已擴展同義詞：</span>
          {synonymsUsed.map((s) => (
            <Badge key={s} variant="outline" className="text-[10px]">
              {s}
            </Badge>
          ))}
        </div>
      )}

      {/* 錯誤狀態 */}
      {isError && (
        <EmptyState
          title="搜尋失敗"
          description={(error as Error)?.message ?? "請稍後再試"}
          icon={<AlertTriangle className="h-12 w-12" />}
        />
      )}

      {/* 初始空狀態（尚未輸入） */}
      {!hasQuery && !isError && (
        <div
          className="rounded-md border border-dashed py-16 text-center"
          data-testid="search-hint"
        >
          <SearchIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-base font-medium">輸入關鍵字搜尋知識庫</p>
          <p className="mt-1 text-sm text-muted-foreground">
            系統會自動擴展同義詞並依相關度排序
          </p>
        </div>
      )}

      {/* Loading skeleton（首次載入） */}
      {hasQuery && isLoading && (
        <div className="space-y-3" data-testid="search-skeleton">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* 無結果 */}
      {showNoResults && (
        <div
          className="rounded-md border border-dashed py-12 text-center"
          data-testid="search-no-results"
        >
          <p className="text-base font-semibold">找不到符合的結果</p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>嘗試使用更廣泛或更常見的關鍵字</li>
            <li>檢查關鍵字拼字</li>
            <li>移除進階篩選條件</li>
          </ul>
        </div>
      )}

      {/* 結果列表 */}
      {results.length > 0 && (
        <div className="space-y-3" data-testid="search-results-list">
          {results.map((item) => (
            <SearchResultCard key={item.entry_id} item={item} />
          ))}
        </div>
      )}

      {/* 載入更多（僅 simple mode 支援 offset 分頁） */}
      {canLoadMore && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            data-testid="load-more-button"
            onClick={() => setPageCount((n) => n + 1)}
            disabled={isFetching}
          >
            {isFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                載入中…
              </>
            ) : (
              "載入更多"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
