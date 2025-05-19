
import { forwardRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadMoreIndicatorProps {
  isLoading: boolean;
}

const LoadMoreIndicator = forwardRef<HTMLDivElement, LoadMoreIndicatorProps>(
  ({ isLoading }, ref) => {
    return (
      <div ref={ref} className="py-4 text-center">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="flex justify-between">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Loading more notes...</span>
        )}
      </div>
    );
  }
);

LoadMoreIndicator.displayName = "LoadMoreIndicator";

export default LoadMoreIndicator;
