
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import alephiumAPI from '@/lib/alephiumAPI';
import { Wallet, Network, ArrowRight } from 'lucide-react';

interface AlephiumBalanceData {
  balance: number;
  lockedBalance: number;
  utxoNum: number;
}

interface AlephiumNetworkStats {
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
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [balance, setBalance] = useState<AlephiumBalanceData | null>(null);
  const [networkStats, setNetworkStats] = useState<AlephiumNetworkStats | null>(null);
  const [loading, setLoading] = useState(false);

  const connectToAlephium = async () => {
    setLoading(true);
    
    try {
      // Fetch network stats to check connectivity
      const stats = await alephiumAPI.fetchNetworkStats();
      setNetworkStats(stats);
      
      // For demonstration purposes, we'll use a sample address
      // In a real app, this would be the user's address connected via wallet
      const sampleAddress = '1DrDyTr9RpRsQnDnXo2YRiPzPW4ooHX5LLoqXrqfMrpQH';
      
      try {
        const balanceData = await alephiumAPI.getAddressBalance(sampleAddress);
        setBalance(balanceData);
        setIsConnected(true);
        setMessage("Connected to Alephium blockchain");
        
        toast({
          title: "Connected to Alephium",
          description: `Network connection established. Block height: ${stats.latestBlocks[0]?.height || 'Unknown'}`,
        });
      } catch (addressError) {
        console.error("Error fetching address data:", addressError);
        setMessage("Connected to network but couldn't fetch address data");
        setIsConnected(true);
        
        toast({
          title: "Partial Connection",
          description: "Connected to Alephium network but couldn't fetch wallet data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error connecting to Alephium:", error);
      setMessage("Failed to connect to Alephium blockchain");
      setIsConnected(false);
      
      toast({
        title: "Connection Failed",
        description: "Could not establish connection to the Alephium network",
        variant: "destructive",
      });
    } finally {
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
      <Card className="dark:bg-nostr-dark dark:border-white/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center">
            <Wallet className="mr-2" />
            Alephium Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Alephium is a sharded blockchain that makes decentralized applications faster, 
            more secure, and less expensive to use. This integration enables you to interact 
            with the Alephium blockchain directly.
          </p>
          
          {!isConnected ? (
            <Button 
              onClick={connectToAlephium}
              className="bg-nostr-blue hover:bg-nostr-blue/90 text-white"
              disabled={loading}
            >
              {loading ? "Connecting..." : "Connect to Alephium"}
            </Button>
          ) : (
            <div className="text-green-500 font-medium mb-4">
              ✓ Connected to Alephium
            </div>
          )}
          
          {message && (
            <div className="mt-4 p-3 rounded bg-nostr-dark border border-white/10">
              {message}
            </div>
          )}
          
          {balance && (
            <div className="mt-4 p-4 rounded bg-nostr-dark border border-white/10">
              <h3 className="text-lg font-medium mb-2">Sample Wallet Balance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Balance:</p>
                  <p className="font-medium">{balance.balance.toFixed(4)} ALPH</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Locked Balance:</p>
                  <p className="font-medium">{balance.lockedBalance.toFixed(4)} ALPH</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">UTXO Count:</p>
                  <p className="font-medium">{balance.utxoNum}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {networkStats && (
        <Card className="dark:bg-nostr-dark dark:border-white/20">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <Network className="mr-2" />
              Alephium Network Stats
            </CardTitle>
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
          </CardContent>
        </Card>
      )}
      
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
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlephiumSection;
