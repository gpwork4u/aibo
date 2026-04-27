// Pill Nav 使用範例
// 技術棧：Tailwind CSS v4 + Next.js App Router
// 對應規格：design/components/pill-nav/spec.md

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Inbox,
  BookOpen,
  CalendarDays,
  PenLine,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/inbox",   icon: Inbox,        label: "Inbox",   badge: 3 },
  { href: "/library", icon: BookOpen,     label: "Library"           },
  { href: "/today",   icon: CalendarDays, label: "今日"              },
  { href: "/canvas",  icon: PenLine,      label: "Canvas"            },
];

// --- 單個 Pill Nav Item ---
function PillNavItem({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  badge?: number;
}) {
  const content = (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        // Base styles
        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2",
        // Collapsed: center icon
        collapsed && "justify-center px-0",
        // Default state
        !active && "text-[color:var(--sidebar-fg)] hover:bg-[color:var(--sidebar-active-bg)]/60 hover:text-[color:var(--sidebar-active-fg)]",
        // Active state
        active && "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-fg)] font-medium",
      )}
    >
      {/* 左側色條（active 狀態） */}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-sm bg-[color:var(--accent)]"
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <Icon
        className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-5 h-5")}
        aria-hidden="true"
      />

      {/* Label（展開模式） */}
      {!collapsed && (
        <span className="flex-1 truncate">{label}</span>
      )}

      {/* Badge */}
      {!collapsed && badge && badge > 0 && (
        <span
          className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--accent)] px-1 text-xs font-medium text-[color:var(--accent-fg)]"
          aria-label={`${badge} 則未讀`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {label}
            {badge && badge > 0 && (
              <span className="ml-1 text-xs opacity-70">({badge})</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

// --- 完整 Sidebar Nav 範例 ---
export function SidebarNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主要導航"
      className={cn(
        "flex flex-col gap-1 px-2",
        collapsed && "items-center"
      )}
    >
      {NAV_ITEMS.map((item) => (
        <PillNavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          active={pathname.startsWith(item.href)}
          collapsed={collapsed}
          badge={item.badge}
        />
      ))}
    </nav>
  );
}

// --- Settings（底部分隔） ---
export function SidebarBottom({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  return (
    <div className={cn("px-2", collapsed && "flex flex-col items-center")}>
      <PillNavItem
        href="/settings"
        icon={Settings}
        label="設定"
        active={pathname.startsWith("/settings")}
        collapsed={collapsed}
      />
    </div>
  );
}
