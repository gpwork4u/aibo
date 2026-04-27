"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Calendar,
  FileText,
  FolderTree,
  Github,
  Inbox,
  KanbanSquare,
  Key,
  Network,
  Search,
  Settings,
  Sun,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { useEffect, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  testId?: string;
};

interface SidebarProps {
  inboxCount?: number;
}

const SIDEBAR_COLLAPSED_KEY = "aibo_sidebar_collapsed";

export function useSidebarCollapsed() {
  return useLocalStorage<boolean>(SIDEBAR_COLLAPSED_KEY, false);
}

export function Sidebar({ inboxCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useLocalStorage<boolean>(
    SIDEBAR_COLLAPSED_KEY,
    false,
  );
  // hydration-safe: 初始 SSR 不知道 collapsed 狀態，client 載入後同步
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const main: NavItem[] = [
    {
      label: "Inbox",
      href: "/inbox",
      icon: Inbox,
      badge: inboxCount || undefined,
      testId: "nav-inbox",
    },
    { label: "Library", href: "/library", icon: FileText, testId: "nav-library" },
    { label: "Today", href: "/today", icon: Sun, testId: "nav-today" },
    { label: "Canvas", href: "/canvas", icon: Network, testId: "nav-canvas" },
    { label: "行事曆", href: "/calendar", icon: Calendar, testId: "nav-calendar" },
    { label: "專案", href: "/projects", icon: KanbanSquare, testId: "nav-projects" },
    { label: "知識條目", href: "/entries", icon: FileText, testId: "nav-entries" },
    { label: "分類管理", href: "/categories", icon: FolderTree, testId: "nav-categories" },
    { label: "搜尋", href: "/search", icon: Search, testId: "nav-search" },
  ];

  const settingsItems: NavItem[] = [
    { label: "設定", href: "/settings", icon: Settings, testId: "nav-settings" },
    { label: "API Key", href: "/settings/api-keys", icon: Key, testId: "nav-api-keys" },
    { label: "LLM Provider", href: "/settings/llm-providers", icon: Bot, testId: "nav-llm-providers" },
    { label: "Google Calendar", href: "/settings/gcal", icon: Calendar, testId: "nav-gcal" },
    { label: "GitHub", href: "/settings/github", icon: Github, testId: "nav-github" },
  ];

  const isCollapsed = mounted ? collapsed : false;

  return (
    <aside
      aria-label="主要導航"
      data-testid="app-sidebar"
      data-collapsed={isCollapsed}
      suppressHydrationWarning
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200",
        isCollapsed ? "w-14" : "w-64",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-3",
          isCollapsed ? "justify-center" : "justify-between",
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
              A
            </div>
            <span className="text-lg font-semibold">aibo</span>
          </div>
        )}
        {isCollapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            A
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 shrink-0", isCollapsed && "hidden")}
          onClick={() => setCollapsed(true)}
          aria-label="收合側邊欄"
          data-testid="sidebar-collapse-btn"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        <NavSection
          items={main}
          pathname={pathname}
          collapsed={isCollapsed}
          inboxCount={inboxCount}
        />
        <div className="my-2 border-t border-sidebar-border" />
        <NavSection
          items={settingsItems}
          pathname={pathname}
          collapsed={isCollapsed}
        />
      </nav>

      {/* Footer toggle */}
      <div className="border-t border-sidebar-border p-2 flex justify-end">
        {isCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(false)}
            aria-label="展開側邊欄"
            data-testid="sidebar-expand-btn"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground px-1">aibo v1.0.0</span>
        )}
      </div>
    </aside>
  );
}

function NavSection({
  items,
  pathname,
  collapsed,
  inboxCount,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  inboxCount?: number;
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        const badge = item.testId === "nav-inbox" ? inboxCount : item.badge;

        if (collapsed) {
          return (
            <li key={item.href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    data-testid={item.testId}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md text-sm font-medium transition-colors mx-auto",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            </li>
          );
        }

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              data-testid={item.testId}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {typeof badge === "number" && badge > 0 && (
                <Badge
                  variant="default"
                  aria-label={`${badge} 筆未分類條目`}
                  data-testid="sidebar-inbox-badge"
                  className="h-5 px-2 text-xs"
                >
                  {badge > 99 ? "99+" : badge}
                </Badge>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
