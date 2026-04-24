"use client";

import * as React from "react";
import { Link as LinkIcon } from "lucide-react";
import { CALENDAR_TESTIDS } from "@/lib/calendar/testids";
import {
  clipToAxisPx,
  formatMinutes,
  type EventDayClip,
} from "@/lib/calendar/date-utils";
import { cn } from "@/lib/utils";
import type { CalendarEventSummary } from "@/lib/api/calendar";

export interface EventBlockProps {
  event: CalendarEventSummary;
  clip: EventDayClip;
  /** 該區塊在同時段重疊欄位中的位置（0-based） */
  columnIndex?: number;
  /** 該時段總欄位數（≥1） */
  columnCount?: number;
  onClick?: (event: CalendarEventSummary) => void;
  /** 額外 aria 前綴（例：「4/24 週五 ·」） */
  ariaPrefix?: string;
}

export function EventBlock({
  event,
  clip,
  columnIndex = 0,
  columnCount = 1,
  onClick,
  ariaPrefix,
}: EventBlockProps) {
  const { topPx, heightPx, clippedFromTop } = clipToAxisPx(
    clip.startMin,
    clip.endMin,
  );
  const widthPct = 100 / Math.max(1, columnCount);
  const leftPct = widthPct * columnIndex;
  const isLinked = !!event.linked_entry_id;
  const startStr = formatMinutes(clip.startMin);
  const endStr = formatMinutes(clip.endMin);
  const continues = clip.continuesFromPrev || clip.continuesToNext;

  return (
    <button
      type="button"
      data-testid={CALENDAR_TESTIDS.eventBadge}
      onClick={onClick ? () => onClick(event) : undefined}
      className={cn(
        "absolute flex flex-col gap-0.5 overflow-hidden rounded-sm border px-1.5 py-1 text-left text-[11px]",
        "transition-colors hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isLinked
          ? "border-success/40 bg-success/10"
          : "border-dashed border-border bg-muted/60",
      )}
      style={{
        top: topPx,
        height: heightPx,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
      aria-label={`${ariaPrefix ? ariaPrefix + " " : ""}${event.summary}，${startStr}–${endStr}${clip.continuesFromPrev ? "（前日續）" : ""}${clip.continuesToNext ? "（續至次日）" : ""}${isLinked ? "，已連結條目" : ""}`}
      title={`${startStr}–${endStr} ${event.summary}`}
    >
      <div className="flex items-center gap-1">
        {clippedFromTop || clip.continuesFromPrev ? (
          <span className="shrink-0 rounded bg-primary/10 px-1 text-[9px] text-primary">
            續
          </span>
        ) : (
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {startStr}
          </span>
        )}
        {isLinked && <LinkIcon className="h-3 w-3 shrink-0 text-success" />}
        {continues && !clip.continuesFromPrev && (
          <span className="shrink-0 rounded bg-primary/10 px-1 text-[9px] text-primary">
            續
          </span>
        )}
      </div>
      <span className="truncate font-medium leading-tight">
        {event.summary}
      </span>
    </button>
  );
}

/**
 * 將一組（已被 clip 過的）事件分配到重疊欄位（最多 maxColumns 欄，預設 3）。
 * 用掃描線演算法：若 event 與某欄位最後一件在時間上不重疊（end ≤ next.start），就沿用該欄。
 */
export interface PlacedEvent<T> {
  event: T;
  clip: EventDayClip;
  columnIndex: number;
  columnCount: number;
}

export function layoutOverlaps<T>(
  items: Array<{ event: T; clip: EventDayClip }>,
  maxColumns = 3,
): PlacedEvent<T>[] {
  const columnsEnd: number[] = []; // 每欄目前的結束分鐘
  const placements: PlacedEvent<T>[] = items.map((it) => {
    // 找第一個「已結束」的欄位
    let col = -1;
    for (let i = 0; i < columnsEnd.length; i++) {
      if (columnsEnd[i] <= it.clip.startMin) {
        col = i;
        break;
      }
    }
    if (col === -1) {
      if (columnsEnd.length < maxColumns) {
        col = columnsEnd.length;
        columnsEnd.push(it.clip.endMin);
      } else {
        // 超過最大欄數，強制放最後一欄（視覺上會略為重疊）
        col = maxColumns - 1;
        columnsEnd[col] = Math.max(columnsEnd[col], it.clip.endMin);
      }
    } else {
      columnsEnd[col] = it.clip.endMin;
    }
    return {
      event: it.event,
      clip: it.clip,
      columnIndex: col,
      columnCount: 0, // 先佔位
    };
  });
  const total = Math.max(1, columnsEnd.length);
  return placements.map((p) => ({ ...p, columnCount: total }));
}
