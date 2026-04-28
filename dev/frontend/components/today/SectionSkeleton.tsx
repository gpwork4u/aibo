import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SectionSkeletonProps {
  title?: string;
  rows?: number;
}

export function SectionSkeleton({ title, rows = 3 }: SectionSkeletonProps) {
  return (
    <Card data-testid="section-skeleton">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
