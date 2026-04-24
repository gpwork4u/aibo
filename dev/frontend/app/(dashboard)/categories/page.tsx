"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, FolderTree, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ColumnDef, DataTable } from "@/components/data-table";
import { CategoryFormDialog } from "@/components/forms/category-form-dialog";
import { Category } from "@/lib/api/categories";
import { useCategories, useDeleteCategory } from "@/lib/hooks/use-categories";

export default function CategoriesPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useCategories();
  const deleteMut = useDeleteCategory();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [deleting, setDeleting] = React.useState<Category | null>(null);

  const sorted = React.useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => a.sort_order - b.sort_order);
  }, [data]);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      toast.success("分類已刪除", {
        description:
          deleting.entry_count > 0 ? "該分類下的條目已移至 Inbox" : undefined,
      });
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const columns: ColumnDef<Category>[] = [
    {
      id: "name",
      header: "名稱",
      accessor: (row) => <span className="font-medium">{row.name}</span>,
      sortKey: (row) => row.name.toLowerCase(),
    },
    {
      id: "description",
      header: "描述",
      accessor: (row) =>
        row.description ? (
          <span className="block max-w-[320px] truncate text-muted-foreground">
            {row.description}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "entry_count",
      header: "條目數",
      className: "w-[120px]",
      accessor: (row) => (
        <Badge variant="secondary" data-testid="category-entry-count">
          {row.entry_count} 條目
        </Badge>
      ),
      sortKey: (row) => row.entry_count,
    },
    {
      id: "sort_order",
      header: "排序",
      className: "w-[80px] text-muted-foreground",
      accessor: (row) => row.sort_order,
      sortKey: (row) => row.sort_order,
    },
    {
      id: "actions",
      header: "",
      className: "w-[50px]",
      accessor: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="分類操作"
              data-testid="category-actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              data-testid="edit-category-button"
              onClick={() => setEditing(row)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              編輯
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/entries?category_id=${row.id}`)}
            >
              <FileText className="mr-2 h-4 w-4" />
              查看條目
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              data-testid="delete-category-button"
              onClick={() => setDeleting(row)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              刪除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="分類管理"
        description="組織你的知識條目"
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            data-testid="create-category-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            建立分類
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : "載入分類失敗"}
          onRetry={() => refetch()}
        />
      ) : sorted.length === 0 ? (
        <div data-testid="categories-empty-state">
          <EmptyState
            icon={<FolderTree className="h-12 w-12" />}
            title="還沒有分類"
            description="建立分類來組織你的知識條目"
            action={
              <Button
                onClick={() => setCreateOpen(true)}
                data-testid="create-category-button-empty"
              >
                <Plus className="mr-2 h-4 w-4" />
                建立分類
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable
          data={sorted}
          columns={columns}
          rowKey={(row) => row.id}
          pageSize={20}
        />
      )}

      {/* 補上 e2e 測試需要的 category-row anchor（DataTable 沒支援 row-level testid） */}
      {sorted.length > 0 && (
        <div className="sr-only">
          {sorted.map((c) => (
            <div key={c.id} data-testid="category-row" data-id={c.id}>
              {c.name}
            </div>
          ))}
        </div>
      )}

      <CategoryFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CategoryFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        category={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent data-testid="delete-category-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除分類</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  刪除「{deleting.name}」後，該分類下的{" "}
                  <strong>{deleting.entry_count}</strong> 筆條目將移至 Inbox。此操作無法復原。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteMut.isPending}
              data-testid="delete-confirm-button"
            >
              {deleteMut.isPending ? "刪除中…" : "刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
