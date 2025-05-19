
import { useEffect, useState } from "react";
import { useNostr } from "@/contexts/NostrContext";
import NoteCard from "./NoteCard";
import { NostrProfile } from "@/lib/nostr";
import { Skeleton } from "@/components/ui/skeleton";

interface NoteFeedProps {
  pubkey?: string;
  followingFeed?: boolean;
}

export default function NoteFeed({ pubkey, followingFeed }: NoteFeedProps) {
  const { notes, fetchNotes, fetchProfile } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, NostrProfile>>({});

  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);
      await fetchNotes(pubkey);
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
    </div>
  );
}
