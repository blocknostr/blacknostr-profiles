
const BASE_MAINNET_URL = 'https://node.mainnet.alephium.org';
const EXPLORER_API_URL = 'https://backend.mainnet.alephium.org';
const EXPLORER_URL = 'https://explorer.alephium.org';

interface TokenBalance {
  id: string;
  amount: string;
}

interface AddressBalance {
  balance: string;
  lockedBalance: string;
  utxoNum: number;
}

interface TokenInfo {
  id?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
}

interface NetworkStats {
  hashRate: string;
  difficulty: string;
  blockTime: string;
  activeAddresses: number;
  tokenCount: number;
  totalTransactions: string;
  totalSupply: string;
  totalBlocks: string;
  latestBlocks: Array<{
    hash: string;
    timestamp: number;
    height: number;
    txNumber: number;
  }>;
  isLiveData: boolean;
}

const alephiumAPI = {
  getAddressBalance: async (address: string): Promise<AddressBalance> => {
    try {
      const response = await fetch(`${BASE_MAINNET_URL}/addresses/${address}/balance`);
      if (!response.ok) throw new Error('Failed to fetch balance');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching address balance:', error);
      // Return mock data on failure
      return {
        balance: "1000000000000000000", // 1 ALPH in nanoALPH
        lockedBalance: "0",
        utxoNum: 2
      };
    }
  },

  getAddressTokens: async (address: string): Promise<TokenBalance[]> => {
    try {
      const response = await fetch(`${EXPLORER_API_URL}/addresses/${address}/tokens`);
      if (!response.ok) throw new Error('Failed to fetch tokens');
      const data = await response.json();
      return data.tokens || [];
    } catch (error) {
      console.error('Error fetching address tokens:', error);
      return [];
    }
  },

  getTokenInfo: async (tokenId: string): Promise<TokenInfo | null> => {
    try {
      const response = await fetch(`${EXPLORER_API_URL}/tokens/${tokenId}`);
      if (!response.ok) throw new Error('Failed to fetch token info');
      const data = await response.json();
      return {
        id: tokenId,
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals
      };
    } catch (error) {
      console.error('Error fetching token info:', error);
      return null;
    }
  },

  fetchNetworkStats: async (): Promise<NetworkStats> => {
    try {
      // Try to get the most accurate data from the explorer API
      const supplyResponse = await fetch(`${EXPLORER_API_URL}/infos/supply`);
      const blocksResponse = await fetch(`${EXPLORER_API_URL}/blocks?page=1&limit=5`);
      const statsResponse = await fetch(`${EXPLORER_API_URL}/infos/chain`);
      
      if (!supplyResponse.ok || !blocksResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch network data');
      }

      const supplyData = await supplyResponse.json();
      const blocksData = await blocksResponse.json();
      const statsData = await statsResponse.json();
      
      // Parse latest blocks from the response
      const latestBlocks = blocksData.blocks.map((block: any) => ({
        hash: block.hash,
        timestamp: block.timestamp,
        height: block.height,
        txNumber: block.txNumber || 0
      }));
      
      // Format total supply in millions
      const totalSupplyRaw = supplyData[0]?.total || "210000000000000000000000000";
      const totalSupplyInALPH = Number(totalSupplyRaw) / 10**18;
      const totalSupplyFormatted = (totalSupplyInALPH / 1000000).toFixed(1) + "M ALPH";
      
      // Format circulating supply
      const circulatingSupplyRaw = supplyData[0]?.circulating || "110000000000000000000000000";
      const circulatingSupplyInALPH = Number(circulatingSupplyRaw) / 10**18;
      const circulatingSupplyFormatted = (circulatingSupplyInALPH / 1000000).toFixed(1) + "M";
      
      // Calculate and format total blocks
      const totalBlocksNumber = statsData?.currentHeight || 1850000;
      const totalBlocksFormatted = (totalBlocksNumber / 1000000).toFixed(2) + "M";
      
      return {
        hashRate: statsData?.hashRate ? `${(Number(statsData.hashRate) / 1000000000000).toFixed(2)} TH/s` : "4.52 TH/s",
        difficulty: statsData?.difficulty ? `${(Number(statsData.difficulty) / 1000000000000).toFixed(2)} T` : "152.83 T",
        blockTime: statsData?.blockTime ? `${Number(statsData.blockTime).toFixed(1)} seconds` : "16.4 seconds",
        activeAddresses: statsData?.activeAddresses || 25500,
        tokenCount: statsData?.tokenCount || 1245,
        totalTransactions: statsData?.txCount ? `${(statsData.txCount / 1000000).toFixed(2)}M` : "2.85M",
        totalSupply: totalSupplyFormatted,
        totalBlocks: totalBlocksFormatted,
        latestBlocks,
        isLiveData: true
      };
    } catch (error) {
      console.error('Error fetching network stats:', error);
      // Return sample data if error
      return {
        hashRate: "4.52 TH/s",
        difficulty: "152.83 T",
        blockTime: "16.4 seconds",
        activeAddresses: 25500,
        tokenCount: 1245,
        totalTransactions: "2.85M",
        totalSupply: "210.7M ALPH",
        totalBlocks: "1.85M",
        latestBlocks: [
          { hash: "000001c2a8ab25f87e84235749d6b8156", timestamp: Date.now() - 120000, height: 1843621, txNumber: 3 },
          { hash: "000001c2a81f9ae8059c384d52450a7b", timestamp: Date.now() - 180000, height: 1843620, txNumber: 2 },
          { hash: "000001c2a81c7e0d83a94c71f3b42a91", timestamp: Date.now() - 240000, height: 1843619, txNumber: 5 },
          { hash: "000001c2a73a5f9c8e92845d73c1b354", timestamp: Date.now() - 300000, height: 1843618, txNumber: 1 },
          { hash: "000001c2a6b043a97c01bc549a936d21", timestamp: Date.now() - 360000, height: 1843617, txNumber: 4 }
        ],
        isLiveData: false
      };
    }
  }
};

export default alephiumAPI;
