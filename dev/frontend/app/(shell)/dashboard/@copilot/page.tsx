import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";

export default async function CopilotSlotPage() {
  return (
    <Card data-testid="slot-copilot">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Bot className="h-4 w-4" />
          Copilot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">Copilot preview — F-047 Sprint 16</p>
      </CardContent>
    </Card>
  );
}
