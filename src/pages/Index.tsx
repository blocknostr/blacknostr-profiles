
import { useEffect, useState } from "react";
import { useNostr } from "@/contexts/NostrContext";
import MainLayout from "@/components/layout/MainLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import NoteFeed from "@/components/feed/NoteFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Index = () => {
  const { isAuthenticated, isLoading, relays, pool } = useNostr();
  const [relayInfo, setRelayInfo] = useState<{[key: string]: any}>({});
  
  // Fetch relay information according to NIP-11
  useEffect(() => {
    const fetchRelayInformation = async () => {
      if (!pool) return;
      
      const info: {[key: string]: any} = {};
      
      for (const relay of relays) {
        try {
          // Use fetch directly to get relay information according to NIP-11
          const response = await fetch(relay.url.replace('wss://', 'https://'), {
            headers: { 'Accept': 'application/nostr+json' }
          });
          
          if (response.ok) {
            const relayInfo = await response.json();
            info[relay.url] = relayInfo;
          } else {
            console.error(`Failed to fetch info for relay ${relay.url}: HTTP status ${response.status}`);
            info[relay.url] = { error: `HTTP status ${response.status}` };
          }
        } catch (error) {
          console.error(`Failed to fetch info for relay ${relay.url}:`, error);
          info[relay.url] = { error: "Failed to fetch relay info" };
        }
      }
      
      setRelayInfo(info);
    };
    
    fetchRelayInformation();
  }, [relays, pool]);

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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Home</h1>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Info className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Relay Info</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="w-80">
                <div className="space-y-2 p-2">
                  <h3 className="font-bold">Connected Relays (NIP-11)</h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {relays.map(relay => (
                      <div key={relay.url} className="text-xs p-2 border rounded">
                        <div className="font-semibold">{relay.url}</div>
                        <div className="flex gap-1 mt-1">
                          {relay.read && <span className="px-1 bg-green-500/10 text-green-500 rounded text-[10px]">read</span>}
                          {relay.write && <span className="px-1 bg-blue-500/10 text-blue-500 rounded text-[10px]">write</span>}
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {relayInfo[relay.url] ? (
                            <>
                              {relayInfo[relay.url].name && <div>Name: {relayInfo[relay.url].name}</div>}
                              {relayInfo[relay.url].description && <div>Description: {relayInfo[relay.url].description.substring(0, 50)}...</div>}
                              {relayInfo[relay.url].supported_nips && Array.isArray(relayInfo[relay.url].supported_nips) && (
                                <div>NIPs: {relayInfo[relay.url].supported_nips.slice(0, 5).join(", ")}{relayInfo[relay.url].supported_nips.length > 5 ? '...' : ''}</div>
                              )}
                            </>
                          ) : (
                            <div>Loading relay info...</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    This application follows the NOSTR protocol and implements NIPs: 01, 02, 10, 11, 25, 65
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Tabs defaultValue="global" className="w-full">
          <TabsList className="w-full dark:bg-nostr-cardBg">
            <TabsTrigger value="global" className="flex-1">Global</TabsTrigger>
            <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
          </TabsList>
          <TabsContent value="global" className="mt-4">
            <NoteFeed />
          </TabsContent>
          <TabsContent value="following" className="mt-4">
            <NoteFeed following={true} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Index;
