"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { MonthView } from "@/components/calendar/month-view";
import { GcalBanner } from "@/components/calendar/gcal-banner";
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

  const viewParam = searchParams.get("view");
  const dateParam = searchParams.get("date");
  const view: CalendarView = parseView(viewParam);
  const parsedDate = parseYmd(dateParam);
  const anchorDate = parsedDate ?? todayInTz(tz);
  const selectedYmd = parsedDate ? formatYmd(parsedDate, tz) : undefined;
  const todayYmd = formatYmd(todayInTz(tz), tz);

  // 計算本次要 fetch 的區間（本 PR 只實作 month；week/day 為 placeholder）
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
    (next: { view?: CalendarView; date?: string | null }) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (next.view) sp.set("view", next.view);
      if (next.date === null) sp.delete("date");
      else if (next.date) sp.set("date", next.date);
      router.replace(`/calendar?${sp.toString()}`);
    },
    [router, searchParams],
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

  const handleViewChange = (v: CalendarView) => {
    updateUrl({ view: v });
  };

  const handleSelectDate = (ymd: string) => {
    // 本 PR 只同步 URL date（Sheet 由 F-027c 實作）
    updateUrl({ date: ymd });
  };

  // 手機版強制 day view
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia && window.matchMedia("(max-width: 767px)").matches) {
      if (view !== "day") {
        updateUrl({ view: "day" });
      }
    }
    // 僅在 mount 時檢查一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hideViewTabs =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(max-width: 767px)").matches;

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
        hideViewTabs={hideViewTabs}
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
        <WeekViewPlaceholder />
      ) : (
        <DayViewPlaceholder />
      )}
    </div>
  );
}

function WeekViewPlaceholder() {
  return (
    <div
      data-testid={CALENDAR_TESTIDS.weekView}
      className="rounded-md border bg-muted/20 p-8 text-center text-sm text-muted-foreground"
    >
      週視圖即將推出（F-027b）
    </div>
  );
}

function DayViewPlaceholder() {
  return (
    <div
      data-testid={CALENDAR_TESTIDS.dayView}
      className="rounded-md border bg-muted/20 p-8 text-center text-sm text-muted-foreground"
    >
      日視圖即將推出（F-027b）
    </div>
  );
}
