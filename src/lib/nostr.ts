import { generatePrivateKey, getPublicKey, nip19 } from 'nostr-tools';
import type { Event as NostrEvent } from 'nostr-tools';

// Types based on NOSTR Implementation Possibilities (NIPs)
export type NostrProfile = {
  pubkey: string;
  npub?: string;
  name?: string;
  displayName?: string;
  picture?: string;
  banner?: string;
  about?: string;
  website?: string;
  nip05?: string;
  lud16?: string; // Lightning address
};

export type NostrMetadata = {
  name?: string;
  display_name?: string; // NIP-01 uses snake_case
  picture?: string;
  banner?: string;
  about?: string;
  website?: string;
  nip05?: string;
  lud16?: string;
};

export type NostrNote = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
  nip19Id?: string;
};

export type NostrRelayConfig = {
  url: string;
  read: boolean;
  write: boolean;
};

// Alephium transaction type for NOSTR events
export type AlephiumTransaction = {
  hash: string;
  blockHash: string;
  timestamp: number;
  inputs: any[];
  outputs: any[];
  tokenId?: string;
  amount?: string;
};

// Default relays - Top 10 most popular NOSTR relays according to NIP
export const DEFAULT_RELAYS: NostrRelayConfig[] = [
  { url: 'wss://relay.damus.io', read: true, write: true },
  { url: 'wss://relay.snort.social', read: true, write: true },
  { url: 'wss://nostr.wine', read: true, write: true },
  { url: 'wss://relay.current.fyi', read: true, write: true },
  { url: 'wss://nos.lol', read: true, write: true },
  { url: 'wss://relay.nostr.band', read: true, write: true },
  { url: 'wss://nostr.mom', read: true, write: true },
  { url: 'wss://relay.nostrgraph.net', read: true, write: true },
  { url: 'wss://purplepag.es', read: true, write: true },
  { url: 'wss://relay.nostr.bg', read: true, write: true },
];

// NOSTR event kinds
export const NOSTR_KINDS = {
  METADATA: 0,
  TEXT_NOTE: 1,
  RECOMMEND_SERVER: 2,
  CONTACTS: 3,
  ENCRYPTED_DIRECT_MESSAGE: 4,
  DELETE: 5,
  REPOST: 6,
  REACTION: 7,
  CHANNEL_CREATION: 40,
  CHANNEL_METADATA: 41,
  CHANNEL_MESSAGE: 42,
  CHANNEL_HIDE_MESSAGE: 43,
  CHANNEL_MUTE_USER: 44,
  REPORTING: 1984,
  ZAP_REQUEST: 9734,
  ZAP_RECEIPT: 9735,
  REPLACEABLE_FIRST: 10000,
  REPLACEABLE_LAST: 19999,
  EPHEMERAL_FIRST: 20000,
  EPHEMERAL_LAST: 29999,
  PARAMETERIZED_REPLACEABLE_FIRST: 30000,
  PARAMETERIZED_REPLACEABLE_LAST: 39999,
  CUSTOM_APPLICATION_FIRST: 40000,
  CUSTOM_APPLICATION_LAST: 49999,
  // Custom kinds for Alephium integration
  ALEPHIUM_TRANSACTION: 30000, // Using parameterized replaceable kind as per NIP-16
};

// Local storage keys
export const NOSTR_KEYS = {
  PRIVATE_KEY: 'nostr_private_key',
  PUBLIC_KEY: 'nostr_public_key',
  RELAYS: 'nostr_relays',
};

// Add TypeScript interface for window.nostr (NIP-07)
declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: any) => Promise<any>;
      nip04?: {
        encrypt: (pubkey: string, plaintext: string) => Promise<string>;
        decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
      };
    };
  }
}

// Generate new keys
export const generateKeys = () => {
  const sk = generatePrivateKey();
  const pk = getPublicKey(sk);
  return { privateKey: sk, publicKey: pk };
};

// Save keys to local storage
export const saveKeys = (privateKey: string) => {
  localStorage.setItem(NOSTR_KEYS.PRIVATE_KEY, privateKey);
  const publicKey = getPublicKey(privateKey);
  localStorage.setItem(NOSTR_KEYS.PUBLIC_KEY, publicKey);
  return { privateKey, publicKey };
};

// Get keys from local storage
export const getKeys = () => {
  const privateKey = localStorage.getItem(NOSTR_KEYS.PRIVATE_KEY);
  const publicKey = localStorage.getItem(NOSTR_KEYS.PUBLIC_KEY);
  return { privateKey, publicKey };
};

// Convert hex to npub
export const hexToNpub = (hex: string): string => {
  try {
    return nip19.npubEncode(hex);
  } catch (e) {
    console.error('Error encoding npub:', e);
    return '';
  }
};

// Convert npub to hex
export const npubToHex = (npub: string): string => {
  try {
    const { data } = nip19.decode(npub);
    return data as string;
  } catch (e) {
    console.error('Error decoding npub:', e);
    return '';
  }
};

// Format timestamp
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

// Parse profile content from metadata (NIP-01)
export const parseProfile = (event: NostrEvent): NostrProfile => {
  try {
    const content = JSON.parse(event.content);
    return {
      pubkey: event.pubkey,
      npub: hexToNpub(event.pubkey),
      name: content.name || '',
      displayName: content.display_name || content.displayName || content.name || '',
      picture: content.picture || '',
      banner: content.banner || '',
      about: content.about || '',
      website: content.website || '',
      nip05: content.nip05 || '',
      lud16: content.lud16 || '',
    };
  } catch (e) {
    console.error('Error parsing profile:', e);
    return {
      pubkey: event.pubkey,
      npub: hexToNpub(event.pubkey),
    };
  }
};

// Convert profile to metadata format for publishing (NIP-01)
export const profileToMetadata = (profile: NostrProfile): NostrMetadata => {
  return {
    name: profile.name,
    display_name: profile.displayName, // Using snake_case as per NIP-01
    about: profile.about,
    picture: profile.picture,
    banner: profile.banner,
    website: profile.website,
    nip05: profile.nip05,
    lud16: profile.lud16,
  };
};

// Parse note content
export const parseNote = (event: NostrEvent): NostrNote => {
  return {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags,
    content: event.content,
    sig: event.sig,
    nip19Id: nip19.noteEncode(event.id),
  };
};

// Create Alephium transaction NOSTR event (NIP-16 compliant)
export const createAlephiumTxEvent = (
  tx: AlephiumTransaction, 
  tokenId: string,
  tokenSymbol: string,
  privateKey: string
): NostrEvent => {
  // Following NIP-16 for parameterized replaceable events
  const event: any = {
    kind: NOSTR_KINDS.ALEPHIUM_TRANSACTION,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', `alephium-tx-${tx.hash}`], // Unique identifier as per NIP-01
      ['token', tokenId],
      ['symbol', tokenSymbol],
      ['tx', tx.hash],
      ['block', tx.blockHash],
      ['amount', tx.amount || '0'],
      ['timestamp', tx.timestamp.toString()]
    ],
    content: JSON.stringify(tx),
    pubkey: getPublicKey(privateKey),
  };
  
  return event;
};

// Publish Alephium transaction to NOSTR relays
export const publishAlephiumTxToNostr = async (
  tx: AlephiumTransaction,
  tokenId: string,
  tokenSymbol: string
): Promise<boolean> => {
  try {
    const { privateKey } = getKeys();
    if (!privateKey) {
      console.error('No private key available');
      return false;
    }
    
    const event = createAlephiumTxEvent(tx, tokenId, tokenSymbol, privateKey);
    
    // In a real implementation, you would sign and publish to relays here
    console.log('Would publish TX to NOSTR:', event);
    return true;
  } catch (error) {
    console.error('Error publishing transaction to NOSTR:', error);
    return false;
  }
};

// Fetch relay information following NIP-11
export const fetchRelayInformation = async (relayUrl: string): Promise<any> => {
  try {
    // Convert WebSocket URL to HTTP URL for NIP-11 document
    let httpUrl = relayUrl.replace(/^wss?:\/\//, 'https://');
    if (!httpUrl.endsWith('/')) {
      httpUrl += '/';
    }
    
    // Request the NIP-11 information document
    const response = await fetch(httpUrl, {
      headers: {
        'Accept': 'application/nostr+json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching relay information for ${relayUrl}:`, error);
    return null;
  }
};

// Create a simple NostrService singleton for use across the application
class NostrService {
  private _privateKey: string | null = null;
  private _publicKey: string | null = null;

  constructor() {
    // Initialize keys from local storage on instantiation
    const { privateKey, publicKey } = getKeys();
    this._privateKey = privateKey;
    this._publicKey = publicKey;
  }

  get privateKey(): string | null {
    return this._privateKey;
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  setKeys(privateKey: string): void {
    const { privateKey: savedPrivate, publicKey: savedPublic } = saveKeys(privateKey);
    this._privateKey = savedPrivate;
    this._publicKey = savedPublic;
  }

  resetKeys(): void {
    this._privateKey = null;
    this._publicKey = null;
    localStorage.removeItem(NOSTR_KEYS.PRIVATE_KEY);
    localStorage.removeItem(NOSTR_KEYS.PUBLIC_KEY);
  }
}

// Export a singleton instance
export const nostrService = new NostrService();
