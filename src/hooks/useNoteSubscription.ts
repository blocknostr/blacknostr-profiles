
import { useCallback, useEffect, useRef, useState } from "react";
import { useNostr } from "@/contexts/NostrContext";
import { NostrNote } from "@/lib/nostr";

interface NoteSubscriptionResult {
  feedNotes: NostrNote[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  handleRefresh: () => Promise<void>;
  loadMoreRef: React.RefObject<HTMLDivElement>;
}

// Define a proper return type for subscribeToNotes
interface SubscriptionResult {
  subId: string;
  hasMore: boolean;
}

export default function useNoteSubscription(
  pubkey?: string,
  followingFeed?: boolean
): NoteSubscriptionResult {
  const { subscribeToNotes, unsubscribeFromNotes } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [feedNotes, setFeedNotes] = useState<NostrNote[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const notesPerPage = 15;

  // Handle new notes coming from subscription
  const handleNewNotes = useCallback((newNotes: NostrNote[]) => {
    if (!newNotes || newNotes.length === 0) return;
    
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
      setHasMore(true); // Reset hasMore on feed change
      
      // Clear existing notes when feed type changes
      setFeedNotes([]);
      
      // Cleanup existing subscription if any
      if (subscriptionIdRef.current) {
        unsubscribeFromNotes(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
      
      try {
        // Subscribe to notes with a limit
        const subId = subscribeToNotes(pubkey, handleNewNotes, notesPerPage);
        
        // Only update the ref if we got a valid subscription ID
        if (subId) {
          subscriptionIdRef.current = subId;
        }
      } catch (error) {
        console.error("Error subscribing to notes:", error);
      } finally {
        setIsLoading(false);
      }
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
        
        // TypeScript null safety - we've already checked above that result is not null
        // Check if result is an object with hasMore property
        if (typeof result === 'object' && 'hasMore' in result) {
          // Now TypeScript knows result is an object with hasMore
          const typedResult = result as SubscriptionResult;
          setHasMore(Boolean(typedResult.hasMore));
          
          // Update subscription ID if available
          if ('subId' in typedResult) {
            subscriptionIdRef.current = String(typedResult.subId);
          }
        } else if (typeof result === 'string') {
          // If result is a string, it's the subscription ID directly
          subscriptionIdRef.current = result;
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
    // Reset state and start over
    if (subscriptionIdRef.current) {
      unsubscribeFromNotes(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
    }
    
    setFeedNotes([]);
    setIsLoading(true);
    setPage(1);
    setHasMore(true);
    
    try {
      // Start a new subscription
      const subId = subscribeToNotes(pubkey, handleNewNotes, notesPerPage);
      if (subId) {
        subscriptionIdRef.current = subId;
      }
    } catch (error) {
      console.error("Error refreshing notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    feedNotes,
    isLoading,
    hasMore,
    isLoadingMore,
    handleRefresh,
    loadMoreRef
  };
}
