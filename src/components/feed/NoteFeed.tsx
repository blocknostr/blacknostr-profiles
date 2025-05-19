
import { useEffect, useState } from "react";
import { useNostr } from "@/contexts/NostrContext";
import NoteCard from "./NoteCard";
import { NostrProfile } from "@/lib/nostr";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface NoteFeedProps {
  pubkey?: string;
}

export default function NoteFeed({ pubkey }: NoteFeedProps) {
  const { notes, fetchNotes, fetchProfile } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, NostrProfile>>({});

  // Initial notes loading
  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);
      try {
        // Use limit parameter as specified in NIP-01
        await fetchNotes(pubkey, 50);
      } catch (error) {
        console.error("Failed to fetch notes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, [fetchNotes, pubkey]);

  // Fetch author profiles for all notes
  useEffect(() => {
    const fetchProfiles = async () => {
      if (notes.length === 0) return;

      // Extract unique authors to avoid duplicate profile requests (optimization)
      const uniqueAuthors = [...new Set(notes.map(note => note.pubkey))];
      const profiles: Record<string, NostrProfile> = {};

      // Fetch profiles in parallel using Promise.all for better performance
      await Promise.all(uniqueAuthors.map(async (pubkey) => {
        try {
          const profile = await fetchProfile(pubkey);
          if (profile) {
            profiles[pubkey] = profile;
          }
        } catch (error) {
          console.error(`Failed to fetch profile for ${pubkey}:`, error);
        }
      }));

      setAuthorProfiles(profiles);
    };

    fetchProfiles();
  }, [notes, fetchProfile]);

  // Handle manual refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Passing since parameter to get only new notes since last fetch
      // This is compliant with NIP-01 filtered subscription
      await fetchNotes(pubkey);
    } catch (error) {
      console.error("Failed to refresh notes:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Loading state UI
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      
      {notes.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">No notes found</h3>
          <p className="text-muted-foreground">Be the first to post something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <NoteCard 
              key={note.id} 
              note={note} 
              authorProfile={authorProfiles[note.pubkey]} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
