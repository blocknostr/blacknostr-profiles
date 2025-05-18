import React, { createContext, useContext, useState, useEffect } from 'react';
import { SimplePool, Event, getEventHash, signEvent, getPublicKey } from 'nostr-tools';
import { toast } from '@/components/ui/use-toast';
import {
  DEFAULT_RELAYS,
  NostrRelayConfig,
  NostrProfile,
  NostrNote,
  NostrStats,
  NostrMetadata,
  getKeys,
  generateKeys,
  saveKeys,
  parseProfile,
  parseNote,
  profileToMetadata,
  NOSTR_KEYS,
  hexToNpub,
  EVENT_KINDS,
  verifyEventSignature
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
  replyToNote: (noteId: string, content?: string) => Promise<boolean>;
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
          await fetchNotes(savedPublicKey, 15);
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

        await fetchNotes(pubkey, 15);
        
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
        description: 'Welcome back to BlockNostr',
      });

      // Fetch profile and notes
      const userProfile = await fetchProfile(savedPublicKey);
      if (userProfile) {
        setProfile(userProfile);
        setNpub(userProfile.npub || null);
      }

      await fetchNotes(savedPublicKey, 15);
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
        description: 'Welcome to BlockNostr',
      });

      // Fetch profile and notes
      const userProfile = await fetchProfile(derivedPublicKey);
      if (userProfile) {
        setProfile(userProfile);
      }

      await fetchNotes(derivedPublicKey, 15);
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
        description: 'Welcome to BlockNostr',
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
            kinds: [EVENT_KINDS.METADATA],
            authors: [pubkey],
            limit: 1,
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

  const fetchNotes = async (pubkey?: string, limit: number = 15): Promise<NostrNote[]> => {
    if (!pool) return [];

    try {
      setCurrentPubkey(pubkey || null);
      setHasMoreNotes(true);
      
      // Define filter based on whether we want a specific user's notes or global feed
      const filter = pubkey ? 
        {
          kinds: [EVENT_KINDS.TEXT_NOTE], // Text notes only
          authors: [pubkey],
          limit: limit,
        } : 
        {
          kinds: [EVENT_KINDS.TEXT_NOTE], // Text notes only
          limit: limit,
        };

      // Fetch note events
      const events = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [filter]
      );

      // Sort by timestamp (newest first)
      const sortedNotes = events
        .filter(event => verifyEventSignature(event))
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
    if (!pool || !lastEventId) return [];
    
    try {
      // Define filter for loading more notes
      const filter = currentPubkey ? 
        {
          kinds: [EVENT_KINDS.TEXT_NOTE],
          authors: [currentPubkey],
          limit: count,
          until: Math.floor((new Date(notes[notes.length - 1].created_at * 1000).getTime() - 1) / 1000),
        } : 
        {
          kinds: [EVENT_KINDS.TEXT_NOTE],
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
        .filter(event => verifyEventSignature(event))
        .sort((a, b) => b.created_at - a.created_at)
        .map(event => parseNote(event));
      
      if (sortedNotes.length > 0) {
        // Update last event ID
        setLastEventId(sortedNotes[sortedNotes.length - 1].id);
        // Append new notes to existing notes
        setNotes([...notes, ...sortedNotes]);
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
        kind: EVENT_KINDS.METADATA, // Metadata event
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
    if (!pool || !publicKey) {
      toast({
        title: "Error",
        description: "You must be logged in to publish a note",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Create a text note event (kind: 1)
      let event: Event = {
        kind: EVENT_KINDS.TEXT_NOTE,
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: content,
        id: '',
        sig: '',
      };

      // Calculate event ID
      event.id = getEventHash(event);

      // Sign the event
      if (window.nostr) {
        try {
          event = await window.nostr.signEvent(event);
        } catch (err) {
          console.error("Extension signing error:", err);
          toast({
            title: "Signing failed",
            description: "Please check your NOSTR browser extension",
            variant: "destructive"
          });
          return false;
        }
      } else if (privateKey) {
        event.sig = signEvent(event, privateKey);
      } else {
        toast({
          title: "Signing error",
          description: "No private key or extension available for signing",
          variant: "destructive"
        });
        return false;
      }

      // Publish to relays
      await Promise.all(
        relays
          .filter(relay => relay.write)
          .map(relay => pool.publish([relay.url], event))
      );

      // Add the new note to the list
      const newNote = parseNote(event);
      setNotes(prevNotes => [newNote, ...prevNotes]);

      toast({
        title: "Note published",
        description: "Your note has been published to the network",
      });

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
    if (!pool || !publicKey || !privateKey) return false;

    try {
      // Get existing contacts
      const contactsEvents = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [
          {
            kinds: [EVENT_KINDS.CONTACTS],
            authors: [publicKey],
          }
        ]
      );
      
      // Prepare tags for the contacts event
      let tags: string[][] = [];
      
      if (contactsEvents.length > 0) {
        // Get latest contacts event
        const latestContacts = contactsEvents.sort((a, b) => b.created_at - a.created_at)[0];
        
        // Get existing tags and filter out the pubkey if it's already followed
        tags = latestContacts.tags.filter(tag => tag[0] !== 'p' || tag[1] !== pubkey);
      }
      
      // Add new pubkey to follow
      tags.push(['p', pubkey]);

      // Create contacts event (kind: 3)
      let event: Event = {
        kind: EVENT_KINDS.CONTACTS,
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: tags,
        content: '',
        id: '',
        sig: '',
      };

      // Calculate event ID
      event.id = getEventHash(event);
      
      // Sign the event
      if (window.nostr) {
        try {
          event = await window.nostr.signEvent(event);
        } catch (err) {
          console.error("Extension signing error:", err);
          return false;
        }
      } else {
        event.sig = signEvent(event, privateKey);
      }
      
      // Publish to relays
      await Promise.all(
        relays
          .filter(relay => relay.write)
          .map(relay => pool.publish([relay.url], event))
      );
      
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

  const unfollowUser = async (pubkey: string): Promise<boolean> => {
    if (!pool || !publicKey || !privateKey) return false;
    
    try {
      // Get existing contacts
      const contactsEvents = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [
          {
            kinds: [EVENT_KINDS.CONTACTS],
            authors: [publicKey],
          }
        ]
      );
      
      if (contactsEvents.length === 0) {
        // No contacts to unfollow
        return false;
      }
      
      // Get latest contacts event
      const latestContacts = contactsEvents.sort((a, b) => b.created_at - a.created_at)[0];
      
      // Filter out the pubkey to unfollow
      const tags = latestContacts.tags.filter(tag => tag[0] !== 'p' || tag[1] !== pubkey);
      
      // Create contacts event (kind: 3)
      let event: Event = {
        kind: EVENT_KINDS.CONTACTS,
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: tags,
        content: '',
        id: '',
        sig: '',
      };
      
      // Calculate event ID
      event.id = getEventHash(event);
      
      // Sign the event
      if (window.nostr) {
        try {
          event = await window.nostr.signEvent(event);
        } catch (err) {
          console.error("Extension signing error:", err);
          return false;
        }
      } else {
        event.sig = signEvent(event, privateKey);
      }
      
      // Publish to relays
      await Promise.all(
        relays
          .filter(relay => relay.write)
          .map(relay => pool.publish([relay.url], event))
      );
      
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

  const likeNote = async (noteId: string): Promise<boolean> => {
    if (!pool || !publicKey || !privateKey) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to like notes",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Create reaction event (kind: 7) - NIP-25
      let event: Event = {
        kind: EVENT_KINDS.REACTION,
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', noteId], // The note being reacted to
          ['p', notes.find(note => note.id === noteId)?.pubkey || ''] // The author of the note
        ],
        content: '+', // '+' for like, other content for other reactions
        id: '',
        sig: '',
      };

      // Calculate event ID
      event.id = getEventHash(event);

      // Sign the event
      if (window.nostr) {
        try {
          event = await window.nostr.signEvent(event);
        } catch (err) {
          console.error("Extension signing error:", err);
          toast({
            title: "Signing failed",
            description: "Please check your NOSTR browser extension",
            variant: "destructive"
          });
          return false;
        }
      } else if (privateKey) {
        event.sig = signEvent(event, privateKey);
      } else {
        toast({
          title: "Signing error",
          description: "No private key or extension available for signing",
          variant: "destructive"
        });
        return false;
      }

      // Publish to relays
      await Promise.all(
        relays
          .filter(relay => relay.write)
          .map(relay => pool.publish([relay.url], event))
      );

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

  const repostNote = async (noteId: string): Promise<boolean> => {
    if (!pool || !publicKey || !privateKey) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to repost notes",
        variant: "destructive"
      });
      return false;
    }

    try {
      const originalNote = notes.find(note => note.id === noteId);
      if (!originalNote) {
        toast({
          title: "Note not found",
          description: "The note you are trying to repost cannot be found",
          variant: "destructive"
        });
        return false;
      }

      // Create repost event (kind: 6) - NIP-18
      let event: Event = {
        kind: EVENT_KINDS.REPOST,
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', noteId], // The note being reposted
          ['p', originalNote.pubkey] // The author of the original note
        ],
        content: JSON.stringify({
          content: originalNote.content,
          created_at: originalNote.created_at,
          id: originalNote.id,
          kind: originalNote.kind,
          pubkey: originalNote.pubkey,
          sig: originalNote.sig,
          tags: originalNote.tags,
        }),
        id: '',
        sig: '',
      };

      // Calculate event ID
      event.id = getEventHash(event);

      // Sign the event
      if (window.nostr) {
        try {
          event = await window.nostr.signEvent(event);
        } catch (err) {
          console.error("Extension signing error:", err);
          toast({
            title: "Signing failed",
            description: "Please check your NOSTR browser extension",
            variant: "destructive"
          });
          return false;
        }
      } else if (privateKey) {
        event.sig = signEvent(event, privateKey);
      } else {
        toast({
          title: "Signing error",
          description: "No private key or extension available for signing",
          variant: "destructive"
        });
        return false;
      }

      // Publish to relays
      await Promise.all(
        relays
          .filter(relay => relay.write)
          .map(relay => pool.publish([relay.url], event))
      );

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

  const replyToNote = async (noteId: string, content?: string): Promise<boolean> => {
    if (!pool || !publicKey || !privateKey) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to reply to notes",
        variant: "destructive"
      });
      return false;
    }

    if (!content) {
      // Open reply dialog or navigate to reply form
      toast({
        title: "Reply feature",
        description: "Reply composition UI will be shown here",
      });
      return true; // Just indicating the UI should open
    }

    try {
      const originalNote = notes.find(note => note.id === noteId);
      if (!originalNote) {
        toast({
          title: "Note not found",
          description: "The note you are trying to reply to cannot be found",
          variant: "destructive"
        });
        return false;
      }

      // Create reply event (kind: 1 with e and p tags) - NIP-10
      let event: Event = {
        kind: EVENT_KINDS.TEXT_NOTE,
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', noteId, '', 'reply'], // The note being replied to (with 'reply' marker)
          ['p', originalNote.pubkey] // The author of the original note
        ],
        content: content,
        id: '',
        sig: '',
      };

      // Calculate event ID
      event.id = getEventHash(event);

      // Sign the event
      if (window.nostr) {
        try {
          event = await window.nostr.signEvent(event);
        } catch (err) {
          console.error("Extension signing error:", err);
          toast({
            title: "Signing failed",
            description: "Please check your NOSTR browser extension",
            variant: "destructive"
          });
          return false;
        }
      } else if (privateKey) {
        event.sig = signEvent(event, privateKey);
      } else {
        toast({
          title: "Signing error",
          description: "No private key or extension available for signing",
          variant: "destructive"
        });
        return false;
      }

      // Publish to relays
      await Promise.all(
        relays
          .filter(relay => relay.write)
          .map(relay => pool.publish([relay.url], event))
      );

      // Add the reply to the feed
      const newNote = parseNote(event);
      setNotes(prevNotes => [newNote, ...prevNotes]);

      return true;
    } catch (error) {
      console.error('Error replying to note:', error);
      toast({
        title: "Error replying to note",
        description: "There was an error posting your reply",
        variant: "destructive"
      });
      return false;
    }
  };

  const checkIfLiked = async (noteId: string): Promise<boolean> => {
    if (!pool || !publicKey) return false;

    try {
      // Check for reaction events from the current user for this note
      const reactions = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [
          {
            kinds: [EVENT_KINDS.REACTION],
            authors: [publicKey],
            '#e': [noteId],
          }
        ]
      );

      // Return true if there are any like reactions (with '+' content)
      return reactions.some(event => event.content === '+');
    } catch (error) {
      console.error('Error checking if note is liked:', error);
      return false;
    }
  };

  const checkIfReposted = async (noteId: string): Promise<boolean> => {
    if (!pool || !publicKey) return false;

    try {
      // Check for repost events from the current user for this note
      const reposts = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [
          {
            kinds: [EVENT_KINDS.REPOST],
            authors: [publicKey],
            '#e': [noteId],
          }
        ]
      );

      return reposts.length > 0;
    } catch (error) {
      console.error('Error checking if note is reposted:', error);
      return false;
    }
  };

  const getNoteStats = async (noteId: string): Promise<NostrStats> => {
    if (!pool) {
      return { likeCount: 0, repostCount: 0, replyCount: 0 };
    }

    try {
      // Get likes (reactions)
      const likes = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [
          {
            kinds: [EVENT_KINDS.REACTION],
            '#e': [noteId],
          }
        ]
      );

      // Filter to only '+' reactions
      const likeCount = likes.filter(event => event.content === '+').length;

      // Get reposts
      const reposts = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [
          {
            kinds: [EVENT_KINDS.REPOST],
            '#e': [noteId],
          }
        ]
      );

      // Get replies
      const replies = await pool.list(
        relays.filter(r => r.read).map(r => r.url),
        [
          {
            kinds: [EVENT_KINDS.TEXT_NOTE],
            '#e': [noteId],
          }
        ]
      );

      // Filter replies to exclude reposts
      const trueReplies = replies.filter(event => event.kind === EVENT_KINDS.TEXT_NOTE);

      return {
        likeCount,
        repostCount: reposts.length,
        replyCount: trueReplies.length,
      };
    } catch (error) {
      console.error('Error fetching note stats:', error);
      return { likeCount: 0, repostCount: 0, replyCount: 0 };
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
    replyToNote,
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
