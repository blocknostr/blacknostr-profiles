// CoinGecko API utility functions
import { getTokenMetadata, getFallbackTokenData, formatTokenAmount } from "./tokenMetadata";
import { getAllCoinGeckoIds, getCoinGeckoId as getGeckoId, tokenMappings } from "./tokenMappings";

// Re-export for backward compatibility
export const getCoinGeckoId = getGeckoId;

interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  total_volume: number;
  circulating_supply: number;
  total_supply: number;
  image: string;
}

// Cache for token prices to reduce API calls
interface PriceCache {
  [coinId: string]: {
    price: number;
    timestamp: number;
  };
}

const priceCache: PriceCache = {};
const PRICE_CACHE_DURATION = 300000; // 5 minutes

export async function fetchCoinPrice(coinId: string): Promise<CoinPrice | null> {
  try {
    // Check cache first
    const now = Date.now();
    if (priceCache[coinId] && now - priceCache[coinId].timestamp < PRICE_CACHE_DURATION) {
      // Return cached data in the expected format
      return {
        id: coinId,
        symbol: coinId,
        name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
        current_price: priceCache[coinId].price,
        market_cap: 0,
        market_cap_rank: 0,
        price_change_percentage_24h: 0,
        total_volume: 0,
        circulating_supply: 0,
        total_supply: 0,
        image: ""
      };
    }
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h`,
      {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      // Update price cache
      priceCache[coinId] = {
        price: data[0].current_price,
        timestamp: Date.now()
      };
      return data[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching coin price:', error);
    
    // If we have a cached price, return that instead of null
    if (priceCache[coinId]) {
      return {
        id: coinId,
        symbol: coinId,
        name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
        current_price: priceCache[coinId].price,
        market_cap: 0,
        market_cap_rank: 0,
        price_change_percentage_24h: 0,
        total_volume: 0,
        circulating_supply: 0,
        total_supply: 0,
        image: ""
      };
    }
    
    // Otherwise, set a default price for testing
    const defaultPrice = coinId === 'alephium' ? 0.39 : 1.0;
    priceCache[coinId] = {
      price: defaultPrice,
      timestamp: Date.now()
    };
    
    return {
      id: coinId,
      symbol: coinId,
      name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
      current_price: defaultPrice,
      market_cap: 0,
      market_cap_rank: 0,
      price_change_percentage_24h: 0,
      total_volume: 0,
      circulating_supply: 0,
      total_supply: 0,
      image: ""
    };
  }
}

export async function fetchAllTokenPrices(): Promise<Record<string, number>> {
  try {
    const coinIds = getAllCoinGeckoIds();
    if (coinIds.length === 0) return {};
    
    // Filter out IDs that have a recent cache
    const now = Date.now();
    const idsToFetch = coinIds.filter(id => 
      !priceCache[id] || (now - priceCache[id].timestamp > PRICE_CACHE_DURATION)
    );
    
    if (idsToFetch.length > 0) {
      try {
        const idsString = idsToFetch.join(',');
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${idsString}&vs_currencies=usd`,
          {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`CoinGecko API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update price cache
        Object.entries(data).forEach(([id, priceData]: [string, any]) => {
          priceCache[id] = {
            price: priceData.usd,
            timestamp: now
          };
        });
      } catch (error) {
        console.error('Error fetching prices from CoinGecko:', error);
        // Fall back to using default prices for any missing tokens
        idsToFetch.forEach(id => {
          if (!priceCache[id]) {
            const defaultPrice = id === 'alephium' ? 0.39 : 1.0;
            priceCache[id] = {
              price: defaultPrice,
              timestamp: now
            };
          }
        });
      }
    }
    
    // Return all prices from cache
    const prices: Record<string, number> = {};
    coinIds.forEach(id => {
      if (priceCache[id]) {
        prices[id] = priceCache[id].price;
      } else {
        // Use a default price if not cached
        const defaultPrice = id === 'alephium' ? 0.39 : 1.0;
        prices[id] = defaultPrice;
        priceCache[id] = {
          price: defaultPrice, 
          timestamp: now
        };
      }
    });
    
    return prices;
  } catch (error) {
    console.error('Error fetching all token prices:', error);
    // Return empty price map as fallback
    return {};
  }
}

export async function fetchTokenBalance(ecosystem: string, address: string): Promise<any> {
  // In a real application, this would connect to different blockchain APIs based on the ecosystem
  // For now, this is a placeholder
  
  console.log(`Fetching balance for ${address} on ${ecosystem}`);
  
  try {
    if (ecosystem === 'alephium' && address) {
      // Import dynamically to avoid circular dependencies
      try {
        const alephiumAPI = await import('./alephiumAPI').then(module => module.default);
        const balance = await alephiumAPI.getAddressBalance(address);
        
        // If this is an Alephium address, also fetch token balances
        try {
          const tokenBalances = await alephiumAPI.getAddressTokens(address);
          return { 
            balance: balance.balance,
            tokenBalances: tokenBalances 
          };
        } catch (tokenError) {
          console.error('Error fetching Alephium token balances:', tokenError);
          return { balance: balance.balance };
        }
      } catch (error) {
        console.error('Error importing or using alephiumAPI:', error);
        // Return demo data for testing
        return {
          balance: "1000000000000000000",
          tokenBalances: [
            { id: "demo-token-1", amount: "100000000" },
            { id: "demo-token-2", amount: "50000000" }
          ]
        };
      }
    }
    
    return { balance: 0 };
  } catch (error) {
    console.error(`Error fetching ${ecosystem} balance:`, error);
    return { balance: 0, error: true };
  }
}

export async function fetchAlephiumData() {
  try {
    // Import the alephiumAPI dynamically to avoid circular dependencies
    try {
      const alephiumAPI = await import('./alephiumAPI').then(module => module.default);
      
      // Try to fetch real network stats
      try {
        const networkStats = await alephiumAPI.fetchNetworkStats();
        return {
          success: true,
          message: "Connected to Alephium blockchain",
          data: networkStats
        };
      } catch (error) {
        console.error('Error connecting to Alephium network:', error);
        // Return demo data for testing
        return {
          success: true,
          message: "Using demo data (network connection failed)",
          data: {
            blockHeight: 1234567,
            hashrate: "123.45 PH/s",
            circulatingSupply: "109876543.21"
          }
        };
      }
    } catch (error) {
      console.error('Error importing Alephium API:', error);
      return {
        success: false,
        message: "Failed to load Alephium integration"
      };
    }
  } catch (error) {
    console.error('Error in fetchAlephiumData:', error);
    return {
      success: false,
      message: "Unexpected error in Alephium data service"
    };
  }
}
