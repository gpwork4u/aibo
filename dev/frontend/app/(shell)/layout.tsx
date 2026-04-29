"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { MainArea } from "@/components/shell/main-area";
import { CopilotPanel } from "@/components/copilot/copilot-panel";
import { CmdkProvider } from "@/components/cmdk/cmdk-provider";
import { CommandPalette } from "@/components/cmdk/command-palette";
import { ShortcutsModal } from "@/components/shortcuts/shortcuts-modal";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useCopilotStore } from "@/lib/stores/copilot-store";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useApiKey } from "@/lib/hooks/use-api-key";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface InboxCountResponse {
  count?: number;
  total?: number;
  pagination?: { total?: number };
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const copilotOpen = useCopilotStore((s) => s.isOpen);
  const openCopilot = useCopilotStore((s) => s.open);
  const closeCopilot = useCopilotStore((s) => s.close);

  const handleToggleCopilot = () => {
    if (copilotOpen) {
      closeCopilot();
    } else {
      openCopilot();
    }
  };

  useKeyboardShortcuts({
    onOpenShortcutsModal: () => setShortcutsOpen(true),
    onToggleCopilot: handleToggleCopilot,
  });

  return (
    <>
      {children}
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { apiKey, hydrated } = useApiKey();

  useEffect(() => {
    if (hydrated && !apiKey) {
      router.replace("/bootstrap");
    }
  }, [apiKey, hydrated, router]);

  const { data } = useQuery({
    queryKey: ["inbox", "count"],
    queryFn: async () => {
      try {
        return await apiClient.get<InboxCountResponse>(
          "/api/v1/entries?category_id=null&is_archived=false&per_page=1",
        );
      } catch {
        return { count: 0, pagination: { total: 0 } };
      }
    },
    enabled: !!apiKey,
    staleTime: 60_000,
  });

  const inboxCount =
    data?.pagination?.total ?? data?.count ?? data?.total ?? 0;

  if (hydrated && !apiKey) {
    return null;
  }

  return (
    <CmdkProvider>
      <div className="flex h-screen w-full overflow-hidden">
        {/* 左側 Sidebar */}
        <Sidebar inboxCount={inboxCount} />

        {/* 中間區域：TopBar + 內容 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <MainArea>
            <ShellContent>{children}</ShellContent>
          </MainArea>
        </div>

        {/* 右側 Copilot Panel（zustand 管理開關狀態，跨路由保持） */}
        <CopilotPanel />

        {/* 全域 Command Palette overlay */}
        <CommandPalette />
      </div>
    </CmdkProvider>
  );
}
