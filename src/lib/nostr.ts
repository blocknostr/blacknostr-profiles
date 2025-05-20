
import { nip19, Event, getPublicKey, generatePrivateKey } from 'nostr-tools';

// Types and interfaces
export type NostrMetadata = {
  name?: string;
  display_name?: string; // NIP-01 uses snake_case
  picture?: string;
  banner?: string;
  about?: string;
  website?: string;
  nip05?: string;
  lud16?: string;
  location?: string; // Adding location to metadata
};

export interface NostrProfile {
  pubkey: string;
  npub?: string | null;
  name?: string;
  displayName?: string;
  picture?: string;
  banner?: string;
  about?: string;
  website?: string;
  nip05?: string;
  lud16?: string;
  location?: string;
}

export interface NostrRelayConfig {
  url: string;
  read: boolean;
  write: boolean;
}

export interface NostrNote {
  id: string;
  nip19Id?: string;
  pubkey: string;
  created_at: number;
  content: string;
  tags: string[][];
  sig: string;
}

// Constants
export const NOSTR_KEYS = {
  PRIVATE_KEY: 'nostr-private-key',
  PUBLIC_KEY: 'nostr-public-key',
  RELAYS: 'nostr-relays',
};

export const DEFAULT_RELAYS: NostrRelayConfig[] = [
  { url: 'wss://relay.damus.io', read: true, write: true },
  { url: 'wss://relay.nostr.band', read: true, write: true },
  { url: 'wss://nos.lol', read: true, write: true },
  { url: 'wss://relay.nostr.info', read: true, write: false }
];

// Utility functions
export const hexToNpub = (hex: string): string => {
  try {
    return nip19.npubEncode(hex);
  } catch (error) {
    console.error('Error converting hex to npub:', error);
    return hex;
  }
};

export const npubToHex = (npub: string): string => {
  try {
    const { data } = nip19.decode(npub);
    return data as string;
  } catch (error) {
    console.error('Error converting npub to hex:', error);
    throw new Error('Invalid npub format');
  }
};

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

// Key management functions
export const getKeys = (): { privateKey: string | null; publicKey: string | null } => {
  const privateKey = localStorage.getItem(NOSTR_KEYS.PRIVATE_KEY);
  const publicKey = localStorage.getItem(NOSTR_KEYS.PUBLIC_KEY);
  return { privateKey, publicKey };
};

export const saveKeys = (privateKey: string): void => {
  const publicKey = getPublicKey(privateKey);
  localStorage.setItem(NOSTR_KEYS.PRIVATE_KEY, privateKey);
  localStorage.setItem(NOSTR_KEYS.PUBLIC_KEY, publicKey);
};

export const generateKeys = (): { privateKey: string; publicKey: string } => {
  const privateKey = generatePrivateKey();
  const publicKey = getPublicKey(privateKey);
  return { privateKey, publicKey };
};

// Data parsing functions
export const parseProfile = (event: Event): NostrProfile => {
  try {
    const metadata: NostrMetadata = JSON.parse(event.content);
    
    return {
      pubkey: event.pubkey,
      npub: hexToNpub(event.pubkey),
      name: metadata.name,
      displayName: metadata.display_name || metadata.name,
      picture: metadata.picture,
      banner: metadata.banner,
      about: metadata.about,
      website: metadata.website,
      nip05: metadata.nip05,
      lud16: metadata.lud16,
      location: metadata.location,
    };
  } catch (error) {
    console.error('Error parsing profile metadata:', error);
    return {
      pubkey: event.pubkey,
      npub: hexToNpub(event.pubkey)
    };
  }
};

export const profileToMetadata = (profile: NostrProfile): NostrMetadata => {
  return {
    name: profile.name,
    display_name: profile.displayName,
    picture: profile.picture,
    banner: profile.banner,
    about: profile.about,
    website: profile.website,
    nip05: profile.nip05,
    lud16: profile.lud16,
    location: profile.location,
  };
};

export const parseNote = (event: Event): NostrNote => {
  return {
    id: event.id,
    nip19Id: nip19.noteEncode(event.id),
    pubkey: event.pubkey,
    created_at: event.created_at,
    content: event.content,
    tags: event.tags,
    sig: event.sig,
  };
};

// TypeScript declaration for window.nostr (NIP-07 browser extension)
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: Event): Promise<Event>;
      // Add other NIP-07 functions as needed
    };
  }
}

// Mock service for WalletSummary.tsx
export const nostrService = {
  publicKey: localStorage.getItem(NOSTR_KEYS.PUBLIC_KEY),
  // Add other properties/methods as needed by WalletSummary
};
