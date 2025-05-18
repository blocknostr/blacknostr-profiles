
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, TrendingUp, Loader2 } from 'lucide-react';
import { fetchCoinPrice, fetchTokenBalance } from '@/lib/coinGeckoAPI';
import { toast } from '@/components/ui/use-toast';
import { web3 } from '@alephium/web3';

interface PortfolioOverviewProps {
  ecosystem: string;
}

interface AssetPrice {
  price: number;
  change24h: number;
  symbol: string;
  name: string;
}

interface WalletBalance {
  address: string;
  balance: string;
  usdValue: number;
}

const PortfolioOverview = ({ ecosystem }: PortfolioOverviewProps) => {
  const [assetPrices, setAssetPrices] = useState<AssetPrice | null>(null);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CoinGecko IDs for each ecosystem
  const coinIds: Record<string, string> = {
    bitcoin: 'bitcoin',
    ethereum: 'ethereum',
    alephium: 'alephium',
  };

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
          
          // Now that we have price data, fetch wallet balances
          await loadWalletBalances(priceData.current_price);
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

  const loadWalletBalances = async (currentPrice: number) => {
    try {
      // Get wallet addresses from local storage
      const savedWallets = localStorage.getItem(`${ecosystem}_wallets`);
      if (!savedWallets) {
        return;
      }
      
      const wallets = JSON.parse(savedWallets);
      if (wallets.length === 0) {
        return;
      }
      
      const balances: WalletBalance[] = [];
      let portfolioTotal = 0;
      
      for (const wallet of wallets) {
        try {
          // Special handling for Alephium
          if (ecosystem === 'alephium' && web3.getCurrentNodeProvider()) {
            const nodeProvider = web3.getCurrentNodeProvider();
            if (nodeProvider) {
              const balance = await nodeProvider.addresses.getAddressesAddressBalance(wallet.address);
              // Convert from wei (10^18) to ALPH
              const balanceInAlph = Number(balance.balance) / Math.pow(10, 18);
              const usdValue = balanceInAlph * currentPrice;
              
              balances.push({
                address: wallet.address,
                balance: balanceInAlph.toFixed(4),
                usdValue: usdValue
              });
              
              portfolioTotal += usdValue;
            }
          } else {
            // Generic handling for other blockchains
            const tokenBalance = await fetchTokenBalance(ecosystem, wallet.address);
            const balance = 0; // Replace with actual balance calculation
            const usdValue = balance * currentPrice;
            
            balances.push({
              address: wallet.address,
              balance: balance.toString(),
              usdValue: usdValue
            });
            
            portfolioTotal += usdValue;
          }
        } catch (error) {
          console.error(`Error fetching balance for ${wallet.address}:`, error);
        }
      }
      
      setWalletBalances(balances);
      setTotalPortfolioValue(portfolioTotal);
    } catch (error) {
      console.error('Error loading wallet balances:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Price Card */}
        <Card className="dark:bg-[#1E2023] dark:border-[#A0A0A0]/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Current Price</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 text-[#00A3FF] animate-spin" />
                <span className="text-[#A0A0A0]">Loading price data...</span>
              </div>
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
                <div className="text-[#A0A0A0] text-sm">
                  {assetPrices.name} ({assetPrices.symbol})
                </div>
              </div>
            ) : (
              <div className="text-[#A0A0A0]">No price data available</div>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Value Card */}
        <Card className="dark:bg-[#1E2023] dark:border-[#A0A0A0]/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 text-[#00A3FF] animate-spin" />
                <span className="text-[#A0A0A0]">Loading portfolio data...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">${totalPortfolioValue.toFixed(2)}</div>
                <div className="text-[#A0A0A0] text-sm">
                  {walletBalances.length > 0 
                    ? `${walletBalances.length} wallet${walletBalances.length > 1 ? 's' : ''} tracked`
                    : 'Connect wallets to track your portfolio value'}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Market Data */}
      <Card className="dark:bg-[#1E2023] dark:border-[#A0A0A0]/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-[#00A3FF]" />
              Market Data
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 text-[#00A3FF] animate-spin" />
                <span className="text-[#A0A0A0]">Loading market data...</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-destructive">{error}</div>
          ) : assetPrices ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-[#A0A0A0]">Market Cap</div>
                <div className="font-medium">Data not available</div>
              </div>
              <div>
                <div className="text-sm text-[#A0A0A0]">Volume (24h)</div>
                <div className="font-medium">Data not available</div>
              </div>
              <div>
                <div className="text-sm text-[#A0A0A0]">Circulating Supply</div>
                <div className="font-medium">Data not available</div>
              </div>
              <div>
                <div className="text-sm text-[#A0A0A0]">Total Supply</div>
                <div className="font-medium">Data not available</div>
              </div>
            </div>
          ) : (
            <div className="text-[#A0A0A0]">No market data available</div>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Breakdown */}
      <Card className="dark:bg-[#1E2023] dark:border-[#A0A0A0]/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Portfolio Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {walletBalances.length > 0 ? (
            <div className="space-y-4">
              {walletBalances.map((wallet, index) => (
                <div key={index} className="flex justify-between items-center p-3 rounded-md bg-[#141518] border border-[#A0A0A0]/10">
                  <div className="flex flex-col">
                    <span className="text-sm truncate max-w-[200px]">{wallet.address}</span>
                    <span className="text-xs text-[#A0A0A0]">{assetPrices?.symbol}: {wallet.balance}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">${wallet.usdValue.toFixed(2)}</span>
                    <div className="text-xs text-[#A0A0A0]">
                      {((wallet.usdValue / totalPortfolioValue) * 100).toFixed(1)}% of portfolio
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-[#A0A0A0]">
              Add wallet addresses to see your portfolio breakdown
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PortfolioOverview;
