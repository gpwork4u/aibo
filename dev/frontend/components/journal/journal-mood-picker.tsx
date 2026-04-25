"use client";

import { Button } from "@/components/ui/button";
import { JOURNAL_TESTIDS } from "@/lib/journal/testids";
import { cn } from "@/lib/utils";

const MOODS: { value: string; emoji: string; label: string }[] = [
  { value: "great", emoji: "😊", label: "great" },
  { value: "ok", emoji: "😐", label: "ok" },
  { value: "down", emoji: "😔", label: "down" },
];

interface JournalMoodPickerProps {
  value: string | null;
  onChange: (mood: string | null) => void;
}

export function JournalMoodPicker({ value, onChange }: JournalMoodPickerProps) {
  return (
    <div
      className="flex items-center gap-2"
      role="radiogroup"
      aria-label="心情"
      data-testid={JOURNAL_TESTIDS.moodPicker}
    >
      {MOODS.map((m) => (
        <Button
          key={m.value}
          type="button"
          variant={value === m.value ? "default" : "outline"}
          size="sm"
          role="radio"
          aria-checked={value === m.value}
          data-testid={JOURNAL_TESTIDS.moodOption(m.value)}
          onClick={() => onChange(value === m.value ? null : m.value)}
          className={cn("gap-1")}
        >
          <span className="text-base">{m.emoji}</span>
          <span className="text-xs">{m.label}</span>
        </Button>
      ))}
    </div>
  );
}
