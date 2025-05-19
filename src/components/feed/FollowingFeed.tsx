
import React from 'react';
import { useNostr } from '@/contexts/NostrContext';
import useNoteSubscription from '@/hooks/useNoteSubscription';
import NoteCard from './NoteCard';
import EmptyFeedState from './EmptyFeedState';
import NoteFeedSkeleton from './NoteFeedSkeleton';
import LoadMoreIndicator from './LoadMoreIndicator';

const FollowingFeed: React.FC = () => {
  const { isAuthenticated, followingPubkeys } = useNostr();
  
  const {
    feedNotes,
    isLoading,
    hasMore,
    isLoadingMore,
    loadMoreRef
  } = useNoteSubscription(undefined, true); // undefined pubkey but true for followingFeed

  if (!isAuthenticated) {
    return <EmptyFeedState message="Please log in to see your following feed" />;
  }
  
  if (followingPubkeys.length === 0 && !isLoading) {
    return <EmptyFeedState message="You're not following anyone yet. Find users to follow!" />;
  }

  if (isLoading) {
    return <NoteFeedSkeleton />;
  }

  if (feedNotes.length === 0) {
    return <EmptyFeedState message="No posts yet from people you follow" />;
  }

  return (
    <div className="space-y-4">
      {feedNotes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
      
      {hasMore && (
        <div ref={loadMoreRef}>
          <LoadMoreIndicator isLoading={isLoadingMore} />
        </div>
      )}
      
      {!hasMore && feedNotes.length > 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          You've reached the end
        </div>
      )}
    </div>
  );
};

export default FollowingFeed;
