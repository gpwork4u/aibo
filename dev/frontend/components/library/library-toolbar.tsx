"use client";

import * as React from "react";
import { Search, X, ArrowUpDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface LibraryToolbarProps {
  q: string;
  onQChange: (v: string) => void;
  sortBy: string;
  onSortByChange: (v: string) => void;
  sortDir: "asc" | "desc";
  onSortDirChange: (v: "asc" | "desc") => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  totalCount: number;
  filteredCount: number;
}

const SORT_OPTIONS = [
  { value: "updated_at", label: "更新時間" },
  { value: "created_at", label: "建立時間" },
  { value: "title", label: "標題" },
  { value: "confidence", label: "信心度" },
];

const STATUS_OPTIONS = [
  { value: "library", label: "Library" },
  { value: "draft", label: "Inbox" },
  { value: "archived", label: "封存" },
  { value: "", label: "全部" },
];

export function LibraryToolbar({
  q,
  onQChange,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  filteredCount,
}: LibraryToolbarProps) {
  const [inputValue, setInputValue] = React.useState(q);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setInputValue(q);
  }, [q]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onQChange(val);
    }, 300);
  };

  const clearSearch = () => {
    setInputValue("");
    onQChange("");
  };

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? sortBy;
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "全部";

  return (
    <div className="flex flex-wrap items-center gap-3 pb-4">
      {/* 搜尋框 */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜尋 Library..."
          value={inputValue}
          onChange={handleInputChange}
          className="pl-9 pr-8"
          aria-label="搜尋 Library"
        />
        {inputValue && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
            aria-label="清除搜尋"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 狀態過濾 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            {statusLabel}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={statusFilter} onValueChange={onStatusFilterChange}>
            {STATUS_OPTIONS.map((o) => (
              <DropdownMenuRadioItem key={o.value} value={o.value}>
                {o.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 排序 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowUpDown className="h-3 w-3" />
            {sortLabel}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={sortBy} onValueChange={onSortByChange}>
            {SORT_OPTIONS.map((o) => (
              <DropdownMenuRadioItem key={o.value} value={o.value}>
                {o.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={sortDir}
            onValueChange={(v) => onSortDirChange(v as "asc" | "desc")}
          >
            <DropdownMenuRadioItem value="desc">降冪</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="asc">升冪</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 計數 */}
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {q ? (
          <>
            <Badge variant="secondary">{filteredCount}</Badge>
            <span className="ml-1">/ {totalCount} 筆</span>
          </>
        ) : (
          <>{totalCount} 筆</>
        )}
      </span>
    </div>
  );
}
