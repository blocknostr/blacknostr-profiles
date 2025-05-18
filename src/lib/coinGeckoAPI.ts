
// CoinGecko API utility functions
import { web3, NodeProvider } from '@alephium/web3';

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
  
  console.log(`Fetching balance for ${address} on ${ecosystem}`);
  
  if (ecosystem === 'alephium') {
    try {
      const nodeProvider = web3.getCurrentNodeProvider();
      if (nodeProvider) {
        const balance = await nodeProvider.addresses.getAddressesAddressBalance(address);
        return balance;
      }
    } catch (error) {
      console.error('Error fetching Alephium balance:', error);
    }
  }
  
  return { balance: 0 };
}

export async function fetchAlephiumData() {
  const mainnetNodeUrl = 'https://node.mainnet.alephium.org';
  
  try {
    // Initialize the node provider if not already initialized
    if (!web3.getCurrentNodeProvider()) {
      const nodeProvider = new NodeProvider(mainnetNodeUrl);
      web3.setCurrentNodeProvider(nodeProvider);
    }
    
    // Get current info about the blockchain
    const nodeProvider = web3.getCurrentNodeProvider();
    if (!nodeProvider) {
      throw new Error("Node provider not initialized");
    }
    
    const selfClique = await nodeProvider.infos.getSelfClique();
    const blockflowChainInfo = await nodeProvider.blockflow.getBlockflowChainInfo();
    
    return {
      success: true,
      message: "Successfully connected to Alephium blockchain",
      data: {
        selfClique,
        blockflowChainInfo
      }
    };
  } catch (error) {
    console.error('Error connecting to Alephium:', error);
    return {
      success: false,
      message: "Failed to connect to Alephium blockchain"
    };
  }
}
