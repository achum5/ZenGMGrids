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
    // Season achievement × season achievement
    if (!seasonIndex) {
      result = returnCount ? 0 : new Set();
    } else {
      if (rowConstraint.id === colConstraint.id) {
        // Same achievement - count all players who have it
        const eligiblePids = new Set<number>();
        for (const seasonStr of Object.keys(seasonIndex)) {
          const season = parseInt(seasonStr);
          const seasonData = seasonIndex[season];
          for (const teamStr of Object.keys(seasonData)) {
            const teamId = parseInt(teamStr);
            const teamData = seasonData[teamId];
            if (teamData[rowConstraint.id as SeasonAchievementId]) {
              const achievementPids = teamData[rowConstraint.id as SeasonAchievementId];
              achievementPids.forEach(pid => eligiblePids.add(pid));
            }
          }
        }
        result = returnCount ? eligiblePids.size : eligiblePids;
      } else {
        // Different achievements - use Set intersection for efficiency
        const rowAchievementPids = new Set<number>();
        const colAchievementPids = new Set<number>();
        
        // Collect players with row achievement
        for (const seasonStr of Object.keys(seasonIndex)) {
          const season = parseInt(seasonStr);
          const seasonData = seasonIndex[season];
          for (const teamStr of Object.keys(seasonData)) {
            const teamId = parseInt(teamStr);
            const teamData = seasonData[teamId];
            if (teamData[rowConstraint.id as SeasonAchievementId]) {
              const achievementPids = teamData[rowConstraint.id as SeasonAchievementId];
              achievementPids.forEach(pid => rowAchievementPids.add(pid));
            }
          }
        }
        
        // Collect players with col achievement
        for (const seasonStr of Object.keys(seasonIndex)) {
          const season = parseInt(seasonStr);
          const seasonData = seasonIndex[season];
          for (const teamStr of Object.keys(seasonData)) {
            const teamId = parseInt(teamStr);
            const teamData = seasonData[teamId];
            if (teamData[colConstraint.id as SeasonAchievementId]) {
              const achievementPids = teamData[colConstraint.id as SeasonAchievementId];
              achievementPids.forEach(pid => colAchievementPids.add(pid));
            }
          }
        }
        
        if (returnCount) {
          result = intersectSetsCount(rowAchievementPids, colAchievementPids);
        } else {
          result = intersectSets(rowAchievementPids, colAchievementPids);
        }
      }
    }
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
    // Career achievement × career achievement
    const rowAchievementPlayers = buildPlayersByAchievement(players, seasonIndex).get(rowConstraint.id as string) || new Set();
    const colAchievementPlayers = buildPlayersByAchievement(players, seasonIndex).get(colConstraint.id as string) || new Set();
    
    if (returnCount) {
      result = intersectSetsCount(rowAchievementPlayers, colAchievementPlayers);
    } else {
      result = intersectSets(rowAchievementPlayers, colAchievementPlayers);
    }
  } else if (rowConstraint.type === 'achievement' && !rowIsSeasonAchievement && 
             colConstraint.type === 'achievement' && colIsSeasonAchievement) {
    // Career achievement × season achievement
    if (!seasonIndex) {
      result = returnCount ? 0 : new Set();
    } else {
      const careerAchievementPlayers = buildPlayersByAchievement(players, seasonIndex).get(rowConstraint.id as string) || new Set();
      
      // Get all players with the season achievement
      const seasonAchievementPlayers = new Set<number>();
      for (const seasonStr of Object.keys(seasonIndex)) {
        const season = parseInt(seasonStr);
        const seasonData = seasonIndex[season];
        for (const teamStr of Object.keys(seasonData)) {
          const teamId = parseInt(teamStr);
          const teamData = seasonData[teamId];
          const seasonAchPlayers = teamData[colConstraint.id as SeasonAchievementId] || new Set();
          seasonAchPlayers.forEach(pid => seasonAchievementPlayers.add(pid));
        }
      }
      
      // Debug logging for this specific case
      if (rowConstraint.id === 'played15PlusSeasons' && colConstraint.id === 'Season70Games') {
        console.log(`🚨 INTERSECTION CALC DEBUG:`, {
          careerAchievementId: rowConstraint.id,
          seasonAchievementId: colConstraint.id,
          careerPlayersCount: careerAchievementPlayers.size,
          seasonPlayersCount: seasonAchievementPlayers.size,
          seasonIndexExists: !!seasonIndex,
          seasonIndexKeys: Object.keys(seasonIndex).length,
          sampleSeasonAchievementPlayers: Array.from(seasonAchievementPlayers).slice(0, 5)
        });
      }
      
      if (returnCount) {
        result = intersectSetsCount(careerAchievementPlayers, seasonAchievementPlayers);
      } else {
        result = intersectSets(careerAchievementPlayers, seasonAchievementPlayers);
      }
    }
  } else if (rowConstraint.type === 'achievement' && rowIsSeasonAchievement && 
             colConstraint.type === 'achievement' && !colIsSeasonAchievement) {
    // Season achievement × career achievement
    if (!seasonIndex) {
      result = returnCount ? 0 : new Set();
    } else {
      const careerAchievementPlayers = buildPlayersByAchievement(players, seasonIndex).get(colConstraint.id as string) || new Set();
      
      // Get all players with the season achievement
      const seasonAchievementPlayers = new Set<number>();
      for (const seasonStr of Object.keys(seasonIndex)) {
        const season = parseInt(seasonStr);
        const seasonData = seasonIndex[season];
        for (const teamStr of Object.keys(seasonData)) {
          const teamId = parseInt(teamStr);
          const teamData = seasonData[teamId];
          const seasonAchPlayers = teamData[rowConstraint.id as SeasonAchievementId] || new Set();
          seasonAchPlayers.forEach(pid => seasonAchievementPlayers.add(pid));
        }
      }
      
      // Debug logging for this specific case
      if (rowConstraint.id === 'Season70Games' && colConstraint.id === 'played15PlusSeasons') {
        console.log(`🚨 INTERSECTION CALC DEBUG (Season × Career):`, {
          seasonAchievementId: rowConstraint.id,
          careerAchievementId: colConstraint.id,
          seasonPlayersCount: seasonAchievementPlayers.size,
          careerPlayersCount: careerAchievementPlayers.size,
          seasonIndexExists: !!seasonIndex,
          seasonIndexKeys: Object.keys(seasonIndex).length,
          sampleSeasonAchievementPlayers: Array.from(seasonAchievementPlayers).slice(0, 5),
          sampleCareerAchievementPlayers: Array.from(careerAchievementPlayers).slice(0, 5)
        });
        
        // TEMPORARY FIX: If season players is empty but career players exists, manually calculate
        if (seasonAchievementPlayers.size === 0 && careerAchievementPlayers.size > 0) {
          console.log('🔧 TEMP FIX: Season70Games has no players, calculating manually...');
          // Find players with 15+ seasons who played 70+ games in any season
          const manualCalculation = new Set<number>();
          for (const pid of Array.from(careerAchievementPlayers)) {
            const player = players.find(p => p.pid === pid);
            if (player?.seasons) {
              for (const season of player.seasons) {
                if (season.gp >= 70) {
                  manualCalculation.add(pid);
                  break; // Only need one qualifying season
                }
              }
            }
          }
          console.log(`🔧 Manual calculation found ${manualCalculation.size} players`);
          if (returnCount) {
            result = manualCalculation.size;
          } else {
            result = manualCalculation;
          }
          // Cache and return early
          if (returnCount && typeof result === 'number') {
            intersectionCache.set(cacheKey, {
              result,
              timestamp: Date.now()
            });
          }
          return result;
        }
      }
      
      if (returnCount) {
        result = intersectSetsCount(seasonAchievementPlayers, careerAchievementPlayers);
      } else {
        result = intersectSets(seasonAchievementPlayers, careerAchievementPlayers);
      }
    }
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