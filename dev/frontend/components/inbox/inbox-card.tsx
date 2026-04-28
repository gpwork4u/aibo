"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Archive, Trash2, Edit, Loader2, ExternalLink, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { EntryListItem } from "@/lib/api/entries";

export interface InboxCardProps {
  entry: EntryListItem;
  isSelected: boolean;
  isFocused: boolean;
  isClassifying?: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onFocus: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (entry: EntryListItem) => void;
  onShiftClick?: (id: string) => void;
}

export function InboxCard({
  entry,
  isSelected,
  isFocused,
  isClassifying,
  onSelect,
  onFocus,
  onArchive,
  onDelete,
  onEdit,
  onShiftClick,
}: InboxCardProps) {
  const title = entry.title ?? "(untitled)";
  const preview = entry.content_preview ?? "";
  const createdAt = new Date(entry.created_at);

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey && onShiftClick) {
      onShiftClick(entry.id);
    } else {
      onFocus(entry.id);
    }
  };

  return (
    <div
      data-testid="inbox-card"
      data-entry-id={entry.id}
      className={cn(
        "group relative flex gap-3 rounded-lg border p-4 transition-all",
        "cursor-pointer select-none",
        isFocused
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/50 hover:bg-accent/30",
        isSelected && "bg-blue-50/50 dark:bg-blue-950/20",
      )}
      onClick={handleClick}
    >
      {/* 選取 checkbox */}
      <div
        className="mt-0.5 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(entry.id, !isSelected);
        }}
      >
        <Checkbox
          checked={isSelected}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          aria-label={`Select ${title}`}
        />
      </div>

      {/* 主要內容 */}
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* 標題列 */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-medium leading-tight">
            {title}
          </h3>
          {/* source badge */}
          {entry.source_type && (
            <Badge
              variant="secondary"
              className="flex-shrink-0 text-[10px] leading-tight"
            >
              <ExternalLink className="mr-1 h-2.5 w-2.5" />
              {entry.source_type}
            </Badge>
          )}
        </div>

        {/* 摘要/預覽 */}
        {preview && (
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {preview}
          </p>
        )}

        {/* 標籤列 */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                <Tag className="mr-1 h-2 w-2" />
                {tag}
              </Badge>
            ))}
            {entry.tags.length > 4 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{entry.tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* 底部：時間 + 操作按鈕 */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </span>

          {/* 操作按鈕（hover 或 focused 才顯示） */}
          <div
            className={cn(
              "flex items-center gap-1 transition-opacity",
              isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {isClassifying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Edit (E)"
              onClick={() => onEdit(entry)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Archive (A)"
              onClick={() => onArchive(entry.id)}
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              title="Delete (D)"
              onClick={() => onDelete(entry.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
