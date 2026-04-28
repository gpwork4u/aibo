"use client";

import { Suspense } from "react";
import { useTodayDate } from "@/lib/hooks/use-today-date";
import { TodayHeader } from "@/components/today/TodayHeader";
import { JournalSection } from "@/components/today/JournalSection";
import { CalendarSection } from "@/components/today/CalendarSection";
import { TasksSection } from "@/components/today/TasksSection";
import { RecentEntriesSection } from "@/components/today/RecentEntriesSection";
import { SectionSkeleton } from "@/components/today/SectionSkeleton";
import { SectionErrorBoundary } from "@/components/today/SectionErrorBoundary";

/**
 * F-042 Today Dashboard
 *
 * 4 個獨立 section，各自包裹 SectionErrorBoundary + Suspense：
 *   - JournalSection：今日日記（含 CreateJournalCTA）
 *   - CalendarSection：今日 gcal 事件（GCal 未連線時不顯示）
 *   - TasksSection：今日 due tasks（status=pending）
 *   - RecentEntriesSection：今日更新 entries（最多 5 筆）
 */
export default function TodayPage() {
  const { today, todayStart } = useTodayDate();

  return (
    <div className="space-y-6 p-6" data-testid="today-page">
      <TodayHeader today={today} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Journal Section */}
        <SectionErrorBoundary sectionName="journal">
          <Suspense fallback={<SectionSkeleton title="今日日記" rows={2} />}>
            <JournalSection today={today} />
          </Suspense>
        </SectionErrorBoundary>

        {/* Calendar Section（GCal 未連線時自動隱藏，非 error） */}
        <SectionErrorBoundary sectionName="calendar">
          <Suspense fallback={<SectionSkeleton title="今日行程" rows={3} />}>
            <CalendarSection today={today} />
          </Suspense>
        </SectionErrorBoundary>

        {/* Tasks Section */}
        <SectionErrorBoundary sectionName="tasks">
          <Suspense fallback={<SectionSkeleton title="今日待辦" rows={3} />}>
            <TasksSection today={today} />
          </Suspense>
        </SectionErrorBoundary>

        {/* Recent Entries Section */}
        <SectionErrorBoundary sectionName="entries">
          <Suspense fallback={<SectionSkeleton title="今日 Entries" rows={3} />}>
            <RecentEntriesSection todayStart={todayStart} />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
