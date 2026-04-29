"use client";

/**
 * CreateActionsGroup — 建立動作群組（F-049）
 *
 * 包含：
 *   - New Entry → 開啟 QuickCreateModal
 *   - New Journal Entry → 導向 /today/journal
 */

import { useRouter } from "next/navigation";
import { PlusCircle, BookOpenCheck } from "lucide-react";
import {
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

interface CreateActionsGroupProps {
  onNewEntry: () => void;
  onSelect: () => void;
}

export function CreateActionsGroup({ onNewEntry, onSelect }: CreateActionsGroupProps) {
  const router = useRouter();

  return (
    <CommandGroup heading="Create">
      <CommandItem
        value="new entry create add 建立 新增"
        onSelect={() => {
          onNewEntry();
        }}
      >
        <PlusCircle className="mr-2 h-4 w-4 text-[--fg-subtle]" />
        New Entry
      </CommandItem>
      <CommandItem
        value="new journal entry diary 日記 日誌"
        onSelect={() => {
          router.push("/today/journal");
          onSelect();
        }}
      >
        <BookOpenCheck className="mr-2 h-4 w-4 text-[--fg-subtle]" />
        New Journal Entry
      </CommandItem>
    </CommandGroup>
  );
}
