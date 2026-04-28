"use client";

/**
 * F-046 AddRelationForm
 * Combobox 搜尋 entries + LinkType Select + Relation Input + Add Button
 */

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useEntries } from "@/lib/hooks/use-entries";
import { useCreateEntryLink } from "@/lib/hooks/use-entry-links";
import { LINK_TYPE_CONFIG } from "./relation-chip";
import type { LinkType } from "@/lib/api/entry-links";

const LINK_TYPES = Object.keys(LINK_TYPE_CONFIG) as LinkType[];

interface AddRelationFormProps {
  currentEntryId: string;
}

export function AddRelationForm({ currentEntryId }: AddRelationFormProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string>("");
  const [selectedEntryTitle, setSelectedEntryTitle] = useState<string>("");
  const [linkType, setLinkType] = useState<LinkType>("related_to");
  const [relation, setRelation] = useState("");

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const { data: entriesData, isLoading: isSearching } = useEntries(
    debouncedSearch
      ? { q: debouncedSearch, per_page: 10 } as { per_page: number; q?: string }
      : undefined,
  );

  const createLink = useCreateEntryLink(currentEntryId);

  // self-link 檢查
  const isSelfLink = selectedEntryId === currentEntryId;
  const canSubmit = !!selectedEntryId && !isSelfLink && !createLink.isPending;

  function handleSelect(entryId: string, entryTitle: string) {
    setSelectedEntryId(entryId);
    setSelectedEntryTitle(entryTitle);
    setOpen(false);
    setSearchQuery("");
  }

  function handleSubmit() {
    if (!canSubmit) return;
    createLink.mutate(
      {
        to_id: selectedEntryId,
        link_type: linkType,
        relation: relation.trim() || null,
      },
      {
        onSuccess: () => {
          // reset form
          setSelectedEntryId("");
          setSelectedEntryTitle("");
          setRelation("");
          setLinkType("related_to");
        },
      },
    );
  }

  const entries = entriesData?.data ?? [];

  return (
    <div className="flex flex-col gap-2 pt-2" data-testid="add-relation-form">
      <div className="flex gap-2">
        {/* Entry 搜尋 Combobox */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "flex-1 justify-between font-normal text-sm",
                !selectedEntryId && "text-[--fg-subtle]",
              )}
              data-testid="entry-search-trigger"
            >
              <span className="truncate">
                {selectedEntryTitle || "搜尋 entry..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="搜尋 entry 標題..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                data-testid="entry-search-input"
              />
              <CommandList>
                {isSearching ? (
                  <div className="py-4 text-center text-xs text-[--fg-muted]">
                    搜尋中...
                  </div>
                ) : entries.length === 0 ? (
                  <CommandEmpty data-testid="entry-search-empty">
                    No entries found
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {entries.map((entry) => (
                      <CommandItem
                        key={entry.id}
                        value={entry.id}
                        onSelect={() =>
                          handleSelect(entry.id, entry.title ?? entry.id)
                        }
                        className={cn(
                          entry.id === currentEntryId && "opacity-40 cursor-not-allowed",
                        )}
                        disabled={entry.id === currentEntryId}
                        data-testid={`entry-option-${entry.id}`}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedEntryId === entry.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="truncate">{entry.title || "（無標題）"}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Link Type Select */}
        <Select
          value={linkType}
          onValueChange={(v) => setLinkType(v as LinkType)}
        >
          <SelectTrigger
            className="w-28 text-xs"
            data-testid="link-type-select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LINK_TYPES.map((lt) => (
              <SelectItem key={lt} value={lt} className="text-xs">
                {LINK_TYPE_CONFIG[lt].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        {/* Relation Input */}
        <Input
          placeholder="說明（選填，最多 200 字）"
          value={relation}
          onChange={(e) => setRelation(e.target.value.slice(0, 200))}
          className="flex-1 text-sm"
          data-testid="relation-input"
        />

        {/* Add Button */}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          data-testid="add-relation-btn"
        >
          <Plus className="h-4 w-4 mr-1" />
          新增
        </Button>
      </div>

      {isSelfLink && (
        <p className="text-xs text-red-500" data-testid="self-link-error">
          無法連結到自身 entry
        </p>
      )}
    </div>
  );
}
