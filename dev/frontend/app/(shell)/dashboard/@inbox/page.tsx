import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox } from "lucide-react";

export default async function InboxSlot() {
  return (
    <Card data-testid="slot-inbox">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Inbox className="h-4 w-4" />
          Inbox
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">Inbox preview — F-040 Sprint 14</p>
      </CardContent>
    </Card>
  );
}
