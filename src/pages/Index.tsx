
import { useNostr } from "@/contexts/NostrContext";
import MainLayout from "@/components/layout/MainLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import NoteFeed from "@/components/feed/NoteFeed";
import CreateNote from "@/components/feed/CreateNote";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";

const Index = () => {
  const { isAuthenticated, isLoading, publicKey } = useNostr();
  const [activeTab, setActiveTab] = useState("global");

  // Update document title
  useEffect(() => {
    document.title = "BlockNostr - Home";
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-nostr-dark">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-nostr-blue mb-4">BlockNostr</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 dark:bg-nostr-dark">
        <h1 className="text-4xl font-bold text-nostr-blue mb-8">BlockNostr</h1>
        <p className="text-xl text-muted-foreground mb-8 text-center max-w-md">
          A decentralized social network built on NOSTR protocol
        </p>
        <LoginForm />
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Home</h1>
        
        {/* Post creation component - only shown when logged in */}
        <CreateNote />
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full dark:bg-nostr-cardBg">
            <TabsTrigger value="global" className="flex-1">Global</TabsTrigger>
            <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
          </TabsList>
          <TabsContent value="global" className="mt-4">
            {/* Global feed shows notes from all users */}
            <NoteFeed />
          </TabsContent>
          <TabsContent value="following" className="mt-4">
            {/* Following feed will show only notes from users the current user follows */}
            {publicKey ? (
              <NoteFeed pubkey={publicKey} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Your following feed will appear here.</p>
                <p>Follow some users to see their posts!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default Index;
