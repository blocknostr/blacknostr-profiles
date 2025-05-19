import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SimplePool, Event, getEventHash, signEvent } from 'nostr-tools';
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
  NOSTR_KINDS
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
  // New streaming methods
  streamNotes: (
    pubkey?: string | null, 
    limit?: number, 
    onNotes?: (notes: NostrNote[], isEose: boolean) => void, 
    since?: number | null,
    until?: number | null
  ) => string;
  unsubscribe: (subscriptionId: string) => void;
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
  
  // Track active subscriptions
  const [subscriptions, setSubscriptions] = useState<Map<string, { sub: any, relays: string[] }>>(
    new Map()
  );

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

          // Fetch user's notes - now we'll use the new streamNotes method
          // This first call still uses fetchNotes for backward compatibility
          const userNotes = await fetchNotes(savedPublicKey);
          setNotes(userNotes);
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

    // Clean up
    return () => {
      // Close all subscriptions
      subscriptions.forEach((sub, id) => {
        if (pool && sub.sub) {
          try {
            // FIX: Use correct method signature for pool.close()
            // Based on nostr-tools, we should close the subscription directly
            pool.close(sub.sub);
          } catch (err) {
            console.error(`Error closing subscription ${id}:`, err);
          }
        }
      });
      
      // Close the pool connection to all relays
      if (pool) {
        try {
          // FIX: Only pass the relay URLs to pool.close()
          pool.close(relays.map(relay => relay.url));
        } catch (err) {
          console.error('Error closing relay pool:', err);
        }
      }
    };
  }, []); // Note: We don't include subscriptions or pool here to avoid recreation

  // Function to unsubscribe from a specific subscription
  const unsubscribe = useCallback((subscriptionId: string) => {
    if (!pool) return;
    
    const subscription = subscriptions.get(subscriptionId);
    if (subscription) {
      try {
        // FIX: Use correct method signature for pool.close()
        // Use only the subscription object
        pool.close(subscription.sub);
        setSubscriptions(prev => {
          const next = new Map(prev);
          next.delete(subscriptionId);
          return next;
        });
      } catch (err) {
        console.error(`Error closing subscription ${subscriptionId}:`, err);
      }
    }
  }, [pool, subscriptions]);

  // Stream notes from relays
  const streamNotes = useCallback((
    pubkey?: string | null, 
    limit: number = 10, 
    onNotes?: (notes: NostrNote[], isEose: boolean) => void,
    since?: number | null,
    until?: number | null
  ): string => {
    if (!pool) return "";
    
    // Generate a unique subscription ID
    const subscriptionId = `notes-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Get read relays
    const readRelays = relays.filter(r => r.read).map(r => r.url);
    if (readRelays.length === 0) {
      toast({
        title: "No read relays configured",
        description: "Please add at least one read relay",
        variant: "destructive"
      });
      return "";
    }
    
    // Define filter based on whether we want a specific user's notes or global feed
    const filter = pubkey ? 
      {
        kinds: [NOSTR_KINDS.TEXT_NOTE], // Text notes only (kind 1)
        authors: [pubkey],
        limit: limit || 10,
        ...(since !== undefined && since !== null && { since }),
        ...(until !== undefined && until !== null && { until }),
      } : 
      {
        kinds: [NOSTR_KINDS.TEXT_NOTE], // Text notes only (kind 1)
        limit: limit || 50,
        ...(since !== undefined && since !== null && { since }),
        ...(until !== undefined && until !== null && { until }),
      };

    // Create subscription
    try {
      const sub = pool.sub(readRelays, [filter]);
      
      // Track received notes
      const receivedNotes: NostrNote[] = [];
      
      // Handle incoming events
      sub.on('event', (event: Event) => {
        const note = parseNote(event);
        receivedNotes.push(note);
        
        // Call the callback if provided
        if (onNotes) {
          onNotes([note], false);
        }
      });
      
      // Handle end of stored events
      sub.on('eose', () => {
        if (onNotes) {
          onNotes(receivedNotes, true);
        }
      });
      
      // Store the subscription for cleanup
      setSubscriptions(prev => {
        const next = new Map(prev);
        next.set(subscriptionId, { sub, relays: readRelays });
        return next;
      });
      
      return subscriptionId;
    } catch (error) {
      console.error('Error creating NOSTR subscription:', error);
      toast({
        title: "Subscription error",
        description: "Failed to create subscription to NOSTR relays",
        variant: "destructive"
      });
      return "";
    }
  }, [pool, relays]);

  const login = (pubkey?: string) => {
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

        // Fetch profile and notes
        fetchProfile(pubkey).then(userProfile => {
          if (userProfile) {
            setProfile(userProfile);
          }
        });

        fetchNotes(pubkey).then(userNotes => {
          setNotes(userNotes);
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

      // Fetch profile and notes
      fetchProfile(savedPublicKey).then(userProfile => {
        if (userProfile) {
          setProfile(userProfile);
          setNpub(userProfile.npub || null);
        }
      });

      fetchNotes(savedPublicKey).then(userNotes => {
        setNotes(userNotes);
      });
    } catch (error) {
      console.error('Error logging in:', error);
      toast({
        title: 'Error logging in',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

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
        npub: null,
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
    // Add the new streaming methods
    streamNotes,
    unsubscribe,
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
