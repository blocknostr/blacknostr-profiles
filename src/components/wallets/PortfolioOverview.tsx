
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, TrendingUp, Coins, Wallet } from 'lucide-react';
import { fetchCoinPrice, fetchTokenBalance } from '@/lib/coinGeckoAPI';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
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
}

// Enhanced token colors with more vibrant options
const defaultTokenColors = [
  "#8B5CF6", // Vivid Purple
  "#10B981", // Emerald Green
  "#F97316", // Bright Orange
  "#0EA5E9", // Ocean Blue
  "#EC4899", // Pink
  "#D946EF", // Magenta Pink
  "#6366F1", // Indigo
  "#F59E0B", // Amber
  "#14B8A6", // Teal
  "#EF4444", // Red
  "#3B82F6", // Blue
  "#FB7185", // Rose
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

  // Load wallet addresses from localStorage
  useEffect(() => {
    const loadAddressesFromStorage = () => {
      const savedWallets = localStorage.getItem(`${ecosystem}_wallets`);
      if (savedWallets) {
        try {
          const parsedWallets = JSON.parse(savedWallets);
          if (parsedWallets && parsedWallets.length > 0) {
            // Use the first wallet address for this demo
            setWalletAddress(parsedWallets[0].address);
            return;
          }
        } catch (err) {
          console.error("Error parsing wallet addresses:", err);
        }
      }
      
      // If no wallets found, use demo addresses
      const demoAddresses: Record<string, string> = {
        bitcoin: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        ethereum: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        alephium: 'raLUPHsewjm1iA2kBzRKXB2ntbj3j4puxbVvsZD8iK3r',
      };
      
      setWalletAddress(demoAddresses[ecosystem] || null);
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
      // Pre-fetch all token metadata for better performance
      const allTokenMetadata = await fetchTokenList();
      
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
      
      // Get transactions for ALPH (sample data for demo)
      const alphTxs = await fetchTokenTransactions('ALPH', 1, 5);
      mainToken.transactions = alphTxs;
      
      // Process other tokens with metadata
      const otherTokens: TokenBalance[] = [];
      
      if (result.tokenBalances && result.tokenBalances.length > 0) {
        const processPromises = result.tokenBalances.map(async (token: any, index: number) => {
          // Get token metadata or use fallback
          const tokenId = token.id || `unknown-${index}`;
          const metadata = allTokenMetadata[tokenId] || getFallbackTokenData(tokenId);
          
          // Get price either from CoinGecko mapping or use a realistic mock price
          let tokenPrice = 0;
          if (metadata.price) {
            tokenPrice = metadata.price;
          } else if (metadata.isStablecoin) {
            tokenPrice = 1.0; // Stablecoins are $1
          } else {
            // Generate a more realistic price based on token type
            tokenPrice = Math.random() * 5 + (metadata.symbol.includes('LP') ? 10 : 0.5);
          }
          
          const amount = parseFloat(formatTokenAmount(token.amount || 0, metadata.decimals));
          
          // Get transactions for this token
          const tokenTxs = await fetchTokenTransactions(tokenId, 1, 5);
          
          return {
            id: tokenId,
            symbol: metadata.symbol,
            name: metadata.name,
            amount: amount,
            value: parseFloat((amount * tokenPrice).toFixed(2)),
            color: defaultTokenColors[(index + 1) % defaultTokenColors.length],
            logoURI: metadata.logoURI,
            transactions: tokenTxs
          };
        });
        
        const resolvedTokens = await Promise.all(processPromises);
        
        // Filter out tokens with zero value to clean up the chart
        otherTokens.push(...resolvedTokens.filter(token => token.value > 0));
      }
      
      // Sort tokens by value (descending)
      const allTokens = [mainToken, ...otherTokens].sort((a, b) => b.value - a.value);
      
      // Ensure we don't have too many small value tokens in the chart
      // Group small value tokens into an "Other" category if there are more than 7 tokens
      const MAX_CHART_SEGMENTS = 7;
      let tokensForDisplay: TokenBalance[];
      
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
      } else {
        tokensForDisplay = allTokens;
      }
      
      setTokens(tokensForDisplay);
      
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
  })).filter(item => item.value > 0); // Filter out zero-value tokens

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
                {pieData.length > 0 ? (
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
                ) : (
                  <div className="h-56 flex items-center justify-center text-muted-foreground">
                    No portfolio data available
                  </div>
                )}
              </div>

              {/* Token List */}
              <div className="md:col-span-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 font-medium text-sm text-muted-foreground">
                    <div>Token</div>
                    <div className="text-right">Amount</div>
                    <div className="text-right">Value</div>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {tokens.map((token, index) => (
                      <div 
                        key={index} 
                        className="grid grid-cols-3 gap-2 py-2 border-b border-border last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-sm"
                      >
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
                            <div 
                              className="w-5 h-5 rounded-full" 
                              style={{ backgroundColor: token.color }}
                            ></div>
                          )}
                          <div>
                            <span className="font-medium">{token.symbol}</span>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {token.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {token.id === 'other-tokens' 
                            ? `${token.amount} tokens` 
                            : token.amount.toLocaleString()
                          }
                        </div>
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

      {/* Recent Transactions */}
      {ecosystem === 'alephium' && tokens.some(t => t.transactions && t.transactions.length > 0) && (
        <Card className="dark:bg-nostr-dark dark:border-white/20">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tokens
                .filter(t => t.transactions && t.transactions.length > 0)
                .slice(0, 1) // Just show transactions for the first token with transactions
                .map(token => (
                  <div key={token.id} className="space-y-2">
                    <h4 className="text-sm font-medium">{token.name} ({token.symbol})</h4>
                    {token.transactions?.slice(0, 5).map((tx: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-2 border-b border-border last:border-0 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-nostr-blue"></div>
                          <span className="font-mono text-xs truncate max-w-[120px] md:max-w-[200px]">
                            {tx.hash || `TX-${i}`}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            {tx.timestamp 
                              ? new Date(tx.timestamp).toLocaleString() 
                              : new Date().toLocaleString()
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PortfolioOverview;
