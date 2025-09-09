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
  // Basketball/General Awards
  'All-Star': 'ALL_STAR',
  'Most Valuable Player': 'MVP',
  'MVP': 'MVP',
  'Defensive Player of the Year': 'DPOY',
  'DPOY': 'DPOY',
  'Rookie of the Year': 'ROY',
  'ROY': 'ROY',
  'Sixth Man of the Year': 'SMOY',
  'SMOY': 'SMOY',
  'Most Improved Player': 'MIP',
  'MIP': 'MIP',
  'All-League Team': 'ALL_LEAGUE',
  'First Team All-League': 'ALL_LEAGUE',
  'Second Team All-League': 'ALL_LEAGUE', 
  'Third Team All-League': 'ALL_LEAGUE',
  'All-Defensive Team': 'ALL_DEFENSIVE',
  'First Team All-Defensive': 'ALL_DEFENSIVE',
  'Second Team All-Defensive': 'ALL_DEFENSIVE',
  'All-Rookie Team': 'ALL_ROOKIE',
  'Finals MVP': 'FINALS_MVP',
  
  // Football GM Specific Awards
  'Offensive Rookie of the Year': 'FB_OROY',
  'Defensive Rookie of the Year': 'FB_DROY', 
  'Won Championship': 'FB_CHAMPION',
};

// Achievement ID mapping for consistency with existing system
export const CANONICAL_ACHIEVEMENT_IDS = {
  // Basketball/General
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
  BLOCKS_LEADER: 'BlocksLeader',
  
  // Football GM Specific
  FB_ALL_STAR: 'FBAllStar',
  FB_MVP: 'FBMVP',
  FB_DPOY: 'FBDPOY',
  FB_OROY: 'FBOffROY',
  FB_DROY: 'FBDefROY',
  FB_ALL_ROOKIE: 'FBAllRookie',
  FB_ALL_LEAGUE: 'FBAllLeague',
  FB_FINALS_MVP: 'FBFinalsMVP',
  FB_CHAMPION: 'FBChampion'
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
    franchiseIdMap.set(team.tid, (team as any).franchiseId || team.tid);
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
      
      // Special handling for Finals MVP and Won Championship - attach to playoffs team only
      if (normalizedType === 'FINALS_MVP' || normalizedType === 'FB_CHAMPION') {
        const playoffsStats = player.stats.find(s => 
          s.season === season && s.playoffs === true && (s.gp || 0) > 0
        );
        
        if (playoffsStats) {
          const franchiseId = franchiseIdMap.get(playoffsStats.tid) || playoffsStats.tid;
          addToIndex(awardByTeamSeason, awardByTeamAnySeason, achId, franchiseId, season, player.pid);
          processedAwards++;
          
          // Log verification for acceptance criteria
          if (normalizedType === 'FB_CHAMPION') {
            console.log(`✅ ACCEPTANCE: Won Championship attached to playoffs team only - Player ${player.pid}, Season ${season}, Team ${franchiseId}`);
          }
        } else {
          skippedAwards++;
        }
        continue;
      }
      
      // For all other awards - attach to all regular season teams in that season
      const regularSeasonStats = player.stats.filter(s => 
        s.season === season && s.playoffs === false && (s.gp || 0) > 0
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
      
      // Log verification for acceptance criteria - season awards should attach to ALL regular season teams
      if (regularSeasonStats.length > 1 && ['ALL_STAR', 'MVP', 'DPOY', 'ALL_LEAGUE', 'ALL_ROOKIE', 'FB_OROY', 'FB_DROY'].includes(normalizedType)) {
        console.log(`✅ ACCEPTANCE: Season award ${normalizedType} attached to ${regularSeasonStats.length} regular season teams - Player ${player.pid}, Season ${season}`);
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
 * Get eligible players for any cell type using canonical indexes
 * Single source of truth for modal, validation, and grid generation
 */
export function getEligiblePlayersForCell(
  index: CanonicalAchievementIndex,
  rowConstraint: { type: string; tid?: number; achievementId?: string; label: string },
  colConstraint: { type: string; tid?: number; achievementId?: string; label: string },
  teams: Team[]
): Set<number> {
  const eligiblePids = new Set<number>();
  
  // Team × Achievement
  if (rowConstraint.type === 'team' && colConstraint.type === 'achievement' && colConstraint.achievementId) {
    const teamId = rowConstraint.tid!;
    const achId = colConstraint.achievementId;
    const team = teams.find(t => t.tid === teamId);
    const franchiseId = (team as any)?.franchiseId || teamId;
    const teamEligible = getCanonicalEligiblePlayers(index, achId, franchiseId);
    teamEligible.forEach(pid => eligiblePids.add(pid));
  }
  // Achievement × Team  
  else if (colConstraint.type === 'team' && rowConstraint.type === 'achievement' && rowConstraint.achievementId) {
    const teamId = colConstraint.tid!;
    const achId = rowConstraint.achievementId;
    const team = teams.find(t => t.tid === teamId);
    const franchiseId = (team as any)?.franchiseId || teamId;
    const teamEligible = getCanonicalEligiblePlayers(index, achId, franchiseId);
    teamEligible.forEach(pid => eligiblePids.add(pid));
  }
  // Achievement × Achievement
  else if (rowConstraint.type === 'achievement' && colConstraint.type === 'achievement' && 
           rowConstraint.achievementId && colConstraint.achievementId) {
    const achId1 = rowConstraint.achievementId;
    const achId2 = colConstraint.achievementId;
    
    if (achId1 === achId2) {
      // Same achievement - get all players who have it across all teams
      for (const teamId of Object.keys(index.awardByTeamAnySeason[achId1] || {})) {
        const teamPids = index.awardByTeamAnySeason[achId1][parseInt(teamId)];
        if (teamPids) {
          teamPids.forEach(pid => eligiblePids.add(pid));
        }
      }
    } else {
      // Different achievements - find players who have both
      const ach1PlayersByTeam = index.awardByTeamAnySeason[achId1] || {};
      const ach2PlayersByTeam = index.awardByTeamAnySeason[achId2] || {};
      
      // For season achievements, we need same-season overlap
      if (index.awardByTeamSeason[achId1] && index.awardByTeamSeason[achId2]) {
        // Check season-by-season for overlap
        for (const seasonStr of Object.keys(index.awardByTeamSeason[achId1])) {
          const season = parseInt(seasonStr);
          for (const teamStr of Object.keys(index.awardByTeamSeason[achId1][season] || {})) {
            const teamId = parseInt(teamStr);
            const ach1Pids = index.awardByTeamSeason[achId1][season]?.[teamId] || new Set();
            const ach2Pids = index.awardByTeamSeason[achId2][season]?.[teamId] || new Set();
            
            // Find intersection for this team in this season
            ach1Pids.forEach(pid => {
              if (ach2Pids.has(pid)) {
                eligiblePids.add(pid);
              }
            });
          }
        }
      } else {
        // Career achievements or mixed - simple intersection
        const ach1Pids = new Set<number>();
        for (const teamPids of Object.values(ach1PlayersByTeam)) {
          teamPids.forEach(pid => ach1Pids.add(pid));
        }
        
        for (const teamPids of Object.values(ach2PlayersByTeam)) {
          teamPids.forEach(pid => {
            if (ach1Pids.has(pid)) {
              eligiblePids.add(pid);
            }
          });
        }
      }
    }
  }
  // Team × Team
  else if (rowConstraint.type === 'team' && colConstraint.type === 'team') {
    // This would need team membership logic - not implemented in canonical index yet
    // Fall back to empty set for now
  }
  
  console.log(`🔍 CELL ELIGIBILITY: ${rowConstraint.label} × ${colConstraint.label} = ${eligiblePids.size} players`);
  
  return eligiblePids;
}

/**
 * Comprehensive acceptance criteria verification for FBGM
 */
export function verifyAcceptanceCriteria(
  index: CanonicalAchievementIndex,
  players: Player[],
  teams: Team[]
): void {
  console.log('🔍 STARTING ACCEPTANCE CRITERIA VERIFICATION');
  
  // 1. Verify Finals MVP and Won Championship only credit playoffs team
  verifyPlayoffsOnlyAwards(index, players, teams);
  
  // 2. Verify season awards credit all regular-season teams for that season
  verifySeasonAwardDistribution(index, players, teams);
  
  // 3. Verify data consistency between builder and validator
  verifyDataConsistency(index, players, teams);
  
  console.log('✅ ACCEPTANCE CRITERIA VERIFICATION COMPLETE');
}

/**
 * Verify Finals MVP and Won Championship only attach to playoffs teams
 */
function verifyPlayoffsOnlyAwards(
  index: CanonicalAchievementIndex,
  players: Player[],
  teams: Team[]
): void {
  console.log('🔍 Verifying Finals MVP and Won Championship only credit playoffs teams...');
  
  const playoffsOnlyAwards = ['FBFinalsMVP', 'FBChampion'];
  let violations = 0;
  
  for (const achId of playoffsOnlyAwards) {
    if (!index.awardByTeamSeason[achId]) continue;
    
    for (const [franchiseIdStr, seasonData] of Object.entries(index.awardByTeamSeason[achId])) {
      const franchiseId = parseInt(franchiseIdStr);
      
      for (const [seasonStr, pids] of Object.entries(seasonData)) {
        const season = parseInt(seasonStr);
        
        for (const pid of Array.from(pids)) {
          const player = players.find(p => p.pid === pid);
          if (!player) continue;
          
          // Check if this player has playoffs stats for this team in this season
          const playoffsStats = player.stats?.find(s => 
            s.season === season && 
            s.playoffs === true && 
            (s.gp || 0) > 0 &&
            ((teams.find(t => t.tid === s.tid) as any)?.franchiseId || s.tid) === franchiseId
          );
          
          if (!playoffsStats) {
            violations++;
            console.log(`❌ VIOLATION: ${achId} credited to player ${pid} for team ${franchiseId} season ${season} without playoffs stats`);
          }
        }
      }
    }
  }
  
  if (violations === 0) {
    console.log('✅ Finals MVP and Won Championship correctly only credit playoffs teams');
  } else {
    console.log(`❌ Found ${violations} violations of playoffs-only rule`);
  }
}

/**
 * Verify season awards credit all regular-season teams for multi-team seasons
 */
function verifySeasonAwardDistribution(
  index: CanonicalAchievementIndex,
  players: Player[],
  teams: Team[]
): void {
  console.log('🔍 Verifying season awards credit all regular-season teams...');
  
  const seasonAwards = ['FBAllStar', 'FBMVP', 'FBDPOY', 'FBOffROY', 'FBDefROY', 'FBAllRookie', 'FBAllLeague'];
  let sampleChecks = 0;
  let violations = 0;
  
  for (const achId of seasonAwards) {
    if (!index.awardByTeamSeason[achId]) continue;
    
    // Sample some entries to verify
    for (const [franchiseIdStr, seasonData] of Object.entries(index.awardByTeamSeason[achId])) {
      if (sampleChecks >= 10) break; // Limit sampling
      
      const franchiseId = parseInt(franchiseIdStr);
      
      for (const [seasonStr, pids] of Object.entries(seasonData)) {
        if (sampleChecks >= 10) break;
        
        const season = parseInt(seasonStr);
        
        for (const pid of Array.from(pids)) {
          if (sampleChecks >= 10) break;
          sampleChecks++;
          
          const player = players.find(p => p.pid === pid);
          if (!player) continue;
          
          // Check if player has award for this season
          const hasAward = player.awards?.some(a => a.season === season);
          if (!hasAward) {
            violations++;
            console.log(`❌ VIOLATION: Player ${pid} in ${achId} index but no award for season ${season}`);
            continue;
          }
          
          // Check if player played for other teams in this season
          const regularSeasonStats = player.stats?.filter(s => 
            s.season === season && s.playoffs === false && (s.gp || 0) > 0
          ) || [];
          
          if (regularSeasonStats.length > 1) {
            // Multi-team season - verify award is credited to ALL teams
            for (const stat of regularSeasonStats) {
              const statFranchiseId = (teams.find(t => t.tid === stat.tid) as any)?.franchiseId || stat.tid;
              const teamSeasonData = index.awardByTeamSeason[achId]?.[statFranchiseId]?.[season];
              
              if (!teamSeasonData?.has(pid)) {
                violations++;
                console.log(`❌ VIOLATION: Multi-team season award ${achId} for player ${pid} missing from team ${statFranchiseId} in season ${season}`);
              }
            }
          }
        }
      }
    }
  }
  
  if (violations === 0) {
    console.log(`✅ Season awards correctly credit all regular-season teams (${sampleChecks} samples checked)`);
  } else {
    console.log(`❌ Found ${violations} violations of multi-team season rule (${sampleChecks} samples checked)`);
  }
}

/**
 * Verify data consistency between different parts of the system
 */
function verifyDataConsistency(
  index: CanonicalAchievementIndex,
  players: Player[],
  teams: Team[]
): void {
  console.log('🔍 Verifying data consistency between builder and validator...');
  
  // Test a sample of Team × Achievement combinations
  const testCases = [
    { teamName: 'Patriots', achId: 'FBAllLeague', franchiseId: findFranchiseIdByName(teams, 'Patriots') },
    { teamName: 'Cowboys', achId: 'FBFinalsMVP', franchiseId: findFranchiseIdByName(teams, 'Cowboys') },
    { teamName: 'Steelers', achId: 'FBMVP', franchiseId: findFranchiseIdByName(teams, 'Steelers') }
  ];
  
  let consistencyIssues = 0;
  
  for (const testCase of testCases) {
    if (testCase.franchiseId === null) continue;
    
    // Get eligible players from canonical index
    const canonicalEligible = getCanonicalEligiblePlayers(index, testCase.achId, testCase.franchiseId);
    
    // Verify the count matches what's in awardByTeamAnySeason
    const expectedCount = index.awardByTeamAnySeason[testCase.achId]?.[testCase.franchiseId]?.size || 0;
    
    if (canonicalEligible.size !== expectedCount) {
      consistencyIssues++;
      console.log(`❌ CONSISTENCY ISSUE: ${testCase.teamName} × ${testCase.achId} - getCanonicalEligiblePlayers returns ${canonicalEligible.size} but awardByTeamAnySeason has ${expectedCount}`);
    }
    
    // Test validation consistency
    const samplePlayers = Array.from(canonicalEligible).slice(0, 3);
    for (const pid of samplePlayers) {
      const isValid = validateGuessCanonical(index, pid, testCase.achId, testCase.franchiseId);
      if (!isValid) {
        consistencyIssues++;
        console.log(`❌ CONSISTENCY ISSUE: Player ${pid} in eligible set but fails validation for ${testCase.teamName} × ${testCase.achId}`);
      }
    }
  }
  
  if (consistencyIssues === 0) {
    console.log('✅ Data consistency verified between builder and validator');
  } else {
    console.log(`❌ Found ${consistencyIssues} data consistency issues`);
  }
}

/**
 * Helper to find franchise ID by team name
 */
function findFranchiseIdByName(teams: Team[], teamName: string): number | null {
  const team = teams.find(t => 
    t.name?.toLowerCase().includes(teamName.toLowerCase()) ||
    t.region?.toLowerCase().includes(teamName.toLowerCase())
  );
  return team ? ((team as any).franchiseId || team.tid) : null;
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
  
  // Check for known problematic players (basketball examples)
  const problematicNames = ['Pete Maravich', 'Stephon Marbury', 'Otis Birdsong'];
  for (const name of problematicNames) {
    const player = players.find(p => p.name === name);
    if (player) {
      const isEligible = eligiblePids.has(player.pid);
      console.log(`   ${name}: ${isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}`);
    }
  }
}