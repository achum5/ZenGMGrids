// Season-specific achievement definitions with variable integer threshold system
import type { Player } from "@/types/bbgm";

// ==================== CORE ABSTRACTIONS ====================

// Core threshold specification interface
export interface ThresholdSpec {
  key: string;                    // Base key for achievement (e.g., "SeasonPPG", "CareerPoints")
  thresholds: number[];          // Array of threshold values
  comparator: '>=' | '<=' | '>' | '<' | '=';  // How to compare against threshold
  labelTemplate: string;        // Template for display label with {value} placeholder
  minPlayers: number;           // Minimum players required for achievement to appear
  qualifiers?: {                // Optional additional requirements
    [field: string]: number;    // e.g., { gp: 50, attempts: 200 }
  };
  valueExtractor: (stats: any, season: number, gameAttributes?: any) => number | null;
  category: 'statistical-leader' | 'individual-season' | 'efficiency' | 'combo' | 'career';
  sport: 'basketball' | 'football' | 'hockey' | 'baseball';
}

// Season key utilities for dynamic achievement identification  
export type SeasonKey = string; // Format: "base@threshold" e.g., "SeasonPPG@30", "CareerPoints@20000"

export function makeSeasonKey(base: string, threshold: number): SeasonKey {
  return `${base}@${threshold}`;
}

export function parseSeasonKey(key: SeasonKey): { base: string; threshold: number } | null {
  const match = key.match(/^(.+)@(\d+\.?\d*)$/);
  if (!match) return null;
  return { base: match[1], threshold: parseFloat(match[2]) };
}

// Updated SeasonIndex structure to use string keys instead of fixed IDs
export type SeasonIndex = Record<number, Record<number, Record<string, Set<number>>>>;

// Legacy achievement interface for backward compatibility
export interface SeasonAchievement {
  id: SeasonAchievementId;
  label: string;
  isSeasonSpecific: true;
  minPlayers: number;
}

// Legacy fixed IDs for backward compatibility
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
  | 'Champion'
  | 'AllRookieTeam'
  | 'Season250ThreePM'
  // Legacy static season achievements (mapped to dynamic keys)
  | 'Season30PPG'
  | 'Season2000Points'
  | 'Season300_3PM'
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
  | 'Season60TS20PPG'
  | 'Season60eFG500FGA'
  | 'Season90FT250FTA'
  | 'Season40_3PT200_3PA'
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
  | 'BBSeasonTwoWay20HR100IP'
  | 'SFMVP'; // Requires special team resolution logic

// ==================== THRESHOLD SPECIFICATIONS ====================

// Basketball GM threshold specifications
const BASKETBALL_STAT_SPECS: ThresholdSpec[] = [
  // Statistical Leaders (Rank-based)
  {
    key: 'StatLeaderPoints',
    thresholds: [1, 2, 3, 4, 5, 10, 15, 20],
    comparator: '<=',
    labelTemplate: '#{value} in Points',
    minPlayers: 3,
    category: 'statistical-leader',
    sport: 'basketball',
    valueExtractor: (player: Player, season: number, gameAttributes?: any) => {
      // This will be populated by season leader calculation
      return null;
    }
  },
  {
    key: 'StatLeaderRebounds',
    thresholds: [1, 2, 3, 4, 5, 10, 15, 20],
    comparator: '<=',
    labelTemplate: '#{value} in Rebounds',
    minPlayers: 3,
    category: 'statistical-leader',
    sport: 'basketball',
    valueExtractor: (player: Player, season: number, gameAttributes?: any) => {
      return null;
    }
  },
  {
    key: 'StatLeaderAssists',
    thresholds: [1, 2, 3, 4, 5, 10, 15, 20],
    comparator: '<=',
    labelTemplate: '#{value} in Assists',
    minPlayers: 3,
    category: 'statistical-leader',
    sport: 'basketball',
    valueExtractor: (player: Player, season: number, gameAttributes?: any) => {
      return null;
    }
  },
  {
    key: 'StatLeaderSteals',
    thresholds: [1, 2, 3, 4, 5, 10, 15, 20],
    comparator: '<=',
    labelTemplate: '#{value} in Steals',
    minPlayers: 3,
    category: 'statistical-leader',
    sport: 'basketball',
    valueExtractor: (player: Player, season: number, gameAttributes?: any) => {
      return null;
    }
  },
  {
    key: 'StatLeaderBlocks',
    thresholds: [1, 2, 3, 4, 5, 10, 15, 20],
    comparator: '<=',
    labelTemplate: '#{value} in Blocks',
    minPlayers: 3,
    category: 'statistical-leader',
    sport: 'basketball',
    valueExtractor: (player: Player, season: number, gameAttributes?: any) => {
      return null;
    }
  },

  // Individual Season Stats
  {
    key: 'SeasonPPG',
    thresholds: [1, 2, 3, 4, 5, 8, 10, 12, 15, 18, 20, 22, 24, 26, 28, 30, 32, 35],
    comparator: '>=',
    labelTemplate: '{value}+ PPG (Season)',
    minPlayers: 5,
    qualifiers: { gp: 50 },
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any, season: number) => {
      if (stats.gp > 0) return stats.pts / stats.gp;
      return null;
    }
  },
  {
    key: 'SeasonPoints',
    thresholds: [800, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400],
    comparator: '>=',
    labelTemplate: '{value}+ Points (Season)',
    minPlayers: 5,
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any) => stats.pts || 0
  },
  {
    key: 'Season3PM',
    thresholds: [50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325],
    comparator: '>=',
    labelTemplate: '{value}+ 3PM (Season)',
    minPlayers: 5,
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any) => stats.tp || 0
  },
  {
    key: 'SeasonRPG',
    thresholds: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16],
    comparator: '>=',
    labelTemplate: '{value}+ RPG (Season)',
    minPlayers: 5,
    qualifiers: { gp: 50 },
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any) => {
      if (stats.gp > 0) {
        const rebounds = stats.trb || stats.reb || ((stats.orb || 0) + (stats.drb || 0)) || 0;
        return rebounds / stats.gp;
      }
      return null;
    }
  },
  {
    key: 'SeasonAPG',
    thresholds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    comparator: '>=',
    labelTemplate: '{value}+ APG (Season)',
    minPlayers: 5,
    qualifiers: { gp: 50 },
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any) => {
      if (stats.gp > 0) return (stats.ast || 0) / stats.gp;
      return null;
    }
  },
  {
    key: 'SeasonRebounds',
    thresholds: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200],
    comparator: '>=',
    labelTemplate: '{value}+ Rebounds (Season)',
    minPlayers: 5,
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any) => {
      return stats.trb || stats.reb || ((stats.orb || 0) + (stats.drb || 0)) || 0;
    }
  },
  {
    key: 'SeasonAssists',
    thresholds: [200, 300, 400, 500, 600, 700, 800, 900, 1000],
    comparator: '>=',
    labelTemplate: '{value}+ Assists (Season)',
    minPlayers: 5,
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any) => stats.ast || 0
  },
  {
    key: 'SeasonSPG',
    thresholds: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
    comparator: '>=',
    labelTemplate: '{value}+ SPG (Season)',
    minPlayers: 5,
    qualifiers: { gp: 50 },
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any) => {
      if (stats.gp > 0) return (stats.stl || 0) / stats.gp;
      return null;
    }
  },
  {
    key: 'SeasonBPG',
    thresholds: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5],
    comparator: '>=',
    labelTemplate: '{value}+ BPG (Season)',
    minPlayers: 5,
    qualifiers: { gp: 50 },
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any) => {
      if (stats.gp > 0) return (stats.blk || 0) / stats.gp;
      return null;
    }
  },
  {
    key: 'SeasonSteals',
    thresholds: [50, 75, 100, 125, 150, 175, 200],
    comparator: '>=',
    labelTemplate: '{value}+ Steals (Season)',
    minPlayers: 5,
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any) => stats.stl || 0
  },
  {
    key: 'SeasonBlocks',
    thresholds: [50, 75, 100, 125, 150, 175, 200, 250],
    comparator: '>=',
    labelTemplate: '{value}+ Blocks (Season)',
    minPlayers: 5,
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any) => stats.blk || 0
  },
  {
    key: 'SeasonStocks',
    thresholds: [100, 125, 150, 175, 200, 225, 250, 300],
    comparator: '>=',
    labelTemplate: '{value}+ Stocks (Season)',
    minPlayers: 5,
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any) => (stats.stl || 0) + (stats.blk || 0)
  },

  // Efficiency achievements
  {
    key: 'SeasonTSPct',
    thresholds: [55, 60, 65, 70, 75],
    comparator: '>=',
    labelTemplate: '{value}%+ TS (Season)',
    minPlayers: 5,
    qualifiers: { ppg: 15, gp: 50 },
    category: 'efficiency',
    sport: 'basketball',
    valueExtractor: (stats: any) => {
      if (stats.fga && stats.fta) {
        const ts = stats.pts / (2 * (stats.fga + 0.44 * stats.fta));
        return ts * 100;
      }
      return null;
    }
  },
  {
    key: 'SeasoneFGPct',
    thresholds: [50, 55, 60, 65, 70],
    comparator: '>=',
    labelTemplate: '{value}%+ eFG (Season)',
    minPlayers: 5,
    qualifiers: { fga: 500 },
    category: 'efficiency',
    sport: 'basketball',
    valueExtractor: (stats: any) => {
      if (stats.fga > 0) {
        const efg = (stats.fg + 0.5 * (stats.tp || 0)) / stats.fga;
        return efg * 100;
      }
      return null;
    }
  },
  {
    key: 'SeasonFTPct',
    thresholds: [80, 85, 90, 95],
    comparator: '>=',
    labelTemplate: '{value}%+ FT (Season)',
    minPlayers: 5,
    qualifiers: { fta: 250 },
    category: 'efficiency',
    sport: 'basketball',
    valueExtractor: (stats: any) => {
      if (stats.fta > 0) {
        return (stats.ft / stats.fta) * 100;
      }
      return null;
    }
  },
  {
    key: 'Season3PPct',
    thresholds: [35, 40, 45, 50],
    comparator: '>=',
    labelTemplate: '{value}%+ 3PT (Season)',
    minPlayers: 5,
    qualifiers: { tpa: 200 },
    category: 'efficiency',
    sport: 'basketball',
    valueExtractor: (stats: any) => {
      if (stats.tpa > 0) {
        return ((stats.tp || 0) / stats.tpa) * 100;
      }
      return null;
    }
  },
  {
    key: 'SeasonGames',
    thresholds: [60, 65, 70, 75, 80, 82],
    comparator: '>=',
    labelTemplate: '{value}+ Games (Season)',
    minPlayers: 5,
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any) => stats.gp || 0
  },
  {
    key: 'SeasonMPG',
    thresholds: [28, 30, 32, 34, 36, 38, 40],
    comparator: '>=',
    labelTemplate: '{value}+ MPG (Season)',
    minPlayers: 5,
    qualifiers: { gp: 50 },
    category: 'individual-season',
    sport: 'basketball',
    valueExtractor: (stats: any) => {
      if (stats.gp > 0) return (stats.min || 0) / stats.gp;
      return null;
    }
  },

  // Career achievements
  {
    key: 'CareerPoints',
    thresholds: [5000, 8000, 10000, 12000, 15000, 18000, 20000, 22000, 25000, 30000],
    comparator: '>=',
    labelTemplate: '{value}+ Career Points',
    minPlayers: 5,
    category: 'career',
    sport: 'basketball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + (stat.pts || 0), 0);
    }
  },
  {
    key: 'CareerRebounds',
    thresholds: [3000, 5000, 7000, 8000, 10000, 12000, 15000],
    comparator: '>=',
    labelTemplate: '{value}+ Career Rebounds',
    minPlayers: 5,
    category: 'career',
    sport: 'basketball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + (stat.trb || stat.reb || ((stat.orb || 0) + (stat.drb || 0)) || 0), 0);
    }
  },
  {
    key: 'CareerAssists',
    thresholds: [2000, 3000, 4000, 5000, 6000, 7000, 8000, 10000],
    comparator: '>=',
    labelTemplate: '{value}+ Career Assists',
    minPlayers: 5,
    category: 'career',
    sport: 'basketball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + (stat.ast || 0), 0);
    }
  },
  {
    key: 'CareerSteals',
    thresholds: [800, 1000, 1200, 1500, 2000, 2500],
    comparator: '>=',
    labelTemplate: '{value}+ Career Steals',
    minPlayers: 5,
    category: 'career',
    sport: 'basketball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + (stat.stl || 0), 0);
    }
  },
  {
    key: 'CareerBlocks',
    thresholds: [500, 800, 1000, 1200, 1500, 2000, 2500],
    comparator: '>=',
    labelTemplate: '{value}+ Career Blocks',
    minPlayers: 5,
    category: 'career',
    sport: 'basketball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + (stat.blk || 0), 0);
    }
  },
  {
    key: 'Career3PM',
    thresholds: [500, 800, 1000, 1200, 1500, 2000, 2500, 3000],
    comparator: '>=',
    labelTemplate: '{value}+ Career 3PM',
    minPlayers: 5,
    category: 'career',
    sport: 'basketball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + (stat.tp || 0), 0);
    }
  },
  {
    key: 'CareerSeasons',
    thresholds: [8, 10, 12, 15, 18, 20],
    comparator: '>=',
    labelTemplate: '{value}+ Seasons Played',
    minPlayers: 5,
    category: 'career',
    sport: 'basketball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      const seasons = new Set<number>();
      player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .forEach(stat => seasons.add(stat.season));
      return seasons.size;
    }
  }
];

// Football GM threshold specifications
const FOOTBALL_STAT_SPECS: ThresholdSpec[] = [
  // Passing
  {
    key: 'FBSeasonPassYds',
    thresholds: [3000, 3500, 4000, 4500, 5000, 5500],
    comparator: '>=',
    labelTemplate: '{value}+ Passing Yards (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'football',
    valueExtractor: (stats: any) => (stats as any).pssYds || 0
  },
  {
    key: 'FBSeasonPassTD',
    thresholds: [15, 20, 25, 30, 35, 40, 45, 50],
    comparator: '>=',
    labelTemplate: '{value}+ Passing TD (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'football',
    valueExtractor: (stats: any) => (stats as any).pssTD || 0
  },

  // Rushing
  {
    key: 'FBSeasonRushYds',
    thresholds: [800, 1000, 1200, 1400, 1600, 1800, 2000],
    comparator: '>=',
    labelTemplate: '{value}+ Rushing Yards (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'football',
    valueExtractor: (stats: any) => (stats as any).rusYds || 0
  },
  {
    key: 'FBSeasonRushTD',
    thresholds: [6, 8, 10, 12, 15, 18, 20],
    comparator: '>=',
    labelTemplate: '{value}+ Rushing TD (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'football',
    valueExtractor: (stats: any) => (stats as any).rusTD || 0
  },

  // Receiving
  {
    key: 'FBSeasonReceptions',
    thresholds: [60, 70, 80, 90, 100, 110, 120],
    comparator: '>=',
    labelTemplate: '{value}+ Receptions (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'football',
    valueExtractor: (stats: any) => (stats as any).rec || 0
  },
  {
    key: 'FBSeasonRecYds',
    thresholds: [800, 1000, 1200, 1300, 1500, 1700, 2000],
    comparator: '>=',
    labelTemplate: '{value}+ Receiving Yards (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'football',
    valueExtractor: (stats: any) => (stats as any).recYds || 0
  },
  {
    key: 'FBSeasonRecTD',
    thresholds: [5, 8, 10, 12, 15, 18, 20],
    comparator: '>=',
    labelTemplate: '{value}+ Receiving TD (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'football',
    valueExtractor: (stats: any) => (stats as any).recTD || 0
  },

  // Defense
  {
    key: 'FBSeasonSacks',
    thresholds: [8, 10, 12, 15, 18, 20, 22],
    comparator: '>=',
    labelTemplate: '{value}+ Sacks (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'football',
    valueExtractor: (stats: any) => (stats as any).defSk || 0
  },
  {
    key: 'FBSeasonTackles',
    thresholds: [80, 100, 120, 140, 160, 180],
    comparator: '>=',
    labelTemplate: '{value}+ Tackles (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'football',
    valueExtractor: (stats: any) => ((stats as any).defTckSolo || 0) + ((stats as any).defTckAst || 0)
  },
  {
    key: 'FBSeasonInterceptions',
    thresholds: [3, 4, 5, 6, 7, 8, 10],
    comparator: '>=',
    labelTemplate: '{value}+ Interceptions (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'football',
    valueExtractor: (stats: any) => (stats as any).defInt || 0
  },
  {
    key: 'FBSeasonTFL',
    thresholds: [8, 10, 12, 15, 18, 20],
    comparator: '>=',
    labelTemplate: '{value}+ TFL (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'football',
    valueExtractor: (stats: any) => (stats as any).defTckLoss || 0
  },

  // Combined stats
  {
    key: 'FBSeasonScrimmageYds',
    thresholds: [1000, 1200, 1400, 1600, 1800, 2000, 2200],
    comparator: '>=',
    labelTemplate: '{value}+ Scrimmage Yards (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'football',
    valueExtractor: (stats: any) => ((stats as any).rusYds || 0) + ((stats as any).recYds || 0)
  },
  {
    key: 'FBSeasonAllPurposeYds',
    thresholds: [1200, 1400, 1600, 1800, 2000, 2200, 2500],
    comparator: '>=',
    labelTemplate: '{value}+ All-Purpose Yards (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'football',
    valueExtractor: (stats: any) => {
      return ((stats as any).rusYds || 0) + ((stats as any).recYds || 0) + 
             ((stats as any).prYds || 0) + ((stats as any).krYds || 0);
    }
  },

  // Career achievements
  {
    key: 'FBCareerPassYds',
    thresholds: [20000, 30000, 40000, 50000, 60000],
    comparator: '>=',
    labelTemplate: '{value}+ Career Passing Yards',
    minPlayers: 3,
    category: 'career',
    sport: 'football',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).pssYds || 0), 0);
    }
  },
  {
    key: 'FBCareerPassTD',
    thresholds: [100, 150, 200, 250, 300],
    comparator: '>=',
    labelTemplate: '{value}+ Career Passing TD',
    minPlayers: 3,
    category: 'career',
    sport: 'football',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).pssTD || 0), 0);
    }
  },
  {
    key: 'FBCareerRushYds',
    thresholds: [4000, 6000, 8000, 10000, 12000],
    comparator: '>=',
    labelTemplate: '{value}+ Career Rushing Yards',
    minPlayers: 3,
    category: 'career',
    sport: 'football',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).rusYds || 0), 0);
    }
  },
  {
    key: 'FBCareerRushTD',
    thresholds: [30, 40, 50, 60, 80, 100],
    comparator: '>=',
    labelTemplate: '{value}+ Career Rushing TD',
    minPlayers: 3,
    category: 'career',
    sport: 'football',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).rusTD || 0), 0);
    }
  },
  {
    key: 'FBCareerRecYds',
    thresholds: [4000, 6000, 8000, 10000, 12000],
    comparator: '>=',
    labelTemplate: '{value}+ Career Receiving Yards',
    minPlayers: 3,
    category: 'career',
    sport: 'football',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).recYds || 0), 0);
    }
  },
  {
    key: 'FBCareerRecTD',
    thresholds: [30, 40, 50, 60, 80, 100],
    comparator: '>=',
    labelTemplate: '{value}+ Career Receiving TD',
    minPlayers: 3,
    category: 'career',
    sport: 'football',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).recTD || 0), 0);
    }
  },
  {
    key: 'FBCareerSacks',
    thresholds: [30, 40, 50, 60, 80, 100],
    comparator: '>=',
    labelTemplate: '{value}+ Career Sacks',
    minPlayers: 3,
    category: 'career',
    sport: 'football',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).defSk || 0), 0);
    }
  },
  {
    key: 'FBCareerInterceptions',
    thresholds: [15, 20, 25, 30, 35, 40],
    comparator: '>=',
    labelTemplate: '{value}+ Career Interceptions',
    minPlayers: 3,
    category: 'career',
    sport: 'football',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).defInt || 0), 0);
    }
  }
];

// Hockey GM threshold specifications
const HOCKEY_STAT_SPECS: ThresholdSpec[] = [
  // Scoring
  {
    key: 'HKSeasonGoals',
    thresholds: [10, 15, 20, 25, 30, 35, 40, 45, 50, 60],
    comparator: '>=',
    labelTemplate: '{value}+ Goals (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => ((stats as any).evG || 0) + ((stats as any).ppG || 0) + ((stats as any).shG || 0)
  },
  {
    key: 'HKSeasonAssists',
    thresholds: [15, 20, 25, 30, 35, 40, 45, 50, 60, 70],
    comparator: '>=',
    labelTemplate: '{value}+ Assists (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => ((stats as any).evA || 0) + ((stats as any).ppA || 0) + ((stats as any).shA || 0)
  },
  {
    key: 'HKSeasonPoints',
    thresholds: [30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
    comparator: '>=',
    labelTemplate: '{value}+ Points (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => {
      const goals = ((stats as any).evG || 0) + ((stats as any).ppG || 0) + ((stats as any).shG || 0);
      const assists = ((stats as any).evA || 0) + ((stats as any).ppA || 0) + ((stats as any).shA || 0);
      return goals + assists;
    }
  },
  {
    key: 'HKSeasonPlusMinus',
    thresholds: [10, 15, 20, 25, 30, 35, 40],
    comparator: '>=',
    labelTemplate: '+{value}+ Plus/Minus (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => (stats as any).pm || 0
  },
  {
    key: 'HKSeasonShots',
    thresholds: [150, 200, 250, 300, 350, 400],
    comparator: '>=',
    labelTemplate: '{value}+ Shots (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => (stats as any).s || 0
  },
  {
    key: 'HKSeasonHits',
    thresholds: [100, 125, 150, 175, 200, 250],
    comparator: '>=',
    labelTemplate: '{value}+ Hits (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => (stats as any).hit || 0
  },
  {
    key: 'HKSeasonBlocks',
    thresholds: [50, 75, 100, 125, 150, 175, 200],
    comparator: '>=',
    labelTemplate: '{value}+ Blocks (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => (stats as any).blk || 0
  },
  {
    key: 'HKSeasonTakeaways',
    thresholds: [30, 40, 50, 60, 70, 80],
    comparator: '>=',
    labelTemplate: '{value}+ Takeaways (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => (stats as any).tk || 0
  },
  {
    key: 'HKSeasonPowerPlayPoints',
    thresholds: [10, 15, 20, 25, 30, 35],
    comparator: '>=',
    labelTemplate: '{value}+ Power-Play Points (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => ((stats as any).ppG || 0) + ((stats as any).ppA || 0)
  },
  {
    key: 'HKSeasonSHGoals',
    thresholds: [1, 2, 3, 4, 5],
    comparator: '>=',
    labelTemplate: '{value}+ Short-Handed Goals (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => (stats as any).shG || 0
  },
  {
    key: 'HKSeasonGWGoals',
    thresholds: [3, 4, 5, 6, 7, 8, 10],
    comparator: '>=',
    labelTemplate: '{value}+ Game-Winning Goals (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => (stats as any).gwG || 0
  },
  {
    key: 'HKSeasonFaceoffPct',
    thresholds: [50, 55, 60, 65],
    comparator: '>=',
    labelTemplate: '{value}%+ Faceoff Win Rate (Season)',
    minPlayers: 3,
    qualifiers: { fo: 600 },
    category: 'efficiency',
    sport: 'hockey',
    valueExtractor: (stats: any) => {
      const fow = (stats as any).fow || 0;
      const fol = (stats as any).fol || 0;
      const total = fow + fol;
      if (total >= 600) {
        return (fow / total) * 100;
      }
      return null;
    }
  },
  {
    key: 'HKSeasonTOI',
    thresholds: [18, 20, 22, 24, 26],
    comparator: '>=',
    labelTemplate: '{value}:00+ TOI per Game (Season)',
    minPlayers: 3,
    qualifiers: { gp: 50 },
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => {
      const gp = stats.gp || 0;
      const min = (stats as any).min || 0;
      if (gp >= 50) {
        return min / gp;
      }
      return null;
    }
  },
  {
    key: 'HKSeasonPIM',
    thresholds: [50, 70, 100, 150, 200],
    comparator: '>=',
    labelTemplate: '{value}+ PIM (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => (stats as any).pim || 0
  },

  // Goalie achievements
  {
    key: 'HKSeasonSavePct',
    thresholds: [90, 91, 92, 93, 94],
    comparator: '>=',
    labelTemplate: '.{value}+ Save Percentage (Season)',
    minPlayers: 3,
    qualifiers: { min: 1500 },
    category: 'efficiency',
    sport: 'hockey',
    valueExtractor: (stats: any) => {
      const min = (stats as any).min || 0;
      const sv = (stats as any).sv || 0;
      const ga = (stats as any).ga || 0;
      const total = sv + ga;
      if (min >= 1500 && total > 0) {
        return (sv / total) * 100;
      }
      return null;
    }
  },
  {
    key: 'HKSeasonGAA',
    thresholds: [200, 220, 240, 260, 280, 300],
    comparator: '<=',
    labelTemplate: '≤{value} GAA (Season)',
    minPlayers: 3,
    qualifiers: { min: 1500 },
    category: 'efficiency',
    sport: 'hockey',
    valueExtractor: (stats: any) => {
      const min = (stats as any).min || 0;
      const ga = (stats as any).ga || 0;
      if (min >= 1500) {
        return Math.round((ga / (min / 60)) * 100); // Return as basis points (2.60 GAA = 260)
      }
      return null;
    }
  },
  {
    key: 'HKSeasonShutouts',
    thresholds: [2, 3, 4, 5, 6, 7, 8, 10],
    comparator: '>=',
    labelTemplate: '{value}+ Shutouts (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => (stats as any).so || 0
  },
  {
    key: 'HKSeasonSaves',
    thresholds: [1200, 1500, 1800, 2000, 2200, 2500],
    comparator: '>=',
    labelTemplate: '{value}+ Saves (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => (stats as any).sv || 0
  },
  {
    key: 'HKSeasonStarts',
    thresholds: [30, 40, 50, 60, 65, 70],
    comparator: '>=',
    labelTemplate: '{value}+ Starts (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'hockey',
    valueExtractor: (stats: any) => (stats as any).gs || 0
  },

  // Career achievements
  {
    key: 'HKCareerGoals',
    thresholds: [100, 200, 300, 400, 500, 600],
    comparator: '>=',
    labelTemplate: '{value}+ Career Goals',
    minPlayers: 1,
    category: 'career',
    sport: 'hockey',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => {
          const goals = ((stat as any).evG || 0) + ((stat as any).ppG || 0) + ((stat as any).shG || 0);
          return sum + goals;
        }, 0);
    }
  },
  {
    key: 'HKCareerAssists',
    thresholds: [200, 300, 400, 500, 600, 700, 800],
    comparator: '>=',
    labelTemplate: '{value}+ Career Assists',
    minPlayers: 1,
    category: 'career',
    sport: 'hockey',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => {
          const assists = ((stat as any).evA || 0) + ((stat as any).ppA || 0) + ((stat as any).shA || 0);
          return sum + assists;
        }, 0);
    }
  },
  {
    key: 'HKCareerPoints',
    thresholds: [300, 500, 700, 1000, 1200, 1500],
    comparator: '>=',
    labelTemplate: '{value}+ Career Points',
    minPlayers: 1,
    category: 'career',
    sport: 'hockey',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => {
          const goals = ((stat as any).evG || 0) + ((stat as any).ppG || 0) + ((stat as any).shG || 0);
          const assists = ((stat as any).evA || 0) + ((stat as any).ppA || 0) + ((stat as any).shA || 0);
          return sum + goals + assists;
        }, 0);
    }
  },
  {
    key: 'HKCareerWins',
    thresholds: [50, 100, 150, 200, 250, 300],
    comparator: '>=',
    labelTemplate: '{value}+ Career Wins (G)',
    minPlayers: 1,
    category: 'career',
    sport: 'hockey',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).w || 0), 0);
    }
  },
  {
    key: 'HKCareerShutouts',
    thresholds: [10, 20, 30, 40, 50, 60],
    comparator: '>=',
    labelTemplate: '{value}+ Career Shutouts (G)',
    minPlayers: 1,
    category: 'career',
    sport: 'hockey',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).so || 0), 0);
    }
  }
];

// Baseball GM threshold specifications
const BASEBALL_STAT_SPECS: ThresholdSpec[] = [
  // Hitting - Counting Stats
  {
    key: 'BBSeasonHR',
    thresholds: [10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70],
    comparator: '>=',
    labelTemplate: '{value}+ HR (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).hr || 0
  },
  {
    key: 'BBSeasonHits',
    thresholds: [120, 140, 160, 180, 200, 220, 240],
    comparator: '>=',
    labelTemplate: '{value}+ Hits (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).h || 0
  },
  {
    key: 'BBSeasonRBI',
    thresholds: [60, 70, 80, 90, 100, 110, 120, 130, 140],
    comparator: '>=',
    labelTemplate: '{value}+ RBI (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).rbi || 0
  },
  {
    key: 'BBSeasonRuns',
    thresholds: [60, 70, 80, 90, 100, 110, 120, 130, 140],
    comparator: '>=',
    labelTemplate: '{value}+ Runs (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).r || 0
  },
  {
    key: 'BBSeasonSB',
    thresholds: [15, 20, 25, 30, 35, 40, 50, 60, 70],
    comparator: '>=',
    labelTemplate: '{value}+ SB (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).sb || 0
  },
  {
    key: 'BBSeasonBB',
    thresholds: [50, 60, 70, 80, 90, 100, 110, 120, 130],
    comparator: '>=',
    labelTemplate: '{value}+ BB (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).bb || 0
  },
  {
    key: 'BBSeasonTB',
    thresholds: [200, 250, 280, 300, 320, 350, 380, 400],
    comparator: '>=',
    labelTemplate: '{value}+ TB (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).tb || 0
  },
  {
    key: 'BBSeasonXBH',
    thresholds: [30, 40, 50, 60, 70, 80],
    comparator: '>=',
    labelTemplate: '{value}+ XBH (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => {
      const doubles = (stats as any)["2b"] || 0;
      const triples = (stats as any)["3b"] || 0;
      const hr = (stats as any).hr || 0;
      return doubles + triples + hr;
    }
  },
  {
    key: 'BBSeasonTriples',
    thresholds: [5, 7, 10, 12, 15],
    comparator: '>=',
    labelTemplate: '{value}+ Triples (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any)["3b"] || 0
  },
  {
    key: 'BBSeasonHBP',
    thresholds: [10, 15, 20, 25, 30],
    comparator: '>=',
    labelTemplate: '{value}+ HBP (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).hbp || 0
  },

  // Hitting - Rate Stats (with qualifiers)
  {
    key: 'BBSeasonAvg',
    thresholds: [260, 280, 300, 320, 340, 360, 380, 400],
    comparator: '>=',
    labelTemplate: '.{value}+ AVG (Season)',
    minPlayers: 3,
    qualifiers: { pa: 500 },
    category: 'efficiency',
    sport: 'baseball',
    valueExtractor: (stats: any) => {
      const pa = (stats as any).pa || 0;
      const ab = (stats as any).ab || 0;
      const h = (stats as any).h || 0;
      if (pa >= 500 && ab > 0) {
        return Math.round((h / ab) * 1000); // Return as basis points (.300 = 300)
      }
      return null;
    }
  },
  {
    key: 'BBSeasonOBP',
    thresholds: [320, 340, 360, 380, 400, 420, 450, 480, 500],
    comparator: '>=',
    labelTemplate: '.{value}+ OBP (Season)',
    minPlayers: 3,
    qualifiers: { pa: 500 },
    category: 'efficiency',
    sport: 'baseball',
    valueExtractor: (stats: any) => {
      const pa = (stats as any).pa || 0;
      const h = (stats as any).h || 0;
      const bb = (stats as any).bb || 0;
      const hbp = (stats as any).hbp || 0;
      if (pa >= 500) {
        return Math.round(((h + bb + hbp) / pa) * 1000);
      }
      return null;
    }
  },
  {
    key: 'BBSeasonSLG',
    thresholds: [400, 450, 500, 550, 600, 650, 700],
    comparator: '>=',
    labelTemplate: '.{value}+ SLG (Season)',
    minPlayers: 3,
    qualifiers: { pa: 500 },
    category: 'efficiency',
    sport: 'baseball',
    valueExtractor: (stats: any) => {
      const pa = (stats as any).pa || 0;
      const ab = (stats as any).ab || 0;
      const tb = (stats as any).tb || 0;
      if (pa >= 500 && ab > 0) {
        return Math.round((tb / ab) * 1000);
      }
      return null;
    }
  },
  {
    key: 'BBSeasonOPS',
    thresholds: [700, 750, 800, 850, 900, 950, 1000, 1100, 1200],
    comparator: '>=',
    labelTemplate: '.{value}+ OPS (Season)',
    minPlayers: 3,
    qualifiers: { pa: 500 },
    category: 'efficiency',
    sport: 'baseball',
    valueExtractor: (stats: any) => {
      const pa = (stats as any).pa || 0;
      const h = (stats as any).h || 0;
      const bb = (stats as any).bb || 0;
      const hbp = (stats as any).hbp || 0;
      const ab = (stats as any).ab || 0;
      const tb = (stats as any).tb || 0;
      if (pa >= 500 && ab > 0) {
        const obp = (h + bb + hbp) / pa;
        const slg = tb / ab;
        return Math.round((obp + slg) * 1000);
      }
      return null;
    }
  },

  // Pitching - Counting Stats
  {
    key: 'BBSeasonSO',
    thresholds: [100, 120, 150, 180, 200, 220, 250, 280, 300],
    comparator: '>=',
    labelTemplate: '{value}+ SO (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).so || 0
  },
  {
    key: 'BBSeasonWins',
    thresholds: [10, 12, 15, 18, 20, 22, 25],
    comparator: '>=',
    labelTemplate: '{value}+ Wins (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).w || 0
  },
  {
    key: 'BBSeasonSaves',
    thresholds: [20, 25, 30, 35, 40, 45, 50],
    comparator: '>=',
    labelTemplate: '{value}+ Saves (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).sv || 0
  },
  {
    key: 'BBSeasonCG',
    thresholds: [1, 2, 3, 4, 5, 6],
    comparator: '>=',
    labelTemplate: '{value}+ CG (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).cg || 0
  },
  {
    key: 'BBSeasonSHO',
    thresholds: [1, 2, 3, 4, 5],
    comparator: '>=',
    labelTemplate: '{value}+ SHO (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).sho || 0
  },
  {
    key: 'BBSeasonIP',
    thresholds: [150, 180, 200, 220, 240, 260, 280],
    comparator: '>=',
    labelTemplate: '{value}+ IP (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).ip || 0
  },
  {
    key: 'BBSeasonGS',
    thresholds: [20, 25, 28, 30, 32, 35],
    comparator: '>=',
    labelTemplate: '{value}+ GS (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).gs || 0
  },
  {
    key: 'BBSeasonAPP',
    thresholds: [30, 40, 50, 60, 70, 80],
    comparator: '>=',
    labelTemplate: '{value}+ APP (Season)',
    minPlayers: 3,
    category: 'individual-season',
    sport: 'baseball',
    valueExtractor: (stats: any) => (stats as any).app || (stats as any).g || 0
  },

  // Pitching - Rate Stats (with qualifiers)
  {
    key: 'BBSeasonERA',
    thresholds: [200, 225, 250, 275, 300, 350],
    comparator: '<=',
    labelTemplate: '≤{value} ERA (Season)',
    minPlayers: 3,
    qualifiers: { ip: 162 },
    category: 'efficiency',
    sport: 'baseball',
    valueExtractor: (stats: any) => {
      const ip = (stats as any).ip || 0;
      const er = (stats as any).er || 0;
      if (ip >= 162) {
        return Math.round((er * 9 / ip) * 100); // Return as basis points (2.50 ERA = 250)
      }
      return null;
    }
  },
  {
    key: 'BBSeasonWHIP',
    thresholds: [90, 95, 100, 105, 110, 120],
    comparator: '<=',
    labelTemplate: '≤{value} WHIP (Season)',
    minPlayers: 3,
    qualifiers: { ip: 162 },
    category: 'efficiency',
    sport: 'baseball',
    valueExtractor: (stats: any) => {
      const ip = (stats as any).ip || 0;
      const ha = (stats as any).ha || 0;
      const bba = (stats as any).bba || 0;
      if (ip >= 162) {
        return Math.round(((ha + bba) / ip) * 100); // Return as basis points (1.05 WHIP = 105)
      }
      return null;
    }
  },
  {
    key: 'BBSeasonKBB',
    thresholds: [200, 250, 300, 350, 400, 500],
    comparator: '>=',
    labelTemplate: '{value}+ K/BB (Season)',
    minPlayers: 3,
    qualifiers: { ip: 162 },
    category: 'efficiency',
    sport: 'baseball',
    valueExtractor: (stats: any) => {
      const ip = (stats as any).ip || 0;
      const so = (stats as any).so || 0;
      const bba = (stats as any).bba || 0;
      if (ip >= 162 && bba > 0) {
        return Math.round((so / bba) * 100); // Return as basis points (4.0 K/BB = 400)
      }
      return null;
    }
  },
  {
    key: 'BBSeasonK9',
    thresholds: [600, 700, 800, 900, 1000, 1100, 1200],
    comparator: '>=',
    labelTemplate: '{value} K/9 (Season)',
    minPlayers: 3,
    qualifiers: { ip: 100 },
    category: 'efficiency',
    sport: 'baseball',
    valueExtractor: (stats: any) => {
      const ip = (stats as any).ip || 0;
      const so = (stats as any).so || 0;
      if (ip >= 100) {
        return Math.round((so * 9 / ip) * 100); // Return as basis points (10.0 K/9 = 1000)
      }
      return null;
    }
  },

  // Career achievements
  {
    key: 'BBCareerHits',
    thresholds: [1500, 2000, 2500, 3000, 3500, 4000],
    comparator: '>=',
    labelTemplate: '{value}+ Career Hits',
    minPlayers: 3,
    category: 'career',
    sport: 'baseball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).h || 0), 0);
    }
  },
  {
    key: 'BBCareerHR',
    thresholds: [200, 300, 400, 500, 600, 700, 800],
    comparator: '>=',
    labelTemplate: '{value}+ Career HR',
    minPlayers: 3,
    category: 'career',
    sport: 'baseball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).hr || 0), 0);
    }
  },
  {
    key: 'BBCareerRBI',
    thresholds: [800, 1000, 1200, 1500, 1800, 2000],
    comparator: '>=',
    labelTemplate: '{value}+ Career RBI',
    minPlayers: 3,
    category: 'career',
    sport: 'baseball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).rbi || 0), 0);
    }
  },
  {
    key: 'BBCareerRuns',
    thresholds: [800, 1000, 1200, 1500, 1800, 2000],
    comparator: '>=',
    labelTemplate: '{value}+ Career Runs',
    minPlayers: 3,
    category: 'career',
    sport: 'baseball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).r || 0), 0);
    }
  },
  {
    key: 'BBCareerSB',
    thresholds: [200, 300, 400, 500, 600],
    comparator: '>=',
    labelTemplate: '{value}+ Career SB',
    minPlayers: 3,
    category: 'career',
    sport: 'baseball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).sb || 0), 0);
    }
  },
  {
    key: 'BBCareerWins',
    thresholds: [100, 150, 200, 250, 300, 350],
    comparator: '>=',
    labelTemplate: '{value}+ Career Wins (P)',
    minPlayers: 3,
    category: 'career',
    sport: 'baseball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).w || 0), 0);
    }
  },
  {
    key: 'BBCareerSO',
    thresholds: [1000, 1500, 2000, 2500, 3000, 3500, 4000],
    comparator: '>=',
    labelTemplate: '{value}+ Career SO',
    minPlayers: 3,
    category: 'career',
    sport: 'baseball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).so || 0), 0);
    }
  },
  {
    key: 'BBCareerSaves',
    thresholds: [100, 200, 300, 400, 500, 600],
    comparator: '>=',
    labelTemplate: '{value}+ Career Saves',
    minPlayers: 3,
    category: 'career',
    sport: 'baseball',
    valueExtractor: (player: Player) => {
      if (!player.stats) return 0;
      return player.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).sv || 0), 0);
    }
  }
];

// ==================== STAT SPECS REGISTRY ====================
export const STAT_SPECS: Record<string, ThresholdSpec[]> = {
  basketball: BASKETBALL_STAT_SPECS,
  football: FOOTBALL_STAT_SPECS,
  hockey: HOCKEY_STAT_SPECS,
  baseball: BASEBALL_STAT_SPECS
};

// ==================== LABEL RESOLVER ====================
export function resolveDynamicLabel(key: string): string {
  const parsed = parseSeasonKey(key);
  if (!parsed) return key; // Fallback to raw key

  // Find matching spec
  for (const sportSpecs of Object.values(STAT_SPECS)) {
    const spec = sportSpecs.find(s => s.key === parsed.base);
    if (spec) {
      return spec.labelTemplate.replace('{value}', String(parsed.threshold));
    }
  }
  
  return key; // Fallback
}

// ==================== LEGACY SUPPORT ====================
// Legacy alias table for backward compatibility
const LEGACY_ALIAS_TABLE: Record<SeasonAchievementId, string> = {
  'Season30PPG': 'SeasonPPG@30',
  'Season2000Points': 'SeasonPoints@2000',
  'Season300_3PM': 'Season3PM@300',
  'Season200_3PM': 'Season3PM@200',
  'Season12RPG': 'SeasonRPG@12',
  'Season10APG': 'SeasonAPG@10',
  'Season800Rebounds': 'SeasonRebounds@800',
  'Season700Assists': 'SeasonAssists@700',
  'Season2SPG': 'SeasonSPG@2',
  'Season2_5BPG': 'SeasonBPG@2.5',
  'Season150Steals': 'SeasonSteals@150',
  'Season150Blocks': 'SeasonBlocks@150',
  'Season200Stocks': 'SeasonStocks@200',
  'Season70Games': 'SeasonGames@70',
  'Season36MPG': 'SeasonMPG@36',
  // Football legacy aliases
  'FBSeason4kPassYds': 'FBSeasonPassYds@4000',
  'FBSeason1200RushYds': 'FBSeasonRushYds@1200',
  'FBSeason100Receptions': 'FBSeasonReceptions@100',
  'FBSeason15Sacks': 'FBSeasonSacks@15',
  'FBSeason140Tackles': 'FBSeasonTackles@140',
  'FBSeason5Interceptions': 'FBSeasonInterceptions@5',
  'FBSeason30PassTD': 'FBSeasonPassTD@30',
  'FBSeason1300RecYds': 'FBSeasonRecYds@1300',
  'FBSeason10RecTD': 'FBSeasonRecTD@10',
  'FBSeason12RushTD': 'FBSeasonRushTD@12',
  'FBSeason1600Scrimmage': 'FBSeasonScrimmageYds@1600',
  'FBSeason2000AllPurpose': 'FBSeasonAllPurposeYds@2000',
  'FBSeason15TFL': 'FBSeasonTFL@15',
  // Hockey legacy aliases
  'HKSeason40Goals': 'HKSeasonGoals@40',
  'HKSeason60Assists': 'HKSeasonAssists@60',
  'HKSeason90Points': 'HKSeasonPoints@90',
  'HKSeason25Plus': 'HKSeasonPlusMinus@25',
  'HKSeason250Shots': 'HKSeasonShots@250',
  'HKSeason150Hits': 'HKSeasonHits@150',
  'HKSeason100Blocks': 'HKSeasonBlocks@100',
  'HKSeason60Takeaways': 'HKSeasonTakeaways@60',
  'HKSeason20PowerPlay': 'HKSeasonPowerPlayPoints@20',
  'HKSeason3SHGoals': 'HKSeasonSHGoals@3',
  'HKSeason7GWGoals': 'HKSeasonGWGoals@7',
  'HKSeason55FaceoffPct': 'HKSeasonFaceoffPct@55',
  'HKSeason22TOI': 'HKSeasonTOI@22',
  'HKSeason70PIM': 'HKSeasonPIM@70',
  'HKSeason920SavePct': 'HKSeasonSavePct@92',
  'HKSeason260GAA': 'HKSeasonGAA@260',
  'HKSeason6Shutouts': 'HKSeasonShutouts@6',
  'HKSeason2000Saves': 'HKSeasonSaves@2000',
  'HKSeason60Starts': 'HKSeasonStarts@60',
  // Baseball legacy aliases
  'BBSeason40HR': 'BBSeasonHR@40',
  'BBSeason200Hits': 'BBSeasonHits@200',
  'BBSeason100RBI': 'BBSeasonRBI@100',
  'BBSeason100Runs': 'BBSeasonRuns@100',
  'BBSeason50SB': 'BBSeasonSB@50',
  'BBSeason100BB': 'BBSeasonBB@100',
  'BBSeason300TB': 'BBSeasonTB@300',
  'BBSeason60XBH': 'BBSeasonXBH@60',
  'BBSeason300Avg500PA': 'BBSeasonAvg@300',
  'BBSeason400OBP500PA': 'BBSeasonOBP@400',
  'BBSeason550SLG500PA': 'BBSeasonSLG@550',
  'BBSeason900OPS500PA': 'BBSeasonOPS@900',
  'BBSeason10Triples': 'BBSeasonTriples@10',
  'BBSeason20HBP': 'BBSeasonHBP@20',
  'BBSeason200SO': 'BBSeasonSO@200',
  'BBSeason250ERA162IP': 'BBSeasonERA@250',
  'BBSeason105WHIP162IP': 'BBSeasonWHIP@105',
  'BBSeason20Wins': 'BBSeasonWins@20',
  'BBSeason40Saves': 'BBSeasonSaves@40',
  'BBSeason3CG': 'BBSeasonCG@3',
  'BBSeason4SHO': 'BBSeasonSHO@4',
  'BBSeason220IP': 'BBSeasonIP@220',
  'BBSeasonKBB4_162IP': 'BBSeasonKBB@400',
  'BBSeasonK9_10_100IP': 'BBSeasonK9@1000',
  'BBSeason30GS': 'BBSeasonGS@30',
  'BBSeason50APP': 'BBSeasonAPP@50',
  // Legacy keys that don't change
  'AllStar': 'AllStar',
  'MVP': 'MVP',
  'DPOY': 'DPOY',
  'ROY': 'ROY',
  'SMOY': 'SMOY',
  'MIP': 'MIP',
  'FinalsMVP': 'FinalsMVP',
  'AllLeagueAny': 'AllLeagueAny',
  'AllDefAny': 'AllDefAny',
  'AllRookieAny': 'AllRookieAny',
  'PointsLeader': 'PointsLeader',
  'ReboundsLeader': 'ReboundsLeader',
  'AssistsLeader': 'AssistsLeader',
  'StealsLeader': 'StealsLeader',
  'BlocksLeader': 'BlocksLeader',
  'Champion': 'Champion',
  'AllRookieTeam': 'AllRookieTeam',
  'Season250ThreePM': 'Season3PM@250',
  'Season50_40_90': 'Season50_40_90', // Special combo achievement
  'Season60TS20PPG': 'Season60TS20PPG', // Special efficiency achievement
  'Season60eFG500FGA': 'Season60eFG500FGA', // Special efficiency achievement
  'Season90FT250FTA': 'Season90FT250FTA', // Special efficiency achievement
  'Season40_3PT200_3PA': 'Season40_3PT200_3PA', // Special efficiency achievement
  'Season25_10': 'Season25_10', // Special combo achievement
  'Season25_5_5': 'Season25_5_5', // Special combo achievement
  'Season20_10_5': 'Season20_10_5', // Special combo achievement
  'Season1_1_1': 'Season1_1_1', // Special combo achievement
  // Football fixed achievements
  'FBAllStar': 'FBAllStar',
  'FBMVP': 'FBMVP',
  'FBDPOY': 'FBDPOY',
  'FBOffROY': 'FBOffROY',
  'FBDefROY': 'FBDefROY',
  'FBChampion': 'FBChampion',
  'FBAllRookie': 'FBAllRookie',
  'FBAllLeague': 'FBAllLeague',
  'FBFinalsMVP': 'FBFinalsMVP',
  // Hockey fixed achievements
  'HKAllStar': 'HKAllStar',
  'HKMVP': 'HKMVP',
  'HKDefenseman': 'HKDefenseman',
  'HKROY': 'HKROY',
  'HKChampion': 'HKChampion',
  'HKPlayoffsMVP': 'HKPlayoffsMVP',
  'HKFinalsMVP': 'HKFinalsMVP',
  'HKAllRookie': 'HKAllRookie',
  'HKAllLeague': 'HKAllLeague',
  'HKAllStarMVP': 'HKAllStarMVP',
  'HKAssistsLeader': 'HKAssistsLeader',
  // Baseball fixed achievements
  'BBAllStar': 'BBAllStar',
  'BBMVP': 'BBMVP',
  'BBROY': 'BBROY',
  'BBChampion': 'BBChampion',
  'BBAllRookie': 'BBAllRookie',
  'BBAllLeague': 'BBAllLeague',
  'BBPlayoffsMVP': 'BBPlayoffsMVP',
  'BBSeason25_25Club': 'BBSeason25_25Club', // Special combo achievement
  'BBSeasonTwoWay20HR100IP': 'BBSeasonTwoWay20HR100IP', // Special two-way achievement
  'SFMVP': 'SFMVP'
};

export function getLegacyKey(achievementId: SeasonAchievementId): string {
  return LEGACY_ALIAS_TABLE[achievementId] || achievementId;
}

// ==================== DYNAMIC SEASON INDEX BUILDER ====================

/**
 * Build comprehensive season achievement index using the threshold system
 */
export function buildSeasonIndex(
  players: Player[],
  teams: { tid: number }[],
  sport: 'basketball' | 'football' | 'hockey' | 'baseball',
  gameAttributes?: any
): SeasonIndex {
  const seasonIndex: SeasonIndex = {};
  const specs = STAT_SPECS[sport] || [];
  
  // Get all seasons from player data
  const allSeasons = new Set<number>();
  players.forEach(player => {
    if (player.stats) {
      player.stats.forEach(stat => {
        if (stat.season && !stat.playoffs) {
          allSeasons.add(stat.season);
        }
      });
    }
    if (player.awards) {
      player.awards.forEach(award => allSeasons.add(award.season));
    }
  });

  // Process each season
  for (const season of Array.from(allSeasons)) {
    // Calculate season leaders for statistical leader specs
    if (sport === 'basketball') {
      const seasonLeaders = calculateSeasonLeaders(players, season, gameAttributes);
      
      // Process statistical leader specs
      const leaderSpecs = specs.filter(s => s.category === 'statistical-leader');
      for (const spec of leaderSpecs) {
        const leaderData = getLeaderDataForSpec(spec, seasonLeaders);
        if (leaderData) {
          for (const [rank, playerIds] of leaderData.entries()) {
            const rankValue = rank + 1; // Convert 0-based index to 1-based rank
            if (spec.thresholds.includes(rankValue)) {
              const key = makeSeasonKey(spec.key, rankValue);
              for (const playerId of playerIds) {
                const player = players.find(p => p.pid === playerId);
                if (player) {
                  const teams = getSeasonTeams(player, season);
                  for (const teamId of teams) {
                    addToSeasonIndex(seasonIndex, season, teamId, key, playerId);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Process individual season and efficiency specs
    const individualSpecs = specs.filter(s => 
      s.category === 'individual-season' || s.category === 'efficiency'
    );
    
    for (const player of players) {
      if (!player.stats) continue;

      // Aggregate player's season stats across teams
      const seasonStats = player.stats.filter(s => 
        s.season === season && !s.playoffs && (s.gp || 0) > 0 && s.tid !== -1
      );
      
      if (seasonStats.length === 0) continue;

      // Aggregate stats across teams for this season
      const aggregatedStats = aggregateSeasonStats(seasonStats);
      const teams = new Set(seasonStats.map(s => s.tid));

      // Test each spec against aggregated stats
      for (const spec of individualSpecs) {
        const value = spec.valueExtractor(aggregatedStats, season, gameAttributes);
        if (value === null || value === undefined) continue;

        // Check qualifiers
        if (spec.qualifiers) {
          let qualifiesAll = true;
          for (const [field, threshold] of Object.entries(spec.qualifiers)) {
            const fieldValue = getFieldValue(aggregatedStats, field, season);
            if (fieldValue === null || fieldValue < threshold) {
              qualifiesAll = false;
              break;
            }
          }
          if (!qualifiesAll) continue;
        }

        // Check thresholds
        for (const threshold of spec.thresholds) {
          let meets = false;
          switch (spec.comparator) {
            case '>=': meets = value >= threshold; break;
            case '>': meets = value > threshold; break;
            case '<=': meets = value <= threshold; break;
            case '<': meets = value < threshold; break;
            case '=': meets = Math.abs(value - threshold) < 0.001; break;
          }

          if (meets) {
            const key = makeSeasonKey(spec.key, threshold);
            for (const teamId of teams) {
              addToSeasonIndex(seasonIndex, season, teamId, key, player.pid);
            }
          }
        }
      }
    }
  }

  // Process career specs
  const careerSpecs = specs.filter(s => s.category === 'career');
  for (const spec of careerSpecs) {
    for (const player of players) {
      const value = spec.valueExtractor(player);
      if (value === null || value === undefined) continue;

      for (const threshold of spec.thresholds) {
        let meets = false;
        switch (spec.comparator) {
          case '>=': meets = value >= threshold; break;
          case '>': meets = value > threshold; break;
          case '<=': meets = value <= threshold; break;
          case '<': meets = value < threshold; break;
          case '=': meets = Math.abs(value - threshold) < 0.001; break;
        }

        if (meets) {
          const key = makeSeasonKey(spec.key, threshold);
          // Add to all seasons and teams the player appeared for
          if (player.stats) {
            const playerSeasonTeams = new Map<number, Set<number>>();
            for (const stat of player.stats) {
              if (!stat.playoffs && (stat.gp || 0) > 0 && stat.tid !== -1) {
                if (!playerSeasonTeams.has(stat.season)) {
                  playerSeasonTeams.set(stat.season, new Set());
                }
                playerSeasonTeams.get(stat.season)!.add(stat.tid);
              }
            }

            for (const [season, teams] of playerSeasonTeams.entries()) {
              for (const teamId of teams) {
                addToSeasonIndex(seasonIndex, season, teamId, key, player.pid);
              }
            }
          }
        }
      }
    }
  }

  return seasonIndex;
}

// Helper functions
function addToSeasonIndex(
  seasonIndex: SeasonIndex,
  season: number,
  teamId: number,
  key: string,
  playerId: number
) {
  if (!seasonIndex[season]) seasonIndex[season] = {};
  if (!seasonIndex[season][teamId]) seasonIndex[season][teamId] = {};
  if (!seasonIndex[season][teamId][key]) seasonIndex[season][teamId][key] = new Set();
  seasonIndex[season][teamId][key].add(playerId);
}

function aggregateSeasonStats(seasonStats: any[]): any {
  const aggregated: any = { gp: 0 };
  
  // Sum all numeric fields
  for (const stat of seasonStats) {
    for (const [key, value] of Object.entries(stat)) {
      if (typeof value === 'number' && key !== 'season' && key !== 'tid') {
        aggregated[key] = (aggregated[key] || 0) + value;
      }
    }
  }
  
  return aggregated;
}

function getFieldValue(stats: any, field: string, season: number): number | null {
  switch (field) {
    case 'gp': return stats.gp || 0;
    case 'ppg': return stats.gp > 0 ? (stats.pts || 0) / stats.gp : null;
    case 'attempts': return stats.fga || stats.tpa || stats.fta || null;
    case 'fga': return stats.fga || null;
    case 'tpa': return stats.tpa || null;
    case 'fta': return stats.fta || null;
    case 'pa': return (stats as any).pa || null;
    case 'ip': return (stats as any).ip || null;
    case 'min': return stats.min || null;
    case 'fo': return ((stats as any).fow || 0) + ((stats as any).fol || 0);
    default: return stats[field] || null;
  }
}

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

function calculateSeasonLeaders(
  players: Player[],
  season: number,
  gameAttributes?: any
): Record<string, number[]> {
  const leaders: Record<string, number[]> = {
    PointsLeader: [],
    ReboundsLeader: [],
    AssistsLeader: [],
    StealsLeader: [],
    BlocksLeader: []
  };

  // Use existing implementation from current system
  // This would need to be extracted from the current buildSeasonIndex function
  return leaders;
}

function getLeaderDataForSpec(spec: ThresholdSpec, seasonLeaders: Record<string, number[]>): number[][] | null {
  // Map spec key to leader data
  switch (spec.key) {
    case 'StatLeaderPoints':
      return [seasonLeaders.PointsLeader || []];
    case 'StatLeaderRebounds':
      return [seasonLeaders.ReboundsLeader || []];
    case 'StatLeaderAssists':
      return [seasonLeaders.AssistsLeader || []];
    case 'StatLeaderSteals':
      return [seasonLeaders.StealsLeader || []];
    case 'StatLeaderBlocks':
      return [seasonLeaders.BlocksLeader || []];
    default:
      return null;
  }
}

// Export legacy items for backward compatibility
export const SEASON_ACHIEVEMENTS: SeasonAchievement[] = [
  // This would be populated with legacy achievement definitions
  // for backward compatibility with existing code
];

/**
 * Get season-eligible players for a specific achievement (legacy compatibility)
 */
export function getSeasonEligiblePlayers(
  seasonIndex: SeasonIndex,
  teamId: number,
  achievementId: SeasonAchievementId | string
): Set<number> {
  const key = typeof achievementId === 'string' ? achievementId : getLegacyKey(achievementId);
  const eligiblePlayers = new Set<number>();

  for (const [season, seasonData] of Object.entries(seasonIndex)) {
    if (seasonData[teamId] && seasonData[teamId][key]) {
      for (const pid of seasonData[teamId][key]) {
        eligiblePlayers.add(pid);
      }
    }
  }

  return eligiblePlayers;
}

// Award type mapping preserved for backward compatibility
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
  // More mappings would continue here...
};

/**
 * Map award type to achievement ID, handling different sports and naming conventions
 */
function mapAwardToAchievement(awardType: string, sport?: 'basketball' | 'football' | 'hockey' | 'baseball'): SeasonAchievementId | null {
  if (!awardType) return null;
  
  // Use existing implementation for award mapping
  const normalized = awardType.toLowerCase().trim();
  return AWARD_TYPE_MAPPING[normalized] || null;
}