import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Kbd — keyboard shortcut 視覺元件（⌘K 等提示）
 * 自寫，吃 F-035 design tokens
 */

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(({ className, ...props }, ref) => (
  <kbd
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-ed-sm px-1.5 py-0.5",
      "border border-[--border] bg-[--bg-muted] text-[--fg-muted]",
      "font-mono text-xs shadow-[0_1px_0_rgba(0,0,0,0.08)]",
      className,
    )}
    {...props}
  />
));
Kbd.displayName = "Kbd";

export { Kbd };
