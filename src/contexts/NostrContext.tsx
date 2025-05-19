import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SimplePool, Event, getEventHash, signEvent, Sub } from 'nostr-tools';
import { toast } from '@/components/ui/use-toast';
import {
  DEFAULT_RELAYS,
  NostrRelayConfig,
  NostrProfile,
  NostrNote,
  NostrMetadata,
  getKeys,
  generateKeys,
  saveKeys,
  parseProfile,
  parseNote,
  profileToMetadata,
  NOSTR_KEYS,
  hexToNpub,
  npubToHex
} from '@/lib/nostr';

// Add contact type based on NIP-02
interface NostrContact {
  pubkey: string;
  relay?: string;
  petname?: string;
}

interface NostrContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  publicKey: string | null;
  npub: string | null;
  profile: NostrProfile | null;
  notes: NostrNote[];
  relays: NostrRelayConfig[];
  pool: SimplePool | null;
  followingPubkeys: string[];
  followingContacts: NostrContact[];
  login: (pubkey?: string) => void;
  loginWithPrivateKey: (privateKey: string) => void;
  logout: () => void;
  createAccount: () => void;
  fetchProfile: (pubkey: string) => Promise<NostrProfile | null>;
  fetchNotes: (pubkey?: string) => Promise<NostrNote[]>;
  fetchSingleNote: (id: string) => Promise<NostrNote | null>;
  fetchContacts: (pubkey?: string) => Promise<NostrContact[]>;
  followUser: (pubkey: string, relay?: string, petname?: string) => Promise<boolean>;
  unfollowUser: (pubkey: string) => Promise<boolean>;
  fetchFollowing: (pubkey?: string) => Promise<string[]>;
  getFollowingFeed: () => Promise<NostrNote[]>;
  getRecommendedRelays: () => Promise<NostrRelayConfig[]>;
  addRecommendedRelay: (url: string, read: boolean, write: boolean) => Promise<boolean>;
  likeNote: (noteId: string) => Promise<boolean>;
  repostNote: (noteId: string) => Promise<boolean>;
  addRelay: (url: string, read: boolean, write: boolean) => void;
  removeRelay: (url: string) => void;
  updateRelay: (url: string, read: boolean, write: boolean) => void;
  saveRelaysToStorage: () => void;
  subscribeToNotes: (
    pubkey?: string, 
    onNotesReceived?: (notes: NostrNote[]) => void,
    limit?: number,
    since?: number
  ) => string | { subId: string; hasMore: boolean };
  unsubscribeFromNotes: (subscriptionId: string) => void;
}

// Interface for tracking subscriptions
interface SubscriptionInfo {
  sub: Sub;
  filter: any;
}

const NostrContext = createContext<NostrContextType | null>(null);

export const useNostr = () => {
  const context = useContext(NostrContext);
  if (!context) {
    throw new Error('useNostr must be used within a NostrProvider');
  }
  return context;
};

export const NostrProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [npub, setNpub] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [profile, setProfile] = useState<NostrProfile | null>(null);
  const [notes, setNotes] = useState<NostrNote[]>([]);
  const [relays, setRelays] = useState<NostrRelayConfig[]>(DEFAULT_RELAYS);
  const [pool, setPool] = useState<SimplePool | null>(null);
  const [followingContacts, setFollowingContacts] = useState<NostrContact[]>([]);
  const [followingPubkeys, setFollowingPubkeys] = useState<string[]>([]);
  
  // Map to track active subscriptions
  const [activeSubscriptions, setActiveSubscriptions] = useState<Map<string, SubscriptionInfo>>(new Map());

  // Initialize NOSTR connection
  useEffect(() => {
    const initNostr = async () => {
      try {
        const nostrPool = new SimplePool();
        setPool(nostrPool);

        const savedRelays = localStorage.getItem(NOSTR_KEYS.RELAYS);
        if (savedRelays) {
          setRelays(JSON.parse(savedRelays));
        }

        const { privateKey: savedPrivateKey, publicKey: savedPublicKey } = getKeys();

        if (savedPrivateKey && savedPublicKey) {
          setPrivateKey(savedPrivateKey);
          setPublicKey(savedPublicKey);
          setIsAuthenticated(true);

          const userProfile = await fetchProfile(savedPublicKey);
          if (userProfile) {
            setProfile(userProfile);
            setNpub(userProfile.npub || null);
          }

          subscribeToNotes(savedPublicKey, (receivedNotes) => {
            setNotes(receivedNotes);
          });
        }
      } catch (error) {
        console.error('Error initializing NOSTR:', error);
        toast({
          title: 'Error connecting to NOSTR',
          description: 'Please try again later',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    initNostr();

    return () => {
      if (pool) {
        pool.close(relays.map(relay => relay.url));
        activeSubscriptions.forEach((subInfo) => {
          if (subInfo.sub) {
            subInfo.sub.unsub();
          }
        });
      }
    };
  }, []);

  const login = useCallback((pubkey?: string) => {
    try {
      if (pubkey) {
        setPublicKey(pubkey);
        setNpub(hexToNpub(pubkey));
        setIsAuthenticated(true);
        
        localStorage.setItem(NOSTR_KEYS.PUBLIC_KEY, pubkey);
        
        toast({
          title: 'Logged in with extension',
          description: 'Successfully connected to your NOSTR extension',
        });

        fetchProfile(pubkey).then(userProfile => {
          if (userProfile) {
            setProfile(userProfile);
          }
        });

        subscribeToNotes(pubkey, (receivedNotes) => {
          setNotes(receivedNotes);
        });
        
        return;
      }
      
      const { privateKey: savedPrivateKey, publicKey: savedPublicKey } = getKeys();
      
      if (!savedPrivateKey || !savedPublicKey) {
        toast({
          title: 'No keys found',
          description: 'Please create an account first',
          variant: 'destructive',
        });
        return;
      }

      setPrivateKey(savedPrivateKey);
      setPublicKey(savedPublicKey);
      setIsAuthenticated(true);
      
      toast({
        title: 'Logged in successfully',
        description: 'Welcome back to NOSTR',
      });

      fetchProfile(savedPublicKey).then(userProfile => {
        if (userProfile) {
          setProfile(userProfile);
          setNpub(userProfile.npub || null);
        }
      });

      subscribeToNotes(savedPublicKey, (receivedNotes) => {
        setNotes(receivedNotes);
      });
    } catch (error) {
      console.error('Error logging in:', error);
      toast({
        title: 'Error logging in',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  }, []);

  const loginWithPrivateKey = (inputPrivateKey: string) => {
    try {
      const derivedPublicKey = getPublicKey(inputPrivateKey);
      
      saveKeys(inputPrivateKey);
      
      setPrivateKey(inputPrivateKey);
      setPublicKey(derivedPublicKey);
      setNpub(hexToNpub(derivedPublicKey));
      setIsAuthenticated(true);
      
      toast({
        title: 'Logged in successfully',
        description: 'Welcome to NOSTR',
      });

      fetchProfile(derivedPublicKey).then(userProfile => {
        if (userProfile) {
          setProfile(userProfile);
        }
      });

      fetchNotes(derivedPublicKey).then(userNotes => {
        setNotes(userNotes);
      });
    } catch (error) {
      console.error('Error logging in with private key:', error);
      toast({
        title: 'Invalid private key',
        description: 'The provided private key is not valid',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = () => {
    setPrivateKey(null);
    setPublicKey(null);
    setProfile(null);
    setNotes([]);
    setIsAuthenticated(false);
    
    localStorage.removeItem(NOSTR_KEYS.PRIVATE_KEY);
    localStorage.removeItem(NOSTR_KEYS.PUBLIC_KEY);
    
    toast({
      title: 'Logged out successfully',
    });
  };

  const createAccount = () => {
    try {
      const { privateKey: newPrivateKey, publicKey: newPublicKey } = generateKeys();
      
      saveKeys(newPrivateKey);
      
      setPrivateKey(newPrivateKey);
      setPublicKey(newPublicKey);
      setNpub(hexToNpub(newPublicKey));
      setIsAuthenticated(true);
      
      toast({
        title: 'Account created successfully',
        description: 'Welcome to NOSTR',
      });

      return { privateKey: newPrivateKey, publicKey: newPublicKey };
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: 'Error creating account',
        description: 'Please try again',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const fetchContacts = async (pubkey?: string): Promise<NostrContact[]> => {
    if (!pool) return [];
    
    const targetPubkey = pubkey || publicKey;
    if (!targetPubkey) return [];

    try {
      const events = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [
          {
            kinds: [3], // Contacts event
            authors: [targetPubkey],
            limit: 1,
          }
        ]
      );

      if (events.length > 0) {
        const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
        
        const contacts: NostrContact[] = latestEvent.tags
          .filter(tag => tag[0] === 'p')
          .map(tag => ({
            pubkey: tag[1],
            relay: tag[2] || undefined,
            petname: tag[3] || undefined,
          }));
        
        if (!pubkey || pubkey === publicKey) {
          setFollowingContacts(contacts);
          setFollowingPubkeys(contacts.map(contact => contact.pubkey));
        }
        
        return contacts;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
  };

  const fetchFollowing = async (pubkey?: string): Promise<string[]> => {
    const contacts = await fetchContacts(pubkey);
    return contacts.map(contact => contact.pubkey);
  };

  const getFollowingFeed = async (): Promise<NostrNote[]> => {
    if (!pool) return [];
    
    if (followingPubkeys.length === 0) {
      await fetchContacts();
      
      if (followingPubkeys.length === 0) {
        return [];
      }
    }

    try {
      const events = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [
          {
            kinds: [1], // Text notes only
            authors: followingPubkeys,
            limit: 50,
          }
        ]
      );

      return events
        .sort((a, b) => b.created_at - a.created_at)
        .map(event => parseNote(event));
    } catch (error) {
      console.error('Error fetching following feed:', error);
      return [];
    }
  };

  const followUser = async (pubkey: string, relay?: string, petname?: string): Promise<boolean> => {
    if (!pool || !isAuthenticated || !publicKey || !privateKey) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to follow users",
        variant: "destructive"
      });
      return false;
    }

    try {
      await fetchContacts();
      
      if (followingPubkeys.includes(pubkey)) {
        toast({
          title: "Already following",
          description: "You are already following this user",
        });
        return true;
      }
      
      const newContact: NostrContact = { pubkey, relay, petname };
      setFollowingContacts(prev => [...prev, newContact]);
      setFollowingPubkeys(prev => [...prev, pubkey]);
      
      const updatedContacts = [...followingContacts, newContact];
      
      const contactTags = updatedContacts.map(contact => {
        const tag = ['p', contact.pubkey];
        if (contact.relay) tag.push(contact.relay);
        if (contact.petname) tag.push(contact.petname);
        return tag;
      });
      
      const relayTags = relays
        .filter(relay => relay.read || relay.write)
        .map(relay => ['r', relay.url]);
      
      let event: Event = {
        kind: 3, // Contacts event
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [...contactTags, ...relayTags],
        content: '',
        id: '',
        sig: '',
      };

      event.id = getEventHash(event);
      
      if (window.nostr) {
        const signedEvent = await window.nostr.signEvent(event);
        await Promise.all(
          relays
            .filter(relay => relay.write)
            .map(relay => pool.publish([relay.url], signedEvent))
        );
      } else {
        event.sig = signEvent(event, privateKey);
        await Promise.all(
          relays
            .filter(relay => relay.write)
            .map(relay => pool.publish([relay.url], event))
        );
      }

      toast({
        title: "Success",
        description: "You are now following this user",
      });
      return true;
    } catch (error) {
      console.error('Error following user:', error);
      toast({
        title: "Error following user",
        description: "There was a problem following this user",
        variant: "destructive",
      });
      return false;
    }
  };

  const unfollowUser = async (pubkey: string): Promise<boolean> => {
    if (!pool || !isAuthenticated || !publicKey || !privateKey) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to unfollow users",
        variant: "destructive"
      });
      return false;
    }

    try {
      if (followingContacts.length === 0) {
        await fetchContacts();
      }
      
      if (!followingPubkeys.includes(pubkey)) {
        toast({
          title: "Not following",
          description: "You are not following this user",
        });
        return true;
      }
      
      const updatedContacts = followingContacts.filter(c => c.pubkey !== pubkey);
      setFollowingContacts(updatedContacts);
      setFollowingPubkeys(updatedContacts.map(c => c.pubkey));
      
      const contactTags = updatedContacts.map(contact => {
        const tag = ['p', contact.pubkey];
        if (contact.relay) tag.push(contact.relay);
        if (contact.petname) tag.push(contact.petname);
        return tag;
      });
      
      const relayTags = relays
        .filter(relay => relay.read || relay.write)
        .map(relay => ['r', relay.url]);
      
      let event: Event = {
        kind: 3,
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [...contactTags, ...relayTags],
        content: '',
        id: '',
        sig: '',
      };

      event.id = getEventHash(event);
      
      if (window.nostr) {
        const signedEvent = await window.nostr.signEvent(event);
        await Promise.all(
          relays
            .filter(relay => relay.write)
            .map(relay => pool.publish([relay.url], signedEvent))
        );
      } else {
        event.sig = signEvent(event, privateKey);
        await Promise.all(
          relays
            .filter(relay => relay.write)
            .map(relay => pool.publish([relay.url], event))
        );
      }

      toast({
        title: "Success",
        description: "You have unfollowed this user",
      });
      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast({
        title: "Error unfollowing user",
        description: "There was a problem unfollowing this user",
        variant: "destructive",
      });
      return false;
    }
  };

  const getRecommendedRelays = async (): Promise<NostrRelayConfig[]> => {
    if (!pool) return [];
    
    const targetPubkey = publicKey;
    if (!targetPubkey) return [];

    try {
      const events = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [
          {
            kinds: [3], // Contacts events
            authors: [targetPubkey],
            limit: 1,
          }
        ]
      );

      if (events.length > 0) {
        const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
        
        const recommendedRelays: NostrRelayConfig[] = latestEvent.tags
          .filter(tag => tag[0] === 'r' && tag[1])
          .map(tag => ({
            url: tag[1],
            read: true,
            write: true,
          }));
        
        return recommendedRelays;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching recommended relays:', error);
      return [];
    }
  };

  const addRecommendedRelay = async (url: string, read: boolean, write: boolean): Promise<boolean> => {
    if (!pool || !isAuthenticated || !publicKey || !privateKey) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to add recommended relays",
        variant: "destructive"
      });
      return false;
    }

    try {
      if (followingContacts.length === 0) {
        await fetchContacts();
      }
      
      const contactTags = followingContacts.map(contact => {
        const tag = ['p', contact.pubkey];
        if (contact.relay) tag.push(contact.relay);
        if (contact.petname) tag.push(contact.petname);
        return tag;
      });
      
      let relayTags = relays
        .filter(relay => relay.read || relay.write)
        .map(relay => ['r', relay.url]);
      
      if (!relays.map(r => r.url).includes(url)) {
        relayTags.push(['r', url]);
        setRelays(prev => [...prev, { url, read, write }]);
      }
      
      let event: Event = {
        kind: 3,
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [...contactTags, ...relayTags],
        content: '',
        id: '',
        sig: '',
      };

      event.id = getEventHash(event);
      
      if (window.nostr) {
        const signedEvent = await window.nostr.signEvent(event);
        await Promise.all(
          relays
            .filter(relay => relay.write)
            .map(relay => pool.publish([relay.url], signedEvent))
        );
      } else {
        event.sig = signEvent(event, privateKey);
        await Promise.all(
          relays
            .filter(relay => relay.write)
            .map(relay => pool.publish([relay.url], event))
        );
      }

      localStorage.setItem(NOSTR_KEYS.RELAYS, JSON.stringify([...relays, { url, read, write }]));
      
      toast({
        title: "Relay added",
        description: `${url} has been added to your recommended relays`,
      });
      return true;
    } catch (error) {
      console.error('Error adding recommended relay:', error);
      toast({
        title: "Error adding relay",
        description: "There was a problem adding the relay",
        variant: "destructive",
      });
      return false;
    }
  };

  const value: NostrContextType = {
    isLoading,
    isAuthenticated,
    publicKey,
    npub,
    profile,
    notes,
    relays,
    pool,
    followingPubkeys,
    followingContacts,
    login,
    loginWithPrivateKey,
    logout,
    createAccount,
    fetchProfile,
    fetchNotes,
    fetchSingleNote,
    fetchContacts,
    fetchFollowing,
    updateProfile,
    publishNote,
    followUser,
    unfollowUser,
    getFollowingFeed,
    getRecommendedRelays,
    addRecommendedRelay,
    likeNote,
    repostNote,
    addRelay,
    removeRelay,
    updateRelay,
    saveRelaysToStorage,
    subscribeToNotes,
    unsubscribeFromNotes,
  };

  return (
    <NostrContext.Provider value={value}>
      {children}
    </NostrContext.Provider>
  );
};

function getPublicKey(privateKey: string): string {
  // Implement this function to derive the public key from the private key
  // This is a placeholder for now
  return 'derivedPublicKey';
}
