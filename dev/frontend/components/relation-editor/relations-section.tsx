"use client";

/**
 * F-046 RelationsSection
 * Outgoing + Incoming links 分區容器，嵌入 EntryDetailSheet
 */

import { Loader2, Link2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useEntryLinks } from "@/lib/hooks/use-entry-links";
import { RelationChip } from "./relation-chip";
import { AddRelationForm } from "./add-relation-form";

interface RelationsSectionProps {
  entryId: string;
}

export function RelationsSection({ entryId }: RelationsSectionProps) {
  const { data, isLoading, isError } = useEntryLinks(entryId);

  const outgoing = data?.outgoing ?? [];
  const incoming = data?.incoming ?? [];
  const hasAny = outgoing.length > 0 || incoming.length > 0;

  return (
    <section data-testid="relations-section">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[--fg-muted] flex items-center gap-1.5">
        <Link2 className="h-3.5 w-3.5" />
        Relations
      </h3>

      {isLoading && (
        <div className="flex items-center gap-2 py-2 text-xs text-[--fg-muted]">
          <Loader2 className="h-4 w-4 animate-spin" />
          載入連結中...
        </div>
      )}

      {isError && (
        <p className="text-xs text-red-500 py-1">無法載入連結</p>
      )}

      {!isLoading && !isError && (
        <>
          {/* Outgoing */}
          {outgoing.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-[--fg-subtle] mb-1.5 uppercase tracking-wider">
                Outgoing
              </p>
              <div className="flex flex-wrap gap-1.5" data-testid="outgoing-list">
                {outgoing.map((link) => (
                  <RelationChip
                    key={link.id}
                    link={link}
                    currentEntryId={entryId}
                    readonly={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Incoming */}
          {incoming.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-[--fg-subtle] mb-1.5 uppercase tracking-wider">
                Incoming
              </p>
              <div className="flex flex-wrap gap-1.5" data-testid="incoming-list">
                {incoming.map((link) => (
                  <RelationChip
                    key={link.id}
                    link={link}
                    currentEntryId={entryId}
                    readonly={true}
                  />
                ))}
              </div>
            </div>
          )}

          {!hasAny && (
            <p className="text-xs text-[--fg-muted] py-1">
              尚無連結
            </p>
          )}

          <Separator className="my-2" />

          {/* Add form */}
          <AddRelationForm currentEntryId={entryId} />
        </>
      )}
    </section>
  );
}
