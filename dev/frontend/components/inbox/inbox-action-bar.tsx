"use client";

import * as React from "react";
import { Archive, Trash2, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export interface InboxActionBarProps {
  focusedId: string | null;
  isClassifying?: boolean;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onClassify: (id: string) => void;
  className?: string;
}

/**
 * InboxActionBar - 底部操作列，顯示當前 focused entry 的快速操作
 * 只在有 focusedId 時顯示
 */
export function InboxActionBar({
  focusedId,
  isClassifying,
  onArchive,
  onDelete,
  onClassify,
  className,
}: InboxActionBarProps) {
  if (!focusedId) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-background/95 px-4 py-2 shadow-sm backdrop-blur",
        className,
      )}
      data-testid="inbox-action-bar"
    >
      <span className="text-xs font-medium text-muted-foreground">
        Actions:
      </span>

      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => onArchive(focusedId)}
        title="Archive (A)"
      >
        <Archive className="h-3.5 w-3.5" />
        Archive
        <Kbd className="ml-0.5 text-[10px]">A</Kbd>
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => onClassify(focusedId)}
        disabled={isClassifying}
        title="Classify with LLM"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {isClassifying ? "Classifying..." : "Classify"}
      </Button>

      <Separator orientation="vertical" className="h-5" />

      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive"
        onClick={() => onDelete(focusedId)}
        title="Delete (D)"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
        <Kbd className="ml-0.5 text-[10px]">D</Kbd>
      </Button>
    </div>
  );
}
