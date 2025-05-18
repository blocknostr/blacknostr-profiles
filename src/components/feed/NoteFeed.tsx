
import { useEffect, useState, useRef, useCallback } from "react";
import { useNostr } from "@/contexts/NostrContext";
import NoteCard from "./NoteCard";
import { NostrProfile } from "@/lib/nostr";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

interface NoteFeedProps {
  pubkey?: string;
}

export default function NoteFeed({ pubkey }: NoteFeedProps) {
  const { notes, fetchNotes, fetchProfile, loadMoreNotes, hasMoreNotes } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, NostrProfile>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);
      await fetchNotes(pubkey);
      setIsLoading(false);
    };

    loadNotes();

    // Cleanup any existing observer when component unmounts or dependencies change
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchNotes, pubkey]);

  useEffect(() => {
    // Create intersection observer for infinite scrolling
    if (!isLoading && hasMoreNotes && !isLoadingMore) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            handleLoadMore();
          }
        },
        { threshold: 0.5 }
      );

      if (loadMoreRef.current) {
        observerRef.current.observe(loadMoreRef.current);
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, hasMoreNotes, notes.length, isLoadingMore]);

  useEffect(() => {
    // Fetch profiles for all unique authors
    const fetchProfiles = async () => {
      const uniqueAuthors = [...new Set(notes.map(note => note.pubkey))];
      const profiles: Record<string, NostrProfile> = {};

      for (const pubkey of uniqueAuthors) {
        if (!authorProfiles[pubkey]) {
          const profile = await fetchProfile(pubkey);
          if (profile) {
            profiles[pubkey] = profile;
          }
        }
      }

      setAuthorProfiles(prev => ({ ...prev, ...profiles }));
    };

    if (notes.length > 0) {
      fetchProfiles();
    }
  }, [notes, fetchProfile, authorProfiles]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreNotes) return;
    
    setIsLoadingMore(true);
    await loadMoreNotes(10);
    setIsLoadingMore(false);
  }, [loadMoreNotes, isLoadingMore, hasMoreNotes]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 p-4 border rounded-lg">
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

  if (notes.length === 0) {
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
      
      {hasMoreNotes && (
        <div 
          ref={loadMoreRef} 
          className="w-full flex justify-center py-4"
        >
          {isLoadingMore ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <span className="text-sm text-muted-foreground">Scroll for more</span>
          )}
        </div>
      )}
    </div>
  );
}
