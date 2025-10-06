
import { useMemo, useEffect, useState } from 'react';
import Fuse from 'fuse.js';
import unidecode from 'unidecode';
import type { SearchablePlayer } from '@/types/bbgm';

// Normalization function as per the new requirements
export const normalizeText = (s: string): string => {
  if (!s) return '';
  return unidecode(s)
    .toLowerCase()
    .trim()
    .replace(/[\u0300-\u036f]/g, '') // Redundant with unidecode, but safe
    .replace(/['".,-]/g, '') // Strip punctuation
    .replace(/\s+/g, ' '); // Collapse spaces
};

// Custom hook for Fuse.js search
export function useFuseSearch(
  items: SearchablePlayer[],
  options: {
    delay?: number;
    maxResults?: number;
  } = {}
) {
  const { delay = 150, maxResults = 50 } = options;
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, delay);

  // 1. Precompute and cache normalized search keys for each player
  const searchableItems = useMemo(() => {
    return items.map(player => ({
      ...player,
      // This key is what Fuse.js will search against
      searchKey: normalizeText(player.name),
      // Store original name for display
      displayName: player.name,
    }));
  }, [items]);

  // 2. Memoize the Fuse instance
  const fuse = useMemo(() => {
    const fuseOptions = {
      keys: ['searchKey'],
      includeScore: true,
      includeMatches: true,
      threshold: 0.4, // Adjust for desired fuzziness
      distance: 100,
      // Custom sort to prioritize matches
      sortFn: (a: any, b: any) => {
        // Exact matches first
        if (a.item.searchKey === debouncedQuery) return -1;
        if (b.item.searchKey === debouncedQuery) return 1;
        
        // Starts-with matches next
        const aStartsWith = a.item.searchKey.startsWith(debouncedQuery);
        const bStartsWith = b.item.searchKey.startsWith(debouncedQuery);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // Then by Fuse score
        return a.score - b.score;
      },
    };
    return new Fuse(searchableItems, fuseOptions);
  }, [searchableItems, debouncedQuery]);

  // 3. Perform the search
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      // Return top items when search is empty, preserving original structure
      return searchableItems.slice(0, maxResults).map((item, index) => ({ item, matches: [], score: 1, refIndex: index }));
    }
    return fuse.search(normalizeText(debouncedQuery)).slice(0, maxResults);
  }, [fuse, debouncedQuery, searchableItems, maxResults]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching: searchQuery !== debouncedQuery,
  };
}

// Simple debounce hook (retained for use with Fuse search)
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
