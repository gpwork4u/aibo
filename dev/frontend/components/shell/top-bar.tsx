"use client";

import { Moon, Sun, Search } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TopBarProps {
  onSearchOpen?: () => void;
}

export function TopBar({ onSearchOpen }: TopBarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header
      data-testid="app-top-bar"
      className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6"
    >
      <div className="flex-1" />

      {/* 搜尋觸發（CmdK 由 F-037 接管） */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-2 text-muted-foreground w-48 justify-start"
            onClick={onSearchOpen}
            data-testid="topbar-search-trigger"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left text-sm">搜尋...</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              ⌘K
            </kbd>
          </Button>
        </TooltipTrigger>
        <TooltipContent>全域搜尋（F-037）</TooltipContent>
      </Tooltip>

      {/* ThemeToggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="切換主題"
        data-testid="theme-toggle"
      >
        <Sun className="h-4 w-4 dark:hidden" />
        <Moon className="hidden h-4 w-4 dark:block" />
      </Button>
    </header>
  );
}
