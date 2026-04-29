"use client";

/**
 * QuickCreateModal — 快速建立 Entry 的 Dialog（F-049）
 *
 * 行為：
 *   - TitleInput（auto focus）：必填
 *   - ContentTextarea（optional）
 *   - TagInput（optional，逗號分隔）
 *   - [Create as Draft]：status=inbox，source_type=manual
 *   - [Create & Classify]：同上，建立後呼叫 classify
 *   - Title 為空時按鈕 disabled，顯示 "Title is required"
 *   - 建立成功後：toast "Entry created — Open" + 關閉 Modal + 關閉 CmdK
 */

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import type { Entry } from "@/lib/api/entries";

interface QuickCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 關閉時同時關閉 CmdK */
  onDone: () => void;
}

interface CreateEntryPayload {
  title: string;
  content?: string;
  tags?: string[];
  status: "inbox";
  source_type: "manual";
}

interface CreateEntryResponse {
  data: Entry;
}

export function QuickCreateModal({ open, onOpenChange, onDone }: QuickCreateModalProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [tagsRaw, setTagsRaw] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  const titleEmpty = title.trim().length === 0;
  const showError = touched && titleEmpty;

  // 重置 form 狀態
  const resetForm = () => {
    setTitle("");
    setContent("");
    setTagsRaw("");
    setTouched(false);
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const parseTags = (): string[] =>
    tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  const mutation = useMutation<CreateEntryResponse, Error, { classify: boolean }>({
    mutationFn: async ({ classify }) => {
      const payload: CreateEntryPayload = {
        title: title.trim(),
        status: "inbox",
        source_type: "manual",
      };
      if (content.trim()) payload.content = content.trim();
      const tags = parseTags();
      if (tags.length > 0) payload.tags = tags;

      const res = await apiClient.post<CreateEntryPayload, CreateEntryResponse>(
        "/api/v1/entries",
        payload,
      );

      if (classify && res.data?.id) {
        await apiClient.post("/api/v1/entries/batch", {
          action: "classify",
          ids: [res.data.id],
        });
      }

      return res;
    },
    onSuccess: (res) => {
      const entryId = res.data?.id;
      toast.success("Entry created", {
        action: entryId
          ? {
              label: "Open",
              onClick: () => router.push(`/library/${entryId}`),
            }
          : undefined,
      });
      handleClose(false);
      onDone();
    },
    onError: () => {
      toast.error("建立失敗，請稍後再試");
    },
  });

  const handleCreate = (classify: boolean) => {
    setTouched(true);
    if (titleEmpty) return;
    mutation.mutate({ classify });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[480px]"
        aria-label="Quick Create Entry"
      >
        <DialogHeader>
          <DialogTitle>建立新 Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="qc-title">
              標題 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="qc-title"
              autoFocus
              placeholder="輸入標題..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={showError}
              aria-describedby={showError ? "qc-title-error" : undefined}
            />
            {showError && (
              <p id="qc-title-error" className="text-xs text-destructive">
                Title is required
              </p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="qc-content">內容（選填）</Label>
            <Textarea
              id="qc-content"
              placeholder="輸入內容..."
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="qc-tags">標籤（選填，逗號分隔）</Label>
            <Input
              id="qc-tags"
              placeholder="例：rust, concurrency, notes"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={mutation.isPending}
          >
            取消
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleCreate(true)}
            disabled={titleEmpty || mutation.isPending}
          >
            Create &amp; Classify
          </Button>
          <Button
            onClick={() => handleCreate(false)}
            disabled={titleEmpty || mutation.isPending}
          >
            Create as Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
