
import { useEffect, useState } from "react";
import { useNostr } from "@/contexts/NostrContext";
import NoteCard from "./NoteCard";
import { NostrProfile } from "@/lib/nostr";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react"; // Using lucide-react instead of @radix-ui/react-icons
import { Button } from "@/components/ui/button";

interface NoteFeedProps {
  pubkey?: string;
  following?: boolean;
}

export default function NoteFeed({ pubkey, following = false }: NoteFeedProps) {
  const { notes, fetchNotes, fetchProfile, getFollowingList, pool, relays, isLoading: contextLoading } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, NostrProfile>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);
      
      if (following) {
        // For following feed, we need to get the list of followed pubkeys
        const followingList = await getFollowingList();
        if (followingList && followingList.length > 0) {
          await fetchNotes(undefined, followingList);
        } else {
          // If not following anyone, show empty state
          setIsLoading(false);
        }
      } else {
        // For global or user-specific feed
        await fetchNotes(pubkey);
      }
      
      setIsLoading(false);
    };

    loadNotes();
  }, [fetchNotes, pubkey, following, getFollowingList]);

  useEffect(() => {
    // Fetch profiles for all unique authors
    const fetchProfiles = async () => {
      const uniqueAuthors = [...new Set(notes.map(note => note.pubkey))];
      const profiles: Record<string, NostrProfile> = {};

      for (const pubkey of uniqueAuthors) {
        const profile = await fetchProfile(pubkey);
        if (profile) {
          profiles[pubkey] = profile;
        }
      }

      setAuthorProfiles(profiles);
    };

    if (notes.length > 0) {
      fetchProfiles();
    }
  }, [notes, fetchProfile]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (following) {
      const followingList = await getFollowingList();
      await fetchNotes(undefined, followingList);
    } else {
      await fetchNotes(pubkey);
    }
    setIsRefreshing(false);
  };

  if (isLoading || contextLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 p-4 border rounded-lg dark:bg-nostr-cardBg">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (following && notes.length === 0) {
    return (
      <div className="text-center py-12 dark:bg-nostr-cardBg bg-muted/30 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-2">Your feed is empty</h3>
        <p className="text-muted-foreground mb-4">Follow some users to see their posts here!</p>
        <Button 
          onClick={handleRefresh} 
          variant="outline"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 dark:bg-nostr-cardBg bg-muted/30 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-2">No notes found</h3>
        <p className="text-muted-foreground mb-4">Be the first to post something!</p>
        <Button 
          onClick={handleRefresh} 
          variant="outline"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={isRefreshing}
          className="text-xs"
        >
          {isRefreshing ? (
            <>
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </>
          )}
        </Button>
      </div>
      
      <div className="space-y-4">
        {notes.map((note) => (
          <NoteCard 
            key={note.id} 
            note={note} 
            authorProfile={authorProfiles[note.pubkey]} 
          />
        ))}
      </div>
    </div>
  );
}
