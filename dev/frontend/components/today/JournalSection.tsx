"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Edit, PenLine, AlertCircle } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getJournal } from "@/lib/api/journal";
import { ApiError } from "@/lib/api/client";

interface JournalSectionProps {
  today: string; // YYYY-MM-DD
}

export function JournalSection({ today }: JournalSectionProps) {
  const { data: journal, isLoading, error } = useQuery({
    queryKey: ["journal", today],
    queryFn: () => getJournal(today),
    retry: (failureCount, err) => {
      // 404 = 今日尚無日記，是正常狀態
      if (err instanceof ApiError && err.status === 404) return false;
      return failureCount < 2;
    },
  });

  const is404 = error instanceof ApiError && error.status === 404;
  const isOtherError = error && !is404;

  return (
    <Card data-testid="journal-section">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <BookOpen className="h-4 w-4" />
          今日日記
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="text-xs text-muted-foreground animate-pulse" data-testid="journal-loading">
            載入中…
          </div>
        )}

        {isOtherError && (
          <div
            className="flex items-center gap-2 text-xs text-destructive"
            data-testid="journal-error"
          >
            <AlertCircle className="h-4 w-4" />
            <span>Could not load journal</span>
          </div>
        )}

        {(is404 || (!isLoading && !error && !journal)) && (
          <div
            className="flex flex-col gap-3 text-center py-2"
            data-testid="journal-cta"
          >
            <p className="text-sm text-muted-foreground">今天還沒有日記</p>
            <Button asChild size="sm" variant="outline" className="gap-2 w-full">
              <Link href="/today/journal">
                <PenLine className="h-4 w-4" />
                Start today&apos;s journal
              </Link>
            </Button>
          </div>
        )}

        {journal && !isLoading && (
          <div className="space-y-3" data-testid="journal-preview">
            {journal.title && (
              <p className="font-medium text-sm">{journal.title}</p>
            )}
            {journal.content && (
              <p className="text-xs text-muted-foreground line-clamp-3">
                {journal.content}
              </p>
            )}
            {journal.mood && (
              <p className="text-xs text-muted-foreground">
                心情：{journal.mood}
              </p>
            )}
            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-2 w-full"
              data-testid="journal-edit-btn"
            >
              <Link href="/today/journal">
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
