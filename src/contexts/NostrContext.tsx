import React, { createContext, useContext, useState, useEffect } from 'react';
import { SimplePool, Event } from 'nostr-tools';
import { toast } from '@/components/ui/use-toast';
import {
  DEFAULT_RELAYS,
  NostrRelayConfig,
  NostrProfile,
  NostrNote,
  getKeys,
  generateKeys,
  saveKeys,
  parseProfile,
  parseNote,
  NOSTR_KEYS
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
  login: () => void;
  logout: () => void;
  createAccount: () => void;
  fetchProfile: (pubkey: string) => Promise<NostrProfile | null>;
  fetchNotes: (pubkey?: string) => Promise<NostrNote[]>;
  publishNote: (content: string) => Promise<boolean>;
  followUser: (pubkey: string) => Promise<boolean>;
  unfollowUser: (pubkey: string) => Promise<boolean>;
  likeNote: (noteId: string) => Promise<boolean>;
  repostNote: (noteId: string) => Promise<boolean>;
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
      if (pool) pool.close(relays.map(relay => relay.url));
    };
  }, []);

  const login = () => {
    try {
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

  const logout = () => {
    setPrivateKey(null);
    setPublicKey(null);
    setProfile(null);
    setNotes([]);
    setIsAuthenticated(false);
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
      setIsAuthenticated(true);
      
      toast({
        title: 'Account created successfully',
        description: 'Welcome to NOSTR',
      });
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: 'Error creating account',
        description: 'Please try again',
        variant: 'destructive',
      });
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

  const publishNote = async (content: string): Promise<boolean> => {
    if (!pool || !privateKey || !publicKey) return false;

    // Implement this with nostr-tools
    // You'll need to create a signed event and publish it
    // This is a placeholder for now
    toast({
      title: 'Note publishing not implemented yet',
      description: 'Coming soon!',
    });

    return false;
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
    logout,
    createAccount,
    fetchProfile,
    fetchNotes,
    publishNote,
    followUser,
    unfollowUser,
    likeNote,
    repostNote,
  };

  return (
    <NostrContext.Provider value={value}>
      {children}
    </NostrContext.Provider>
  );
};
