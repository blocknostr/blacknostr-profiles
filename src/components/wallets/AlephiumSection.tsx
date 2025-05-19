
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import alephiumAPI from '@/lib/alephiumAPI';
import { Network, ArrowRight, LineChart, TrendingUp } from 'lucide-react';

interface NetworkStats {
  hashRate: string;
  difficulty: string;
  blockTime: string;
  activeAddresses: number;
  tokenCount: number;
  totalTransactions: string;
  totalSupply: string;
  totalBlocks: string;
  latestBlocks: Array<{
    hash: string;
    timestamp: number;
    height: number;
    txNumber: number;
  }>;
  isLiveData: boolean;
}

const AlephiumSection = () => {
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Load network stats when component mounts
    loadNetworkStats();
  }, []);
  
  const loadNetworkStats = async () => {
    setLoading(true);
    try {
      const stats = await alephiumAPI.fetchNetworkStats();
      setNetworkStats(stats);
      setLoading(false);
    } catch (error) {
      console.error("Error loading network stats:", error);
      setLoading(false);
    }
  };

  // Format timestamp to readable date
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Market Stats Card */}
      <Card className="dark:bg-nostr-dark dark:border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Market Data
          </CardTitle>
          <CardDescription>Latest ALPH market stats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Market Cap</div>
              <div className="font-medium">$5.2B</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">24h Volume</div>
              <div className="font-medium">$320.5M</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Circulating Supply</div>
              <div className="font-medium">687.2M</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Supply</div>
              <div className="font-medium">1.0B</div>
            </div>
          </div>
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Price Action</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-muted p-2 rounded text-center">
                <div className="text-muted-foreground">1 Day</div>
                <div className="font-medium text-green-500">+2.1%</div>
              </div>
              <div className="bg-muted p-2 rounded text-center">
                <div className="text-muted-foreground">7 Days</div>
                <div className="font-medium text-red-500">-5.3%</div>
              </div>
              <div className="bg-muted p-2 rounded text-center">
                <div className="text-muted-foreground">30 Days</div>
                <div className="font-medium text-green-500">+12.7%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Network Stats Card */}
      {loading ? (
        <Card className="dark:bg-nostr-dark dark:border-white/20">
          <CardHeader>
            <CardTitle>Loading Network Stats...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          </CardContent>
        </Card>
      ) : networkStats ? (
        <Card className="dark:bg-nostr-dark dark:border-white/20">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <Network className="mr-2" />
              Alephium Network Stats
            </CardTitle>
            <CardDescription>
              <a
                href="https://explorer.alephium.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-nostr-blue hover:underline flex items-center"
              >
                View on Explorer <ArrowRight className="h-3 w-3 ml-1" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 rounded bg-nostr-dark border border-white/10">
                <p className="text-xs text-muted-foreground">Hash Rate</p>
                <p className="font-medium">{networkStats.hashRate}</p>
              </div>
              <div className="p-3 rounded bg-nostr-dark border border-white/10">
                <p className="text-xs text-muted-foreground">Block Time</p>
                <p className="font-medium">{networkStats.blockTime}</p>
              </div>
              <div className="p-3 rounded bg-nostr-dark border border-white/10">
                <p className="text-xs text-muted-foreground">Total Blocks</p>
                <p className="font-medium">{networkStats.totalBlocks}</p>
              </div>
              <div className="p-3 rounded bg-nostr-dark border border-white/10">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="font-medium">{networkStats.totalTransactions}</p>
              </div>
            </div>
            
            <h3 className="text-md font-medium mb-3">Latest Blocks</h3>
            <div className="space-y-2">
              {networkStats.latestBlocks.map((block, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-nostr-dark hover:bg-white/5 border border-white/5">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-nostr-blue/20 flex items-center justify-center">
                      <span className="text-xs">{block.height}</span>
                    </div>
                    <div>
                      <p className="font-mono text-xs opacity-70">{block.hash}</p>
                      <p className="text-xs text-muted-foreground">{formatTimestamp(block.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Txs</p>
                      <p className="text-sm">{block.txNumber}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
            
            {!networkStats.isLiveData && (
              <p className="mt-4 text-xs text-amber-400 italic">
                Note: Displaying sample data as live data could not be fetched.
              </p>
            )}
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadNetworkStats}
                disabled={loading}
                className="w-full dark:border-white/20"
              >
                {loading ? "Refreshing..." : "Refresh Network Data"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="dark:bg-nostr-dark dark:border-white/20">
          <CardHeader>
            <CardTitle>Network Stats Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Could not load Alephium network statistics.
            </p>
            <Button
              variant="outline"
              onClick={loadNetworkStats}
              className="w-full dark:border-white/20"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Documentation Card */}
      <Card className="dark:bg-nostr-dark dark:border-white/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Alephium Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Learn more about integrating with Alephium blockchain:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <a 
                href="https://docs.alephium.org/sdk/getting-started/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-nostr-blue hover:underline"
              >
                Alephium SDK Documentation
              </a>
            </li>
            <li>
              <a 
                href="https://docs.alephium.org/ralph/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-nostr-blue hover:underline"
              >
                Ralph Smart Contract Language
              </a>
            </li>
            <li>
              <a 
                href="https://github.com/alephium/build-smart-contracts-in-ralph" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-nostr-blue hover:underline"
              >
                Smart Contract Examples
              </a>
            </li>
            <li>
              <a 
                href="https://alephium.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-nostr-blue hover:underline"
              >
                Alephium Official Website
              </a>
            </li>
            <li>
              <a 
                href="https://explorer.alephium.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-nostr-blue hover:underline"
              >
                Alephium Explorer
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlephiumSection;
