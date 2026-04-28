"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  sectionName: string;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * 各 Today section 獨立 error boundary。
 * 單一 section 的 render error 不會影響其他 section。
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return { hasError: true, errorMessage: message };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <Card
          className="border-destructive/40"
          data-testid={`section-error-${this.props.sectionName}`}
        >
          <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Could not load {this.props.sectionName}</span>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
