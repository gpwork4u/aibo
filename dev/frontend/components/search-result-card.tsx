"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceIndicator } from "@/components/confidence-indicator";
import { highlightKeywords } from "@/lib/highlight";
import { SearchResultItem } from "@/lib/schemas/search";
import { cn } from "@/lib/utils";

interface SearchResultCardProps {
  item: SearchResultItem;
  className?: string;
}

export function SearchResultCard({ item, className }: SearchResultCardProps) {
  const displayTitle =
    (item.title && item.title.trim()) ||
    (item.summary && item.summary.trim()) ||
    "(未命名條目)";

  const snippet = (item.summary && item.summary.trim()) || item.content_preview || "";
  const highlighted = highlightKeywords(snippet, item.matched_keywords);

  return (
    <Card
      className={cn("transition-colors hover:border-primary/50", className)}
      data-testid="search-result-card"
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/entries/${item.entry_id}`}
            data-testid="result-title"
            className="text-lg font-semibold leading-snug hover:underline"
          >
            {displayTitle}
          </Link>
          <ConfidenceIndicator value={item.relevance} />
        </div>

        {snippet && (
          <p
            className="text-sm leading-relaxed text-muted-foreground"
            data-testid="result-highlight"
            // highlightKeywords 只產生 <mark> + escape 過的文字，安全。
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        )}

        {(item.tags.length > 0 || item.domains.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge key={`t-${tag}`} variant="secondary" data-testid="result-tag">
                #{tag}
              </Badge>
            ))}
            {item.domains.map((d) => (
              <Badge key={`d-${d}`} variant="outline" data-testid="result-domain">
                {d}
              </Badge>
            ))}
          </div>
        )}

        {item.lifecycle_status && item.lifecycle_status !== "active" && (
          <Badge variant="warning" className="text-[10px]">
            {item.lifecycle_status}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
