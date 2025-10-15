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
  // New Basketball achievements (season-aligned)
  | 'Champion'
  // Basketball GM season statistical achievements (24 new achievements)
  | 'Season30PPG'
  | 'SeasonPPG'
  | 'Season2000Points'
  | 'Season200_3PM'
  | 'Season12RPG'
  | 'Season10APG'
  | 'Season800Rebounds'
  | 'Season700Assists'
  | 'Season2SPG'
  | 'Season2_5BPG'
  | 'Season150Steals'
  | 'Season150Blocks'
  | 'Season200Stocks'
  | 'Season50_40_90'
  | 'Season60eFG500FGA'
  | 'Season90FT250FTA'
  | 'SeasonFGPercent'
  | 'Season3PPercent'
  | 'Season70Games'
  | 'Season36MPG'
  | 'Season25_10'
  | 'Season25_5_5'
  | 'Season20_10_5'
  | 'Season1_1_1'
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
  | 'FBSeason4kPassYds'
  | 'FBSeason1200RushYds'
  | 'FBSeason100Receptions'
  | 'FBSeason15Sacks'
  | 'FBSeason140Tackles'
  | 'FBSeason5Interceptions'
  | 'FBSeason30PassTD'
  | 'FBSeason1300RecYds'
  | 'FBSeason10RecTD'
  | 'FBSeason12RushTD'
  | 'FBSeason1600Scrimmage'
  | 'FBSeason2000AllPurpose'
  | 'FBSeason15TFL'
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
  // Hockey GM season statistical achievements (19 new achievements)
  | 'HKSeason40Goals'
  | 'HKSeason60Assists'
  | 'HKSeason90Points'
  | 'HKSeason25Plus'
  | 'HKSeason250Shots'
  | 'HKSeason150Hits'
  | 'HKSeason100Blocks'
  | 'HKSeason60Takeaways'
  | 'HKSeason20PowerPlay'
  | 'HKSeason3SHGoals'
  | 'HKSeason7GWGoals'
  | 'HKSeason55FaceoffPct'
  | 'HKSeason22TOI'
  | 'HKSeason70PIM'
  | 'HKSeason920SavePct'
  | 'HKSeason260GAA'
  | 'HKSeason6Shutouts'
  | 'HKSeason2000Saves'
  | 'HKSeason60Starts'
  // Baseball achievements
  | 'BBAllStar'
  | 'BBMVP'
  | 'BBROY'
  | 'BBChampion'
  | 'BBAllRookie'
  | 'BBAllLeague'
  | 'BBPlayoffsMVP'
  // Baseball GM season statistical achievements
  | 'BBSeason50HRs'
  | 'BBSeason130RBIs'
  | 'BBSeason200Hits'
  | 'BBSeason50SBs'
  | 'BBSeason20Wins'
  | 'BBSeason40Saves'
  | 'BBSeason300Ks'
  | 'BBSeason200ERA'
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
  'won championship': 'Champion',
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
  
  // CRITICAL: Exact case-sensitive Basketball GM All-League awards (MAJOR FIX)
  'First Team All-League': 'AllLeagueAny',
  'Second Team All-League': 'AllLeagueAny',
  'Third Team All-League': 'AllLeagueAny',
  
  // CRITICAL: Numeric ordinal variants for All-League Team (fixes Jaylen Brown issue)
  'all-league 1st team': 'AllLeagueAny',
  'all-league 2nd team': 'AllLeagueAny',
  'all-league 3rd team': 'AllLeagueAny',
  'all league 1st team': 'AllLeagueAny',
  'all league 2nd team': 'AllLeagueAny',
  'all league 3rd team': 'AllLeagueAny',
  'all-nba 1st team': 'AllLeagueAny',
  'all-nba 2nd team': 'AllLeagueAny',
  'all-nba 3rd team': 'AllLeagueAny',
  
  // Numeric ordinal variants for All-Defensive Team
  'all-defensive 1st team': 'AllDefAny',
  'all-defensive 2nd team': 'AllDefAny',
  'all defensive 1st team': 'AllDefAny',
  'all defensive 2nd team': 'AllDefAny',

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
  'FB All-Star': 'FBAllStar',
  'FB Most Valuable Player': 'FBMVP',
  'FB Defensive Player of the Year': 'FBDPOY',
  'FB Offensive Rookie of the Year': 'FBOffROY',
  'FB Defensive Rookie of the Year': 'FBDefROY',
  'FB Won Championship': 'FBChampion',
  'FB All-Rookie Team': 'FBAllRookie',
  'FB First Team All-League': 'FBAllLeague',
  'FB Second Team All-League': 'FBAllLeague',
  'FB Finals MVP': 'FBFinalsMVP',
  
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
  
  // Common variants for Basketball GM
  'roy': 'ROY',
  'r.o.y.': 'ROY',
  'rookie of year': 'ROY',
  'finals most valuable player': 'FinalsMVP',
  'finalsmvp': 'FinalsMVP',
  'finals m.v.p.': 'FinalsMVP',
  'playoffs mvp': 'FinalsMVP',
  'championship mvp': 'FinalsMVP',
  
  // Special handling for certain achievements
  'Superstar Finals MVP': 'SFMVP', // Requires special team resolution
};

/**
 * Map award type to achievement ID, handling different sports and naming conventions
 */
function mapAwardToAchievement(awardType: string, sport?: 'basketball' | 'football' | 'hockey' | 'baseball'): SeasonAchievementId | null {
  if (!awardType) return null;
  
  // Debug logging removed for performance
  
  // Sport-specific handling FIRST (takes priority over global mapping)
  if (sport === 'basketball') {
    // Basketball GM specific mappings (case-sensitive exact matches from BBGM)
    if (awardType === 'All-Star') return 'AllStar';
    if (awardType === 'Most Valuable Player') return 'MVP';
    if (awardType === 'Defensive Player of the Year') return 'DPOY';
    if (awardType === 'Rookie of the Year') return 'ROY';
    if (awardType === 'Sixth Man of the Year') return 'SMOY';
    if (awardType === 'Most Improved Player') return 'MIP';
    if (awardType === 'Finals MVP') return 'FinalsMVP';
    if (awardType === 'All-Rookie Team') return 'AllRookieAny';
    if (awardType === 'Won Championship') return 'Champion';
  } else if (sport === 'football') {
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
  let mapped = AWARD_TYPE_MAPPING[normalized];
  if (mapped) {
    return mapped;
  }
  
  // CRITICAL: Defensive substring-based fallback for basketball (future-proofs against variants)
  if (sport === 'basketball') {
    if (normalized.includes('all') && normalized.includes('league') && normalized.includes('team')) {
      return 'AllLeagueAny';
    }
    if (normalized.includes('all') && normalized.includes('defensive') && normalized.includes('team')) {
      return 'AllDefAny';
    }
    if (normalized.includes('all') && normalized.includes('rookie') && normalized.includes('team')) {
      return 'AllRookieAny';
    }
  }
  
  // Debug logging removed for performance
  
  return null;
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
      // Avoid stack overflow - find max manually
      let maxPPG = 0;
      for (const player of playersWithPoints) {
        const ppg = player.pts / player.gp;
        if (ppg > maxPPG) maxPPG = ppg;
      }
      const pointsLeaderCandidates = playersWithPoints.filter(p => 
        Math.abs((p.pts / p.gp) - maxPPG) < 1e-9
      );
      
      // Break ties by higher total points
      if (pointsLeaderCandidates.length > 1) {
        let maxPts = 0;
        for (const player of pointsLeaderCandidates) {
          if (player.pts > maxPts) maxPts = player.pts;
        }
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
      // Avoid stack overflow - find max manually
      let maxRPG = 0;
      for (const player of playersWithRebounds) {
        const rpg = player.trb / player.gp;
        if (rpg > maxRPG) maxRPG = rpg;
      }
      const reboundsLeaderCandidates = playersWithRebounds.filter(p => 
        Math.abs((p.trb / p.gp) - maxRPG) < 1e-9
      );
      
      // Break ties by higher total rebounds
      if (reboundsLeaderCandidates.length > 1) {
        let maxTrb = 0;
        for (const player of reboundsLeaderCandidates) {
          if (player.trb > maxTrb) maxTrb = player.trb;
        }
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
      // Avoid stack overflow - find max manually
      let maxAPG = 0;
      for (const player of playersWithAssists) {
        const apg = player.ast / player.gp;
        if (apg > maxAPG) maxAPG = apg;
      }
      const assistsLeaderCandidates = playersWithAssists.filter(p => 
        Math.abs((p.ast / p.gp) - maxAPG) < 1e-9
      );
      
      // Break ties by higher total assists
      if (assistsLeaderCandidates.length > 1) {
        let maxAst = 0;
        for (const player of assistsLeaderCandidates) {
          if (player.ast > maxAst) maxAst = player.ast;
        }
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
      // Avoid stack overflow - find max manually
      let maxSPG = 0;
      for (const player of playersWithSteals) {
        const spg = player.stl / player.gp;
        if (spg > maxSPG) maxSPG = spg;
      }
      const stealsLeaderCandidates = playersWithSteals.filter(p => 
        Math.abs((p.stl / p.gp) - maxSPG) < 1e-9
      );
      
      // Break ties by higher total steals
      if (stealsLeaderCandidates.length > 1) {
        let maxStl = 0;
        for (const player of stealsLeaderCandidates) {
          if (player.stl > maxStl) maxStl = player.stl;
        }
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
      // Avoid stack overflow - find max manually
      let maxBPG = 0;
      for (const player of playersWithBlocks) {
        const bpg = player.blk / player.gp;
        if (bpg > maxBPG) maxBPG = bpg;
      }
      const blocksLeaderCandidates = playersWithBlocks.filter(p => 
        Math.abs((p.blk / p.gp) - maxBPG) < 1e-9
      );
      
      // Break ties by higher total blocks
      if (blocksLeaderCandidates.length > 1) {
        let maxBlk = 0;
        for (const player of blocksLeaderCandidates) {
          if (player.blk > maxBlk) maxBlk = player.blk;
        }
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
    if (stat.season === season && !stat.playoffs && ((stat.gp || 0) > 0 || (stat.min || 0) > 0) && stat.tid !== -1) {
      teams.add(stat.tid);
    }
  }
  
  return teams;
}

/**
 * Resolve the primary team for a player in a specific season based on minutes played
 * Used for awards that don't have a team ID attached
 * CRITICAL: Only uses regular season stats, excludes TOT rows and playoff stats
 */
function resolvePrimaryTeamForSeason(player: Player, season: number): number | null {
  if (!player.stats) return null;
  
  // Get all regular season stats for this season, excluding TOT rows (tid === -1)
  const seasonStats = player.stats.filter(stat => 
    stat.season === season && 
    !stat.playoffs && 
    stat.tid !== -1 // Exclude TOT (Total) rows
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

  // Process traditional award-based achievements - debug logging removed for performance
  
  for (const player of players) {
    if (!player.awards || player.awards.length === 0) continue;

    // Debug logging removed for performance

    for (const award of player.awards) {
      // Debug logging removed for performance
      
      const achievementId = mapAwardToAchievement(award.type, sport);
      if (!achievementId) {
        // Debug logging removed for performance
        skippedEntries++;
        continue;
      }

      const season = award.season;
      if (!season) {
        // Debug logging removed for performance
        skippedEntries++;
        continue;
      }
      
      // Debug logging removed for performance
      
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
      
      // Debug logging removed for performance
      
      if (primaryTeam === null) {
        // No regular season stats for this award season, skip
        // Debug logging removed for performance
        skippedEntries++;
        continue;
      }
      
      // Add to the primary team (the team they played the most minutes for)
      if (!seasonIndex[season]) seasonIndex[season] = {};
      if (!seasonIndex[season][primaryTeam]) seasonIndex[season][primaryTeam] = {} as Record<SeasonAchievementId, Set<number>>;
      if (!seasonIndex[season][primaryTeam][achievementId]) seasonIndex[season][primaryTeam][achievementId] = new Set();
      
      seasonIndex[season][primaryTeam][achievementId].add(player.pid);
      totalIndexed++;
      
      // Debug logging removed for performance
    }
  }
  
  // Calculate Basketball GM season leaders (new logic for statistical leaders)
  if (sport === 'basketball') {
    // Debug logging removed for performance
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
    
    // Debug logging removed for performance
  }
  
  // Calculate Basketball GM season achievements (BBSeason achievements)
  if (sport === 'basketball') {
    let basketballEntriesAdded = 0;
    
    // Get all seasons from player stats
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
    
    // Calculate achievements for each season
    for (const season of Array.from(allSeasons)) {
      // Process each player's stats for this season
      for (const player of players) {
        if (!player.stats) continue;
        
        // Aggregate all regular season stats for this season
        const seasonStats = player.stats.filter(stat => 
          stat.season === season && !stat.playoffs && (stat.gp || 0) > 0 && stat.tid !== -1
        );

        if (seasonStats.length === 0) continue;

        // Aggregate stats
        const aggregatedStats = {
          pts: 0, trb: 0, ast: 0, stl: 0, blk: 0, fg: 0, fga: 0,
          tp: 0, tpa: 0, ft: 0, fta: 0, gp: 0, min: 0,
          teams: new Set<number>()
        };

        for (const stat of seasonStats) {
          aggregatedStats.pts += stat.pts || 0;
          aggregatedStats.trb += stat.trb || ((stat as any).orb || 0) + ((stat as any).drb || 0) || 0;
          aggregatedStats.ast += stat.ast || 0;
          aggregatedStats.stl += stat.stl || 0;
          aggregatedStats.blk += stat.blk || 0;
          aggregatedStats.fg += stat.fg || 0;
          aggregatedStats.fga += stat.fga || 0;
          aggregatedStats.tp += stat.tp || (stat as any).tpm || 0;
          aggregatedStats.tpa += stat.tpa || (stat as any).tpat || 0;
          aggregatedStats.ft += stat.ft || (stat as any).ftm || 0;
          aggregatedStats.fta += stat.fta || 0;
          aggregatedStats.gp += stat.gp || 0;
          aggregatedStats.min += stat.min || 0;
          aggregatedStats.teams.add(stat.tid);
        }
        
        const { pts, trb, ast, stl, blk, fg, fga, tp, tpa, ft, fta, gp, min, teams } = aggregatedStats;
        
        // Guard against zero division
        const ppg = gp > 0 ? pts / gp : 0;
        const rpg = gp > 0 ? trb / gp : 0;
        const apg = gp > 0 ? ast / gp : 0;
        const spg = gp > 0 ? stl / gp : 0;
        const bpg = gp > 0 ? blk / gp : 0;
        const tpg = gp > 0 ? tp / gp : 0;
        const mpg = gp > 0 ? min / gp : 0;
        
        // Efficiency calculations with guards
        const fgPct = fga > 0 ? fg / fga : 0;
        const tpPct = tpa > 0 ? tp / tpa : 0;
        const ftPct = fta > 0 ? ft / fta : 0;
        const tsDenom = 2 * (fga + 0.44 * fta);
        const tsPct = tsDenom > 0 ? pts / tsDenom : 0;
        const eFgPct = fga > 0 ? (fg + 0.5 * tp) / fga : 0;
        
        // Computed values
        const stocks = stl + blk;
        
        // Helper function to add achievement to all teams played for in the season
        const addAchievement = (achievementId: SeasonAchievementId) => {
          for (const tid of Array.from(teams)) {
            if (!seasonIndex[season]) seasonIndex[season] = {};
            if (!seasonIndex[season][tid]) seasonIndex[season][tid] = {} as Record<SeasonAchievementId, Set<number>>;
            if (!seasonIndex[season][tid][achievementId]) seasonIndex[season][tid][achievementId] = new Set();
            
            seasonIndex[season][tid][achievementId].add(player.pid);
            basketballEntriesAdded++;
          }
        };
        
        // Scoring & Volume achievements
        
        // 30+ PPG (Season): ppg >= 30 and gp >= 50
        if (ppg >= 30 && gp >= 50) {
          addAchievement('Season30PPG');
        }
        
        // 2,000+ Points (Season): pts >= 2000
        if (pts >= 2000) {
          addAchievement('Season2000Points');
        }
        
        // 200+ 3PM (Season): tp >= 200
        if (tp >= 200) {
          addAchievement('Season200_3PM');
        }
        
        // Rebounding & Playmaking achievements
        
        // 12+ RPG (Season): rpg >= 12 and gp >= 50
        if (rpg >= 12 && gp >= 50) {
          addAchievement('Season12RPG');
        }
        
        // 10+ APG (Season): apg >= 10 and gp >= 50
        if (apg >= 10 && gp >= 50) {
          addAchievement('Season10APG');
        }
        
        // 800+ Rebounds (Season): trb >= 800
        if (trb >= 800) {
          addAchievement('Season800Rebounds');
        }
        
        // 700+ Assists (Season): ast >= 700
        if (ast >= 700) {
          addAchievement('Season700Assists');
        }
        
        // Defense achievements
        
        // 2.0+ SPG (Season): spg >= 2.0 and gp >= 50
        if (spg >= 2.0 && gp >= 50) {
          addAchievement('Season2SPG');
        }
        
        // 2.5+ BPG (Season): bpg >= 2.5 and gp >= 50
        if (bpg >= 2.5 && gp >= 50) {
          addAchievement('Season2_5BPG');
        }
        
        // 150+ Steals (Season): stl >= 150
        if (stl >= 150) {
          addAchievement('Season150Steals');
        }
        
        // 150+ Blocks (Season): blk >= 150
        if (blk >= 150) {
          addAchievement('Season150Blocks');
        }
        
        // 200+ Stocks (Season): (stl + blk) >= 200
        if (stocks >= 200) {
          addAchievement('Season200Stocks');
        }
        
        // Efficiency achievements (with attempt qualifiers)
        
        // 50/40/90 Club (Season): FG% >= .500 (fga >= 500), 3P% >= .400 (tpa >= 125), FT% >= .900 (fta >= 250)
        if (fga >= 500 && tpa >= 125 && fta >= 250 && fgPct >= 0.500 && tpPct >= 0.400 && ftPct >= 0.900) {
          addAchievement('Season50_40_90');
        }
        
        // 60%+ eFG on >= 500 FGA (Season): eFG >= .600, fga >= 500
        if (eFgPct >= 0.600 && fga >= 500) {
          addAchievement('Season60eFG500FGA');
        }
        
        // 90%+ FT on >= 250 FTA (Season): ft/fta >= .900, fta >= 250
        if (ftPct >= 0.900 && fta >= 250) {
          addAchievement('Season90FT250FTA');
        }
        // For SeasonFGPercent: FG% >= 0.400 on >= 300 FGA
        if (fgPct >= 0.400 && fga >= 300) {
          addAchievement('SeasonFGPercent');
        }
        // For Season3PPercent: 3PT% >= 0.400 on >= 100 3PA
        if (tpPct >= 0.400 && tpa >= 100) {
          addAchievement('Season3PPercent');
        }
        
        // Workload / durability achievements
        
        // 70+ Games Played (Season): gp >= 70
        if (gp >= 70) {
          addAchievement('Season70Games');
        }
        
        // 36.0+ MPG (Season): mpg >= 36.0 and gp >= 50
        if (mpg >= 36.0 && gp >= 50) {
          addAchievement('Season36MPG');
        }
        
        // "Combo" seasons achievements
        
        // 25/10 Season (PPG/RPG): ppg >= 25 and rpg >= 10 and gp >= 50
        if (ppg >= 25 && rpg >= 10 && gp >= 50) {
          addAchievement('Season25_10');
        }
        
        // 25/5/5 Season (PPG/RPG/APG): ppg >= 25 and rpg >= 5 and apg >= 5 and gp >= 50
        if (ppg >= 25 && rpg >= 5 && apg >= 5 && gp >= 50) {
          addAchievement('Season25_5_5');
        }
        
        // 20/10/5 Season (PPG/RPG/APG): ppg >= 20 and rpg >= 10 and apg >= 5 and gp >= 50
        if (ppg >= 20 && rpg >= 10 && apg >= 5 && gp >= 50) {
          addAchievement('Season20_10_5');
        }
        
        // 1/1/1 Season (SPG/BPG/3PM/G): spg >= 1.0 and bpg >= 1.0 and tpg >= 1.0 and gp >= 50
        if (spg >= 1.0 && bpg >= 1.0 && tpg >= 1.0 && gp >= 50) {
          addAchievement('Season1_1_1');
        }
      }
    }
    
    // Debug logging removed for performance
  }
  
  // Calculate Football GM season achievements (FBSeason4kPassYds) - OPTIMIZED FOR LARGE FILES
  if (sport === 'football') {
    let footballEntriesAdded = 0;
    
    // Get all seasons from player stats
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
    
    // Calculate achievements for each season
    for (const season of Array.from(allSeasons)) {
      // Process each player's stats for this season
      for (const player of players) {
        if (!player.stats) continue;
        
        // Aggregate all regular season stats for this season
        const seasonStats = player.stats.filter(stat => 
          stat.season === season && !stat.playoffs && (stat.gp || 0) > 0 && stat.tid !== -1
        );

        if (seasonStats.length === 0) continue;

        // Aggregate stats
        const aggregatedStats = {
          pssYds: 0, rusYds: 0, rec: 0, defSk: 0, defTckSolo: 0, defTckAst: 0,
          defInt: 0, pssTD: 0, recYds: 0, recTD: 0, rusTD: 0, prYds: 0,
          krYds: 0, defTckLoss: 0,
          teams: new Set<number>()
        };

        for (const stat of seasonStats) {
          const statData = stat as any;
          aggregatedStats.pssYds += statData.pssYds || 0;
          aggregatedStats.rusYds += statData.rusYds || 0;
          aggregatedStats.rec += statData.rec || 0;
          aggregatedStats.defSk += statData.defSk || 0;
          aggregatedStats.defTckSolo += statData.defTckSolo || 0;
          aggregatedStats.defTckAst += statData.defTckAst || 0;
          aggregatedStats.defInt += statData.defInt || 0;
          aggregatedStats.pssTD += statData.pssTD || 0;
          aggregatedStats.recYds += statData.recYds || 0;
          aggregatedStats.recTD += statData.recTD || 0;
          aggregatedStats.rusTD += statData.rusTD || 0;
          aggregatedStats.prYds += statData.prYds || 0;
          aggregatedStats.krYds += statData.krYds || 0;
          aggregatedStats.defTckLoss += statData.defTckLoss || 0;
          aggregatedStats.teams.add(stat.tid);
        }
        
        const { pssYds, rusYds, rec, defSk, defTckSolo, defTckAst, defInt, pssTD, recYds, recTD, rusTD, prYds, krYds, defTckLoss, teams } = aggregatedStats;
        
        // Pre-compute values once
        const totalTackles = defTckSolo + defTckAst;
        const scrimmageYards = rusYds + recYds;
        const allPurposeYards = rusYds + recYds + prYds + krYds;
        
        // Helper function to add achievement to all teams played for in the season
        const addAchievement = (achievementId: SeasonAchievementId) => {
          for (const tid of Array.from(teams)) {
            if (!seasonIndex[season]) seasonIndex[season] = {};
            if (!seasonIndex[season][tid]) seasonIndex[season][tid] = {} as Record<SeasonAchievementId, Set<number>>;
            if (!seasonIndex[season][tid][achievementId]) seasonIndex[season][tid][achievementId] = new Set();
            
            seasonIndex[season][tid][achievementId].add(player.pid);
            footballEntriesAdded++;
          }
        };
        
        // Check for 4,000+ passing yards achievement
        if (pssYds >= 4000) {
          addAchievement('FBSeason4kPassYds');
        }
        
        // Check for 1,200+ rushing yards achievement
        if (rusYds >= 1200) {
          addAchievement('FBSeason1200RushYds');
        }
        
        // Check for 100+ receptions achievement
        if (rec >= 100) {
          addAchievement('FBSeason100Receptions');
        }
        
        // Check for 15+ sacks achievement
        if (defSk >= 15) {
          addAchievement('FBSeason15Sacks');
        }
        
        // Check for 140+ tackles achievement
        if (totalTackles >= 140) {
          addAchievement('FBSeason140Tackles');
        }
        
        // Check for 5+ interceptions achievement
        if (defInt >= 5) {
          addAchievement('FBSeason5Interceptions');
        }
        
        // Check for 30+ passing TD achievement
        if (pssTD >= 30) {
          addAchievement('FBSeason30PassTD');
        }
        
        // Check for 1,300+ receiving yards achievement
        if (recYds >= 1300) {
          addAchievement('FBSeason1300RecYds');
        }
        
        // Check for 10+ receiving TD achievement
        if (recTD >= 10) {
          addAchievement('FBSeason10RecTD');
        }
        
        // Check for 12+ rushing TD achievement
        if (rusTD >= 12) {
          addAchievement('FBSeason12RushTD');
        }
        
        // Check for 1,600+ yards from scrimmage achievement
        if (scrimmageYards >= 1600) {
          addAchievement('FBSeason1600Scrimmage');
        }
        
        // Check for 2,000+ all-purpose yards achievement
        if (allPurposeYards >= 2000) {
          addAchievement('FBSeason2000AllPurpose');
        }
        
        // Check for 15+ tackles for loss achievement
        if (defTckLoss >= 15) {
          addAchievement('FBSeason15TFL');
        }
      }
    }
    
    // Debug logging removed for performance
  }
  
  // Calculate Hockey GM season achievements (HKSeason achievements)
  if (sport === 'hockey') {
    let hockeyEntriesAdded = 0;
    
    // Get all seasons from player stats
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
    
    // Calculate achievements for each season
    for (const season of Array.from(allSeasons)) {
      // Process each player's stats for this season
      for (const player of players) {
        if (!player.stats) continue;
        
        // Aggregate all regular season stats for this season
        const seasonStats = player.stats.filter(stat => 
          stat.season === season && !stat.playoffs && (stat.gp || 0) > 0 && stat.tid !== -1
        );

        if (seasonStats.length === 0) continue;

        // Aggregate stats
        const aggregatedStats = {
          evG: 0, ppG: 0, shG: 0, evA: 0, ppA: 0, shA: 0, pm: 0, s: 0,
          hit: 0, blk: 0, tk: 0, gwG: 0, fow: 0, fol: 0, min: 0, pim: 0,
          gp: 0, sv: 0, ga: 0, so: 0, gs: 0,
          teams: new Set<number>()
        };

        for (const stat of seasonStats) {
          const statData = stat as any;
          aggregatedStats.evG += statData.evG || 0;
          aggregatedStats.ppG += statData.ppG || 0;
          aggregatedStats.shG += statData.shG || 0;
          aggregatedStats.evA += statData.evA || 0;
          aggregatedStats.ppA += statData.ppA || 0;
          aggregatedStats.shA += statData.shA || 0;
          aggregatedStats.pm += statData.pm || 0;
          aggregatedStats.s += statData.s || 0;
          aggregatedStats.hit += statData.hit || 0;
          aggregatedStats.blk += statData.blk || 0;
          aggregatedStats.tk += statData.tk || 0;
          aggregatedStats.gwG += statData.gwG || 0;
          aggregatedStats.fow += statData.fow || 0;
          aggregatedStats.fol += statData.fol || 0;
          aggregatedStats.min += statData.min || 0;
          aggregatedStats.pim += statData.pim || 0;
          aggregatedStats.gp += stat.gp || 0;
          aggregatedStats.sv += statData.sv || 0;
          aggregatedStats.ga += statData.ga || 0;
          aggregatedStats.so += statData.so || 0;
          aggregatedStats.gs += statData.gs || 0;
          aggregatedStats.teams.add(stat.tid);
        }
        
        const { evG, ppG, shG, evA, ppA, shA, pm, s, hit, blk, tk, gwG, fow, fol, min, pim, gp, sv, ga, so, gs, teams } = aggregatedStats;
        
        // Computed values
        const goals = evG + ppG + shG;
        const assists = evA + ppA + shA;
        const points = goals + assists;
        const powerPlayPoints = ppG + ppA;
        const faceoffTotal = fow + fol;
        const faceoffPct = faceoffTotal > 0 ? fow / faceoffTotal : 0;
        const toiPerGame = gp > 0 ? min / gp : 0;
        const savesTotal = sv + ga;
        const savePct = savesTotal > 0 ? sv / savesTotal : 0;
        const gaaRate = min > 0 ? (ga / (min / 60)) : 0;
        
        // Helper function to add achievement to all teams played for in the season
        const addAchievement = (achievementId: SeasonAchievementId) => {
          for (const tid of Array.from(teams)) {
            if (!seasonIndex[season]) seasonIndex[season] = {};
            if (!seasonIndex[season][tid]) seasonIndex[season][tid] = {} as Record<SeasonAchievementId, Set<number>>;
            if (!seasonIndex[season][tid][achievementId]) seasonIndex[season][tid][achievementId] = new Set();
            
            seasonIndex[season][tid][achievementId].add(player.pid);
            hockeyEntriesAdded++;
          }
        };
        
        // Skater achievements
        // Check for 40+ goals achievement
        if (goals >= 40) {
          addAchievement('HKSeason40Goals');
        }
        
        // Check for 60+ assists achievement
        if (assists >= 60) {
          addAchievement('HKSeason60Assists');
        }
        
        // Check for 90+ points achievement
        if (points >= 90) {
          addAchievement('HKSeason90Points');
        }
        
        // Check for +25 plus/minus achievement
        if (pm >= 25) {
          addAchievement('HKSeason25Plus');
        }
        
        // Check for 250+ shots achievement
        if (s >= 250) {
          addAchievement('HKSeason250Shots');
        }
        
        // Check for 150+ hits achievement
        if (hit >= 150) {
          addAchievement('HKSeason150Hits');
        }
        
        // Check for 100+ blocks achievement
        if (blk >= 100) {
          addAchievement('HKSeason100Blocks');
        }
        
        // Check for 60+ takeaways achievement
        if (tk >= 60) {
          addAchievement('HKSeason60Takeaways');
        }
        
        // Check for 20+ power-play points achievement
        if (powerPlayPoints >= 20) {
          addAchievement('HKSeason20PowerPlay');
        }
        
        // Check for 3+ short-handed goals achievement
        if (shG >= 3) {
          addAchievement('HKSeason3SHGoals');
        }
        
        // Check for 7+ game-winning goals achievement
        if (gwG >= 7) {
          addAchievement('HKSeason7GWGoals');
        }
        
        // Check for 55%+ faceoff win rate achievement (with qualifier)
        if (faceoffTotal >= 600 && faceoffPct >= 0.55) {
          addAchievement('HKSeason55FaceoffPct');
        }
        
        // Check for 22:00+ TOI per game achievement
        if (toiPerGame >= 22) {
          addAchievement('HKSeason22TOI');
        }
        
        // Check for 70+ PIM achievement
        if (pim >= 70) {
          addAchievement('HKSeason70PIM');
        }
        
        // Goalie achievements (with qualifiers)
        // Check for .920+ save percentage achievement (with qualifier)
        if (min >= 1500 && savePct >= 0.920) {
          addAchievement('HKSeason920SavePct');
        }
        
        // Check for ≤2.60 GAA achievement (with qualifier)
        if (min >= 1500 && gaaRate <= 2.60) {
          addAchievement('HKSeason260GAA');
        }
        
        // Check for 6+ shutouts achievement
        if (so >= 6) {
          addAchievement('HKSeason6Shutouts');
        }
        
        // Check for 2000+ saves achievement
        if (sv >= 2000) {
          addAchievement('HKSeason2000Saves');
        }
        
        // Check for 60+ starts achievement
        if (gs >= 60) {
          addAchievement('HKSeason60Starts');
        }
      }
    }
    
    // Debug logging removed for performance
  }
  
  // Log statistics
  const seasons = Object.keys(seasonIndex).length;
  const achievements = Object.values(seasonIndex).flatMap(season => 
    Object.values(season).flatMap(team => Object.keys(team))
  ).length;
  
  // Add stats-based achievements like 250+ 3PM Season
  for (const player of players) {
    if (!player.stats || player.stats.length === 0) continue;
    
    for (const seasonStat of player.stats) {
      if (seasonStat.playoffs) continue; // Only regular season
      if ((seasonStat.gp || 0) === 0) continue; // Must have played games
      
      const season = seasonStat.season;
      const tid = seasonStat.tid;
      
    }
  }
  
  // Debug logging removed for performance
  
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
  
  // Debug logging removed for performance
  
  // Search across all seasons for this team-achievement combination
  for (const seasonStr of Object.keys(seasonIndex)) {
    const season = parseInt(seasonStr);
    const seasonData = seasonIndex[season];
    
    // Debug logging removed for performance
    
    if (seasonData[teamId] && seasonData[teamId][achievementId]) {
      for (const pid of Array.from(seasonData[teamId][achievementId])) {
        allPlayers.add(pid);
      }
    }
  }
  
  // Debug logging removed for performance
  
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
    id: 'Champion',
    label: 'Champion',
    isSeasonSpecific: true,
    minPlayers: 3
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
  
  // Basketball GM Season Statistical Achievements (24 new achievements)
  {
    id: 'Season30PPG',
    label: '30+ PPG (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'SeasonPPG',
    label: 'PPG (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season2000Points',
    label: '2,000+ Points (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'Season200_3PM',
    label: '200+ 3PM (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'Season12RPG',
    label: '12+ RPG (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'Season10APG',
    label: '10+ APG (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'Season800Rebounds',
    label: '800+ Rebounds (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'Season700Assists',
    label: '700+ Assists (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'Season2SPG',
    label: '2.0+ SPG (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'Season2_5BPG',
    label: '2.5+ BPG (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season150Steals',
    label: '150+ Steals (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'Season150Blocks',
    label: '150+ Blocks (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'Season200Stocks',
    label: '200+ Stocks (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season50_40_90',
    label: '50/40/90 Club (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season60eFG500FGA',
    label: '60%+ eFG (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season90FT250FTA',
    label: '90%+ FT (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'SeasonFGPercent',
    label: '50%+ FG (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season3PPercent',
    label: '40%+ 3PT (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season70Games',
    label: '70+ Games Played (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'Season36MPG',
    label: '36.0+ MPG (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season25_10',
    label: '25/10 Season (PPG/RPG)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season25_5_5',
    label: '25/5/5 Season (PPG/RPG/APG)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season20_10_5',
    label: '20/10/5 Season (PPG/RPG/APG)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season1_1_1',
    label: '1/1/1 Season (SPG/BPG/3PM/G)',
    isSeasonSpecific: true,
    minPlayers: 1
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
  {
    id: 'FBSeason4kPassYds',
    label: '4,000+ Passing Yards (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBSeason1200RushYds',
    label: '1,200+ Rushing Yards (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBSeason100Receptions',
    label: '100+ Receptions (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBSeason15Sacks',
    label: '15+ Sacks (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBSeason140Tackles',
    label: '140+ Tackles (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBSeason5Interceptions',
    label: '5+ Interceptions (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBSeason30PassTD',
    label: '30+ Passing TD (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBSeason1300RecYds',
    label: '1,300+ Receiving Yards (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBSeason10RecTD',
    label: '10+ Receiving TD (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBSeason12RushTD',
    label: '12+ Rushing TD (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBSeason1600Scrimmage',
    label: '1,600+ Yards from Scrimmage (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBSeason2000AllPurpose',
    label: '2,000+ All-Purpose Yards (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBSeason15TFL',
    label: '15+ Tackles for Loss (Season)',
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
  // Hockey GM Season Statistical Achievements (19 new achievements)
  {
    id: 'HKSeason40Goals',
    label: '40+ Goals (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason60Assists',
    label: '60+ Assists (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason90Points',
    label: '90+ Points (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason25Plus',
    label: '+25 Plus/Minus (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason250Shots',
    label: '250+ Shots (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason150Hits',
    label: '150+ Hits (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason100Blocks',
    label: '100+ Blocks (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason60Takeaways',
    label: '60+ Takeaways (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason20PowerPlay',
    label: '20+ Power-Play Points (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason3SHGoals',
    label: '3+ Short-Handed Goals (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason7GWGoals',
    label: '7+ Game-Winning Goals (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason55FaceoffPct',
    label: '55%+ Faceoff Win Rate (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason22TOI',
    label: '22:00+ TOI per Game (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason70PIM',
    label: '70+ PIM (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason920SavePct',
    label: '.920+ Save Percentage (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason260GAA',
    label: '≤2.60 GAA (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason6Shutouts',
    label: '6+ Shutouts (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason2000Saves',
    label: '2000+ Saves (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKSeason60Starts',
    label: '60+ Starts (Season)',
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