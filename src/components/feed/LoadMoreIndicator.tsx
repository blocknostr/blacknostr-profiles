
import { Skeleton } from "@/components/ui/skeleton";

interface LoadMoreIndicatorProps {
  isLoading: boolean;
}

export default function LoadMoreIndicator({ isLoading }: LoadMoreIndicatorProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="flex justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    );
  }
  
  return (
    <span className="text-sm text-muted-foreground">Loading more notes...</span>
  );
}
