"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { MainArea } from "@/components/shell/main-area";
import { CopilotSlot } from "@/components/shell/copilot-slot";
import { CmdkProvider } from "@/components/cmdk/cmdk-provider";
import { CommandPalette } from "@/components/cmdk/command-palette";
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

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { apiKey, hydrated } = useApiKey();
  const [copilotOpen, setCopilotOpen] = useState(false);

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
          <MainArea>{children}</MainArea>
        </div>

        {/* 右側 Copilot 佔位 */}
        <CopilotSlot open={copilotOpen} onClose={() => setCopilotOpen(false)} />

        {/* 全域 Command Palette overlay */}
        <CommandPalette />
      </div>
    </CmdkProvider>
  );
}
