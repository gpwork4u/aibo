// Layout Shell 使用範例
// 技術棧：Tailwind CSS v4 + Next.js App Router
// 對應規格：design/components/layout-shell/spec.md

"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu, PanelLeft, X, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav, SidebarBottom } from "@/components/layout/sidebar-nav";
import { SearchTrigger } from "@/components/layout/search-trigger";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

// --- Shell State Context ---
interface ShellState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  copilotOpen: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  toggleCopilot: () => void;
}

// --- TopBar ---
function TopBar({
  sidebarCollapsed,
  onToggleSidebar,
  onToggleMobile,
  onToggleCopilot,
  isMobile,
}: {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobile: () => void;
  onToggleCopilot: () => void;
  isMobile: boolean;
}) {
  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  return (
    <header
      role="banner"
      className={cn(
        "fixed top-0 right-0 z-[300] h-14",
        "bg-[color:var(--background)] border-b border-[color:var(--border)]",
        "flex items-center px-4 gap-3",
        "shadow-[0_1px_2px_0_oklch(0.10_0.008_240/0.04)]",
        "transition-[left] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
      )}
      style={{ left: isMobile ? 0 : sidebarWidth }}
    >
      {/* Skip to content（a11y） */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[999] focus:px-4 focus:py-2 focus:bg-[color:var(--background)] focus:border focus:rounded-md focus:text-sm"
      >
        跳至主要內容
      </a>

      {/* Mobile 漢堡選單 */}
      {isMobile ? (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={<Menu className="w-5 h-5" />}
          aria-label="開啟導航選單"
          onClick={onToggleMobile}
        />
      ) : (
        /* Desktop Sidebar 收合 toggle */
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={<PanelLeft className="w-5 h-5" />}
          aria-label={sidebarCollapsed ? "展開側欄" : "收合側欄"}
          aria-expanded={!sidebarCollapsed}
          aria-controls="sidebar"
          onClick={onToggleSidebar}
        />
      )}

      {/* Search Trigger */}
      <SearchTrigger className="flex-1 max-w-xs" />

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={<Bot className="w-5 h-5" />}
          aria-label="開啟 Copilot"
          onClick={onToggleCopilot}
        />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

// --- Sidebar（Desktop） ---
function DesktopSidebar({
  collapsed,
  id = "sidebar",
}: {
  collapsed: boolean;
  id?: string;
}) {
  return (
    <aside
      id={id}
      className={cn(
        "fixed left-0 top-0 bottom-0 z-[300]",
        "bg-[color:var(--sidebar-bg)] border-r border-[color:var(--sidebar-border)]",
        "flex flex-col",
        "transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
      )}
      style={{ width: collapsed ? 64 : 240 }}
      aria-hidden={false}
    >
      {/* Logo 區 */}
      <div
        className={cn(
          "h-14 flex items-center border-b border-[color:var(--sidebar-border)] shrink-0",
          collapsed ? "justify-center px-4" : "px-5",
        )}
      >
        {collapsed ? (
          <span className="font-bold text-lg select-none">a</span>
        ) : (
          <span className="font-bold text-xl select-none">aibo</span>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="主要導航" className="flex-1 overflow-y-auto py-2">
        <SidebarNav collapsed={collapsed} />
      </nav>

      {/* Bottom */}
      <div className="shrink-0 border-t border-[color:var(--sidebar-border)] py-2">
        <SidebarBottom collapsed={collapsed} />
      </div>
    </aside>
  );
}

// --- CopilotSlot（右側抽屜，Desktop） ---
function CopilotSlot({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <aside
      className={cn(
        "fixed right-0 top-14 bottom-0 z-[400]",
        "w-[400px] bg-[color:var(--background)] border-l border-[color:var(--border)]",
        "flex flex-col",
        "transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        open ? "translate-x-0" : "translate-x-full",
      )}
      aria-label="Copilot 面板"
      aria-hidden={!open}
    >
      <div className="h-14 flex items-center justify-between px-4 border-b border-[color:var(--border)]">
        <span className="font-medium text-sm">Copilot</span>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={<X className="w-4 h-4" />}
          aria-label="關閉 Copilot"
          onClick={onClose}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {/* Copilot content slot */}
      </div>
    </aside>
  );
}

// --- 完整 Layout Shell ---
export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ⌘\ toggle Copilot
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setCopilotOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const sidebarWidth = sidebarCollapsed ? 64 : 240;
  const mainLeft = isMobile ? 0 : sidebarWidth;
  const mainRight = copilotOpen && !isMobile ? 400 : 0;

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <DesktopSidebar collapsed={sidebarCollapsed} />
      )}

      {/* Mobile Sidebar（Sheet） */}
      {isMobile && (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <DesktopSidebar collapsed={false} id="mobile-sidebar" />
          </SheetContent>
        </Sheet>
      )}

      {/* TopBar */}
      <TopBar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        onToggleMobile={() => setMobileSidebarOpen((v) => !v)}
        onToggleCopilot={() => setCopilotOpen((v) => !v)}
        isMobile={isMobile}
      />

      {/* MainArea */}
      <main
        id="main-content"
        className="min-h-screen pt-14 transition-[margin] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: mainLeft, marginRight: mainRight }}
      >
        <div className="max-w-[1200px] mx-auto px-6 py-6">
          {children}
        </div>
      </main>

      {/* Copilot Slot（Desktop） */}
      {!isMobile && (
        <CopilotSlot
          open={copilotOpen}
          onClose={() => setCopilotOpen(false)}
        />
      )}
    </div>
  );
}
