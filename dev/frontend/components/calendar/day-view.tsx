"use client";

import * as React from "react";
import { CALENDAR_TESTIDS } from "@/lib/calendar/testids";
import {
  TIME_AXIS_HOUR_PX,
  eventsIntersectingDay,
  formatDayTitle,
  formatYmd,
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

export interface DayViewProps {
  anchorDate: Date;
  timezone: string;
  todayYmd: string;
  day?: CalendarDay;
  selectedDate?: string;
  onSelectDate?: (ymd: string) => void;
  onEntryClick?: (entry: CalendarEntrySummary) => void;
  onEventClick?: (event: CalendarEventSummary, ymd: string) => void;
}

export function DayView({
  anchorDate,
  timezone,
  todayYmd,
  day,
  selectedDate,
  onSelectDate,
  onEntryClick,
  onEventClick,
}: DayViewProps) {
  const ymd = React.useMemo(
    () => formatYmd(anchorDate, timezone),
    [anchorDate, timezone],
  );
  const isToday = ymd === todayYmd;
  const title = React.useMemo(
    () => formatDayTitle(anchorDate, timezone),
    [anchorDate, timezone],
  );
  const hours = React.useMemo(timeAxisHours, []);
  const entries = day?.entries ?? [];
  const events = day?.events ?? [];

  const placed = React.useMemo(() => {
    const intersect = eventsIntersectingDay(events, ymd, timezone);
    return layoutOverlaps(intersect, 3);
  }, [events, ymd, timezone]);

  // 若 caller 有提供 onSelectDate 且目前選取不同於本日，自動同步
  React.useEffect(() => {
    if (onSelectDate && selectedDate !== ymd) {
      // 不在 render 內直接呼叫，避免無限循環；這裡不主動 push（由 caller 控制）
    }
  }, [onSelectDate, selectedDate, ymd]);

  return (
    <section
      data-testid={CALENDAR_TESTIDS.dayView}
      aria-label={`${title} 單日視圖`}
      className="flex flex-col gap-3"
    >
      {/* Day Header */}
      <div
        className={cn(
          "flex items-start justify-between rounded-md border px-4 py-3",
          isToday && "border-primary/40 bg-primary/5",
        )}
        data-testid={CALENDAR_TESTIDS.dayCell(ymd)}
        data-today={isToday || undefined}
      >
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            共 {entries.length} 條目 · {events.length} 事件
            {day?.has_journal && " · 有日記"}
          </p>
        </div>
      </div>

      {/* Entries 列表 */}
      {entries.length > 0 && (
        <div className="rounded-md border p-3">
          <h3 className="mb-2 text-sm font-medium">今日條目（{entries.length}）</h3>
          <ul className="flex flex-col gap-1.5">
            {entries.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  data-testid={CALENDAR_TESTIDS.entryBadge}
                  onClick={onEntryClick ? () => onEntryClick(e) : undefined}
                  className={cn(
                    "w-full rounded-sm px-2 py-1.5 text-left text-sm",
                    "hover:bg-muted/60",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <span className="truncate font-medium">
                    {e.title || e.summary || "(無標題)"}
                  </span>
                  {e.tags.length > 0 && (
                    <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                      {e.tags.slice(0, 3).map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {t}
                        </Badge>
                      ))}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Time grid */}
      <div
        role="grid"
        aria-label="單日時間軸"
        className="relative max-h-[60vh] overflow-y-auto rounded-md border"
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: "56px 1fr",
            minHeight: hours.length * TIME_AXIS_HOUR_PX,
          }}
        >
          <TimeAxis />
          <div
            className={cn(
              "relative",
              isToday && "bg-primary/5",
            )}
            role="gridcell"
            aria-label={`${ymd} 時段`}
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
                onClick={(ev) => onEventClick?.(ev, ymd)}
              />
            ))}
            {placed.length === 0 && entries.length === 0 && (
              <div className="pointer-events-none absolute inset-x-0 top-8 text-center text-sm text-muted-foreground">
                今天還沒有任何紀錄
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
