// Update any methods to account for the correct API response structure
// Add getAddressTokens method if it doesn't exist

const BASE_MAINNET_URL = 'https://node.mainnet.alephium.org';
const EXPLORER_API_URL = 'https://backend.mainnet.alephium.org';

interface TokenBalance {
  id: string;
  amount: string;
}

interface AddressBalance {
  balance: number;
  lockedBalance: number;
  utxoNum: number;
}

interface TokenInfo {
  id?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
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
      throw error;
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
};

export default alephiumAPI;
