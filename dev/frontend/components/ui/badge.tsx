import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — 自寫元件，吃 F-035 design tokens
 *
 * Variants: default / secondary / outline / danger / success / warning
 */

const badgeVariants = cva(
  "inline-flex items-center rounded-ed-sm border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[--ring]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[--accent] text-[--accent-fg]",
        secondary:
          "border-transparent bg-[--bg-muted] text-[--fg-muted]",
        outline:
          "border-[--border] text-[--fg]",
        danger:
          "border-transparent bg-[--danger] text-[--danger-fg]",
        success:
          "border-transparent bg-[--success] text-[--success-fg]",
        warning:
          "border-transparent bg-[--warning] text-[--warning-fg]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
