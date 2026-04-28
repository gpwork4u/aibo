"use client";

import * as React from "react";
import { Archive, Trash2, CheckSquare, Square, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export type InboxFilter = "all" | "today";

export interface InboxToolbarProps {
  totalCount: number;
  selectedCount: number;
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchArchive: () => void;
  onBatchDelete: () => void;
  isBatchLoading?: boolean;
}

export function InboxToolbar({
  totalCount,
  selectedCount,
  filter,
  onFilterChange,
  onSelectAll,
  onClearSelection,
  onBatchArchive,
  onBatchDelete,
  isBatchLoading,
}: InboxToolbarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 過濾器 */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={filter}
          onValueChange={(v) => onFilterChange(v as InboxFilter)}
        >
          <SelectTrigger className="h-8 w-[120px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="today">Today</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 計數 */}
      <Badge variant="secondary" className="text-xs">
        {totalCount} items
      </Badge>

      <div className="flex-1" />

      {/* 批次操作區 */}
      {hasSelection ? (
        <>
          <span className="text-xs text-muted-foreground">
            {selectedCount} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onClearSelection}
          >
            <Square className="h-3.5 w-3.5" />
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onBatchArchive}
            disabled={isBatchLoading}
          >
            <Archive className="h-3.5 w-3.5" />
            Archive ({selectedCount})
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
            onClick={onBatchDelete}
            disabled={isBatchLoading}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete ({selectedCount})
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground"
            onClick={onSelectAll}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Select all
          </Button>
          {/* 鍵盤提示 */}
          <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Kbd>J</Kbd>/<Kbd>K</Kbd>
            <span>navigate</span>
            <Kbd>A</Kbd>
            <span>archive</span>
            <Kbd>D</Kbd>
            <span>delete</span>
          </div>
        </>
      )}
    </div>
  );
}
