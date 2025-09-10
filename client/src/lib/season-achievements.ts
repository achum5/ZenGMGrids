// Season achievement constants and utility functions for Immaculate Grid

/**
 * Configuration for minimum games played requirement 
 * These values ensure statistical leader calculations are meaningful
 */
export const MIN_GAMES_MULTIPLIER = 0.7; // Player must play 70% of season games
export const DEFAULT_SEASON_GAMES = 82; // Default NBA season length

/**
 * Type definitions for season achievement system
 */
export interface SeasonAchievement {
  id: SeasonAchievementId;
  label: string;
  isSeasonSpecific: boolean;
  minPlayers: number;
}

export type SeasonAchievementId = 
  // Basketball GM achievements
  | 'AllStar' | 'MVP' | 'DPOY' | 'ROY' | 'SMOY' | 'MIP' | 'FinalsMVP' | 'Champion'
  | 'AllLeagueAny' | 'AllDefAny' | 'AllRookieAny'
  | 'PointsLeader' | 'ReboundsLeader' | 'AssistsLeader' | 'StealsLeader' | 'BlocksLeader'
  
  // Football GM achievements
  | 'FBAllStar' | 'FBMVP' | 'FBDPOY' | 'FBOffROY' | 'FBDefROY' | 'FBChampion'
  | 'FBAllRookie' | 'FBAllLeague' | 'FBFinalsMVP'
  
  // Hockey GM achievements  
  | 'HKAllStar' | 'HKMVP' | 'HKDefenseman' | 'HKROY' | 'HKChampion' 
  | 'HKPlayoffsMVP' | 'HKFinalsMVP' | 'HKAllRookie' | 'HKAllLeague'
  | 'HKAllStarMVP' | 'HKAssistsLeader'
  
  // Baseball GM achievements
  | 'BBAllStar' | 'BBMVP' | 'BBROY' | 'BBChampion' | 'BBAllRookie' 
  | 'BBAllLeague' | 'BBPlayoffsMVP' | 'BBAllStarMVP' | 'BBPitcherOTY'
  | 'BBGoldGlove' | 'BBSilverSlugger'
  | 'BBBattingAvgLeader' | 'BBHomeRunLeader' | 'BBRBILeader' | 'BBStolenBaseLeader'
  | 'BBOBPLeader' | 'BBSluggingLeader' | 'BBOPSLeader' | 'BBHitsLeader'
  | 'BBERALeader' | 'BBStrikeoutsLeader' | 'BBSavesLeader' | 'BBReliefPitcherOTY';

/**
 * Type for the season index data structure
 * Maps season -> franchiseId -> achievement -> set of player IDs
 */
export type SeasonIndex = Record<number, Record<number, Record<SeasonAchievementId, Set<number>>>>;

/**
 * Type for the career-ever achievement index
 * Maps achievementId -> set of player IDs who ever achieved it
 * Used for Achievement × Achievement cells with career-ever logic
 */
export type CareerEverIndex = Record<string, Set<number>>;

import type { Player } from "@/types/bbgm";

// Award type mapping for Basketball GM - exact strings only
const BASKETBALL_AWARD_MAPPING: Record<string, SeasonAchievementId | null> = {
  // Exact Basketball GM award strings (case-sensitive)
  'All-Star': 'AllStar',
  'Most Valuable Player': 'MVP',
  'Defensive Player of the Year': 'DPOY',
  'Rookie of the Year': 'ROY',
  'Sixth Man of the Year': 'SMOY',
  'Most Improved Player': 'MIP',
  'Finals MVP': 'FinalsMVP',
  'Won Championship': 'Champion',
  'All-League Team': 'AllLeagueAny',
  'First Team All-League': 'AllLeagueAny',
  'Second Team All-League': 'AllLeagueAny',
  'Third Team All-League': 'AllLeagueAny',
  'All-Defensive Team': 'AllDefAny',
  'First Team All-Defensive': 'AllDefAny',
  'Second Team All-Defensive': 'AllDefAny',
  'All-Rookie Team': 'AllRookieAny',
  
  // Lowercase variants
  'all-star': 'AllStar',
  'most valuable player': 'MVP',
  'defensive player of the year': 'DPOY',
  'rookie of the year': 'ROY',
  'sixth man of the year': 'SMOY',
  'most improved player': 'MIP',
  'finals mvp': 'FinalsMVP',
  'won championship': 'Champion',
  'all-league team': 'AllLeagueAny',
  'first team all-league': 'AllLeagueAny',
  'second team all-league': 'AllLeagueAny',
  'third team all-league': 'AllLeagueAny',
  'all-defensive team': 'AllDefAny',
  'first team all-defensive': 'AllDefAny',
  'second team all-defensive': 'AllDefAny',
  'all-rookie team': 'AllRookieAny'
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
    if (awardType === 'Finals MVP') return 'FBFinalsMVP';
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
  
  // Default to Basketball GM mapping (for basketball sport or no sport specified)
  if (BASKETBALL_AWARD_MAPPING[awardType]) {
    return BASKETBALL_AWARD_MAPPING[awardType];
  }
  
  // Handle Basketball GM All-League variations with additional pattern matching
  if (sport === 'basketball' || !sport) {
    const lowerType = awardType.toLowerCase();
    if (lowerType.includes('all-league') || lowerType.includes('all league')) {
      return 'AllLeagueAny';
    }
    if (lowerType.includes('all-defensive') || lowerType.includes('all defensive')) {
      return 'AllDefAny';
    }
    if (lowerType.includes('all-rookie') || lowerType.includes('all rookie')) {
      return 'AllRookieAny';
    }
  }
  
  // Fall back to normalized mapping
  const normalized = awardType.toLowerCase().trim();
  return BASKETBALL_AWARD_MAPPING[normalized] || null;
}

/**
 * Calculate Basketball GM season leaders (Points, Rebounds, Assists, Steals, Blocks)
 * Following the exact specification provided by the user
 */
export function calculateBBGMSeasonLeaders(
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

    // Aggregate stats and track teams
    let totalPts = 0, totalTrb = 0, totalAst = 0, totalStl = 0, totalBlk = 0, totalGp = 0;
    const teams = new Set<number>();

    for (const stat of regularSeasonStats) {
      if ((stat.gp || 0) > 0) {
        totalPts += stat.pts || 0;
        totalTrb += stat.trb || 0; // Use total rebounds directly
        totalAst += stat.ast || 0;
        totalStl += stat.stl || 0;
        totalBlk += stat.blk || 0;
        totalGp += stat.gp || 0;
        teams.add(stat.tid);
      }
    }

    if (totalGp >= minGames) {
      playerSeasonStats.push({
        pid: player.pid,
        pts: totalPts,
        trb: totalTrb,
        ast: totalAst,
        stl: totalStl,
        blk: totalBlk,
        gp: totalGp,
        teams
      });
    }
  }

  // Step 3: Find leaders for each category
  const categories = [
    { key: 'PointsLeader', stat: 'pts' },
    { key: 'ReboundsLeader', stat: 'trb' },
    { key: 'AssistsLeader', stat: 'ast' },
    { key: 'StealsLeader', stat: 'stl' },
    { key: 'BlocksLeader', stat: 'blk' }
  ] as const;

  for (const { key, stat } of categories) {
    if (playerSeasonStats.length === 0) continue;

    // Calculate per-game averages and find maximum, but only for players with >0 in that stat
    const playerAverages = playerSeasonStats
      .filter(p => (p[stat] as number) > 0) // Must have recorded >0 in this stat category
      .map(p => ({
        pid: p.pid,
        avg: (p[stat] as number) / p.gp
      }));

    if (playerAverages.length === 0) continue; // No players had this stat recorded in this season

    const maxAvg = Math.max(...playerAverages.map(p => p.avg));
    
    // Find all players with the maximum average (handle ties)
    const leaderPids = playerAverages
      .filter(p => Math.abs(p.avg - maxAvg) < 0.0001) // Handle floating point precision
      .map(p => p.pid);

    leaders[key] = leaderPids;
  }

  return leaders;
}

/**
 * Get franchises a player appeared for in a given season (gp > 0 or min > 0)
 * Uses franchiseId for proper franchise continuity across relocations/renames
 */
function getSeasonFranchises(player: Player, season: number): Set<number> {
  const franchises = new Set<number>();
  
  if (!player.stats) return franchises;
  
  for (const stat of player.stats) {
    if (stat.season === season && !stat.playoffs && ((stat.gp || 0) > 0 || (stat.min || 0) > 0)) {
      // Use franchiseId if available, fallback to tid
      const franchiseId = (stat as any).franchiseId ?? stat.tid;
      franchises.add(franchiseId);
    }
  }
  
  return franchises;
}

/**
 * Get teams a player appeared for in a given season (gp > 0 or min > 0) - legacy function
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
 * Resolve Finals MVP team from playoffs stats
 * Used for both BBGM FinalsMVP and FBGM FBFinalsMVP
 */
function resolveFinalsMVPTeam(player: Player, season: number): number | null {
  if (!player.stats) return null;
  
  // Look for playoffs stats in the Finals MVP season
  const playoffStats = player.stats.filter(s => 
    s.season === season && s.playoffs && (s.gp || 0) > 0
  );
  
  if (playoffStats.length === 0) return null;
  
  // Use the team with the most playoff games played (in case of trades)
  let maxGames = 0;
  let bestTeam: number | null = null;
  
  for (const stat of playoffStats) {
    const games = stat.gp || 0;
    if (games > maxGames) {
      maxGames = games;
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
      
      
      // Handle all other awards (multi-team rule) - use franchiseId mapping
      const seasonFranchises = getSeasonFranchises(player, season);
      
      if (seasonFranchises.size === 0) {
        // No regular season stats for this award season, skip
        skippedEntries++;
        continue;
      }
      
      // Add to all franchises the player appeared for in this season
      for (const franchiseId of Array.from(seasonFranchises)) {
        if (!seasonIndex[season]) seasonIndex[season] = {};
        if (!seasonIndex[season][franchiseId]) seasonIndex[season][franchiseId] = {} as Record<SeasonAchievementId, Set<number>>;
        if (!seasonIndex[season][franchiseId][achievementId]) seasonIndex[season][franchiseId][achievementId] = new Set();
        
        seasonIndex[season][franchiseId][achievementId].add(player.pid);
        totalIndexed++;
      }
    }
  }
  
  // Calculate Basketball GM season leaders (new logic for statistical leaders)
  if (sport === 'basketball') {
    console.log('🏀 Calculating Basketball GM season leaders...');
    let leaderEntriesAdded = 0;
    
    // Get all seasons from existing index or detect from players
    const allSeasons = new Set<number>();
    for (const seasonStr of Object.keys(seasonIndex)) {
      allSeasons.add(parseInt(seasonStr));
    }
    
    // Also check player stats for any additional seasons
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
    for (const season of Array.from(allSeasons).sort((a, b) => a - b)) {
      const seasonLeaders = calculateBBGMSeasonLeaders(players, season, null);
      
      for (const [achievementId, playerIds] of Object.entries(seasonLeaders)) {
        for (const pid of playerIds) {
          const player = players.find(p => p.pid === pid);
          if (!player) continue;
          
          // Get all franchises this player played for in this season
          const seasonFranchises = getSeasonFranchises(player, season);
          
          // Attach leader achievement to all franchises they played for
          for (const franchiseId of Array.from(seasonFranchises)) {
            if (!seasonIndex[season]) seasonIndex[season] = {};
            if (!seasonIndex[season][franchiseId]) seasonIndex[season][franchiseId] = {} as Record<SeasonAchievementId, Set<number>>;
            if (!seasonIndex[season][franchiseId][achievementId as SeasonAchievementId]) seasonIndex[season][franchiseId][achievementId as SeasonAchievementId] = new Set();
            
            seasonIndex[season][franchiseId][achievementId as SeasonAchievementId].add(pid);
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
  );
  const uniqueAchievements = new Set(achievements).size;
  
  console.log(`✅ Season index built: ${totalIndexed} entries across ${seasons} seasons, ${uniqueAchievements} unique achievements`);
  console.log(`⚠️ Skipped ${skippedEntries} entries due to missing data`);
  
  return seasonIndex;
}

/**
 * Build career-ever achievement index for Achievement × Achievement cells
 * This index tracks which players ever achieved each achievement (career-wide, no season alignment)
 */
export function buildCareerEverIndex(players: Player[], sport?: string): CareerEverIndex {
  const careerEverIndex: CareerEverIndex = {};
  
  console.log(`🔄 Building career-ever achievement index for ${sport || 'basketball'}...`);
  
  // Initialize all possible achievement sets
  const allAchievements = getAllPossibleAchievements(sport);
  for (const achievement of allAchievements) {
    careerEverIndex[achievement] = new Set<number>();
  }
  
  let totalIndexed = 0;
  
  for (const player of players) {
    if (!player.awards) continue;
    
    // Track achievements for this player
    const playerAchievements = new Set<string>();
    
    // Process awards
    for (const award of player.awards) {
      const achievementId = mapAwardToAchievement(award.type, sport as any);
      if (achievementId) {
        playerAchievements.add(achievementId);
      }
    }
    
    // Add career milestones (10+ seasons, 20k points, etc.)
    const careerAchievements = getCareerMilestones(player);
    careerAchievements.forEach(achievement => playerAchievements.add(achievement));
    
    // Add this player to all their achievements in the career-ever index
    for (const achievement of playerAchievements) {
      if (!careerEverIndex[achievement]) {
        careerEverIndex[achievement] = new Set<number>();
      }
      careerEverIndex[achievement].add(player.pid);
      totalIndexed++;
    }
  }
  
  // Calculate statistical leaders across all seasons and add to career-ever index
  if (sport === 'basketball' || !sport) {
    addCareerEverLeaders(players, careerEverIndex);
  }
  
  console.log(`✅ Career-ever index built: ${totalIndexed} total entries`);
  
  // Debug: Log the keys in the career-ever index
  const indexKeys = Object.keys(careerEverIndex).filter(key => careerEverIndex[key].size > 0);
  console.log(`🔍 Career-ever index keys with players:`, indexKeys.slice(0, 20));
  
  return careerEverIndex;
}

/**
 * Get all possible achievements for a sport
 */
function getAllPossibleAchievements(sport?: string): string[] {
  const achievements: string[] = [];
  
  if (sport === 'basketball' || !sport) {
    achievements.push(
      'AllStar', 'MVP', 'DPOY', 'ROY', 'SMOY', 'MIP', 'FinalsMVP', 'Champion',
      'AllLeagueAny', 'AllDefAny', 'AllRookieAny',
      'PointsLeader', 'ReboundsLeader', 'AssistsLeader', 'StealsLeader', 'BlocksLeader'
    );
  } else if (sport === 'football') {
    achievements.push(
      'FBAllStar', 'FBMVP', 'FBDPOY', 'FBOffROY', 'FBDefROY', 'FBChampion',
      'FBAllRookie', 'FBAllLeague', 'FBFinalsMVP'
    );
  } else if (sport === 'hockey') {
    achievements.push(
      'HKAllStar', 'HKMVP', 'HKDefenseman', 'HKROY', 'HKChampion',
      'HKPlayoffsMVP', 'HKFinalsMVP', 'HKAllRookie', 'HKAllLeague',
      'HKAllStarMVP', 'HKAssistsLeader'
    );
  } else if (sport === 'baseball') {
    achievements.push(
      'BBAllStar', 'BBMVP', 'BBROY', 'BBChampion', 'BBAllRookie',
      'BBAllLeague', 'BBPlayoffsMVP', 'BBAllStarMVP', 'BBPitcherOTY',
      'BBGoldGlove', 'BBSilverSlugger',
      'BBBattingAvgLeader', 'BBHomeRunLeader', 'BBRBILeader', 'BBStolenBaseLeader',
      'BBOBPLeader', 'BBSluggingLeader', 'BBOPSLeader', 'BBHitsLeader',
      'BBERALeader', 'BBStrikeoutsLeader', 'BBSavesLeader', 'BBReliefPitcherOTY'
    );
  }
  
  // Add career milestones that apply to all sports
  achievements.push(
    'played10PlusSeasons', 'played15PlusSeasons', 'HOF',
    'drafted1OA', 'draftedFirstRound', 'undrafted',
    'career20kPoints', 'career10kRebounds', 'career5kAssists', 'career2kSteals', 'career1_5kBlocks', 'career2kThrees'
  );
  
  return achievements;
}

/**
 * Get career milestone achievements for a player
 */
function getCareerMilestones(player: Player): string[] {
  const achievements: string[] = [];
  
  // Calculate career totals
  let totalSeasons = 0;
  let careerPts = 0;
  let careerTrb = 0;
  let careerAst = 0;
  let careerStl = 0;
  let careerBlk = 0;
  let careerThrees = 0;
  
  const seasonsPlayed = new Set<number>();
  
  if (player.stats) {
    for (const stat of player.stats) {
      if (!stat.playoffs && stat.season) {
        seasonsPlayed.add(stat.season);
        careerPts += stat.pts || 0;
        careerTrb += stat.trb || 0;
        careerAst += stat.ast || 0;
        careerStl += stat.stl || 0;
        careerBlk += stat.blk || 0;
        careerThrees += stat.tp || 0;
      }
    }
  }
  
  totalSeasons = seasonsPlayed.size;
  
  // Season milestones
  if (totalSeasons >= 10) achievements.push('played10PlusSeasons');
  if (totalSeasons >= 15) achievements.push('played15PlusSeasons');
  
  // Statistical milestones
  if (careerPts >= 20000) achievements.push('career20kPoints');
  if (careerTrb >= 10000) achievements.push('career10kRebounds');
  if (careerAst >= 5000) achievements.push('career5kAssists');
  if (careerStl >= 2000) achievements.push('career2kSteals');
  if (careerBlk >= 1500) achievements.push('career1_5kBlocks');
  if (careerThrees >= 2000) achievements.push('career2kThrees');
  
  // Draft status
  if (player.draft?.pick === 1 && player.draft?.round === 1) {
    achievements.push('drafted1OA');
  } else if (player.draft?.round === 1) {
    achievements.push('draftedFirstRound');
  } else if (!player.draft?.round) {
    achievements.push('undrafted');
  }
  
  // Hall of Fame
  if (player.hof) achievements.push('HOF');
  
  return achievements;
}

/**
 * Add statistical leaders to career-ever index
 */
function addCareerEverLeaders(players: Player[], careerEverIndex: CareerEverIndex): void {
  // Get all seasons
  const allSeasons = new Set<number>();
  for (const player of players) {
    if (player.stats) {
      for (const stat of player.stats) {
        if (stat.season && !stat.playoffs) {
          allSeasons.add(stat.season);
        }
      }
    }
  }
  
  // Calculate leaders for each season and add to career-ever index
  for (const season of Array.from(allSeasons)) {
    const seasonLeaders = calculateBBGMSeasonLeaders(players, season, null);
    
    for (const [achievementId, playerIds] of Object.entries(seasonLeaders)) {
      for (const pid of playerIds) {
        if (!careerEverIndex[achievementId]) {
          careerEverIndex[achievementId] = new Set<number>();
        }
        careerEverIndex[achievementId].add(pid);
      }
    }
  }
}

/**
 * Get eligible players for Achievement × Achievement intersection using career-ever logic
 */
export function getCareerEverIntersection(
  careerEverIndex: CareerEverIndex,
  achievement1: string,
  achievement2: string
): Set<number> {
  const set1 = careerEverIndex[achievement1] || new Set<number>();
  const set2 = careerEverIndex[achievement2] || new Set<number>();
  
  // Debug logging for Achievement × Achievement intersections
  console.log(`🔍 Career-ever intersection: ${achievement1} (${set1.size} players) × ${achievement2} (${set2.size} players)`);
  
  // Return intersection of both sets
  const intersection = new Set<number>();
  for (const pid of set1) {
    if (set2.has(pid)) {
      intersection.add(pid);
    }
  }
  
  console.log(`🔍 Intersection result: ${intersection.size} players`);
  return intersection;
}

/**
 * Check if a player ever achieved a specific achievement (career-ever logic)
 */
export function playerEverAchieved(
  careerEverIndex: CareerEverIndex,
  playerId: number,
  achievementId: string
): boolean {
  const achievementSet = careerEverIndex[achievementId];
  return achievementSet ? achievementSet.has(playerId) : false;
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
  // Use franchiseId first, fallback to tid for compatibility
  for (const seasonStr of Object.keys(seasonIndex)) {
    const season = parseInt(seasonStr);
    const seasonData = seasonIndex[season];
    
    // Try franchiseId first (should match teamId for franchise continuity)
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
    id: 'Champion',
    label: 'Won Championship',
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
    minPlayers: 3
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
  {
    id: 'FBChampion',
    label: 'Won Championship',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  
  // Hockey GM achievements
  {
    id: 'HKAllStar',
    label: 'All-Star',
    isSeasonSpecific: true,
    minPlayers: 3
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
    id: 'HKAllRookie',
    label: 'All-Rookie Team',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKAllLeague',
    label: 'All-League Team',
    isSeasonSpecific: true,
    minPlayers: 3
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
    id: 'HKChampion',
    label: 'Won Championship',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKAllStarMVP',
    label: 'All-Star MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKAssistsLeader',
    label: 'League Assists Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  
  // Baseball GM achievements
  {
    id: 'BBAllStar',
    label: 'All-Star',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBAllStarMVP',
    label: 'All-Star MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBMVP',
    label: 'MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBPitcherOTY',
    label: 'Pitcher of the Year',
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
    id: 'BBAllRookie',
    label: 'All-Rookie Team',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBAllLeague',
    label: 'All-League Team',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBGoldGlove',
    label: 'Gold Glove',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSilverSlugger',
    label: 'Silver Slugger',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBPlayoffsMVP',
    label: 'Playoffs MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBChampion',
    label: 'Won Championship',
    isSeasonSpecific: true,
    minPlayers: 3
  }
];