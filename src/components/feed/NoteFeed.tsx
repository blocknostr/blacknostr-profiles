
import { useEffect, useState, useRef, useCallback } from "react";
import { useNostr } from "@/contexts/NostrContext";
import NoteCard from "./NoteCard";
import { NostrProfile, NostrNote } from "@/lib/nostr";
import { Skeleton } from "@/components/ui/skeleton";
import { Sub } from "nostr-tools";
import { Loader } from "lucide-react";

interface NoteFeedProps {
  pubkey?: string;
  followingFeed?: boolean;
}

export default function NoteFeed({ pubkey, followingFeed }: NoteFeedProps) {
  const { subscribeToNotes, loadMoreNotes, fetchProfile } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, NostrProfile>>({});
  const [localNotes, setLocalNotes] = useState<NostrNote[]>([]);
  const subscription = useRef<Sub | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Get oldest note timestamp for pagination
  const oldestNoteTimestamp = localNotes.length > 0 
    ? Math.min(...localNotes.map(note => note.created_at))
    : undefined;

  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    if (isLoading) return;

    observer.current = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoadingMore) {
        loadMore();
      }
    }, {
      root: null,
      threshold: 0.1,
    });

    if (loadMoreRef.current) {
      observer.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [isLoading, isLoadingMore, localNotes]);

  // Load more notes when scrolling to the bottom
  const loadMore = useCallback(async () => {
    if (!oldestNoteTimestamp || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      // Load 15 more notes with timestamp before the oldest note
      const moreNotes = await loadMoreNotes(pubkey, 15, oldestNoteTimestamp - 1);
      
      // Update local notes
      setLocalNotes(prevNotes => {
        const combined = [...prevNotes];
        
        moreNotes.forEach(newNote => {
          const exists = combined.some(note => note.id === newNote.id);
          if (!exists) {
            combined.push(newNote);
          }
        });
        
        return combined.sort((a, b) => b.created_at - a.created_at);
      });
      
      // Fetch profiles for new authors
      const newAuthors = moreNotes
        .map(note => note.pubkey)
        .filter(pubkey => !authorProfiles[pubkey]);
      
      if (newAuthors.length > 0) {
        fetchProfiles(newAuthors);
      }
    } catch (error) {
      console.error("Error loading more notes:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [oldestNoteTimestamp, pubkey, loadMoreNotes, authorProfiles]);

  // Setup subscription for streaming notes
  useEffect(() => {
    setIsLoading(true);
    setLocalNotes([]);
    
    // Create a new subscription
    subscription.current = subscribeToNotes(pubkey);
    
    // Set up event handling for new notes
    if (subscription.current) {
      subscription.current.on('event', (event: any) => {
        const newNote = {
          id: event.id,
          pubkey: event.pubkey,
          created_at: event.created_at,
          kind: event.kind,
          tags: event.tags,
          content: event.content,
          sig: event.sig
        };
        
        // Update local notes state, avoiding duplicates
        setLocalNotes(prevNotes => {
          const exists = prevNotes.some(note => note.id === newNote.id);
          if (exists) {
            return prevNotes;
          }
          return [newNote, ...prevNotes].sort((a, b) => b.created_at - a.created_at);
        });
        
        // Fetch author profile if not already loaded
        if (!authorProfiles[newNote.pubkey]) {
          fetchProfile(newNote.pubkey).then(profile => {
            if (profile) {
              setAuthorProfiles(prev => ({
                ...prev,
                [newNote.pubkey]: profile
              }));
            }
          });
        }
      });
    }
    
    // Wait for initial data to load
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    // Clean up subscription on unmount or when pubkey changes
    return () => {
      if (subscription.current) {
        subscription.current.unsub();
      }
    };
  }, [pubkey, subscribeToNotes, fetchProfile]);

  // Fetch profiles for all unique authors
  const fetchProfiles = async (pubkeys: string[]) => {
    const uniqueAuthors = [...new Set(pubkeys)];
    const profiles: Record<string, NostrProfile> = {};

    for (const pubkey of uniqueAuthors) {
      const profile = await fetchProfile(pubkey);
      if (profile) {
        profiles[pubkey] = profile;
      }
    }

    setAuthorProfiles(prev => ({
      ...prev,
      ...profiles
    }));
  };

  // Initially fetch profiles for notes
  useEffect(() => {
    if (localNotes.length > 0) {
      const authorsToFetch = localNotes
        .map(note => note.pubkey)
        .filter(pubkey => !authorProfiles[pubkey]);
      
      if (authorsToFetch.length > 0) {
        fetchProfiles(authorsToFetch);
      }
    }
  }, [localNotes]);

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
  if (followingFeed && localNotes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Your following feed will appear here.</p>
        <p>Follow some users to see their posts!</p>
      </div>
    );
  }

  // Show empty state for global feed
  if (!followingFeed && localNotes.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">No notes found</h3>
        <p className="text-muted-foreground">Be the first to post something!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {localNotes.map((note) => (
          <NoteCard 
            key={note.id} 
            note={note} 
            authorProfile={authorProfiles[note.pubkey]} 
          />
        ))}
        
        {/* Intersection observer target for infinite scrolling */}
        <div ref={loadMoreRef} className="h-8 flex items-center justify-center">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader className="h-4 w-4 animate-spin" />
              <span>Loading more notes...</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
