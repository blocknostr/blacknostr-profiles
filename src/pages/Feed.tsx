
import { useState, useEffect } from "react";
import { useNostr } from "@/contexts/NostrContext";
import NoteFeed from "@/components/feed/NoteFeed";
import MainLayout from "@/components/layout/MainLayout";
import CreateNote from "@/components/feed/CreateNote";
import { Rss, Clock, Hash, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigate } from "react-router-dom";

// NIP-01: Basic protocol flow and event kinds
// NIP-08: Mentions of events, public keys, and hashtags
// NIP-12: Hashtag filtering
const Feed = () => {
  const { isAuthenticated } = useNostr();
  const [activeFilter, setActiveFilter] = useState<string>("global");
  const [hashtag, setHashtag] = useState<string | undefined>(undefined);
  const [sinceTime, setSinceTime] = useState<number | undefined>(undefined);
  
  // NIP-16: Event treatment - Update time filter for "recent" tab
  useEffect(() => {
    if (activeFilter === "recent") {
      // Get notes from the last 24 hours
      const oneDayAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24;
      setSinceTime(oneDayAgo);
    } else {
      setSinceTime(undefined);
    }
  }, [activeFilter]);

  // For the hashtag filter
  useEffect(() => {
    if (activeFilter === "trending") {
      setHashtag("nostr"); // Example trending hashtag
    } else {
      setHashtag(undefined);
    }
  }, [activeFilter]);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Feed</h1>
        </div>

        {isAuthenticated && <CreateNote />}

        <Tabs 
          defaultValue="global" 
          className="w-full"
          onValueChange={(value) => setActiveFilter(value)}
        >
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Rss className="h-4 w-4" />
              <span className="hidden sm:inline">Global</span>
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Recent</span>
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              <span className="hidden sm:inline">Trending</span>
            </TabsTrigger>
            <TabsTrigger value="following" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Following</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="global">
            <NoteFeed />
          </TabsContent>
          
          <TabsContent value="recent">
            <NoteFeed sinceTime={sinceTime} />
          </TabsContent>
          
          <TabsContent value="trending">
            <NoteFeed hashtag={hashtag} />
          </TabsContent>
          
          <TabsContent value="following">
            <div className="bg-muted/50 dark:bg-nostr-cardBg rounded-lg p-8 text-center">
              <h3 className="text-lg font-medium mb-2">Following Feed</h3>
              <p className="text-muted-foreground">
                Follow users to see their posts here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Feed;
