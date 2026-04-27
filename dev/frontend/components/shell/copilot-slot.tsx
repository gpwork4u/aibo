"use client";

import { X, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopilotSlotProps {
  open: boolean;
  onClose: () => void;
}

export function CopilotSlot({ open, onClose }: CopilotSlotProps) {
  return (
    <aside
      data-testid="copilot-slot"
      aria-label="Copilot 助手"
      className={cn(
        "sticky top-0 h-screen border-l border-border bg-background transition-all duration-200 overflow-hidden flex flex-col",
        open ? "w-80" : "w-0",
      )}
    >
      {open && (
        <>
          <div className="flex h-14 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="text-sm font-medium">Copilot</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="關閉 Copilot"
              data-testid="copilot-close-btn"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <p className="text-sm">Copilot SSE — F-047 Sprint 16</p>
          </div>
        </>
      )}
    </aside>
  );
}
