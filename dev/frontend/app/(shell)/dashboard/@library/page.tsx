import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default async function LibrarySlot() {
  return (
    <Card data-testid="slot-library">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4" />
          Library
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">Library preview — F-041 Sprint 14</p>
      </CardContent>
    </Card>
  );
}
