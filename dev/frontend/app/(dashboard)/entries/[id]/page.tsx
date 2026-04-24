"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { MarkdownViewer } from "@/components/markdown-viewer";
import { EntryFormDialog } from "@/components/forms/entry-form-dialog";
import { MoveToCategoryPopover } from "@/components/move-to-category-popover";
import { ErrorState } from "@/components/error-state";
import {
  useCategories,
  useDeleteEntry,
  useEntry,
  useUpdateEntry,
} from "@/lib/hooks/use-entries";
import { formatDateTime } from "@/lib/utils";

export default function EntryDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const { data: entry, isLoading, isError, error } = useEntry(id);
  const { data: categories = [] } = useCategories();
  const updateMut = useUpdateEntry();
  const deleteMut = useDeleteEntry();

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const category = React.useMemo(
    () =>
      entry?.category_id ? categories.find((c) => c.id === entry.category_id) : null,
    [entry?.category_id, categories],
  );

  const handleArchive = async () => {
    if (!entry) return;
    try {
      await updateMut.mutateAsync({ id: entry.id, payload: { is_archived: true } });
      toast.success("條目已歸檔");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "歸檔失敗");
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    try {
      await deleteMut.mutateAsync(entry.id);
      toast.success("條目已刪除");
      router.push("/entries");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-32" />
        <Card>
          <CardHeader className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !entry) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/entries">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Link>
        </Button>
        <ErrorState
          message={error instanceof Error ? error.message : "條目不存在或已刪除"}
          onRetry={() => router.refresh()}
        />
      </div>
    );
  }

  const title = entry.title ?? "(無標題)";
  const content = entry.content ?? "";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/entries">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Link>
      </Button>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h1
              className={`text-xl font-semibold tracking-tight ${
                entry.title ? "" : "italic text-muted-foreground"
              }`}
              data-testid="entry-detail-title"
            >
              {title}
            </h1>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                data-testid="edit-entry-button"
              >
                <Pencil className="mr-2 h-4 w-4" />
                編輯
              </Button>
              <MoveToCategoryPopover entryId={entry.id}>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="移至分類"
                  data-testid="move-to-category-button"
                >
                  <FolderInput className="mr-2 h-4 w-4" />
                  移至分類
                </Button>
              </MoveToCategoryPopover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="更多操作"
                    data-testid="entry-actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onSelect={handleArchive}>
                    <Archive className="mr-2 h-4 w-4" />
                    歸檔
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setDeleteOpen(true);
                    }}
                    className="text-destructive focus:text-destructive"
                    data-testid="delete-entry-menu-item"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    刪除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {category ? (
              <Badge variant="secondary">{category.name}</Badge>
            ) : (
              <Badge variant="outline">未分類</Badge>
            )}
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
            {entry.source_type && (
              <span className="text-xs">來源：{entry.source_type}</span>
            )}
            <span className="text-xs">建立：{formatDateTime(entry.created_at)}</span>
            <span className="text-xs">更新：{formatDateTime(entry.updated_at)}</span>
          </div>
        </CardHeader>
        <CardContent>
          {content ? (
            <MarkdownViewer content={content} data-testid="entry-markdown-content" />
          ) : (
            <p
              className="text-sm italic text-muted-foreground"
              data-testid="entry-markdown-content"
            >
              (無內容)
            </p>
          )}
        </CardContent>
      </Card>

      <EntryFormDialog open={editOpen} onOpenChange={setEditOpen} entry={entry} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent data-testid="delete-entry-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原。確定要刪除「{title}」嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
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
