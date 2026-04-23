"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useApiKey } from "@/lib/hooks/use-api-key";
import { apiClient } from "@/lib/api/client";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";

interface InboxCountResponse {
  count?: number;
  total?: number;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { apiKey, hydrated } = useApiKey();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !apiKey) {
      router.replace("/bootstrap");
    }
  }, [apiKey, hydrated, router]);

  const { data } = useQuery({
    queryKey: ["inbox", "count"],
    queryFn: async () => {
      try {
        return await apiClient.get<InboxCountResponse>("/api/v1/inbox/count");
      } catch {
        return { count: 0 };
      }
    },
    enabled: !!apiKey,
    staleTime: 60_000,
  });

  const inboxCount = data?.count ?? data?.total ?? 0;

  if (hydrated && !apiKey) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar
        inboxCount={inboxCount}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
