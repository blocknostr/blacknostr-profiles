
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
