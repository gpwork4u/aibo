"use client";

/**
 * F-046 RelationChip
 * 顯示單一 entry link 的 chip，支援 hover Edit/Delete（僅限 outgoing）
 */

import React, { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn } from "@/lib/utils";
import type { EntryLink, LinkType } from "@/lib/api/entry-links";
import { useUpdateEntryLink, useDeleteEntryLink } from "@/lib/hooks/use-entry-links";

// Link type 視覺對應
export const LINK_TYPE_CONFIG: Record<
  LinkType,
  { label: string; className: string }
> = {
  derives_from: {
    label: "衍生自",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  contradicts: {
    label: "矛盾於",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  duplicate_of: {
    label: "重複於",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  references: {
    label: "參考",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  supersedes: {
    label: "取代",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  related_to: {
    label: "關聯",
    className: "bg-green-100 text-green-700 border-green-200",
  },
};

const LINK_TYPES = Object.keys(LINK_TYPE_CONFIG) as LinkType[];

interface RelationChipProps {
  link: EntryLink;
  /** 當前的 entry id，用於判斷 outgoing / incoming */
  currentEntryId: string;
  /** incoming = 唯讀，無法 Edit/Delete */
  readonly?: boolean;
}

export const RelationChip = React.memo(function RelationChip({
  link,
  currentEntryId,
  readonly = false,
}: RelationChipProps) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editLinkType, setEditLinkType] = useState<LinkType>(link.link_type);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useUpdateEntryLink(currentEntryId);
  const deleteMutation = useDeleteEntryLink(currentEntryId);

  const config = LINK_TYPE_CONFIG[link.link_type] ?? LINK_TYPE_CONFIG.related_to;
  const isLowConfidence = link.confidence < 0.7 && link.source === "llm";
  const targetEntry = link.from_id === currentEntryId ? link.to_entry : link.from_entry;
  const targetTitle = targetEntry?.title ?? link.to_id;

  function handleSaveEdit() {
    updateMutation.mutate(
      { linkId: link.id, input: { link_type: editLinkType } },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleCancelEdit() {
    setEditLinkType(link.link_type);
    setEditing(false);
  }

  function handleDeleteConfirm() {
    deleteMutation.mutate(link.id, { onSuccess: () => setDeleteOpen(false) });
  }

  const isManual = link.source === "manual";

  return (
    <>
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all",
          isLowConfidence ? "border-dashed opacity-70" : "border-solid",
          "bg-[--surface] hover:bg-[--surface-2]",
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        data-testid="relation-chip"
      >
        {/* link_type badge */}
        {editing ? (
          <Select
            value={editLinkType}
            onValueChange={(v) => setEditLinkType(v as LinkType)}
          >
            <SelectTrigger className="h-5 w-28 text-xs px-1 py-0" data-testid="edit-link-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LINK_TYPES.map((lt) => (
                <SelectItem key={lt} value={lt} className="text-xs">
                  {LINK_TYPE_CONFIG[lt].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 h-4 border", config.className)}
            data-testid="link-type-badge"
          >
            {config.label}
          </Badge>
        )}

        {/* 對端 entry title */}
        <span className="font-medium text-[--fg] truncate max-w-[120px]" title={targetTitle ?? ""}>
          {targetTitle || "（未知）"}
        </span>

        {/* relation text */}
        {link.relation && (
          <span className="text-[--fg-muted] truncate max-w-[80px]" title={link.relation}>
            {link.relation}
          </span>
        )}

        {/* confidence badge（若 < 1.0） */}
        {link.confidence < 1.0 && (
          <span className="text-[--fg-subtle] text-[10px]">
            {Math.round(link.confidence * 100)}%
          </span>
        )}

        {/* 操作按鈕（非唯讀 + hover 時顯示） */}
        {!readonly && hovered && !editing && (
          <div className="flex items-center gap-0.5 ml-0.5" data-testid="chip-actions">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-[--surface-3]"
              onClick={() => setEditing(true)}
              data-testid="chip-edit-btn"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-red-100 hover:text-red-600"
              onClick={() => {
                if (isManual) {
                  setDeleteOpen(true);
                } else {
                  deleteMutation.mutate(link.id);
                }
              }}
              data-testid="chip-delete-btn"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* 編輯確認/取消 */}
        {!readonly && editing && (
          <div className="flex items-center gap-0.5 ml-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-green-100 hover:text-green-600"
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              data-testid="chip-save-btn"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-[--surface-3]"
              onClick={handleCancelEdit}
              data-testid="chip-cancel-btn"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* 刪除確認對話框（僅 manual） */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>刪除連結</AlertDialogTitle>
            <AlertDialogDescription>
              Remove link to {targetTitle ? `"${targetTitle}"` : "this entry"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-btn"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
