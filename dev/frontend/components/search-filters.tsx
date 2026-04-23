"use client";

import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/tag-input";
import { cn } from "@/lib/utils";

export interface SearchFiltersValue {
  categoryId: string;
  tags: string[];
  domains: string[];
}

interface CategoryOption {
  id: string;
  name: string;
}

interface SearchFiltersProps {
  value: SearchFiltersValue;
  onChange: (next: SearchFiltersValue) => void;
  categories?: CategoryOption[];
  className?: string;
}

/**
 * 進階篩選器：分類、tags、domains。
 *
 * - 分類使用 native `<select>`（目前 UI kit 尚未含 shadcn Select）。
 * - tags / domains 採 TagInput 自由輸入，按 Enter 加入。
 */
export function SearchFilters({
  value,
  onChange,
  categories = [],
  className,
}: SearchFiltersProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 rounded-md border bg-muted/30 p-4 md:grid-cols-3",
        className,
      )}
      data-testid="search-filters"
    >
      <div className="space-y-1.5">
        <Label htmlFor="filter-category">分類</Label>
        <select
          id="filter-category"
          data-testid="filter-category-select"
          value={value.categoryId}
          onChange={(e) => onChange({ ...value, categoryId: e.target.value })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" data-testid="category-option-all">
            全部分類
          </option>
          {categories.map((c) => (
            <option
              key={c.id}
              value={c.id}
              data-testid={`category-option-${c.id}`}
            >
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-tags">標籤</Label>
        <div data-testid="filter-tags-input">
          <TagInput
            id="filter-tags"
            value={value.tags}
            onChange={(tags) => onChange({ ...value, tags })}
            placeholder="輸入後按 Enter"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-domains">Domains</Label>
        <div data-testid="filter-domains-input">
          <TagInput
            id="filter-domains"
            value={value.domains}
            onChange={(domains) => onChange({ ...value, domains })}
            placeholder="輸入後按 Enter"
          />
        </div>
      </div>
    </div>
  );
}
