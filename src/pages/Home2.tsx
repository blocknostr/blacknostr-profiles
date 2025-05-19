
import { useNostr } from "@/contexts/NostrContext";
import MainLayout from "@/components/layout/MainLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import NoteFeed from "@/components/feed/NoteFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CreateNote from "@/components/feed/CreateNote";

const Home2 = () => {
  const { isAuthenticated, isLoading, fetchNotes, publicKey } = useNostr();
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("global");
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-nostr-dark">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">NostrStream</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 dark:bg-nostr-dark">
        <h1 className="text-4xl font-bold mb-8">NostrStream</h1>
        <p className="text-xl text-muted-foreground mb-8 text-center max-w-md">
          Your decentralized social experience on the Nostr protocol
        </p>
        <LoginForm />
      </div>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotes(activeTab === "following" ? publicKey : undefined);
    setIsRefreshing(false);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleNoteCreated = () => {
    // Refresh the feed after note creation
    fetchNotes(activeTab === "following" ? publicKey : undefined);
    setIsCreateNoteOpen(false);
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">NostrStream</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing} 
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button 
              onClick={() => setIsCreateNoteOpen(true)}
              size="sm"
            >
              New Note
            </Button>
          </div>
        </div>
        
        <Tabs 
          defaultValue="global" 
          className="w-full" 
          onValueChange={handleTabChange}
        >
          <TabsList className="w-full">
            <TabsTrigger value="global" className="flex-1">Global</TabsTrigger>
            <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
          </TabsList>
          <TabsContent value="global" className="mt-4">
            <NoteFeed />
          </TabsContent>
          <TabsContent value="following" className="mt-4">
            <NoteFeed pubkey={publicKey || undefined} followingFeed={true} />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isCreateNoteOpen} onOpenChange={setIsCreateNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create new note</DialogTitle>
          </DialogHeader>
          <CreateNote onNoteCreated={handleNoteCreated} />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Home2;
