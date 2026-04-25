"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOURNAL_TESTIDS } from "@/lib/journal/testids";

const MOODS = [
  { value: "all", label: "全部心情" },
  { value: "great", label: "😊 great" },
  { value: "ok", label: "😐 ok" },
  { value: "down", label: "😔 down" },
];

interface JournalFiltersProps {
  mood: string; // "all" | "great" | "ok" | "down"
  onMoodChange: (mood: string) => void;
}

export function JournalFilters({ mood, onMoodChange }: JournalFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={mood} onValueChange={onMoodChange}>
        <SelectTrigger
          className="w-[150px]"
          data-testid={JOURNAL_TESTIDS.listMoodFilter}
        >
          <SelectValue placeholder="心情" />
        </SelectTrigger>
        <SelectContent>
          {MOODS.map((m) => (
            <SelectItem
              key={m.value}
              value={m.value}
              data-testid={JOURNAL_TESTIDS.listMoodOption(m.value)}
            >
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
