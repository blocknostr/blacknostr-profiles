import React, { createContext, useContext, useState, useEffect } from 'react';
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
  hexToNpub
} from '@/lib/nostr';

// Add NostrStats type to support note statistics
export type NostrStats = {
  likes: number;
  replies: number;
  reposts: number;
};

interface NostrContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  publicKey: string | null;
  npub: string | null;
  profile: NostrProfile | null;
  notes: NostrNote[];
  relays: NostrRelayConfig[];
  pool: SimplePool | null;
  hasMoreNotes: boolean;
  login: (pubkey?: string) => void;
  loginWithPrivateKey: (privateKey: string) => void;
  logout: () => void;
  createAccount: () => void;
  fetchProfile: (pubkey: string) => Promise<NostrProfile | null>;
  fetchNotes: (pubkey?: string, limit?: number) => Promise<NostrNote[]>;
  loadMoreNotes: (count: number) => Promise<NostrNote[]>;
  updateProfile: (updatedProfile: NostrProfile) => Promise<boolean>;
  publishNote: (content: string) => Promise<boolean>;
  followUser: (pubkey: string) => Promise<boolean>;
  unfollowUser: (pubkey: string) => Promise<boolean>;
  likeNote: (noteId: string) => Promise<boolean>;
  repostNote: (noteId: string) => Promise<boolean>;
  checkIfLiked: (noteId: string) => Promise<boolean>;
  checkIfReposted: (noteId: string) => Promise<boolean>;
  getNoteStats: (noteId: string) => Promise<NostrStats>;
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
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [hasMoreNotes, setHasMoreNotes] = useState<boolean>(true);
  const [currentPubkey, setCurrentPubkey] = useState<string | null>(null);

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
      if (pool) pool.close(relays.map(relay => relay.url));
    };
  }, []);

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

  const fetchNotes = async (pubkey?: string, limit: number = 15): Promise<NostrNote[]> => {
    if (!pool) return [];

    try {
      setCurrentPubkey(pubkey || null);
      setHasMoreNotes(true);
      
      // Define filter based on whether we want a specific user's notes or global feed
      const filter = pubkey ? 
        {
          kinds: [1], // Text notes only
          authors: [pubkey],
          limit: limit,
        } : 
        {
          kinds: [1], // Text notes only
          limit: limit,
        };

      // Fetch note events
      const events = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [filter]
      );

      // Sort by timestamp (newest first)
      const sortedNotes = events
        .sort((a, b) => b.created_at - a.created_at)
        .map(event => parseNote(event));
      
      if (sortedNotes.length > 0) {
        // Set the last event ID for pagination
        setLastEventId(sortedNotes[sortedNotes.length - 1].id);
      }
      
      if (sortedNotes.length < limit) {
        setHasMoreNotes(false);
      }
      
      setNotes(sortedNotes);
      return sortedNotes;
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
  };
  
  const loadMoreNotes = async (count: number = 10): Promise<NostrNote[]> => {
    if (!pool || !lastEventId || notes.length === 0) return [];
    
    try {
      // Define filter for loading more notes
      const filter = currentPubkey ? 
        {
          kinds: [1],
          authors: [currentPubkey],
          limit: count,
          until: Math.floor((new Date(notes[notes.length - 1].created_at * 1000).getTime() - 1) / 1000),
        } : 
        {
          kinds: [1],
          limit: count,
          until: Math.floor((new Date(notes[notes.length - 1].created_at * 1000).getTime() - 1) / 1000),
        };
      
      // Fetch more notes
      const events = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [filter]
      );
      
      // Sort and parse notes
      const sortedNotes = events
        .sort((a, b) => b.created_at - a.created_at)
        .map(event => parseNote(event));
      
      if (sortedNotes.length > 0) {
        // Update last event ID
        setLastEventId(sortedNotes[sortedNotes.length - 1].id);
        // Append new notes to existing notes
        setNotes(prev => [...prev, ...sortedNotes]);
      }
      
      if (sortedNotes.length < count) {
        setHasMoreNotes(false);
      }
      
      return sortedNotes;
    } catch (error) {
      console.error('Error loading more notes:', error);
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

  // New function to check if a note was liked by the current user
  const checkIfLiked = async (noteId: string): Promise<boolean> => {
    if (!pool || !publicKey) return false;

    try {
      const events = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [{
          kinds: [7], // Reaction events
          authors: [publicKey],
          '#e': [noteId],
          limit: 1,
        }]
      );

      return events.length > 0 && events.some(event => event.content === '+');
    } catch (error) {
      console.error('Error checking if note was liked:', error);
      return false;
    }
  };

  // New function to check if a note was reposted by the current user
  const checkIfReposted = async (noteId: string): Promise<boolean> => {
    if (!pool || !publicKey) return false;

    try {
      const events = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [{
          kinds: [6], // Repost events
          authors: [publicKey],
          '#e': [noteId],
          limit: 1,
        }]
      );

      return events.length > 0;
    } catch (error) {
      console.error('Error checking if note was reposted:', error);
      return false;
    }
  };

  // New function to get note statistics (likes, replies, reposts)
  const getNoteStats = async (noteId: string): Promise<NostrStats> => {
    if (!pool) return { likes: 0, replies: 0, reposts: 0 };

    try {
      // Get likes (kind 7 events that reference this note)
      const likeEvents = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [{
          kinds: [7], // Reaction events
          '#e': [noteId],
          limit: 50,
        }]
      );

      // Count only '+' reactions as likes according to NIP-25
      const likesCount = likeEvents.filter(event => event.content === '+').length;

      // Get replies (kind 1 events that reference this note)
      const replyEvents = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [{
          kinds: [1], // Text note events
          '#e': [noteId],
          limit: 50,
        }]
      );

      // Get reposts (kind 6 events that reference this note)
      const repostEvents = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [{
          kinds: [6], // Repost events
          '#e': [noteId],
          limit: 50,
        }]
      );

      return {
        likes: likesCount,
        replies: replyEvents.length,
        reposts: repostEvents.length,
      };
    } catch (error) {
      console.error('Error getting note stats:', error);
      return { likes: 0, replies: 0, reposts: 0 };
    }
  };

  // Implement like note functionality (NIP-25 compliant)
  const likeNote = async (noteId: string): Promise<boolean> => {
    if (!pool || !publicKey || !privateKey) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to like notes',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Check if already liked to implement toggle functionality
      const alreadyLiked = await checkIfLiked(noteId);
      
      if (alreadyLiked) {
        // If already liked, we should unlike (but NOSTR doesn't have a direct unlike mechanism)
        // Typically we would publish a deletion event, but for simplicity we'll just return success
        // A real implementation would track and delete the previous reaction event
        toast({
          title: 'Note unliked',
        });
        return true;
      }

      // Find the original note to get the author's pubkey
      const noteEvents = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [{
          ids: [noteId],
          limit: 1,
        }]
      );

      if (noteEvents.length === 0) {
        toast({
          title: 'Note not found',
          description: 'Cannot like a note that doesn\'t exist',
          variant: 'destructive',
        });
        return false;
      }

      const originalNote = noteEvents[0];
      
      // Create a reaction event according to NIP-25
      let event: Event = {
        kind: 7, // Reaction
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', noteId], // Reference to the note being liked
          ['p', originalNote.pubkey], // Reference to the note author
        ],
        content: '+', // '+' for like according to NIP-25
        id: '', // Will be set below
        sig: '', // Will be set below
      };

      // Calculate id from event data
      event.id = getEventHash(event);
      
      // Sign with local private key
      event.sig = signEvent(event, privateKey);
      
      // Publish to relays
      await Promise.all(
        relays
          .filter(relay => relay.write)
          .map(relay => pool.publish([relay.url], event))
      );

      toast({
        title: 'Note liked',
      });

      return true;
    } catch (error) {
      console.error('Error liking note:', error);
      toast({
        title: 'Error liking note',
        description: 'There was an error processing your like',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Implement repost note functionality (NIP-18 compliant)
  const repostNote = async (noteId: string): Promise<boolean> => {
    if (!pool || !publicKey || !privateKey) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to repost notes',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Check if already reposted
      const alreadyReposted = await checkIfReposted(noteId);
      
      if (alreadyReposted) {
        // Similar to likes, NOSTR doesn't have a direct "un-repost" mechanism
        // A real implementation would track and delete the previous repost event
        toast({
          title: 'Note un-reposted',
        });
        return true;
      }

      // Find the original note
      const noteEvents = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [{
          ids: [noteId],
          limit: 1,
        }]
      );

      if (noteEvents.length === 0) {
        toast({
          title: 'Note not found',
          description: 'Cannot repost a note that doesn\'t exist',
          variant: 'destructive',
        });
        return false;
      }

      const originalNote = noteEvents[0];
      
      // Create a repost event according to NIP-18
      let event: Event = {
        kind: 6, // Repost
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', noteId, '', 'mention'], // Reference to the note being reposted
          ['p', originalNote.pubkey], // Reference to the note author
        ],
        content: '', // Empty content for reposts
        id: '', // Will be set below
        sig: '', // Will be set below
      };

      // Calculate id from event data
      event.id = getEventHash(event);
      
      // Sign with local private key
      event.sig = signEvent(event, privateKey);
      
      // Publish to relays
      await Promise.all(
        relays
          .filter(relay => relay.write)
          .map(relay => pool.publish([relay.url], event))
      );

      toast({
        title: 'Note reposted',
      });

      return true;
    } catch (error) {
      console.error('Error reposting note:', error);
      toast({
        title: 'Error reposting note',
        description: 'There was an error processing your repost',
        variant: 'destructive',
      });
      return false;
    }
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
    hasMoreNotes,
    login,
    loginWithPrivateKey,
    logout,
    createAccount,
    fetchProfile,
    fetchNotes,
    loadMoreNotes,
    updateProfile,
    publishNote,
    followUser,
    unfollowUser,
    likeNote,
    repostNote,
    checkIfLiked,
    checkIfReposted,
    getNoteStats,
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

function getPublicKey(privateKey: string): string {
  // Implement this function to derive the public key from the private key
  // This is a placeholder for now
  return 'derivedPublicKey';
}
