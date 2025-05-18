
import { useEffect, useState, useRef, useCallback } from "react";
import { useNostr } from "@/contexts/NostrContext";
import NoteCard from "./NoteCard";
import { NostrProfile } from "@/lib/nostr";
import { Skeleton } from "@/components/ui/skeleton";

interface NoteFeedProps {
  pubkey?: string;
}

export default function NoteFeed({ pubkey }: NoteFeedProps) {
  const { notes, fetchNotes, fetchProfile } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, NostrProfile>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastNoteRef = useRef<HTMLDivElement>(null);

  // Function to load initial notes
  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);
      await fetchNotes(pubkey);
      setIsLoading(false);
    };

    loadNotes();
  }, [fetchNotes, pubkey]);

  // Function to fetch profiles for all unique authors
  useEffect(() => {
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

  // Setup intersection observer for infinite scroll
  const lastNoteCallback = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        console.log("Loading more notes...");
        setPage(prevPage => prevPage + 1);
        // In a real implementation, you would fetch more notes here using pagination
        // For now, we'll simulate that we've reached the end after loading once more
        setHasMore(false);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);

  // Simulate loading more notes when page changes
  // In a real implementation, this would be an API call with the new page number
  useEffect(() => {
    if (page > 1) {
      const loadMoreNotes = async () => {
        setIsLoading(true);
        try {
          // In a real implementation, fetchMoreNotes would be an API call with the page number
          // await fetchMoreNotes(page, pubkey);
          console.log(`Would fetch page ${page} here in a real implementation`);
          // Simulate loading delay
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error("Error loading more notes:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadMoreNotes();
    }
  }, [page, pubkey]);

  if (notes.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">No notes found</h3>
        <p className="text-muted-foreground">Be the first to post something!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full overflow-y-auto pb-20">
      {notes.map((note, index) => {
        if (index === notes.length - 1) {
          return (
            <div ref={lastNoteCallback} key={note.id}>
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
      
      {isLoading && (
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
      )}
      
      {!isLoading && !hasMore && notes.length > 0 && (
        <div className="py-4 text-center text-muted-foreground">
          <p>No more notes to load</p>
        </div>
      )}
    </div>
  );
}
