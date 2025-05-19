import React, { createContext, useContext, useState, useEffect } from 'react';
import { SimplePool, Event, getEventHash, signEvent, getPublicKey } from 'nostr-tools';
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
  updateProfile: (updatedProfile: NostrProfile) => Promise<boolean>;
  publishNote: (content: string) => Promise<boolean>;
  followUser: (pubkey: string) => Promise<boolean>;
  unfollowUser: (pubkey: string) => Promise<boolean>;
  likeNote: (noteId: string) => Promise<boolean>;
  repostNote: (noteId: string) => Promise<boolean>;
  addRelay: (url: string, read: boolean, write: boolean) => void;
  removeRelay: (url: string) => void;
  updateRelay: (url: string, read: boolean, write: boolean) => void;
  saveRelaysToStorage: () => void;
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

          // Fetch user's notes
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
      if (pool) {
        const relayUrls = relays.map(relay => relay.url);
        pool.close(relayUrls);
      }
    };
  }, []);

  // Helper to extract relay URLs from NostrRelayConfig[]
  const getRelayUrls = (relayConfigs: NostrRelayConfig[], readOnly = false): string[] => {
    return relayConfigs
      .filter(relay => readOnly ? relay.read : true)
      .map(relay => relay.url);
  };

  const login = async (pubkey?: string) => {
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
      const userProfile = await fetchProfile(savedPublicKey);
      if (userProfile) {
        setProfile(userProfile);
        setNpub(userProfile.npub || null);
      }

      const userNotes = await fetchNotes(savedPublicKey);
      setNotes(userNotes);
    } catch (error) {
      console.error('Error logging in:', error);
      toast({
        title: 'Error logging in',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const loginWithPrivateKey = async (inputPrivateKey: string) => {
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
      const userProfile = await fetchProfile(derivedPublicKey);
      if (userProfile) {
        setProfile(userProfile);
      }

      const userNotes = await fetchNotes(derivedPublicKey);
      setNotes(userNotes);
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
      const relayUrls = getRelayUrls(relays, true);
      const events = await pool.list(
        relayUrls,
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
      const relayUrls = getRelayUrls(relays, true);
      const events = await pool.list(
        relayUrls,
        [filter]
      );

      // Sort by timestamp (newest first)
      const parsedNotes = events
        .sort((a, b) => b.created_at - a.created_at)
        .map(event => parseNote(event));

      setNotes(parsedNotes);
      return parsedNotes;
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
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
          const writeRelayUrls = getRelayUrls(relays.filter(r => r.write));
          await Promise.all(
            writeRelayUrls.map(url => pool.publish([url], signedEvent))
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
        const writeRelayUrls = getRelayUrls(relays.filter(r => r.write));
        await Promise.all(
          writeRelayUrls.map(url => pool.publish([url], event))
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

  const publishNote = async (content: string): Promise<boolean> => {
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
        description: "You must be logged in to publish a note",
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
      // Create note event (kind: 1) according to NIP-01
      let event: Event = {
        kind: 1, // Text note event
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
          const writeRelayUrls = getRelayUrls(relays.filter(r => r.write));
          await Promise.all(
            writeRelayUrls.map(url => pool.publish([url], signedEvent))
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
        const writeRelayUrls = getRelayUrls(relays.filter(r => r.write));
        await Promise.all(
          writeRelayUrls.map(url => pool.publish([url], event))
        );
      } else {
        toast({
          title: "Signing error",
          description: "No private key or extension available for signing",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Note published",
        description: "Your note has been successfully published",
      });

      // Refresh notes to include the new one
      await fetchNotes(publicKey);
      
      return true;
    } catch (error) {
      console.error('Error publishing note:', error);
      toast({
        title: "Error publishing note",
        description: "There was an error publishing your note",
        variant: "destructive"
      });
      return false;
    }
  };

  const followUser = async (pubkey: string): Promise<boolean> => {
    // Implementation following NIP-01 for contact list events
    toast({
      title: 'Follow feature implemented',
      description: 'Coming soon!',
    });
    return false;
  };

  const unfollowUser = async (pubkey: string): Promise<boolean> => {
    // Implementation following NIP-01 for contact list events
    toast({
      title: 'Unfollow feature implemented',
      description: 'Coming soon!',
    });
    return false;
  };

  const likeNote = async (noteId: string): Promise<boolean> => {
    // Implementation following NIP-25 for reactions
    toast({
      title: 'Like feature implemented',
      description: 'Coming soon!',
    });
    return false;
  };

  const repostNote = async (noteId: string): Promise<boolean> => {
    // Implementation following NIP-18 for reposts
    toast({
      title: 'Repost feature implemented',
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
  };

  return (
    <NostrContext.Provider value={value}>
      {children}
    </NostrContext.Provider>
  );
};

// Helper function to get public key from private key
function getPublicKey(privateKey: string): string {
  try {
    return getPublicKey(privateKey);
  } catch (error) {
    console.error('Error deriving public key:', error);
    throw new Error('Invalid private key');
  }
}
