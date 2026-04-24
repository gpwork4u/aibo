"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { DayView } from "@/components/calendar/day-view";
import { GcalBanner } from "@/components/calendar/gcal-banner";
import { DayDetailSheet } from "@/components/calendar/day-detail-sheet";
import { ErrorState } from "@/components/error-state";
import {
  addDays,
  addMonths,
  addWeeks,
  formatDayTitle,
  formatMonthTitle,
  formatWeekTitle,
  formatYmd,
  getMonthGridRange,
  getWeekRange,
  parseYmd,
  todayInTz,
} from "@/lib/calendar/date-utils";
import { useCalendar } from "@/lib/hooks/use-calendar";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useCalendarShortcuts } from "@/lib/hooks/use-calendar-shortcuts";
import type { CalendarDay } from "@/lib/api/calendar";
import type { CalendarView } from "@/components/calendar/calendar-toolbar";
import { CALENDAR_TESTIDS } from "@/lib/calendar/testids";

function resolveTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

function parseView(v: string | null): CalendarView {
  return v === "week" || v === "day" ? v : "month";
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tz = React.useMemo(resolveTimezone, []);
  const isMobile = useIsMobile();

  const viewParam = searchParams.get("view");
  const dateParam = searchParams.get("date");
  const sheetParam = searchParams.get("sheet"); // F-027c: 開啟 DayDetailSheet 的 YYYY-MM-DD
  const urlView: CalendarView = parseView(viewParam);
  // 手機 (< 768px) 強制 day view（URL 可保留 ?view=month 以利 desktop 分享）
  const view: CalendarView = isMobile ? "day" : urlView;
  const parsedDate = parseYmd(dateParam);
  const anchorDate = parsedDate ?? todayInTz(tz);
  const selectedYmd = parsedDate ? formatYmd(parsedDate, tz) : undefined;
  const todayYmd = formatYmd(todayInTz(tz), tz);

  // 計算本次要 fetch 的區間
  const range = React.useMemo(() => {
    if (view === "month") return getMonthGridRange(anchorDate, tz);
    if (view === "week") return getWeekRange(anchorDate, tz);
    const ymd = formatYmd(anchorDate, tz);
    return { sinceYmd: ymd, untilYmd: ymd };
  }, [view, anchorDate, tz]);

  const { data, isLoading, isError, error, gcalConnected, degraded } = useCalendar({
    since: range.sinceYmd,
    until: range.untilYmd,
    view,
    tz,
  });

  // X-Degraded: gcal → 顯示 sonner toast（每次 key 變化只提示一次）
  const lastDegradedKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!degraded) return;
    const key = `${range.sinceYmd}-${range.untilYmd}-${view}`;
    if (lastDegradedKeyRef.current === key) return;
    lastDegradedKeyRef.current = key;
    toast.warning("Google Calendar 暫時無法載入，僅顯示知識條目", {
      id: CALENDAR_TESTIDS.gcalDegradedToast,
    });
  }, [degraded, range.sinceYmd, range.untilYmd, view]);

  // 資料 → map
  const daysMap = React.useMemo(() => {
    const m = new Map<string, CalendarDay>();
    data?.data.days.forEach((d) => m.set(d.date, d));
    return m;
  }, [data]);

  // 標題
  const title = React.useMemo(() => {
    if (view === "month") return formatMonthTitle(anchorDate, tz);
    if (view === "week") return formatWeekTitle(anchorDate, tz);
    return formatDayTitle(anchorDate, tz);
  }, [view, anchorDate, tz]);

  // URL 同步工具
  const updateUrl = React.useCallback(
    (next: { view?: CalendarView; date?: string | null; sheet?: string | null }) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (next.view) sp.set("view", next.view);
      if (next.date === null) sp.delete("date");
      else if (next.date) sp.set("date", next.date);
      if (next.sheet === null) sp.delete("sheet");
      else if (next.sheet) sp.set("sheet", next.sheet);
      router.replace(`/calendar?${sp.toString()}`);
    },
    [router, searchParams],
  );

  const shiftDate = React.useCallback(
    (deltaDays: number) => {
      const next = addDays(anchorDate, deltaDays, tz);
      updateUrl({ date: formatYmd(next, tz) });
    },
    [anchorDate, tz, updateUrl],
  );

  const handlePrev = () => {
    let nextDate: Date;
    if (view === "month") nextDate = addMonths(anchorDate, -1, tz);
    else if (view === "week") nextDate = addWeeks(anchorDate, -1, tz);
    else nextDate = addDays(anchorDate, -1, tz);
    updateUrl({ date: formatYmd(nextDate, tz) });
  };

  const handleNext = () => {
    let nextDate: Date;
    if (view === "month") nextDate = addMonths(anchorDate, 1, tz);
    else if (view === "week") nextDate = addWeeks(anchorDate, 1, tz);
    else nextDate = addDays(anchorDate, 1, tz);
    updateUrl({ date: formatYmd(nextDate, tz) });
  };

  const handleToday = () => {
    updateUrl({ date: todayYmd });
  };

  const handleViewChange = React.useCallback(
    (v: CalendarView) => {
      // 手機強制 day 時，不允許切成其他 view（toolbar tabs 已隱藏；此處 extra guard）
      if (isMobile && v !== "day") return;
      updateUrl({ view: v });
    },
    [isMobile, updateUrl],
  );

  const handleSelectDate = (ymd: string) => {
    // 點擊 day cell → 定位到該日 + 開啟 DayDetailSheet
    updateUrl({ date: ymd, sheet: ymd });
  };

  const handleCloseSheet = React.useCallback(() => {
    updateUrl({ sheet: null });
  }, [updateUrl]);

  // PgUp/PgDn：大步移動
  const handleLargeShift = React.useCallback(
    (dir: -1 | 1) => {
      let next: Date;
      if (view === "month") next = addMonths(anchorDate, dir, tz);
      else if (view === "week") next = addWeeks(anchorDate, dir * 4, tz);
      else next = addDays(anchorDate, dir * 7, tz);
      updateUrl({ date: formatYmd(next, tz) });
    },
    [view, anchorDate, tz, updateUrl],
  );

  // 鍵盤快捷鍵
  useCalendarShortcuts({
    view,
    onPrev: handlePrev,
    onNext: handleNext,
    onToday: handleToday,
    onPrevLarge: () => handleLargeShift(-1),
    onNextLarge: () => handleLargeShift(1),
    onSetView: handleViewChange,
  });

  return (
    <div data-testid={CALENDAR_TESTIDS.page} className="flex flex-col gap-4">
      <CalendarToolbar
        view={view}
        onViewChange={handleViewChange}
        title={title}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        timezone={tz}
        hideViewTabs={isMobile}
        isLoading={isLoading}
      />

      {gcalConnected === false && <GcalBanner mode="not-connected" />}
      {degraded === "gcal" && <GcalBanner mode="degraded" />}

      {isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : "無法載入行事曆資料"}
        />
      ) : view === "month" ? (
        <MonthView
          anchorDate={anchorDate}
          timezone={tz}
          todayYmd={todayYmd}
          daysMap={daysMap}
          selectedDate={selectedYmd}
          onSelectDate={handleSelectDate}
        />
      ) : view === "week" ? (
        <WeekView
          anchorDate={anchorDate}
          timezone={tz}
          todayYmd={todayYmd}
          daysMap={daysMap}
          selectedDate={selectedYmd}
          onSelectDate={handleSelectDate}
        />
      ) : (
        <DayView
          anchorDate={anchorDate}
          timezone={tz}
          todayYmd={todayYmd}
          day={daysMap.get(formatYmd(anchorDate, tz))}
          selectedDate={selectedYmd}
          onSelectDate={handleSelectDate}
        />
      )}

      <DayDetailSheet
        date={sheetParam}
        tz={tz}
        onClose={handleCloseSheet}
      />
    </div>
  );
}
