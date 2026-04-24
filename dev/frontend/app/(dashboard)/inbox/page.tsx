"use client";

import * as React from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntryList } from "@/components/entry-list";
import { EntryFormDialog } from "@/components/forms/entry-form-dialog";
import { QuickAddDialog } from "@/components/forms/quick-add-dialog";
import { useCategories, useEntries } from "@/lib/hooks/use-entries";
import type { EntryListItem } from "@/lib/api/entries";

const PER_PAGE = 20;

export default function InboxPage() {
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<string>("created_at:desc");
  const [page, setPage] = React.useState(1);

  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EntryListItem | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: categories = [] } = useCategories();

  const [sortField, sortOrder] = sortBy.split(":") as [string, "asc" | "desc"];

  const { data, isLoading, isError, error } = useEntries({
    page,
    per_page: PER_PAGE,
    search: search || undefined,
    sort: sortField,
    order: sortOrder,
    category_id: "null",
    is_archived: false,
  });

  const openEdit = (entry: EntryListItem) => {
    setEditing(entry);
    setEditOpen(true);
  };

  const emptyState = (
    <div
      className="flex flex-col items-center justify-center rounded-md border border-dashed py-16 text-center"
      data-testid="inbox-empty-state"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      </div>
      <h3 className="text-lg font-semibold">太棒了！</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        沒有待處理的條目，所有知識都已歸類
      </p>
      <Button
        variant="outline"
        className="mt-4"
        onClick={() => setQuickAddOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        記錄新想法
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="未分類的知識條目"
        action={
          <Button onClick={() => setQuickAddOpen(true)} data-testid="create-entry-button">
            <Plus className="mr-2 h-4 w-4" />
            快速新增
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="搜尋 Inbox..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="sm:w-[300px]"
          data-testid="entries-search-input"
        />
        <Select
          value={sortBy}
          onValueChange={(v) => {
            setSortBy(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="排序" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at:desc">最新建立</SelectItem>
            <SelectItem value="updated_at:desc">最近更新</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <EntryList
        data={data}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : undefined}
        categories={categories}
        showCategoryColumn={false}
        variant="inbox"
        page={page}
        onPageChange={setPage}
        onEdit={openEdit}
        hasActiveSearch={!!search}
        emptyState={emptyState}
      />

      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      <EntryFormDialog open={editOpen} onOpenChange={setEditOpen} entry={editing} />
    </div>
  );
}
