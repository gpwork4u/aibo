import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input — 自寫元件，吃 F-035 design tokens
 * 含 error state：傳入 aria-invalid="true" 或 error prop 顯示紅框
 */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 顯示錯誤狀態（紅框） */
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-ed-md px-3 py-2 text-sm",
        "border border-[--border] bg-[--surface] text-[--fg]",
        "placeholder:text-[--fg-subtle]",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ring]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // error state
        error && "border-[--danger] focus-visible:ring-[--danger]/40",
        className,
      )}
      aria-invalid={error || props["aria-invalid"]}
      {...props}
    />
  ),
);
Input.displayName = "Input";
export { Input };
