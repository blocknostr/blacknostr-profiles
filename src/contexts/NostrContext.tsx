import React, { createContext, useContext, useState, useEffect } from 'react';
import { SimplePool, Event, getEventHash, signEvent as nostrSignEvent } from 'nostr-tools';
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
  loginWithPrivateKey: (privateKey: string) => Promise<boolean>;
  logout: () => void;
  createAccount: () => void;
  fetchProfile: (pubkey: string) => Promise<NostrProfile | null>;
  fetchNotes: (pubkey?: string, pubkeys?: string[]) => Promise<NostrNote[]>;
  updateProfile: (updatedProfile: NostrProfile) => Promise<boolean>;
  publishNote: (content: string) => Promise<boolean>;
  followUser: (pubkey: string) => Promise<boolean>;
  unfollowUser: (pubkey: string) => Promise<boolean>;
  getFollowingList: () => Promise<string[]>;
  likeNote: (noteId: string) => Promise<boolean>;
  repostNote: (noteId: string, content?: string) => Promise<boolean>;
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
  const [following, setFollowing] = useState<string[]>([]);

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
          setNpub(hexToNpub(savedPublicKey));
          setIsAuthenticated(true);

          // Fetch user profile
          const userProfile = await fetchProfile(savedPublicKey);
          if (userProfile) {
            setProfile(userProfile);
          }

          // Fetch following list
          const followList = await fetchFollowingList(savedPublicKey);
          setFollowing(followList);

          // Fetch user's notes
          await fetchNotes(savedPublicKey);
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
        const userProfile = await fetchProfile(pubkey);
        if (userProfile) {
          setProfile(userProfile);
        }

        // Fetch following list
        const followList = await fetchFollowingList(pubkey);
        setFollowing(followList);

        // Fetch notes
        await fetchNotes(pubkey);
        
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
      setNpub(hexToNpub(savedPublicKey));
      setIsAuthenticated(true);
      
      toast({
        title: 'Logged in successfully',
        description: 'Welcome back to NOSTR',
      });

      // Fetch profile and notes
      const userProfile = await fetchProfile(savedPublicKey);
      if (userProfile) {
        setProfile(userProfile);
      }

      // Fetch following list
      const followList = await fetchFollowingList(savedPublicKey);
      setFollowing(followList);

      // Fetch notes
      await fetchNotes(savedPublicKey);
    } catch (error) {
      console.error('Error logging in:', error);
      toast({
        title: 'Error logging in',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const loginWithPrivateKey = async (inputPrivateKey: string): Promise<boolean> => {
    try {
      // Get public key from private key using nostr-tools
      const derivedPublicKey = getPublicKeyFromPrivate(inputPrivateKey);
      
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

      // Fetch following list
      const followList = await fetchFollowingList(derivedPublicKey);
      setFollowing(followList);

      // Fetch notes
      await fetchNotes(derivedPublicKey);
      
      return true;
    } catch (error) {
      console.error('Error logging in with private key:', error);
      toast({
        title: 'Invalid private key',
        description: 'The provided private key is not valid',
        variant: 'destructive',
      });
      return false;
    }
  };

  const logout = () => {
    setPrivateKey(null);
    setPublicKey(null);
    setProfile(null);
    setNotes([]);
    setFollowing([]);
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

  const fetchFollowingList = async (pubkey: string): Promise<string[]> => {
    if (!pool) return [];

    try {
      // Fetch contacts event (kind: 3) as per NIP-02
      const relayUrls = getRelayUrls(relays, true);
      const events = await pool.list(
        relayUrls,
        [
          {
            kinds: [3],
            authors: [pubkey],
          }
        ]
      );

      if (events.length > 0) {
        // Get latest contacts event
        const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
        
        // Extract followed pubkeys from the tags
        const followedPubkeys = latestEvent.tags
          .filter(tag => tag[0] === 'p')
          .map(tag => tag[1]);
        
        return followedPubkeys;
      }

      return [];
    } catch (error) {
      console.error('Error fetching following list:', error);
      return [];
    }
  };

  const getFollowingList = async (): Promise<string[]> => {
    if (!publicKey) return [];
    
    // If we already have the following list, return it
    if (following.length > 0) {
      return following;
    }
    
    // Otherwise, fetch it
    const followingList = await fetchFollowingList(publicKey);
    setFollowing(followingList);
    return followingList;
  };

  const fetchNotes = async (pubkey?: string, pubkeys?: string[]): Promise<NostrNote[]> => {
    if (!pool) return [];

    try {
      let filter;
      
      // Define filter based on parameters
      if (pubkey) {
        // Fetch notes by specific user
        filter = {
          kinds: [1], // Text notes only
          authors: [pubkey],
          limit: 20,
        };
      } else if (pubkeys && pubkeys.length > 0) {
        // Fetch notes by list of users (following)
        filter = {
          kinds: [1], // Text notes only
          authors: pubkeys,
          limit: 50,
        };
      } else {
        // Fetch global feed
        filter = {
          kinds: [1], // Text notes only
          limit: 50,
        };
      }

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
        event.sig = nostrSignEvent(event, privateKey);
        
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
      } else {
        // Sign with local private key
        event.sig = nostrSignEvent(event, privateKey);
        
        // Publish to relays
        const writeRelayUrls = getRelayUrls(relays.filter(r => r.write));
        await Promise.all(
          writeRelayUrls.map(url => pool.publish([url], event))
        );
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

  // Follow user implementation according to NIP-02
  const followUser = async (pubkeyToFollow: string): Promise<boolean> => {
    if (!pool || !publicKey || !privateKey) {
      toast({
        title: "Error",
        description: "Not authenticated or connection issue",
        variant: "destructive"
      });
      return false;
    }

    try {
      // First get the current contact list
      const currentFollowing = await getFollowingList();
      
      // Check if already following
      if (currentFollowing.includes(pubkeyToFollow)) {
        toast({
          title: "Already following",
          description: "You are already following this user",
        });
        return true;
      }
      
      // Add the new pubkey to the list
      const newFollowing = [...currentFollowing, pubkeyToFollow];
      
      // Create tags for each followed pubkey
      const tags = newFollowing.map(pk => ['p', pk]);
      
      // Create contact list event (kind: 3) according to NIP-02
      let event: Event = {
        kind: 3, // Contact list
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: tags,
        content: '', // Content can be empty or contain additional metadata
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
      } else {
        // Sign with local private key
        event.sig = nostrSignEvent(event, privateKey);
        
        // Publish to relays
        const writeRelayUrls = getRelayUrls(relays.filter(r => r.write));
        await Promise.all(
          writeRelayUrls.map(url => pool.publish([url], event))
        );
      }

      // Update local state
      setFollowing(newFollowing);
      
      toast({
        title: "User followed",
        description: "You are now following this user",
      });
      
      return true;
    } catch (error) {
      console.error('Error following user:', error);
      toast({
        title: "Error following user",
        description: "There was an error following this user",
        variant: "destructive"
      });
      return false;
    }
  };

  // Unfollow user implementation according to NIP-02
  const unfollowUser = async (pubkeyToUnfollow: string): Promise<boolean> => {
    if (!pool || !publicKey || !privateKey) {
      toast({
        title: "Error",
        description: "Not authenticated or connection issue",
        variant: "destructive"
      });
      return false;
    }

    try {
      // First get the current contact list
      const currentFollowing = await getFollowingList();
      
      // Check if not following
      if (!currentFollowing.includes(pubkeyToUnfollow)) {
        toast({
          title: "Not following",
          description: "You are not following this user",
        });
        return true;
      }
      
      // Remove the pubkey from the list
      const newFollowing = currentFollowing.filter(pk => pk !== pubkeyToUnfollow);
      
      // Create tags for each followed pubkey
      const tags = newFollowing.map(pk => ['p', pk]);
      
      // Create contact list event (kind: 3) according to NIP-02
      let event: Event = {
        kind: 3, // Contact list
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: tags,
        content: '', // Content can be empty or contain additional metadata
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
      } else {
        // Sign with local private key
        event.sig = nostrSignEvent(event, privateKey);
        
        // Publish to relays
        const writeRelayUrls = getRelayUrls(relays.filter(r => r.write));
        await Promise.all(
          writeRelayUrls.map(url => pool.publish([url], event))
        );
      }

      // Update local state
      setFollowing(newFollowing);
      
      toast({
        title: "User unfollowed",
        description: "You have unfollowed this user",
      });
      
      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast({
        title: "Error unfollowing user",
        description: "There was an error unfollowing this user",
        variant: "destructive"
      });
      return false;
    }
  };

  // Like note implementation according to NIP-25
  const likeNote = async (noteId: string): Promise<boolean> => {
    if (!pool || !publicKey || !privateKey) {
      toast({
        title: "Error",
        description: "Not authenticated or connection issue",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Find the note to like (to get author pubkey)
      const noteToLike = notes.find(note => note.id === noteId);
      if (!noteToLike) {
        toast({
          title: "Note not found",
          description: "The note you're trying to like was not found",
          variant: "destructive"
        });
        return false;
      }

      // Create reaction event (kind: 7) according to NIP-25
      let event: Event = {
        kind: NOSTR_KINDS.REACTION, // Reaction event (7)
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', noteId], // Reference to the note event
          ['p', noteToLike.pubkey] // Reference to the note author
        ],
        content: '+', // "+" for like, according to NIP-25
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
      } else {
        // Sign with local private key
        event.sig = nostrSignEvent(event, privateKey);
        
        // Publish to relays
        const writeRelayUrls = getRelayUrls(relays.filter(r => r.write));
        await Promise.all(
          writeRelayUrls.map(url => pool.publish([url], event))
        );
      }
      
      toast({
        title: "Note liked",
        description: "You've liked this note",
      });
      
      return true;
    } catch (error) {
      console.error('Error liking note:', error);
      toast({
        title: "Error liking note",
        description: "There was an error liking this note",
        variant: "destructive"
      });
      return false;
    }
  };

  // Repost note implementation according to NIP-18
  const repostNote = async (noteId: string, content?: string): Promise<boolean> => {
    if (!pool || !publicKey || !privateKey) {
      toast({
        title: "Error",
        description: "Not authenticated or connection issue",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Find the note to repost
      const noteToRepost = notes.find(note => note.id === noteId);
      if (!noteToRepost) {
        toast({
          title: "Note not found",
          description: "The note you're trying to repost was not found",
          variant: "destructive"
        });
        return false;
      }

      // Create repost event (kind: 6) according to NIP-18
      let event: Event = {
        kind: 6, // Repost event
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', noteId], // Reference to the note event
          ['p', noteToRepost.pubkey] // Reference to the note author
        ],
        content: content || '', // Optional comment for the repost
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
      } else {
        // Sign with local private key
        event.sig = nostrSignEvent(event, privateKey);
        
        // Publish to relays
        const writeRelayUrls = getRelayUrls(relays.filter(r => r.write));
        await Promise.all(
          writeRelayUrls.map(url => pool.publish([url], event))
        );
      }
      
      toast({
        title: "Note reposted",
        description: "You've reposted this note",
      });
      
      return true;
    } catch (error) {
      console.error('Error reposting note:', error);
      toast({
        title: "Error reposting note",
        description: "There was an error reposting this note",
        variant: "destructive"
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
    getFollowingList,
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
function getPublicKeyFromPrivate(privateKey: string): string {
  // This is a placeholder. In a real implementation, you would use the
  // crypto libraries from nostr-tools to derive the public key
  // from the private key.
  if (typeof privateKey !== 'string' || privateKey.length < 1) {
    throw new Error("Invalid private key");
  }
  
  try {
    // Use the imported function from nostr-tools
    return getPublicKey(privateKey);
  } catch (error) {
    console.error("Error deriving public key:", error);
    throw new Error("Failed to derive public key from private key");
  }
}

// Import the actual function from nostr-tools
import { getPublicKey } from 'nostr-tools';
