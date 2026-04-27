"use client";

/**
 * PagesGroup — Navigate 群組（靜態頁面列表）
 * 根據搜尋關鍵字過濾顯示（cmdk 內建 filter 已處理，此處只需宣告）
 */

import { useRouter } from "next/navigation";
import { LayoutDashboard, Inbox, BookOpen, Calendar, Settings } from "lucide-react";
import {
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";

interface Page {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

const PAGES: Page[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "inbox", label: "Inbox", href: "/inbox", icon: Inbox },
  { id: "library", label: "Library", href: "/entries", icon: BookOpen },
  { id: "calendar", label: "Calendar", href: "/calendar", icon: Calendar },
  { id: "settings", label: "Settings", href: "/settings/api-keys", icon: Settings },
];

interface PagesGroupProps {
  onSelect: () => void;
}

export function PagesGroup({ onSelect }: PagesGroupProps) {
  const router = useRouter();

  return (
    <CommandGroup heading="Navigate">
      {PAGES.map((page) => {
        const Icon = page.icon;
        return (
          <CommandItem
            key={page.id}
            value={page.label}
            onSelect={() => {
              router.push(page.href);
              onSelect();
            }}
          >
            <Icon className="mr-2 h-4 w-4 text-[--fg-subtle]" />
            {page.label}
            {page.shortcut && <CommandShortcut>{page.shortcut}</CommandShortcut>}
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
}
