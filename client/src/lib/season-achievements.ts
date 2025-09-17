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
  | 'AllRookieTeam'
  
  // Statistical Leaders with Rank Variations (36 new achievements)
  | 'PointsLeader1st' | 'PointsLeader3rd' | 'PointsLeader5th' | 'PointsLeader10th' | 'PointsLeader15th' | 'PointsLeader20th'
  | 'ReboundsLeader1st' | 'ReboundsLeader3rd' | 'ReboundsLeader5th' | 'ReboundsLeader10th' | 'ReboundsLeader15th' | 'ReboundsLeader20th'
  | 'AssistsLeader1st' | 'AssistsLeader3rd' | 'AssistsLeader5th' | 'AssistsLeader10th' | 'AssistsLeader15th' | 'AssistsLeader20th'
  | 'StealsLeader1st' | 'StealsLeader3rd' | 'StealsLeader5th' | 'StealsLeader10th' | 'StealsLeader15th' | 'StealsLeader20th'
  | 'BlocksLeader1st' | 'BlocksLeader3rd' | 'BlocksLeader5th' | 'BlocksLeader10th' | 'BlocksLeader15th' | 'BlocksLeader20th'
  | 'ThreePMLeader1st' | 'ThreePMLeader3rd' | 'ThreePMLeader5th' | 'ThreePMLeader10th' | 'ThreePMLeader15th' | 'ThreePMLeader20th'
  
  // PPG Variations (18 achievements)
  | 'SeasonPPG1' | 'SeasonPPG2' | 'SeasonPPG3' | 'SeasonPPG4' | 'SeasonPPG5' | 'SeasonPPG8' | 'SeasonPPG10' | 'SeasonPPG12' | 'SeasonPPG15'
  | 'SeasonPPG18' | 'SeasonPPG20' | 'SeasonPPG22' | 'SeasonPPG24' | 'SeasonPPG26' | 'SeasonPPG28' | 'SeasonPPG30' | 'SeasonPPG32' | 'SeasonPPG35'
  
  // Points Variations (10 achievements)
  | 'SeasonPoints800' | 'SeasonPoints1000' | 'SeasonPoints1100' | 'SeasonPoints1200' | 'SeasonPoints1400'
  | 'SeasonPoints1600' | 'SeasonPoints1800' | 'SeasonPoints2000' | 'SeasonPoints2200' | 'SeasonPoints2400'
  
  // 3PM Variations (12 achievements)
  | 'Season3PM50' | 'Season3PM75' | 'Season3PM100' | 'Season3PM125' | 'Season3PM150' | 'Season3PM175'
  | 'Season3PM200' | 'Season3PM225' | 'Season3PM250' | 'Season3PM275' | 'Season3PM300' | 'Season3PM325'
  
  // RPG Variations (12 achievements)
  | 'SeasonRPG3' | 'SeasonRPG4' | 'SeasonRPG5' | 'SeasonRPG6' | 'SeasonRPG7' | 'SeasonRPG8'
  | 'SeasonRPG9' | 'SeasonRPG10' | 'SeasonRPG11' | 'SeasonRPG12' | 'SeasonRPG13' | 'SeasonRPG15'
  
  // APG Variations (11 achievements)
  | 'SeasonAPG2' | 'SeasonAPG3' | 'SeasonAPG4' | 'SeasonAPG5' | 'SeasonAPG6' | 'SeasonAPG7'
  | 'SeasonAPG8' | 'SeasonAPG9' | 'SeasonAPG10' | 'SeasonAPG11' | 'SeasonAPG12'
  
  // Rebounds Variations (8 achievements)
  | 'SeasonRebounds300' | 'SeasonRebounds400' | 'SeasonRebounds500' | 'SeasonRebounds600'
  | 'SeasonRebounds700' | 'SeasonRebounds800' | 'SeasonRebounds900' | 'SeasonRebounds1000'
  
  // Assists Variations (7 achievements)
  | 'SeasonAssists200' | 'SeasonAssists300' | 'SeasonAssists400' | 'SeasonAssists500'
  | 'SeasonAssists600' | 'SeasonAssists700' | 'SeasonAssists800'
  
  // SPG Variations (9 achievements)
  | 'SeasonSPG0_5' | 'SeasonSPG0_8' | 'SeasonSPG0_9' | 'SeasonSPG1_0' | 'SeasonSPG1_3'
  | 'SeasonSPG1_5' | 'SeasonSPG1_7' | 'SeasonSPG2_0' | 'SeasonSPG2_3'
  
  // BPG Variations (8 achievements)
  | 'SeasonBPG0_5' | 'SeasonBPG0_8' | 'SeasonBPG0_9' | 'SeasonBPG1_0'
  | 'SeasonBPG1_5' | 'SeasonBPG2_0' | 'SeasonBPG2_5' | 'SeasonBPG3_0'
  
  // Steals Variations (8 achievements)
  | 'SeasonSteals50' | 'SeasonSteals75' | 'SeasonSteals90' | 'SeasonSteals100'
  | 'SeasonSteals125' | 'SeasonSteals150' | 'SeasonSteals175' | 'SeasonSteals200'
  
  // Blocks Variations (8 achievements)
  | 'SeasonBlocks50' | 'SeasonBlocks75' | 'SeasonBlocks90' | 'SeasonBlocks100'
  | 'SeasonBlocks125' | 'SeasonBlocks150' | 'SeasonBlocks175' | 'SeasonBlocks200'
  
  // Stocks Variations (9 achievements)
  | 'SeasonStocks100' | 'SeasonStocks120' | 'SeasonStocks130' | 'SeasonStocks140' | 'SeasonStocks150'
  | 'SeasonStocks175' | 'SeasonStocks200' | 'SeasonStocks225' | 'SeasonStocks250'
  
  // TS% Variations (6 achievements)
  | 'SeasonTSPct54' | 'SeasonTSPct56' | 'SeasonTSPct58' | 'SeasonTSPct60' | 'SeasonTSPct62' | 'SeasonTSPct64'
  
  // eFG% Variations (7 achievements)
  | 'SeasoneFGPct54' | 'SeasoneFGPct55' | 'SeasoneFGPct56' | 'SeasoneFGPct57'
  | 'SeasoneFGPct60' | 'SeasoneFGPct63' | 'SeasoneFGPct65'
  
  // FT% Variations (6 achievements)
  | 'SeasonFTPct80' | 'SeasonFTPct83' | 'SeasonFTPct85' | 'SeasonFTPct88' | 'SeasonFTPct90' | 'SeasonFTPct92'
  
  // 3PT% Variations (7 achievements)
  | 'Season3PPct33' | 'Season3PPct35' | 'Season3PPct36' | 'Season3PPct37'
  | 'Season3PPct38' | 'Season3PPct40' | 'Season3PPct42'
  
  // Games Played Variations (8 achievements)
  | 'SeasonGames40' | 'SeasonGames45' | 'SeasonGames50' | 'SeasonGames55'
  | 'SeasonGames60' | 'SeasonGames65' | 'SeasonGames70' | 'SeasonGames75'
  
  // MPG Variations (7 achievements)
  | 'SeasonMPG28' | 'SeasonMPG30' | 'SeasonMPG31' | 'SeasonMPG32' | 'SeasonMPG34' | 'SeasonMPG36' | 'SeasonMPG38'
  
  // Career Threshold Variations
  // Career Points (12 achievements)
  | 'Career6kPoints' | 'Career8kPoints' | 'Career10kPoints' | 'Career11kPoints' | 'Career12kPoints' | 'Career15kPoints'
  | 'Career18kPoints' | 'Career20kPoints' | 'Career22kPoints' | 'Career25kPoints' | 'Career28kPoints' | 'Career30kPoints'
  
  // Career Rebounds (6 achievements)
  | 'Career4kRebounds' | 'Career5kRebounds' | 'Career6kRebounds' | 'Career8kRebounds' | 'Career10kRebounds' | 'Career12kRebounds'
  
  // Career Assists (8 achievements)
  | 'Career1_5kAssists' | 'Career2kAssists' | 'Career2_5kAssists' | 'Career3kAssists'
  | 'Career4kAssists' | 'Career5kAssists' | 'Career6kAssists' | 'Career8kAssists'
  
  // Career Steals (7 achievements)
  | 'Career600Steals' | 'Career800Steals' | 'Career900Steals' | 'Career1kSteals' | 'Career1_5kSteals' | 'Career2kSteals' | 'Career2_5kSteals'
  
  // Career Blocks (7 achievements)
  | 'Career600Blocks' | 'Career800Blocks' | 'Career900Blocks' | 'Career1kBlocks' | 'Career1_2kBlocks' | 'Career1_5kBlocks' | 'Career2kBlocks'
  
  // Career 3PM (8 achievements)
  | 'Career600_3PM' | 'Career800_3PM' | 'Career900_3PM' | 'Career1k_3PM' | 'Career1_5k_3PM' | 'Career2k_3PM' | 'Career2_5k_3PM' | 'Career3k_3PM'
  
  // Seasons Played (9 achievements)
  | 'Seasons5' | 'Seasons6' | 'Seasons7' | 'Seasons8' | 'Seasons10' | 'Seasons12' | 'Seasons15' | 'Seasons18' | 'Seasons20'
  
  // Combo Season Variations (sampling key combinations)
  | 'Season18_8' | 'Season20_8' | 'Season22_8' | 'Season24_10' | 'Season25_10' | 'Season26_10' | 'Season28_12' | 'Season30_15'
  | 'Season18_4_4' | 'Season20_5_5' | 'Season22_5_5' | 'Season24_6_6' | 'Season25_5_5' | 'Season26_6_6' | 'Season28_8_8'
  | 'Season16_7_4' | 'Season18_8_5' | 'Season20_10_5' | 'Season22_10_6' | 'Season24_12_7'
  | 'Season0_5_0_5_0_5' | 'Season0_8_0_8_0_8' | 'Season1_0_1_0_1_0' | 'Season1_2_1_2_1_2'
  
  // Legacy achievements maintained for compatibility
  | 'Season250ThreePM' | 'Season30PPG' | 'Season2000Points' | 'Season300_3PM' | 'Season200_3PM' | 'Season12RPG' | 'Season10APG'
  | 'Season800Rebounds' | 'Season700Assists' | 'Season2SPG' | 'Season2_5BPG' | 'Season150Steals' | 'Season150Blocks'
  | 'Season200Stocks' | 'Season50_40_90' | 'Season60TS20PPG' | 'Season60eFG500FGA' | 'Season90FT250FTA'
  | 'Season40_3PT200_3PA' | 'Season70Games' | 'Season36MPG' | 'Season25_10' | 'Season25_5_5' | 'Season20_10_5' | 'Season1_1_1'
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
  // Baseball GM season statistical achievements (28 new achievements)
  // Hitters (15 achievements)
  | 'BBSeason40HR'
  | 'BBSeason200Hits'
  | 'BBSeason100RBI'
  | 'BBSeason100Runs'
  | 'BBSeason50SB'
  | 'BBSeason100BB'
  | 'BBSeason300TB'
  | 'BBSeason60XBH'
  | 'BBSeason300Avg500PA'
  | 'BBSeason400OBP500PA'
  | 'BBSeason550SLG500PA'
  | 'BBSeason900OPS500PA'
  | 'BBSeason10Triples'
  | 'BBSeason20HBP'
  | 'BBSeason25_25Club'
  // Pitchers (12 achievements)
  | 'BBSeason200SO'
  | 'BBSeason250ERA162IP'
  | 'BBSeason105WHIP162IP'
  | 'BBSeason20Wins'
  | 'BBSeason40Saves'
  | 'BBSeason3CG'
  | 'BBSeason4SHO'
  | 'BBSeason220IP'
  | 'BBSeasonKBB4_162IP'
  | 'BBSeasonK9_10_100IP'
  | 'BBSeason30GS'
  | 'BBSeason50APP'
  // Two-Way (1 achievement)
  | 'BBSeasonTwoWay20HR100IP'
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
  'all-rookie team': 'AllRookieTeam',

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
    BlocksLeader: [],
    // Add ranked leader variations
    PointsLeader1st: [], PointsLeader3rd: [], PointsLeader5th: [], PointsLeader10th: [], PointsLeader15th: [], PointsLeader20th: [],
    ReboundsLeader1st: [], ReboundsLeader3rd: [], ReboundsLeader5th: [], ReboundsLeader10th: [], ReboundsLeader15th: [], ReboundsLeader20th: [],
    AssistsLeader1st: [], AssistsLeader3rd: [], AssistsLeader5th: [], AssistsLeader10th: [], AssistsLeader15th: [], AssistsLeader20th: [],
    StealsLeader1st: [], StealsLeader3rd: [], StealsLeader5th: [], StealsLeader10th: [], StealsLeader15th: [], StealsLeader20th: [],
    BlocksLeader1st: [], BlocksLeader3rd: [], BlocksLeader5th: [], BlocksLeader10th: [], BlocksLeader15th: [], BlocksLeader20th: [],
    ThreePMLeader1st: [], ThreePMLeader3rd: [], ThreePMLeader5th: [], ThreePMLeader10th: [], ThreePMLeader15th: [], ThreePMLeader20th: []
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
    
    // Helper function to calculate rankings
    const calculateRankings = (players: typeof playerSeasonStats, getValue: (p: typeof playerSeasonStats[0]) => number, getTieBreaker: (p: typeof playerSeasonStats[0]) => number) => {
      if (players.length === 0) return {};
      
      // Sort by value (descending), then by tie-breaker (descending), then by pid for consistency
      const sorted = [...players].sort((a, b) => {
        const aVal = getValue(a);
        const bVal = getValue(b);
        if (Math.abs(aVal - bVal) < 1e-9) {
          const aTie = getTieBreaker(a);
          const bTie = getTieBreaker(b);
          if (aTie !== bTie) return bTie - aTie;
          return a.pid - b.pid; // Final tie-breaker for consistency
        }
        return bVal - aVal;
      });
      
      // Calculate rankings
      const rankings: Record<string, number[]> = {
        '1st': [],
        '3rd': [],
        '5th': [],
        '10th': [],
        '15th': [],
        '20th': []
      };
      
      const ranks = [1, 3, 5, 10, 15, 20];
      for (const rank of ranks) {
        const players = sorted.slice(0, Math.min(rank, sorted.length));
        rankings[rank === 1 ? '1st' : rank === 3 ? '3rd' : rank === 5 ? '5th' : rank === 10 ? '10th' : rank === 15 ? '15th' : '20th'] = players.map(p => p.pid);
      }
      
      return rankings;
    };
    
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
      
      // Calculate ranked positions
      const pointsRankings = calculateRankings(
        playersWithPoints,
        p => p.pts / p.gp,
        p => p.pts
      );
      leaders.PointsLeader1st = pointsRankings['1st'];
      leaders.PointsLeader3rd = pointsRankings['3rd'];
      leaders.PointsLeader5th = pointsRankings['5th'];
      leaders.PointsLeader10th = pointsRankings['10th'];
      leaders.PointsLeader15th = pointsRankings['15th'];
      leaders.PointsLeader20th = pointsRankings['20th'];
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
        
        // Get all regular season stats for this season, excluding TOT rows
        const seasonStats = player.stats.filter(stat => 
          stat.season === season && !stat.playoffs && (stat.gp || 0) > 0 && stat.tid !== -1
        );
        
        for (const stat of seasonStats) {
          const tid = stat.tid;
          
          // Extract all relevant Basketball GM stats from the season stat
          const pts = stat.pts || 0;
          const trb = stat.trb || ((stat as any).orb || 0) + ((stat as any).drb || 0) || 0;
          const ast = stat.ast || 0;
          const stl = stat.stl || 0;
          const blk = stat.blk || 0;
          const fg = stat.fg || 0;
          const fga = stat.fga || 0;
          const tp = stat.tp || (stat as any).tpm || 0;
          const tpa = stat.tpa || (stat as any).tpat || 0;
          const ft = stat.ft || (stat as any).ftm || 0;
          const fta = stat.fta || 0;
          const gp = stat.gp || 0;
          const min = stat.min || 0;
          
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
          
          // Helper function to add achievement
          const addAchievement = (achievementId: SeasonAchievementId) => {
            if (!seasonIndex[season]) seasonIndex[season] = {};
            if (!seasonIndex[season][tid]) seasonIndex[season][tid] = {} as Record<SeasonAchievementId, Set<number>>;
            if (!seasonIndex[season][tid][achievementId]) seasonIndex[season][tid][achievementId] = new Set();
            
            seasonIndex[season][tid][achievementId].add(player.pid);
            basketballEntriesAdded++;
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
          
          // 300+ 3PM (Season): tp >= 300
          if (tp >= 300) {
            addAchievement('Season300_3PM');
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
          
          // 60%+ TS on 20+ PPG (Season): TS >= .600, ppg >= 20, gp >= 50
          if (tsPct >= 0.600 && ppg >= 20 && gp >= 50) {
            addAchievement('Season60TS20PPG');
          }
          
          // 60%+ eFG on >= 500 FGA (Season): eFG >= .600, fga >= 500
          if (eFgPct >= 0.600 && fga >= 500) {
            addAchievement('Season60eFG500FGA');
          }
          
          // 90%+ FT on >= 250 FTA (Season): ft/fta >= .900, fta >= 250
          if (ftPct >= 0.900 && fta >= 250) {
            addAchievement('Season90FT250FTA');
          }
          
          // 40%+ 3PT on >= 200 3PA (Season): tp/tpa >= .400, tpa >= 200
          if (tpPct >= 0.400 && tpa >= 200) {
            addAchievement('Season40_3PT200_3PA');
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

          // ===== EXPANDED MULTI-THRESHOLD ACHIEVEMENT CALCULATIONS =====
          
          // PPG Variations (18 achievements)
          const ppgThresholds = [1, 2, 3, 4, 5, 8, 10, 12, 15, 18, 20, 22, 24, 26, 28, 32, 35];
          const ppgIds = ['SeasonPPG1', 'SeasonPPG2', 'SeasonPPG3', 'SeasonPPG4', 'SeasonPPG5', 'SeasonPPG8', 'SeasonPPG10', 'SeasonPPG12', 'SeasonPPG15', 'SeasonPPG18', 'SeasonPPG20', 'SeasonPPG22', 'SeasonPPG24', 'SeasonPPG26', 'SeasonPPG28', 'SeasonPPG32', 'SeasonPPG35'];
          for (let i = 0; i < ppgThresholds.length; i++) {
            const threshold = ppgThresholds[i];
            const minGames = threshold >= 26 ? 40 : (threshold >= 18 ? 50 : 55);
            if (ppg >= threshold && gp >= minGames) {
              addAchievement(ppgIds[i] as SeasonAchievementId);
            }
          }
          
          // Points Variations (10 achievements)
          const pointsThresholds = [800, 1000, 1100, 1200, 1400, 1600, 1800, 2200, 2400];
          const pointsIds = ['SeasonPoints800', 'SeasonPoints1000', 'SeasonPoints1100', 'SeasonPoints1200', 'SeasonPoints1400', 'SeasonPoints1600', 'SeasonPoints1800', 'SeasonPoints2200', 'SeasonPoints2400'];
          for (let i = 0; i < pointsThresholds.length; i++) {
            if (pts >= pointsThresholds[i]) {
              addAchievement(pointsIds[i] as SeasonAchievementId);
            }
          }
          
          // 3PM Variations (12 achievements)  
          const threePMThresholds = [50, 75, 100, 125, 150, 175, 225, 275, 325];
          const threePMIds = ['Season3PM50', 'Season3PM75', 'Season3PM100', 'Season3PM125', 'Season3PM150', 'Season3PM175', 'Season3PM225', 'Season3PM275', 'Season3PM325'];
          for (let i = 0; i < threePMThresholds.length; i++) {
            if (tp >= threePMThresholds[i]) {
              addAchievement(threePMIds[i] as SeasonAchievementId);
            }
          }
          
          // RPG Variations (12 achievements)
          const rpgThresholds = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15];
          const rpgIds = ['SeasonRPG3', 'SeasonRPG4', 'SeasonRPG5', 'SeasonRPG6', 'SeasonRPG7', 'SeasonRPG8', 'SeasonRPG9', 'SeasonRPG10', 'SeasonRPG11', 'SeasonRPG13', 'SeasonRPG15'];
          for (let i = 0; i < rpgThresholds.length; i++) {
            const threshold = rpgThresholds[i];
            const minGames = threshold >= 13 ? 40 : (threshold >= 9 ? 50 : 55);
            if (rpg >= threshold && gp >= minGames) {
              addAchievement(rpgIds[i] as SeasonAchievementId);
            }
          }
          
          // APG Variations (11 achievements)
          const apgThresholds = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12];
          const apgIds = ['SeasonAPG2', 'SeasonAPG3', 'SeasonAPG4', 'SeasonAPG5', 'SeasonAPG6', 'SeasonAPG7', 'SeasonAPG8', 'SeasonAPG9', 'SeasonAPG11', 'SeasonAPG12'];
          for (let i = 0; i < apgThresholds.length; i++) {
            const threshold = apgThresholds[i];
            const minGames = threshold >= 11 ? 40 : (threshold >= 7 ? 50 : 55);
            if (apg >= threshold && gp >= minGames) {
              addAchievement(apgIds[i] as SeasonAchievementId);
            }
          }
          
          // Rebounds Variations (8 achievements)
          const reboundsThresholds = [300, 400, 500, 600, 700, 900, 1000];
          const reboundsIds = ['SeasonRebounds300', 'SeasonRebounds400', 'SeasonRebounds500', 'SeasonRebounds600', 'SeasonRebounds700', 'SeasonRebounds900', 'SeasonRebounds1000'];
          for (let i = 0; i < reboundsThresholds.length; i++) {
            if (trb >= reboundsThresholds[i]) {
              addAchievement(reboundsIds[i] as SeasonAchievementId);
            }
          }
          
          // Assists Variations (7 achievements)
          const assistsThresholds = [200, 300, 400, 500, 600, 800];
          const assistsIds = ['SeasonAssists200', 'SeasonAssists300', 'SeasonAssists400', 'SeasonAssists500', 'SeasonAssists600', 'SeasonAssists800'];
          for (let i = 0; i < assistsThresholds.length; i++) {
            if (ast >= assistsThresholds[i]) {
              addAchievement(assistsIds[i] as SeasonAchievementId);
            }
          }
          
          // SPG Variations (9 achievements)
          const spgThresholds = [0.5, 0.8, 0.9, 1.0, 1.3, 1.5, 1.7, 2.3];
          const spgIds = ['SeasonSPG0_5', 'SeasonSPG0_8', 'SeasonSPG0_9', 'SeasonSPG1_0', 'SeasonSPG1_3', 'SeasonSPG1_5', 'SeasonSPG1_7', 'SeasonSPG2_3'];
          for (let i = 0; i < spgThresholds.length; i++) {
            const threshold = spgThresholds[i];
            const minGames = threshold >= 2.3 ? 40 : (threshold >= 1.5 ? 50 : 55);
            if (spg >= threshold && gp >= minGames) {
              addAchievement(spgIds[i] as SeasonAchievementId);
            }
          }
          
          // BPG Variations (8 achievements)
          const bpgThresholds = [0.5, 0.8, 0.9, 1.0, 1.5, 2.0, 3.0];
          const bpgIds = ['SeasonBPG0_5', 'SeasonBPG0_8', 'SeasonBPG0_9', 'SeasonBPG1_0', 'SeasonBPG1_5', 'SeasonBPG2_0', 'SeasonBPG3_0'];
          for (let i = 0; i < bpgThresholds.length; i++) {
            const threshold = bpgThresholds[i];
            const minGames = threshold >= 3.0 ? 40 : (threshold >= 1.5 ? 50 : 55);
            if (bpg >= threshold && gp >= minGames) {
              addAchievement(bpgIds[i] as SeasonAchievementId);
            }
          }
          
          // Steals Variations (8 achievements)
          const stealsThresholds = [50, 75, 90, 100, 125, 175, 200];
          const stealsIds = ['SeasonSteals50', 'SeasonSteals75', 'SeasonSteals90', 'SeasonSteals100', 'SeasonSteals125', 'SeasonSteals175', 'SeasonSteals200'];
          for (let i = 0; i < stealsThresholds.length; i++) {
            if (stl >= stealsThresholds[i]) {
              addAchievement(stealsIds[i] as SeasonAchievementId);
            }
          }
          
          // Blocks Variations (8 achievements)
          const blocksThresholds = [50, 75, 90, 100, 125, 175, 200];
          const blocksIds = ['SeasonBlocks50', 'SeasonBlocks75', 'SeasonBlocks90', 'SeasonBlocks100', 'SeasonBlocks125', 'SeasonBlocks175', 'SeasonBlocks200'];
          for (let i = 0; i < blocksThresholds.length; i++) {
            if (blk >= blocksThresholds[i]) {
              addAchievement(blocksIds[i] as SeasonAchievementId);
            }
          }
          
          // Stocks Variations (9 achievements)
          const stocksThresholds = [100, 120, 130, 140, 150, 175, 225, 250];
          const stocksIds = ['SeasonStocks100', 'SeasonStocks120', 'SeasonStocks130', 'SeasonStocks140', 'SeasonStocks150', 'SeasonStocks175', 'SeasonStocks225', 'SeasonStocks250'];
          for (let i = 0; i < stocksThresholds.length; i++) {
            if (stocks >= stocksThresholds[i]) {
              addAchievement(stocksIds[i] as SeasonAchievementId);
            }
          }
          
          // TS% Variations (6 achievements)
          const tsPctThresholds = [0.54, 0.56, 0.58, 0.60, 0.62, 0.64];
          const tsPctIds = ['SeasonTSPct54', 'SeasonTSPct56', 'SeasonTSPct58', 'SeasonTSPct60', 'SeasonTSPct62', 'SeasonTSPct64'];
          for (let i = 0; i < tsPctThresholds.length; i++) {
            const threshold = tsPctThresholds[i];
            const minPPG = threshold >= 0.62 ? 18 : (threshold >= 0.60 ? 20 : 15);
            const minGames = threshold >= 0.60 ? 50 : 55;
            if (tsPct >= threshold && ppg >= minPPG && gp >= minGames && fga >= 400) {
              addAchievement(tsPctIds[i] as SeasonAchievementId);
            }
          }
          
          // eFG% Variations (7 achievements)
          const eFgPctThresholds = [0.54, 0.55, 0.56, 0.57, 0.60, 0.63, 0.65];
          const eFgPctIds = ['SeasoneFGPct54', 'SeasoneFGPct55', 'SeasoneFGPct56', 'SeasoneFGPct57', 'SeasoneFGPct60', 'SeasoneFGPct63', 'SeasoneFGPct65'];
          for (let i = 0; i < eFgPctThresholds.length; i++) {
            const threshold = eFgPctThresholds[i];
            const minFGA = threshold >= 0.60 ? 500 : 400;
            if (eFgPct >= threshold && fga >= minFGA) {
              addAchievement(eFgPctIds[i] as SeasonAchievementId);
            }
          }
          
          // FT% Variations (6 achievements)
          const ftPctThresholds = [0.80, 0.83, 0.85, 0.88, 0.92];
          const ftPctIds = ['SeasonFTPct80', 'SeasonFTPct83', 'SeasonFTPct85', 'SeasonFTPct88', 'SeasonFTPct92'];
          for (let i = 0; i < ftPctThresholds.length; i++) {
            const threshold = ftPctThresholds[i];
            const minFTA = threshold >= 0.88 ? 250 : 200;
            if (ftPct >= threshold && fta >= minFTA) {
              addAchievement(ftPctIds[i] as SeasonAchievementId);
            }
          }
          
          // 3PT% Variations (7 achievements)
          const threePPctThresholds = [0.33, 0.35, 0.36, 0.37, 0.38, 0.42];
          const threePPctIds = ['Season3PPct33', 'Season3PPct35', 'Season3PPct36', 'Season3PPct37', 'Season3PPct38', 'Season3PPct42'];
          for (let i = 0; i < threePPctThresholds.length; i++) {
            const threshold = threePPctThresholds[i];
            const minTPA = threshold >= 0.42 ? 200 : (threshold >= 0.38 ? 175 : 150);
            if (tpPct >= threshold && tpa >= minTPA) {
              addAchievement(threePPctIds[i] as SeasonAchievementId);
            }
          }
          
          // Games Played Variations (8 achievements)
          const gamesThresholds = [40, 45, 50, 55, 60, 65, 75];
          const gamesIds = ['SeasonGames40', 'SeasonGames45', 'SeasonGames50', 'SeasonGames55', 'SeasonGames60', 'SeasonGames65', 'SeasonGames75'];
          for (let i = 0; i < gamesThresholds.length; i++) {
            if (gp >= gamesThresholds[i]) {
              addAchievement(gamesIds[i] as SeasonAchievementId);
            }
          }
          
          // MPG Variations (7 achievements)
          const mpgThresholds = [28.0, 30.0, 31.0, 32.0, 34.0, 38.0];
          const mpgIds = ['SeasonMPG28', 'SeasonMPG30', 'SeasonMPG31', 'SeasonMPG32', 'SeasonMPG34', 'SeasonMPG38'];
          for (let i = 0; i < mpgThresholds.length; i++) {
            const threshold = mpgThresholds[i];
            const minGames = threshold >= 38.0 ? 40 : (threshold >= 34.0 ? 50 : 55);
            if (mpg >= threshold && gp >= minGames) {
              addAchievement(mpgIds[i] as SeasonAchievementId);
            }
          }
          
          // Combo Season Variations
          
          // PPG/RPG Combos (7 achievements)
          if (ppg >= 18 && rpg >= 8 && gp >= 50) addAchievement('Season18_8');
          if (ppg >= 20 && rpg >= 8 && gp >= 50) addAchievement('Season20_8');
          if (ppg >= 22 && rpg >= 8 && gp >= 50) addAchievement('Season22_8');
          if (ppg >= 24 && rpg >= 10 && gp >= 50) addAchievement('Season24_10');
          if (ppg >= 26 && rpg >= 10 && gp >= 40) addAchievement('Season26_10');
          if (ppg >= 28 && rpg >= 12 && gp >= 40) addAchievement('Season28_12');
          if (ppg >= 30 && rpg >= 15 && gp >= 40) addAchievement('Season30_15');
          
          // PPG/RPG/APG Combos (6 achievements)
          if (ppg >= 18 && rpg >= 4 && apg >= 4 && gp >= 50) addAchievement('Season18_4_4');
          if (ppg >= 22 && rpg >= 5 && apg >= 5 && gp >= 50) addAchievement('Season22_5_5');
          if (ppg >= 24 && rpg >= 6 && apg >= 6 && gp >= 50) addAchievement('Season24_6_6');
          if (ppg >= 26 && rpg >= 6 && apg >= 6 && gp >= 40) addAchievement('Season26_6_6');
          if (ppg >= 28 && rpg >= 8 && apg >= 8 && gp >= 40) addAchievement('Season28_8_8');
          
          // Additional PPG/RPG/APG Combos (4 achievements)
          if (ppg >= 16 && rpg >= 7 && apg >= 4 && gp >= 50) addAchievement('Season16_7_4');
          if (ppg >= 18 && rpg >= 8 && apg >= 5 && gp >= 50) addAchievement('Season18_8_5');
          if (ppg >= 22 && rpg >= 10 && apg >= 6 && gp >= 50) addAchievement('Season22_10_6');
          if (ppg >= 24 && rpg >= 12 && apg >= 7 && gp >= 50) addAchievement('Season24_12_7');
          
          // SPG/BPG/3PM/G Combos (4 achievements)
          if (spg >= 0.5 && bpg >= 0.5 && tpg >= 0.5 && gp >= 55) addAchievement('Season0_5_0_5_0_5');
          if (spg >= 0.8 && bpg >= 0.8 && tpg >= 0.8 && gp >= 50) addAchievement('Season0_8_0_8_0_8');
          if (spg >= 1.0 && bpg >= 1.0 && tpg >= 1.0 && gp >= 50) addAchievement('Season1_0_1_0_1_0');
          if (spg >= 1.2 && bpg >= 1.2 && tpg >= 1.2 && gp >= 40) addAchievement('Season1_2_1_2_1_2');
        }
      }
    }
    
    // Debug logging removed for performance
  }
  
  // Calculate Football GM season achievements (FBSeason4kPassYds)
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
        
        // Get all regular season stats for this season, excluding TOT rows
        const seasonStats = player.stats.filter(stat => 
          stat.season === season && !stat.playoffs && (stat.gp || 0) > 0 && stat.tid !== -1
        );
        
        for (const stat of seasonStats) {
          const tid = stat.tid;
          
          // Extract all relevant stats from the season stat
          const pssYds = (stat as any).pssYds || 0;
          const rusYds = (stat as any).rusYds || 0;
          const rec = (stat as any).rec || 0;
          const defSk = (stat as any).defSk || 0;
          const defTckSolo = (stat as any).defTckSolo || 0;
          const defTckAst = (stat as any).defTckAst || 0;
          const defInt = (stat as any).defInt || 0;
          const pssTD = (stat as any).pssTD || 0;
          const recYds = (stat as any).recYds || 0;
          const recTD = (stat as any).recTD || 0;
          const rusTD = (stat as any).rusTD || 0;
          const prYds = (stat as any).prYds || 0;
          const krYds = (stat as any).krYds || 0;
          const defTckLoss = (stat as any).defTckLoss || 0;
          
          // Computed values
          const totalTackles = defTckSolo + defTckAst;
          const scrimmageYards = rusYds + recYds;
          const allPurposeYards = rusYds + recYds + prYds + krYds;
          
          // Helper function to add achievement
          const addAchievement = (achievementId: SeasonAchievementId) => {
            if (!seasonIndex[season]) seasonIndex[season] = {};
            if (!seasonIndex[season][tid]) seasonIndex[season][tid] = {} as Record<SeasonAchievementId, Set<number>>;
            if (!seasonIndex[season][tid][achievementId]) seasonIndex[season][tid][achievementId] = new Set();
            
            seasonIndex[season][tid][achievementId].add(player.pid);
            footballEntriesAdded++;
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
        
        // Get all regular season stats for this season, excluding TOT rows
        const seasonStats = player.stats.filter(stat => 
          stat.season === season && !stat.playoffs && (stat.gp || 0) > 0 && stat.tid !== -1
        );
        
        for (const stat of seasonStats) {
          const tid = stat.tid;
          
          // Extract all relevant Hockey GM stats from the season stat
          const evG = (stat as any).evG || 0;
          const ppG = (stat as any).ppG || 0;
          const shG = (stat as any).shG || 0;
          const evA = (stat as any).evA || 0;
          const ppA = (stat as any).ppA || 0;
          const shA = (stat as any).shA || 0;
          const pm = (stat as any).pm || 0;
          const s = (stat as any).s || 0;  // shots
          const hit = (stat as any).hit || 0;
          const blk = (stat as any).blk || 0;
          const tk = (stat as any).tk || 0;  // takeaways
          const gwG = (stat as any).gwG || 0;  // game-winning goals
          const fow = (stat as any).fow || 0;  // faceoffs won
          const fol = (stat as any).fol || 0;  // faceoffs lost
          const min = (stat as any).min || 0;  // minutes
          const pim = (stat as any).pim || 0;  // penalty minutes
          const gp = stat.gp || 0;
          
          // Goalie stats
          const sv = (stat as any).sv || 0;  // saves
          const ga = (stat as any).ga || 0;  // goals against
          const so = (stat as any).so || 0;  // shutouts
          const gs = (stat as any).gs || 0;  // games started
          
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
          
          // Helper function to add achievement
          const addAchievement = (achievementId: SeasonAchievementId) => {
            if (!seasonIndex[season]) seasonIndex[season] = {};
            if (!seasonIndex[season][tid]) seasonIndex[season][tid] = {} as Record<SeasonAchievementId, Set<number>>;
            if (!seasonIndex[season][tid][achievementId]) seasonIndex[season][tid][achievementId] = new Set();
            
            seasonIndex[season][tid][achievementId].add(player.pid);
            hockeyEntriesAdded++;
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
    }
    
    // Debug logging removed for performance
  }
  
  // Calculate Baseball GM season achievements (BBSeason achievements)
  if (sport === 'baseball') {
    let baseballEntriesAdded = 0;
    
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
        
        // Get all regular season stats for this season, excluding TOT rows
        const seasonStats = player.stats.filter(stat => 
          stat.season === season && !stat.playoffs && (stat.gp || 0) > 0 && stat.tid !== -1
        );
        
        for (const stat of seasonStats) {
          const tid = stat.tid;
          
          // Extract all relevant Baseball GM stats from the season stat using proper ZGMB field names
          const hr = (stat as any).hr || 0; // home runs
          const h = (stat as any).h || 0; // hits
          const rbi = (stat as any).rbi || 0; // runs batted in
          const r = (stat as any).r || 0; // runs scored
          const sb = (stat as any).sb || 0; // stolen bases
          const bb = (stat as any).bb || 0; // walks
          const tb = (stat as any).tb || 0; // total bases
          const doubles = (stat as any)["2b"] || 0; // doubles
          const triples = (stat as any)["3b"] || 0; // triples
          const ab = (stat as any).ab || 0; // at bats
          const pa = (stat as any).pa || 0; // plate appearances
          const hbp = (stat as any).hbp || 0; // hit by pitch
          const sf = (stat as any).sf || 0; // sacrifice flies
          const ibb = (stat as any).ibb || 0; // intentional walks
          const gp = stat.gp || 0;
          
          // Pitching stats
          const so = (stat as any).so || 0; // strikeouts (pitching)
          const ip = (stat as any).ip || 0; // innings pitched
          const er = (stat as any).er || 0; // earned runs
          const w = (stat as any).w || 0; // wins
          const sv = (stat as any).sv || 0; // saves
          const cg = (stat as any).cg || 0; // complete games
          const sho = (stat as any).sho || 0; // shutouts
          const ha = (stat as any).ha || 0; // hits allowed
          const bba = (stat as any).bba || 0; // walks allowed
          const gs = (stat as any).gs || 0; // games started
          const app = (stat as any).app || (stat as any).g || 0; // appearances
          
          // Computed batting values with zero-division guards
          const xbh = doubles + triples + hr; // extra base hits
          const avg = ab > 0 ? h / ab : 0;
          const obp = pa > 0 ? (h + bb + hbp) / pa : 0; // Simple OBP calculation
          const slg = ab > 0 ? tb / ab : 0;
          const ops = obp + slg;
          
          // Computed pitching values with zero-division guards
          const era = ip > 0 ? (er * 9) / ip : 999; // ERA
          const whip = ip > 0 ? (ha + bba) / ip : 999; // WHIP
          const kbb = bba > 0 ? so / bba : (so > 0 ? 999 : 0); // K/BB ratio (treat 0 BB as infinite when SO > 0)
          const k9 = ip > 0 ? (so * 9) / ip : 0; // K/9
          
          // Helper function to add achievement
          const addAchievement = (achievementId: SeasonAchievementId) => {
            if (!seasonIndex[season]) seasonIndex[season] = {};
            if (!seasonIndex[season][tid]) seasonIndex[season][tid] = {} as Record<SeasonAchievementId, Set<number>>;
            if (!seasonIndex[season][tid][achievementId]) seasonIndex[season][tid][achievementId] = new Set();
            
            seasonIndex[season][tid][achievementId].add(player.pid);
            baseballEntriesAdded++;
          };
          
          // Hitting achievements (15 achievements)
          
          // Check for 40+ HR achievement
          if (hr >= 40) {
            addAchievement('BBSeason40HR');
          }
          
          // Check for 200+ Hits achievement
          if (h >= 200) {
            addAchievement('BBSeason200Hits');
          }
          
          // Check for 100+ RBI achievement
          if (rbi >= 100) {
            addAchievement('BBSeason100RBI');
          }
          
          // Check for 100+ Runs achievement
          if (r >= 100) {
            addAchievement('BBSeason100Runs');
          }
          
          // Check for 50+ SB achievement
          if (sb >= 50) {
            addAchievement('BBSeason50SB');
          }
          
          // Check for 100+ BB achievement
          if (bb >= 100) {
            addAchievement('BBSeason100BB');
          }
          
          // Check for 300+ TB achievement
          if (tb >= 300) {
            addAchievement('BBSeason300TB');
          }
          
          // Check for 60+ XBH achievement
          if (xbh >= 60) {
            addAchievement('BBSeason60XBH');
          }
          
          // Check for .300+ AVG on ≥500 PA achievement (qualifier enforced first)
          if (pa >= 500 && avg >= 0.300) {
            addAchievement('BBSeason300Avg500PA');
          }
          
          // Check for .400+ OBP on ≥500 PA achievement (qualifier enforced first)
          if (pa >= 500 && obp >= 0.400) {
            addAchievement('BBSeason400OBP500PA');
          }
          
          // Check for .550+ SLG on ≥500 PA achievement (qualifier enforced first)
          if (pa >= 500 && slg >= 0.550) {
            addAchievement('BBSeason550SLG500PA');
          }
          
          // Check for .900+ OPS on ≥500 PA achievement (qualifier enforced first)
          if (pa >= 500 && ops >= 0.900) {
            addAchievement('BBSeason900OPS500PA');
          }
          
          // Check for 10+ Triples achievement
          if (triples >= 10) {
            addAchievement('BBSeason10Triples');
          }
          
          // Check for 20+ HBP achievement
          if (hbp >= 20) {
            addAchievement('BBSeason20HBP');
          }
          
          // Check for 25/25 Club HR/SB achievement
          if (hr >= 25 && sb >= 25) {
            addAchievement('BBSeason25_25Club');
          }
          
          // Pitching achievements (12 achievements)
          
          // Check for 200+ SO achievement
          if (so >= 200) {
            addAchievement('BBSeason200SO');
          }
          
          // Check for ≤2.50 ERA on ≥162 IP achievement (qualifier enforced first)
          if (ip >= 162 && era <= 2.50) {
            addAchievement('BBSeason250ERA162IP');
          }
          
          // Check for ≤1.05 WHIP on ≥162 IP achievement (qualifier enforced first)
          if (ip >= 162 && whip <= 1.05) {
            addAchievement('BBSeason105WHIP162IP');
          }
          
          // Check for 20+ Wins achievement
          if (w >= 20) {
            addAchievement('BBSeason20Wins');
          }
          
          // Check for 40+ Saves achievement
          if (sv >= 40) {
            addAchievement('BBSeason40Saves');
          }
          
          // Check for 3+ CG achievement
          if (cg >= 3) {
            addAchievement('BBSeason3CG');
          }
          
          // Check for 4+ SHO achievement
          if (sho >= 4) {
            addAchievement('BBSeason4SHO');
          }
          
          // Check for 220+ IP achievement
          if (ip >= 220) {
            addAchievement('BBSeason220IP');
          }
          
          // Check for K/BB ≥ 4.0 on ≥162 IP achievement (qualifier enforced first)
          if (ip >= 162 && kbb >= 4.0) {
            addAchievement('BBSeasonKBB4_162IP');
          }
          
          // Check for K/9 ≥ 10.0 on ≥100 IP achievement (qualifier enforced first)
          if (ip >= 100 && k9 >= 10.0) {
            addAchievement('BBSeasonK9_10_100IP');
          }
          
          // Check for 30+ GS achievement
          if (gs >= 30) {
            addAchievement('BBSeason30GS');
          }
          
          // Check for 50+ APP achievement
          if (app >= 50) {
            addAchievement('BBSeason50APP');
          }
          
          // Two-Way achievement (1 achievement)
          
          // Check for Two-Way 20+ HR & 100+ IP achievement
          if (hr >= 20 && ip >= 100) {
            addAchievement('BBSeasonTwoWay20HR100IP');
          }
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
      
      // 250+ Made Threes Season achievement
      const threesMade = seasonStat.tpm || seasonStat.tp || 0;
      if (threesMade >= 250) {
        if (!seasonIndex[season]) seasonIndex[season] = {};
        if (!seasonIndex[season][tid]) seasonIndex[season][tid] = {} as Record<SeasonAchievementId, Set<number>>;
        if (!seasonIndex[season][tid]['Season250ThreePM']) seasonIndex[season][tid]['Season250ThreePM'] = new Set();
        
        seasonIndex[season][tid]['Season250ThreePM'].add(player.pid);
        totalIndexed++;
      }
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
    id: 'AllRookieTeam',
    label: 'All-Rookie Team',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'Season250ThreePM',
    label: '250+ Made Threes Season',
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
    id: 'Season2000Points',
    label: '2,000+ Points (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'Season300_3PM',
    label: '300+ 3PM (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
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
    id: 'Season60TS20PPG',
    label: '60%+ TS on 20+ PPG (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season60eFG500FGA',
    label: '60%+ eFG on ≥500 FGA (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season90FT250FTA',
    label: '90%+ FT on ≥250 FTA (Season)',
    isSeasonSpecific: true,
    minPlayers: 1
  },
  {
    id: 'Season40_3PT200_3PA',
    label: '40%+ 3PT on ≥200 3PA (Season)',
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
  
  // Statistical Leaders with Rank Variations (36 new achievements)
  { id: 'PointsLeader1st', label: 'Points Leader (1st)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'PointsLeader3rd', label: 'Points Leader (≤3rd)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'PointsLeader5th', label: 'Points Leader (≤5th)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'PointsLeader10th', label: 'Points Leader (≤10th)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'PointsLeader15th', label: 'Points Leader (≤15th)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'PointsLeader20th', label: 'Points Leader (≤20th)', isSeasonSpecific: true, minPlayers: 5 },
  
  { id: 'ReboundsLeader1st', label: 'Rebounds Leader (1st)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'ReboundsLeader3rd', label: 'Rebounds Leader (≤3rd)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'ReboundsLeader5th', label: 'Rebounds Leader (≤5th)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'ReboundsLeader10th', label: 'Rebounds Leader (≤10th)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'ReboundsLeader15th', label: 'Rebounds Leader (≤15th)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'ReboundsLeader20th', label: 'Rebounds Leader (≤20th)', isSeasonSpecific: true, minPlayers: 5 },
  
  { id: 'AssistsLeader1st', label: 'Assists Leader (1st)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'AssistsLeader3rd', label: 'Assists Leader (≤3rd)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'AssistsLeader5th', label: 'Assists Leader (≤5th)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'AssistsLeader10th', label: 'Assists Leader (≤10th)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'AssistsLeader15th', label: 'Assists Leader (≤15th)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'AssistsLeader20th', label: 'Assists Leader (≤20th)', isSeasonSpecific: true, minPlayers: 5 },
  
  { id: 'StealsLeader1st', label: 'Steals Leader (1st)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'StealsLeader3rd', label: 'Steals Leader (≤3rd)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'StealsLeader5th', label: 'Steals Leader (≤5th)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'StealsLeader10th', label: 'Steals Leader (≤10th)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'StealsLeader15th', label: 'Steals Leader (≤15th)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'StealsLeader20th', label: 'Steals Leader (≤20th)', isSeasonSpecific: true, minPlayers: 5 },
  
  { id: 'BlocksLeader1st', label: 'Blocks Leader (1st)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'BlocksLeader3rd', label: 'Blocks Leader (≤3rd)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'BlocksLeader5th', label: 'Blocks Leader (≤5th)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'BlocksLeader10th', label: 'Blocks Leader (≤10th)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'BlocksLeader15th', label: 'Blocks Leader (≤15th)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'BlocksLeader20th', label: 'Blocks Leader (≤20th)', isSeasonSpecific: true, minPlayers: 5 },
  
  { id: 'ThreePMLeader1st', label: '3PM Leader (1st)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'ThreePMLeader3rd', label: '3PM Leader (≤3rd)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'ThreePMLeader5th', label: '3PM Leader (≤5th)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'ThreePMLeader10th', label: '3PM Leader (≤10th)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'ThreePMLeader15th', label: '3PM Leader (≤15th)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'ThreePMLeader20th', label: '3PM Leader (≤20th)', isSeasonSpecific: true, minPlayers: 5 },
  
  // PPG Variations (18 achievements)
  { id: 'SeasonPPG1', label: '1+ PPG (Season)', isSeasonSpecific: true, minPlayers: 10 },
  { id: 'SeasonPPG2', label: '2+ PPG (Season)', isSeasonSpecific: true, minPlayers: 10 },
  { id: 'SeasonPPG3', label: '3+ PPG (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonPPG4', label: '4+ PPG (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonPPG5', label: '5+ PPG (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonPPG8', label: '8+ PPG (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonPPG10', label: '10+ PPG (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonPPG12', label: '12+ PPG (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonPPG15', label: '15+ PPG (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonPPG18', label: '18+ PPG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonPPG20', label: '20+ PPG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonPPG22', label: '22+ PPG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonPPG24', label: '24+ PPG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonPPG26', label: '26+ PPG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasonPPG28', label: '28+ PPG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasonPPG32', label: '32+ PPG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasonPPG35', label: '35+ PPG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // Points Variations (10 achievements)
  { id: 'SeasonPoints800', label: '800+ Points (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonPoints1000', label: '1,000+ Points (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonPoints1100', label: '1,100+ Points (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonPoints1200', label: '1,200+ Points (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonPoints1400', label: '1,400+ Points (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonPoints1600', label: '1,600+ Points (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonPoints1800', label: '1,800+ Points (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonPoints2200', label: '2,200+ Points (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasonPoints2400', label: '2,400+ Points (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // 3PM Variations (12 achievements)
  { id: 'Season3PM50', label: '50+ 3PM (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'Season3PM75', label: '75+ 3PM (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'Season3PM100', label: '100+ 3PM (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'Season3PM125', label: '125+ 3PM (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'Season3PM150', label: '150+ 3PM (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Season3PM175', label: '175+ 3PM (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Season3PM225', label: '225+ 3PM (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Season3PM275', label: '275+ 3PM (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Season3PM325', label: '325+ 3PM (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // RPG Variations (12 achievements)
  { id: 'SeasonRPG3', label: '3+ RPG (Season)', isSeasonSpecific: true, minPlayers: 10 },
  { id: 'SeasonRPG4', label: '4+ RPG (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonRPG5', label: '5+ RPG (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonRPG6', label: '6+ RPG (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonRPG7', label: '7+ RPG (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonRPG8', label: '8+ RPG (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonRPG9', label: '9+ RPG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonRPG10', label: '10+ RPG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonRPG11', label: '11+ RPG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonRPG13', label: '13+ RPG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasonRPG15', label: '15+ RPG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // APG Variations (11 achievements)
  { id: 'SeasonAPG2', label: '2+ APG (Season)', isSeasonSpecific: true, minPlayers: 10 },
  { id: 'SeasonAPG3', label: '3+ APG (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonAPG4', label: '4+ APG (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonAPG5', label: '5+ APG (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonAPG6', label: '6+ APG (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonAPG7', label: '7+ APG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonAPG8', label: '8+ APG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonAPG9', label: '9+ APG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonAPG11', label: '11+ APG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasonAPG12', label: '12+ APG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // Rebounds Variations (8 achievements)
  { id: 'SeasonRebounds300', label: '300+ Rebounds (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonRebounds400', label: '400+ Rebounds (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonRebounds500', label: '500+ Rebounds (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonRebounds600', label: '600+ Rebounds (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonRebounds700', label: '700+ Rebounds (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonRebounds900', label: '900+ Rebounds (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasonRebounds1000', label: '1,000+ Rebounds (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // Assists Variations (7 achievements)
  { id: 'SeasonAssists200', label: '200+ Assists (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonAssists300', label: '300+ Assists (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonAssists400', label: '400+ Assists (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonAssists500', label: '500+ Assists (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonAssists600', label: '600+ Assists (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonAssists800', label: '800+ Assists (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // SPG Variations (9 achievements)
  { id: 'SeasonSPG0_5', label: '0.5+ SPG (Season)', isSeasonSpecific: true, minPlayers: 10 },
  { id: 'SeasonSPG0_8', label: '0.8+ SPG (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonSPG0_9', label: '0.9+ SPG (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonSPG1_0', label: '1.0+ SPG (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonSPG1_3', label: '1.3+ SPG (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonSPG1_5', label: '1.5+ SPG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonSPG1_7', label: '1.7+ SPG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonSPG2_3', label: '2.3+ SPG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // BPG Variations (8 achievements)
  { id: 'SeasonBPG0_5', label: '0.5+ BPG (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonBPG0_8', label: '0.8+ BPG (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonBPG0_9', label: '0.9+ BPG (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonBPG1_0', label: '1.0+ BPG (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonBPG1_5', label: '1.5+ BPG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonBPG2_0', label: '2.0+ BPG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonBPG3_0', label: '3.0+ BPG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // Steals Variations (8 achievements)
  { id: 'SeasonSteals50', label: '50+ Steals (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonSteals75', label: '75+ Steals (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonSteals90', label: '90+ Steals (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonSteals100', label: '100+ Steals (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonSteals125', label: '125+ Steals (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonSteals175', label: '175+ Steals (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasonSteals200', label: '200+ Steals (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // Blocks Variations (8 achievements)
  { id: 'SeasonBlocks50', label: '50+ Blocks (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonBlocks75', label: '75+ Blocks (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonBlocks90', label: '90+ Blocks (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonBlocks100', label: '100+ Blocks (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonBlocks125', label: '125+ Blocks (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonBlocks175', label: '175+ Blocks (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasonBlocks200', label: '200+ Blocks (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // Stocks Variations (9 achievements)
  { id: 'SeasonStocks100', label: '100+ Stocks (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonStocks120', label: '120+ Stocks (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonStocks130', label: '130+ Stocks (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonStocks140', label: '140+ Stocks (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonStocks150', label: '150+ Stocks (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonStocks175', label: '175+ Stocks (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasonStocks225', label: '225+ Stocks (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasonStocks250', label: '250+ Stocks (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // TS% Variations (6 achievements)
  { id: 'SeasonTSPct54', label: '54%+ TS (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonTSPct56', label: '56%+ TS (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonTSPct58', label: '58%+ TS (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonTSPct60', label: '60%+ TS (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonTSPct62', label: '62%+ TS (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasonTSPct64', label: '64%+ TS (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // eFG% Variations (7 achievements)
  { id: 'SeasoneFGPct54', label: '54%+ eFG (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasoneFGPct55', label: '55%+ eFG (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasoneFGPct56', label: '56%+ eFG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasoneFGPct57', label: '57%+ eFG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasoneFGPct60', label: '60%+ eFG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasoneFGPct63', label: '63%+ eFG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'SeasoneFGPct65', label: '65%+ eFG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // FT% Variations (6 achievements)
  { id: 'SeasonFTPct80', label: '80%+ FT (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonFTPct83', label: '83%+ FT (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonFTPct85', label: '85%+ FT (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonFTPct88', label: '88%+ FT (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonFTPct92', label: '92%+ FT (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // 3PT% Variations (7 achievements)
  { id: 'Season3PPct33', label: '33%+ 3PT (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'Season3PPct35', label: '35%+ 3PT (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'Season3PPct36', label: '36%+ 3PT (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'Season3PPct37', label: '37%+ 3PT (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Season3PPct38', label: '38%+ 3PT (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Season3PPct42', label: '42%+ 3PT (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // Games Played Variations (8 achievements)
  { id: 'SeasonGames40', label: '40+ Games (Season)', isSeasonSpecific: true, minPlayers: 10 },
  { id: 'SeasonGames45', label: '45+ Games (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonGames50', label: '50+ Games (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonGames55', label: '55+ Games (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonGames60', label: '60+ Games (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonGames65', label: '65+ Games (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonGames75', label: '75+ Games (Season)', isSeasonSpecific: true, minPlayers: 3 },
  
  // MPG Variations (7 achievements)
  { id: 'SeasonMPG28', label: '28+ MPG (Season)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'SeasonMPG30', label: '30+ MPG (Season)', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'SeasonMPG31', label: '31+ MPG (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonMPG32', label: '32+ MPG (Season)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'SeasonMPG34', label: '34+ MPG (Season)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'SeasonMPG38', label: '38+ MPG (Season)', isSeasonSpecific: true, minPlayers: 1 },
  
  // Career Threshold Variations
  { id: 'Career6kPoints', label: '6,000+ Career Points', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'Career8kPoints', label: '8,000+ Career Points', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'Career10kPoints', label: '10,000+ Career Points', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'Career11kPoints', label: '11,000+ Career Points', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'Career12kPoints', label: '12,000+ Career Points', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career15kPoints', label: '15,000+ Career Points', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career18kPoints', label: '18,000+ Career Points', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career22kPoints', label: '22,000+ Career Points', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Career25kPoints', label: '25,000+ Career Points', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Career28kPoints', label: '28,000+ Career Points', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Career30kPoints', label: '30,000+ Career Points', isSeasonSpecific: true, minPlayers: 1 },
  
  { id: 'Career4kRebounds', label: '4,000+ Career Rebounds', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'Career5kRebounds', label: '5,000+ Career Rebounds', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career6kRebounds', label: '6,000+ Career Rebounds', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career8kRebounds', label: '8,000+ Career Rebounds', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career12kRebounds', label: '12,000+ Career Rebounds', isSeasonSpecific: true, minPlayers: 1 },
  
  { id: 'Career1_5kAssists', label: '1,500+ Career Assists', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'Career2kAssists', label: '2,000+ Career Assists', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'Career2_5kAssists', label: '2,500+ Career Assists', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'Career3kAssists', label: '3,000+ Career Assists', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career4kAssists', label: '4,000+ Career Assists', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career6kAssists', label: '6,000+ Career Assists', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Career8kAssists', label: '8,000+ Career Assists', isSeasonSpecific: true, minPlayers: 1 },
  
  { id: 'Career600Steals', label: '600+ Career Steals', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'Career800Steals', label: '800+ Career Steals', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'Career900Steals', label: '900+ Career Steals', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'Career1kSteals', label: '1,000+ Career Steals', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career1_5kSteals', label: '1,500+ Career Steals', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career2_5kSteals', label: '2,500+ Career Steals', isSeasonSpecific: true, minPlayers: 1 },
  
  { id: 'Career600Blocks', label: '600+ Career Blocks', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'Career800Blocks', label: '800+ Career Blocks', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'Career900Blocks', label: '900+ Career Blocks', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career1kBlocks', label: '1,000+ Career Blocks', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career1_2kBlocks', label: '1,200+ Career Blocks', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career2kBlocks', label: '2,000+ Career Blocks', isSeasonSpecific: true, minPlayers: 1 },
  
  { id: 'Career600_3PM', label: '600+ Career 3PM', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'Career800_3PM', label: '800+ Career 3PM', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'Career900_3PM', label: '900+ Career 3PM', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'Career1k_3PM', label: '1,000+ Career 3PM', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'Career1_5k_3PM', label: '1,500+ Career 3PM', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Career2_5k_3PM', label: '2,500+ Career 3PM', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Career3k_3PM', label: '3,000+ Career 3PM', isSeasonSpecific: true, minPlayers: 1 },
  
  { id: 'Seasons5', label: '5+ Seasons Played', isSeasonSpecific: true, minPlayers: 10 },
  { id: 'Seasons6', label: '6+ Seasons Played', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'Seasons7', label: '7+ Seasons Played', isSeasonSpecific: true, minPlayers: 6 },
  { id: 'Seasons8', label: '8+ Seasons Played', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'Seasons12', label: '12+ Seasons Played', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Seasons18', label: '18+ Seasons Played', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Seasons20', label: '20+ Seasons Played', isSeasonSpecific: true, minPlayers: 1 },
  
  // Combo Season Variations (sampling key combinations)
  { id: 'Season18_8', label: '18/8 Season (PPG/RPG)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Season20_8', label: '20/8 Season (PPG/RPG)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Season22_8', label: '22/8 Season (PPG/RPG)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Season24_10', label: '24/10 Season (PPG/RPG)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Season26_10', label: '26/10 Season (PPG/RPG)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Season28_12', label: '28/12 Season (PPG/RPG)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Season30_15', label: '30/15 Season (PPG/RPG)', isSeasonSpecific: true, minPlayers: 1 },
  
  { id: 'Season18_4_4', label: '18/4/4 Season (PPG/RPG/APG)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Season20_5_5', label: '20/5/5 Season (PPG/RPG/APG)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Season22_5_5', label: '22/5/5 Season (PPG/RPG/APG)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Season24_6_6', label: '24/6/6 Season (PPG/RPG/APG)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Season26_6_6', label: '26/6/6 Season (PPG/RPG/APG)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Season28_8_8', label: '28/8/8 Season (PPG/RPG/APG)', isSeasonSpecific: true, minPlayers: 1 },
  
  { id: 'Season16_7_4', label: '16/7/4 Season (PPG/RPG/APG)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Season18_8_5', label: '18/8/5 Season (PPG/RPG/APG)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Season22_10_6', label: '22/10/6 Season (PPG/RPG/APG)', isSeasonSpecific: true, minPlayers: 1 },
  { id: 'Season24_12_7', label: '24/12/7 Season (PPG/RPG/APG)', isSeasonSpecific: true, minPlayers: 1 },
  
  { id: 'Season0_5_0_5_0_5', label: '0.5/0.5/0.5 Season (SPG/BPG/3PM/G)', isSeasonSpecific: true, minPlayers: 8 },
  { id: 'Season0_8_0_8_0_8', label: '0.8/0.8/0.8 Season (SPG/BPG/3PM/G)', isSeasonSpecific: true, minPlayers: 5 },
  { id: 'Season1_0_1_0_1_0', label: '1.0/1.0/1.0 Season (SPG/BPG/3PM/G)', isSeasonSpecific: true, minPlayers: 3 },
  { id: 'Season1_2_1_2_1_2', label: '1.2/1.2/1.2 Season (SPG/BPG/3PM/G)', isSeasonSpecific: true, minPlayers: 1 },
  
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

  // Baseball GM season statistical achievements (28 new achievements)
  // Hitters (15 achievements)
  {
    id: 'BBSeason40HR',
    label: '40+ HR (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason200Hits',
    label: '200+ Hits (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason100RBI',
    label: '100+ RBI (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason100Runs',
    label: '100+ Runs (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason50SB',
    label: '50+ SB (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason100BB',
    label: '100+ BB (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason300TB',
    label: '300+ TB (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason60XBH',
    label: '60+ XBH (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason300Avg500PA',
    label: '.300+ AVG on ≥500 PA (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason400OBP500PA',
    label: '.400+ OBP on ≥500 PA (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason550SLG500PA',
    label: '.550+ SLG on ≥500 PA (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason900OPS500PA',
    label: '.900+ OPS on ≥500 PA (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason10Triples',
    label: '10+ Triples (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason20HBP',
    label: '20+ HBP (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason25_25Club',
    label: '25/25 Club HR/SB (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  // Pitchers (12 achievements)
  {
    id: 'BBSeason200SO',
    label: '200+ SO (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason250ERA162IP',
    label: '≤2.50 ERA on ≥162 IP (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason105WHIP162IP',
    label: '≤1.05 WHIP on ≥162 IP (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason20Wins',
    label: '20+ Wins (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason40Saves',
    label: '40+ Saves (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason3CG',
    label: '3+ CG (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason4SHO',
    label: '4+ SHO (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason220IP',
    label: '220+ IP (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeasonKBB4_162IP',
    label: 'K/BB ≥ 4.0 on ≥162 IP (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeasonK9_10_100IP',
    label: 'K/9 ≥ 10.0 on ≥100 IP (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason30GS',
    label: '30+ GS (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'BBSeason50APP',
    label: '50+ APP (Season)',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  // Two-Way (1 achievement)
  {
    id: 'BBSeasonTwoWay20HR100IP',
    label: 'Two-Way 20+ HR & 100+ IP (Season)',
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