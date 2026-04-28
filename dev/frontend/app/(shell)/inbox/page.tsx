"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listEntries, archiveEntry, deleteEntry, classifyEntry, type EntryListItem } from "@/lib/api/entries";
import { InboxList } from "@/components/inbox/inbox-list";
import { InboxToolbar } from "@/components/inbox/inbox-toolbar";
import { InboxActionBar } from "@/components/inbox/inbox-action-bar";
import { useInboxKeyboard } from "@/components/inbox/inbox-keyboard";

export default function InboxPage() {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const [classifyingIds, setClassifyingIds] = React.useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["entries", "inbox"],
    queryFn: () => listEntries({ status: "draft" }),
  });

  const entries: EntryListItem[] = data?.items ?? [];

  const archiveMut = useMutation({
    mutationFn: archiveEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries", "inbox"] }),
  });
  const deleteMut = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries", "inbox"] }),
  });
  const classifyMut = useMutation({
    mutationFn: classifyEntry,
    onMutate: ({ id }) => setClassifyingIds((s) => new Set(s).add(id)),
    onSettled: (_d, _e, { id }) =>
      setClassifyingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries", "inbox"] }),
  });

  const handleSelect = (id: string, checked: boolean) =>
    setSelectedIds((s) => {
      const n = new Set(s);
      checked ? n.add(id) : n.delete(id);
      return n;
    });

  useInboxKeyboard({
    entries,
    focusedId,
    setFocusedId,
    onArchive: (id) => archiveMut.mutate(id),
    onDelete: (id) => deleteMut.mutate(id),
    onClassify: (id) => classifyMut.mutate({ id }),
    selectedIds,
    onToggleSelect: (id) =>
      setSelectedIds((s) => {
        const n = new Set(s);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      }),
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <InboxToolbar
        selectedCount={selectedIds.size}
        onArchiveSelected={() => {
          selectedIds.forEach((id) => archiveMut.mutate(id));
          setSelectedIds(new Set());
        }}
        onClearSelection={() => setSelectedIds(new Set())}
      />
      <InboxList
        entries={entries}
        isLoading={isLoading}
        selectedIds={selectedIds}
        focusedId={focusedId}
        classifyingIds={classifyingIds}
        onSelect={handleSelect}
        onFocus={setFocusedId}
        onArchive={(id) => archiveMut.mutate(id)}
        onDelete={(id) => deleteMut.mutate(id)}
        onEdit={() => undefined}
      />
      <InboxActionBar
        selectedCount={selectedIds.size}
        onArchive={() => {
          selectedIds.forEach((id) => archiveMut.mutate(id));
          setSelectedIds(new Set());
        }}
        onDelete={() => {
          selectedIds.forEach((id) => deleteMut.mutate(id));
          setSelectedIds(new Set());
        }}
      />
    </div>
  );
}
