"use client";

import { useQuery } from "@tanstack/react-query";
import { Library, AlertCircle, FileText } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listTodayEntries } from "@/lib/api/today";
import type { EntryListItem } from "@/lib/api/today";

interface RecentEntriesSectionProps {
  todayStart: string; // ISO UTC string of today 00:00 Asia/Taipei
}

export function RecentEntriesSection({
  todayStart,
}: RecentEntriesSectionProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["today-entries", todayStart],
    queryFn: () => listTodayEntries(todayStart),
    retry: 1,
  });

  const entries: EntryListItem[] = data?.data ?? [];

  return (
    <Card data-testid="recent-entries-section">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Library className="h-4 w-4" />
          今日 Entries
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div
            className="text-xs text-muted-foreground animate-pulse"
            data-testid="entries-loading"
          >
            載入中…
          </div>
        )}

        {error && !isLoading && (
          <div
            className="flex items-center gap-2 text-xs text-destructive"
            data-testid="entries-error"
          >
            <AlertCircle className="h-4 w-4" />
            <span>Could not load entries</span>
          </div>
        )}

        {!isLoading && !error && entries.length === 0 && (
          <p
            className="text-xs text-muted-foreground"
            data-testid="entries-empty"
          >
            今天還沒有更新的 entries
          </p>
        )}

        {!isLoading && !error && entries.length > 0 && (
          <ul className="space-y-2" data-testid="entries-list">
            {entries.map((entry) => (
              <li key={entry.id} data-testid="entry-item">
                <Link
                  href={`/entries/${entry.id}`}
                  className="flex items-start gap-2 text-sm hover:text-foreground/80 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {entry.title || entry.content_preview || "（無標題）"}
                    </p>
                    {entry.content_preview && entry.title && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {entry.content_preview}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
