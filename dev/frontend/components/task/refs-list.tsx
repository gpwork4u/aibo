"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TaskRef } from "@/lib/api/tasks";

interface RefsListProps {
  refs: TaskRef[];
  onRemove: (ref: TaskRef) => void;
}

const REF_TYPE_LABEL: Record<TaskRef["ref_type"], string> = {
  entry: "條目",
  journal: "日記",
  gcal_event: "行事曆",
};

/**
 * RefsList — 顯示 Task 已關聯的 refs 清單。
 *
 * 每一筆顯示：ref_type badge + title/id + 移除按鈕。
 * 若 ref.deleted 為 true，顯示「已刪除」badge。
 *
 * Testid 結構（對齊 fixture TASK_TESTIDS）：
 *   - 外層 li:  data-testid="task-sheet-refs-item"
 *               data-testid="task-sheet-refs-item-{refType}-{refId}"（同元素兩個 testid 用 aria-label 技巧無法；
 *               改用 li 帶 by-id testid，移除按鈕/badge 在 li 內 → scoped getByTestId 可找到）
 */
export function RefsList({ refs, onRemove }: RefsListProps) {
  if (refs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">尚未關聯任何來源</p>
    );
  }

  return (
    <ul className="space-y-1" data-testid="task-sheet-refs-list">
      {refs.map((ref) => (
        <li
          key={`${ref.ref_type}:${ref.ref_id}`}
          className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
          data-testid={`task-sheet-refs-item-${ref.ref_type}-${ref.ref_id}`}
        >
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <Badge variant="outline" className="shrink-0 text-xs">
              {REF_TYPE_LABEL[ref.ref_type]}
            </Badge>
            <span className="truncate text-xs font-medium">
              {ref.title ?? ref.ref_id}
            </span>
            {ref.deleted && (
              <Badge
                variant="destructive"
                className="shrink-0 text-xs"
                data-testid="task-sheet-refs-item-deleted-badge"
              >
                已刪除
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            aria-label="移除關聯"
            onClick={() => onRemove(ref)}
            data-testid="task-sheet-refs-item-remove-button"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
