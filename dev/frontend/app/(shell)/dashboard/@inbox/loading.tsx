import { Skeleton } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return <Skeleton className="h-32 w-full rounded-lg" data-testid="slot-inbox-loading" />;
}
