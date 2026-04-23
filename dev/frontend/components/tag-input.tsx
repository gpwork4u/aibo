"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Max number of tags allowed. */
  max?: number;
  /** Input id (for label association). */
  id?: string;
}

/**
 * TagInput — a simple multi-value input.
 * - Enter / comma adds a tag
 * - Backspace on empty input removes last tag
 * - Trimmed, de-duplicated
 */
export function TagInput({
  value,
  onChange,
  placeholder = "輸入後按 Enter 新增",
  disabled,
  className,
  max,
  id,
}: TagInputProps) {
  const [draft, setDraft] = React.useState("");

  const addTag = React.useCallback(
    (raw: string) => {
      const tag = raw.trim();
      if (!tag) return;
      if (value.includes(tag)) return;
      if (max && value.length >= max) return;
      onChange([...value, tag]);
    },
    [value, onChange, max],
  );

  const removeTag = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div
      className={cn(
        "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      onClick={() => {
        const el = document.getElementById(id ?? "tag-input");
        el?.focus();
      }}
    >
      {value.map((tag, idx) => (
        <Badge key={`${tag}-${idx}`} variant="secondary" className="gap-1 py-0.5">
          <span>{tag}</span>
          {!disabled && (
            <button
              type="button"
              aria-label={`移除 ${tag}`}
              className="ml-1 rounded-sm hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(idx);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      <input
        id={id ?? "tag-input"}
        type="text"
        value={draft}
        disabled={disabled}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(draft);
            setDraft("");
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            e.preventDefault();
            removeTag(value.length - 1);
          }
        }}
        onBlur={() => {
          if (draft.trim()) {
            addTag(draft);
            setDraft("");
          }
        }}
      />
    </div>
  );
}
