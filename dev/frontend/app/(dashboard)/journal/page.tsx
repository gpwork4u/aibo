"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { JournalListCard } from "@/components/journal/journal-list-card";
import { JournalHeatmap } from "@/components/journal/journal-heatmap";
import { JournalFilters } from "@/components/journal/journal-filters";
import { JOURNAL_TESTIDS } from "@/lib/journal/testids";
import { useJournals } from "@/lib/hooks/use-journals";
import type { JournalEntry } from "@/lib/api/journal";

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function JournalListPage() {
  const [mood, setMood] = React.useState<string>("all");

  // 預設範圍：過去 90 天
  const since = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 89);
    return d.toISOString().slice(0, 10);
  }, []);
  const until = todayYmd();

  const { data, isLoading, isError, error } = useJournals({
    since,
    until,
    mood: mood === "all" ? undefined : mood,
  });

  const journals: JournalEntry[] = data?.data ?? [];

  // heatmap data：依字數產 intensity 1..4
  const heatmapData = React.useMemo(
    () =>
      journals.map((j) => ({
        date: j.date,
        intensity: Math.min(4, Math.max(1, Math.ceil(j.content.length / 200))),
      })),
    [journals],
  );

  return (
    <div
      data-testid={JOURNAL_TESTIDS.listPage}
      className="space-y-6"
    >
      <PageHeader
        title="每日日記"
        description="記錄今天，回看過去"
        action={
          <Button asChild>
            <Link href={`/journal/${todayYmd()}`}>
              <Plus className="mr-2 h-4 w-4" />
              寫今天
            </Link>
          </Button>
        }
      />

      <JournalHeatmap data={heatmapData} />

      <div className="flex items-center justify-between">
        <JournalFilters mood={mood} onMoodChange={setMood} />
        <span className="text-sm text-muted-foreground">
          共 {journals.length} 篇
        </span>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          message={error instanceof Error ? error.message : "載入失敗"}
        />
      )}

      {!isLoading && !isError && journals.length === 0 && (
        <div
          className="rounded-md border border-dashed py-12 text-center"
          data-testid={JOURNAL_TESTIDS.listEmpty}
        >
          <p className="text-base font-semibold">還沒有日記</p>
          <p className="mt-1 text-sm text-muted-foreground">
            從今天開始，每日記錄一筆。
          </p>
          <Button
            asChild
            className="mt-4"
            data-testid={JOURNAL_TESTIDS.listEmptyWriteFirst}
          >
            <Link href={`/journal/${todayYmd()}`}>
              <Plus className="mr-2 h-4 w-4" />
              寫第一篇
            </Link>
          </Button>
        </div>
      )}

      {!isLoading && !isError && journals.length > 0 && (
        <div className="space-y-3">
          {journals.map((j) => (
            <JournalListCard key={j.id} journal={j} />
          ))}
        </div>
      )}
    </div>
  );
}
