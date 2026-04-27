import { Skeleton } from "@/components/ui/skeleton";

export default function TodayLoading() {
  return <Skeleton className="h-32 w-full rounded-lg" data-testid="slot-today-loading" />;
}
