"use client";

import * as React from "react";
import { TIME_AXIS_HOUR_PX, timeAxisHours } from "@/lib/calendar/date-utils";

/**
 * 時間刻度欄（06:00–23:00，每小時一格，48px 高）。
 * 共用於 week-view / day-view 的左側。
 */
export function TimeAxis() {
  const hours = React.useMemo(timeAxisHours, []);
  return (
    <div
      className="flex flex-col border-r bg-muted/10"
      aria-hidden="true"
    >
      {hours.map((h) => (
        <div
          key={h}
          className="border-t border-border/60 px-1.5 text-[11px] tabular-nums text-muted-foreground"
          style={{ height: TIME_AXIS_HOUR_PX }}
        >
          {h.toString().padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}
