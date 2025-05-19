
import { useNostr } from '@/contexts/NostrContext';
import { Button } from '@/components/ui/button';
import { RefreshCw, Inbox, UserPlus } from 'lucide-react';

export interface EmptyFeedStateProps {
  message: string;
  followingFeed?: boolean;
  onRefresh?: () => void;
}

export default function EmptyFeedState({ 
  message, 
  followingFeed,
  onRefresh 
}: EmptyFeedStateProps) {
  const { isAuthenticated } = useNostr();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="bg-muted/30 rounded-full p-4">
        {followingFeed ? <UserPlus className="h-12 w-12 text-muted-foreground" /> : <Inbox className="h-12 w-12 text-muted-foreground" />}
      </div>
      <h3 className="text-xl font-medium">{message}</h3>
      
      <div className="flex gap-2">
        {onRefresh && (
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
        
        {isAuthenticated && followingFeed && (
          <Button asChild>
            <a href="/profile">Find People to Follow</a>
          </Button>
        )}
      </div>
    </div>
  );
}
