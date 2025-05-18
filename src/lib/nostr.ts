
import { generatePrivateKey, getPublicKey, nip19, verifySignature } from 'nostr-tools';
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

export type NostrStats = {
  likeCount: number;
  repostCount: number;
  replyCount: number;
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

// NOSTR Event Kinds (NIPs)
export const EVENT_KINDS = {
  METADATA: 0,      // NIP-01: Profile metadata
  TEXT_NOTE: 1,     // NIP-01: Text note
  RECOMMEND_SERVER: 2, // NIP-01: Recommend relay
  CONTACTS: 3,      // NIP-02: Contacts list
  ENCRYPTED_DM: 4,  // NIP-04: Encrypted direct message
  DELETE: 5,        // NIP-09: Event deletion
  REPOST: 6,        // NIP-18: Repost
  REACTION: 7,      // NIP-25: Reactions (like)
  BADGE_AWARD: 8,   // NIP-58: Badges
  CHANNEL_CREATE: 40, // NIP-28: Channel creation
  CHANNEL_METADATA: 41, // NIP-28: Channel metadata
  CHANNEL_MESSAGE: 42, // NIP-28: Channel message
  CHANNEL_HIDE: 43, // NIP-28: Hide channel message
  CHANNEL_MUTE: 44, // NIP-28: Mute user in channel
  FILE_METADATA: 1063, // NIP-94: File metadata
  LIVE_CHAT: 1311, // NIP-53: Live chat message
  LONG_FORM: 30023, // NIP-23: Long-form content
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

// Extract media URLs from content and tags
export const extractMediaFromNote = (note: NostrNote): Array<{ type: string, url: string }> => {
  const media: Array<{ type: string, url: string }> = [];
  
  // Extract from content
  const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|mp4|webm|ogg))/gi;
  const contentUrls = note.content.match(urlRegex) || [];
  
  contentUrls.forEach(url => {
    const extension = url.split('.').pop()?.toLowerCase();
    const type = ['jpg', 'jpeg', 'png', 'gif'].includes(extension || '') 
      ? 'image' 
      : 'video';
    media.push({ type, url });
  });
  
  // Extract from tags
  note.tags.forEach(tag => {
    if (tag[0] === 'media' && tag[1]) {
      const url = tag[1];
      const type = tag.length > 2 ? tag[2] : 
        url.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image' : 'video';
      media.push({ type, url });
    }
  });
  
  return media;
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

// Verify event signature (NIP-01)
export const verifyEventSignature = (event: NostrEvent): boolean => {
  try {
    return verifySignature(event);
  } catch (e) {
    console.error('Error verifying signature:', e);
    return false;
  }
};
