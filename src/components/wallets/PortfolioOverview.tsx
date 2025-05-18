
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';
import { fetchCoinPrice } from '@/lib/coinGeckoAPI';

interface PortfolioOverviewProps {
  ecosystem: string;
}

interface AssetPrice {
  price: number;
  change24h: number;
  symbol: string;
  name: string;
}

const PortfolioOverview = ({ ecosystem }: PortfolioOverviewProps) => {
  const [assetPrices, setAssetPrices] = useState<AssetPrice | null>(null);
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Price Card */}
        <Card className="dark:bg-black dark:border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Current Price</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse h-12 bg-muted rounded-md dark:bg-white/10"></div>
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
        <Card className="dark:bg-black dark:border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <div className="text-muted-foreground text-sm">
              Connect wallets to track your portfolio value
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Data */}
      <Card className="dark:bg-black dark:border-white/20">
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
              <div className="animate-pulse h-6 bg-muted rounded-md w-1/2 dark:bg-white/10"></div>
              <div className="animate-pulse h-6 bg-muted rounded-md w-1/3 dark:bg-white/10"></div>
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
      <Card className="dark:bg-black dark:border-white/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Portfolio Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            Add wallet addresses to see your portfolio breakdown
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioOverview;
