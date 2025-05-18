
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
    const response = await fetch(TOKEN_LIST_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as TokenList;
    console.log("Fetched token list:", data);
    
    // Create a map of token ID to token data for quick lookups
    const tokenMap: Record<string, TokenMetadata> = {};
    data.tokens.forEach(token => {
      tokenMap[token.id] = token;
    });
    
    // Update cache
    tokenCache = tokenMap;
    lastFetchTime = currentTime;
    
    return tokenMap;
  } catch (error) {
    console.error("Error fetching token metadata:", error);
    // Return empty cache or existing cache if available
    return tokenCache || {};
  }
};

/**
 * Gets metadata for a specific token ID
 */
export const getTokenMetadata = async (tokenId: string): Promise<TokenMetadata | undefined> => {
  const tokenMap = await fetchTokenList();
  return tokenMap[tokenId];
};

/**
 * Formats token amounts based on their decimal places
 * Divides the raw integer amount by 10^decimals
 */
export const formatTokenAmount = (amount: string | number, decimals: number = 0): string => {
  // Convert to BigInt to handle large numbers accurately
  const bigAmount = typeof amount === 'string' ? BigInt(amount) : BigInt(Math.floor(amount));
  
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
