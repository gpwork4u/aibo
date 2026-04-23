"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApiKey } from "@/lib/hooks/use-api-key";
import { fetchBootstrapStatus } from "@/lib/api/bootstrap";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const router = useRouter();
  const { apiKey, hydrated } = useApiKey();

  useEffect(() => {
    if (!hydrated) return;
    if (apiKey) {
      router.replace("/inbox");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchBootstrapStatus();
        if (cancelled) return;
        if (!status.bootstrapped) {
          router.replace("/bootstrap");
        } else {
          router.replace("/bootstrap");
        }
      } catch {
        if (!cancelled) router.replace("/bootstrap");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey, hydrated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
