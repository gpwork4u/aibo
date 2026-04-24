"use client";

import * as React from "react";
import { AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShowApiKeyDialogProps {
  /** 完整 API Key 明文；null 時不顯示 dialog。 */
  apiKey: string | null;
  onClose: () => void;
}

/**
 * 顯示建立成功後的完整 API Key。明文只會在這個 dialog 顯示一次，
 * 不會被儲存到 query cache 或任何持久化層。
 */
export function ShowApiKeyDialog({ apiKey, onClose }: ShowApiKeyDialogProps) {
  const handleCopy = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      toast.success("已複製到剪貼簿");
    } catch {
      toast.error("複製失敗，請手動選取複製");
    }
  };

  return (
    <Dialog
      open={!!apiKey}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent data-testid="show-api-key-dialog" className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            API Key 已建立
          </DialogTitle>
          <DialogDescription>
            請立即複製此 Key，關閉後將無法再次查看。
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
          <code
            data-testid="full-api-key"
            className="flex-1 break-all font-mono text-sm"
          >
            {apiKey}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-testid="copy-key-button"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
            <span className="sr-only">複製</span>
          </Button>
        </div>

        <DialogFooter>
          <Button
            data-testid="confirm-copied-button"
            onClick={onClose}
          >
            我已複製
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
