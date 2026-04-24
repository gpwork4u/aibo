"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchCalendarDay,
  type FetchCalendarDayResult,
} from "@/lib/api/calendar-day";

export const calendarDayKey = (date: string) => ["calendar-day", date] as const;

/**
 * F-027c：DayDetailSheet 讀取當日彙整（entries + events + journal）。
 *
 * - enabled 只在 date 有值時觸發
 * - staleTime 60s（Sheet 開啟期間避免重覆請求）
 */
export function useCalendarDay(
  date: string | null | undefined,
  opts: { tz: string; includeGcal?: boolean } = { tz: "UTC" },
) {
  return useQuery<FetchCalendarDayResult>({
    queryKey: [...calendarDayKey(date ?? ""), opts.includeGcal ?? true],
    queryFn: () =>
      fetchCalendarDay(date as string, opts.tz, {
        includeGcal: opts.includeGcal,
      }),
    enabled: !!date,
    staleTime: 60_000,
  });
}
