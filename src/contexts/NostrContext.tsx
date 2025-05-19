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
  hexToNpub
} from '@/lib/nostr';

interface NostrContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  publicKey: string | null;
  npub: string | null;
  profile: NostrProfile | null;
  notes: NostrNote[];
  relays: NostrRelayConfig[];
  pool: SimplePool | null;
  login: (pubkey?: string) => void;
  loginWithPrivateKey: (privateKey: string) => void;
  logout: () => void;
  createAccount: () => void;
  fetchProfile: (pubkey: string) => Promise<NostrProfile | null>;
  fetchNotes: (pubkey?: string) => Promise<NostrNote[]>;
  fetchSingleNote: (id: string) => Promise<NostrNote | null>;
  updateProfile: (updatedProfile: NostrProfile) => Promise<boolean>;
  publishNote: (content: string, tags?: string[][]) => Promise<string | null>;
  followUser: (pubkey: string) => Promise<boolean>;
  unfollowUser: (pubkey: string) => Promise<boolean>;
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
  ) => string;
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
  
  // Map to track active subscriptions
  const [activeSubscriptions, setActiveSubscriptions] = useState<Map<string, SubscriptionInfo>>(new Map());

  // Initialize NOSTR connection
  useEffect(() => {
    const initNostr = async () => {
      try {
        // Create relay pool
        const nostrPool = new SimplePool();
        setPool(nostrPool);

        // Load saved relays or use defaults
        const savedRelays = localStorage.getItem(NOSTR_KEYS.RELAYS);
        if (savedRelays) {
          setRelays(JSON.parse(savedRelays));
        }

        // Load saved keys
        const { privateKey: savedPrivateKey, publicKey: savedPublicKey } = getKeys();

        if (savedPrivateKey && savedPublicKey) {
          setPrivateKey(savedPrivateKey);
          setPublicKey(savedPublicKey);
          setIsAuthenticated(true);

          // Fetch user profile
          const userProfile = await fetchProfile(savedPublicKey);
          if (userProfile) {
            setProfile(userProfile);
            setNpub(userProfile.npub || null);
          }

          // Set up a streaming subscription for user's notes
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

    // Clean up all subscriptions on unmount
    return () => {
      if (pool) {
        // Close all relay connections
        pool.close(relays.map(relay => relay.url));
        
        // Make sure to unsubscribe from all subscriptions
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
      // If pubkey is provided, use extension login
      if (pubkey) {
        setPublicKey(pubkey);
        setNpub(hexToNpub(pubkey));
        setIsAuthenticated(true);
        
        // Save the pubkey to local storage (without private key)
        localStorage.setItem(NOSTR_KEYS.PUBLIC_KEY, pubkey);
        
        toast({
          title: 'Logged in with extension',
          description: 'Successfully connected to your NOSTR extension',
        });

        // Fetch profile and set up streaming subscription for notes
        fetchProfile(pubkey).then(userProfile => {
          if (userProfile) {
            setProfile(userProfile);
          }
        });

        // Set up subscription for user's notes
        subscribeToNotes(pubkey, (receivedNotes) => {
          setNotes(receivedNotes);
        });
        
        return;
      }
      
      // Otherwise, standard local storage login
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

      // Fetch profile and set up streaming subscription for notes
      fetchProfile(savedPublicKey).then(userProfile => {
        if (userProfile) {
          setProfile(userProfile);
          setNpub(userProfile.npub || null);
        }
      });

      // Set up subscription for user's notes
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
      // Get public key from private key
      const derivedPublicKey = getPublicKey(inputPrivateKey);
      
      // Save keys
      saveKeys(inputPrivateKey);
      
      setPrivateKey(inputPrivateKey);
      setPublicKey(derivedPublicKey);
      setNpub(hexToNpub(derivedPublicKey));
      setIsAuthenticated(true);
      
      toast({
        title: 'Logged in successfully',
        description: 'Welcome to NOSTR',
      });

      // Fetch profile and notes
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
    
    // Clear local storage if the keys were stored there
    localStorage.removeItem(NOSTR_KEYS.PRIVATE_KEY);
    localStorage.removeItem(NOSTR_KEYS.PUBLIC_KEY);
    
    toast({
      title: 'Logged out successfully',
    });
  };

  const createAccount = () => {
    try {
      const { privateKey: newPrivateKey, publicKey: newPublicKey } = generateKeys();
      
      // Save keys
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

  const fetchProfile = async (pubkey: string): Promise<NostrProfile | null> => {
    if (!pool) return null;

    try {
      // Fetch metadata event (kind: 0)
      const events = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [
          {
            kinds: [0],
            authors: [pubkey],
          }
        ]
      );

      if (events.length > 0) {
        // Get latest metadata event
        const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
        return parseProfile(latestEvent);
      }

      return {
        pubkey: pubkey,
        npub: hexToNpub(pubkey),
      };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const fetchNotes = async (pubkey?: string): Promise<NostrNote[]> => {
    if (!pool) return [];

    try {
      // Define filter based on whether we want a specific user's notes or global feed
      const filter = pubkey ? 
        {
          kinds: [1], // Text notes only
          authors: [pubkey],
          limit: 20,
        } : 
        {
          kinds: [1], // Text notes only
          limit: 50,
        };

      // Fetch note events
      const events = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [filter]
      );

      // Sort by timestamp (newest first)
      return events
        .sort((a, b) => b.created_at - a.created_at)
        .map(event => parseNote(event));
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
  };

  // Subscribe to notes with real-time updates
  const subscribeToNotes = useCallback((
    pubkey?: string, 
    onNotesReceived?: (notes: NostrNote[]) => void,
    limit: number = 20,
    since?: number
  ): string => {
    if (!pool) return "";

    // Create a unique subscription ID
    const subscriptionId = `sub_${Math.random().toString(36).substring(2, 15)}`;

    // Define filter based on whether we want a specific user's notes or global feed
    const filter: any = pubkey ? 
      {
        kinds: [1], // Text notes only
        authors: [pubkey],
        limit: limit,
      } : 
      {
        kinds: [1], // Text notes only
        limit: limit,
      };

    // Optional: add since parameter for pagination
    if (since) {
      filter.since = since;
    }

    // Create event buffer to collect events before processing
    let eventBuffer: Event[] = [];
    let processTimer: NodeJS.Timeout | null = null;
    
    // Function to process buffered events
    const processEvents = () => {
      if (eventBuffer.length === 0) return;
      
      // Convert events to notes
      const newNotes = eventBuffer
        .map(event => parseNote(event))
        .sort((a, b) => b.created_at - a.created_at);
      
      // Clear buffer
      eventBuffer = [];
      
      // Call the callback if provided
      if (onNotesReceived) {
        onNotesReceived(newNotes);
      }
    };

    try {
      // Subscribe to relays
      const sub = pool.sub(
        relays.filter(r => r.read).map(r => r.url),
        [filter]
      );

      // Handle incoming events
      sub.on('event', (event: Event) => {
        // Buffer the event
        eventBuffer.push(event);

        // Process events after a small delay to batch them
        if (processTimer) {
          clearTimeout(processTimer);
        }
        
        processTimer = setTimeout(processEvents, 200);
      });

      // Handle subscription end (relay provided all historical events up to now)
      sub.on('eose', () => {
        // Process any remaining events
        processEvents();
      });

      // Store the subscription
      setActiveSubscriptions(prev => {
        const newMap = new Map(prev);
        newMap.set(subscriptionId, { sub, filter });
        return newMap;
      });

      return subscriptionId;
    } catch (error) {
      console.error('Error subscribing to notes:', error);
      return "";
    }
  }, [pool, relays]);

  // Unsubscribe from a specific subscription
  const unsubscribeFromNotes = useCallback((subscriptionId: string): void => {
    setActiveSubscriptions(prev => {
      const newMap = new Map(prev);
      const subscription = newMap.get(subscriptionId);
      
      if (subscription) {
        subscription.sub.unsub();
        newMap.delete(subscriptionId);
      }
      
      return newMap;
    });
  }, []);

  const fetchSingleNote = async (id: string): Promise<NostrNote | null> => {
    if (!pool) return null;

    try {
      // Fetch a single note by ID (compliant with NIP-01)
      const events = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [
          {
            kinds: [1], // Text note
            ids: [id],
          }
        ]
      );

      if (events.length > 0) {
        return parseNote(events[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching note:', error);
      return null;
    }
  };

  const updateProfile = async (updatedProfile: NostrProfile): Promise<boolean> => {
    if (!pool) {
      toast({
        title: "Connection error",
        description: "Cannot connect to NOSTR network",
        variant: "destructive"
      });
      return false;
    }
    
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to update your profile",
        variant: "destructive"
      });
      return false;
    }
    
    if (!publicKey) {
      toast({
        title: "Missing public key",
        description: "Your public key is not available",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Convert the profile to NIP-01 metadata format
      const metadata = profileToMetadata(updatedProfile);
      const content = JSON.stringify(metadata);

      // Create metadata event (kind: 0) according to NIP-01
      let event: Event = {
        kind: 0, // Metadata event
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: content,
        id: '', // Will be set below
        sig: '', // Will be set below
      };

      // Calculate id from event data
      event.id = getEventHash(event);
      
      // If using extension, sign with it
      if (window.nostr) {
        try {
          const signedEvent = await window.nostr.signEvent(event);
          
          // Publish to relays
          await Promise.all(
            relays
              .filter(relay => relay.write)
              .map(relay => pool.publish([relay.url], signedEvent))
          );
        } catch (err) {
          console.error("Extension signing error:", err);
          toast({
            title: "Extension signing failed",
            description: "Please check your NOSTR browser extension",
            variant: "destructive"
          });
          return false;
        }
      } else if (privateKey) {
        // Sign with local private key
        event.sig = signEvent(event, privateKey);
        
        // Publish to relays
        await Promise.all(
          relays
            .filter(relay => relay.write)
            .map(relay => pool.publish([relay.url], event))
        );
      } else {
        toast({
          title: "Signing error",
          description: "No private key or extension available for signing",
          variant: "destructive"
        });
        return false;
      }

      // Update local state
      setProfile({
        ...updatedProfile,
        pubkey: publicKey,
        npub: hexToNpub(publicKey)
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });

      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error updating profile",
        description: "There was an error updating your profile",
        variant: "destructive"
      });
      return false;
    }
  };

  const publishNote = async (content: string, tags: string[][] = []): Promise<string | null> => {
    if (!pool) {
      toast({
        title: "Connection error",
        description: "Cannot connect to NOSTR network",
        variant: "destructive"
      });
      return null;
    }
    
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to publish a note",
        variant: "destructive"
      });
      return null;
    }
    
    if (!publicKey) {
      toast({
        title: "Missing public key",
        description: "Your public key is not available",
        variant: "destructive"
      });
      return null;
    }

    try {
      // Create note event (kind: 1) according to NIP-01
      let event: Event = {
        kind: 1, // Text note
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: tags, // Use provided tags
        content: content,
        id: '', // Will be set below
        sig: '', // Will be set below
      };

      // Calculate id from event data
      event.id = getEventHash(event);
      
      // If using extension, sign with it
      if (window.nostr) {
        try {
          const signedEvent = await window.nostr.signEvent(event);
          
          // Publish to relays
          await Promise.all(
            relays
              .filter(relay => relay.write)
              .map(relay => pool.publish([relay.url], signedEvent))
          );
          
          // Add this note to the local state as well
          const newNote = parseNote(signedEvent);
          setNotes(prevNotes => [newNote, ...prevNotes]);
          
          // Return the note ID
          return signedEvent.id;
        } catch (err) {
          console.error("Extension signing error:", err);
          toast({
            title: "Extension signing failed",
            description: "Please check your NOSTR browser extension",
            variant: "destructive"
          });
          return null;
        }
      } else if (privateKey) {
        // Sign with local private key
        event.sig = signEvent(event, privateKey);
        
        // Publish to relays
        await Promise.all(
          relays
            .filter(relay => relay.write)
            .map(relay => pool.publish([relay.url], event))
        );
        
        // Add this note to the local state as well
        const newNote = parseNote(event);
        setNotes(prevNotes => [newNote, ...prevNotes]);
        
        // Return the note ID
        return event.id;
      } else {
        toast({
          title: "Signing error",
          description: "No private key or extension available for signing",
          variant: "destructive"
        });
        return null;
      }
    } catch (error) {
      console.error('Error publishing note:', error);
      toast({
        title: "Error publishing note",
        description: "There was an error publishing your note",
        variant: "destructive"
      });
      return null;
    }
  };

  const followUser = async (pubkey: string): Promise<boolean> => {
    // Implement this with nostr-tools
    toast({
      title: 'Follow feature not implemented yet',
      description: 'Coming soon!',
    });
    return false;
  };

  const unfollowUser = async (pubkey: string): Promise<boolean> => {
    // Implement this with nostr-tools
    toast({
      title: 'Unfollow feature not implemented yet',
      description: 'Coming soon!',
    });
    return false;
  };

  const likeNote = async (noteId: string): Promise<boolean> => {
    // Implement this with nostr-tools
    toast({
      title: 'Like feature not implemented yet',
      description: 'Coming soon!',
    });
    return false;
  };

  const repostNote = async (noteId: string): Promise<boolean> => {
    // Implement this with nostr-tools
    toast({
      title: 'Repost feature not implemented yet',
      description: 'Coming soon!',
    });
    return false;
  };

  // Relay management functions
  const addRelay = (url: string, read: boolean, write: boolean) => {
    // Check if relay already exists
    const existingRelay = relays.find(relay => relay.url === url);
    if (existingRelay) {
      toast({
        title: 'Relay already exists',
        description: 'This relay is already in your list',
      });
      return;
    }

    // Add new relay
    const newRelays = [...relays, { url, read, write }];
    setRelays(newRelays);
    
    // Save to local storage
    localStorage.setItem(NOSTR_KEYS.RELAYS, JSON.stringify(newRelays));
    
    // Connect to new relay
    if (pool) {
      try {
        pool.ensureRelay(url);
        toast({
          title: 'Relay added',
          description: `${url} has been added to your relays`,
        });
      } catch (error) {
        console.error('Error connecting to relay:', error);
        toast({
          title: 'Error connecting to relay',
          description: 'Could not connect to the relay',
          variant: 'destructive',
        });
      }
    }
  };

  const removeRelay = (url: string) => {
    // Remove relay from list
    const newRelays = relays.filter(relay => relay.url !== url);
    setRelays(newRelays);
    
    // Save to local storage
    localStorage.setItem(NOSTR_KEYS.RELAYS, JSON.stringify(newRelays));
    
    // Close connection to relay
    if (pool) {
      try {
        pool.close([url]);
        toast({
          title: 'Relay removed',
          description: `${url} has been removed from your relays`,
        });
      } catch (error) {
        console.error('Error disconnecting from relay:', error);
      }
    }
  };

  const updateRelay = (url: string, read: boolean, write: boolean) => {
    // Update relay settings
    const newRelays = relays.map(relay => 
      relay.url === url ? { ...relay, read, write } : relay
    );
    setRelays(newRelays);
    
    // Save to local storage
    localStorage.setItem(NOSTR_KEYS.RELAYS, JSON.stringify(newRelays));
    
    toast({
      title: 'Relay updated',
      description: `Settings for ${url} have been updated`,
    });
  };

  const saveRelaysToStorage = () => {
    localStorage.setItem(NOSTR_KEYS.RELAYS, JSON.stringify(relays));
    toast({
      title: 'Relays saved',
      description: 'Your relay settings have been saved',
    });
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
    login,
    loginWithPrivateKey,
    logout,
    createAccount,
    fetchProfile,
    fetchNotes,
    fetchSingleNote,
    updateProfile,
    publishNote,
    followUser,
    unfollowUser,
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
