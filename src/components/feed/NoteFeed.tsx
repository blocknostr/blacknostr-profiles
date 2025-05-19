
import { useEffect, useState } from "react";
import { useNostr } from "@/contexts/NostrContext";
import NoteCard from "./NoteCard";
import { NostrProfile, NostrNote } from "@/lib/nostr";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import useNoteSubscription from "@/hooks/useNoteSubscription";
import NoteFeedSkeleton from "./NoteFeedSkeleton";
import EmptyFeedState from "./EmptyFeedState";
import LoadMoreIndicator from "./LoadMoreIndicator";

interface NoteFeedProps {
  pubkey?: string;
  followingFeed?: boolean;
}

export default function NoteFeed({ pubkey, followingFeed }: NoteFeedProps) {
  const { fetchProfile } = useNostr();
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, NostrProfile>>({});
  
  const {
    feedNotes,
    isLoading,
    hasMore,
    isLoadingMore,
    handleRefresh,
    loadMoreRef
  } = useNoteSubscription(pubkey, followingFeed);

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

  if (isLoading) {
    return <NoteFeedSkeleton />;
  }

  // Show empty state for following or global feed
  if (feedNotes.length === 0) {
    return (
      <EmptyFeedState 
        followingFeed={followingFeed} 
        onRefresh={handleRefresh} 
      />
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
        <LoadMoreIndicator 
          ref={loadMoreRef}
          isLoading={isLoadingMore}
        />
      )}
    </div>
  );
}
