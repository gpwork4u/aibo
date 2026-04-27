import { cn } from "@/lib/utils";

interface MainAreaProps {
  children: React.ReactNode;
  className?: string;
}

export function MainArea({ children, className }: MainAreaProps) {
  return (
    <main
      data-testid="app-main"
      className={cn("flex-1 overflow-y-auto p-4 md:p-6 min-h-0", className)}
    >
      {children}
    </main>
  );
}
