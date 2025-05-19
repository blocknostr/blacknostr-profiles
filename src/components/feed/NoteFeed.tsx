
import { useEffect, useRef } from "react";
import NoteCard from "./NoteCard";
import NoteFeedSkeleton from "./NoteFeedSkeleton";
import EmptyFeedState from "./EmptyFeedState";
import LoadMoreIndicator from "./LoadMoreIndicator";
import useNoteSubscription from "@/hooks/useNoteSubscription";

interface NoteFeedProps {
  pubkey?: string;
  followingFeed?: boolean;
}

export default function NoteFeed({ pubkey, followingFeed }: NoteFeedProps) {
  const {
    isLoading,
    feedNotes,
    authorProfiles,
    hasMore,
    isLoadingMore,
    loadMoreNotes,
    handleRefresh
  } = useNoteSubscription(pubkey, followingFeed);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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
  }, [isLoading, hasMore, isLoadingMore, loadMoreNotes]);

  if (isLoading) {
    return <NoteFeedSkeleton />;
  }

  // Show empty state if no notes
  if (feedNotes.length === 0) {
    return <EmptyFeedState isFollowingFeed={followingFeed} onRefresh={handleRefresh} />;
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
          <LoadMoreIndicator isLoading={isLoadingMore} />
        </div>
      )}
    </div>
  );
}
