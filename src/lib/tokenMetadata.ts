
/**
 * Token metadata service for Alephium tokens
 * Fetches and caches token information from the official Alephium token list
 */

// Token interface matching the Alephium token list schema
export interface TokenMetadata {
  id: string;
  name: string;
  nameOnChain?: string;
  symbol: string;
  symbolOnChain?: string;
  decimals: number;
  description?: string;
  logoURI?: string;
  // Additional properties needed for NFT support
  tokenURI?: string;
  uri?: string;
  image?: string;
  imageUrl?: string;
  standard?: string;
  attributes?: any[];
  // Additional fields for price tracking
  coingeckoId?: string;
  isStablecoin?: boolean;
  price?: number;
}

interface TokenList {
  networkId: number;
  tokens: TokenMetadata[];
}

// Updated URL to the correct path for the mainnet token list
const TOKEN_LIST_URL = "https://raw.githubusercontent.com/alephium/token-list/master/tokens/mainnet.json";
let tokenCache: Record<string, TokenMetadata> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Map of known token IDs to their CoinGecko equivalents
export const tokenMappings: Record<string, { coingeckoId: string, isStablecoin?: boolean }> = {
  // AlphBanx token
  "27aa562d592758d73b33ef11ac5b574aea843a3e315a8d1bdef714c3d6a52cd5": {
    coingeckoId: "alphbanx",
  },
  // Native ALPH token
  "ALPH": {
    coingeckoId: "alephium",
  },
  // Add more mappings as needed
};

/**
 * Fetches the official token list from GitHub
 */
export const fetchTokenList = async (): Promise<Record<string, TokenMetadata>> => {
  const currentTime = Date.now();
  
  // Return cached data if available and not expired
  if (tokenCache && (currentTime - lastFetchTime < CACHE_DURATION)) {
    return tokenCache;
  }
  
  try {
    console.log("Fetching token list from:", TOKEN_LIST_URL);
    const response = await fetch(TOKEN_LIST_URL, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as TokenList;
    console.log("Fetched token list:", data);
    
    // Create a map of token ID to token data for quick lookups
    const tokenMap: Record<string, TokenMetadata> = {};
    data.tokens.forEach(token => {
      // Add CoinGecko ID if we have a mapping
      if (tokenMappings[token.id]) {
        token.coingeckoId = tokenMappings[token.id].coingeckoId;
        token.isStablecoin = tokenMappings[token.id].isStablecoin;
      }
      tokenMap[token.id] = token;
    });
    
    // Make sure ALPH is included
    if (!tokenMap["ALPH"]) {
      tokenMap["ALPH"] = {
        id: "ALPH",
        name: "Alephium",
        symbol: "ALPH",
        decimals: 18,
        logoURI: "https://raw.githubusercontent.com/alephium/token-list/master/logos/alephium.png",
        coingeckoId: "alephium"
      };
    }
    
    // Update cache
    tokenCache = tokenMap;
    lastFetchTime = currentTime;
    
    return tokenMap;
  } catch (error) {
    console.error("Error fetching token metadata:", error);
    
    // Return a basic token map with just ALPH if we can't fetch
    if (!tokenCache) {
      const basicTokenMap: Record<string, TokenMetadata> = {
        "ALPH": {
          id: "ALPH",
          name: "Alephium",
          symbol: "ALPH",
          decimals: 18,
          logoURI: "https://raw.githubusercontent.com/alephium/token-list/master/logos/alephium.png",
          coingeckoId: "alephium"
        }
      };
      tokenCache = basicTokenMap;
    }
    
    // Return empty cache or existing cache if available
    return tokenCache || {};
  }
};

/**
 * Gets metadata for a specific token ID
 */
export const getTokenMetadata = async (tokenId: string): Promise<TokenMetadata | undefined> => {
  try {
    const tokenMap = await fetchTokenList();
    return tokenMap[tokenId] || getFallbackTokenData(tokenId);
  } catch (error) {
    console.error(`Error getting metadata for token ${tokenId}:`, error);
    return getFallbackTokenData(tokenId);
  }
};

/**
 * Gets CoinGecko ID for a given Alephium token ID
 */
export const getCoinGeckoId = (tokenId: string): string | undefined => {
  const mapping = tokenMappings[tokenId];
  return mapping?.coingeckoId;
};

/**
 * Gets a list of all known CoinGecko IDs for fetching prices
 */
export const getAllCoinGeckoIds = (): string[] => {
  return Object.values(tokenMappings)
    .map(mapping => mapping.coingeckoId)
    .filter(id => !!id) as string[];
};

/**
 * Formats token amounts based on their decimal places
 * Divides the raw integer amount by 10^decimals
 */
export const formatTokenAmount = (amount: string | number, decimals: number = 0): string => {
  try {
    if (!amount) return "0";
    
    // Handle string amounts that might not be valid numbers
    if (typeof amount === 'string' && !/^\d+$/.test(amount)) {
      console.warn(`Invalid amount format: ${amount}`);
      return "0";
    }
    
    // Convert to BigInt to handle large numbers accurately
    const bigAmount = typeof amount === 'string' ? BigInt(amount) : BigInt(Math.floor(Number(amount)));
    
    if (decimals === 0) {
      return bigAmount.toString();
    }
    
    // Convert to string and ensure it has enough leading zeros
    let amountStr = bigAmount.toString();
    // Pad with leading zeros if needed
    while (amountStr.length <= decimals) {
      amountStr = '0' + amountStr;
    }
    
    // Insert decimal point
    const integerPart = amountStr.slice(0, amountStr.length - decimals) || '0';
    const fractionalPart = amountStr.slice(-decimals);
    
    // Format with appropriate number of decimal places, removing trailing zeros
    const formattedAmount = `${integerPart}.${fractionalPart}`;
    
    // Parse as float to remove unnecessary trailing zeros and format with comma separators
    const parsed = parseFloat(formattedAmount);
    return parsed.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  } catch (error) {
    console.error("Error formatting token amount:", error, amount, decimals);
    return "0";
  }
};

/**
 * Default fallback token data
 */
export const getFallbackTokenData = (tokenId: string): TokenMetadata => {
  return {
    id: tokenId,
    name: `Unknown Token (${tokenId.substring(0, 6)}...)`,
    symbol: `TOKEN-${tokenId.substring(0, 4)}`,
    decimals: 0,
    logoURI: "https://raw.githubusercontent.com/alephium/token-list/master/logos/unknown.png"
  };
};
