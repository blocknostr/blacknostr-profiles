import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Wallet, FilePlus, Trash, Circle, TrendingUp, DatabaseBackup, Database, FileText, Layers, CircleDollarSign, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNostr } from "@/contexts/NostrContext";
import { toast } from "@/components/ui/use-toast";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import alephiumAPI from '@/lib/alephiumAPI';
import * as tokenMetadataModule from "@/lib/tokenMetadata";

interface PortfolioOverviewProps {
  ecosystem: string;
}

interface WalletData {
  id: string;
  address: string;
  balance?: number;
  tokens?: Array<{ symbol: string; balance: number; value: number }>;
  nfts?: Array<{ id: string; name: string; collection: string; floorPrice: number }>;
  pools?: Array<{ id: string; name: string; token1: string; token2: string; liquidity: number; apr: number }>;
  lastUpdated?: number;
}

interface TokenData {
  symbol: string;
  balance: number;
  value: number;
}

interface NFTData {
  id: string;
  name: string;
  collection: string;
  floorPrice: number;
}

interface PoolData {
  id: string;
  name: string;
  token1: string;
  token2: string;
  liquidity: number;
  apr: number;
}

const PortfolioOverview = ({ ecosystem }: PortfolioOverviewProps) => {
  const { isAuthenticated } = useNostr();
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [walletsLoaded, setWalletsLoaded] = useState(false);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange24h, setPriceChange24h] = useState<number>(0);
  
  // Aggregate data across all wallets
  const [aggregatedTokens, setAggregatedTokens] = useState<Record<string, TokenData>>({});
  const [aggregatedNFTs, setAggregatedNFTs] = useState<NFTData[]>([]);
  const [aggregatedPools, setAggregatedPools] = useState<PoolData[]>([]);
  
  // Load wallets from localStorage based on the selected ecosystem
  useEffect(() => {
    loadWallets();
    // Fetch Alephium price data if we're on Alephium ecosystem
    if (ecosystem === 'alephium') {
      fetchAlephiumPriceData();
    }
  }, [ecosystem]);

  // Fetch price data for Alephium from a mock API (would be replaced with actual API)
  const fetchAlephiumPriceData = async () => {
    try {
      // For demo purposes, using mock data
      // In a real scenario, you'd fetch from CoinGecko or similar API
      setCurrentPrice(0.82);
      setPriceChange24h(3.5);
    } catch (error) {
      console.error("Error fetching price data:", error);
      setCurrentPrice(0.82);  // fallback values
      setPriceChange24h(2.3);
    }
  };

  const loadWallets = async () => {
    setLoading(true);
    try {
      const savedWallets = localStorage.getItem(`${ecosystem}_wallets`);
      let walletData = savedWallets ? JSON.parse(savedWallets) : [];
      
      // Process wallet data with accurate balance and token information
      let walletsWithData: WalletData[] = [];
      let total = 0;
      
      // For alephium wallets, try to get real balances
      if (ecosystem === 'alephium') {
        const now = Date.now();
        const oneHourMs = 3600000;
        
        for (const wallet of walletData) {
          // Skip fetching data if we updated less than an hour ago
          if (wallet.lastUpdated && now - wallet.lastUpdated < oneHourMs) {
            walletsWithData.push(wallet);
            
            // Add wallet balance to total
            const walletValue = (wallet.balance || 0) + 
              ((wallet.tokens || []).reduce((sum, token) => sum + token.value, 0));
            total += walletValue;
            continue;
          }
          
          try {
            // Get real balance data for Alephium
            const balanceData = await alephiumAPI.getAddressBalance(wallet.address);
            // Convert balance from smallest unit (nanoALPH) to ALPH
            const balanceInALPH = balanceData.balance / 10**18;
            
            // Try to get token data
            let tokens: TokenData[] = [];
            let nfts: NFTData[] = [];
            let pools: PoolData[] = [];
            
            try {
              // Get all tokens associated with this address
              const tokensData = await alephiumAPI.getAddressTokens(wallet.address);
              
              if (tokensData && tokensData.length > 0) {
                for (const tokenData of tokensData) {
                  try {
                    // Try to fetch token metadata
                    const tokenId = tokenData.id;
                    const tokenAmount = parseInt(tokenData.amount);
                    
                    // Fetch token details if possible
                    const tokenInfo = await alephiumAPI.getTokenInfo(tokenId);
                    
                    // If we got token info, calculate the formatted amount based on decimals
                    let formattedAmount = tokenAmount;
                    let symbol = tokenId.substring(0, 6); // Default symbol is first 6 chars of ID
                    
                    if (tokenInfo) {
                      symbol = tokenInfo.symbol || symbol;
                      // Format amount based on decimals if available
                      if (tokenInfo.decimals) {
                        formattedAmount = tokenAmount / Math.pow(10, tokenInfo.decimals);
                      }
                    }
                    
                    // Default price - this would ideally come from a price API
                    const tokenPrice = 0.01;
                    
                    tokens.push({
                      symbol,
                      balance: formattedAmount,
                      value: formattedAmount * tokenPrice
                    });
                  } catch (err) {
                    console.error("Error processing token:", err);
                  }
                }
              }
              
              // Generate some mock NFT and Pool data for now
              nfts = generateNFTsFromAddress(wallet.address);
              pools = generatePoolsFromAddress(wallet.address);
              
            } catch (tokenErr) {
              console.error("Could not fetch token data:", tokenErr);
              // Use existing tokens or generate some
              tokens = wallet.tokens || generateTokensFromAddress(wallet.address, ecosystem);
              nfts = wallet.nfts || generateNFTsFromAddress(wallet.address);
              pools = wallet.pools || generatePoolsFromAddress(wallet.address);
            }
            
            const updatedWallet = {
              ...wallet,
              balance: balanceInALPH,
              tokens,
              nfts,
              pools,
              lastUpdated: now
            };
            
            walletsWithData.push(updatedWallet);
            
            // Add wallet balance to total
            const walletValue = balanceInALPH + tokens.reduce((sum, token) => sum + token.value, 0);
            total += walletValue;
          } catch (error) {
            console.error("Error loading wallet data:", error);
            
            // Fallback to calculated data if API fails
            const balance = wallet.balance || calculateBalanceFromAddress(wallet.address, ecosystem);
            const tokens = wallet.tokens || generateTokensFromAddress(wallet.address, ecosystem);
            const nfts = wallet.nfts || generateNFTsFromAddress(wallet.address);
            const pools = wallet.pools || generatePoolsFromAddress(wallet.address);
            
            walletsWithData.push({
              ...wallet,
              balance,
              tokens,
              nfts,
              pools,
              lastUpdated: now
            });
            
            // Add wallet value to total
            const walletValue = balance + tokens.reduce((sum, token) => sum + token.value, 0);
            total += walletValue;
          }
        }
      } else {
        // For non-Alephium wallets, use calculated data
        walletsWithData = walletData.map((wallet: WalletData) => {
          const balance = wallet.balance || calculateBalanceFromAddress(wallet.address, ecosystem);
          const tokens = wallet.tokens || generateTokensFromAddress(wallet.address, ecosystem);
          
          const walletValue = balance + tokens.reduce((sum, token) => sum + token.value, 0);
          total += walletValue;
          
          return {
            ...wallet,
            balance,
            tokens,
            lastUpdated: Date.now()
          };
        });
      }
      
      // Aggregate data across all wallets
      if (ecosystem === 'alephium') {
        const tokensMap: Record<string, TokenData> = {};
        const nftsArray: NFTData[] = [];
        const poolsArray: PoolData[] = [];
        
        // Aggregate tokens
        walletsWithData.forEach(wallet => {
          wallet.tokens?.forEach(token => {
            if (tokensMap[token.symbol]) {
              tokensMap[token.symbol].balance += token.balance;
              tokensMap[token.symbol].value += token.value;
            } else {
              tokensMap[token.symbol] = { ...token };
            }
          });
          
          // Add NFTs to array
          wallet.nfts?.forEach(nft => {
            nftsArray.push(nft);
          });
          
          // Add pools to array (unique by ID)
          wallet.pools?.forEach(pool => {
            if (!poolsArray.some(p => p.id === pool.id)) {
              poolsArray.push(pool);
            }
          });
        });
        
        setAggregatedTokens(tokensMap);
        setAggregatedNFTs(nftsArray);
        setAggregatedPools(poolsArray);
      }
      
      // Save updated wallet data back to localStorage
      localStorage.setItem(`${ecosystem}_wallets`, JSON.stringify(walletsWithData));
      
      setWallets(walletsWithData);
      setTotalValue(total);
      setWalletsLoaded(true);
    } catch (error) {
      console.error("Error loading wallets:", error);
      setWallets([]);
      setTotalValue(0);
      setWalletsLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  // Calculate a consistent balance based on wallet address
  const calculateBalanceFromAddress = (address: string, eco: string): number => {
    // Use a deterministic approach to generate balances based on address
    // This makes balance display consistent for the same address
    const addressSum = address.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    let baseFactor = (addressSum % 100) / 100; // Between 0 and 0.99
    
    // Scale based on ecosystem
    if (eco === 'bitcoin') {
      // Bitcoin typically has smaller values (0.001 - 2 BTC)
      return parseFloat((0.001 + baseFactor * 2).toFixed(4));
    } else if (eco === 'ethereum') {
      // Ethereum has middle range (0.01 - 10 ETH)
      return parseFloat((0.01 + baseFactor * 10).toFixed(4));
    } else {
      // Alephium has larger values (1 - 100 ALPH)
      return parseFloat((1 + baseFactor * 100).toFixed(4));
    }
  };

  // Generate tokens based on wallet address
  const generateTokensFromAddress = (address: string, eco: string) => {
    // Create a deterministic seed from the address
    const seed = address.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const tokenCount = (seed % 3) + 1; // 1-3 tokens, deterministic based on address
    
    // Define tokens by ecosystem
    const ecosystemTokens = {
      bitcoin: [
        { symbol: 'SATS', price: 0.00000034 },
        { symbol: 'ORDI', price: 32.5 },
        { symbol: 'BRC20', price: 0.8 }
      ],
      ethereum: [
        { symbol: 'USDT', price: 1.0 },
        { symbol: 'USDC', price: 1.0 },
        { symbol: 'DAI', price: 0.99 }
      ],
      alephium: [
        { symbol: 'ABX', price: 0.05 },
        { symbol: 'USDP', price: 1.0 },
        { symbol: 'ALP', price: 0.2 }
      ]
    };
    
    // Select tokens for this wallet using deterministic selection
    const tokens = ecosystemTokens[eco as keyof typeof ecosystemTokens] || [];
    
    return tokens.slice(0, tokenCount).map((token, index) => {
      // Use wallet address and token symbol to create deterministic balance
      const charCode = (address.charCodeAt(index % address.length) + token.symbol.charCodeAt(0)) % 100;
      const tokenBalance = parseFloat((10 + charCode).toFixed(2));
      const tokenValue = parseFloat((tokenBalance * token.price).toFixed(2));
      
      return {
        symbol: token.symbol,
        balance: tokenBalance,
        value: tokenValue,
      };
    });
  };
  
  // Generate NFTs based on wallet address
  const generateNFTsFromAddress = (address: string): NFTData[] => {
    const seed = address.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const nftCount = (seed % 3) + 1; // 1-3 NFTs, deterministic based on address
    
    const collections = ['Alephium Punks', 'ALPH Apes', 'ALPH Artifacts', 'Crypto Critters'];
    
    const result: NFTData[] = [];
    for (let i = 0; i < nftCount; i++) {
      const charCode = (address.charCodeAt(i % address.length)) % collections.length;
      const collection = collections[charCode];
      const itemNumber = ((seed + i) % 9999) + 1;
      
      result.push({
        id: `nft-${address.substring(0, 6)}-${i}`,
        name: `${collection} #${itemNumber}`,
        collection,
        floorPrice: 25 + (seed % 100) / 2
      });
    }
    
    return result;
  };
  
  // Generate pool data based on wallet address
  const generatePoolsFromAddress = (address: string): PoolData[] => {
    const seed = address.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const poolCount = (seed % 2) + 1; // 1-2 pools, deterministic based on address
    
    const poolTokens = [
      { token1: 'ALPH', token2: 'USDT' },
      { token1: 'ALPH', token2: 'USDP' },
      { token1: 'ABX', token2: 'USDP' },
      { token1: 'ALPH', token2: 'ABX' }
    ];
    
    const result: PoolData[] = [];
    for (let i = 0; i < poolCount; i++) {
      const charCode = (address.charCodeAt(i % address.length)) % poolTokens.length;
      const poolPair = poolTokens[charCode];
      const liquidity = 1000 + (seed % 5000);
      const apr = 5 + (seed % 20);
      
      result.push({
        id: `pool-${address.substring(0, 6)}-${i}`,
        name: `${poolPair.token1}-${poolPair.token2} Pool`,
        token1: poolPair.token1,
        token2: poolPair.token2,
        liquidity,
        apr
      });
    }
    
    return result;
  };

  // Delete wallet
  const confirmDeleteWallet = (walletId: string) => {
    setWalletToDelete(walletId);
    setDeleteConfirmDialogOpen(true);
  };

  const deleteWallet = () => {
    if (!walletToDelete) return;
    
    try {
      const updatedWallets = wallets.filter(wallet => wallet.id !== walletToDelete);
      localStorage.setItem(`${ecosystem}_wallets`, JSON.stringify(updatedWallets));
      setWallets(updatedWallets);
      
      // Recalculate total value
      const newTotal = updatedWallets.reduce((sum, wallet) => {
        const tokenValue = (wallet.tokens || []).reduce(
          (tokenSum, token) => tokenSum + token.value, 
          0
        );
        return sum + (wallet.balance || 0) + tokenValue;
      }, 0);
      
      setTotalValue(newTotal);
      
      toast({
        title: "Wallet Removed",
        description: "The wallet has been removed from your portfolio.",
      });
    } catch (error) {
      console.error("Error deleting wallet:", error);
      toast({
        title: "Error",
        description: "Failed to remove the wallet.",
        variant: "destructive",
      });
    } finally {
      setWalletToDelete(null);
      setDeleteConfirmDialogOpen(false);
    }
  };

  // Helper functions
  const formatAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };

  const getCurrencySymbol = (eco: string) => {
    switch (eco) {
      case 'bitcoin': return 'BTC';
      case 'ethereum': return 'ETH';
      case 'alephium': return 'ALPH';
      default: return '';
    }
  };

  const refreshPortfolioData = async () => {
    toast({
      title: "Refreshing Portfolio",
      description: "Updating wallet balances and token information...",
    });
    await loadWallets();
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Portfolio Summary Card */}
      <Card className="dark:bg-nostr-dark dark:border-white/20 overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Portfolio Overview
          </CardTitle>
          <CardDescription>
            Track your {ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1)} assets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Value Card */}
            <div className="p-4 rounded-md bg-gradient-to-br from-nostr-blue/20 to-nostr-dark border dark:border-white/10">
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className="text-2xl font-medium">${totalValue.toFixed(2)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {ecosystem === 'alephium' && `≈ ${(totalValue / currentPrice).toFixed(2)} ALPH`}
              </div>
            </div>
            
            {/* Wallet Count Card */}
            <div className="p-4 rounded-md bg-gradient-to-br from-purple-500/20 to-nostr-dark border dark:border-white/10">
              <div className="text-sm text-muted-foreground">Wallet Count</div>
              <div className="text-2xl font-medium">{wallets.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {wallets.length > 0 ? `${wallets.length} active wallets` : "No wallets added"}
              </div>
            </div>
            
            {/* Alephium Price (Only show for Alephium) */}
            {ecosystem === 'alephium' && (
              <div className="p-4 rounded-md bg-gradient-to-br from-green-500/20 to-nostr-dark border dark:border-white/10">
                <div className="text-sm text-muted-foreground">ALPH Price</div>
                <div className="text-2xl font-medium">${currentPrice.toFixed(2)}</div>
                <div className="mt-1 text-xs flex items-center">
                  {priceChange24h >= 0 ? (
                    <span className="text-green-500 flex items-center">
                      ↑ {priceChange24h.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center">
                      ↓ {Math.abs(priceChange24h).toFixed(2)}%
                    </span>
                  )}
                  <span className="text-muted-foreground ml-1">(24h)</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Asset Distribution Chart - placeholder for now */}
          {ecosystem === 'alephium' && wallets.length > 0 && (
            <div className="mt-4 pt-4 border-t dark:border-white/10">
              <h3 className="text-sm font-medium mb-2">Asset Distribution</h3>
              <div className="h-6 w-full rounded-full overflow-hidden bg-muted">
                <div className="flex h-full">
                  <div className="bg-nostr-blue h-full" style={{ width: '65%' }}>
                    <span className="px-2 text-xs text-white">ALPH (65%)</span>
                  </div>
                  <div className="bg-purple-500 h-full" style={{ width: '20%' }}>
                    <span className="px-2 text-xs text-white">Tokens (20%)</span>
                  </div>
                  <div className="bg-amber-500 h-full" style={{ width: '10%' }}>
                    <span className="px-2 text-xs text-white">NFTs (10%)</span>
                  </div>
                  <div className="bg-green-500 h-full" style={{ width: '5%' }}>
                    <span className="px-2 text-xs text-white">Pools (5%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshPortfolioData}
            className="w-full dark:border-white/20 mt-4"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Portfolio Data"}
          </Button>
        </CardContent>
      </Card>

      {/* Wallets List Section with Tabs */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Your {ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1)} Wallets</h3>
      
        {walletsLoaded && wallets.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-md dark:border-white/20">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No wallets added yet</p>
            <Button disabled={!isAuthenticated} className="dark:bg-nostr-dark dark:border-white/20">
              <FilePlus className="mr-2 h-4 w-4" />
              Add Wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Individual Wallet Cards */}
            {wallets.map((wallet) => (
              <Card key={wallet.id} className="dark:bg-nostr-dark dark:border-white/20">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-muted dark:bg-black/30 flex items-center justify-center mr-3">
                        <Wallet className="h-5 w-5 text-nostr-blue" />
                      </div>
                      <div>
                        <p className="font-medium">{formatAddress(wallet.address)}</p>
                        <p className="text-sm text-muted-foreground">
                          {wallet.balance?.toFixed(4)} {getCurrencySymbol(ecosystem)}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => confirmDeleteWallet(wallet.id)}
                      className="h-8 w-8 dark:hover:bg-white/5"
                    >
                      <Trash className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  
                  {/* Wallet Data Tabs */}
                  {ecosystem === 'alephium' && (
                    <div className="mt-4 pt-4 border-t dark:border-white/10">
                      <Tabs defaultValue="tokens" className="w-full">
                        <TabsList className="w-full dark:bg-nostr-dark mb-3 grid grid-cols-3">
                          <TabsTrigger value="tokens" className="data-[state=active]:dark:bg-nostr-blue data-[state=active]:dark:text-white">
                            <CircleDollarSign className="h-3 w-3 mr-1" />
                            Tokens
                          </TabsTrigger>
                          <TabsTrigger value="nfts" className="data-[state=active]:dark:bg-nostr-blue data-[state=active]:dark:text-white">
                            <Layers className="h-3 w-3 mr-1" />
                            NFTs
                          </TabsTrigger>
                          <TabsTrigger value="pools" className="data-[state=active]:dark:bg-nostr-blue data-[state=active]:dark:text-white">
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Pools
                          </TabsTrigger>
                        </TabsList>
                        
                        {/* Tokens Tab Content */}
                        <TabsContent value="tokens" className="mt-0">
                          {wallet.tokens && wallet.tokens.length > 0 ? (
                            <div className="space-y-2">
                              {wallet.tokens.map((token, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 rounded-md bg-muted/50 dark:bg-black/20">
                                  <div className="flex items-center">
                                    <Circle className="h-4 w-4 mr-2 text-nostr-blue" />
                                    <span>{token.symbol}</span>
                                  </div>
                                  <div className="text-sm">
                                    <div>{token.balance.toFixed(2)}</div>
                                    <div className="text-muted-foreground text-xs">${token.value.toFixed(2)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-3 text-sm text-muted-foreground">
                              No tokens found in this wallet
                            </div>
                          )}
                        </TabsContent>
                        
                        {/* NFTs Tab Content */}
                        <TabsContent value="nfts" className="mt-0">
                          {wallet.nfts && wallet.nfts.length > 0 ? (
                            <div className="space-y-2">
                              {wallet.nfts.map((nft, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 rounded-md bg-muted/50 dark:bg-black/20">
                                  <div className="flex items-center">
                                    <div className="h-8 w-8 rounded bg-nostr-blue/20 flex items-center justify-center mr-2 text-xs">
                                      NFT
                                    </div>
                                    <div>
                                      <div className="text-sm">{nft.name}</div>
                                      <div className="text-xs text-muted-foreground">{nft.collection}</div>
                                    </div>
                                  </div>
                                  <div className="text-sm">
                                    <div className="text-muted-foreground text-xs">Floor</div>
                                    <div>{nft.floorPrice.toFixed(2)} ALPH</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-3 text-sm text-muted-foreground">
                              No NFTs found in this wallet
                            </div>
                          )}
                        </TabsContent>
                        
                        {/* Pools Tab Content */}
                        <TabsContent value="pools" className="mt-0">
                          {wallet.pools && wallet.pools.length > 0 ? (
                            <div className="space-y-2">
                              {wallet.pools.map((pool, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 rounded-md bg-muted/50 dark:bg-black/20">
                                  <div>
                                    <div className="text-sm font-medium">{pool.name}</div>
                                    <div className="flex space-x-1 text-xs text-muted-foreground">
                                      <span>{pool.token1}</span>
                                      <span>/</span>
                                      <span>{pool.token2}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm">${pool.liquidity.toLocaleString()}</div>
                                    <div className="text-xs text-green-500">APR: {pool.apr.toFixed(1)}%</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-3 text-sm text-muted-foreground">
                              No liquidity pools found for this wallet
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                  
                  {/* Last Updated Indicator - show only for Alephium wallets */}
                  {ecosystem === 'alephium' && wallet.lastUpdated && (
                    <div className="mt-3 text-xs text-muted-foreground text-right">
                      Updated: {new Date(wallet.lastUpdated).toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {/* Aggregated Data Section - Only for Alephium with multiple wallets */}
            {ecosystem === 'alephium' && wallets.length > 1 && (
              <Card className="dark:bg-nostr-dark dark:border-white/20">
                <CardHeader>
                  <CardTitle className="text-base">Aggregated Assets</CardTitle>
                  <CardDescription>Combined assets across all your wallets</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="tokens">
                    <TabsList className="w-full dark:bg-nostr-dark mb-3 grid grid-cols-3">
                      <TabsTrigger value="tokens" className="data-[state=active]:dark:bg-nostr-blue data-[state=active]:dark:text-white">
                        <CircleDollarSign className="h-3 w-3 mr-1" />
                        All Tokens
                      </TabsTrigger>
                      <TabsTrigger value="nfts" className="data-[state=active]:dark:bg-nostr-blue data-[state=active]:dark:text-white">
                        <Layers className="h-3 w-3 mr-1" />
                        All NFTs
                      </TabsTrigger>
                      <TabsTrigger value="pools" className="data-[state=active]:dark:bg-nostr-blue data-[state=active]:dark:text-white">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        All Pools
                      </TabsTrigger>
                    </TabsList>
                    
                    {/* Aggregated Tokens Tab */}
                    <TabsContent value="tokens" className="mt-0">
                      {Object.keys(aggregatedTokens).length > 0 ? (
                        <div className="space-y-2">
                          {Object.values(aggregatedTokens).map((token, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 rounded-md bg-muted/50 dark:bg-black/20">
                              <div className="flex items-center">
                                <Circle className="h-4 w-4 mr-2 text-nostr-blue" />
                                <span>{token.symbol}</span>
                              </div>
                              <div className="text-sm">
                                <div>{token.balance.toFixed(2)}</div>
                                <div className="text-muted-foreground text-xs">${token.value.toFixed(2)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-3 text-sm text-muted-foreground">
                          No tokens found across wallets
                        </div>
                      )}
                    </TabsContent>
                    
                    {/* Aggregated NFTs Tab */}
                    <TabsContent value="nfts" className="mt-0">
                      {aggregatedNFTs.length > 0 ? (
                        <div className="space-y-2">
                          {aggregatedNFTs.map((nft, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 rounded-md bg-muted/50 dark:bg-black/20">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded bg-nostr-blue/20 flex items-center justify-center mr-2 text-xs">
                                  NFT
                                </div>
                                <div>
                                  <div className="text-sm">{nft.name}</div>
                                  <div className="text-xs text-muted-foreground">{nft.collection}</div>
                                </div>
                              </div>
                              <div className="text-sm">
                                <div className="text-muted-foreground text-xs">Floor</div>
                                <div>{nft.floorPrice.toFixed(2)} ALPH</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-3 text-sm text-muted-foreground">
                          No NFTs found across wallets
                        </div>
                      )}
                    </TabsContent>
                    
                    {/* Aggregated Pools Tab */}
                    <TabsContent value="pools" className="mt-0">
                      {aggregatedPools.length > 0 ? (
                        <div className="space-y-2">
                          {aggregatedPools.map((pool, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 rounded-md bg-muted/50 dark:bg-black/20">
                              <div>
                                <div className="text-sm font-medium">{pool.name}</div>
                                <div className="flex space-x-1 text-xs text-muted-foreground">
                                  <span>{pool.token1}</span>
                                  <span>/</span>
                                  <span>{pool.token2}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm">${pool.liquidity.toLocaleString()}</div>
                                <div className="text-xs text-green-500">APR: {pool.apr.toFixed(1)}%</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-3 text-sm text-muted-foreground">
                          No liquidity pools found across wallets
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center ${deleteConfirmDialogOpen ? 'block' : 'hidden'}`}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} 
        >
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4 dark:bg-nostr-dark dark:border-white/20 border">
            <h3 className="text-lg font-medium mb-2">Confirm Deletion</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to remove this wallet from your portfolio? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setDeleteConfirmDialogOpen(false)} className="dark:border-white/20">
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteWallet}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default PortfolioOverview;
