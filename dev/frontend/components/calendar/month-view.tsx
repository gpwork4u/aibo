"use client";

import * as React from "react";
import { DayCell } from "./day-cell";
import { CALENDAR_TESTIDS } from "@/lib/calendar/testids";
import { buildMonthGridDays, formatYmd, todayInTz } from "@/lib/calendar/date-utils";
import type { CalendarDay } from "@/lib/api/calendar";

export interface MonthViewProps {
  /** 錨點日期（決定顯示哪一個月） */
  anchorDate: Date;
  /** 使用者時區 */
  timezone: string;
  /** 該 tz 下當前「今天」 ymd（例 `2026-04-24`）；省略則以 todayInTz 計算 */
  todayYmd?: string;
  /** API 回傳的 days 資料（依 ymd 對應） */
  daysMap: Map<string, CalendarDay>;
  /** 使用者選中的日期（YYYY-MM-DD），為 undefined 則不高亮 */
  selectedDate?: string;
  onSelectDate: (ymd: string) => void;
  /** 週起日：1=週一（預設）、0=週日 */
  weekStartsOn?: 0 | 1;
}

const WEEKDAY_LABELS_MON_START = ["一", "二", "三", "四", "五", "六", "日"];
const WEEKDAY_LABELS_SUN_START = ["日", "一", "二", "三", "四", "五", "六"];

export function MonthView({
  anchorDate,
  timezone,
  todayYmd,
  daysMap,
  selectedDate,
  onSelectDate,
  weekStartsOn = 1,
}: MonthViewProps) {
  const today =
    todayYmd ?? formatYmd(todayInTz(timezone), timezone);
  const weekLabels =
    weekStartsOn === 1 ? WEEKDAY_LABELS_MON_START : WEEKDAY_LABELS_SUN_START;
  const cells = React.useMemo(
    () => buildMonthGridDays(anchorDate, timezone, weekStartsOn),
    [anchorDate, timezone, weekStartsOn],
  );

  return (
    <div
      role="grid"
      aria-label="月視圖"
      data-testid={CALENDAR_TESTIDS.monthView}
      className="overflow-hidden rounded-md border"
    >
      {/* WeekdayHeader */}
      <div
        className="grid grid-cols-7 bg-muted/30 text-xs font-medium text-muted-foreground"
        role="row"
      >
        {weekLabels.map((label, idx) => {
          // 對應的實際星期位置：若 weekStartsOn=1 則 idx=5/6 為六/日（0-indexed: 週六 dayIdx=5, 週日 dayIdx=6）
          const isWeekend =
            weekStartsOn === 1 ? idx >= 5 : idx === 0 || idx === 6;
          return (
            <div
              key={label}
              role="columnheader"
              className={`py-2 text-center ${isWeekend ? "text-muted-foreground/80" : ""}`}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* 6 週 × 7 天 = 42 格 */}
      <div className="grid grid-cols-7 gap-px bg-border">
        {cells.map((cell) => {
          const day = daysMap.get(cell.ymd);
          const dayNumber = cell.date.getUTCDate();
          const fullDateLabel = `${cell.date.getUTCFullYear()} 年 ${cell.date.getUTCMonth() + 1} 月 ${dayNumber} 日`;
          return (
            <DayCell
              key={cell.ymd}
              ymd={cell.ymd}
              dayNumber={dayNumber}
              isOutsideMonth={cell.isOutsideMonth}
              isToday={cell.ymd === today}
              isSelected={selectedDate === cell.ymd}
              day={day}
              fullDateLabel={fullDateLabel}
              timezone={timezone}
              onSelect={onSelectDate}
            />
          );
        })}
      </div>
    </div>
  );
}
