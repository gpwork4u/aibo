"use client";

/**
 * F-035 ThemeToggle — 使用 shadcn DropdownMenu 切換 light/dark/system。
 *
 * 此元件僅提供互動入口，不處理樣式 token；視覺由各 token 驅動。
 */
import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme, storageAvailable } = useTheme();

  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="切換主題"
          title={
            storageAvailable
              ? `當前主題：${theme}`
              : "localStorage 已停用，主題偏好無法保存"
          }
        >
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light{theme === "light" ? " ✓" : ""}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark{theme === "dark" ? " ✓" : ""}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System{theme === "system" ? " ✓" : ""}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
