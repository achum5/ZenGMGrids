import type { Player } from '@/types/bbgm';
import type { SeasonIndex } from '@/lib/season-achievements';
import { buildSeasonIndex } from '@/lib/season-achievements';

// Cache key structure for season index
interface SeasonIndexCacheKey {
  playersHash: string;
  sport: 'basketball' | 'football' | 'hockey' | 'baseball';
}

// Cache entry with metadata
interface SeasonIndexCacheEntry {
  seasonIndex: SeasonIndex;
  lastUsed: number;
  computeTime: number;
}

// Global season index cache
class SeasonIndexCache {
  private cache = new Map<string, SeasonIndexCacheEntry>();
  private readonly MAX_CACHE_SIZE = 5; // Keep last 5 different league files
  
  // Generate cache key from players data and sport
  private generateCacheKey(players: Player[], sport: 'basketball' | 'football' | 'hockey' | 'baseball'): string {
    // Create a stable hash from players data
    // Use player count, first/last player IDs, and sport to create unique key
    const playerCount = players.length;
    const firstPid = players.length > 0 ? players[0].pid : 0;
    const lastPid = players.length > 0 ? players[players.length - 1].pid : 0;
    
    // Include sample of award data to detect league changes
    const awardSample = players.slice(0, 10)
      .map(p => `${p.pid}:${p.awards?.length || 0}`)
      .join(',');
    
    return `players:${playerCount}-${firstPid}-${lastPid}-${awardSample}-sport:${sport}`;
  }
  
  // Get cached season index or compute if needed
  getCachedSeasonIndex(
    players: Player[], 
    sport: 'basketball' | 'football' | 'hockey' | 'baseball' = 'basketball'
  ): SeasonIndex {
    const cacheKey = this.generateCacheKey(players, sport);
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      // Update last used timestamp
      cached.lastUsed = Date.now();
      this.cache.set(cacheKey, cached);
      return cached.seasonIndex;
    }
    
    // Cache miss - compute season index
    const startTime = performance.now();
    const seasonIndex = buildSeasonIndex(players, sport);
    const computeTime = performance.now() - startTime;
    
    // Store in cache
    const entry: SeasonIndexCacheEntry = {
      seasonIndex,
      lastUsed: Date.now(),
      computeTime
    };
    
    this.cache.set(cacheKey, entry);
    
    // Cleanup old entries if cache is too large
    this.cleanupCache();
    
    console.log(`[SeasonIndexCache] Computed new season index for ${sport} in ${computeTime.toFixed(2)}ms`);
    
    return seasonIndex;
  }
  
  // Clean up old cache entries to prevent memory bloat
  private cleanupCache(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) return;
    
    // Sort by last used timestamp and remove oldest entries
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => b.lastUsed - a.lastUsed);
    
    // Keep only the most recent entries
    this.cache.clear();
    entries.slice(0, this.MAX_CACHE_SIZE).forEach(([key, value]) => {
      this.cache.set(key, value);
    });
    
    console.log(`[SeasonIndexCache] Cleaned up cache, keeping ${this.cache.size} entries`);
  }
  
  // Clear entire cache (useful for testing or forced refresh)
  clearCache(): void {
    this.cache.clear();
    console.log('[SeasonIndexCache] Cache cleared');
  }
  
  // Get cache statistics for debugging
  getCacheStats(): {
    size: number;
    entries: Array<{
      key: string;
      lastUsed: Date;
      computeTime: number;
    }>;
  } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        lastUsed: new Date(entry.lastUsed),
        computeTime: entry.computeTime
      }))
    };
  }
}

// Global singleton instance
const seasonIndexCache = new SeasonIndexCache();

// Export the cache interface functions
export function getCachedSeasonIndex(
  players: Player[], 
  sport: 'basketball' | 'football' | 'hockey' | 'baseball' = 'basketball'
): SeasonIndex {
  return seasonIndexCache.getCachedSeasonIndex(players, sport);
}

export function clearSeasonIndexCache(): void {
  seasonIndexCache.clearCache();
}

export function getSeasonIndexCacheStats() {
  return seasonIndexCache.getCacheStats();
}

// Export for testing
export { seasonIndexCache };