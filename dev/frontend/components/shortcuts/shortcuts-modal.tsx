"use client";

/**
 * ShortcutsModal — 顯示所有快捷鍵的 Dialog
 * trigger: ? 鍵（由 useKeyboardShortcuts hook 控制）
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: "Navigation",
    items: [
      { keys: ["⌘", "K"], description: "開啟 Command Palette" },
      { keys: ["G", "I"], description: "前往 Inbox" },
      { keys: ["G", "L"], description: "前往 Library" },
      { keys: ["G", "T"], description: "前往 Today" },
      { keys: ["G", "C"], description: "前往 Canvas" },
      { keys: ["G", "S"], description: "前往 Settings" },
      { keys: ["?"], description: "顯示此快捷鍵總覽" },
      { keys: ["Esc"], description: "關閉 overlay / modal" },
    ],
  },
  {
    title: "Inbox",
    items: [
      { keys: ["J"], description: "下一筆" },
      { keys: ["K"], description: "上一筆" },
      { keys: ["Enter"], description: "展開 / 編輯選中項目" },
      { keys: ["A"], description: "Archive 選中項目" },
      { keys: ["D"], description: "Delete（需確認）" },
      { keys: ["E"], description: "快速編輯 title" },
      { keys: ["Space"], description: "多選 toggle" },
    ],
  },
  {
    title: "Library",
    items: [
      { keys: ["J"], description: "下一筆" },
      { keys: ["K"], description: "上一筆" },
      { keys: ["Enter"], description: "開啟詳情 Sheet" },
      { keys: ["/"], description: "Focus 搜尋欄" },
      { keys: ["Esc"], description: "清除搜尋 / 關閉 Sheet" },
    ],
  },
  {
    title: "Entry",
    items: [
      { keys: ["E"], description: "進入編輯模式" },
      { keys: ["⌘", "S"], description: "儲存" },
      { keys: ["Esc"], description: "關閉 Sheet" },
    ],
  },
  {
    title: "Copilot",
    items: [
      { keys: ["Enter"], description: "送出訊息" },
      { keys: ["⇧", "Enter"], description: "換行" },
      { keys: ["⌘", "K"], description: "Focus Command Palette" },
    ],
  },
];

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[80vh] max-w-2xl overflow-y-auto"
        data-testid="shortcuts-modal"
      >
        <DialogHeader>
          <DialogTitle>鍵盤快捷鍵</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 text-sm font-semibold text-[--fg-muted] uppercase tracking-wide">
                {section.title}
              </h3>
              <div className="divide-y divide-[--border] rounded-lg border border-[--border]">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="text-sm text-[--fg-base]">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, ki) => (
                        <React.Fragment key={ki}>
                          {ki > 0 && (
                            <span className="text-xs text-[--fg-muted]">+</span>
                          )}
                          <Kbd>{k}</Kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
