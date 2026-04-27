import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun } from "lucide-react";

export default async function TodaySlot() {
  return (
    <Card data-testid="slot-today">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sun className="h-4 w-4" />
          Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">Today preview — F-042 Sprint 14</p>
      </CardContent>
    </Card>
  );
}
