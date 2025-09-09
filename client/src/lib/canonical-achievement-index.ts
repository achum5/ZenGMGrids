// Canonical Achievement Index - Single Source of Truth for Team × Achievement validation
// This ensures all parts of the system (grid generation, validation, counts, modals) use identical data

import type { Player, Team } from '@/types/bbgm';

// Canonical index structures
export interface CanonicalAchievementIndex {
  // awardByTeamSeason[achId][franchiseId][season] -> Set<pid>
  awardByTeamSeason: Record<string, Record<number, Record<number, Set<number>>>>;
  
  // awardByTeamAnySeason[achId][franchiseId] -> Set<pid> (union across all seasons)
  awardByTeamAnySeason: Record<string, Record<number, Set<number>>>;
}

// Award type normalization mapping
const AWARD_TYPE_MAPPING: Record<string, string> = {
  // All-Star variants
  'All-Star': 'ALL_STAR',
  
  // MVP variants  
  'Most Valuable Player': 'MVP',
  'MVP': 'MVP',
  
  // Defensive Player of the Year
  'Defensive Player of the Year': 'DPOY',
  'DPOY': 'DPOY',
  
  // Rookie of the Year
  'Rookie of the Year': 'ROY',
  'ROY': 'ROY',
  
  // Sixth Man of the Year
  'Sixth Man of the Year': 'SMOY',
  'SMOY': 'SMOY',
  
  // Most Improved Player
  'Most Improved Player': 'MIP',
  'MIP': 'MIP',
  
  // All-League Team variants (combined)
  'All-League Team': 'ALL_LEAGUE',
  'First Team All-League': 'ALL_LEAGUE',
  'Second Team All-League': 'ALL_LEAGUE', 
  'Third Team All-League': 'ALL_LEAGUE',
  
  // All-Defensive Team variants (combined)
  'All-Defensive Team': 'ALL_DEFENSIVE',
  'First Team All-Defensive': 'ALL_DEFENSIVE',
  'Second Team All-Defensive': 'ALL_DEFENSIVE',
  
  // All-Rookie Team
  'All-Rookie Team': 'ALL_ROOKIE',
  
  // Finals MVP
  'Finals MVP': 'FINALS_MVP',
};

// Achievement ID mapping for consistency with existing system
export const CANONICAL_ACHIEVEMENT_IDS = {
  ALL_STAR: 'AllStar',
  MVP: 'MVP', 
  DPOY: 'DPOY',
  ROY: 'ROY',
  SMOY: 'SMOY',
  MIP: 'MIP',
  ALL_LEAGUE: 'AllLeagueAny',
  ALL_DEFENSIVE: 'AllDefAny',
  ALL_ROOKIE: 'AllRookieAny',
  FINALS_MVP: 'FinalsMVP',
  POINTS_LEADER: 'PointsLeader',
  REBOUNDS_LEADER: 'ReboundsLeader',
  ASSISTS_LEADER: 'AssistsLeader',
  STEALS_LEADER: 'StealsLeader',
  BLOCKS_LEADER: 'BlocksLeader'
} as const;

/**
 * Build the canonical achievement index from player data
 * This creates the single source of truth used by all validation logic
 */
export function buildCanonicalAchievementIndex(
  players: Player[], 
  teams: Team[]
): CanonicalAchievementIndex {
  console.log('🏗️ Building canonical achievement index...');
  
  const awardByTeamSeason: Record<string, Record<number, Record<number, Set<number>>>> = {};
  const awardByTeamAnySeason: Record<string, Record<number, Set<number>>> = {};
  
  // Initialize achievement structures
  for (const achId of Object.values(CANONICAL_ACHIEVEMENT_IDS)) {
    awardByTeamSeason[achId] = {};
    awardByTeamAnySeason[achId] = {};
  }
  
  // Build franchise ID mapping for team continuity
  const franchiseIdMap = new Map<number, number>();
  for (const team of teams) {
    franchiseIdMap.set(team.tid, team.franchiseId || team.tid);
  }
  
  // Process each player's awards and map to team-season combinations
  let processedAwards = 0;
  let skippedAwards = 0;
  
  for (const player of players) {
    if (!player.awards || !player.stats) continue;
    
    // Process each award
    for (const award of player.awards) {
      const normalizedType = AWARD_TYPE_MAPPING[award.type];
      if (!normalizedType) {
        skippedAwards++;
        continue;
      }
      
      const achId = CANONICAL_ACHIEVEMENT_IDS[normalizedType as keyof typeof CANONICAL_ACHIEVEMENT_IDS];
      if (!achId) {
        skippedAwards++;
        continue;
      }
      
      const season = award.season;
      if (!season) {
        skippedAwards++;
        continue;
      }
      
      // Special handling for Finals MVP - attach to playoffs team only
      if (normalizedType === 'FINALS_MVP') {
        const playoffsStats = player.stats.find(s => 
          s.season === season && s.playoffs === true && s.gp > 0
        );
        
        if (playoffsStats) {
          const franchiseId = franchiseIdMap.get(playoffsStats.tid) || playoffsStats.tid;
          addToIndex(awardByTeamSeason, awardByTeamAnySeason, achId, franchiseId, season, player.pid);
          processedAwards++;
        } else {
          skippedAwards++;
        }
        continue;
      }
      
      // For all other awards - attach to all regular season teams in that season
      const regularSeasonStats = player.stats.filter(s => 
        s.season === season && s.playoffs === false && s.gp > 0
      );
      
      if (regularSeasonStats.length === 0) {
        skippedAwards++;
        continue;
      }
      
      // Add to each team the player played for in regular season
      for (const stat of regularSeasonStats) {
        const franchiseId = franchiseIdMap.get(stat.tid) || stat.tid;
        addToIndex(awardByTeamSeason, awardByTeamAnySeason, achId, franchiseId, season, player.pid);
      }
      
      processedAwards++;
    }
  }
  
  console.log(`✅ Canonical index built: ${processedAwards} awards processed, ${skippedAwards} skipped`);
  
  // Log summary for diagnostics
  for (const [achId, teams] of Object.entries(awardByTeamAnySeason)) {
    const totalPlayers = Object.values(teams).reduce((sum, pids) => sum + pids.size, 0);
    const teamCount = Object.keys(teams).length;
    if (totalPlayers > 0) {
      console.log(`📊 ${achId}: ${totalPlayers} total players across ${teamCount} teams`);
    }
  }
  
  return {
    awardByTeamSeason,
    awardByTeamAnySeason
  };
}

/**
 * Helper function to add entry to both indexes
 */
function addToIndex(
  awardByTeamSeason: Record<string, Record<number, Record<number, Set<number>>>>,
  awardByTeamAnySeason: Record<string, Record<number, Set<number>>>,
  achId: string,
  franchiseId: number,
  season: number,
  pid: number
): void {
  // Initialize if needed
  if (!awardByTeamSeason[achId]) {
    awardByTeamSeason[achId] = {};
  }
  if (!awardByTeamSeason[achId][franchiseId]) {
    awardByTeamSeason[achId][franchiseId] = {};
  }
  if (!awardByTeamSeason[achId][franchiseId][season]) {
    awardByTeamSeason[achId][franchiseId][season] = new Set();
  }
  if (!awardByTeamAnySeason[achId]) {
    awardByTeamAnySeason[achId] = {};
  }
  if (!awardByTeamAnySeason[achId][franchiseId]) {
    awardByTeamAnySeason[achId][franchiseId] = new Set();
  }
  
  // Add to both indexes
  awardByTeamSeason[achId][franchiseId][season].add(pid);
  awardByTeamAnySeason[achId][franchiseId].add(pid);
}

/**
 * Get eligible players for Team × Achievement combination using canonical index
 */
export function getCanonicalEligiblePlayers(
  index: CanonicalAchievementIndex,
  achievementId: string,
  franchiseId: number
): Set<number> {
  const teamData = index.awardByTeamAnySeason[achievementId];
  if (!teamData || !teamData[franchiseId]) {
    return new Set();
  }
  
  return new Set(teamData[franchiseId]);
}

/**
 * Get eligible players for Team × Achievement in specific season
 */
export function getCanonicalEligiblePlayersInSeason(
  index: CanonicalAchievementIndex,
  achievementId: string,
  franchiseId: number,
  season: number
): Set<number> {
  const seasonData = index.awardByTeamSeason[achievementId];
  if (!seasonData || !seasonData[franchiseId] || !seasonData[franchiseId][season]) {
    return new Set();
  }
  
  return new Set(seasonData[franchiseId][season]);
}

/**
 * Validate player guess using canonical index
 */
export function validateGuessCanonical(
  index: CanonicalAchievementIndex,
  playerId: number,
  achievementId: string,
  franchiseId: number
): boolean {
  const eligiblePlayers = getCanonicalEligiblePlayers(index, achievementId, franchiseId);
  return eligiblePlayers.has(playerId);
}

/**
 * Get all seasons where player achieved award with team
 */
export function getPlayerAchievementSeasons(
  index: CanonicalAchievementIndex,
  playerId: number,
  achievementId: string,
  franchiseId: number
): number[] {
  const seasonData = index.awardByTeamSeason[achievementId];
  if (!seasonData || !seasonData[franchiseId]) {
    return [];
  }
  
  const seasons: number[] = [];
  for (const [season, pids] of Object.entries(seasonData[franchiseId])) {
    if (pids.has(playerId)) {
      seasons.push(parseInt(season));
    }
  }
  
  return seasons.sort((a, b) => a - b);
}

/**
 * Log diagnostics for debugging validation issues
 */
export function logCanonicalDiagnostics(
  index: CanonicalAchievementIndex,
  achievementId: string,
  franchiseId: number,
  players: Player[],
  teamName: string
): void {
  const eligiblePids = getCanonicalEligiblePlayers(index, achievementId, franchiseId);
  const eligiblePlayers = players.filter(p => eligiblePids.has(p.pid));
  
  console.log(`🔍 CANONICAL DIAGNOSTICS: ${teamName} × ${achievementId}`);
  console.log(`   Franchise ID: ${franchiseId}`);
  console.log(`   Eligible Count: ${eligiblePids.size}`);
  console.log(`   First 10 Players:`, eligiblePlayers.slice(0, 10).map(p => p.name));
  
  // Check for known problematic players
  const problematicNames = ['Pete Maravich', 'Stephon Marbury', 'Otis Birdsong'];
  for (const name of problematicNames) {
    const player = players.find(p => p.name === name);
    if (player) {
      const isEligible = eligiblePids.has(player.pid);
      console.log(`   ${name}: ${isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}`);
    }
  }
}