"use client";

import * as React from "react";
import Link from "next/link";
import { JOURNAL_TESTIDS } from "@/lib/journal/testids";
import { cn } from "@/lib/utils";

interface HeatmapDatum {
  date: string; // YYYY-MM-DD
  intensity: number; // 0..4
}

interface JournalHeatmapProps {
  /** 起點日期（含），預設今天往前推 90 天 */
  startDate?: Date;
  /** 終點日期（含），預設今天 */
  endDate?: Date;
  /** 已存在日記的 dates（會分配 intensity = 1..4 依字數） */
  data: HeatmapDatum[];
}

// 以瀏覽器當地時區算出 YYYY-MM-DD，避免使用 toISOString() 在非 UTC 時區
// 凌晨打開頁面時 heatmap 格子被歸到前一天的問題。
const LOCAL_YMD_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function ymd(d: Date): string {
  return LOCAL_YMD_FORMATTER.format(d);
}

function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const stop = new Date(end);
  stop.setHours(0, 0, 0, 0);
  while (cur <= stop) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

const INTENSITY_CLASS = [
  "bg-muted/30",
  "bg-emerald-200 dark:bg-emerald-900/40",
  "bg-emerald-300 dark:bg-emerald-700/60",
  "bg-emerald-400 dark:bg-emerald-600/70",
  "bg-emerald-500 dark:bg-emerald-500/80",
];

export function JournalHeatmap({
  startDate,
  endDate,
  data,
}: JournalHeatmapProps) {
  const today = new Date();
  const start = startDate ?? new Date(today.getTime() - 1000 * 60 * 60 * 24 * 89);
  const end = endDate ?? today;
  const intensityMap = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const d of data) m.set(d.date, d.intensity);
    return m;
  }, [data]);

  const days = eachDay(start, end);

  return (
    <div
      data-testid={JOURNAL_TESTIDS.heatmap}
      className="rounded-md border p-3"
      role="grid"
      aria-label="日記覆蓋熱力圖"
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(14px,1fr))] gap-1">
        {days.map((d) => {
          const ds = ymd(d);
          const intensity = intensityMap.get(ds) ?? 0;
          return (
            <Link
              key={ds}
              href={`/journal/${ds}`}
              data-testid={JOURNAL_TESTIDS.heatmapCell(ds)}
              data-intensity={intensity}
              title={`${ds}${intensity > 0 ? " · 已寫" : ""}`}
              aria-label={`${ds}${intensity > 0 ? "（已寫日記）" : "（尚未撰寫）"}`}
              className={cn(
                "aspect-square rounded-sm transition-opacity hover:opacity-70",
                INTENSITY_CLASS[Math.min(intensity, 4)],
              )}
            />
          );
        })}
      </div>
      <div
        className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground"
        data-testid={JOURNAL_TESTIDS.heatmapLegend}
      >
        <span>少</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn("h-3 w-3 rounded-sm", INTENSITY_CLASS[i])}
          />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}
