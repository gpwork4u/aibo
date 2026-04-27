"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorCardProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorCard({
  title = "載入失敗",
  description = "無法取得資料，請稍後再試",
  onRetry,
}: ErrorCardProps) {
  return (
    <Card data-testid="error-card" className="border-destructive/50">
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            data-testid="error-card-retry"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            重試
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
