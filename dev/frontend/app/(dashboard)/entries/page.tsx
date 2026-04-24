"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
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
import { useCategories, useEntries } from "@/lib/hooks/use-entries";
import type { EntryListItem } from "@/lib/api/entries";

const PER_PAGE = 20;

export default function EntriesPage() {
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("updated_at:desc");
  const [page, setPage] = React.useState(1);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EntryListItem | null>(null);

  // 搜尋 debounce 300ms
  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: categories = [] } = useCategories();

  const [sortField, sortOrder] = sortBy.split(":") as [string, "asc" | "desc"];

  const listParams = {
    page,
    per_page: PER_PAGE,
    search: search || undefined,
    sort: sortField,
    order: sortOrder,
    category_id:
      categoryFilter === "all"
        ? undefined
        : categoryFilter === "null"
          ? "null"
          : categoryFilter,
    is_archived: false,
  };

  const { data, isLoading, isError, error } = useEntries(listParams);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (entry: EntryListItem) => {
    setEditing(entry);
    setFormOpen(true);
  };

  const hasActiveSearch = !!search;

  return (
    <div className="space-y-6">
      <PageHeader
        title="知識條目"
        description="管理你的知識庫"
        action={
          <Button onClick={openCreate} data-testid="create-entry-button">
            <Plus className="mr-2 h-4 w-4" />
            建立條目
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="搜尋條目..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="sm:w-[300px]"
          data-testid="entries-search-input"
        />
        <div className="flex flex-wrap gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]" data-testid="category-filter-select">
              <SelectValue placeholder="所有分類" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有分類</SelectItem>
              <SelectItem value="null" data-testid="category-option-null">
                未分類
              </SelectItem>
              {categories.map((cat) => (
                <SelectItem
                  key={cat.id}
                  value={cat.id}
                  data-testid={`category-option-${cat.id}`}
                >
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
              <SelectItem value="title:asc">標題 A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <EntryList
        data={data}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : undefined}
        categories={categories}
        page={page}
        onPageChange={setPage}
        onEdit={openEdit}
        hasActiveSearch={hasActiveSearch}
        emptyState={
          <EmptyState
            title="還沒有知識條目"
            description="建立你的第一筆知識條目開始使用"
            action={
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                建立條目
              </Button>
            }
          />
        }
      />

      <EntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={editing}
      />
    </div>
  );
}
