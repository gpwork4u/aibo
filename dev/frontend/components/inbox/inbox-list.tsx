"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { InboxCard } from "./inbox-card";
import type { EntryListItem } from "@/lib/api/entries";

export interface InboxListProps {
  entries: EntryListItem[];
  isLoading?: boolean;
  selectedIds: Set<string>;
  focusedId: string | null;
  classifyingIds?: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onFocus: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (entry: EntryListItem) => void;
  onShiftClick?: (id: string) => void;
}

export function InboxList({
  entries,
  isLoading,
  selectedIds,
  focusedId,
  classifyingIds,
  onSelect,
  onFocus,
  onArchive,
  onDelete,
  onEdit,
  onShiftClick,
}: InboxListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="inbox-list-loading">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-lg border p-4">
            <Skeleton className="h-4 w-4 flex-shrink-0 rounded mt-0.5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      className="space-y-2"
      data-testid="inbox-list"
      role="list"
      aria-label="Inbox entries"
    >
      {entries.map((entry) => (
        <InboxCard
          key={entry.id}
          entry={entry}
          isSelected={selectedIds.has(entry.id)}
          isFocused={focusedId === entry.id}
          isClassifying={classifyingIds?.has(entry.id)}
          onSelect={onSelect}
          onFocus={onFocus}
          onArchive={onArchive}
          onDelete={onDelete}
          onEdit={onEdit}
          onShiftClick={onShiftClick}
        />
      ))}
    </div>
  );
}
