
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface EmptyFeedStateProps {
  isFollowingFeed?: boolean;
  onRefresh: () => void;
}

export default function EmptyFeedState({ isFollowingFeed, onRefresh }: EmptyFeedStateProps) {
  if (isFollowingFeed) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Your following feed will appear here.</p>
        <p>Follow some users to see their posts!</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          className="mt-4 flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium">No notes found</h3>
      <p className="text-muted-foreground">Be the first to post something!</p>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRefresh}
        className="mt-4 flex items-center gap-1"
      >
        <RefreshCw className="h-4 w-4" />
        <span>Refresh</span>
      </Button>
    </div>
  );
}
