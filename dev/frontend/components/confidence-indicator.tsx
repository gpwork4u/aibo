import { cn } from "@/lib/utils";

interface ConfidenceIndicatorProps {
  /** 0.0 - 1.0 */
  value: number;
  className?: string;
  showLabel?: boolean;
}

/**
 * 信心度 / 相關度指示器。
 * - 0.0-0.3 紅
 * - 0.3-0.7 黃
 * - 0.7-1.0 綠
 */
export function ConfidenceIndicator({
  value,
  className,
  showLabel = true,
}: ConfidenceIndicatorProps) {
  const v = Math.max(0, Math.min(1, value));
  const color =
    v < 0.3
      ? "bg-red-500"
      : v < 0.7
        ? "bg-yellow-500"
        : "bg-green-500";
  const label = v < 0.3 ? "低" : v < 0.7 ? "中" : "高";
  const pct = Math.round(v * 100);

  return (
    <div
      className={cn("inline-flex items-center gap-1.5 text-xs", className)}
      data-testid="confidence-indicator"
      title={`信心度 ${pct}%`}
    >
      <span className={cn("inline-block h-2 w-2 rounded-full", color)} />
      {showLabel && (
        <span className="text-muted-foreground">
          {label} · {pct}%
        </span>
      )}
    </div>
  );
}
