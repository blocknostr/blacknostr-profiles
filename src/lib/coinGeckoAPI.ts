
// CoinGecko API utility functions
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

export async function fetchCoinPrice(coinId: string): Promise<CoinPrice | null> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return data[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching coin price:', error);
    return null;
  }
}

export async function fetchTokenBalance(ecosystem: string, address: string): Promise<any> {
  // In a real application, this would connect to different blockchain APIs based on the ecosystem
  // For now, this is a placeholder
  
  console.log(`Fetching balance for ${address} on ${ecosystem}`);
  
  try {
    if (ecosystem === 'alephium' && address) {
      // Use the new alephiumAPI to get real balance data
      const alephiumAPI = (await import('@/lib/alephiumAPI')).default;
      const balance = await alephiumAPI.getAddressBalance(address);
      return { balance: balance.balance };
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
    const alephiumAPI = (await import('@/lib/alephiumAPI')).default;
    
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
      return {
        success: false,
        message: "Failed to connect to Alephium blockchain"
      };
    }
  } catch (error) {
    console.error('Error importing Alephium API:', error);
    return {
      success: false,
      message: "Failed to load Alephium integration"
    };
  }
}
