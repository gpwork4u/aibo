"use client";

/**
 * CommandPalette — 全域 ⌘K command palette 主元件
 *
 * 結構：
 *   - Dialog overlay（cmdk CommandDialog）
 *   - search input（自動 focus）
 *   - 三個群組：Pages（Navigate）/ Recent Entries / Quick Actions
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
import { RecentEntriesGroup } from "./groups/recent-entries";
import { QuickActionsGroup } from "./groups/quick-actions";

export function CommandPalette() {
  const { open, setOpen, toggle } = useCmdk();
  const [inputValue, setInputValue] = React.useState("");
  const debouncedQuery = useDebouncedValue(inputValue, 200);

  // 全域 ⌘K / Ctrl+K 快捷鍵
  useCommandPaletteShortcut(toggle);

  // 關閉時清空搜尋
  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setInputValue("");
  };

  const handleSelect = () => {
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="overflow-hidden p-0 shadow-2xl sm:max-w-[560px]"
        aria-label="Command Palette"
      >
        <Command
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[--fg-muted]"
          shouldFilter={true}
          onKeyDown={(e) => {
            // 跳過 IME 組字中的 Enter
            if ((e.nativeEvent as KeyboardEvent & { isComposing?: boolean }).isComposing) return;
          }}
        >
          <CommandInput
            placeholder="搜尋頁面、entries、動作..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>找不到相關指令或 entry</CommandEmpty>

            {/* Navigate 群組 — 靜態頁面 */}
            <PagesGroup onSelect={handleSelect} />

            {/* Recent Entries 群組 — 查詢 API */}
            {debouncedQuery.length >= 2 && (
              <>
                <CommandSeparator />
                <RecentEntriesGroup query={debouncedQuery} onSelect={handleSelect} />
              </>
            )}

            {/* Quick Actions 群組 */}
            <CommandSeparator />
            <QuickActionsGroup onSelect={handleSelect} />
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
