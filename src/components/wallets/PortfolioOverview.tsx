import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUp, ArrowDown, TrendingUp, Coins, Wallet, DollarSign, Wifi, WifiOff } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fetchCoinPrice, fetchTokenBalance } from '@/lib/coinGeckoAPI';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  getTokenMetadata, 
  getFallbackTokenData, 
  formatTokenAmount, 
  fetchTokenList,
  fetchTokenTransactions,
  TokenMetadata
} from '@/lib/tokenMetadata';

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

  // Load wallet addresses from localStorage
  useEffect(() => {
    const loadAddressesFromStorage = () => {
      const savedWallets = localStorage.getItem(`${ecosystem}_wallets`);
      if (savedWallets) {
        try {
          const parsedWallets = JSON.parse(savedWallets);
          if (parsedWallets && parsedWallets.length > 0) {
            // Use all wallet addresses
            setWalletAddresses(parsedWallets.map((wallet: any) => wallet.address));
            return;
          }
        } catch (err) {
          console.error("Error parsing wallet addresses:", err);
        }
      }
      
      // If no wallets found, use demo addresses
      const demoAddresses: Record<string, string[]> = {
        bitcoin: ['bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'],
        ethereum: ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
        alephium: ['raLUPHsewjm1iA2kBzRKXB2ntbj3j4puxbVvsZD8iK3r'],
      };
      
      setWalletAddresses(demoAddresses[ecosystem] || []);
    };
    
    loadAddressesFromStorage();
  }, [ecosystem]);

  // Load asset prices from CoinGecko
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
        console.error('Error fetching price data:', err);
        setError('Failed to load price data. Please try again later.');
        setApiStatus({isLive: false, lastChecked: new Date()});
      } finally {
        setLoading(false);
      }
    };

    loadAssetPrice();
    
    // Refresh prices every 60 seconds
    const interval = setInterval(loadAssetPrice, 60000);
    
    return () => clearInterval(interval);
  }, [ecosystem]);

  // Fetch token balances when wallet address changes
  useEffect(() => {
    const fetchBalances = async () => {
      if (walletAddresses.length === 0) return;
      
      try {
        // Pre-fetch all token metadata for better performance
        const allTokenMetadata = await fetchTokenList();
        
        let allTokens: TokenBalance[] = [];
        let totalPortfolioValue = 0;
        
        for (const walletAddress of walletAddresses) {
          const result = await fetchTokenBalance(ecosystem, walletAddress);
          
          if (result && !result.error) {
            // Process main token
            if (result.balance) {
              const mainToken: TokenBalance = {
                id: coinIds[ecosystem] || ecosystem,
                symbol: assetPrices?.symbol || ecosystem.toUpperCase(),
                name: assetPrices?.name || ecosystem,
                amount: parseFloat(formatTokenAmount(result.balance || 0, 18)),
                value: parseFloat((parseFloat(formatTokenAmount(result.balance || 0, 18)) * (assetPrices?.price || 0)).toFixed(2)),
                color: tokenColors[0],
                logoURI: ecosystem === 'alephium' ? 'https://raw.githubusercontent.com/alephium/token-list/master/logos/alephium.png' : undefined,
                priceSource: 'market'
              };
              
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
            
            // Process other tokens
            if (ecosystem === 'alephium' && result.tokenBalances && result.tokenBalances.length > 0) {
              for (const token of result.tokenBalances) {
                // Get token metadata or use fallback
                const tokenId = token.id || `unknown`;
                const metadata = allTokenMetadata[tokenId] || getFallbackTokenData(tokenId);
                
                // Get price - a real implementation would use actual price API data
                let tokenPrice = 0;
                let priceSource: 'market' | 'estimate' = 'estimate';
                
                if (metadata.isStablecoin) {
                  tokenPrice = 1.0; // Stablecoins are $1
                  priceSource = 'market';
                } else if (metadata.price) {
                  tokenPrice = metadata.price;
                  priceSource = 'market';
                } else {
                  // Generate a realistic price based on token type
                  tokenPrice = Math.random() * 3 + (metadata.symbol.includes('LP') ? 10 : 0.05);
                }
                
                const amount = parseFloat(formatTokenAmount(token.amount || 0, metadata.decimals));
                const value = parseFloat((amount * tokenPrice).toFixed(2));
                
                // Get transactions for this token
                const tokenTxs = await fetchTokenTransactions(tokenId, 1, 5);
                
                const tokenBalance: TokenBalance = {
                  id: tokenId,
                  symbol: metadata.symbol,
                  name: metadata.name,
                  amount: amount,
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
              value: parseFloat(otherValue.toFixed(2)),
              color: '#718096', // Gray color for "Other" category
              logoURI: 'https://raw.githubusercontent.com/alephium/token-list/master/logos/unknown.png'
            };
            
            tokensForDisplay = [...significantTokens, otherToken];
          } else {
            tokensForDisplay = significantTokens;
          }
        }
        
        setTokens(tokensForDisplay);
        setPortfolioValue(totalPortfolioValue);
        setTokenMetadataLoaded(true);
      } catch (err) {
        console.error(`Error fetching ${ecosystem} balances:`, err);
      }
    };
    
    if (assetPrices && walletAddresses.length > 0) {
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
    <div className="space-y-6">
      {/* Network Status Indicator */}
      <div className="flex items-center justify-between mb-4 bg-muted/40 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          {apiStatus.isLive ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-amber-500" />
          )}
          <div>
            <h3 className="text-sm font-medium">
              Network Data: {apiStatus.isLive ? "Live" : "Simulation"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Last updated: {apiStatus.lastChecked.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="text-xs">
          {apiStatus.isLive ? (
            <span className="inline-flex items-center text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-600 dark:bg-green-400 rounded-full animate-pulse mr-1.5" />
              Connected to {ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1)} Explorer
            </span>
          ) : (
            <span className="inline-flex items-center text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-full">
              <WifiOff className="h-3 w-3 mr-1.5" />
              Using fallback data
            </span>
          )}
        </div>
      </div>

      {/* Portfolio Overview Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Portfolio Overview</CardTitle>
              <CardDescription>
                {walletAddresses.length > 1 ? `Combined balance of ${walletAddresses.length} wallets` : 'Wallet balance'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : assetPrices ? (
              <>
                <div className="flex items-baseline">
                  <div className="text-3xl font-bold">
                    {portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="ml-2 text-lg font-medium text-primary">USD</div>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <div className="text-sm font-medium flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    {assetPrices.price.toLocaleString()} {assetPrices.symbol}/USD
                  </div>
                  <div 
                    className={`flex items-center text-xs ${
                      assetPrices.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {assetPrices.change24h >= 0 ? (
                      <ArrowUp className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDown className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(assetPrices.change24h).toFixed(2)}% (24h)
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <span>Tokens:</span>
                  <span className="font-medium">{tokens.length}</span>
                  {tokens.some(t => t.id === 'other-tokens') && (
                    <span className="text-xs">(+{tokens.find(t => t.id === 'other-tokens')?.amount || 0} more)</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">No price data available</div>
            )}
          </div>
          
          {/* Portfolio Chart */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium">Portfolio Value</div>
              <div className="flex items-center">
                <div className="flex space-x-1 rounded-lg border p-1 mr-2">
                  <button 
                    className={`px-2 py-0.5 text-xs rounded-md transition ${chartType === 'line' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                    onClick={() => setChartType('line')}
                  >
                    Line
                  </button>
                  <button 
                    className={`px-2 py-0.5 text-xs rounded-md transition ${chartType === 'pie' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                    onClick={() => setChartType('pie')}
                  >
                    Allocation
                  </button>
                </div>
                <div className="flex space-x-1 rounded-lg border p-1">
                  {['7d', '30d', '90d'].map(timeframe => (
                    <button 
                      key={timeframe}
                      className={`px-2 py-0.5 text-xs rounded-md transition ${selectedTimeframe === timeframe ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                      onClick={() => setSelectedTimeframe(timeframe)}
                    >
                      {timeframe}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="h-[250px]">
              {chartType === 'line' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={priceHistoryData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                      tick={{ fontSize: 12 }}
                      padding={{ left: 10 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${value}`}
                      padding={{ top: 20 }}
                      width={60}
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
                <ChartContainer config={chartConfig} className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
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

      {/* Assets Section with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>My Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tokens" className="w-full">
            <TabsList className="grid grid-cols-3 max-w-xs mb-4">
              <TabsTrigger value="tokens">Tokens</TabsTrigger>
              <TabsTrigger value="nfts">NFTs</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tokens" className="mt-0">
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-4 gap-2 font-medium text-sm text-muted-foreground px-4 py-3 bg-muted/40">
                  <div>Token</div>
                  <div className="text-right">Price</div>
                  <div className="text-right">Balance</div>
                  <div className="text-right">Value</div>
                </div>
                <div className="divide-y divide-border">
                  {tokens.length > 0 ? (
                    tokens.map((token, index) => (
                      <div 
                        key={index} 
                        className="grid grid-cols-4 gap-2 px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {token.logoURI ? (
                            <img 
                              src={token.logoURI} 
                              alt={token.symbol} 
                              className="w-6 h-6 rounded-full" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/alephium/token-list/master/logos/unknown.png';
                              }}
                            />
                          ) : (
                            <div 
                              className="w-6 h-6 rounded-full" 
                              style={{ backgroundColor: token.color }}
                            ></div>
                          )}
                          <div>
                            <div className="font-medium">{token.symbol}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {token.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right self-center">
                          {token.id === 'other-tokens' ? (
                            <span className="text-xs text-muted-foreground">Various</span>
                          ) : (
                            <div>
                              <div>${(token.value / token.amount).toFixed(2)}</div>
                              {token.priceSource === 'estimate' && (
                                <div className="text-xs text-muted-foreground">Est.</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right self-center">
                          {token.id === 'other-tokens' 
                            ? `${token.amount} tokens` 
                            : token.amount.toLocaleString(undefined, {
                                maximumFractionDigits: 6
                              })
                          }
                        </div>
                        <div className="text-right self-center font-medium">
                          ${token.value.toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-muted-foreground">
                      {loading ? "Loading token data..." : "No tokens found. Add wallet addresses to see your tokens."}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="nfts" className="mt-0">
              <div className="text-center py-10 text-muted-foreground">
                <Coins className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium">No NFTs Found</h3>
                <p className="mt-2">Connect a wallet with NFTs to view them here</p>
              </div>
            </TabsContent>
            
            <TabsContent value="transactions" className="mt-0">
              {tokens.some(t => t.transactions && t.transactions.length > 0) ? (
                <div className="rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-3 gap-2 font-medium text-sm text-muted-foreground px-4 py-3 bg-muted/40">
                    <div>Transaction</div>
                    <div>Token</div>
                    <div className="text-right">Time</div>
                  </div>
                  <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
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
                          className="grid grid-cols-3 gap-2 px-4 py-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary"></div>
                            <span className="font-mono text-xs truncate max-w-[120px]">
                              {tx.hash?.substring(0, 8) || `TX-${i}`}...
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {tx.tokenLogoURI ? (
                              <img 
                                src={tx.tokenLogoURI}
                                alt={tx.tokenSymbol} 
                                className="w-4 h-4 rounded-full" 
                              />
                            ) : (
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: tx.tokenColor }}
                              ></div>
                            )}
                            <span>{tx.tokenSymbol}</span>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            {tx.timestamp 
                              ? new Date(tx.timestamp).toLocaleString() 
                              : new Date().toLocaleString()
                            }
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium">No Transactions Found</h3>
                  <p className="mt-2">Recent transactions will appear here</p>
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
