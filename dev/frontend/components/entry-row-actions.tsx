"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Eye,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { MoveToCategoryPopover } from "@/components/move-to-category-popover";
import { useDeleteEntry, useUpdateEntry } from "@/lib/hooks/use-entries";
import type { Entry, EntryListItem } from "@/lib/api/entries";

type RowEntry = Entry | EntryListItem;

interface EntryRowActionsProps {
  entry: RowEntry;
  onEdit: (entry: RowEntry) => void;
  /** Inbox 模式會讓「移至分類」成為第一個項目 */
  variant?: "default" | "inbox";
}

export function EntryRowActions({ entry, onEdit, variant = "default" }: EntryRowActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const updateMut = useUpdateEntry();
  const deleteMut = useDeleteEntry();

  const title = entry.title ?? entry.id.slice(0, 8);

  const handleArchive = async () => {
    try {
      await updateMut.mutateAsync({ id: entry.id, payload: { is_archived: true } });
      toast.success("條目已歸檔");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "歸檔失敗";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMut.mutateAsync(entry.id);
      toast.success("條目已刪除");
      setDeleteOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "刪除失敗";
      toast.error(msg);
    }
  };

  const items = (
    <>
      <DropdownMenuItem onSelect={() => router.push(`/entries/${entry.id}`)}>
        <Eye className="mr-2 h-4 w-4" />
        查看
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onEdit(entry)}>
        <Pencil className="mr-2 h-4 w-4" />
        編輯
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={handleArchive}>
        <Archive className="mr-2 h-4 w-4" />
        歸檔
      </DropdownMenuItem>
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
    </>
  );

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {/* 獨立「移至分類」Popover，方便 e2e 測試與 UX 直接操作 */}
        <MoveToCategoryPopover entryId={entry.id}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            aria-label="移至分類"
            data-testid="move-to-category-button"
          >
            <FolderInput className="h-4 w-4" />
          </Button>
        </MoveToCategoryPopover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="更多操作"
              data-testid="entry-actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {items}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
    </>
  );
}
