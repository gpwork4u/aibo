"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CollapsibleContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Collapsible({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...props
}: CollapsibleProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolled;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );
  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <div data-state={open ? "open" : "closed"} className={cn(className)} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ asChild, onClick, children, ...props }, ref) => {
    const ctx = React.useContext(CollapsibleContext);
    if (!ctx) throw new Error("CollapsibleTrigger must be inside Collapsible");
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      ctx.setOpen(!ctx.open);
      onClick?.(e);
    };
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<
        React.ButtonHTMLAttributes<HTMLButtonElement>
      >;
      return React.cloneElement(child, {
        ...props,
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          handleClick(e);
          child.props.onClick?.(e);
        },
        "aria-expanded": ctx.open,
        "data-state": ctx.open ? "open" : "closed",
      } as React.ButtonHTMLAttributes<HTMLButtonElement>);
    }
    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={ctx.open}
        data-state={ctx.open ? "open" : "closed"}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  },
);
CollapsibleTrigger.displayName = "CollapsibleTrigger";

export function CollapsibleContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) throw new Error("CollapsibleContent must be inside Collapsible");
  if (!ctx.open) return null;
  return (
    <div data-state="open" className={cn(className)} {...props}>
      {children}
    </div>
  );
}
