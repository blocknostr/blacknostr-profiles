
import { useEffect, useState, useRef, useCallback } from "react";
import { useNostr } from "@/contexts/NostrContext";
import NoteCard from "./NoteCard";
import { NostrProfile, NostrNote } from "@/lib/nostr";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader } from "lucide-react";

interface NoteFeedProps {
  pubkey?: string;
  followingFeed?: boolean;
}

export default function NoteFeed({ pubkey, followingFeed }: NoteFeedProps) {
  const { streamNotes, fetchProfile, unsubscribe } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<NostrNote[]>([]);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, NostrProfile>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  // Reference to subscription ID for cleanup
  const subIdRef = useRef<string | null>(null);
  
  // Observer for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loaderRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && notes.length > 0) {
        setLoadingMore(true);
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loadingMore, hasMore, notes.length]);

  // Setup streaming subscription
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setNotes([]);
    setPage(1);
    setHasMore(true);
    
    // Initial load - first 10 items
    const initialLimit = 10;
    
    // Function to handle incoming notes
    const handleNotes = (receivedNotes: NostrNote[], isEose: boolean) => {
      if (!active) return;
      
      setNotes(prevNotes => {
        // Deduplicate notes by ID
        const uniqueNotes = [...prevNotes];
        const existingIds = new Set(prevNotes.map(note => note.id));
        
        receivedNotes.forEach(note => {
          if (!existingIds.has(note.id)) {
            uniqueNotes.push(note);
            existingIds.add(note.id);
          }
        });
        
        // Sort by timestamp (newest first)
        return uniqueNotes.sort((a, b) => b.created_at - a.created_at);
      });
      
      if (isEose) {
        setIsLoading(false);
      }
    };

    // Create subscription
    const subscription = streamNotes(
      pubkey, 
      initialLimit, 
      handleNotes,
      // Optional since parameter
      followingFeed ? undefined : null
    );
    
    subIdRef.current = subscription;
    
    return () => {
      active = false;
      if (subIdRef.current) {
        unsubscribe(subIdRef.current);
        subIdRef.current = null;
      }
    };
  }, [pubkey, followingFeed, streamNotes, unsubscribe]);

  // Handle loading more when page changes
  useEffect(() => {
    if (page === 1 || !hasMore) return;
    
    let active = true;
    const loadMoreLimit = 15;
    const since = notes.length > 0 
      ? notes[notes.length - 1].created_at 
      : undefined;
    
    const handleMoreNotes = (receivedNotes: NostrNote[], isEose: boolean) => {
      if (!active) return;
      
      setNotes(prevNotes => {
        // Deduplicate notes
        const uniqueNotes = [...prevNotes];
        const existingIds = new Set(prevNotes.map(note => note.id));
        
        receivedNotes.forEach(note => {
          if (!existingIds.has(note.id)) {
            uniqueNotes.push(note);
            existingIds.add(note.id);
          }
        });
        
        // Sort by timestamp (newest first)
        return uniqueNotes.sort((a, b) => b.created_at - a.created_at);
      });
      
      if (isEose) {
        setLoadingMore(false);
        // No more notes to load if we got less than requested
        if (receivedNotes.length < loadMoreLimit) {
          setHasMore(false);
        }
      }
    };

    // Create subscription for more notes
    const moreSubscription = streamNotes(
      pubkey, 
      loadMoreLimit, 
      handleMoreNotes,
      since, 
      followingFeed ? undefined : null
    );
    
    // No need to store this subscription ID since it's temporary
    // and will be automatically closed when it reaches EOSE
    
    return () => {
      active = false;
      if (moreSubscription) {
        unsubscribe(moreSubscription);
      }
    };
  }, [page, notes, hasMore, pubkey, followingFeed, streamNotes, unsubscribe]);

  // Fetch profiles for note authors
  useEffect(() => {
    // Fetch profiles for all unique authors
    const fetchProfiles = async () => {
      const uniqueAuthors = [...new Set(notes.map(note => note.pubkey))];
      const profiles: Record<string, NostrProfile> = { ...authorProfiles };
      
      const fetchPromises = uniqueAuthors
        .filter(pubkey => !authorProfiles[pubkey]) // Only fetch profiles we don't have yet
        .map(async pubkey => {
          const profile = await fetchProfile(pubkey);
          if (profile) {
            profiles[pubkey] = profile;
          }
        });
      
      await Promise.all(fetchPromises);
      setAuthorProfiles(profiles);
    };

    if (notes.length > 0) {
      fetchProfiles();
    }
  }, [notes, fetchProfile, authorProfiles]);

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
  if (followingFeed && notes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Your following feed will appear here.</p>
        <p>Follow some users to see their posts!</p>
      </div>
    );
  }

  // Show empty state for global feed
  if (!followingFeed && notes.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">No notes found</h3>
        <p className="text-muted-foreground">Be the first to post something!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <NoteCard 
          key={note.id} 
          note={note} 
          authorProfile={authorProfiles[note.pubkey]} 
        />
      ))}
      
      {/* Infinite scroll loader */}
      {hasMore && (
        <div ref={loaderRef} className="flex justify-center py-4">
          {loadingMore ? (
            <div className="flex items-center space-x-2">
              <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading more...</span>
            </div>
          ) : (
            <div className="h-8" />
          )}
        </div>
      )}
      
      {!hasMore && notes.length > 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No more notes to load
        </div>
      )}
    </div>
  );
}
