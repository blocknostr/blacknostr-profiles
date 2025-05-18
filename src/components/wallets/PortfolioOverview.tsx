
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, TrendingUp, Coins, Wallet } from 'lucide-react';
import { fetchCoinPrice, fetchTokenBalance } from '@/lib/coinGeckoAPI';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getTokenMetadata, getFallbackTokenData, formatTokenAmount } from '@/lib/tokenMetadata';

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
}

const defaultTokenColors = [
  "#8B5CF6", // Vivid Purple
  "#D946EF", // Magenta Pink
  "#F97316", // Bright Orange
  "#0EA5E9", // Ocean Blue
  "#10B981", // Emerald Green
  "#6366F1", // Indigo
  "#EC4899", // Pink
  "#F59E0B", // Amber
];

const PortfolioOverview = ({ ecosystem }: PortfolioOverviewProps) => {
  const [assetPrices, setAssetPrices] = useState<AssetPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [tokenMetadataLoaded, setTokenMetadataLoaded] = useState(false);

  // CoinGecko IDs for each ecosystem
  const coinIds: Record<string, string> = {
    bitcoin: 'bitcoin',
    ethereum: 'ethereum',
    alephium: 'alephium',
  };

  // Demo wallet addresses for testing - in a real app these would come from the user
  useEffect(() => {
    const demoAddresses: Record<string, string> = {
      bitcoin: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      ethereum: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      alephium: 'raLUPHsewjm1iA2kBzRKXB2ntbj3j4puxbVvsZD8iK3r',
    };
    
    setWalletAddress(demoAddresses[ecosystem] || null);
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
        } else {
          throw new Error('Failed to fetch price data');
        }
      } catch (err) {
        console.error('Error fetching price data:', err);
        setError('Failed to load price data. Please try again later.');
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
      if (!walletAddress) return;
      
      try {
        const result = await fetchTokenBalance(ecosystem, walletAddress);
        
        if (result && !result.error) {
          // For Alephium, enhance with token metadata
          if (ecosystem === 'alephium') {
            await processAlephiumTokens(result);
          } else {
            // Process main token for other ecosystems
            const mainToken: TokenBalance = {
              id: coinIds[ecosystem] || ecosystem,
              symbol: assetPrices?.symbol || ecosystem.toUpperCase(),
              name: assetPrices?.name || ecosystem,
              amount: parseFloat((result.balance / 1e18).toFixed(4)), // Assuming 18 decimals
              value: parseFloat((result.balance / 1e18 * (assetPrices?.price || 0)).toFixed(2)),
              color: defaultTokenColors[0]
            };
            
            // Process other tokens
            const otherTokens: TokenBalance[] = [];
            
            if (result.tokenBalances && result.tokenBalances.length > 0) {
              result.tokenBalances.forEach((token: any, index: number) => {
                // In a real app, you would fetch prices for each token
                // For demo purposes, we're using mock prices
                const mockPrice = Math.random() * 10; // Random price between 0 and 10
                const amount = parseFloat((token.amount / 1e8).toFixed(4)); // Adjust decimals as needed
                
                otherTokens.push({
                  id: `token-${index}`,
                  symbol: `TOKEN${index + 1}`,
                  name: `Token ${index + 1}`,
                  amount: amount,
                  value: parseFloat((amount * mockPrice).toFixed(2)),
                  color: defaultTokenColors[(index + 1) % defaultTokenColors.length]
                });
              });
            }
            
            const allTokens = [mainToken, ...otherTokens];
            setTokens(allTokens);
            
            // Calculate total portfolio value
            const totalValue = allTokens.reduce((sum, token) => sum + token.value, 0);
            setPortfolioValue(totalValue);
          }
        }
      } catch (err) {
        console.error(`Error fetching ${ecosystem} balances:`, err);
      }
    };
    
    if (assetPrices && walletAddress) {
      fetchBalances();
    }
  }, [ecosystem, walletAddress, assetPrices]);
  
  // Process Alephium tokens with metadata
  const processAlephiumTokens = async (result: any) => {
    try {
      // Process main ALPH token
      const mainToken: TokenBalance = {
        id: 'ALPH',
        symbol: 'ALPH',
        name: 'Alephium',
        amount: parseFloat(formatTokenAmount(result.balance || 0, 18)),
        value: parseFloat((parseFloat(formatTokenAmount(result.balance || 0, 18)) * (assetPrices?.price || 0)).toFixed(2)),
        color: defaultTokenColors[0],
        logoURI: 'https://raw.githubusercontent.com/alephium/token-list/master/logos/alephium.png'
      };
      
      // Process other tokens with metadata
      const otherTokens: TokenBalance[] = [];
      
      if (result.tokenBalances && result.tokenBalances.length > 0) {
        const processPromises = result.tokenBalances.map(async (token: any, index: number) => {
          // Get token metadata or use fallback
          const tokenId = token.id || `unknown-${index}`;
          const metadata = await getTokenMetadata(tokenId) || getFallbackTokenData(tokenId);
          
          // Use mock price for demo purposes
          const mockPrice = Math.random() * 10; // Random price between 0 and 10
          const amount = parseFloat(formatTokenAmount(token.amount || 0, metadata.decimals));
          
          return {
            id: tokenId,
            symbol: metadata.symbol,
            name: metadata.name,
            amount: amount,
            value: parseFloat((amount * mockPrice).toFixed(2)),
            color: defaultTokenColors[(index + 1) % defaultTokenColors.length],
            logoURI: metadata.logoURI
          };
        });
        
        const resolvedTokens = await Promise.all(processPromises);
        otherTokens.push(...resolvedTokens);
      }
      
      const allTokens = [mainToken, ...otherTokens];
      setTokens(allTokens);
      
      // Calculate total portfolio value
      const totalValue = allTokens.reduce((sum, token) => sum + token.value, 0);
      setPortfolioValue(totalValue);
      setTokenMetadataLoaded(true);
    } catch (error) {
      console.error("Error processing Alephium tokens:", error);
    }
  };

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
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Price Card */}
        <Card className="dark:bg-nostr-dark dark:border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Current Price</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse h-12 bg-muted rounded-md dark:bg-black/50"></div>
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : assetPrices ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold">${assetPrices.price.toLocaleString()}</div>
                <div className={`flex items-center ${assetPrices.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {assetPrices.change24h >= 0 ? (
                    <ArrowUp className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 mr-1" />
                  )}
                  <span>{Math.abs(assetPrices.change24h).toFixed(2)}% (24h)</span>
                </div>
                <div className="text-muted-foreground text-sm">
                  {assetPrices.name} ({assetPrices.symbol})
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No price data available</div>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Value Card */}
        <Card className="dark:bg-nostr-dark dark:border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolioValue > 0 ? (
              <div>
                <div className="text-2xl font-bold">${portfolioValue.toLocaleString()}</div>
                <div className="text-muted-foreground text-sm flex items-center">
                  <Wallet className="h-4 w-4 mr-1" />
                  {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : 'Connect wallet'}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-bold">$0.00</div>
                <div className="text-muted-foreground text-sm">
                  Connect wallets to track your portfolio value
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Market Data */}
      <Card className="dark:bg-nostr-dark dark:border-white/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-nostr-blue" />
              Market Data
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="animate-pulse h-6 bg-muted rounded-md w-1/2 dark:bg-black/50"></div>
              <div className="animate-pulse h-6 bg-muted rounded-md w-1/3 dark:bg-black/50"></div>
            </div>
          ) : error ? (
            <div className="text-destructive">{error}</div>
          ) : assetPrices ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Market Cap</div>
                <div className="font-medium">Data not available</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Volume (24h)</div>
                <div className="font-medium">Data not available</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Circulating Supply</div>
                <div className="font-medium">Data not available</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Supply</div>
                <div className="font-medium">Data not available</div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">No market data available</div>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Breakdown */}
      <Card className="dark:bg-nostr-dark dark:border-white/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            <div className="flex items-center">
              <Coins className="h-5 w-5 mr-2 text-nostr-blue" />
              Portfolio Breakdown
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tokens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pie Chart */}
              <div className="md:col-span-1">
                <ChartContainer config={chartConfig} className="h-56">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </div>

              {/* Token List */}
              <div className="md:col-span-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 font-medium text-sm text-muted-foreground">
                    <div>Token</div>
                    <div className="text-right">Amount</div>
                    <div className="text-right">Value</div>
                  </div>
                  <div className="space-y-2">
                    {tokens.map((token, index) => (
                      <div key={index} className="grid grid-cols-3 gap-2 py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
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
                            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: token.color }}></div>
                          )}
                          <div>
                            <span className="font-medium">{token.symbol}</span>
                            <div className="text-xs text-muted-foreground">{token.name}</div>
                          </div>
                        </div>
                        <div className="text-right">{token.amount.toLocaleString()}</div>
                        <div className="text-right font-medium">${token.value.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              {loading ? "Loading token data..." : "Add wallet addresses to see your portfolio breakdown"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PortfolioOverview;
