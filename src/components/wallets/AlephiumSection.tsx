// Keep the existing imports and add the WalletSummary component
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@alephium/web3-react';
import alephiumAPI from '@/lib/alephiumAPI';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, ArrowRight } from 'lucide-react';
import { WalletSummary } from './WalletSummary';

// Keep the types
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
    chainFrom?: number;
    chainTo?: number;
  }>;
  isLiveData: boolean;
}

const AlephiumSection = () => {
  const { connectionStatus, account } = useWallet();
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNetworkStats = async () => {
    setIsLoading(true);
    try {
      const networkStats = await alephiumAPI.fetchNetworkStats();
      setStats(networkStats);
    } catch (error) {
      console.error('Failed to fetch network stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkStats();
    
    // Refresh stats every 3 minutes
    const interval = setInterval(fetchNetworkStats, 180000);
    return () => clearInterval(interval);
  }, []);

  // Format timestamp to readable time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Calculate time ago
  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    
    return Math.floor(seconds) + " seconds ago";
  };

  // Handle wallet connection
  const connectWallet = () => {
    // Use the proper method from @alephium/web3-react
    try {
      // The useWallet hook doesn't have a connect method directly
      // Instead, we need to trigger the wallet connection dialog through the extension
      window.dispatchEvent(new CustomEvent('alephium:connect'));
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet Connection Card */}
      {connectionStatus !== 'connected' && (
        <Card className="dark:bg-nostr-cardBg dark:border-white/20">
          <CardHeader>
            <CardTitle>Connect Alephium Wallet</CardTitle>
            <CardDescription>
              Connect your wallet to view your Alephium assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={connectWallet}
              className="bg-nostr-blue text-white hover:bg-nostr-blue/90"
            >
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Show the WalletSummary component here */}
      <WalletSummary />

      {/* Network Stats Card */}
      <Card className="dark:bg-nostr-cardBg dark:border-white/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Alephium Network Stats</CardTitle>
            <CardDescription>Live data from the Alephium blockchain</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchNetworkStats} 
              disabled={isLoading}
              className="dark:bg-nostr-dark dark:border-white/20 dark:text-white"
            >
              Refresh
            </Button>
            <a 
              href="https://explorer.alephium.org" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button 
                variant="outline" 
                size="sm"
                className="dark:bg-nostr-dark dark:border-white/20 dark:text-white"
              >
                <ExternalLink className="h-4 w-4 mr-1" /> Explorer
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Hash Rate" value={stats.hashRate} />
                <StatsCard title="Difficulty" value={stats.difficulty} />
                <StatsCard title="Block Time" value={stats.blockTime} />
                <StatsCard title="Active Addresses" value={stats.activeAddresses.toLocaleString()} />
                <StatsCard title="Token Count" value={stats.tokenCount.toLocaleString()} />
                <StatsCard title="Total TXs" value={stats.totalTransactions} />
                <StatsCard title="Total Supply" value={stats.totalSupply} />
                <StatsCard title="Total Blocks" value={stats.totalBlocks} />
              </div>
              
              <h3 className="font-medium text-lg mt-6 mb-3">Latest Blocks</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Height</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Hash</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Transactions</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Chain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {stats.latestBlocks.map((block, index) => (
                      <tr key={block.hash} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{block.height.toLocaleString()}</td>
                        <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">
                          <a 
                            href={`https://explorer.alephium.org/blocks/${block.hash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center hover:text-blue-500"
                          >
                            {block.hash.substring(0, 8)}...
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">
                          <span title={formatTime(block.timestamp)}>{timeAgo(block.timestamp)}</span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">{block.txNumber}</td>
                        <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">
                          {block.chainFrom !== undefined && block.chainTo !== undefined ? 
                            `${block.chainFrom} → ${block.chainTo}` : 
                            'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-right">
                <a 
                  href="https://explorer.alephium.org/blocks" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center text-sm"
                >
                  View all blocks <ArrowRight className="ml-1 h-3 w-3" />
                </a>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-red-500">Failed to load network stats. Please try again.</p>
              <Button 
                onClick={fetchNetworkStats} 
                variant="outline" 
                className="mt-4 dark:bg-nostr-dark dark:border-white/20"
              >
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Stats card component
const StatsCard = ({ title, value }: { title: string; value: string | number }) => (
  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
    <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
    <p className="text-xl font-semibold mt-1">{value}</p>
  </div>
);

export default AlephiumSection;
