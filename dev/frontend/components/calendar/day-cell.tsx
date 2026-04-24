"use client";

import * as React from "react";
import { BookOpen, Link as LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CALENDAR_TESTIDS } from "@/lib/calendar/testids";
import { cn } from "@/lib/utils";
import type { CalendarDay, CalendarEventSummary } from "@/lib/api/calendar";

export interface DayCellProps {
  ymd: string;
  /** 顯示的日數（1-31）。 */
  dayNumber: number;
  isOutsideMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  /** 該日的聚合資料（若 undefined 則 entry_count=0, events=[]）。 */
  day?: CalendarDay;
  /** 提供給 aria-label 的完整日期字串，例如「2026 年 4 月 24 日」。 */
  fullDateLabel: string;
  /** tz 用來格式化 event 時間。 */
  timezone: string;
  onSelect: (ymd: string) => void;
}

export function DayCell({
  ymd,
  dayNumber,
  isOutsideMonth,
  isToday,
  isSelected,
  day,
  fullDateLabel,
  timezone,
  onSelect,
}: DayCellProps) {
  const entryCount = day?.entry_count ?? 0;
  const eventCount = day?.event_count ?? 0;
  const events = day?.events ?? [];
  const hasJournal = day?.has_journal ?? false;
  const visibleEvents = events.slice(0, 2);
  const overflow = Math.max(0, eventCount - visibleEvents.length);

  const ariaLabel = `${fullDateLabel}，${entryCount} 筆條目，${eventCount} 筆事件${hasJournal ? "，有日記" : ""}`;

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={ariaLabel}
      aria-selected={isSelected}
      tabIndex={isSelected || isToday ? 0 : -1}
      data-testid={CALENDAR_TESTIDS.dayCell(ymd)}
      data-today={isToday || undefined}
      onClick={() => onSelect(ymd)}
      className={cn(
        "relative flex min-h-[96px] flex-col gap-1 p-1.5 text-left bg-card transition-colors",
        "hover:bg-muted/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        "md:min-h-[112px]",
        isOutsideMonth && "bg-muted/30 text-muted-foreground/60",
        isToday && "ring-1 ring-inset ring-primary/50",
        isSelected && "bg-primary/10 ring-2 ring-inset ring-primary",
      )}
    >
      {/* Header：日期數字 | entry count badge | journal icon */}
      <div className="flex items-center gap-1">
        {isToday ? (
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground"
            data-testid={CALENDAR_TESTIDS.dayCellToday}
          >
            {dayNumber}
          </span>
        ) : (
          <span className="text-xs font-medium tabular-nums">{dayNumber}</span>
        )}
        {entryCount > 0 && (
          <Badge
            variant="secondary"
            className="h-4 rounded-full px-1 text-[10px]"
            data-testid={CALENDAR_TESTIDS.entryBadge}
            aria-label={`${entryCount} 筆條目`}
          >
            {entryCount}
          </Badge>
        )}
        {hasJournal && (
          <BookOpen
            className="h-3 w-3 text-primary"
            aria-hidden="true"
            data-testid={CALENDAR_TESTIDS.journalIcon}
          />
        )}
      </div>

      {/* Event rows（最多 2 列） */}
      <div className="flex flex-col gap-0.5">
        {visibleEvents.map((ev) => (
          <EventChip key={ev.gcal_id} event={ev} timezone={timezone} />
        ))}
        {overflow > 0 && (
          <span
            className="text-[10px] text-muted-foreground"
            data-testid={CALENDAR_TESTIDS.eventOverflowBadge}
          >
            +{overflow} 更多
          </span>
        )}
      </div>
    </button>
  );
}

function EventChip({
  event,
  timezone,
}: {
  event: CalendarEventSummary;
  timezone: string;
}) {
  const startStr = event.all_day ? null : formatTimeShort(event.start, timezone);
  const isLinked = !!event.linked_entry_id;
  return (
    <div
      data-testid={CALENDAR_TESTIDS.eventBadge}
      className={cn(
        "flex items-center gap-1 truncate rounded-sm px-1 py-0.5 text-[11px]",
        isLinked
          ? "border border-success/30 bg-success/10"
          : "border border-dashed border-border bg-muted/60",
      )}
      title={`${startStr ?? "全天"} ${event.summary}`}
    >
      {event.all_day ? (
        <span className="shrink-0 rounded bg-primary/10 px-1 text-[10px] text-primary">
          全天
        </span>
      ) : (
        <span className="shrink-0 tabular-nums text-muted-foreground">{startStr}</span>
      )}
      <span className="truncate">{event.summary}</span>
      {isLinked && <LinkIcon className="h-3 w-3 shrink-0 text-success" />}
    </div>
  );
}

function formatTimeShort(iso: string, tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return fmt.format(new Date(iso));
  } catch {
    return "";
  }
}
