"use client";

import { useEffect, useCallback } from "react";

export interface UseInboxKeyboardOptions {
  entries: { id: string }[];
  focusedId: string | null;
  selectedIds: Set<string>;
  onFocus: (id: string) => void;
  onSelect: (id: string, checked: boolean) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  enabled?: boolean;
}

/**
 * useInboxKeyboard - Keyboard navigation hook for Inbox triage
 *
 * Shortcuts:
 *   J / ArrowDown — next entry
 *   K / ArrowUp   — prev entry
 *   Space         — toggle selection of focused entry
 *   A             — archive focused entry
 *   D             — delete focused entry
 *   E             — edit focused entry
 */
export function useInboxKeyboard({
  entries,
  focusedId,
  selectedIds,
  onFocus,
  onSelect,
  onArchive,
  onDelete,
  onEdit,
  enabled = true,
}: UseInboxKeyboardOptions) {
  const currentIndex = entries.findIndex((e) => e.id === focusedId);

  const moveFocus = useCallback(
    (direction: "up" | "down") => {
      if (entries.length === 0) return;

      if (currentIndex === -1) {
        // Nothing focused — focus first or last
        const targetId =
          direction === "down"
            ? entries[0].id
            : entries[entries.length - 1].id;
        onFocus(targetId);
        return;
      }

      const nextIndex =
        direction === "down"
          ? Math.min(currentIndex + 1, entries.length - 1)
          : Math.max(currentIndex - 1, 0);

      if (nextIndex !== currentIndex) {
        onFocus(entries[nextIndex].id);
      }
    },
    [entries, currentIndex, onFocus],
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      // Ignore when a dialog/modal is open (has open attribute on dialog element)
      if (document.querySelector("dialog[open], [role='dialog']")) return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          moveFocus("down");
          break;

        case "k":
        case "ArrowUp":
          e.preventDefault();
          moveFocus("up");
          break;

        case " ":
          if (focusedId) {
            e.preventDefault();
            onSelect(focusedId, !selectedIds.has(focusedId));
          }
          break;

        case "a":
          if (focusedId && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onArchive(focusedId);
          }
          break;

        case "d":
          if (focusedId && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onDelete(focusedId);
          }
          break;

        case "e":
          if (focusedId && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onEdit(focusedId);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, focusedId, selectedIds, moveFocus, onSelect, onArchive, onDelete, onEdit]);
}
