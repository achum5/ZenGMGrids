import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

// Diacritic-insensitive folding utility (consistent with existing implementation)
export const fold = (s: string): string => {
  return s.normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .replace(/'/g, '') // Remove apostrophes for search matching
    .replace(/[-]/g, ' '); // Convert hyphens to spaces for flexible search
};

// Search index interface for type safety
export interface SearchIndex<T> {
  items: T[];
  nameIndex: Map<string, number[]>; // normalized name -> item indices
  fullTextIndex: Map<string, number[]>; // search tokens -> item indices
  exactMatchIndex: Map<string, number>; // exact normalized name -> item index
}

// Generic search result with relevance scoring
export interface SearchResult<T> {
  item: T;
  relevance: number; // Higher = more relevant
  matchType: 'exact' | 'prefix' | 'substring' | 'fuzzy';
}

// Build a search index for fast lookups
export function buildSearchIndex<T>(
  items: T[],
  getSearchText: (item: T) => string[],
  getId: (item: T) => string | number
): SearchIndex<T> {
  const nameIndex = new Map<string, number[]>();
  const fullTextIndex = new Map<string, number[]>();
  const exactMatchIndex = new Map<string, number>();

  items.forEach((item, index) => {
    const searchTexts = getSearchText(item);
    
    searchTexts.forEach(text => {
      const folded = fold(text);
      
      // Add to exact match index (first occurrence only)
      if (!exactMatchIndex.has(folded)) {
        exactMatchIndex.set(folded, index);
      }
      
      // Add to name index
      if (!nameIndex.has(folded)) {
        nameIndex.set(folded, []);
      }
      nameIndex.get(folded)!.push(index);
      
      // Tokenize for full-text search
      const tokens = folded.split(/\s+/).filter(token => token.length > 0);
      tokens.forEach(token => {
        if (!fullTextIndex.has(token)) {
          fullTextIndex.set(token, []);
        }
        fullTextIndex.get(token)!.push(index);
      });
      
      // Add prefixes for better matching
      for (let i = 2; i <= Math.min(folded.length, 6); i++) {
        const prefix = folded.substring(0, i);
        if (!fullTextIndex.has(prefix)) {
          fullTextIndex.set(prefix, []);
        }
        fullTextIndex.get(prefix)!.push(index);
      }
    });
  });

  return {
    items,
    nameIndex,
    fullTextIndex,
    exactMatchIndex
  };
}

// Fast search using pre-built index
export function searchIndex<T>(
  index: SearchIndex<T>,
  query: string,
  maxResults: number = 100
): SearchResult<T>[] {
  if (!query.trim()) {
    return index.items.slice(0, maxResults).map(item => ({
      item,
      relevance: 1,
      matchType: 'exact' as const
    }));
  }

  const queryFolded = fold(query.trim());
  const queryTokens = queryFolded.split(/\s+/).filter(token => token.length > 0);
  
  if (queryTokens.length === 0) {
    return index.items.slice(0, maxResults).map(item => ({
      item,
      relevance: 1,
      matchType: 'exact' as const
    }));
  }

  const resultMap = new Map<number, SearchResult<T>>();
  
  // 1. Exact matches (highest relevance)
  const exactIndex = index.exactMatchIndex.get(queryFolded);
  if (exactIndex !== undefined) {
    resultMap.set(exactIndex, {
      item: index.items[exactIndex],
      relevance: 100,
      matchType: 'exact'
    });
  }
  
  // 2. Prefix matches (high relevance)
  for (const [indexedText, indices] of Array.from(index.nameIndex.entries())) {
    if (indexedText.startsWith(queryFolded)) {
      indices.forEach((idx: number) => {
        if (!resultMap.has(idx)) {
          resultMap.set(idx, {
            item: index.items[idx],
            relevance: 80 - (indexedText.length - queryFolded.length), // Shorter = better
            matchType: 'prefix'
          });
        }
      });
    }
  }
  
  // 3. Substring matches (medium relevance)
  for (const [indexedText, indices] of Array.from(index.nameIndex.entries())) {
    if (indexedText.includes(queryFolded) && !indexedText.startsWith(queryFolded)) {
      indices.forEach((idx: number) => {
        if (!resultMap.has(idx)) {
          resultMap.set(idx, {
            item: index.items[idx],
            relevance: 60,
            matchType: 'substring'
          });
        }
      });
    }
  }
  
  // 4. Token-based fuzzy matches (lower relevance)
  const tokenMatchCounts = new Map<number, number>();
  
  queryTokens.forEach(token => {
    // Exact token matches
    const exactIndices = index.fullTextIndex.get(token) || [];
    exactIndices.forEach(idx => {
      tokenMatchCounts.set(idx, (tokenMatchCounts.get(idx) || 0) + 2);
    });
    
    // Prefix token matches
    for (const [indexedToken, indices] of Array.from(index.fullTextIndex.entries())) {
      if (indexedToken.startsWith(token) && indexedToken !== token) {
        indices.forEach((idx: number) => {
          tokenMatchCounts.set(idx, (tokenMatchCounts.get(idx) || 0) + 1);
        });
      }
    }
  });
  
  // Add fuzzy matches based on token coverage
  for (const [idx, matchCount] of Array.from(tokenMatchCounts.entries())) {
    if (!resultMap.has(idx)) {
      const coverage = matchCount / queryTokens.length;
      if (coverage >= 0.5) { // At least 50% of tokens match
        resultMap.set(idx, {
          item: index.items[idx],
          relevance: Math.floor(40 * coverage),
          matchType: 'fuzzy'
        });
      }
    }
  }
  
  // Convert to array and sort by relevance
  const results = Array.from(resultMap.values())
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults);
  
  return results;
}

// Debounced search hook
export function useDebouncedSearch<T>(
  items: T[],
  getSearchText: (item: T) => string[],
  getId: (item: T) => string | number,
  delay: number = 250
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  // Build search index (memoized for performance)
  const builtIndex = useMemo(() => {
    return buildSearchIndex(items, getSearchText, getId);
  }, [items, getSearchText, getId]);
  
  // Debounce the search query
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, delay);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery, delay]);
  
  // Perform search with memoized results
  const searchResults = useMemo(() => {
    return searchIndex(builtIndex, debouncedQuery);
  }, [builtIndex, debouncedQuery]);
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching: searchQuery !== debouncedQuery,
    debouncedQuery
  };
}

// Simple debounce hook for general use
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

// Memoized search results cache
export function useSearchCache<T>() {
  const cacheRef = useRef(new Map<string, SearchResult<T>[]>());
  
  const getCachedResults = useCallback((query: string): SearchResult<T>[] | undefined => {
    return cacheRef.current.get(query);
  }, []);
  
  const setCachedResults = useCallback((query: string, results: SearchResult<T>[]): void => {
    // Limit cache size to prevent memory issues
    if (cacheRef.current.size > 100) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey !== undefined) {
        cacheRef.current.delete(firstKey);
      }
    }
    cacheRef.current.set(query, results);
  }, []);
  
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);
  
  return {
    getCachedResults,
    setCachedResults,
    clearCache
  };
}

// Combined hook for optimized search with caching
export function useOptimizedSearch<T>(
  items: T[],
  getSearchText: (item: T) => string[],
  getId: (item: T) => string | number,
  options: {
    delay?: number;
    maxResults?: number;
    enableCache?: boolean;
  } = {}
) {
  const { delay = 250, maxResults = 100, enableCache = true } = options;
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, delay);
  const { getCachedResults, setCachedResults } = useSearchCache<T>();
  
  // Build search index (memoized for performance)
  const builtIndex = useMemo(() => {
    return buildSearchIndex(items, getSearchText, getId);
  }, [items, getSearchText, getId]);
  
  // Perform search with caching
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return builtIndex.items.slice(0, maxResults).map(item => ({
        item,
        relevance: 1,
        matchType: 'exact' as const
      }));
    }
    
    // Check cache first
    if (enableCache) {
      const cached = getCachedResults(debouncedQuery);
      if (cached) {
        return cached;
      }
    }
    
    // Perform search
    const results = searchIndex(builtIndex, debouncedQuery, maxResults);
    
    // Cache results
    if (enableCache && results.length > 0) {
      setCachedResults(debouncedQuery, results);
    }
    
    return results;
  }, [builtIndex, debouncedQuery, maxResults, enableCache, getCachedResults, setCachedResults]);
  
  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching: searchQuery !== debouncedQuery,
    debouncedQuery
  };
}