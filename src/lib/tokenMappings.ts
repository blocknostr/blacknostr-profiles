
/**
 * Mapping of Alephium token IDs to CoinGecko coin IDs
 * This allows us to fetch accurate price data from CoinGecko for tokens
 */

// Interface for token mapping
export interface TokenMapping {
  alephiumId: string;      // Token ID on Alephium
  coingeckoId: string;     // Corresponding ID on CoinGecko
  symbol: string;          // Token symbol (ABX, ALPH, etc.)
  name: string;            // Full token name
  decimals: number;        // Token decimal places
  isStablecoin?: boolean;  // Flag for stablecoins (USDT, USDC, etc.)
}

// Map of known token IDs to their CoinGecko equivalents
export const tokenMappings: Record<string, TokenMapping> = {
  // AlphBanx token
  "27aa562d592758d73b33ef11ac5b574aea843a3e315a8d1bdef714c3d6a52cd5": {
    alephiumId: "27aa562d592758d73b33ef11ac5b574aea843a3e315a8d1bdef714c3d6a52cd5",
    coingeckoId: "alphbanx",
    symbol: "ABX",
    name: "AlphBanx",
    decimals: 18
  },
  // Native ALPH token
  "ALPH": {
    alephiumId: "ALPH",
    coingeckoId: "alephium",
    symbol: "ALPH",
    name: "Alephium",
    decimals: 18
  },
  // Add more mappings as needed
};

/**
 * Gets CoinGecko ID for a given Alephium token ID
 * @param tokenId Alephium token ID
 * @returns CoinGecko ID if mapping exists, undefined otherwise
 */
export const getCoinGeckoId = (tokenId: string): string | undefined => {
  const mapping = tokenMappings[tokenId];
  return mapping?.coingeckoId;
};

/**
 * Gets a list of all known CoinGecko IDs for fetching prices
 * @returns Array of CoinGecko IDs
 */
export const getAllCoinGeckoIds = (): string[] => {
  return Object.values(tokenMappings).map(mapping => mapping.coingeckoId);
};

/**
 * Gets token decimals for a given Alephium token ID from our mappings
 * @param tokenId Alephium token ID
 * @returns Number of decimal places or default of 18
 */
export const getTokenDecimals = (tokenId: string): number => {
  return tokenMappings[tokenId]?.decimals || 18;
};

/**
 * Check if a token ID is mapped in our system
 * @param tokenId Alephium token ID
 * @returns Boolean indicating if token is mapped
 */
export const isTokenMapped = (tokenId: string): boolean => {
  return !!tokenMappings[tokenId];
};
