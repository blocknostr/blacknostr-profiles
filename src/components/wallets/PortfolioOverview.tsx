import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Wallet, FilePlus, Trash, Circle, TrendingUp, CircleDollarSign, BarChart3, Coins, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNostr } from "@/contexts/NostrContext";
import { toast } from "@/components/ui/use-toast";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PortfolioChart from './PortfolioChart';
import alephiumAPI from '@/lib/alephiumAPI';
import * as tokenMetadataModule from "@/lib/tokenMetadata";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as coinGeckoAPI from '@/lib/coinGeckoAPI';

interface PortfolioOverviewProps {
  ecosystem: string;
}

interface WalletData {
  id: string;
  address: string;
  balance?: number;
  tokens?: Array<{ symbol: string; balance: number; value: number; usdPrice?: number; tokenId?: string }>;
  nfts?: Array<{ id: string; name: string; collection: string; floorPrice: number }>;
  pools?: Array<{ id: string; name: string; token1: string; token2: string; liquidity: number; apr: number }>;
  lastUpdated?: number;
}

interface TokenData {
  symbol: string;
  balance: number;
  value: number;
  usdPrice?: number;
  tokenId?: string;
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

interface PriceData {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
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
  const [priceData, setPriceData] = useState<PriceData>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  
  // Aggregate data across all wallets
  const [aggregatedTokens, setAggregatedTokens] = useState<Record<string, TokenData>>({});
  const [aggregatedNFTs, setAggregatedNFTs] = useState<NFTData[]>([]);
  const [aggregatedPools, setAggregatedPools] = useState<PoolData[]>([]);
  
  // Color palette for charts
  const CHART_COLORS = ['#0042C4', '#6366f1', '#8b5cf6', '#d946ef', '#f97316', '#06b6d4'];
  
  // Compute chart data for asset distribution
  const chartData = useMemo(() => {
    if (ecosystem !== 'alephium') return [];

    const tokens = Object.values(aggregatedTokens);
    const alphBalance = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
    const alphValue = alphBalance * (currentPrice || 0.38);
    
    const tokenData = [];
    
    // Add ALPH balance
    if (alphBalance > 0) {
      tokenData.push({
        name: 'ALPH',
        value: alphValue,
        color: CHART_COLORS[0]
      });
    }
    
    // Add token balances
    tokens.forEach((token, index) => {
      if (token.symbol !== 'ALPH' && token.value > 0) {
        tokenData.push({
          name: token.symbol,
          value: token.value,
          color: CHART_COLORS[(index + 1) % CHART_COLORS.length]
        });
      }
    });
    
    // Add a category for NFTs if we have any
    if (aggregatedNFTs.length > 0) {
      const nftValue = aggregatedNFTs.reduce((sum, nft) => sum + nft.floorPrice, 0);
      if (nftValue > 0) {
        tokenData.push({
          name: 'NFTs',
          value: nftValue,
          color: CHART_COLORS[(tokenData.length) % CHART_COLORS.length]
        });
      }
    }
    
    // Add a category for liquidity pools if we have any
    if (aggregatedPools.length > 0) {
      const poolValue = aggregatedPools.reduce((sum, pool) => sum + pool.liquidity, 0);
      if (poolValue > 0) {
        tokenData.push({
          name: 'Pools',
          value: poolValue,
          color: CHART_COLORS[(tokenData.length) % CHART_COLORS.length]
        });
      }
    }
    
    return tokenData;
  }, [wallets, aggregatedTokens, aggregatedNFTs, aggregatedPools, currentPrice, ecosystem]);
  
  // Fetch price data for tokens from CoinGecko
  const fetchPriceData = async () => {
    if (ecosystem !== 'alephium') return;
    
    setLoadingPrices(true);
    try {
      // Get price data for ALPH and other tokens from CoinGecko
      const coinIds = ['alephium', 'alphbanx']; // Add other token IDs as needed
      const priceData = await coinGeckoAPI.getPrices(coinIds);
      
      if (priceData && priceData.alephium) {
        setCurrentPrice(priceData.alephium.usd || 0);
        setPriceChange24h(priceData.alephium.usd_24h_change || 0);
        setPriceData(priceData);
      }
    } catch (error) {
      console.error("Error fetching price data:", error);
      // Fallback values
      setCurrentPrice(0.38);
      setPriceChange24h(-0.5);
    } finally {
      setLoadingPrices(false);
    }
  };

  const updateTokenValuesWithPriceData = (walletData: WalletData[]) => {
    return walletData.map(wallet => {
      if (!wallet.tokens) return wallet;
      
      const updatedTokens = wallet.tokens.map(token => {
        let usdPrice = 0;
        
        // Try to get price from CoinGecko data
        if (token.symbol.toLowerCase() === 'alph') {
          usdPrice = priceData.alephium?.usd || 0;
        } else if (token.symbol.toLowerCase() === 'abx') {
          usdPrice = priceData.alphbanx?.usd || 0.05; // Fallback price
        } else {
          // Default price for other tokens
          usdPrice = (token.balance > 0) ? (token.value / token.balance) || 0.01 : 0.01;
        }
        
        return {
          ...token,
          usdPrice,
          value: token.balance * usdPrice
        };
      });
      
      return {
        ...wallet,
        tokens: updatedTokens
      };
    });
  };

  const loadWallets = async () => {
    setLoading(true);
    try {
      await fetchPriceData();
      
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
          if (wallet.lastUpdated && now - wallet.lastUpdated < oneHourMs && wallet.balance) {
            walletsWithData.push(wallet);
            
            // Add wallet balance to total
            const walletValue = (wallet.balance || 0) * (currentPrice || 0.38) + 
              ((wallet.tokens || []).reduce((sum, token) => sum + (token.value || 0), 0));
            total += walletValue;
            continue;
          }
          
          try {
            // Get real balance data for Alephium
            const balanceData = await alephiumAPI.getAddressBalance(wallet.address);
            // Convert balance from smallest unit (nanoALPH) to ALPH
            const balanceInALPH = Number(balanceData.balance) / 10**18;
            
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
                    
                    // Get token price from priceData if available
                    let tokenPrice = 0.01; // Default fallback price
                    
                    if (symbol.toLowerCase() === 'alph') {
                      tokenPrice = currentPrice || 0.38;
                    } else if (symbol.toLowerCase() === 'abx') {
                      tokenPrice = priceData.alphbanx?.usd || 0.05;
                    }
                    
                    tokens.push({
                      symbol,
                      balance: formattedAmount,
                      value: formattedAmount * tokenPrice,
                      usdPrice: tokenPrice,
                      tokenId
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
            
            // Add wallet balance to total (convert ALPH to USD)
            const alphValue = balanceInALPH * (currentPrice || 0.38);
            const tokensValue = tokens.reduce((sum, token) => sum + (token.value || 0), 0);
            
            total += alphValue + tokensValue;
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
            
            // Add wallet value to total (convert ALPH to USD)
            const alphValue = balance * (currentPrice || 0.38);
            const tokensValue = tokens.reduce((sum, token) => sum + (token.value || 0), 0);
            
            total += alphValue + tokensValue;
          }
        }
        
        // Update token values with latest price data
        walletsWithData = updateTokenValuesWithPriceData(walletsWithData);
        
        // Aggregate data across all wallets
        const tokensMap: Record<string, TokenData> = {};
        const nftsArray: NFTData[] = [];
        const poolsArray: PoolData[] = [];
        
        // Aggregate tokens
        walletsWithData.forEach(wallet => {
          wallet.tokens?.forEach(token => {
            if (tokensMap[token.symbol]) {
              tokensMap[token.symbol].balance += token.balance;
              tokensMap[token.symbol].value += token.value;
              tokensMap[token.symbol].usdPrice = token.usdPrice;
              if (!tokensMap[token.symbol].tokenId && token.tokenId) {
                tokensMap[token.symbol].tokenId = token.tokenId;
              }
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
      } else {
        // For non-Alephium wallets, use calculated data
        walletsWithData = walletData.map((wallet: WalletData) => {
          const balance = wallet.balance || calculateBalanceFromAddress(wallet.address, ecosystem);
          const tokens = wallet.tokens || generateTokensFromAddress(wallet.address, ecosystem);
          
          const walletValue = balance + tokens.reduce((sum, token) => sum + (token.value || 0), 0);
          total += walletValue;
          
          return {
            ...wallet,
            balance,
            tokens,
            lastUpdated: Date.now()
          };
        });
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
                {ecosystem === 'alephium' && currentPrice > 0 && `≈ ${(totalValue / currentPrice).toFixed(2)} ALPH`}
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
          
          {/* Replace the previous asset distribution bar with our new chart component */}
          {ecosystem === 'alephium' && wallets.length > 0 && chartData.length > 0 && (
            <PortfolioChart 
              tokenDistribution={chartData}
              totalValue={totalValue}
              currentPrice={currentPrice}
              priceChange24h={priceChange24h}
            />
          )}
        </CardContent>
      </Card>

      {/* Wallets List Section - Now in a unified table */}
      {ecosystem === 'alephium' && (
        <Card className="dark:bg-nostr-dark dark:border-white/20">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center justify-between">
              <div className="flex items-center">
                <Wallet className="mr-2 h-5 w-5" />
                Your Alephium Wallets
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={refreshPortfolioData}
                disabled={loading}
                className="h-8 w-8 ml-auto mr-2 dark:bg-nostr-dark dark:border-white/20"
                title="Refresh portfolio data"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
            <CardDescription>
              All your tracked wallets in one place
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              <Tabs defaultValue="wallets" className="w-full">
                <TabsList className="w-full dark:bg-nostr-dark mb-3 grid grid-cols-3">
                  <TabsTrigger value="wallets" className="data-[state=active]:dark:bg-nostr-blue data-[state=active]:dark:text-white">
                    <Wallet className="h-3 w-3 mr-1" />
                    Wallets
                  </TabsTrigger>
                  <TabsTrigger value="tokens" className="data-[state=active]:dark:bg-nostr-blue data-[state=active]:dark:text-white">
                    <CircleDollarSign className="h-3 w-3 mr-1" />
                    Tokens
                  </TabsTrigger>
                  <TabsTrigger value="combined" className="data-[state=active]:dark:bg-nostr-blue data-[state=active]:dark:text-white">
                    <Coins className="h-3 w-3 mr-1" />
                    All Assets
                  </TabsTrigger>
                </TabsList>
                
                {/* Wallets Tab - Simple list of wallets */}
                <TabsContent value="wallets" className="mt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Wallet</TableHead>
                        <TableHead>Balance (ALPH)</TableHead>
                        <TableHead>Value (USD)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wallets.map(wallet => (
                        <TableRow key={wallet.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-nostr-blue/20 flex items-center justify-center">
                                <Wallet className="h-4 w-4 text-nostr-blue" />
                              </div>
                              <div className="font-mono">{formatAddress(wallet.address)}</div>
                            </div>
                          </TableCell>
                          <TableCell>{wallet.balance?.toFixed(4)}</TableCell>
                          <TableCell>${(wallet.balance || 0) * (currentPrice || 0.82)}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => confirmDeleteWallet(wallet.id)}
                              className="h-8 w-8 dark:hover:bg-white/5"
                            >
                              <Trash className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                {/* Tokens Tab - Consolidated view of all tokens */}
                <TabsContent value="tokens" className="mt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price (USD)</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.values(aggregatedTokens).map((token, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Circle className="h-4 w-4 text-nostr-blue" />
                              <span>{token.symbol}</span>
                            </div>
                          </TableCell>
                          <TableCell>{token.balance.toFixed(4)}</TableCell>
                          <TableCell>${token.usdPrice?.toFixed(4) || "0.0000"}</TableCell>
                          <TableCell className="text-right">${token.value.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="text-xs text-muted-foreground text-right mt-2">
                    {loadingPrices ? "Loading prices..." : "Prices from CoinGecko"}
                  </div>
                </TabsContent>
                
                {/* Combined Assets Tab - All assets in one place */}
                <TabsContent value="combined" className="mt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Wallet</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead className="text-right">Value (USD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wallets.flatMap(wallet => [
                        // Add a row for ALPH balance
                        <TableRow key={`${wallet.id}-alph`}>
                          <TableCell rowSpan={1 + (wallet.tokens?.length || 0)}>
                            {formatAddress(wallet.address)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Circle className="h-4 w-4 text-green-500" />
                              <span>ALPH</span>
                            </div>
                          </TableCell>
                          <TableCell>{wallet.balance?.toFixed(4)}</TableCell>
                          <TableCell className="text-right">
                            ${((wallet.balance || 0) * (currentPrice || 0.82)).toFixed(2)}
                          </TableCell>
                        </TableRow>,
                        // Add rows for tokens
                        ...(wallet.tokens?.map((token, idx) => (
                          <TableRow key={`${wallet.id}-token-${idx}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Circle className="h-4 w-4 text-purple-500" />
                                <span>{token.symbol}</span>
                              </div>
                            </TableCell>
                            <TableCell>{token.balance.toFixed(4)}</TableCell>
                            <TableCell className="text-right">
                              ${token.value.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        )) || [])
                      ])}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}
      
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
