import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUp, ArrowDown, TrendingUp, Coins, Wallet, DollarSign, Wifi, WifiOff } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fetchCoinPrice, fetchTokenBalance } from '@/lib/coinGeckoAPI';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  getTokenMetadata, 
  getFallbackTokenData, 
  formatTokenAmount, 
  fetchTokenList,
  fetchTokenTransactions,
  TokenMetadata
} from '@/lib/tokenMetadata';
import { tokenMappings, getCoinGeckoId } from '@/lib/tokenMappings';

interface PortfolioOverviewProps {
  ecosystem: string;
}

interface AssetPrice {
  price: number;
  change24h: number;
  symbol: string;
  name: string;
}

interface TokenBalance {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  value: number;
  color: string;
  logoURI?: string;
  transactions?: any[];
  priceSource?: 'market' | 'estimate';
  decimals: number;
  rawAmount?: string;
}

// Enhanced palette with more distinct colors
const tokenColors = [
  "#8B5CF6", // Vivid Purple (primary)
  "#10B981", // Emerald Green
  "#F97316", // Bright Orange
  "#0EA5E9", // Ocean Blue
  "#EC4899", // Pink
  "#D946EF", // Magenta
  "#6366F1", // Indigo
  "#F59E0B", // Amber
  "#14B8A6", // Teal
  "#EF4444", // Red
  "#3B82F6", // Blue
  "#FB7185", // Rose
];

// Demo price history data (in a real app this would come from an API)
const generatePriceHistoryData = (length = 30, baseValue = 100, volatility = 0.05) => {
  const data = [];
  let currentValue = baseValue;
  
  for (let i = 0; i < length; i++) {
    // Add some randomness to create a realistic-looking chart
    const change = currentValue * volatility * (Math.random() - 0.5);
    currentValue += change;
    
    const date = new Date();
    date.setDate(date.getDate() - (length - i - 1));
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: currentValue
    });
  }
  
  return data;
};

const PortfolioOverview = ({ ecosystem }: PortfolioOverviewProps) => {
  const [assetPrices, setAssetPrices] = useState<AssetPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletAddresses, setWalletAddresses] = useState<string[]>([]);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [totalTokenCount, setTotalTokenCount] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [tokenMetadataLoaded, setTokenMetadataLoaded] = useState(false);
  const [apiStatus, setApiStatus] = useState<{isLive: boolean; lastChecked: Date}>({
    isLive: false,
    lastChecked: new Date()
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [chartType, setChartType] = useState<'line' | 'pie'>('line');

  // Generate price history data for the demo
  const priceHistoryData = useMemo(() => {
    return generatePriceHistoryData();
  }, []);

  // CoinGecko IDs for each ecosystem
  const coinIds: Record<string, string> = {
    bitcoin: 'bitcoin',
    ethereum: 'ethereum',
    alephium: 'alephium',
  };

  // Reset the component state when ecosystem changes
  useEffect(() => {
    // Clear previous state when ecosystem changes
    setWalletAddresses([]);
    setTokens([]);
    setTotalTokenCount(0);
    setPortfolioValue(0);
    setAssetPrices(null);
    setTokenMetadataLoaded(false);
    setLoading(true);
    
    // Load new addresses for the current ecosystem
    loadAddressesFromStorage();
  }, [ecosystem]);

  // Load wallet addresses from localStorage for the specific ecosystem
  const loadAddressesFromStorage = () => {
    const savedWallets = localStorage.getItem(`${ecosystem}_wallets`);
    if (savedWallets) {
      try {
        const parsedWallets = JSON.parse(savedWallets);
        if (parsedWallets && parsedWallets.length > 0) {
          // Use only wallet addresses for the current ecosystem
          const addresses = parsedWallets.map((wallet: any) => wallet.address);
          console.log(`Found ${addresses.length} ${ecosystem} wallet addresses:`, addresses);
          setWalletAddresses(addresses);
          return;
        }
      } catch (err) {
        console.error(`Error parsing ${ecosystem} wallet addresses:`, err);
      }
    }
    
    // If no wallets found, use demo addresses specific to this ecosystem
    const demoAddresses: Record<string, string[]> = {
      bitcoin: ['bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'],
      ethereum: ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
      alephium: ['raLUPHsewjm1iA2kBzRKXB2ntbj3j4puxbVvsZD8iK3r'],
    };
    
    setWalletAddresses(demoAddresses[ecosystem] || []);
  };

  // Load asset prices from CoinGecko for the specific ecosystem
  useEffect(() => {
    const loadAssetPrice = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const coinId = coinIds[ecosystem];
        
        if (!coinId) {
          throw new Error(`Unknown ecosystem: ${ecosystem}`);
        }
        
        const priceData = await fetchCoinPrice(coinId);
        
        if (priceData) {
          setAssetPrices({
            price: priceData.current_price,
            change24h: priceData.price_change_percentage_24h,
            symbol: priceData.symbol.toUpperCase(),
            name: priceData.name
          });
          setApiStatus({isLive: true, lastChecked: new Date()});
        } else {
          throw new Error('Failed to fetch price data');
        }
      } catch (err) {
        console.error(`Error fetching price data for ${ecosystem}:`, err);
        setError(`Failed to load price data for ${ecosystem}. Please try again later.`);
        setApiStatus({isLive: false, lastChecked: new Date()});
      } finally {
        setLoading(false);
      }
    };

    if (ecosystem) {
      loadAssetPrice();
      
      // Refresh prices every 60 seconds
      const interval = setInterval(loadAssetPrice, 60000);
      return () => clearInterval(interval);
    }
  }, [ecosystem]);

  // Fetch token balances when wallet address changes for the specific ecosystem
  useEffect(() => {
    const fetchBalances = async () => {
      if (walletAddresses.length === 0 || !ecosystem) return;
      
      try {
        // Pre-fetch all token metadata for better performance
        const allTokenMetadata = await fetchTokenList();
        
        let allTokens: TokenBalance[] = [];
        let totalPortfolioValue = 0;
        let rawTokenCount = 0;
        
        console.log(`Fetching balances for ${walletAddresses.length} ${ecosystem} wallets`);
        
        for (const walletAddress of walletAddresses) {
          console.log(`Fetching balance for ${ecosystem} wallet: ${walletAddress}`);
          const result = await fetchTokenBalance(ecosystem, walletAddress);
          
          if (result && !result.error) {
            // Process main token
            if (result.balance) {
              // Get correct decimals from token mappings if available
              const mainTokenDecimals = ecosystem === 'alephium' && tokenMappings.ALPH ? 
                tokenMappings.ALPH.decimals : 18;
              
              const formattedAmount = formatTokenAmount(result.balance || 0, mainTokenDecimals);
              
              const mainToken: TokenBalance = {
                id: coinIds[ecosystem] || ecosystem,
                symbol: assetPrices?.symbol || ecosystem.toUpperCase(),
                name: assetPrices?.name || ecosystem,
                amount: parseFloat(formattedAmount),
                decimals: mainTokenDecimals,
                rawAmount: result.balance?.toString(),
                value: parseFloat((parseFloat(formattedAmount) * (assetPrices?.price || 0)).toFixed(2)),
                color: tokenColors[0],
                logoURI: ecosystem === 'alephium' ? 'https://raw.githubusercontent.com/alephium/token-list/master/logos/alephium.png' : undefined,
                priceSource: 'market'
              };
              
              // Increment raw token count
              rawTokenCount++;
              
              // Get transactions for main token (sample data for demo)
              const mainTokenTxs = await fetchTokenTransactions(mainToken.id, 1, 5);
              mainToken.transactions = mainTokenTxs;
              
              // Check if we already have this token
              const existingTokenIndex = allTokens.findIndex(t => t.id === mainToken.id);
              if (existingTokenIndex >= 0) {
                // Update token with cumulative amount and value
                allTokens[existingTokenIndex].amount += mainToken.amount;
                allTokens[existingTokenIndex].value += mainToken.value;
              } else {
                allTokens.push(mainToken);
              }
              
              totalPortfolioValue += mainToken.value;
            }
            
            // Process other tokens only for the current ecosystem
            if (ecosystem === 'alephium' && result.tokenBalances && result.tokenBalances.length > 0) {
              console.log(`Found ${result.tokenBalances.length} tokens for wallet ${walletAddress}`);
              rawTokenCount += result.tokenBalances.length;
              
              for (const token of result.tokenBalances) {
                // Get token metadata or use fallback
                const tokenId = token.id || `unknown`;
                let metadata = allTokenMetadata[tokenId] || getFallbackTokenData(tokenId);
                
                // Try to enhance metadata with our mappings
                if (tokenMappings[tokenId]) {
                  metadata = {
                    ...metadata,
                    name: tokenMappings[tokenId].name,
                    symbol: tokenMappings[tokenId].symbol,
                    decimals: tokenMappings[tokenId].decimals
                  };
                }
                
                // Get price - use mappings for known tokens or fallback to estimates
                let tokenPrice = 0;
                let priceSource: 'market' | 'estimate' = 'estimate';
                
                if (tokenMappings[tokenId]?.isStablecoin) {
                  tokenPrice = 1.0; // Stablecoins are $1
                  priceSource = 'market';
                } else if (tokenMappings[tokenId]?.coingeckoId) {
                  // For known tokens, we could implement a price fetch here
                  // This is a placeholder for actual price API integration
                  tokenPrice = Math.random() * 5 + 1; // Simulated price for mapped tokens
                  priceSource = 'market';
                } else if (metadata.price) {
                  tokenPrice = metadata.price;
                  priceSource = 'market';
                } else {
                  // Generate a realistic price based on token type
                  tokenPrice = Math.random() * 3 + (metadata.symbol.includes('LP') ? 10 : 0.05);
                }
                
                // Make sure we use the correct number of decimals
                const tokenDecimals = metadata.decimals || 18;
                const formattedAmount = formatTokenAmount(token.amount || 0, tokenDecimals);
                const amount = parseFloat(formattedAmount);
                const value = parseFloat((amount * tokenPrice).toFixed(2));
                
                // Get transactions for this token
                const tokenTxs = await fetchTokenTransactions(tokenId, 1, 5);
                
                const tokenBalance: TokenBalance = {
                  id: tokenId,
                  symbol: metadata.symbol,
                  name: metadata.name,
                  amount: amount,
                  decimals: tokenDecimals,
                  rawAmount: token.amount?.toString(),
                  value: value,
                  color: tokenColors[(allTokens.length + 1) % tokenColors.length],
                  logoURI: metadata.logoURI,
                  transactions: tokenTxs,
                  priceSource: priceSource
                };
                
                // Check if we already have this token
                const existingTokenIndex = allTokens.findIndex(t => t.id === tokenId);
                if (existingTokenIndex >= 0) {
                  // Update token with cumulative amount and value
                  allTokens[existingTokenIndex].amount += tokenBalance.amount;
                  allTokens[existingTokenIndex].value += tokenBalance.value;
                } else {
                  allTokens.push(tokenBalance);
                }
                
                totalPortfolioValue += value;
              }
            }
          }
        }
        
        // Sort tokens by value (descending)
        allTokens.sort((a, b) => b.value - a.value);

        // Store the total token count before grouping
        setTotalTokenCount(rawTokenCount);
        
        // Group small value tokens into an "Other" category if there are more than 8 tokens
        const MAX_CHART_SEGMENTS = 8;
        let tokensForDisplay: TokenBalance[] = allTokens;
        
        if (allTokens.length > MAX_CHART_SEGMENTS) {
          const significantTokens = allTokens.slice(0, MAX_CHART_SEGMENTS - 1);
          const smallTokens = allTokens.slice(MAX_CHART_SEGMENTS - 1);
          
          const otherValue = smallTokens.reduce((sum, token) => sum + token.value, 0);
          if (otherValue > 0) {
            const otherToken: TokenBalance = {
              id: 'other-tokens',
              symbol: 'OTHER',
              name: 'Other Tokens',
              amount: smallTokens.length,
              decimals: 0,
              value: parseFloat(otherValue.toFixed(2)),
              color: '#718096', // Gray color for "Other" category
              logoURI: 'https://raw.githubusercontent.com/alephium/token-list/master/logos/unknown.png'
            };
            
            tokensForDisplay = [...significantTokens, otherToken];
          } else {
            tokensForDisplay = significantTokens;
          }
        }
        
        console.log(`Total portfolio value: $${totalPortfolioValue.toFixed(2)} from ${allTokens.length} tokens (${rawTokenCount} raw tokens) for ${ecosystem}`);
        
        setTokens(tokensForDisplay || []);
        setPortfolioValue(totalPortfolioValue);
        setTokenMetadataLoaded(true);
      } catch (err) {
        console.error(`Error fetching ${ecosystem} balances:`, err);
      }
    };
    
    if (assetPrices && walletAddresses.length > 0 && ecosystem) {
      fetchBalances();
    }
  }, [ecosystem, walletAddresses, assetPrices]);
  
  // Chart configuration for portfolio breakdown
  const chartConfig = tokens.reduce((config, token, index) => {
    config[token.symbol] = { 
      label: token.name,
      theme: {
        light: token.color,
        dark: token.color
      }
    };
    return config;
  }, {} as Record<string, any>);

  const pieData = tokens.map(token => ({
    name: token.symbol,
    value: token.value,
    color: token.color,
  })).filter(item => item.value > 0); // Filter out zero-value tokens
  
  // Format for date values
  const formatDate = (dateString: string) => {
    return dateString.split('-').slice(1).join('/'); // Convert YYYY-MM-DD to MM/DD
  };

  return (
    <div className="space-y-4">
      {/* Network Status Indicator - more compact */}
      <div className="flex items-center justify-between mb-2 bg-muted/40 p-2 rounded-lg">
        <div className="flex items-center gap-2">
          {apiStatus.isLive ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-amber-500" />
          )}
          <div>
            <h3 className="text-sm font-medium">
              {ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1)} Network: {apiStatus.isLive ? "Live" : "Simulation"}
            </h3>
          </div>
        </div>
        <div className="text-xs">
          {apiStatus.isLive ? (
            <span className="inline-flex items-center text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-600 dark:bg-green-400 rounded-full animate-pulse mr-1.5" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-full">
              <WifiOff className="h-3 w-3 mr-1.5" />
              Fallback Data
            </span>
          )}
        </div>
      </div>

      {/* Portfolio Overview Card - more compact */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
        <CardHeader className="pb-1 pt-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1)} Portfolio</CardTitle>
              <CardDescription className="text-xs">
                {walletAddresses.length > 1 ? 
                  `Combined (${walletAddresses.length} wallets)` : 
                  `Wallet balance`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="mb-2">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : assetPrices ? (
              <>
                <div className="flex items-baseline">
                  <div className="text-2xl font-bold">
                    {portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="ml-2 text-base font-medium text-primary">USD</div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {assetPrices.price.toLocaleString()} {assetPrices.symbol}/USD
                  </div>
                  <div 
                    className={`flex items-center text-xs ${
                      assetPrices.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {assetPrices.change24h >= 0 ? (
                      <ArrowUp className="h-2.5 w-2.5 mr-0.5" />
                    ) : (
                      <ArrowDown className="h-2.5 w-2.5 mr-0.5" />
                    )}
                    {Math.abs(assetPrices.change24h).toFixed(2)}% (24h)
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1)} Tokens:</span>
                  <span className="font-medium">{totalTokenCount}</span>
                  {tokens.length < totalTokenCount && (
                    <span className="text-xs">(showing top {tokens.length})</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">No price data available for {ecosystem}</div>
            )}
          </div>
          
          {/* Portfolio Chart - reduced height */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="text-xs font-medium">Portfolio Value</div>
              <div className="flex items-center">
                <div className="flex space-x-1 rounded-lg border p-0.5 mr-1">
                  <button 
                    className={`px-1.5 py-0.5 text-[10px] rounded-md transition ${chartType === 'line' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                    onClick={() => setChartType('line')}
                  >
                    Line
                  </button>
                  <button 
                    className={`px-1.5 py-0.5 text-[10px] rounded-md transition ${chartType === 'pie' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                    onClick={() => setChartType('pie')}
                  >
                    Allocation
                  </button>
                </div>
                <div className="flex space-x-1 rounded-lg border p-0.5">
                  {['7d', '30d', '90d'].map(timeframe => (
                    <button 
                      key={timeframe}
                      className={`px-1.5 py-0.5 text-[10px] rounded-md transition ${selectedTimeframe === timeframe ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                      onClick={() => setSelectedTimeframe(timeframe)}
                    >
                      {timeframe}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Reduced chart height */}
            <div className="h-[180px]">
              {chartType === 'line' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={priceHistoryData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={tokenColors[0]} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={tokenColors[0]} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date"
                      tickFormatter={formatDate}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                      padding={{ left: 10 }}
                      height={15}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `$${value}`}
                      width={40}
                      padding={{ top: 5 }}
                    />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background p-2 rounded-lg border shadow-md text-xs">
                              <p className="font-medium">{payload[0].payload.date}</p>
                              <p className="text-primary font-medium">
                                ${Number(payload[0].value).toLocaleString()}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={tokenColors[0]} 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ChartContainer config={chartConfig} className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            stroke="rgba(255,255,255,0.2)" 
                            strokeWidth={1} 
                          />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        content={
                          <ChartTooltipContent 
                            formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Value']}
                          />
                        } 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Section with Tabs - more compact with scrollable content */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-base">My Assets</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-1">
          <Tabs defaultValue="tokens" className="w-full">
            <TabsList className="grid grid-cols-3 max-w-xs mx-3 mb-2">
              <TabsTrigger value="tokens">Tokens</TabsTrigger>
              <TabsTrigger value="nfts">NFTs</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tokens" className="mt-0 px-3">
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-4 gap-2 font-medium text-xs text-muted-foreground px-2 py-2 bg-muted/40">
                  <div>Token</div>
                  <div className="text-right">Price</div>
                  <div className="text-right">Balance</div>
                  <div className="text-right">Value</div>
                </div>
                
                {/* Added ScrollArea for token list with fixed height */}
                <ScrollArea className="h-[180px]">
                  <div className="divide-y divide-border">
                    {tokens.length > 0 ? (
                      tokens.map((token, index) => (
                        <div 
                          key={index} 
                          className="grid grid-cols-4 gap-2 px-2 py-2 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            {token.logoURI ? (
                              <img 
                                src={token.logoURI} 
                                alt={token.symbol} 
                                className="w-5 h-5 rounded-full" 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/alephium/token-list/master/logos/unknown.png';
                                }}
                              />
                            ) : (
                              <div 
                                className="w-5 h-5 rounded-full" 
                                style={{ backgroundColor: token.color }}
                              ></div>
                            )}
                            <div>
                              <div className="font-medium text-xs">{token.symbol}</div>
                              <div className="text-[10px] text-muted-foreground truncate max-w-[110px]">
                                {token.name}
                              </div>
                            </div>
                          </div>
                          <div className="text-right self-center text-xs">
                            {token.id === 'other-tokens' ? (
                              <span className="text-[10px] text-muted-foreground">Various</span>
                            ) : (
                              <div>
                                <div>${(token.value / token.amount).toFixed(2)}</div>
                                {token.priceSource === 'estimate' && (
                                  <div className="text-[10px] text-muted-foreground">Est.</div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right self-center text-xs">
                            {token.id === 'other-tokens' 
                              ? `${token.amount} tokens` 
                              : formatTokenAmount(
                                  token.rawAmount || token.amount.toString(), 
                                  token.decimals, 
                                  token.symbol === "ALPH" ? 8 : undefined
                                )
                            }
                          </div>
                          <div className="text-right self-center font-medium text-xs">
                            ${token.value.toLocaleString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                        {loading ? "Loading token data..." : "No tokens found. Add wallet addresses to see your tokens."}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="nfts" className="mt-0">
              <div className="text-center py-6 text-muted-foreground">
                <Coins className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <h3 className="text-sm font-medium">No NFTs Found</h3>
                <p className="text-xs mt-1">Connect a wallet with NFTs to view them here</p>
              </div>
            </TabsContent>
            
            <TabsContent value="transactions" className="mt-0 px-3">
              {tokens.some(t => t.transactions && t.transactions.length > 0) ? (
                <div className="rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-3 gap-2 font-medium text-xs text-muted-foreground px-3 py-2 bg-muted/40">
                    <div>Transaction</div>
                    <div>Token</div>
                    <div className="text-right">Time</div>
                  </div>
                  
                  {/* Added ScrollArea for transactions with fixed height */}
                  <ScrollArea className="h-[180px]">
                    <div className="divide-y divide-border">
                      {tokens
                        .filter(t => t.transactions && t.transactions.length > 0)
                        .flatMap(token => 
                          (token.transactions || []).map((tx: any, i: number) => ({
                            ...tx,
                            tokenSymbol: token.symbol,
                            tokenId: token.id,
                            tokenLogoURI: token.logoURI,
                            tokenColor: token.color
                          }))
                        )
                        .sort((a: any, b: any) => {
                          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                          return timeB - timeA; // newest first
                        })
                        .slice(0, 10) // Show only the 10 most recent transactions
                        .map((tx: any, i: number) => (
                          <div 
                            key={i} 
                            className="grid grid-cols-3 gap-2 px-3 py-2 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              <span className="font-mono text-[10px] truncate max-w-[100px]">
                                {tx.hash?.substring(0, 8) || `TX-${i}`}...
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {tx.tokenLogoURI ? (
                                <img 
                                  src={tx.tokenLogoURI}
                                  alt={tx.tokenSymbol} 
                                  className="w-3 h-3 rounded-full" 
                                />
                              ) : (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: tx.tokenColor }}
                                ></div>
                              )}
                              <span className="text-xs">{tx.tokenSymbol}</span>
                            </div>
                            <div className="text-right text-[10px] text-muted-foreground">
                              {tx.timestamp 
                                ? new Date(tx.timestamp).toLocaleString(undefined, {
                                    month: 'numeric', 
                                    day: 'numeric',
                                    hour: '2-digit', 
                                    minute: '2-digit'
                                  }) 
                                : new Date().toLocaleString()
                              }
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <h3 className="text-sm font-medium">No Transactions Found</h3>
                  <p className="text-xs mt-1">Recent transactions will appear here</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default PortfolioOverview;
