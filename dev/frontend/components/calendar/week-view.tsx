"use client";

import * as React from "react";
import { CALENDAR_TESTIDS } from "@/lib/calendar/testids";
import {
  TIME_AXIS_HOUR_PX,
  buildWeekDays,
  eventsIntersectingDay,
  timeAxisHours,
} from "@/lib/calendar/date-utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TimeAxis } from "./time-axis";
import { EventBlock, layoutOverlaps } from "./event-block";
import type {
  CalendarDay,
  CalendarEntrySummary,
  CalendarEventSummary,
} from "@/lib/api/calendar";

export interface WeekViewProps {
  /** 錨點日期（決定顯示哪一週） */
  anchorDate: Date;
  timezone: string;
  /** 今天的 YMD（高亮 column） */
  todayYmd: string;
  /** 當週每日資料 */
  daysMap: Map<string, CalendarDay>;
  /** 使用者選中的 ymd（含在當週內則高亮對應 column） */
  selectedDate?: string;
  onSelectDate: (ymd: string) => void;
  onEventClick?: (event: CalendarEventSummary, ymd: string) => void;
  weekStartsOn?: 0 | 1;
}

const WEEKDAY_LABELS_MON_START = ["一", "二", "三", "四", "五", "六", "日"];
const WEEKDAY_LABELS_SUN_START = ["日", "一", "二", "三", "四", "五", "六"];

export function WeekView({
  anchorDate,
  timezone,
  todayYmd,
  daysMap,
  selectedDate,
  onSelectDate,
  onEventClick,
  weekStartsOn = 1,
}: WeekViewProps) {
  const days = React.useMemo(
    () => buildWeekDays(anchorDate, timezone, weekStartsOn),
    [anchorDate, timezone, weekStartsOn],
  );
  const hours = React.useMemo(timeAxisHours, []);

  return (
    <div
      role="grid"
      aria-label="週視圖時間表"
      data-testid={CALENDAR_TESTIDS.weekView}
      className="flex flex-col overflow-hidden rounded-md border"
    >
      {/* Header */}
      <div
        className="grid border-b bg-muted/30"
        role="row"
        style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}
      >
        <div aria-hidden="true" />
        {days.map((d, idx) => {
          const isToday = d.ymd === todayYmd;
          const isSelected = selectedDate === d.ymd;
          const label =
            (weekStartsOn === 1
              ? WEEKDAY_LABELS_MON_START
              : WEEKDAY_LABELS_SUN_START)[idx];
          const mm = d.date.getUTCMonth() + 1;
          const dd = d.date.getUTCDate();
          return (
            <button
              key={d.ymd}
              type="button"
              role="columnheader"
              aria-pressed={isSelected}
              aria-label={`${d.date.getUTCFullYear()} 年 ${mm} 月 ${dd} 日 星期${label}`}
              data-testid={CALENDAR_TESTIDS.dayCell(d.ymd)}
              data-today={isToday || undefined}
              onClick={() => onSelectDate(d.ymd)}
              className={cn(
                "flex flex-col items-center gap-0.5 border-r py-2 text-xs transition-colors last:border-r-0",
                "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                isSelected && "bg-primary/10",
              )}
            >
              <span className="tabular-nums text-muted-foreground">
                {mm}/{dd}
              </span>
              <span
                className={cn(
                  "font-semibold",
                  isToday &&
                    "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Entries chips lane */}
      <div
        className="grid border-b"
        style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}
      >
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground">條目</div>
        {days.map((d) => (
          <EntriesChipsCell
            key={d.ymd}
            entries={daysMap.get(d.ymd)?.entries ?? []}
          />
        ))}
      </div>

      {/* Time grid (scrollable) */}
      <div className="relative max-h-[calc(100vh-320px)] overflow-y-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))",
            minHeight: hours.length * TIME_AXIS_HOUR_PX,
          }}
        >
          <TimeAxis />
          {days.map((d) => {
            const dayData = daysMap.get(d.ymd);
            const events = dayData?.events ?? [];
            const intersecting = eventsIntersectingDay(events, d.ymd, timezone);
            const placed = layoutOverlaps(intersecting, 3);
            const isToday = d.ymd === todayYmd;
            const isSelected = selectedDate === d.ymd;
            return (
              <div
                key={d.ymd}
                role="gridcell"
                aria-label={`${d.ymd} 時段`}
                className={cn(
                  "relative border-r last:border-r-0",
                  isToday && "bg-primary/5",
                  isSelected && "bg-primary/10",
                )}
                style={{ height: hours.length * TIME_AXIS_HOUR_PX }}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="border-t border-border/60"
                    style={{ height: TIME_AXIS_HOUR_PX }}
                  />
                ))}
                {placed.map((p, i) => (
                  <EventBlock
                    key={`${p.event.gcal_id}-${i}`}
                    event={p.event}
                    clip={p.clip}
                    columnIndex={p.columnIndex}
                    columnCount={p.columnCount}
                    onClick={(ev) => onEventClick?.(ev, d.ymd)}
                    ariaPrefix={`${d.date.getUTCMonth() + 1}/${d.date.getUTCDate()}`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EntriesChipsCell({ entries }: { entries: CalendarEntrySummary[] }) {
  if (entries.length === 0) {
    return <div className="border-r px-1 py-1 last:border-r-0" aria-hidden="true" />;
  }
  const visible = entries.slice(0, 3);
  const overflow = entries.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1 border-r p-1 last:border-r-0">
      {visible.map((e) => (
        <Badge
          key={e.id}
          variant="secondary"
          data-testid={CALENDAR_TESTIDS.entryBadge}
          className="max-w-full truncate text-[10px]"
          title={e.title || "(無標題)"}
        >
          {e.title || "(無標題)"}
        </Badge>
      ))}
      {overflow > 0 && (
        <span
          className="text-[10px] text-muted-foreground"
          data-testid={CALENDAR_TESTIDS.eventOverflowBadge}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
