import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — 自寫元件，吃 F-035 design tokens
 *
 * Variants: default / secondary / ghost / danger / link / outline
 * Sizes: sm / md (default) / lg
 *
 * Scenario: 自寫 Button variant
 * - variant="danger" → bg = var(--danger), text = var(--danger-fg)
 */

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-ed-md text-sm font-medium",
    "ring-offset-transparent transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ring]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        /** 主要動作：accent 背景 */
        default:
          "bg-[--accent] text-[--accent-fg] hover:bg-[--accent]/90",
        /** 次要動作：低調背景 */
        secondary:
          "bg-[--bg-muted] text-[--fg] hover:bg-[--bg-subtle]",
        /** Ghost：無背景，hover 顯示 */
        ghost:
          "text-[--fg] hover:bg-[--accent-soft] hover:text-[--tok-accent]",
        /** 危險操作：danger 背景 */
        danger:
          "bg-[--danger] text-[--danger-fg] hover:bg-[--danger]/90",
        /** 連結樣式 */
        link:
          "text-[--tok-accent] underline-offset-4 hover:underline",
        /** 外框樣式 */
        outline:
          "border border-[--border] bg-transparent text-[--fg] hover:bg-[--bg-subtle]",
      },
      size: {
        sm: "h-8 rounded-ed-sm px-3 text-xs",
        md: "h-9 px-4 py-2",
        lg: "h-11 rounded-ed-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
