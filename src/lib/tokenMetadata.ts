
/**
 * Token metadata service for Alephium tokens
 * Fetches and caches token information from the official Alephium token list
 */
import { tokenMappings, getCoinGeckoId as getGeckoId } from "./tokenMappings";

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
  lastUpdated?: number;
  transactions?: any[];
}

interface TokenList {
  networkId: number;
  tokens: TokenMetadata[];
}

// Updated URL to the correct path for the mainnet token list
const TOKEN_LIST_URL = "https://raw.githubusercontent.com/alephium/token-list/master/tokens/mainnet.json";
const TRANSACTIONS_API = "https://backend.mainnet.alephium.org/tokens";
let tokenCache: Record<string, TokenMetadata> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Local fallback token list for when the network is unavailable
const LOCAL_TOKEN_LIST: Record<string, TokenMetadata> = {
  "ALPH": {
    id: "ALPH",
    name: "Alephium",
    symbol: "ALPH",
    decimals: 18,
    logoURI: "https://raw.githubusercontent.com/alephium/token-list/master/logos/alephium.png",
    coingeckoId: "alephium"
  },
  "27aa562d592758d73b33ef11ac5b574aea843a3e315a8d1bdef714c3d6a52cd5": {
    id: "27aa562d592758d73b33ef11ac5b574aea843a3e315a8d1bdef714c3d6a52cd5",
    name: "AlphBanx",
    symbol: "ABX",
    decimals: 18,
    logoURI: "https://raw.githubusercontent.com/alephium/token-list/master/logos/alphbanx.png",
    coingeckoId: "alphbanx"
  },
  // Add more common tokens here as fallback
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
      },
      // Add timeout to prevent long waiting times
      signal: AbortSignal.timeout(5000) // 5 second timeout
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
      const mapping = tokenMappings[token.id];
      if (mapping) {
        token.coingeckoId = mapping.coingeckoId;
        token.isStablecoin = mapping.isStablecoin;
        // Ensure we use our mapping's decimals as they're more reliable
        token.decimals = mapping.decimals;
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
    
    // If we have an existing cache, return it even if expired rather than fallback
    if (tokenCache) {
      console.log("Using expired token cache due to fetch error");
      return tokenCache;
    }
    
    // No cache available, use local fallback data
    console.log("Using local token fallback data");
    tokenCache = { ...LOCAL_TOKEN_LIST };
    lastFetchTime = currentTime - CACHE_DURATION + 300000; // Set to expire in 5 minutes to retry
    
    return tokenCache;
  }
};

/**
 * Fetches transactions for a specific token
 */
export const fetchTokenTransactions = async (tokenId: string, page: number = 1, limit: number = 10): Promise<any[]> => {
  try {
    const url = `${TRANSACTIONS_API}/${tokenId}/transactions?page=${page}&limit=${limit}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching transactions for token ${tokenId}:`, error);
    return [];
  }
};

/**
 * Gets metadata for a specific token ID
 */
export const getTokenMetadata = async (tokenId: string): Promise<TokenMetadata | undefined> => {
  try {
    const tokenMap = await fetchTokenList();
    const token = tokenMap[tokenId] || getFallbackTokenData(tokenId);
    
    // Fetch recent transactions only if they haven't been fetched already
    if (!token.transactions) {
      token.transactions = await fetchTokenTransactions(tokenId);
    }
    
    return token;
  } catch (error) {
    console.error(`Error getting metadata for token ${tokenId}:`, error);
    return getFallbackTokenData(tokenId);
  }
};

/**
 * Gets CoinGecko ID for a given Alephium token ID
 * Re-exported from tokenMappings for backward compatibility
 */
export const getCoinGeckoId = getGeckoId;

/**
 * Gets a list of all known CoinGecko IDs for fetching prices
 * Re-exported from tokenMappings module
 */
export const getAllCoinGeckoIds = (): string[] => {
  return Object.values(tokenMappings)
    .map(mapping => mapping.coingeckoId)
    .filter(id => !!id) as string[];
};

/**
 * Formats token amounts based on their decimal places
 * Divides the raw integer amount by 10^decimals
 * @param amount - The raw amount as a string or number
 * @param decimals - The number of decimal places (default: 18)
 * @param displayDecimals - Optional max number of decimals to display
 * @returns Formatted amount as a string
 */
export const formatTokenAmount = (
  amount: string | number,
  decimals: number = 18,
  displayDecimals?: number
): string => {
  try {
    if (!amount) return "0";
    
    // Handle string amounts that might not be valid numbers
    if (typeof amount === 'string' && !/^\d+$/.test(amount)) {
      console.warn(`Invalid amount format: ${amount}`);
      return "0";
    }
    
    // Convert to BigInt to handle large numbers accurately
    let bigAmount: bigint;
    try {
      bigAmount = typeof amount === 'string' ? BigInt(amount) : BigInt(Math.floor(Number(amount)));
    } catch (e) {
      console.warn(`Error converting amount to BigInt: ${amount}`, e);
      return "0";
    }
    
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
    
    // Format with appropriate number of decimal places
    const formattedAmount = `${integerPart}.${fractionalPart}`;
    
    // Parse as float and format with appropriate decimal places
    const parsedValue = parseFloat(formattedAmount);
    
    // Handle display decimals parameter for UI formatting
    const maxDecimals = displayDecimals !== undefined ? 
      displayDecimals : 
      Math.min(decimals, 6); // Default to 6 max decimals for display
    
    return parsedValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals
    });
  } catch (error) {
    console.error("Error formatting token amount:", error, {
      amount,
      decimals,
      displayDecimals
    });
    return "0";
  }
};

/**
 * Default fallback token data
 */
export const getFallbackTokenData = (tokenId: string): TokenMetadata => {
  // Check if we have a mapping for this token
  if (tokenMappings[tokenId]) {
    const mapping = tokenMappings[tokenId];
    return {
      id: tokenId,
      name: mapping.name,
      symbol: mapping.symbol,
      decimals: mapping.decimals,
      logoURI: "https://raw.githubusercontent.com/alephium/token-list/master/logos/unknown.png",
      coingeckoId: mapping.coingeckoId
    };
  }
  
  return {
    id: tokenId,
    name: `Unknown Token (${tokenId.substring(0, 6)}...)`,
    symbol: `TOKEN-${tokenId.substring(0, 4)}`,
    decimals: 18,  // Default to 18 decimals like most tokens
    logoURI: "https://raw.githubusercontent.com/alephium/token-list/master/logos/unknown.png"
  };
};
