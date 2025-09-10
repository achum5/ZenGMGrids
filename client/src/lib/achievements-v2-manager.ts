/**
 * V2 Achievements Engine Manager
 * 
 * Manages the V2 system lifecycle:
 * - Feature flag checking
 * - PlayerProfile cache management
 * - Index building and caching
 * - Integration with existing grid/validation systems
 */

import type { Player, Team } from '@/types/bbgm';
import {
  type PlayerProfile,
  type V2AchievementIndexes,
  type V2CanonicalId,
  buildPlayerProfile,
  buildV2Indexes,
  validateV2Achievement,
  formatV2Achievement,
  getV2CanonicalId,
  V2_CANONICAL_IDS,
} from './achievements-v2';

// =============================================================================
// FEATURE FLAG SYSTEM
// =============================================================================

interface V2Config {
  achievementsEngine: 'v1' | 'v2';
  // Add more V2 feature flags here as needed
}

// Default to V1 for now, can be toggled via environment or runtime
const DEFAULT_V2_CONFIG: V2Config = {
  achievementsEngine: 'v1', // TODO: Change to 'v2' when ready
};

let currentConfig: V2Config = { ...DEFAULT_V2_CONFIG };

/**
 * Enable V2 achievements engine
 */
export function enableV2Engine(): void {
  currentConfig.achievementsEngine = 'v2';
  console.log('🚀 V2 Achievements Engine ENABLED');
  
  // Clear any cached data to force rebuild
  clearV2Cache();
}

/**
 * Disable V2 achievements engine (fall back to V1)
 */
export function disableV2Engine(): void {
  currentConfig.achievementsEngine = 'v1';
  console.log('⬇️ V2 Achievements Engine DISABLED (using V1)');
  
  // Clear cached data
  clearV2Cache();
}

/**
 * Check if V2 engine is enabled
 */
export function isV2Enabled(): boolean {
  return currentConfig.achievementsEngine === 'v2';
}

/**
 * Get current V2 configuration
 */
export function getV2Config(): V2Config {
  return { ...currentConfig };
}

// =============================================================================
// V2 CACHE MANAGEMENT
// =============================================================================

interface V2Cache {
  profiles: Map<number, PlayerProfile> | null;
  indexes: V2AchievementIndexes | null;
  franchiseMap: Map<number, number> | null;
  lastBuilt: number;
  playersHash: string; // To detect when players data changes
}

let v2Cache: V2Cache = {
  profiles: null,
  indexes: null,
  franchiseMap: null,
  lastBuilt: 0,
  playersHash: '',
};

/**
 * Clear V2 cache (forces rebuild on next access)
 */
export function clearV2Cache(): void {
  v2Cache = {
    profiles: null,
    indexes: null,
    franchiseMap: null,
    lastBuilt: 0,
    playersHash: '',
  };
  console.log('🗑️ V2 cache cleared');
}

/**
 * Generate a simple hash of players data to detect changes
 */
function generatePlayersHash(players: Player[]): string {
  // Simple hash based on player count and first few player IDs
  const sample = players.slice(0, 10).map(p => p.pid).join(',');
  return `${players.length}-${sample}`;
}

/**
 * Build franchise map from teams data
 */
function buildFranchiseMap(teams: Team[]): Map<number, number> {
  const franchiseMap = new Map<number, number>();
  
  for (const team of teams) {
    // Use team's franchiseId if available, otherwise use tid as franchise
    const franchiseId = (team as any).franchiseId || team.tid;
    franchiseMap.set(team.tid, franchiseId);
  }
  
  return franchiseMap;
}

/**
 * Get or build V2 PlayerProfile cache
 */
export function getV2ProfileCache(players: Player[], teams: Team[]): Map<number, PlayerProfile> {
  if (!isV2Enabled()) {
    throw new Error('V2 engine is not enabled');
  }
  
  const playersHash = generatePlayersHash(players);
  
  // Check if cache is valid
  if (v2Cache.profiles && v2Cache.playersHash === playersHash) {
    return v2Cache.profiles;
  }
  
  console.log('🏗️ Building V2 PlayerProfile cache...');
  const startTime = Date.now();
  
  // Build franchise map
  const franchiseMap = buildFranchiseMap(teams);
  
  // Build profile cache
  const profiles = new Map<number, PlayerProfile>();
  
  for (const player of players) {
    const profile = buildPlayerProfile(player, franchiseMap);
    profiles.set(player.pid, profile);
  }
  
  // Cache results
  v2Cache.profiles = profiles;
  v2Cache.franchiseMap = franchiseMap;
  v2Cache.playersHash = playersHash;
  v2Cache.lastBuilt = Date.now();
  
  const buildTime = Date.now() - startTime;
  console.log(`✅ V2 ProfileCache built: ${profiles.size} players in ${buildTime}ms`);
  
  return profiles;
}

/**
 * Get or build V2 achievement indexes
 */
export function getV2IndexCache(players: Player[], teams: Team[]): V2AchievementIndexes {
  if (!isV2Enabled()) {
    throw new Error('V2 engine is not enabled');
  }
  
  const playersHash = generatePlayersHash(players);
  
  // Check if cache is valid
  if (v2Cache.indexes && v2Cache.playersHash === playersHash) {
    return v2Cache.indexes;
  }
  
  // Get profiles (this will build them if needed)
  const profiles = getV2ProfileCache(players, teams);
  
  console.log('🏗️ Building V2 Achievement Indexes...');
  const startTime = Date.now();
  
  // Build indexes from profiles
  const indexes = buildV2Indexes(profiles);
  
  // Cache results
  v2Cache.indexes = indexes;
  
  const buildTime = Date.now() - startTime;
  console.log(`✅ V2 Indexes built in ${buildTime}ms`);
  
  // Log summary
  for (const [achId, playerSet] of indexes.careerEver) {
    if (playerSet.size > 0) {
      console.log(`📊 V2 Career-Ever ${achId}: ${playerSet.size} players`);
    }
  }
  
  return indexes;
}

// =============================================================================
// V2 INTEGRATION HELPERS
// =============================================================================

/**
 * V2-compatible achievement validation
 * Falls back to V1 behavior when V2 is disabled
 */
export function validateAchievementV2Compatible(
  player: Player,
  achievementId: string,
  teamTid: number | null,
  players: Player[],
  teams: Team[]
): boolean {
  if (!isV2Enabled()) {
    // Fall back to V1 validation (implement as needed)
    console.log('⬇️ Using V1 validation (V2 disabled)');
    return false; // Placeholder - integrate with existing V1 system
  }
  
  // V2 validation
  const canonicalId = getV2CanonicalId(achievementId);
  if (!canonicalId) {
    console.warn(`❌ V2: Unknown achievement ID: ${achievementId}`);
    return false;
  }
  
  const profiles = getV2ProfileCache(players, teams);
  const indexes = getV2IndexCache(players, teams);
  const profile = profiles.get(player.pid);
  
  if (!profile) {
    console.warn(`❌ V2: No profile found for player ${player.pid}`);
    return false;
  }
  
  // Convert team ID to franchise ID if needed
  let teamFranchiseId: number | undefined;
  if (teamTid !== null && v2Cache.franchiseMap) {
    teamFranchiseId = v2Cache.franchiseMap.get(teamTid) || teamTid;
  }
  
  return validateV2Achievement(profile, canonicalId, teamFranchiseId, indexes);
}

/**
 * Get eligible players for a Team × Achievement combination using V2
 */
export function getV2EligiblePlayers(
  achievementId: string,
  teamTid: number | null,
  players: Player[],
  teams: Team[]
): Player[] {
  if (!isV2Enabled()) {
    return []; // Fall back to V1 or return empty
  }
  
  const canonicalId = getV2CanonicalId(achievementId);
  if (!canonicalId) return [];
  
  const profiles = getV2ProfileCache(players, teams);
  const indexes = getV2IndexCache(players, teams);
  
  const eligiblePids = new Set<number>();
  
  if (teamTid === null) {
    // Achievement × Achievement case
    const careerEverSet = indexes.careerEver.get(canonicalId);
    if (careerEverSet) {
      careerEverSet.forEach(pid => eligiblePids.add(pid));
    }
  } else {
    // Team × Achievement case
    const teamFranchiseId = v2Cache.franchiseMap?.get(teamTid) || teamTid;
    
    for (const [pid, profile] of profiles) {
      if (validateV2Achievement(profile, canonicalId, teamFranchiseId, indexes)) {
        eligiblePids.add(pid);
      }
    }
  }
  
  // Return Player objects
  return players.filter(p => eligiblePids.has(p.pid));
}

/**
 * Generate V2-compatible reason bullets for modal display
 */
export function generateV2ReasonBullets(
  player: Player,
  achievementIds: string[],
  teamTids: (number | null)[],
  teams: Team[]
): Array<{ text: string; type: string }> {
  if (!isV2Enabled()) {
    return []; // Fall back to V1 or existing system
  }
  
  const profiles = getV2ProfileCache([player], teams);
  const profile = profiles.get(player.pid);
  
  if (!profile) return [];
  
  const bullets: Array<{ text: string; type: string }> = [];
  
  // Add team bullets first
  for (const teamTid of teamTids) {
    if (teamTid !== null) {
      const team = teams.find(t => t.tid === teamTid);
      if (team && profile.franchises.has(teamTid)) {
        // Get seasons played for this team
        // This is simplified - in full implementation, track seasons per team
        bullets.push({
          text: `${team.region} ${team.name} (career)`,
          type: 'team'
        });
      }
    }
  }
  
  // Add achievement bullets
  for (const achievementId of achievementIds) {
    const canonicalId = getV2CanonicalId(achievementId);
    if (canonicalId && isPlayerAchievementCareerEver(profile, canonicalId)) {
      bullets.push({
        text: formatV2Achievement(profile, canonicalId),
        type: getV2BulletType(canonicalId)
      });
    }
  }
  
  return bullets;
}

/**
 * Helper to check career-ever achievement (expose for bullet generation)
 */
function isPlayerAchievementCareerEver(profile: PlayerProfile, achievementId: V2CanonicalId): boolean {
  switch (achievementId) {
    case 'ONE_OA':
    case 'ROUND_1':
    case 'ROUND_2':
    case 'UNDRAFTED':
      return profile.draft.flags.has(achievementId);
    case 'PTS_20K':
      return profile.careerTotals.points >= 20000;
    case 'REB_10K':
      return profile.careerTotals.rebounds >= 10000;
    case 'AST_5K':
      return profile.careerTotals.assists >= 5000;
    case 'STL_2K':
      return profile.careerTotals.steals >= 2000;
    case 'BLK_1_5K':
      return profile.careerTotals.blocks >= 1500;
    case 'THREES_2K':
      return profile.careerTotals.threesMade >= 2000;
    case 'SEASONS_10':
      return profile.seasonsPlayed >= 10;
    case 'SEASONS_15':
      return profile.seasonsPlayed >= 15;
    case 'HOF':
      return profile.isHof;
    case 'MIP':
    case 'CHAMPION':
      return profile.awardsBySeason.some(award => award.canonicalId === achievementId);
    default:
      return false;
  }
}

/**
 * Get bullet type for modal display
 */
function getV2BulletType(canonicalId: V2CanonicalId): string {
  if (['ONE_OA', 'ROUND_1', 'ROUND_2', 'UNDRAFTED'].includes(canonicalId)) {
    return 'draft';
  } else if (['SEASONS_10', 'SEASONS_15'].includes(canonicalId)) {
    return 'longevity';
  } else {
    return 'award';
  }
}

// =============================================================================
// V2 DEBUGGING AND INSTRUMENTATION
// =============================================================================

/**
 * Log V2 system status and diagnostics
 */
export function logV2Status(): void {
  console.log('📊 V2 Achievements Engine Status');
  console.log(`Engine: ${currentConfig.achievementsEngine}`);
  console.log(`Cache Valid: ${v2Cache.profiles !== null}`);
  
  if (v2Cache.profiles) {
    console.log(`Profiles: ${v2Cache.profiles.size}`);
    console.log(`Last Built: ${new Date(v2Cache.lastBuilt).toISOString()}`);
  }
  
  if (v2Cache.indexes) {
    console.log('Career-Ever Index:');
    for (const [achId, playerSet] of v2Cache.indexes.careerEver) {
      if (playerSet.size > 0) {
        console.log(`  ${achId}: ${playerSet.size} players`);
      }
    }
  }
}

/**
 * Test V2 regression cases
 */
export function testV2Regression(players: Player[], teams: Team[]): void {
  if (!isV2Enabled()) {
    console.log('❌ V2 regression test skipped (V2 disabled)');
    return;
  }
  
  console.log('🧪 Running V2 regression tests...');
  
  // Test cases from specification
  const testCases = [
    { name: 'Nikola Jokić', achievement: 'Second Round Pick' },
    { name: 'Anthony Edwards', achievement: '#1 Overall Pick' },
  ];
  
  for (const testCase of testCases) {
    const player = players.find(p => 
      p.name?.includes(testCase.name) || 
      `${p.firstName} ${p.lastName}`.includes(testCase.name)
    );
    
    if (player) {
      const canonicalId = getV2CanonicalId(testCase.achievement);
      if (canonicalId) {
        const profiles = getV2ProfileCache(players, teams);
        const profile = profiles.get(player.pid);
        
        if (profile) {
          const hasAchievement = isPlayerAchievementCareerEver(profile, canonicalId);
          console.log(`🧪 ${testCase.name} × ${testCase.achievement}: ${hasAchievement ? '✅ PASS' : '❌ FAIL'}`);
        }
      }
    } else {
      console.log(`🧪 ${testCase.name}: ⚠️ PLAYER NOT FOUND`);
    }
  }
}