"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { UNAUTHORIZED_EVENT } from "@/lib/api/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    const onUnauthorized = () => {
      toast.error("API Key 無效，請重新設定");
      router.push("/bootstrap");
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized as EventListener);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized as EventListener);
    };
  }, [router]);

  return (
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={client}>
        {children}
        <Toaster />
        {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
