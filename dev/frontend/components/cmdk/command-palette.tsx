"use client";

/**
 * CommandPalette — 全域 ⌘K command palette 主元件（F-037 + F-049 Power Actions）
 *
 * 結構：
 *   - Dialog overlay（cmdk CommandDialog）
 *   - search input（自動 focus）
 *   - AI mode（`>` prefix）：只顯示 AIActionsGroup
 *   - 一般模式：
 *       · Navigate（PagesGroup）
 *       · Create（CreateActionsGroup）
 *       · Search Results（EntriesSearchGroup，3+ chars debounce 200ms）
 *       · Quick Actions（QuickActionsGroup）
 *
 * 生命週期：
 *   - open/close 由 CmdkProvider 管理
 *   - ⌘K 快捷鍵由 useCommandPaletteShortcut hook 負責
 *   - Esc 由 cmdk/radix Dialog 內建處理（onOpenChange(false)）
 *   - 選取後自動關閉（onSelect callback）
 */

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandSeparator,
} from "@/components/ui/command";
import { useCmdk } from "./cmdk-provider";
import { useCommandPaletteShortcut } from "@/lib/hooks/use-cmdk-hotkey";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { PagesGroup } from "./groups/pages";
import { QuickActionsGroup } from "./groups/quick-actions";
import { EntriesSearchGroup } from "./groups/entries-search";
import { AIActionsGroup } from "./groups/ai-actions";
import { CreateActionsGroup } from "./groups/create-actions";
import { QuickCreateModal } from "./quick-create-modal";

export function CommandPalette() {
  const { open, setOpen, toggle } = useCmdk();
  const [inputValue, setInputValue] = React.useState("");
  const debouncedQuery = useDebouncedValue(inputValue, 200);
  const [quickCreateOpen, setQuickCreateOpen] = React.useState(false);

  // 全域 ⌘K / Ctrl+K 快捷鍵
  useCommandPaletteShortcut(toggle);

  // `>` prefix → AI Actions 模式
  const isAiMode = inputValue.startsWith(">");

  // 關閉時清空搜尋
  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setInputValue("");
  };

  const handleSelect = () => {
    handleOpenChange(false);
  };

  // 開啟 QuickCreateModal（不關閉 CmdK，等 modal 完成後再關）
  const handleNewEntry = () => {
    setQuickCreateOpen(true);
  };

  // QuickCreateModal 完成 → 關閉 CmdK + modal
  const handleQuickCreateDone = () => {
    setQuickCreateOpen(false);
    handleOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="overflow-hidden p-0 shadow-2xl sm:max-w-[560px]"
          aria-label="Command Palette"
        >
          <Command
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[--fg-muted]"
            shouldFilter={!isAiMode}
            onKeyDown={(e) => {
              // 跳過 IME 組字中的 Enter
              if ((e.nativeEvent as KeyboardEvent & { isComposing?: boolean }).isComposing) return;
            }}
          >
            <CommandInput
              placeholder="搜尋頁面、entries、動作... 或 > 輸入 AI 指令"
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList className="max-h-[400px]">
              <CommandEmpty>找不到相關指令或 entry</CommandEmpty>

              {isAiMode ? (
                /* AI Actions 模式：只顯示 AI 指令 */
                <AIActionsGroup rawInput={inputValue} onSelect={handleSelect} />
              ) : (
                <>
                  {/* Navigate 群組 — 靜態頁面 */}
                  <PagesGroup onSelect={handleSelect} />

                  {/* Create 群組 */}
                  <CommandSeparator />
                  <CreateActionsGroup
                    onNewEntry={handleNewEntry}
                    onSelect={handleSelect}
                  />

                  {/* Search Results 群組 — 3+ 字元才顯示 */}
                  {debouncedQuery.length >= 3 && (
                    <>
                      <CommandSeparator />
                      <EntriesSearchGroup
                        query={debouncedQuery}
                        onSelect={handleSelect}
                      />
                    </>
                  )}

                  {/* Quick Actions 群組 */}
                  <CommandSeparator />
                  <QuickActionsGroup onSelect={handleSelect} />
                </>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* QuickCreateModal — 在 CmdK 之外 render 避免 Dialog 巢狀問題 */}
      <QuickCreateModal
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        onDone={handleQuickCreateDone}
      />
    </>
  );
}
