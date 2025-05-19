import { useState, useEffect, useCallback } from 'react';
import { Event, Filter } from 'nostr-tools';
import { useNostrContext } from '@/contexts/NostrContext';

interface UseNoteSubscriptionProps {
  pubkey?: string;
  limit?: number;
  since?: number;
  until?: number;
  authors?: string[];
  kinds?: number[];
  searchTerm?: string;
  debounceTime?: number;
  initialNotes?: Event[];
  enableSearch?: boolean;
}

interface FetchResult {
  notes: Event[];
  hasMore: boolean;
  newestTimestamp: number;
}

const useNoteSubscription = ({
  pubkey,
  limit = 20,
  since,
  until,
  authors,
  kinds,
  searchTerm,
  debounceTime = 300,
  initialNotes = [],
  enableSearch = false,
}: UseNoteSubscriptionProps) => {
  const { pool, relays } = useNostrContext();
  const [notes, setNotes] = useState<Event[]>(initialNotes);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [newestTimestamp, setNewestTimestamp] = useState(since || Math.floor(Date.now() / 1000));
  const [oldestTimestamp, setOldestTimestamp] = useState(until || Math.floor(Date.now() / 1000));
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchNotes, setSearchNotes] = useState<Event[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const createSubscription = useCallback(
    (filters: Filter[], callback: (event: Event) => void) => {
      if (!pool) return;

      const sub = pool.sub(relays, filters);

      sub.on('event', callback);

      sub.on('eose', () => {
        console.log('EOSE: Subscription completed');
      });

      return sub;
    },
    [pool, relays]
  );

  const fetchNotes = useCallback(
    async (initial = true): Promise<FetchResult | null> => {
      if (!pool) return null;

      setLoading(true);
      try {
        const currentTimestamp = initial ? newestTimestamp : oldestTimestamp;

        const filters: Filter[] = [
          {
            kinds: kinds || [1],
            ...(authors ? { authors } : {}),
            limit,
            until: currentTimestamp,
          },
        ];

        if (pubkey) {
          filters[0].authors = [pubkey];
        }

        const events: Event[] = await pool.list(relays, filters);

        if (events.length === 0) {
          setHasMore(false);
          setLoading(false);
          return { notes: [], hasMore: false, newestTimestamp };
        }

        const sortedEvents = events.sort((a, b) => b.created_at - a.created_at);

        const newNotes = initial ? sortedEvents : [...notes, ...sortedEvents];

        const minTimestamp = sortedEvents.reduce((min, event) => Math.min(min, event.created_at), currentTimestamp);
        const maxTimestamp = sortedEvents.reduce((max, event) => Math.max(max, event.created_at), 0);

        setNotes((prevNotes) => {
          const existingIds = new Set(prevNotes.map((note) => note.id));
          const uniqueNotes = newNotes.filter((note) => !existingIds.has(note.id));
          return initial ? uniqueNotes : [...prevNotes, ...uniqueNotes];
        });
        setNewestTimestamp(maxTimestamp > newestTimestamp ? maxTimestamp : newestTimestamp);
        setOldestTimestamp(minTimestamp < oldestTimestamp ? minTimestamp : oldestTimestamp);
        setHasMore(events.length >= limit);
        setLoading(false);

        return {
          notes: events,
          hasMore: events.length >= limit,
          newestTimestamp: maxTimestamp,
        };
      } catch (error) {
        console.error('Error fetching notes:', error);
        setLoading(false);
        setHasMore(false);
        return null;
      }
    },
    [pool, relays, limit, newestTimestamp, oldestTimestamp, pubkey, kinds, notes]
  );

  const fetchNewNotes = useCallback(async (): Promise<FetchResult | null> => {
    return fetchNotes(true);
  }, [fetchNotes]);

  const fetchMoreNotes = useCallback(async (): Promise<FetchResult | null> => {
    return fetchNotes(false);
  }, [fetchNotes]);

  const handleSearch = useCallback(
    (term: string) => {
      if (!term) {
        setSearchNotes([]);
        setIsSearchActive(false);
        return;
      }

      setIsSearchActive(true);

      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      setSearchTimeout(
        setTimeout(async () => {
          if (!pool) return;

          const filters: Filter[] = [
            {
              kinds: [1],
              search: term,
              limit: 100,
            },
          ];

          try {
            const events = await pool.list(relays, filters);
            setSearchNotes(events);
          } catch (error) {
            console.error('Error searching notes:', error);
            setSearchNotes([]);
          }
        }, debounceTime)
      );
    },
    [pool, relays, debounceTime, searchTimeout]
  );

  useEffect(() => {
    if (!enableSearch) return;

    handleSearch(searchTerm || '');
  }, [searchTerm, handleSearch, enableSearch]);

  useEffect(() => {
    const loadInitialNotes = async () => {
      setLoading(true);
      try {
        const result = await fetchNotes();
        if (result) {
          setHasMore(result.hasMore);
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error('Error loading initial notes:', error);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    loadInitialNotes();
  }, [fetchNotes]);

  useEffect(() => {
    if (!pool) return;

    const filters: Filter[] = [
      {
        kinds: kinds || [1],
        ...(authors ? { authors } : {}),
        limit: 10,
        since: newestTimestamp + 1,
      },
    ];

    if (pubkey) {
      filters[0].authors = [pubkey];
    }

    const newNoteSub = createSubscription(filters, (event: Event) => {
      setNotes((prevNotes) => {
        if (prevNotes.find((note) => note.id === event.id)) {
          return prevNotes;
        }
        return [event, ...prevNotes];
      });
      setNewestTimestamp(Math.max(newestTimestamp, event.created_at));
    });

    return () => {
      newNoteSub?.unsub();
    };
  }, [createSubscription, newestTimestamp, pool, pubkey, relays, authors, kinds]);

  const loadMoreNotes = async () => {
    if (loading) return;
  
    setLoading(true);
    try {
      const result = await fetchMoreNotes();
      // Add null check before accessing result.hasMore
      setHasMore(result !== null ? result.hasMore : false);
      setLoading(false);
    } catch (error) {
      console.error('Error loading more notes:', error);
      setLoading(false);
      setHasMore(false);
    }
  };

  return {
    notes: isSearchActive ? searchNotes : notes,
    loading,
    hasMore,
    fetchNewNotes,
    fetchMoreNotes,
    handleSearch,
    isSearchActive,
  };
};

export default useNoteSubscription;
