import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import alephiumAPI from '@/lib/alephiumAPI';
import { Wallet, Network, ArrowRight, Star, Medal, LineChart } from 'lucide-react';
import { useWallet } from '@alephium/web3-react';

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

interface NFTCollection {
  id: string;
  name: string;
  symbol: string;
  description: string;
  totalSupply: number;
  floorPrice: number;
  totalVolume: number;
  ownerCount: number;
}

const AlephiumSection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [balance, setBalance] = useState<AlephiumBalanceData | null>(null);
  const [networkStats, setNetworkStats] = useState<AlephiumNetworkStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [nftCollections, setNftCollections] = useState<NFTCollection[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  // Use Alephium wallet hook with proper typing
  const walletState = useWallet();
  const { connectionStatus, account } = walletState;
  const isConnecting = walletState.connectionStatus === 'connecting';

  useEffect(() => {
    // Check connection status whenever it changes
    if (connectionStatus === 'connected' && account) {
      setIsConnected(true);
      // Account should have address
      const currentAddress = account.address;
      setWalletAddress(currentAddress);
      loadWalletData(currentAddress);
      setMessage("Connected to Alephium wallet");
    } else if (connectionStatus === 'disconnected') {
      setIsConnected(false);
      setWalletAddress(null);
      setBalance(null);
      setMessage(null);
    }
  }, [connectionStatus, account]);

  const loadWalletData = async (address: string) => {
    try {
      const balanceData = await alephiumAPI.getAddressBalance(address);
      setBalance(balanceData);
      
      // Load NFT collections after successful connection
      loadNFTCollections();
      
      // Load network stats as well
      loadNetworkStats();
    } catch (error) {
      console.error("Error loading wallet data:", error);
      toast({
        title: "Data Loading Error",
        description: "Could not load wallet data. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const loadNetworkStats = async () => {
    try {
      const stats = await alephiumAPI.fetchNetworkStats();
      setNetworkStats(stats);
    } catch (error) {
      console.error("Error loading network stats:", error);
    }
  };

  const connectToAlephium = async () => {
    setLoading(true);
    
    try {
      // First check if network stats can be loaded
      await loadNetworkStats();
      
      // For Alephium web3-react, we don't directly call connect
      // The connection is handled by the AlephiumWalletProvider
      // We just need to inform the user to approve the connection in their wallet
      
      toast({
        title: "Connecting to Alephium",
        description: "Please approve the connection request in your wallet",
      });
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
  
  const disconnectWallet = async () => {
    try {
      // For Alephium web3-react, we don't directly call connect/disconnect
      // The disconnect functionality is handled by the AlephiumWalletProvider
      setIsConnected(false);
      setWalletAddress(null);
      setBalance(null);
      setMessage(null);
      
      toast({
        title: "Disconnected",
        description: "Your wallet has been disconnected",
      });
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };
  
  const loadNFTCollections = async () => {
    setLoadingNFTs(true);
    try {
      const collections = await alephiumAPI.getNFTCollections(5);
      setNftCollections(collections);
    } catch (error) {
      console.error("Error loading NFT collections:", error);
    } finally {
      setLoadingNFTs(false);
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
              disabled={loading || isConnecting}
            >
              {loading || isConnecting ? "Connecting..." : "Connect to Alephium"}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="text-green-500 font-medium">
                ✓ Connected to Alephium
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-80 truncate max-w-[200px]">
                  {walletAddress}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={disconnectWallet}
                  className="dark:border-white/20"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          )}
          
          {message && (
            <div className="mt-4 p-3 rounded bg-nostr-dark border border-white/10">
              {message}
            </div>
          )}
          
          {balance && (
            <div className="mt-4 p-4 rounded bg-nostr-dark border border-white/10">
              <h3 className="text-lg font-medium mb-2">Wallet Balance</h3>
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
      
      {/* Network Stats Card */}
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
      
      {/* NFT Collections from LinxLabs API */}
      <Card className="dark:bg-nostr-dark dark:border-white/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center">
            <Star className="mr-2" />
            Top NFT Collections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingNFTs ? (
            <div className="text-center py-6">Loading NFT collections...</div>
          ) : nftCollections.length > 0 ? (
            <div className="space-y-4">
              {nftCollections.map((collection) => (
                <div key={collection.id} className="flex items-center justify-between p-3 rounded bg-nostr-dark border border-white/10">
                  <div className="flex items-center space-x-3">
                    <Medal className="h-8 w-8 text-amber-400" />
                    <div>
                      <p className="font-medium">{collection.name}</p>
                      <p className="text-xs text-muted-foreground">{collection.symbol}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center">
                      <LineChart className="h-3 w-3 mr-1 text-green-400" />
                      <span className="text-sm">{collection.floorPrice.toFixed(2)} ALPH</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {collection.totalSupply} items • {collection.ownerCount} owners
                    </p>
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                className="w-full mt-2 dark:border-white/20"
                onClick={loadNFTCollections}
              >
                Refresh Collections
              </Button>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No NFT collections available. Connect to Alephium network to view collections.
            </div>
          )}
        </CardContent>
      </Card>
      
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
                href="https://api.linxlabs.org/docs/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-nostr-blue hover:underline"
              >
                LinxLabs API Documentation
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlephiumSection;
