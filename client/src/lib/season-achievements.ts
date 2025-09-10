// Season-specific achievement definitions
export interface SeasonAchievement {
  id: SeasonAchievementId;
  label: string;
  isSeasonSpecific: true;
  minPlayers: number;
}

export type SeasonAchievementId = 
  // Basketball GM achievements
  | 'AllStar'
  | 'MVP'
  | 'DPOY'
  | 'ROY'
  | 'SMOY'
  | 'MIP'
  | 'FinalsMVP'
  | 'AllLeagueAny'
  | 'AllDefAny'
  | 'AllRookieAny'
  | 'PointsLeader'
  | 'ReboundsLeader'
  | 'AssistsLeader'
  | 'StealsLeader'
  | 'BlocksLeader'
  // Football GM achievements
  | 'FBAllStar'
  | 'FBMVP'
  | 'FBDPOY'
  | 'FBOffROY'
  | 'FBDefROY'
  | 'FBChampion'
  | 'FBAllRookie'
  | 'FBAllLeague'
  | 'FBFinalsMVP'
  // Hockey achievements
  | 'HKAllStar'
  | 'HKMVP'
  | 'HKDefenseman'
  | 'HKROY'
  | 'HKChampion'
  | 'HKPlayoffsMVP'
  | 'HKFinalsMVP'
  | 'HKAllRookie'
  | 'HKAllLeague'
  | 'HKAllStarMVP'
  | 'HKAssistsLeader'
  // Baseball achievements
  | 'BBAllStar'
  | 'BBMVP'
  | 'BBROY'
  | 'BBChampion'
  | 'BBAllRookie'
  | 'BBAllLeague'
  | 'BBPlayoffsMVP'
  // Special handling achievements
  | 'SFMVP'; // Requires special team resolution logic

// Type for the season index - maps season -> teamId -> achievementId -> Set of player IDs
export type SeasonIndex = Record<number, Record<number, Record<SeasonAchievementId, Set<number>>>>;

import type { Player } from "@/types/bbgm";

// Award type mapping for different sports and naming conventions
const AWARD_TYPE_MAPPING: Record<string, SeasonAchievementId | null> = {
  // Basketball GM specific awards (case-sensitive exact matches from BBGM)
  'all-star': 'AllStar',
  'most valuable player': 'MVP',
  'defensive player of the year': 'DPOY',
  'rookie of the year': 'ROY',
  'sixth man of the year': 'SMOY',
  'most improved player': 'MIP',
  'finals mvp': 'FinalsMVP',
  'all-league team': 'AllLeagueAny',
  'first team all-league': 'AllLeagueAny',
  'second team all-league': 'AllLeagueAny',
  'third team all-league': 'AllLeagueAny',
  'all-defensive team': 'AllDefAny',
  'first team all-defensive': 'AllDefAny',
  'second team all-defensive': 'AllDefAny',
  'all-rookie team': 'AllRookieAny',

  // Alternative Basketball GM naming
  'bbgm all-star': 'AllStar',
  'basketball all-star': 'AllStar',
  'bbgm mvp': 'MVP',
  'basketball mvp': 'MVP',
  'bbgm most valuable player': 'MVP',
  'basketball most valuable player': 'MVP',
  'bbgm defensive player of the year': 'DPOY',
  'basketball defensive player of the year': 'DPOY',
  'bbgm rookie of the year': 'ROY',
  'basketball rookie of the year': 'ROY',
  'bbgm sixth man of the year': 'SMOY',
  'basketball sixth man of the year': 'SMOY',
  'bbgm most improved player': 'MIP',
  'basketball most improved player': 'MIP',
  'bbgm finals mvp': 'FinalsMVP',
  'basketball finals mvp': 'FinalsMVP',
  'bbgm all-league team': 'AllLeagueAny',
  'basketball all-league team': 'AllLeagueAny',
  'bbgm first team all-league': 'AllLeagueAny',
  'basketball first team all-league': 'AllLeagueAny', 
  'bbgm second team all-league': 'AllLeagueAny',
  'basketball second team all-league': 'AllLeagueAny',
  'bbgm third team all-league': 'AllLeagueAny',
  'basketball third team all-league': 'AllLeagueAny',
  // Additional potential Basketball GM All-League variations
  'all league': 'AllLeagueAny',
  'allleague': 'AllLeagueAny',
  'first team all league': 'AllLeagueAny',
  'second team all league': 'AllLeagueAny', 
  'third team all league': 'AllLeagueAny',
  'bbgm all-defensive team': 'AllDefAny',
  'basketball all-defensive team': 'AllDefAny',
  'bbgm all-rookie team': 'AllRookieAny',
  'basketball all-rookie team': 'AllRookieAny',

  // Statistical leader achievements
  'bbgm points leader': 'PointsLeader',
  'basketball points leader': 'PointsLeader',
  'bbgm rebounds leader': 'ReboundsLeader',
  'basketball rebounds leader': 'ReboundsLeader',
  'bbgm assists leader': 'AssistsLeader',
  'basketball assists leader': 'AssistsLeader',
  'bbgm steals leader': 'StealsLeader',
  'basketball steals leader': 'StealsLeader',
  'bbgm blocks leader': 'BlocksLeader',
  'basketball blocks leader': 'BlocksLeader',
  
  // Football GM specific awards (case-sensitive exact matches from FBGM)
  'All-Star': 'FBAllStar',
  'Most Valuable Player': 'FBMVP',
  'Defensive Player of the Year': 'FBDPOY',
  'Offensive Rookie of the Year': 'FBOffROY',
  'Defensive Rookie of the Year': 'FBDefROY',
  'Won Championship': 'FBChampion',
  'All-Rookie Team': 'FBAllRookie',
  'First Team All-League': 'FBAllLeague',
  'Second Team All-League': 'FBAllLeague',
  'Finals MVP': 'FBFinalsMVP',
  
  // Hockey GM (ZGMH) awards
  'All-Star Game': 'HKAllStar',
  'MVP': 'HKMVP',
  'Best Defenseman': 'HKDefenseman',
  'Rookie of the Year': 'HKROY',
  'Championship': 'HKChampion',
  'Playoffs MVP': 'HKPlayoffsMVP',
  'Finals MVP': 'HKFinalsMVP',
  'All-Rookie Team': 'HKAllRookie',
  'All-League Team': 'HKAllLeague',
  'All-Star Game MVP': 'HKAllStarMVP',
  'Assists Leader': 'HKAssistsLeader',
  
  // Special handling for certain achievements
  'Superstar Finals MVP': 'SFMVP', // Requires special team resolution
};

/**
 * Map award type to achievement ID, handling different sports and naming conventions
 */
function mapAwardToAchievement(awardType: string, sport?: 'basketball' | 'football' | 'hockey' | 'baseball'): SeasonAchievementId | null {
  if (!awardType) return null;
  
  // Sport-specific handling FIRST (takes priority over global mapping)
  if (sport === 'football') {
    // Football GM specific mappings (case-sensitive exact matches from FBGM)
    if (awardType === 'All-Star') return 'FBAllStar';
    if (awardType === 'Most Valuable Player') return 'FBMVP';
    if (awardType === 'Defensive Player of the Year') return 'FBDPOY';
    if (awardType === 'Offensive Rookie of the Year') return 'FBOffROY';
    if (awardType === 'Defensive Rookie of the Year') return 'FBDefROY';
    if (awardType === 'Won Championship') return 'FBChampion';
    if (awardType === 'All-Rookie Team') return 'FBAllRookie';
    if (awardType === 'First Team All-League') return 'FBAllLeague';
    if (awardType === 'Second Team All-League') return 'FBAllLeague';
  } else if (sport === 'baseball') {
    // Baseball-specific mappings (case-sensitive exact matches from ZGMB)
    if (awardType === 'All-Star') return 'BBAllStar';
    if (awardType === 'Most Valuable Player') return 'BBMVP';
    if (awardType === 'Rookie of the Year') return 'BBROY';
    if (awardType === 'Won Championship') return 'BBChampion';
    if (awardType === 'All-Rookie Team') return 'BBAllRookie';
    if (awardType === 'All-League Team') return 'BBAllLeague';
    if (awardType === 'First Team All-League') return 'BBAllLeague';
    if (awardType === 'Second Team All-League') return 'BBAllLeague';
    if (awardType === 'Finals MVP') return 'BBPlayoffsMVP';
    if (awardType === 'Playoffs MVP') return 'BBPlayoffsMVP';
  } else if (sport === 'hockey') {
    // Hockey GM specific mappings  
    if (awardType === 'All-Star Game') return 'HKAllStar';
    if (awardType === 'MVP') return 'HKMVP';
    if (awardType === 'Best Defenseman') return 'HKDefenseman';
    if (awardType === 'Rookie of the Year') return 'HKROY';
    if (awardType === 'Championship') return 'HKChampion';
    if (awardType === 'Playoffs MVP') return 'HKPlayoffsMVP';
    if (awardType === 'Finals MVP') return 'HKFinalsMVP';
    if (awardType === 'All-Rookie Team') return 'HKAllRookie';
    if (awardType === 'All-League Team') return 'HKAllLeague';
    if (awardType === 'All-Star Game MVP') return 'HKAllStarMVP';
    if (awardType === 'Assists Leader') return 'HKAssistsLeader';
  }
  
  // Try normalized version for Basketball GM
  const normalized = awardType.toLowerCase().trim();
  
  // Direct exact match from global mapping (for Basketball and missed cases)
  if (AWARD_TYPE_MAPPING[awardType]) {
    return AWARD_TYPE_MAPPING[awardType];
  }
  
  // Fall back to normalized mapping
  return AWARD_TYPE_MAPPING[normalized] || null;
}

/**
 * Calculate Basketball GM season leaders (Points, Rebounds, Assists, Steals, Blocks)
 * Following the exact specification provided by the user
 */
function calculateBBGMSeasonLeaders(
  players: Player[], 
  season: number, 
  gameAttributes: any
): Record<string, number[]> {
  const leaders: Record<string, number[]> = {
    PointsLeader: [],
    ReboundsLeader: [],
    AssistsLeader: [],
    StealsLeader: [],
    BlocksLeader: []
  };

  // Step 1: Get season length G
  let G = gameAttributes?.numGames || 0;
  if (!G || G <= 0) {
    // Fallback: compute G as max regular-season gp for any player in this season
    G = 0;
    for (const player of players) {
      if (player.stats) {
        for (const stat of player.stats) {
          if (stat.season === season && !stat.playoffs && (stat.gp || 0) > 0) {
            G = Math.max(G, stat.gp || 0);
          }
        }
      }
    }
    if (G === 0) G = 82; // Final fallback
  }
  
  const minGames = Math.ceil(0.7 * G);

  // Step 2: Aggregate per player for this season
  const playerSeasonStats: Array<{
    pid: number;
    pts: number;
    trb: number;
    ast: number;
    stl: number;
    blk: number;
    gp: number;
    teams: Set<number>;
  }> = [];

  for (const player of players) {
    if (!player.stats) continue;

    // Get all regular-season rows for this season
    const regularSeasonStats = player.stats.filter(s => 
      s.season === season && !s.playoffs
    );

    if (regularSeasonStats.length === 0) continue;

    // Aggregate across teams
    let gpS = 0, ptsS = 0, trbS = 0, astS = 0, stlS = 0, blkS = 0;
    const teamsS = new Set<number>();

    for (const stat of regularSeasonStats) {
      const gp = stat.gp || 0;
      if (gp > 0) {
        gpS += gp;
        ptsS += (stat.pts || 0);
        
        // Handle different rebound field names (trb, reb, or orb+drb)
        const statAny = stat as any;
        trbS += (stat.trb || statAny.reb || ((statAny.orb || 0) + (statAny.drb || 0)) || 0);
        
        astS += (stat.ast || 0);
        stlS += (stat.stl || 0);
        blkS += (stat.blk || 0);
        teamsS.add(stat.tid);
      }
    }

    // Step 3: Eligibility filter - skip players with gpS == 0 or below threshold
    if (gpS === 0 || gpS < minGames) continue;

    playerSeasonStats.push({
      pid: player.pid,
      pts: ptsS,
      trb: trbS,
      ast: astS,
      stl: stlS,
      blk: blkS,
      gp: gpS,
      teams: teamsS
    });
  }

  if (playerSeasonStats.length === 0) return leaders;

  try {
    // Step 4: Find leaders for each category using 1e-9 epsilon and tie-breaking by totals
    
    // Points Leader - exclude players with 0 total points (early seasons might not track points properly)
    const playersWithPoints = playerSeasonStats.filter(p => p.pts > 0);
    if (playersWithPoints.length > 0) {
      const maxPPG = Math.max(...playersWithPoints.map(p => p.pts / p.gp));
      const pointsLeaderCandidates = playersWithPoints.filter(p => 
        Math.abs((p.pts / p.gp) - maxPPG) < 1e-9
      );
      
      // Break ties by higher total points
      if (pointsLeaderCandidates.length > 1) {
        const maxPts = Math.max(...pointsLeaderCandidates.map(p => p.pts));
        leaders.PointsLeader = pointsLeaderCandidates
          .filter(p => p.pts === maxPts)
          .map(p => p.pid);
      } else {
        leaders.PointsLeader = pointsLeaderCandidates.map(p => p.pid);
      }
    }

    // Rebounds Leader - exclude players with 0 total rebounds (early seasons didn't track rebounds)
    const playersWithRebounds = playerSeasonStats.filter(p => p.trb > 0);
    if (playersWithRebounds.length > 0) {
      const maxRPG = Math.max(...playersWithRebounds.map(p => p.trb / p.gp));
      const reboundsLeaderCandidates = playersWithRebounds.filter(p => 
        Math.abs((p.trb / p.gp) - maxRPG) < 1e-9
      );
      
      // Break ties by higher total rebounds
      if (reboundsLeaderCandidates.length > 1) {
        const maxTrb = Math.max(...reboundsLeaderCandidates.map(p => p.trb));
        leaders.ReboundsLeader = reboundsLeaderCandidates
          .filter(p => p.trb === maxTrb)
          .map(p => p.pid);
      } else {
        leaders.ReboundsLeader = reboundsLeaderCandidates.map(p => p.pid);
      }
    }

    // Assists Leader - exclude players with 0 total assists (early seasons didn't track assists)
    const playersWithAssists = playerSeasonStats.filter(p => p.ast > 0);
    if (playersWithAssists.length > 0) {
      const maxAPG = Math.max(...playersWithAssists.map(p => p.ast / p.gp));
      const assistsLeaderCandidates = playersWithAssists.filter(p => 
        Math.abs((p.ast / p.gp) - maxAPG) < 1e-9
      );
      
      // Break ties by higher total assists
      if (assistsLeaderCandidates.length > 1) {
        const maxAst = Math.max(...assistsLeaderCandidates.map(p => p.ast));
        leaders.AssistsLeader = assistsLeaderCandidates
          .filter(p => p.ast === maxAst)
          .map(p => p.pid);
      } else {
        leaders.AssistsLeader = assistsLeaderCandidates.map(p => p.pid);
      }
    }

    // Steals Leader - exclude players with 0 total steals (early seasons didn't track steals)
    const playersWithSteals = playerSeasonStats.filter(p => p.stl > 0);
    if (playersWithSteals.length > 0) {
      const maxSPG = Math.max(...playersWithSteals.map(p => p.stl / p.gp));
      const stealsLeaderCandidates = playersWithSteals.filter(p => 
        Math.abs((p.stl / p.gp) - maxSPG) < 1e-9
      );
      
      // Break ties by higher total steals
      if (stealsLeaderCandidates.length > 1) {
        const maxStl = Math.max(...stealsLeaderCandidates.map(p => p.stl));
        leaders.StealsLeader = stealsLeaderCandidates
          .filter(p => p.stl === maxStl)
          .map(p => p.pid);
      } else {
        leaders.StealsLeader = stealsLeaderCandidates.map(p => p.pid);
      }
    }

    // Blocks Leader - exclude players with 0 total blocks (early seasons didn't track blocks)
    const playersWithBlocks = playerSeasonStats.filter(p => p.blk > 0);
    if (playersWithBlocks.length > 0) {
      const maxBPG = Math.max(...playersWithBlocks.map(p => p.blk / p.gp));
      const blocksLeaderCandidates = playersWithBlocks.filter(p => 
        Math.abs((p.blk / p.gp) - maxBPG) < 1e-9
      );
      
      // Break ties by higher total blocks
      if (blocksLeaderCandidates.length > 1) {
        const maxBlk = Math.max(...blocksLeaderCandidates.map(p => p.blk));
        leaders.BlocksLeader = blocksLeaderCandidates
          .filter(p => p.blk === maxBlk)
          .map(p => p.pid);
      } else {
        leaders.BlocksLeader = blocksLeaderCandidates.map(p => p.pid);
      }
    }

  } catch (error) {
    console.warn('Error calculating season leaders:', error);
    return leaders;
  }

  return leaders;
}

/**
 * Get teams a player appeared for in a given season (gp > 0 or min > 0)
 */
function getSeasonTeams(player: Player, season: number): Set<number> {
  const teams = new Set<number>();
  
  if (!player.stats) return teams;
  
  for (const stat of player.stats) {
    if (stat.season === season && !stat.playoffs && ((stat.gp || 0) > 0 || (stat.min || 0) > 0)) {
      teams.add(stat.tid);
    }
  }
  
  return teams;
}

/**
 * Resolve the primary team for a player in a specific season based on minutes played
 * Used for awards that don't have a team ID attached
 */
function resolvePrimaryTeamForSeason(player: Player, season: number): number | null {
  if (!player.stats) return null;
  
  // Get all regular season stats for this season
  const seasonStats = player.stats.filter(stat => 
    stat.season === season && !stat.playoffs
  );
  
  if (seasonStats.length === 0) return null;
  
  // Find team with most minutes played
  let maxMinutes = 0;
  let primaryTeam: number | null = null;
  
  for (const stat of seasonStats) {
    const minutes = stat.min || 0;
    if (minutes > maxMinutes) {
      maxMinutes = minutes;
      primaryTeam = stat.tid;
    }
  }
  
  // Fallback to games played if no minutes data
  if (primaryTeam === null) {
    let maxGames = 0;
    for (const stat of seasonStats) {
      const games = stat.gp || 0;
      if (games > maxGames) {
        maxGames = games;
        primaryTeam = stat.tid;
      }
    }
  }
  
  return primaryTeam;
}

/**
 * Resolve Finals MVP team from playoffs stats
 * Used for both BBGM FinalsMVP and FBGM FBFinalsMVP
 */
function resolveFinalsMVPTeam(player: Player, season: number): number | null {
  if (!player.stats) return null;
  
  const playoffStats = player.stats.filter(s => 
    s.season === season && s.playoffs
  );
  
  if (playoffStats.length === 0) return null;
  
  // If only one playoffs team, use that
  if (playoffStats.length === 1) {
    return playoffStats[0].tid;
  }
  
  // Multiple playoff teams - pick the one with most minutes
  let bestTeam = playoffStats[0].tid;
  let maxMinutes = playoffStats[0].min || 0;
  
  for (const stat of playoffStats.slice(1)) {
    const minutes = stat.min || 0;
    if (minutes > maxMinutes) {
      maxMinutes = minutes;
      bestTeam = stat.tid;
    }
  }
  
  return bestTeam;
}

/**
 * Resolve Superstar Finals MVP team using regular season stats
 * This is a special achievement that uses regular season performance
 */
function resolveSFMVPTeam(player: Player, season: number): number | null {
  if (!player.stats) return null;
  
  const regularStats = player.stats.filter(s => 
    s.season === season && !s.playoffs
  );
  
  if (regularStats.length === 0) return null;
  
  // If only one regular season team, use that
  if (regularStats.length === 1) {
    return regularStats[0].tid;
  }
  
  // Multiple regular season teams - pick the one with most minutes
  let bestTeam = regularStats[0].tid;
  let maxMinutes = regularStats[0].min || 0;
  
  for (const stat of regularStats.slice(1)) {
    const minutes = stat.min || 0;
    if (minutes > maxMinutes) {
      maxMinutes = minutes;
      bestTeam = stat.tid;
    }
  }
  
  return bestTeam;
}

/**
 * Build comprehensive season achievement index from player data
 */
export function buildSeasonIndex(
  players: Player[],
  sport: 'basketball' | 'football' | 'hockey' | 'baseball' = 'basketball'
): SeasonIndex {
  const seasonIndex: SeasonIndex = {};
  let totalIndexed = 0;
  let skippedEntries = 0;

  // Process traditional award-based achievements
  for (const player of players) {
    if (!player.awards || player.awards.length === 0) continue;

    for (const award of player.awards) {
      const achievementId = mapAwardToAchievement(award.type, sport);
      if (!achievementId) {
        skippedEntries++;
        continue;
      }

      const season = award.season;
      if (!season) {
        skippedEntries++;
        continue;
      }
      
      if (achievementId === 'FBFinalsMVP' || achievementId === 'FinalsMVP') {
        const playoffsTeam = resolveFinalsMVPTeam(player, season);
        if (playoffsTeam !== null) {
          if (!seasonIndex[season]) seasonIndex[season] = {};
          if (!seasonIndex[season][playoffsTeam]) seasonIndex[season][playoffsTeam] = {} as Record<SeasonAchievementId, Set<number>>;
          if (!seasonIndex[season][playoffsTeam][achievementId]) seasonIndex[season][playoffsTeam][achievementId] = new Set();
          
          seasonIndex[season][playoffsTeam][achievementId].add(player.pid);
          totalIndexed++;
        } else {
          skippedEntries++;
        }
        continue;
      }
      
      if (achievementId === 'SFMVP') {
        const playoffsTeam = resolveSFMVPTeam(player, season);
        if (playoffsTeam !== null) {
          if (!seasonIndex[season]) seasonIndex[season] = {};
          if (!seasonIndex[season][playoffsTeam]) seasonIndex[season][playoffsTeam] = {} as Record<SeasonAchievementId, Set<number>>;
          if (!seasonIndex[season][playoffsTeam][achievementId]) seasonIndex[season][playoffsTeam][achievementId] = new Set();
          
          seasonIndex[season][playoffsTeam][achievementId].add(player.pid);
          totalIndexed++;
        } else {
          skippedEntries++;
        }
        continue;
      }
      
      // Handle all other awards - resolve to primary team based on minutes played
      // This is the critical fix for awards like All-League Team, All-Star, MVP, etc.
      const primaryTeam = resolvePrimaryTeamForSeason(player, season);
      
      if (primaryTeam === null) {
        // No regular season stats for this award season, skip
        skippedEntries++;
        continue;
      }
      
      // Add to the primary team (the team they played the most minutes for)
      if (!seasonIndex[season]) seasonIndex[season] = {};
      if (!seasonIndex[season][primaryTeam]) seasonIndex[season][primaryTeam] = {} as Record<SeasonAchievementId, Set<number>>;
      if (!seasonIndex[season][primaryTeam][achievementId]) seasonIndex[season][primaryTeam][achievementId] = new Set();
      
      seasonIndex[season][primaryTeam][achievementId].add(player.pid);
      totalIndexed++;
    }
  }
  
  // Calculate Basketball GM season leaders (new logic for statistical leaders)
  if (sport === 'basketball') {
    console.log('🏀 Calculating Basketball GM season leaders...');
    let leaderEntriesAdded = 0;
    
    // Get all seasons from existing index or detect from players
    const allSeasons = new Set<number>();
    for (const season of Object.keys(seasonIndex)) {
      allSeasons.add(parseInt(season));
    }
    
    // Also detect seasons from player stats
    for (const player of players) {
      if (player.stats) {
        for (const stat of player.stats) {
          if (stat.season && !stat.playoffs) {
            allSeasons.add(stat.season);
          }
        }
      }
    }
    
    // Calculate leaders for each season
    for (const season of Array.from(allSeasons)) {
      // Get gameAttributes for this season (simplified)
      const gameAttributes = { numGames: 82 }; // Default to 82, could be enhanced
      
      const seasonLeaders = calculateBBGMSeasonLeaders(players, season, gameAttributes);
      
      // Add leaders to season index with proper team attachment
      for (const [leaderId, playerIds] of Object.entries(seasonLeaders)) {
        const achievementId = leaderId as SeasonAchievementId;
        
        for (const pid of playerIds) {
          const player = players.find(p => p.pid === pid);
          if (!player) continue;
          
          // Get all teams this player played for in this season
          const seasonTeams = getSeasonTeams(player, season);
          
          // Attach leader achievement to all teams they played for
          for (const tid of Array.from(seasonTeams)) {
            if (!seasonIndex[season]) seasonIndex[season] = {};
            if (!seasonIndex[season][tid]) seasonIndex[season][tid] = {} as Record<SeasonAchievementId, Set<number>>;
            if (!seasonIndex[season][tid][achievementId]) seasonIndex[season][tid][achievementId] = new Set();
            
            seasonIndex[season][tid][achievementId].add(pid);
            leaderEntriesAdded++;
          }
        }
      }
    }
    
    console.log(`🏀 Basketball GM leaders added: ${leaderEntriesAdded} entries`);
  }
  
  // Log statistics
  const seasons = Object.keys(seasonIndex).length;
  const achievements = Object.values(seasonIndex).flatMap(season => 
    Object.values(season).flatMap(team => Object.keys(team))
  ).length;
  
  console.log(`✅ Season index built: ${totalIndexed} entries indexed, ${skippedEntries} skipped`);
  console.log(`📊 Coverage: ${seasons} seasons, ${achievements} team-achievement combinations`);
  
  return seasonIndex;
}

/**
 * Get eligible players for a team-achievement combination
 */
export function getSeasonEligiblePlayers(
  seasonIndex: SeasonIndex, 
  teamId: number, 
  achievementId: SeasonAchievementId
): Set<number> {
  const allPlayers = new Set<number>();
  
  // Search across all seasons for this team-achievement combination
  for (const seasonStr of Object.keys(seasonIndex)) {
    const season = parseInt(seasonStr);
    const seasonData = seasonIndex[season];
    if (seasonData[teamId] && seasonData[teamId][achievementId]) {
      for (const pid of Array.from(seasonData[teamId][achievementId])) {
        allPlayers.add(pid);
      }
    }
  }
  
  return allPlayers;
}

// All season-specific achievements available in the system
export const SEASON_ACHIEVEMENTS: SeasonAchievement[] = [
  // Basketball GM achievements
  {
    id: 'AllStar',
    label: 'All-Star',
    isSeasonSpecific: true,
    minPlayers: 10
  },
  {
    id: 'MVP',
    label: 'MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'DPOY',
    label: 'Defensive Player of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'ROY',
    label: 'Rookie of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'SMOY',
    label: 'Sixth Man of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'MIP',
    label: 'Most Improved Player',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FinalsMVP',
    label: 'Finals MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'AllLeagueAny',
    label: 'All-League Team',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'AllDefAny',
    label: 'All-Defensive Team',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'AllRookieAny',
    label: 'All-Rookie Team',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'PointsLeader',
    label: 'League Points Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'ReboundsLeader',
    label: 'League Rebounds Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'AssistsLeader',
    label: 'League Assists Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'StealsLeader',
    label: 'League Steals Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BlocksLeader',
    label: 'League Blocks Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  
  // Football GM achievements
  {
    id: 'FBAllStar',
    label: 'All-Star',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'FBMVP',
    label: 'MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBDPOY',
    label: 'Defensive Player of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBOffROY',
    label: 'Offensive Rookie of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBDefROY',
    label: 'Defensive Rookie of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBChampion',
    label: 'Won Championship',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'FBAllRookie',
    label: 'All-Rookie Team',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBAllLeague',
    label: 'All-League Team',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBFinalsMVP',
    label: 'Finals MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  
  // Hockey GM (ZGMH) achievements
  {
    id: 'HKAllStar',
    label: 'All-Star',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'HKMVP',
    label: 'MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKDefenseman',
    label: 'Best Defenseman',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKROY',
    label: 'Rookie of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKChampion',
    label: 'Won Championship',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'HKPlayoffsMVP',
    label: 'Playoffs MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKFinalsMVP',
    label: 'Finals MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKAllRookie',
    label: 'All-Rookie Team',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKAllLeague',
    label: 'All-League Team',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'HKAllStarMVP',
    label: 'All-Star MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKAssistsLeader',
    label: 'Assists Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  
  // Baseball achievements
  {
    id: 'BBAllStar',
    label: 'All-Star',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'BBMVP',
    label: 'MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBROY',
    label: 'Rookie of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBChampion',
    label: 'Won Championship',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'BBAllRookie',
    label: 'All-Rookie Team',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBAllLeague',
    label: 'All-League Team',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'BBPlayoffsMVP',
    label: 'Playoffs MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  
  // Special handling achievements
  {
    id: 'SFMVP',
    label: 'Superstar Finals MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  }
];