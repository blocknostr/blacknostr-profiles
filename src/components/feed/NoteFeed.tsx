
import { useEffect, useState, useRef, useCallback } from "react";
import { useNostr } from "@/contexts/NostrContext";
import NoteCard from "./NoteCard";
import { NostrProfile } from "@/lib/nostr";
import { Skeleton } from "@/components/ui/skeleton";

interface NoteFeedProps {
  pubkey?: string;
}

export default function NoteFeed({ pubkey }: NoteFeedProps) {
  const { notes, fetchNotes, fetchProfile, hasMoreNotes, loadMoreNotes } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, NostrProfile>>({});
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);
      await fetchNotes(pubkey, 15); // Initial load of 15 posts
      setIsLoading(false);
    };

    loadNotes();
  }, [fetchNotes, pubkey]);

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

  // Set up the intersection observer for infinite scrolling
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();
      
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMoreNotes) {
          loadMoreNotes(10); // Load next 10 notes when scrolled to bottom
        }
      });
      
      if (node) observer.current.observe(node);
    },
    [isLoading, hasMoreNotes, loadMoreNotes]
  );

  if (isLoading && notes.length === 0) {
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
      {notes.map((note, index) => {
        if (index === notes.length - 1) {
          return (
            <div key={note.id} ref={lastElementRef}>
              <NoteCard 
                note={note} 
                authorProfile={authorProfiles[note.pubkey]} 
              />
            </div>
          );
        } else {
          return (
            <NoteCard 
              key={note.id}
              note={note} 
              authorProfile={authorProfiles[note.pubkey]} 
            />
          );
        }
      })}
      {hasMoreNotes && (
        <div ref={loadingRef} className="py-4 text-center">
          <div className="animate-pulse flex justify-center">
            <div className="h-2 w-2 bg-muted-foreground rounded-full mx-1"></div>
            <div className="h-2 w-2 bg-muted-foreground rounded-full mx-1"></div>
            <div className="h-2 w-2 bg-muted-foreground rounded-full mx-1"></div>
          </div>
        </div>
      )}
    </div>
  );
}
