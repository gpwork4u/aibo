import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  inbox: ReactNode;
  library: ReactNode;
  today: ReactNode;
  copilot: ReactNode;
}

export default function DashboardLayout({
  children,
  inbox,
  library,
  today,
  copilot,
}: DashboardLayoutProps) {
  return (
    <div className="space-y-6" data-testid="dashboard-layout">
      {children}
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
        data-testid="dashboard-slots"
      >
        <div data-testid="dashboard-slot-inbox">{inbox}</div>
        <div data-testid="dashboard-slot-library">{library}</div>
        <div data-testid="dashboard-slot-today">{today}</div>
        <div data-testid="dashboard-slot-copilot">{copilot}</div>
      </div>
    </div>
  );
}
