
import { useNostr } from "@/contexts/NostrContext";
import MainLayout from "@/components/layout/MainLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import NoteFeed from "@/components/feed/NoteFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { fetchRelayInformation } from "@/lib/nostr";
import CreateNote from "@/components/feed/CreateNote";

const Index = () => {
  const { isAuthenticated, isLoading, relays } = useNostr();
  const [relayInfo, setRelayInfo] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState("global");

  // Fetch relay information when component mounts or relays change
  useEffect(() => {
    const getRelayInfo = async () => {
      const info: Record<string, any> = {};
      
      for (const relay of relays) {
        if (relay.read) {
          try {
            const relayData = await fetchRelayInformation(relay.url);
            if (relayData) {
              info[relay.url] = relayData;
            }
          } catch (error) {
            console.error(`Failed to fetch info for relay ${relay.url}:`, error);
          }
        }
      }
      
      setRelayInfo(info);
    };
    
    getRelayInfo();
  }, [relays]);

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
        
        {/* Create Note Component */}
        <CreateNote />
        
        <Tabs 
          defaultValue="global" 
          className="w-full"
          onValueChange={setActiveTab}
          value={activeTab}
        >
          <TabsList className="w-full dark:bg-nostr-cardBg">
            <TabsTrigger value="global" className="flex-1">Global</TabsTrigger>
            <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
          </TabsList>
          <TabsContent value="global" className="mt-4">
            <NoteFeed feedType="global" />
          </TabsContent>
          <TabsContent value="following" className="mt-4">
            <NoteFeed feedType="following" />
          </TabsContent>
        </Tabs>
        
        {/* Relay information section - compliant with NIP-11 */}
        <div className="mt-6 pt-4 border-t border-border dark:border-white/10">
          <h2 className="text-lg font-semibold mb-2">Connected Relays</h2>
          <div className="space-y-3">
            {Object.entries(relayInfo).length > 0 ? (
              Object.entries(relayInfo).map(([url, info]) => (
                <div key={url} className="p-3 border rounded-md dark:bg-nostr-cardBg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{info.name || url}</span>
                    <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                      Connected
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {info.description || "No description"}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Software: </span>
                      {info.software || "Unknown"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Version: </span>
                      {info.version || "Unknown"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contact: </span>
                      {info.contact || "None"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supported NIPs: </span>
                      {/* Fix: Check if supported_nips is an array before calling slice */}
                      {info.supported_nips && Array.isArray(info.supported_nips)
                        ? info.supported_nips.slice(0, 3).join(", ") + 
                          (info.supported_nips.length > 3 ? "..." : "")
                        : "Unknown"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Fetching relay information...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
