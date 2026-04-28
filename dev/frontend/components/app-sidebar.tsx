"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  BookOpen,
  Calendar,
  FileText,
  FolderTree,
  Github,
  Inbox,
  KanbanSquare,
  Key,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UpcomingTasksWidget } from "@/components/task/upcoming-tasks-widget";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  testId?: string;
};

interface AppSidebarProps {
  inboxCount?: number;
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ inboxCount = 0, open, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  const main: NavItem[] = [
    { label: "Inbox", href: "/inbox", icon: Inbox, badge: inboxCount || undefined, testId: "nav-inbox" },
    { label: "Library", href: "/library", icon: BookOpen, testId: "nav-library" },
    { label: "行事曆", href: "/calendar", icon: Calendar, testId: "nav-calendar" },
    { label: "專案", href: "/projects", icon: KanbanSquare, testId: "nav-projects" },
    { label: "知識條目", href: "/entries", icon: FileText, testId: "nav-entries" },
    { label: "分類管理", href: "/categories", icon: FolderTree, testId: "nav-categories" },
    { label: "搜尋", href: "/search", icon: Search, testId: "nav-search" },
  ];
  const settings: NavItem[] = [
    { label: "API Key", href: "/settings/api-keys", icon: Key, testId: "nav-api-keys" },
    { label: "LLM Provider", href: "/settings/llm-providers", icon: Bot, testId: "nav-llm-providers" },
    { label: "Google Calendar", href: "/settings/gcal", icon: Calendar, testId: "nav-gcal" },
    { label: "GitHub", href: "/settings/github", icon: Github, testId: "nav-github" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 md:hidden",
          open ? "block" : "hidden",
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label="主要導航"
        data-testid="app-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
              A
            </div>
            <span className="text-lg font-semibold">aibo</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onClose}
            aria-label="關閉側邊欄"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-2">
          <NavGroup title="主要功能" items={main} pathname={pathname} />
          <NavGroup title="設定" items={settings} pathname={pathname} />
        </nav>

        <div className="border-t border-sidebar-border p-3 space-y-3">
          <UpcomingTasksWidget />
          <p className="text-xs text-muted-foreground">aibo v1.0.0</p>
        </div>
      </aside>
    </>
  );
}

function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div>
      <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
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
                {typeof item.badge === "number" && item.badge > 0 && (
                  <Badge
                    variant="default"
                    aria-label={`${item.badge} 筆未分類條目`}
                    data-testid="sidebar-inbox-badge"
                    className="h-5 px-2 text-xs"
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </Badge>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
