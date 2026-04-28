// Relation Editor 元件範例
// 技術基礎：shadcn/ui + Tailwind CSS v4 + Lucide icons + react-hook-form v7 + zod v3

import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, PlusCircle, X, Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── 型別 ─────────────────────────────────────────────────────────────────────

type LinkType =
  | "derives_from"
  | "contradicts"
  | "duplicate_of"
  | "references"
  | "supersedes"
  | "related_to";

interface RelationLink {
  id: string;
  link_type: LinkType;
  targetId: string;
  targetTitle: string;
  relation?: string;
  confidence?: number;
  isLlmGenerated?: boolean;
}

interface NewRelation {
  target_entry_id: string;
  link_type: LinkType;
  relation?: string;
}

// ─── Link Type 色彩對應 ────────────────────────────────────────────────────────

const LINK_TYPE_CONFIG: Record<LinkType, { hex: string; label: string }> = {
  derives_from:  { hex: "#3B82F6", label: "衍生自" },
  contradicts:   { hex: "#EF4444", label: "矛盾" },
  duplicate_of:  { hex: "#F97316", label: "重複" },
  references:    { hex: "#6B7280", label: "參考" },
  supersedes:    { hex: "#A855F7", label: "取代" },
  related_to:    { hex: "#22C55E", label: "相關" },
};

// ─── 1. RelationChip ──────────────────────────────────────────────────────────

interface RelationChipProps {
  link_type: LinkType;
  targetTitle: string;
  targetId: string;
  relation?: string;
  confidence?: number;
  isLlmGenerated?: boolean;
  direction?: "out" | "in";
  onEdit?: () => void;
  onDelete?: () => void;
  onTitleClick?: (id: string) => void;
}

export function RelationChip({
  link_type,
  targetTitle,
  targetId,
  relation,
  confidence = 1.0,
  isLlmGenerated = false,
  direction = "out",
  onEdit,
  onDelete,
  onTitleClick,
}: RelationChipProps) {
  const config = LINK_TYPE_CONFIG[link_type];
  const isLowConfidence = isLlmGenerated && confidence < 0.7;
  const isOutgoing = direction === "out";

  return (
    <div
      role="listitem"
      className={cn(
        "group inline-flex items-center gap-1.5 px-2 py-1 rounded-full border bg-background",
        "text-sm transition-all",
        isLowConfidence ? "border-dashed" : "border-border"
      )}
    >
      {/* incoming "from" 前綴 */}
      {!isOutgoing && (
        <span className="text-xs text-muted-foreground">from</span>
      )}

      {/* link_type badge */}
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-normal text-white flex-shrink-0"
        style={{ backgroundColor: config.hex }}
      >
        {config.label}
      </span>

      {/* target title */}
      <button
        role="link"
        aria-label={`前往：${targetTitle}`}
        onClick={() => onTitleClick?.(targetId)}
        className={cn(
          "text-sm text-foreground max-w-[200px] truncate",
          "cursor-pointer underline-offset-2 hover:underline focus:outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
        )}
      >
        {targetTitle}
      </button>

      {/* relation text */}
      {relation && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          · {relation}
        </span>
      )}

      {/* confidence badge */}
      {confidence < 1.0 && (
        <span className="text-xs text-muted-foreground bg-neutral-100 px-1 py-0.5 rounded flex-shrink-0">
          {(confidence * 100).toFixed(0)}%
        </span>
      )}

      {/* Edit / Delete（outgoing only，hover 顯示）*/}
      {isOutgoing && (onEdit || onDelete) && (
        <div className="hidden group-hover:flex items-center gap-0.5 ml-0.5">
          {onEdit && (
            <button
              aria-label="編輯連結"
              onClick={onEdit}
              className={cn(
                "p-1.5 rounded-full transition-colors",
                "hover:bg-primary-50 hover:text-primary",
                // 視覺 20px，觸控區 padding 補足 44pt
                "min-w-[32px] min-h-[32px] flex items-center justify-center",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              )}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              aria-label={`刪除連結至 ${targetTitle}`}
              onClick={onDelete}
              className={cn(
                "p-1.5 rounded-full transition-colors",
                "hover:bg-red-50 hover:text-red-600",
                "min-w-[32px] min-h-[32px] flex items-center justify-center",
                "focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
              )}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 2. RelationsSection ──────────────────────────────────────────────────────

interface RelationsSectionProps {
  title: string;
  links: RelationLink[];
  direction: "out" | "in";
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onTitleClick?: (id: string) => void;
}

export function RelationsSection({
  title,
  links,
  direction,
  onEdit,
  onDelete,
  onTitleClick,
}: RelationsSectionProps) {
  return (
    <section>
      {/* 標題行 */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-muted-foreground bg-neutral-100">
          {links.length}
        </span>
      </div>

      {/* Chip 列表 */}
      {links.length > 0 ? (
        <ul
          role="list"
          aria-label={`${title}連結列表`}
          className="flex flex-wrap gap-2"
        >
          {links.map((link) => (
            <li key={link.id} className="contents">
              <RelationChip
                link_type={link.link_type}
                targetId={link.targetId}
                targetTitle={link.targetTitle}
                relation={link.relation}
                confidence={link.confidence}
                isLlmGenerated={link.isLlmGenerated}
                direction={direction}
                onEdit={direction === "out" && onEdit ? () => onEdit(link.id) : undefined}
                onDelete={direction === "out" && onDelete ? () => onDelete(link.id) : undefined}
                onTitleClick={onTitleClick}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">尚無連結</p>
      )}
    </section>
  );
}

// ─── 3. AddRelationForm ────────────────────────────────────────────────────────

const addRelationSchema = z.object({
  target_entry_id: z.string().min(1, "請選擇目標條目"),
  link_type: z.enum([
    "derives_from",
    "contradicts",
    "duplicate_of",
    "references",
    "supersedes",
    "related_to",
  ] as const, { required_error: "請選擇連結類型" }),
  relation: z.string().optional(),
});

type AddRelationFormValues = z.infer<typeof addRelationSchema>;

interface EntryOption {
  id: string;
  title: string;
  category: string;
}

interface AddRelationFormProps {
  onSubmit: (data: NewRelation) => Promise<void>;
  isLoading?: boolean;
  /** 搜尋條目的非同步函式 */
  searchEntries: (query: string) => Promise<EntryOption[]>;
}

export function AddRelationForm({
  onSubmit,
  isLoading = false,
  searchEntries,
}: AddRelationFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [entryOptions, setEntryOptions] = useState<EntryOption[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<EntryOption | null>(null);
  const [searching, setSearching] = useState(false);

  const form = useForm<AddRelationFormValues>({
    resolver: zodResolver(addRelationSchema),
    defaultValues: { target_entry_id: "", link_type: undefined, relation: "" },
  });

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setEntryOptions([]);
        return;
      }
      setSearching(true);
      try {
        const results = await searchEntries(query);
        setEntryOptions(results);
      } finally {
        setSearching(false);
      }
    },
    [searchEntries]
  );

  const handleSubmit = async (values: AddRelationFormValues) => {
    try {
      await onSubmit({
        target_entry_id: values.target_entry_id,
        link_type: values.link_type,
        relation: values.relation || undefined,
      });
      toast.success("連結已新增");
      form.reset();
      setSelectedEntry(null);
      setExpanded(false);
    } catch {
      toast.error("新增失敗，請重試");
    }
  };

  if (!expanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(true)}
        className="gap-1.5 text-muted-foreground hover:text-foreground mt-2"
      >
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        新增連結
      </Button>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mt-3 space-y-3 p-3 border border-border rounded-lg bg-background transition-all"
        aria-label="新增連結表單"
      >
        {/* 目標條目 Combobox */}
        <FormField
          control={form.control}
          name="target_entry_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">目標條目</FormLabel>
              <FormControl>
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <button
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      aria-label="選擇目標條目"
                      className={cn(
                        "w-full flex items-center justify-between",
                        "h-9 px-3 py-2 text-sm border border-input rounded-md bg-background",
                        "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        !selectedEntry && "text-muted-foreground"
                      )}
                    >
                      {selectedEntry ? (
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{selectedEntry.title}</span>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {selectedEntry.category}
                          </Badge>
                        </span>
                      ) : (
                        "搜尋條目..."
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="輸入關鍵字搜尋..."
                        onValueChange={handleSearch}
                        aria-label="搜尋條目"
                      />
                      <CommandList>
                        {searching ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">搜尋中...</div>
                        ) : (
                          <>
                            <CommandEmpty>找不到符合的條目</CommandEmpty>
                            <CommandGroup>
                              {entryOptions.map((entry) => (
                                <CommandItem
                                  key={entry.id}
                                  value={entry.id}
                                  onSelect={() => {
                                    setSelectedEntry(entry);
                                    field.onChange(entry.id);
                                    setComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === entry.id ? "opacity-100" : "opacity-0"
                                    )}
                                    aria-hidden="true"
                                  />
                                  <span className="flex-1 truncate">{entry.title}</span>
                                  <Badge variant="secondary" className="text-xs font-normal ml-2">
                                    {entry.category}
                                  </Badge>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* 連結類型 Select */}
        <FormField
          control={form.control}
          name="link_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">連結類型</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger aria-label="選擇連結類型" className="h-9 text-sm">
                    <SelectValue placeholder="選擇連結類型" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(LINK_TYPE_CONFIG) as LinkType[]).map((type) => {
                    const config = LINK_TYPE_CONFIG[type];
                    return (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: config.hex }}
                            aria-hidden="true"
                          />
                          {config.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* 關係說明 Input */}
        <FormField
          control={form.control}
          name="relation"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">
                關係說明
                <span className="text-muted-foreground font-normal ml-1">（選填）</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="關係描述（選填）"
                  className="h-9 text-sm"
                  aria-label="關係說明（選填）"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* 操作按鈕 */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || form.formState.isSubmitting}
            aria-busy={isLoading || form.formState.isSubmitting}
            className="flex-1"
          >
            {(isLoading || form.formState.isSubmitting) ? (
              <>
                <span
                  className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
                新增中...
              </>
            ) : (
              "新增連結"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setExpanded(false);
              form.reset();
              setSelectedEntry(null);
            }}
          >
            取消
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── 組合使用示範 ──────────────────────────────────────────────────────────────

/*
// 在 Entry Detail Panel 中使用：

const outgoingLinks: RelationLink[] = [
  {
    id: "link-1",
    link_type: "derives_from",
    targetId: "entry-abc",
    targetTitle: "機器學習基礎",
    confidence: 0.9,
    isLlmGenerated: true,
  },
  {
    id: "link-2",
    link_type: "references",
    targetId: "entry-def",
    targetTitle: "深度學習論文",
    relation: "核心參考",
    confidence: 1.0,
    isLlmGenerated: false,
  },
];

const incomingLinks: RelationLink[] = [
  {
    id: "link-3",
    link_type: "supersedes",
    targetId: "entry-ghi",
    targetTitle: "舊版神經網路筆記",
    confidence: 0.85,
    isLlmGenerated: true,
  },
];

function EntryRelationsPanel() {
  return (
    <div className="space-y-5">
      <RelationsSection
        title="連出"
        links={outgoingLinks}
        direction="out"
        onEdit={(id) => console.log("edit", id)}
        onDelete={(id) => console.log("delete", id)}
        onTitleClick={(id) => router.push(`/library/${id}`)}
      />

      <AddRelationForm
        onSubmit={async (data) => {
          await createLink(data);
        }}
        searchEntries={async (q) => fetchEntries(q)}
      />

      <RelationsSection
        title="連入"
        links={incomingLinks}
        direction="in"
        onTitleClick={(id) => router.push(`/library/${id}`)}
      />
    </div>
  );
}
*/

// ─── 獨立示範 ─────────────────────────────────────────────────────────────────

// outgoing chip（完整模式）
export const OutgoingChipExample = (
  <RelationChip
    link_type="derives_from"
    targetId="entry-1"
    targetTitle="機器學習基礎"
    relation="核心概念"
    confidence={0.9}
    isLlmGenerated={true}
    direction="out"
    onEdit={() => {}}
    onDelete={() => {}}
    onTitleClick={(id) => console.log("navigate to", id)}
  />
);

// incoming chip（唯讀，無 Edit/Delete）
export const IncomingChipExample = (
  <RelationChip
    link_type="supersedes"
    targetId="entry-2"
    targetTitle="舊版筆記"
    confidence={0.85}
    isLlmGenerated={true}
    direction="in"
    onTitleClick={(id) => console.log("navigate to", id)}
  />
);

// LLM 低信心虛線 chip（confidence < 0.7）
export const LowConfidenceChipExample = (
  <RelationChip
    link_type="contradicts"
    targetId="entry-3"
    targetTitle="相矛盾的觀點"
    confidence={0.5}
    isLlmGenerated={true}
    direction="out"
    onEdit={() => {}}
    onDelete={() => {}}
    onTitleClick={(id) => console.log("navigate to", id)}
  />
);
