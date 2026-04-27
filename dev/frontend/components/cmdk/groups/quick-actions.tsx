"use client";

/**
 * QuickActionsGroup — 快速動作群組（skeleton 階段）
 * 本 sprint 只放：Toggle theme / Open Settings
 * Power actions 留 Sprint 16 F-049
 */

import { useRouter } from "next/navigation";
import { Sun, Settings } from "lucide-react";
import {
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useTheme } from "@/components/theme/theme-provider";

interface QuickActionsGroupProps {
  onSelect: () => void;
}

export function QuickActionsGroup({ onSelect }: QuickActionsGroupProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const handleToggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    onSelect();
  };

  const handleOpenSettings = () => {
    router.push("/settings/api-keys");
    onSelect();
  };

  return (
    <CommandGroup heading="Quick Actions">
      <CommandItem
        value="toggle theme switch dark light mode"
        onSelect={handleToggleTheme}
      >
        <Sun className="mr-2 h-4 w-4 text-[--fg-subtle]" />
        切換主題（{resolvedTheme === "dark" ? "切換到亮色" : "切換到暗色"}）
      </CommandItem>
      <CommandItem
        value="open settings 設定"
        onSelect={handleOpenSettings}
      >
        <Settings className="mr-2 h-4 w-4 text-[--fg-subtle]" />
        開啟設定
      </CommandItem>
    </CommandGroup>
  );
}
