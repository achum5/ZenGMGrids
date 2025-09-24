import type { Player, Team } from '@/types/bbgm';
import type { SeasonIndex, SeasonAchievementId } from '@/lib/season-achievements';
import { getSeasonEligiblePlayers, SEASON_ACHIEVEMENTS } from '@/lib/season-achievements';
import { playerMeetsAchievement } from '@/lib/achievements';

// Intersection cache for performance optimization
type IntersectionKey = string;
type CacheEntry = {
  result: number;
  timestamp: number;
};

const CACHE_TTL_MS = 30000; // 30 seconds cache TTL
const intersectionCache = new Map<IntersectionKey, CacheEntry>();

// Generate cache key for intersection
function generateCacheKey(
  rowType: string,
  rowId: string | number,
  colType: string,
  colId: string | number,
  playersHash?: string
): IntersectionKey {
  return `${rowType}:${rowId}|${colType}:${colId}${playersHash ? `#${playersHash}` : ''}`;
}

// Simple hash for players array to detect changes
function hashPlayerIds(players: Player[]): string {
  if (players.length < 100) {
    return players.map(p => p.pid).sort((a, b) => a - b).join(',');
  }
  // For large arrays, use length + first/last few PIDs for faster hashing
  const sorted = players.map(p => p.pid).sort((a, b) => a - b);
  return `${sorted.length}:${sorted.slice(0, 5).join(',')}:${sorted.slice(-5).join(',')}`;
}

// Check if cache entry is valid
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

// Clear expired cache entries periodically
let lastCleanup = Date.now();
function cleanupCache(): void {
  const now = Date.now();
  if (now - lastCleanup < 10000) return; // Cleanup every 10 seconds
  
  const expired: string[] = [];
  Array.from(intersectionCache.entries()).forEach(([key, entry]) => {
    if (!isCacheValid(entry)) {
      expired.push(key);
    }
  });
  
  expired.forEach(key => intersectionCache.delete(key));
  lastCleanup = now;
}

// Pre-built Set lookups for optimization (keyed by playersHash for proper invalidation)
const playersByTeamCache = new Map<string, Map<number, Set<number>>>();
const playersByAchievementCache = new Map<string, Map<string, Set<number>>>();

// Build player Sets by team for fast lookups
function buildPlayersByTeam(players: Player[]): Map<number, Set<number>> {
  const playersHash = hashPlayerIds(players);
  
  // Check if we have cached data for this specific player dataset
  if (playersByTeamCache.has(playersHash)) {
    return playersByTeamCache.get(playersHash)!;
  }
  
  // Build new cache for this player dataset
  const teamMap = new Map<number, Set<number>>();
  
  for (const player of players) {
    player.teamsPlayed.forEach(teamId => {
      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, new Set());
      }
      teamMap.get(teamId)!.add(player.pid);
    });
  }
  
  // Cache the result keyed by playersHash
  playersByTeamCache.set(playersHash, teamMap);
  
  return teamMap;
}

// Build player Sets by achievement for fast lookups
function buildPlayersByAchievement(
  players: Player[], 
  seasonIndex?: SeasonIndex
): Map<string, Set<number>> {
  const playersHash = hashPlayerIds(players);
  
  // Check if we have cached data for this specific player dataset
  if (playersByAchievementCache.has(playersHash)) {
    return playersByAchievementCache.get(playersHash)!;
  }
  
  // Build new cache for this player dataset
  const achievementMap = new Map<string, Set<number>>();
  
  // For career achievements, build Sets directly
  for (const player of players) {
    if (!player.achievements) continue;
    
    for (const [achievementId, hasAchievement] of Object.entries(player.achievements)) {
      if (hasAchievement) {
        if (!achievementMap.has(achievementId)) {
          achievementMap.set(achievementId, new Set());
        }
        achievementMap.get(achievementId)!.add(player.pid);
      }
    }
  }
  
  // DEBUG: Log specific achievement sizes
  const played15Count = achievementMap.get('played15PlusSeasons')?.size || 0;
  if (played15Count === 0) {
    console.log('🐛 [buildPlayersByAchievement] played15PlusSeasons has 0 players!');
    console.log('🐛 Sample player achievements:', players.slice(0, 3).map(p => ({ 
      pid: p.pid, 
      name: p.name, 
      achievements: p.achievements ? Object.keys(p.achievements).filter(k => (p.achievements as any)[k]) : 'NO_ACHIEVEMENTS'
    })));
  } else {
    console.log(`🐛 [buildPlayersByAchievement] played15PlusSeasons has ${played15Count} players`);
  }
  
  // Cache the result keyed by playersHash
  playersByAchievementCache.set(playersHash, achievementMap);
  
  return achievementMap;
}

// Set intersection with size optimization
function intersectSets(setA: Set<number>, setB: Set<number>): Set<number> {
  // Always iterate the smaller set for performance
  const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  const result = new Set<number>();
  
  Array.from(smaller).forEach(item => {
    if (larger.has(item)) {
      result.add(item);
    }
  });
  
  return result;
}

// Set intersection count (optimized - no need to build the result set)
function intersectSetsCount(setA: Set<number>, setB: Set<number>): number {
  // Always iterate the smaller set for performance
  const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  let count = 0;
  
  Array.from(smaller).forEach(item => {
    if (larger.has(item)) {
      count++;
    }
  });
  
  return count;
}

export interface IntersectionConstraint {
  type: 'team' | 'achievement';
  id: string | number;
  label?: string;
}

/**
 * Optimized intersection calculation using Set operations with memoization
 */
export function calculateOptimizedIntersection(
  rowConstraint: IntersectionConstraint,
  colConstraint: IntersectionConstraint,
  players: Player[],
  teams: Team[],
  seasonIndex?: SeasonIndex,
  returnCount: boolean = true
): number | Set<number> {
  cleanupCache();
  
  const playersHash = hashPlayerIds(players);
  const cacheKey = generateCacheKey(
    rowConstraint.type, 
    rowConstraint.id, 
    colConstraint.type, 
    colConstraint.id,
    playersHash
  );
  
  // Check cache first (only for count requests)
  if (returnCount) {
    const cached = intersectionCache.get(cacheKey);
    if (cached && isCacheValid(cached)) {
      return cached.result;
    }
  }
  
  let result: number | Set<number>;
  
  // Create Set for season achievement IDs for O(1) lookup
  const SEASON_ACHIEVEMENT_IDS = new Set(SEASON_ACHIEVEMENTS.map(sa => sa.id));
  
  const rowIsSeasonAchievement = rowConstraint.type === 'achievement' && 
    SEASON_ACHIEVEMENT_IDS.has(rowConstraint.id as SeasonAchievementId);
  const colIsSeasonAchievement = colConstraint.type === 'achievement' && 
    SEASON_ACHIEVEMENT_IDS.has(colConstraint.id as SeasonAchievementId);
  
  if (rowConstraint.type === 'team' && colConstraint.type === 'team') {
    // Team × Team intersection - players who played for both teams
    const teamAPlayers = buildPlayersByTeam(players).get(rowConstraint.id as number) || new Set();
    const teamBPlayers = buildPlayersByTeam(players).get(colConstraint.id as number) || new Set();
    
    if (returnCount) {
      result = intersectSetsCount(teamAPlayers, teamBPlayers);
    } else {
      result = intersectSets(teamAPlayers, teamBPlayers);
    }
  } else if (rowIsSeasonAchievement && colConstraint.type === 'team') {
    // Season achievement × team
    if (!seasonIndex) {
      result = returnCount ? 0 : new Set();
    } else {
      const eligiblePids = getSeasonEligiblePlayers(
        seasonIndex, 
        colConstraint.id as number, 
        rowConstraint.id as SeasonAchievementId
      );
      result = returnCount ? eligiblePids.size : eligiblePids;
    }
  } else if (colIsSeasonAchievement && rowConstraint.type === 'team') {
    // Team × season achievement
    if (!seasonIndex) {
      result = returnCount ? 0 : new Set();
    } else {
      const eligiblePids = getSeasonEligiblePlayers(
        seasonIndex, 
        rowConstraint.id as number, 
        colConstraint.id as SeasonAchievementId
      );
      result = returnCount ? eligiblePids.size : eligiblePids;
    }
  } else if (rowIsSeasonAchievement && colIsSeasonAchievement) {
    // Season achievement × season achievement - SIMPLIFIED LOGIC
    // Fix for achievement x achievement bug: just check if each player has both achievements
    const eligiblePids = new Set<number>();
    
    for (const player of players) {
      const hasRowAchievement = playerMeetsAchievement(player, rowConstraint.id as string, seasonIndex);
      const hasColAchievement = playerMeetsAchievement(player, colConstraint.id as string, seasonIndex);
      
      // Simple logic: if player has both achievements, they qualify
      if (hasRowAchievement && hasColAchievement) {
        eligiblePids.add(player.pid);
      }
    }
    
    result = returnCount ? eligiblePids.size : eligiblePids;
  } else if (rowConstraint.type === 'team' && colConstraint.type === 'achievement' && !colIsSeasonAchievement) {
    // Team × career achievement
    const teamPlayers = buildPlayersByTeam(players).get(rowConstraint.id as number) || new Set();
    const achievementPlayers = buildPlayersByAchievement(players, seasonIndex).get(colConstraint.id as string) || new Set();
    
    if (returnCount) {
      result = intersectSetsCount(teamPlayers, achievementPlayers);
    } else {
      result = intersectSets(teamPlayers, achievementPlayers);
    }
  } else if (rowConstraint.type === 'achievement' && !rowIsSeasonAchievement && colConstraint.type === 'team') {
    // Career achievement × team
    const achievementPlayers = buildPlayersByAchievement(players, seasonIndex).get(rowConstraint.id as string) || new Set();
    const teamPlayers = buildPlayersByTeam(players).get(colConstraint.id as number) || new Set();
    
    if (returnCount) {
      result = intersectSetsCount(achievementPlayers, teamPlayers);
    } else {
      result = intersectSets(achievementPlayers, teamPlayers);
    }
  } else if (rowConstraint.type === 'achievement' && !rowIsSeasonAchievement && 
             colConstraint.type === 'achievement' && !colIsSeasonAchievement) {
    // Career achievement × career achievement - SIMPLIFIED LOGIC
    // Fix for career achievement intersection: just check if each player has both achievements
    const eligiblePids = new Set<number>();
    
    for (const player of players) {
      const hasRowAchievement = playerMeetsAchievement(player, rowConstraint.id as string, seasonIndex);
      const hasColAchievement = playerMeetsAchievement(player, colConstraint.id as string, seasonIndex);
      
      // Simple logic: if player has both achievements, they qualify
      if (hasRowAchievement && hasColAchievement) {
        eligiblePids.add(player.pid);
      }
    }
    
    result = returnCount ? eligiblePids.size : eligiblePids;
  } else if (rowConstraint.type === 'achievement' && !rowIsSeasonAchievement && 
             colConstraint.type === 'achievement' && colIsSeasonAchievement) {
    // Career achievement × season achievement - SIMPLIFIED LOGIC
    // Fix for mixed achievement intersection: just check if each player has both achievements
    const eligiblePids = new Set<number>();
    
    for (const player of players) {
      const hasRowAchievement = playerMeetsAchievement(player, rowConstraint.id as string, seasonIndex);
      const hasColAchievement = playerMeetsAchievement(player, colConstraint.id as string, seasonIndex);
      
      // Simple logic: if player has both achievements, they qualify
      if (hasRowAchievement && hasColAchievement) {
        eligiblePids.add(player.pid);
      }
    }
    
    result = returnCount ? eligiblePids.size : eligiblePids;
  } else if (rowConstraint.type === 'achievement' && rowIsSeasonAchievement && 
             colConstraint.type === 'achievement' && !colIsSeasonAchievement) {
    // Season achievement × career achievement - SIMPLIFIED LOGIC
    // Fix for mixed achievement intersection: just check if each player has both achievements
    const eligiblePids = new Set<number>();
    
    for (const player of players) {
      const hasRowAchievement = playerMeetsAchievement(player, rowConstraint.id as string, seasonIndex);
      const hasColAchievement = playerMeetsAchievement(player, colConstraint.id as string, seasonIndex);
      
      // Simple logic: if player has both achievements, they qualify
      if (hasRowAchievement && hasColAchievement) {
        eligiblePids.add(player.pid);
      }
    }
    
    result = returnCount ? eligiblePids.size : eligiblePids;
  } else {
    // Fallback - should not happen with proper constraints
    result = returnCount ? 0 : new Set();
  }
  
  // Cache the result (only for count requests)
  if (returnCount && typeof result === 'number') {
    intersectionCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }
  
  return result;
}

/**
 * Clear all caches (useful for testing or when data changes significantly)
 */
export function clearIntersectionCaches(): void {
  intersectionCache.clear();
  playersByTeamCache.clear();
  playersByAchievementCache.clear();
}

/**
 * Clear caches for a specific player dataset (when a league file is replaced)
 */
export function clearIntersectionCachesForPlayers(players: Player[]): void {
  const playersHash = hashPlayerIds(players);
  
  // Clear intersection cache entries for this player dataset
  const keysToDelete: string[] = [];
  Array.from(intersectionCache.keys()).forEach(key => {
    if (key.includes(`#${playersHash}`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => intersectionCache.delete(key));
  
  // Clear player-specific caches
  playersByTeamCache.delete(playersHash);
  playersByAchievementCache.delete(playersHash);
}

/**
 * Get cache statistics for debugging
 */
export function getIntersectionCacheStats(): {
  intersectionCacheSize: number;
  playersByTeamCacheSize: number;
  playersByAchievementCacheSize: number;
  playerDatasetsCached: number;
} {
  return {
    intersectionCacheSize: intersectionCache.size,
    playersByTeamCacheSize: Array.from(playersByTeamCache.values()).reduce((sum, map) => sum + map.size, 0),
    playersByAchievementCacheSize: Array.from(playersByAchievementCache.values()).reduce((sum, map) => sum + map.size, 0),
    playerDatasetsCached: Math.max(playersByTeamCache.size, playersByAchievementCache.size),
  };
}