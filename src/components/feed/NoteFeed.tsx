
import { useEffect, useState, useRef, useCallback } from "react";
import { useNostr } from "@/contexts/NostrContext";
import NoteCard from "./NoteCard";
import { NostrProfile, NostrNote } from "@/lib/nostr";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface NoteFeedProps {
  pubkey?: string;
  followingFeed?: boolean;
}

export default function NoteFeed({ pubkey, followingFeed }: NoteFeedProps) {
  const { notes, fetchNotes, fetchProfile, subscribeToNotes, unsubscribeFromNotes } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [feedNotes, setFeedNotes] = useState<NostrNote[]>([]);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, NostrProfile>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const notesPerPage = 15;

  // Handle new notes coming from subscription
  const handleNewNotes = useCallback((newNotes: NostrNote[]) => {
    setFeedNotes(currentNotes => {
      // Combine new and existing notes, removing duplicates by ID
      const notesMap = new Map<string, NostrNote>();
      
      // Add current notes to map
      currentNotes.forEach(note => notesMap.set(note.id, note));
      
      // Add or update with new notes
      newNotes.forEach(note => {
        // Only add if it doesn't exist or if it's newer version of existing note
        if (!notesMap.has(note.id) || note.created_at > (notesMap.get(note.id)?.created_at || 0)) {
          notesMap.set(note.id, note);
        }
      });
      
      // Convert map back to array and sort by timestamp (newest first)
      return Array.from(notesMap.values())
        .sort((a, b) => b.created_at - a.created_at);
    });
  }, []);

  // Initialize feed and subscription
  useEffect(() => {
    const loadInitialNotes = async () => {
      setIsLoading(true);
      setPage(1);
      
      // Clear existing notes when feed type changes
      setFeedNotes([]);
      
      // Start a subscription for real-time updates
      if (subscriptionIdRef.current) {
        unsubscribeFromNotes(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
      
      // Subscribe to notes with a limit
      const subId = subscribeToNotes(pubkey, handleNewNotes, notesPerPage);
      subscriptionIdRef.current = subId;
      
      setIsLoading(false);
    };

    loadInitialNotes();
    
    // Cleanup subscription on unmount or when feed type changes
    return () => {
      if (subscriptionIdRef.current) {
        unsubscribeFromNotes(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [subscribeToNotes, unsubscribeFromNotes, pubkey, handleNewNotes]);

  // Fetch profiles for all note authors
  useEffect(() => {
    const fetchProfiles = async () => {
      if (feedNotes.length === 0) return;
      
      const uniqueAuthors = [...new Set(feedNotes.map(note => note.pubkey))];
      const profiles: Record<string, NostrProfile> = { ...authorProfiles };
      
      const newAuthors = uniqueAuthors.filter(pubkey => !profiles[pubkey]);
      
      for (const pubkey of newAuthors) {
        const profile = await fetchProfile(pubkey);
        if (profile) {
          profiles[pubkey] = profile;
        }
      }
      
      setAuthorProfiles(profiles);
    };

    fetchProfiles();
  }, [feedNotes, fetchProfile, authorProfiles]);

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (isLoading) return;
    
    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreNotes();
        }
      },
      { threshold: 0.1 }
    );
    
    observerRef.current = observer;
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, hasMore, isLoadingMore]);

  // Load more notes when scrolling
  const loadMoreNotes = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    const nextPage = page + 1;
    
    try {
      if (subscriptionIdRef.current) {
        // Request more historical notes
        const result = await subscribeToNotes(
          pubkey, 
          handleNewNotes, 
          notesPerPage, 
          nextPage * notesPerPage
        );
        
        // Handle null result - no more notes available
        if (result === null) {
          setHasMore(false);
          setPage(nextPage);
          return;
        }
        
        // Now we're sure result is not null, we can safely check its properties
        if (typeof result === 'object') {
          // Check for hasMore property
          if ('hasMore' in result) {
            setHasMore(result.hasMore);
          }
          
          // Check for subId property
          if ('subId' in result) {
            subscriptionIdRef.current = result.subId;
          }
        }
        
        setPage(nextPage);
      }
    } catch (error) {
      console.error("Error loading more notes:", error);
      // In case of error, assume there are no more notes
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Manual refresh handler
  const handleRefresh = async () => {
    if (subscriptionIdRef.current) {
      unsubscribeFromNotes(subscriptionIdRef.current);
    }
    
    setFeedNotes([]);
    setIsLoading(true);
    
    // Start a new subscription
    const subId = subscribeToNotes(pubkey, handleNewNotes, notesPerPage);
    subscriptionIdRef.current = subId;
    
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 p-4 border rounded-lg dark:border-gray-800">
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

  // Show empty state for following feed
  if (followingFeed && feedNotes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Your following feed will appear here.</p>
        <p>Follow some users to see their posts!</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="mt-4 flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>
    );
  }

  // Show empty state for global feed
  if (!followingFeed && feedNotes.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">No notes found</h3>
        <p className="text-muted-foreground">Be the first to post something!</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="mt-4 flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedNotes.map((note) => (
        <NoteCard 
          key={note.id} 
          note={note} 
          authorProfile={authorProfiles[note.pubkey]} 
        />
      ))}
      
      {/* Load more indicator */}
      {hasMore && (
        <div 
          ref={loadMoreRef} 
          className="py-4 text-center"
        >
          {isLoadingMore ? (
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
      )}
    </div>
  );
}
