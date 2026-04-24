"use client";

import * as React from "react";
import { CheckCircle2, HelpCircle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type HealthStatusValue = "healthy" | "unhealthy" | "unknown" | "loading";

interface HealthStatusProps {
  status: HealthStatusValue;
  className?: string;
}

export function HealthStatus({ status, className }: HealthStatusProps) {
  const config: Record<
    HealthStatusValue,
    { Icon: React.ComponentType<{ className?: string }>; label: string; className: string }
  > = {
    healthy: { Icon: CheckCircle2, label: "Healthy", className: "text-success" },
    unhealthy: { Icon: XCircle, label: "Unhealthy", className: "text-destructive" },
    unknown: { Icon: HelpCircle, label: "未測試", className: "text-muted-foreground" },
    loading: { Icon: Loader2, label: "檢查中", className: "text-muted-foreground" },
  };
  const { Icon, label, className: colorClass } = config[status];
  return (
    <div
      className={cn("flex items-center gap-1.5", colorClass, className)}
      data-testid={`health-status-${status}`}
    >
      <Icon className={cn("h-4 w-4", status === "loading" && "animate-spin")} />
      <span className="text-xs">{label}</span>
    </div>
  );
}
