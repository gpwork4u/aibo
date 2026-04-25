"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JOURNAL_TESTIDS } from "@/lib/journal/testids";
import type { JournalEntry } from "@/lib/api/journal";

interface JournalListCardProps {
  journal: JournalEntry;
}

const MOOD_EMOJI: Record<string, string> = {
  great: "😊",
  ok: "😐",
  down: "😔",
};

function snippet(s: string, max = 120): string {
  const trimmed = s.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? trimmed.slice(0, max) + "…" : trimmed;
}

export function JournalListCard({ journal }: JournalListCardProps) {
  const moodEmoji = journal.mood ? MOOD_EMOJI[journal.mood] ?? "🙂" : null;
  const wordCount = journal.content.length;

  return (
    <Card
      className="transition-colors hover:border-primary/50"
      data-testid={JOURNAL_TESTIDS.listItem}
      data-journal-date={journal.date}
    >
      <Link
        href={`/journal/${journal.date}`}
        className="block"
        data-testid={JOURNAL_TESTIDS.listItemByDate(journal.date)}
      >
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{journal.date}</span>
              {moodEmoji && (
                <span
                  data-testid={JOURNAL_TESTIDS.listItemMoodEmoji}
                  aria-label={`mood: ${journal.mood}`}
                  className="text-lg"
                >
                  {moodEmoji}
                </span>
              )}
            </div>
            {journal.is_draft && (
              <Badge
                variant="warning"
                className="text-[10px]"
                data-testid={JOURNAL_TESTIDS.listItemDraftBadge}
              >
                草稿
              </Badge>
            )}
          </div>
          {journal.title && (
            <h3 className="text-base font-semibold">{journal.title}</h3>
          )}
          <p
            className="text-sm text-muted-foreground"
            data-testid={JOURNAL_TESTIDS.listItemPreview}
          >
            {snippet(journal.content)}
          </p>
          <p className="text-xs text-muted-foreground">{wordCount} 字</p>
        </CardContent>
      </Link>
    </Card>
  );
}
