
import { useState, useRef, useCallback, useEffect } from "react";
import { useNostr } from "@/contexts/NostrContext";
import { NostrProfile, NostrNote } from "@/lib/nostr";

export default function useNoteSubscription(pubkey?: string, followingFeed?: boolean) {
  const { fetchProfile, subscribeToNotes, unsubscribeFromNotes } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [feedNotes, setFeedNotes] = useState<NostrNote[]>([]);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, NostrProfile>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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
  
  // Load more notes
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
        
        // Type assertion after null check
        const safeResult = result as NonNullable<typeof result>;
        
        // Check if result is an object
        if (typeof safeResult === 'object') {
          // Check for hasMore property
          if ('hasMore' in safeResult) {
            setHasMore(safeResult.hasMore);
          }
          
          // Check for subId property
          if ('subId' in safeResult) {
            subscriptionIdRef.current = safeResult.subId;
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
  const handleRefresh = useCallback(async () => {
    if (subscriptionIdRef.current) {
      unsubscribeFromNotes(subscriptionIdRef.current);
    }
    
    setFeedNotes([]);
    setIsLoading(true);
    
    // Start a new subscription
    const subId = subscribeToNotes(pubkey, handleNewNotes, notesPerPage);
    subscriptionIdRef.current = subId;
    
    setIsLoading(false);
  }, [pubkey, handleNewNotes, subscribeToNotes, unsubscribeFromNotes]);
  
  return {
    isLoading,
    feedNotes,
    authorProfiles,
    hasMore,
    isLoadingMore,
    loadMoreNotes,
    handleRefresh
  };
}
