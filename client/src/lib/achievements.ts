import type { Player } from "@/types/bbgm";
import { SEASON_ACHIEVEMENTS, type SeasonAchievement, type SeasonIndex, type SeasonAchievementId, getSeasonEligiblePlayers } from './season-achievements';
import { SeededRandom } from './seeded';

export interface Achievement {
  id: string;
  label: string;
  test: (player: Player) => boolean;
  minPlayers: number;
  isSeasonSpecific?: boolean;
}

// Extended achievement interface for season-specific achievements
export interface SeasonSpecificAchievement extends Achievement {
  isSeasonSpecific: true;
  seasonIndex?: SeasonIndex;
}

// Common achievements available for both sports
export const COMMON_ACHIEVEMENTS: Achievement[] = [
  // Draft achievements
  {
    id: 'isPick1Overall',
    label: '#1 Overall Pick',
    test: (p: Player) => p.achievements?.isPick1Overall || false,
    minPlayers: 5
  },
  {
    id: 'isFirstRoundPick',
    label: 'First Round Pick',
    test: (p: Player) => p.achievements?.isFirstRoundPick || false,
    minPlayers: 5
  },
  {
    id: 'isUndrafted',
    label: 'Went Undrafted',
    test: (p: Player) => p.achievements?.isUndrafted || false,
    minPlayers: 5
  },
  {
    id: 'draftedTeen',
    label: 'Drafted as Teenager',
    test: (p: Player) => p.achievements?.draftedTeen || false,
    minPlayers: 5
  },
  // Special
  {
    id: 'isHallOfFamer',
    label: 'Hall of Fame',
    test: (p: Player) => p.achievements?.isHallOfFamer || false,
    minPlayers: 5
  },
  {
    id: 'played15PlusSeasons',
    label: 'Played 15+ Seasons',
    test: (p: Player) => p.achievements?.played15PlusSeasons || false,
    minPlayers: 5
  },
  {
    id: 'played10PlusSeasons',
    label: 'Played 10+ Seasons',
    test: (p: Player) => p.achievements?.played10PlusSeasons || false,
    minPlayers: 5
  },
  {
    id: 'bornOutsideUS50DC',
    label: 'Born outside 50 states + DC',
    test: (p: Player) => p.achievements?.bornOutsideUS50DC || false,
    minPlayers: 5
  },
];

// Basketball-specific achievements  
export const BASKETBALL_ACHIEVEMENTS: Achievement[] = [
  // Draft achievements
  {
    id: 'isSecondRoundPick',
    label: 'Second Round Pick',
    test: (p: Player) => p.achievements?.isSecondRoundPick || false,
    minPlayers: 5
  },
  // Career achievements
  {
    id: 'career20kPoints',
    label: '20,000+ Career Points',
    test: (p: Player) => p.achievements?.career20kPoints || false,
    minPlayers: 5
  },
  {
    id: 'career10kRebounds',
    label: '10,000+ Career Rebounds',
    test: (p: Player) => p.achievements?.career10kRebounds || false,
    minPlayers: 5
  },
  {
    id: 'career5kAssists',
    label: '5,000+ Career Assists',
    test: (p: Player) => p.achievements?.career5kAssists || false,
    minPlayers: 5
  },
  {
    id: 'career2kSteals',
    label: '2,000+ Career Steals',
    test: (p: Player) => p.achievements?.career2kSteals || false,
    minPlayers: 5
  },
  {
    id: 'career1500Blocks',
    label: '1,500+ Career Blocks',
    test: (p: Player) => p.achievements?.career1500Blocks || false,
    minPlayers: 5
  },
  {
    id: 'career2kThrees',
    label: '2,000+ Made Threes',
    test: (p: Player) => p.achievements?.career2kThrees || false,
    minPlayers: 5
  },
  // Contest achievements (not season-aligned)
  {
    id: 'threePointContestWinner',
    label: '3-Point Contest Champion',
    test: (p: Player) => p.achievements?.threePointContestWinner || false,
    minPlayers: 3
  },
  {
    id: 'dunkContestWinner',
    label: 'Dunk Contest Champion',
    test: (p: Player) => p.achievements?.dunkContestWinner || false,
    minPlayers: 3
  },
  // Age achievements (not season-aligned)
  {
    id: 'playedAtAge40Plus',
    label: 'Played at Age 40+',
    test: (p: Player) => p.achievements?.playedAtAge40Plus || false,
    minPlayers: 5
  },
  // Special career arc achievements (not season-aligned)
  {
    id: 'royLaterMVP',
    label: 'ROY Who Later Won MVP',
    test: (p: Player) => p.achievements?.royLaterMVP || false,
    minPlayers: 3
  },
  // Franchise achievements (not season-aligned)
  {
    id: 'played5PlusFranchises',
    label: 'Played for 5+ Franchises',
    test: (p: Player) => p.achievements?.played5PlusFranchises || false,
    minPlayers: 5
  },
  // Note: Single-season awards removed from career achievements
  // Now implemented as season-specific achievements with proper harmonization
];

// Convert season achievements to regular Achievement format for grid generation
function createSeasonAchievementTests(seasonIndex?: SeasonIndex, sport: 'basketball' | 'football' | 'hockey' | 'baseball' = 'basketball'): Achievement[] {
  if (!seasonIndex) return [];
  
  // Filter achievements by sport
  const sportFilteredAchievements = SEASON_ACHIEVEMENTS.filter(seasonAch => {
    if (sport === 'basketball') {
      // Basketball: exclude FB*, HK*, BB* prefixed achievements
      return !seasonAch.id.startsWith('FB') && !seasonAch.id.startsWith('HK') && !seasonAch.id.startsWith('BB');
    } else if (sport === 'football') {
      // Football: only FB* prefixed achievements, exclude basketball-specific ones
      return seasonAch.id.startsWith('FB');
    } else if (sport === 'hockey') {
      // Hockey: only HK* prefixed achievements, exclude basketball-specific ones
      return seasonAch.id.startsWith('HK');
    } else if (sport === 'baseball') {
      // Baseball: only BB* prefixed achievements, exclude basketball-specific ones
      return seasonAch.id.startsWith('BB');
    }
    return false;
  });
  
  return sportFilteredAchievements.map(seasonAch => ({
    id: seasonAch.id,
    label: seasonAch.label,
    isSeasonSpecific: true,
    minPlayers: seasonAch.minPlayers,
    test: (player: Player) => {
      // For statistical leader achievements (PointsLeader, BlocksLeader, etc.), check seasonIndex
      const statisticalLeaders = ['PointsLeader', 'ReboundsLeader', 'AssistsLeader', 'StealsLeader', 'BlocksLeader', 'Season30PPG', 'Season2000Points', 'Season200_3PM', 'Season12RPG', 'Season10APG', 'Season800Rebounds', 'Season700Assists', 'Season2SPG', 'Season2_5BPG', 'Season150Steals', 'Season150Blocks', 'Season200Stocks', 'Season50_40_90', 'Season60TS20PPG', 'Season60eFG500FGA', 'Season90FT250FTA', 'Season40_3PT200_3PA', 'Season70Games', 'Season36MPG', 'Season25_10', 'Season25_5_5', 'Season20_10_5', 'Season1_1_1', 'FBSeason4kPassYds', 'FBSeason1200RushYds', 'FBSeason100Receptions', 'FBSeason15Sacks', 'FBSeason140Tackles', 'FBSeason5Interceptions', 'FBSeason30PassTD', 'FBSeason1300RecYds', 'FBSeason10RecTD', 'FBSeason12RushTD', 'FBSeason1600Scrimmage', 'FBSeason2000AllPurpose', 'FBSeason15TFL', 'HKSeason40Goals', 'HKSeason60Assists', 'HKSeason90Points', 'HKSeason25Plus', 'HKSeason250Shots', 'HKSeason150Hits', 'HKSeason100Blocks', 'HKSeason60Takeaways', 'HKSeason20PowerPlay', 'HKSeason3SHGoals', 'HKSeason7GWGoals', 'HKSeason55FaceoffPct', 'HKSeason22TOI', 'HKSeason70PIM', 'HKSeason920SavePct', 'HKSeason260GAA', 'HKSeason6Shutouts', 'HKSeason2000Saves', 'HKSeason60Starts'];
      if (statisticalLeaders.includes(seasonAch.id)) {
        // For statistical leaders, check if player appears in any season/team for this achievement
        if (!seasonIndex) return false;
        
        for (const seasonStr of Object.keys(seasonIndex)) {
          const seasonData = seasonIndex[parseInt(seasonStr)];
          for (const teamData of Object.values(seasonData)) {
            if (teamData[seasonAch.id as keyof typeof teamData]?.has(player.pid)) {
              return true;
            }
          }
        }
        return false;
      }
      
      // For traditional award-based achievements, check player awards
      return player.awards?.some(award => {
        const normalizedType = award.type.toLowerCase().trim();
        return seasonAch.id === 'AllStar' && normalizedType.includes('all-star') ||
               seasonAch.id === 'MVP' && normalizedType.includes('most valuable player') ||
               seasonAch.id === 'DPOY' && normalizedType.includes('defensive player') ||
               seasonAch.id === 'ROY' && normalizedType.includes('rookie of the year') ||
               seasonAch.id === 'SMOY' && normalizedType.includes('sixth man') ||
               seasonAch.id === 'MIP' && normalizedType.includes('most improved') ||
               seasonAch.id === 'FinalsMVP' && normalizedType.includes('finals mvp') ||
               seasonAch.id === 'AllLeagueAny' && (normalizedType.includes('all-league') || normalizedType.includes('allleague')) ||
               seasonAch.id === 'AllDefAny' && normalizedType.includes('all-defensive') ||
               seasonAch.id === 'AllRookieAny' && normalizedType.includes('all-rookie');
      }) || false;
    }
  }));
}

// Baseball-specific achievements  
export const BASEBALL_ACHIEVEMENTS: Achievement[] = [
  // Batting achievements
  {
    id: 'career3000Hits',
    label: '3,000+ Career Hits',
    test: (p: Player) => p.achievements?.career3000Hits || false,
    minPlayers: 5
  },
  {
    id: 'career500HRs',
    label: '500+ Career Home Runs',
    test: (p: Player) => p.achievements?.career500HRs || false,
    minPlayers: 5
  },
  {
    id: 'career1500RBIs',
    label: '1,500+ Career RBIs',
    test: (p: Player) => p.achievements?.career1500RBIs || false,
    minPlayers: 5
  },
  {
    id: 'career400SBs',
    label: '400+ Career Stolen Bases',
    test: (p: Player) => p.achievements?.career400SBs || false,
    minPlayers: 5
  },
  {
    id: 'career1800Runs',
    label: '1,800+ Career Runs',
    test: (p: Player) => p.achievements?.career1800Runs || false,
    minPlayers: 5
  },
  // Pitching achievements
  {
    id: 'career300Wins',
    label: '300+ Career Wins (P)',
    test: (p: Player) => p.achievements?.career300Wins || false,
    minPlayers: 5
  },
  {
    id: 'career3000Ks',
    label: '3,000+ Career Strikeouts',
    test: (p: Player) => p.achievements?.career3000Ks || false,
    minPlayers: 5
  },
  {
    id: 'career300Saves',
    label: '300+ Career Saves',
    test: (p: Player) => p.achievements?.career300Saves || false,
    minPlayers: 5
  },
  // Note: Single-season awards removed from game entirely
  // wonMVP, wonFinalsMVP, wonPitcherOfYear, wonReliefPitcherOfYear, wonROY, madeAllStar, wonChampionship
];

// Hockey-specific achievements
export const HOCKEY_ACHIEVEMENTS: Achievement[] = [
  // Career achievements
  {
    id: 'career500Goals',
    label: '500+ Career Goals',
    test: (p: Player) => p.achievements?.career500Goals || false,
    minPlayers: 1  // Lowered for hockey - very rare achievement
  },
  {
    id: 'career1000Points',
    label: '1,000+ Career Points',
    test: (p: Player) => p.achievements?.career1000Points || false,
    minPlayers: 1  // Lowered for hockey - very rare achievement
  },
  {
    id: 'career500Assists',
    label: '500+ Career Assists',
    test: (p: Player) => p.achievements?.career500Assists || false,
    minPlayers: 3  // Lowered for hockey - still challenging but more achievable
  },
  {
    id: 'career200Wins',
    label: '200+ Career Wins (G)',
    test: (p: Player) => p.achievements?.career200Wins || false,
    minPlayers: 1  // Lowered for hockey - very rare goalie achievement
  },
  {
    id: 'career50Shutouts',
    label: '50+ Career Shutouts (G)',
    test: (p: Player) => p.achievements?.career50Shutouts || false,
    minPlayers: 1  // Lowered for hockey - very rare goalie achievement
  },
  // Note: Single-season awards removed from game entirely
  // wonMVP, wonDefensiveForward, wonGoalieOfYear, wonROY, wonPlayoffsMVP, madeAllStar, wonChampionship
];

// Football-specific achievements
export const FOOTBALL_ACHIEVEMENTS: Achievement[] = [
  // Passing achievements
  {
    id: 'career300PassTDs',
    label: '150+ Career Pass TDs',
    test: (p: Player) => p.achievements?.career300PassTDs || false,
    minPlayers: 5
  },
  {
    id: 'FBCareer50kPassYds',
    label: '50,000+ Career Passing Yards',
    test: (p: Player) => {
      if (!p.stats) return false;
      // FBGM uses 'pssYds' field for passing yards
      const totalPassingYards = p.stats
        .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
        .reduce((sum, stat) => sum + ((stat as any).pssYds || 0), 0);
      return totalPassingYards >= 50000;
    },
    minPlayers: 3
  },
  // Rushing achievements
  {
    id: 'career12kRushYds',
    label: '8,000+ Career Rush Yards',
    test: (p: Player) => p.achievements?.career12kRushYds || false,
    minPlayers: 5
  },
  {
    id: 'career100RushTDs',
    label: '40+ Career Rush TDs',
    test: (p: Player) => p.achievements?.career100RushTDs || false,
    minPlayers: 5
  },
  // Receiving achievements
  {
    id: 'career12kRecYds',
    label: '6,000+ Career Rec Yards',
    test: (p: Player) => p.achievements?.career12kRecYds || false,
    minPlayers: 5
  },
  {
    id: 'career100RecTDs',
    label: '40+ Career Rec TDs',
    test: (p: Player) => p.achievements?.career100RecTDs || false,
    minPlayers: 5
  },
  // Defensive achievements
  {
    id: 'career100Sacks',
    label: '60+ Career Sacks',
    test: (p: Player) => p.achievements?.career100Sacks || false,
    minPlayers: 5
  },
  {
    id: 'career20Ints',
    label: '20+ Career Interceptions',
    test: (p: Player) => p.achievements?.career20Ints || false,
    minPlayers: 5
  },
  // Note: Single-season awards removed from game entirely
  // wonMVP, wonDPOY, wonROY
];

// Build dynamic decade achievements based on league year range
function buildDecadeAchievements(
  leagueYears: { minSeason: number; maxSeason: number }, 
  sport: 'basketball' | 'football' | 'hockey' | 'baseball'
): Achievement[] {
  // Handle edge cases - only exclude invalid data where minSeason > maxSeason
  if (!leagueYears || leagueYears.minSeason > leagueYears.maxSeason) {
    return [];
  }

  const achievements: Achievement[] = [];
  
  // Calculate decade range
  const minDecade = Math.floor(leagueYears.minSeason / 10) * 10;
  const maxDecade = Math.floor(leagueYears.maxSeason / 10) * 10;
  
  // Generate achievements for each decade in range
  for (let decade = minDecade; decade <= maxDecade; decade += 10) {
    const decadeStr = decade.toString();
    
    // "Played in the {YYYY}s" achievement
    achievements.push({
      id: `playedIn${decadeStr}s`,
      label: `Played in the ${decadeStr}s`,
      test: (player: Player) => player.decadesPlayed?.has(decade) || false,
      minPlayers: 1  // Lowered from 5 to 1 to ensure future decades appear
    });
    
    // "Debuted in the {YYYY}s" achievement  
    achievements.push({
      id: `debutedIn${decadeStr}s`,
      label: `Debuted in the ${decadeStr}s`,
      test: (player: Player) => player.debutDecade === decade,
      minPlayers: 1  // Lowered from 5 to 1 to ensure future decades appear
    });
  }
  
  return achievements;
}

/**
 * Configuration for random numerical achievements
 */
interface StatConfig {
  thresholds: number[];
  label: (n: number) => string;
  testField: string;
  testType?: 'total' | 'average';
}

const NUMERICAL_ACHIEVEMENT_CONFIGS: Record<string, { career?: Record<string, StatConfig>; season?: Record<string, StatConfig> }> = {
  basketball: {
    career: {
      points: { 
        thresholds: [3000, 5000, 7500, 10000, 12500, 15000, 17500, 20000, 22500, 25000, 30000, 35000, 40000, 45000, 50000],
        label: (n: number) => `${n.toLocaleString()}+ Career Points`,
        testField: 'pts'
      },
      rebounds: { 
        thresholds: [500, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 7500, 10000, 12000, 15000],
        label: (n: number) => `${n.toLocaleString()}+ Career Rebounds`,
        testField: 'trb'
      },
      assists: { 
        thresholds: [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7500, 10000],
        label: (n: number) => `${n.toLocaleString()}+ Career Assists`,
        testField: 'ast'
      },
      steals: { 
        thresholds: [200, 400, 600, 800, 1000, 1250, 1500, 2000, 2500],
        label: (n: number) => `${n.toLocaleString()}+ Career Steals`,
        testField: 'stl'
      },
      blocks: { 
        thresholds: [200, 400, 600, 800, 1000, 1250, 1500, 2000, 2500],
        label: (n: number) => `${n.toLocaleString()}+ Career Blocks`,
        testField: 'blk'
      },
      threes: { 
        thresholds: [100, 200, 300, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000],
        label: (n: number) => `${n.toLocaleString()}+ Career 3PM`,
        testField: 'tpm'
      }
    },
    season: {
      ppg: { 
        thresholds: [10, 12, 15, 18, 20, 22, 24, 26, 28, 30, 32, 35],
        label: (n: number) => `${n}+ PPG in a Season`,
        testType: 'average' as const,
        testField: 'pts'
      },
      rpg: { 
        thresholds: [8, 10, 11, 12, 13, 14, 15, 16, 17, 18],
        label: (n: number) => `${n}+ RPG in a Season`,
        testType: 'average' as const,
        testField: 'trb'
      },
      apg: { 
        thresholds: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        label: (n: number) => `${n}+ APG in a Season`,
        testType: 'average' as const,
        testField: 'ast'
      },
      points: { 
        thresholds: [1200, 1500, 1800, 2000, 2200, 2400, 2600, 2800, 3000],
        label: (n: number) => `${n.toLocaleString()}+ Points in a Season`,
        testType: 'total' as const,
        testField: 'pts'
      },
      threes: { 
        thresholds: [100, 150, 200, 250, 300, 350, 400, 450],
        label: (n: number) => `${n}+ 3PM in a Season`,
        testType: 'total' as const,
        testField: 'tpm'
      }
    }
  },
  football: {
    career: {
      passYds: {
        thresholds: [10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000],
        label: (n: number) => `${n.toLocaleString()}+ Career Passing Yards`,
        testField: 'pssYds'
      },
      passTDs: {
        thresholds: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
        label: (n: number) => `${n.toLocaleString()}+ Career Passing TDs`,
        testField: 'pssTD'
      },
      rushYds: {
        thresholds: [2000, 4000, 6000, 8000, 10000, 12000, 15000, 18000, 20000],
        label: (n: number) => `${n.toLocaleString()}+ Career Rushing Yards`,
        testField: 'rusYds'
      },
      rushTDs: {
        thresholds: [20, 40, 60, 80, 100, 120, 150, 180, 200],
        label: (n: number) => `${n.toLocaleString()}+ Career Rushing TDs`,
        testField: 'rusTD'
      },
      recYds: {
        thresholds: [2000, 4000, 6000, 8000, 10000, 12000, 15000, 18000, 20000],
        label: (n: number) => `${n.toLocaleString()}+ Career Receiving Yards`,
        testField: 'recYds'
      },
      recTDs: {
        thresholds: [20, 40, 60, 80, 100, 120, 150, 180, 200],
        label: (n: number) => `${n.toLocaleString()}+ Career Receiving TDs`,
        testField: 'recTD'
      },
      sacks: {
        thresholds: [20, 40, 60, 80, 100, 120, 150, 180, 200],
        label: (n: number) => `${n.toLocaleString()}+ Career Sacks`,
        testField: 'sks' // Using 'sks' from FBGM stats
      },
      interceptions: {
        thresholds: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
        label: (n: number) => `${n.toLocaleString()}+ Career Interceptions`,
        testField: 'defInt'
      }
    },
    season: {
      passYds: {
        thresholds: [2000, 3000, 4000, 5000, 6000],
        label: (n: number) => `${n.toLocaleString()}+ Passing Yards in a Season`,
        testType: 'total' as const,
        testField: 'pssYds'
      },
      passTDs: {
        thresholds: [15, 20, 25, 30, 35, 40, 45, 50],
        label: (n: number) => `${n.toLocaleString()}+ Passing TDs in a Season`,
        testType: 'total' as const,
        testField: 'pssTD'
      },
      rushYds: {
        thresholds: [800, 1000, 1200, 1500, 1800, 2000],
        label: (n: number) => `${n.toLocaleString()}+ Rushing Yards in a Season`,
        testType: 'total' as const,
        testField: 'rusYds'
      },
      rushTDs: {
        thresholds: [8, 10, 12, 15, 18, 20],
        label: (n: number) => `${n.toLocaleString()}+ Rushing TDs in a Season`,
        testType: 'total' as const,
        testField: 'rusTD'
      },
      recYds: {
        thresholds: [800, 1000, 1200, 1300, 1500, 1800, 2000],
        label: (n: number) => `${n.toLocaleString()}+ Receiving Yards in a Season`,
        testType: 'total' as const,
        testField: 'recYds'
      },
      rec: {
        thresholds: [60, 70, 80, 90, 100, 110, 120],
        label: (n: number) => `${n.toLocaleString()}+ Receptions in a Season`,
        testType: 'total' as const,
        testField: 'rec'
      },
      recTDs: {
        thresholds: [5, 8, 10, 12, 15, 18, 20],
        label: (n: number) => `${n.toLocaleString()}+ Receiving TDs in a Season`,
        testType: 'total' as const,
        testField: 'recTD'
      },
      sacks: {
        thresholds: [5, 8, 10, 12, 15, 18, 20],
        label: (n: number) => `${n.toLocaleString()}+ Sacks in a Season`,
        testType: 'total' as const,
        testField: 'sks'
      },
      tackles: {
        thresholds: [70, 80, 90, 100, 120, 140, 150, 160],
        label: (n: number) => `${n.toLocaleString()}+ Tackles in a Season`,
        testType: 'total' as const,
        testField: 'defTck' // Combined solo and ast
      },
      interceptions: {
        thresholds: [3, 4, 5, 6, 7, 8, 9, 10],
        label: (n: number) => `${n.toLocaleString()}+ Interceptions in a Season`,
        testType: 'total' as const,
        testField: 'defInt'
      },
      scrimmageYds: {
        thresholds: [1000, 1200, 1400, 1600, 1800, 2000, 2200],
        label: (n: number) => `${n.toLocaleString()}+ Scrimmage Yards in a Season`,
        testType: 'total' as const,
        testField: 'scrimmageYds' // Custom computed field
      },
      allPurposeYds: {
        thresholds: [1200, 1500, 1800, 2000, 2200, 2500],
        label: (n: number) => `${n.toLocaleString()}+ All-Purpose Yards in a Season`,
        testType: 'total' as const,
        testField: 'allPurposeYds' // Custom computed field
      },
      tfl: {
        thresholds: [5, 8, 10, 12, 15, 18, 20],
        label: (n: number) => `${n.toLocaleString()}+ Tackles for Loss in a Season`,
        testType: 'total' as const,
        testField: 'defTckLoss'
      }
    }
  },
  hockey: {
    career: {
      goals: {
        thresholds: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
        label: (n: number) => `${n.toLocaleString()}+ Career Goals`,
        testField: 'goals' // Custom computed field in calculateHockeyAchievements
      },
      assists: {
        thresholds: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1500],
        label: (n: number) => `${n.toLocaleString()}+ Career Assists`,
        testField: 'assists' // Custom computed field
      },
      points: {
        thresholds: [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500],
        label: (n: number) => `${n.toLocaleString()}+ Career Points`,
        testField: 'points' // Custom computed field
      },
      wins: { // Goalie
        thresholds: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
        label: (n: number) => `${n.toLocaleString()}+ Career Wins (G)`,
        testField: 'wins' // Custom computed field
      },
      shutouts: { // Goalie
        thresholds: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        label: (n: number) => `${n.toLocaleString()}+ Career Shutouts (G)`,
        testField: 'shutouts' // Custom computed field
      }
    },
    season: {
      goals: {
        thresholds: [20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90],
        label: (n: number) => `${n.toLocaleString()}+ Goals in a Season`,
        testType: 'total' as const,
        testField: 'goals'
      },
      assists: {
        thresholds: [30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
        label: (n: number) => `${n.toLocaleString()}+ Assists in a Season`,
        testType: 'total' as const,
        testField: 'assists'
      },
      points: {
        thresholds: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150],
        label: (n: number) => `${n.toLocaleString()}+ Points in a Season`,
        testType: 'total' as const,
        testField: 'points'
      },
      plusMinus: {
        thresholds: [10, 15, 20, 25, 30, 35, 40, 45, 50],
        label: (n: number) => `+${n.toLocaleString()} Plus/Minus in a Season`,
        testType: 'total' as const,
        testField: 'pm'
      },
      shots: {
        thresholds: [150, 200, 250, 300, 350, 400],
        label: (n: number) => `${n.toLocaleString()}+ Shots in a Season`,
        testType: 'total' as const,
        testField: 's'
      },
      hits: {
        thresholds: [80, 100, 120, 150, 180, 200, 250, 300],
        label: (n: number) => `${n.toLocaleString()}+ Hits in a Season`,
        testType: 'total' as const,
        testField: 'hit'
      },
      blocks: {
        thresholds: [50, 70, 80, 100, 120, 150, 180, 200],
        label: (n: number) => `${n.toLocaleString()}+ Blocks in a Season`,
        testType: 'total' as const,
        testField: 'blk'
      },
      takeaways: {
        thresholds: [30, 40, 50, 60, 70, 80, 90, 100],
        label: (n: number) => `${n.toLocaleString()}+ Takeaways in a Season`,
        testType: 'total' as const,
        testField: 'tk'
      },
      powerPlayPoints: {
        thresholds: [10, 15, 20, 25, 30, 35, 40],
        label: (n: number) => `${n.toLocaleString()}+ Power-Play Points in a Season`,
        testType: 'total' as const,
        testField: 'powerPlayPoints' // Custom computed field
      },
      shortHandedGoals: {
        thresholds: [1, 2, 3, 4, 5, 6, 7, 8],
        label: (n: number) => `${n.toLocaleString()}+ Short-Handed Goals in a Season`,
        testType: 'total' as const,
        testField: 'shG'
      },
      gameWinningGoals: {
        thresholds: [3, 4, 5, 6, 7, 8, 9, 10],
        label: (n: number) => `${n.toLocaleString()}+ Game-Winning Goals in a Season`,
        testType: 'total' as const,
        testField: 'gwG'
      },
      faceoffWinPct: {
        thresholds: [0.50, 0.52, 0.55, 0.58, 0.60],
        label: (n: number) => `${(n * 100).toFixed(0)}%+ Faceoff Win Rate in a Season`,
        testType: 'average' as const,
        testField: 'faceoffPct' // Custom computed field
      },
      toiPerGame: {
        thresholds: [18, 20, 22, 24, 26, 28, 30],
        label: (n: number) => `${n.toFixed(1)}+ TOI per Game in a Season`,
        testType: 'average' as const,
        testField: 'toiPerGame' // Custom computed field
      },
      pim: {
        thresholds: [40, 50, 60, 70, 80, 90, 100, 120, 150],
        label: (n: number) => `${n.toLocaleString()}+ PIM in a Season`,
        testType: 'total' as const,
        testField: 'pim'
      },
      savePct: { // Goalie
        thresholds: [0.900, 0.910, 0.920, 0.925, 0.930, 0.935, 0.940],
        label: (n: number) => `${(n * 1000).toFixed(0)}+ Save Percentage in a Season`,
        testType: 'average' as const,
        testField: 'savePct' // Custom computed field
      },
      gaa: { // Goalie
        thresholds: [3.00, 2.80, 2.60, 2.40, 2.20, 2.00, 1.80],
        label: (n: number) => `${n.toFixed(2)} or less GAA in a Season`,
        testType: 'average' as const,
        testField: 'gaaRate' // Custom computed field
      },
      shutouts: { // Goalie
        thresholds: [3, 4, 5, 6, 7, 8, 9, 10, 12, 15],
        label: (n: number) => `${n.toLocaleString()}+ Shutouts in a Season`,
        testType: 'total' as const,
        testField: 'so'
      },
      saves: { // Goalie
        thresholds: [1000, 1200, 1500, 1800, 2000, 2200, 2500, 2800, 3000],
        label: (n: number) => `${n.toLocaleString()}+ Saves in a Season`,
        testType: 'total' as const,
        testField: 'sv'
      },
      starts: { // Goalie
        thresholds: [30, 40, 50, 60, 70, 80],
        label: (n: number) => `${n.toLocaleString()}+ Starts in a Season`,
        testType: 'total' as const,
        testField: 'gs'
      }
    }
  },
  baseball: {
    career: {
      hits: {
        thresholds: [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000],
        label: (n: number) => `${n.toLocaleString()}+ Career Hits`,
        testField: 'h'
      },
      homeRuns: {
        thresholds: [100, 200, 300, 400, 500, 600, 700, 800],
        label: (n: number) => `${n.toLocaleString()}+ Career Home Runs`,
        testField: 'hr'
      },
      rbis: {
        thresholds: [300, 500, 800, 1000, 1200, 1500, 1800, 2000, 2200],
        label: (n: number) => `${n.toLocaleString()}+ Career RBIs`,
        testField: 'rbi'
      },
      stolenBases: {
        thresholds: [50, 100, 150, 200, 300, 400, 500, 600, 700],
        label: (n: number) => `${n.toLocaleString()}+ Career Stolen Bases`,
        testField: 'sb'
      },
      runs: {
        thresholds: [300, 500, 800, 1000, 1200, 1500, 1800, 2000, 2200],
        label: (n: number) => `${n.toLocaleString()}+ Career Runs`,
        testField: 'r'
      },
      wins: { // Pitching
        thresholds: [50, 100, 150, 200, 250, 300, 350, 400],
        label: (n: number) => `${n.toLocaleString()}+ Career Wins (P)`,
        testField: 'w'
      },
      strikeouts: { // Pitching
        thresholds: [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
        label: (n: number) => `${n.toLocaleString()}+ Career Strikeouts`,
        testField: 'soPit'
      },
      saves: { // Pitching
        thresholds: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
        label: (n: number) => `${n.toLocaleString()}+ Career Saves`,
        testField: 'sv'
      }
    },
    season: {
      // Baseball GM doesn't have many season stats that are easily numerical and editable
      // Focusing on career for now.
    }
  }
};

/**
 * Generate random numerical achievements for variety in grid generation
 */
function buildRandomNumericalAchievements(
  sport: 'basketball' | 'football' | 'hockey' | 'baseball',
  seed?: string,
  count: number = 8,
  operator: '>=' | '<=' = '>='
): Achievement[] {
  const achievements: Achievement[] = [];
  const config = NUMERICAL_ACHIEVEMENT_CONFIGS[sport];
  
  if (!config) return achievements;
  
  // Create seeded random function for consistent results per grid
  const seedValue = seed ? hashString(seed) : Date.now();
  const rng = new SeededRandom(seedValue);
  
  // Collect all possible achievements
  const possibleAchievements: Array<{
    type: 'career' | 'season';
    stat: string;
    threshold: number;
    config: StatConfig;
  }> = [];
  
  // Career achievements
  if (config.career) {
    for (const [stat, statConfig] of Object.entries(config.career)) {
      for (const threshold of statConfig.thresholds) {
        possibleAchievements.push({ type: 'career', stat, threshold, config: statConfig });
      }
    }
  }
  
  // Season achievements  
  if (config.season) {
    for (const [stat, statConfig] of Object.entries(config.season)) {
      for (const threshold of statConfig.thresholds) {
        possibleAchievements.push({ type: 'season', stat, threshold, config: statConfig });
      }
    }
  }
  
  // Randomly select achievements
  const selectedAchievements = rng.sample(possibleAchievements, Math.min(count, possibleAchievements.length));
  
  for (const selected of selectedAchievements) {
    const { type, stat, threshold, config: statConfig } = selected;
    
    // CRITICAL FIX: Generate safe achievement IDs that don't conflict with static season achievements
    // Use "Random" prefix to clearly distinguish from static achievements
    const safeId = `Random${type}${threshold}${stat}`;
    
    const achievement: Achievement = {
      id: safeId,
      label: statConfig.label(threshold),
      minPlayers: 5,
      test: (player: Player) => {
        if (!player.stats || player.stats.length === 0) return false;
        
        if (type === 'career') {
          const value = getCareerStatTotal(player, statConfig.testField);
          return operator === '>=' ? value >= threshold : value <= threshold;
        } else {
          const value = getBestSeasonStat(player, statConfig.testField, statConfig.testType || 'total');
          return operator === '>=' ? value >= threshold : value <= threshold;
        }
      }
    };
    
    achievements.push(achievement);
  }
  
  return achievements;
}

/**
 * Hash string to number for seeding
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get career total for a stat field
 */
function getCareerStatTotal(player: Player, statField: string): number {
  if (!player.stats) return 0;
  
  let total = 0;
  for (const stat of player.stats) {
    if (stat.playoffs) continue; // Only regular season
    
    const value = (stat as any)[statField] || 0;
    total += value;
  }
  
  return total;
}

/**
 * Get best season stat (total or average)
 */
function getBestSeasonStat(player: Player, statField: string, testType: 'total' | 'average'): number {
  if (!player.stats) return 0;
  
  let best = 0;
  for (const stat of player.stats) {
    if (stat.playoffs) continue; // Only regular season
    
    const gp = stat.gp || 0;
    if (gp < 20) continue; // Minimum games for meaningful season
    
    const value = (stat as any)[statField] || 0;
    
    let checkValue = value;
    if (testType === 'average' && gp > 0) {
      checkValue = value / gp;
    }
    
    if (checkValue > best) {
      best = checkValue;
    }
  }
  
  return best;
}

// Get all achievements combining static and dynamic decade achievements
export function getAllAchievements(
  sport?: 'basketball' | 'football' | 'hockey' | 'baseball', 
  seasonIndex?: SeasonIndex,
  leagueYears?: { minSeason: number; maxSeason: number }
): Achievement[] {
  const common = COMMON_ACHIEVEMENTS;
  let achievements: Achievement[] = [];
  
  if (sport === 'football') {
    // Exclude draftedTeen for football
    const footballCommon = common.filter(a => a.id !== 'draftedTeen');
    achievements = [...footballCommon, ...FOOTBALL_ACHIEVEMENTS];
  } else if (sport === 'hockey') {
    achievements = [...common, ...HOCKEY_ACHIEVEMENTS];
  } else if (sport === 'baseball') {
    achievements = [...common, ...BASEBALL_ACHIEVEMENTS];
  } else {
    // Basketball - remove hardcoded decade achievements from static list
    const basketballWithoutDecades = BASKETBALL_ACHIEVEMENTS.filter(a => 
      !a.id.includes('playedIn') && !a.id.includes('debutedIn') && 
      !a.id.includes('playedInThreeDecades') && !a.id.includes('playedIn1990sAnd2000s')
    );
    achievements = [...common, ...basketballWithoutDecades];
  }
  
  // Add dynamic decade achievements if league years provided
  if (leagueYears && sport) {
    const decadeAchievements = buildDecadeAchievements(leagueYears, sport);
    achievements.push(...decadeAchievements);
    
    // Add multi-decade achievements for any sport if applicable
    const minDecade = Math.floor(leagueYears.minSeason / 10) * 10;
    const maxDecade = Math.floor(leagueYears.maxSeason / 10) * 10;
    const decadeCount = (maxDecade - minDecade) / 10 + 1;
    
    if (decadeCount >= 3) {
      achievements.push({
        id: 'playedInThreeDecades',
        label: 'Played in 3+ Decades',
        test: (player: Player) => (player.decadesPlayed?.size || 0) >= 3,
        minPlayers: 5
      });
    }
    
  }
  
  // Add season-specific achievements if season index is available
  if (seasonIndex) {
    const seasonAchievements = createSeasonAchievementTests(seasonIndex, sport);
    achievements.push(...seasonAchievements);
  }
  
  // Add random numerical achievements for variety (basketball only for now)
  if (sport === 'basketball' && leagueYears) {
    const gridSeed = `${leagueYears.minSeason}-${leagueYears.maxSeason}`;
    const numericalAchievements = buildRandomNumericalAchievements(sport, gridSeed, 6);
    achievements.push(...numericalAchievements);
  }
  
  return achievements;
}

// Get achievements based on sport (legacy function for backward compatibility)
// For new code, prefer getAllAchievements with leagueYears parameter
export function getAchievements(sport?: 'basketball' | 'football' | 'hockey' | 'baseball', seasonIndex?: SeasonIndex): Achievement[] {
  // Legacy function that includes all hardcoded achievements
  // For full dynamic functionality, use getAllAchievements with leagueYears
  const common = COMMON_ACHIEVEMENTS;
  
  if (sport === 'football') {
    // Exclude draftedTeen for football
    const footballCommon = common.filter(a => a.id !== 'draftedTeen');
    const footballAchievements = [...footballCommon, ...FOOTBALL_ACHIEVEMENTS];
    // Add season-specific achievements for football if season index is available
    if (seasonIndex) {
      const seasonAchievements = createSeasonAchievementTests(seasonIndex, 'football');
      footballAchievements.push(...seasonAchievements);
    }
    return footballAchievements;
  } else if (sport === 'hockey') {
    const hockeyAchievements = [...common, ...HOCKEY_ACHIEVEMENTS];
    // Add season-specific achievements for hockey if season index is available
    if (seasonIndex) {
      const seasonAchievements = createSeasonAchievementTests(seasonIndex, 'hockey');
      hockeyAchievements.push(...seasonAchievements);
    }
    return hockeyAchievements;
  } else if (sport === 'baseball') {
    const baseballAchievements = [...common, ...BASEBALL_ACHIEVEMENTS];
    // Add season-specific achievements for baseball if season index is available
    if (seasonIndex) {
      const seasonAchievements = createSeasonAchievementTests(seasonIndex, 'baseball');
      baseballAchievements.push(...seasonAchievements);
    }
    return baseballAchievements;
  } else {
    // Basketball: Add static achievements only (no dynamic decades in legacy function)
    const basketballAchievements = [...common, ...BASKETBALL_ACHIEVEMENTS];
    if (seasonIndex) {
      const seasonAchievements = createSeasonAchievementTests(seasonIndex, 'basketball');
      basketballAchievements.push(...seasonAchievements);
    }
    return basketballAchievements;
  }
}

// Season-aligned achievements that need same-season matching for Team × Achievement cells
export const SEASON_ALIGNED_ACHIEVEMENTS = new Set([
  'ledScoringAny', 'ledRebAny', 'ledAstAny'
]);

// Check if a player meets a specific achievement criteria
export function playerMeetsAchievement(
  player: Player, 
  achievementId: string, 
  seasonIndex?: SeasonIndex,
  operator: '>=' | '<=' = '>='
): boolean {
  // Debug logging removed for performance - was causing thousands of logs in hot paths

  // Check if it's a dynamic decade achievement first
  if (achievementId.includes('playedIn') && achievementId.endsWith('s')) {
    // Extract decade from achievement ID (e.g., "playedIn1990s" -> 1990)
    const decadeMatch = achievementId.match(/playedIn(\d{4})s/);
    if (decadeMatch) {
      const decade = parseInt(decadeMatch[1]);
      return player.decadesPlayed?.has(decade) || false;
    }
  }
  
  if (achievementId.includes('debutedIn') && achievementId.endsWith('s')) {
    // Extract decade from achievement ID (e.g., "debutedIn1990s" -> 1990)
    const decadeMatch = achievementId.match(/debutedIn(\d{4})s/);
    if (decadeMatch) {
      const decade = parseInt(decadeMatch[1]);
      return player.debutDecade === decade;
    }
  }
  
  
  // Handle special multi-decade achievements
  if (achievementId === 'playedInThreeDecades') {
    return (player.decadesPlayed?.size || 0) >= 3;
  }
  

  // First, check if it's ANY achievement that needs season index (statistical leaders AND season achievements)
  const statisticalLeaders = ['PointsLeader', 'ReboundsLeader', 'AssistsLeader', 'StealsLeader', 'BlocksLeader', 'Season30PPG', 'Season2000Points', 'Season200_3PM', 'Season12RPG', 'Season10APG', 'Season800Rebounds', 'Season700Assists', 'Season2SPG', 'Season2_5BPG', 'Season150Steals', 'Season150Blocks', 'Season200Stocks', 'Season50_40_90', 'Season60TS20PPG', 'Season60eFG500FGA', 'Season90FT250FTA', 'Season40_3PT200_3PA', 'Season70Games', 'Season36MPG', 'Season25_10', 'Season25_5_5', 'Season20_10_5', 'Season1_1_1', 'FBSeason4kPassYds', 'FBSeason1200RushYds', 'FBSeason100Receptions', 'FBSeason15Sacks', 'FBSeason140Tackles', 'FBSeason5Interceptions', 'FBSeason30PassTD', 'FBSeason1300RecYds', 'FBSeason10RecTD', 'FBSeason12RushTD', 'FBSeason1600Scrimmage', 'FBSeason2000AllPurpose', 'FBSeason15TFL', 'HKSeason40Goals', 'HKSeason60Assists', 'HKSeason90Points', 'HKSeason25Plus', 'HKSeason250Shots', 'HKSeason150Hits', 'HKSeason100Blocks', 'HKSeason60Takeaways', 'HKSeason20PowerPlay', 'HKSeason3SHGoals', 'HKSeason7GWGoals', 'HKSeason55FaceoffPct', 'HKSeason22TOI', 'HKSeason70PIM', 'HKSeason920SavePct', 'HKSeason260GAA', 'HKSeason6Shutouts', 'HKSeason2000Saves', 'HKSeason60Starts'];
  if (statisticalLeaders.includes(achievementId)) {
    // For ALL statistical achievements, check if player appears in any season/team for this achievement
    if (!seasonIndex) {
      return false;
    }
    
    for (const seasonStr of Object.keys(seasonIndex)) {
      const seasonData = seasonIndex[parseInt(seasonStr)];
      for (const teamData of Object.values(seasonData)) {
        if (teamData[achievementId as keyof typeof teamData]?.has(player.pid)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Check if it's a season-specific achievement (like SMOY, MVP, etc.)
  const seasonAchievement = SEASON_ACHIEVEMENTS.find(sa => sa.id === achievementId);
  if (seasonAchievement) {
    // For season-specific achievements, we should ideally use the season index for proper team-season harmonization
    // However, for general achievement checking (without team context), we fall back to award checking
    // This is used when checking if a player meets an achievement regardless of team context
    return player.awards?.some(award => {
      const normalizedType = award.type.toLowerCase().trim();
      
      // Basketball achievements
      if (achievementId === 'AllStar' && normalizedType.includes('all-star')) return true;
      if (achievementId === 'MVP' && normalizedType.includes('most valuable player')) return true;
      if (achievementId === 'DPOY' && normalizedType.includes('defensive player')) return true;
      if (achievementId === 'ROY' && normalizedType.includes('rookie of the year')) return true;
      if (achievementId === 'SMOY' && normalizedType.includes('sixth man')) return true;
      if (achievementId === 'MIP' && normalizedType.includes('most improved')) return true;
      if (achievementId === 'FinalsMVP' && normalizedType.includes('finals mvp')) return true;
      if (achievementId === 'AllLeagueAny' && (normalizedType.includes('all-league') || normalizedType.includes('allleague'))) return true;
      if (achievementId === 'AllDefAny' && normalizedType.includes('all-defensive')) return true;
      if (achievementId === 'AllRookieAny' && normalizedType.includes('all-rookie')) return true;
      
      // Football achievements (case-sensitive exact matches)
      if (achievementId === 'FBAllStar' && award.type === 'All-Star') return true;
      if (achievementId === 'FBMVP' && award.type === 'Most Valuable Player') return true;
      if (achievementId === 'FBDPOY' && award.type === 'Defensive Player of the Year') return true;
      if (achievementId === 'FBOffROY' && award.type === 'Offensive Rookie of the Year') return true;
      if (achievementId === 'FBDefROY' && award.type === 'Defensive Rookie of the Year') return true;
      if (achievementId === 'FBChampion' && award.type === 'Won Championship') return true;
      if (achievementId === 'FBAllRookie' && award.type === 'All-Rookie Team') return true;
      if (achievementId === 'FBAllLeague' && (award.type === 'First Team All-League' || award.type === 'Second Team All-League')) return true;
      if (achievementId === 'FBFinalsMVP' && award.type === 'Finals MVP') return true;
      
      // Hockey achievements (case-sensitive exact matches)
      if (achievementId === 'HKAllStar' && award.type === 'All-Star Game') return true;
      if (achievementId === 'HKMVP' && award.type === 'MVP') return true;
      if (achievementId === 'HKDefenseman' && award.type === 'Best Defenseman') return true;
      if (achievementId === 'HKROY' && award.type === 'Rookie of the Year') return true;
      if (achievementId === 'HKChampion' && award.type === 'Championship') return true;
      if (achievementId === 'HKPlayoffsMVP' && award.type === 'Playoffs MVP') return true;
      if (achievementId === 'HKFinalsMVP' && award.type === 'Finals MVP') return true;
      if (achievementId === 'HKAllRookie' && award.type === 'All-Rookie Team') return true;
      if (achievementId === 'HKAllLeague' && award.type === 'All-League Team') return true;
      if (achievementId === 'HKAllStarMVP' && award.type === 'All-Star Game MVP') return true;
      if (achievementId === 'HKAssistsLeader' && award.type === 'Assists Leader') return true;
      
      // Baseball achievements
      if (achievementId === 'BBAllStar' && award.type === 'All-Star') return true;
      if (achievementId === 'BBMVP' && award.type === 'Most Valuable Player') return true;
      if (achievementId === 'BBROY' && award.type === 'Rookie of the Year') return true;
      if (achievementId === 'BBChampion' && award.type === 'Won Championship') return true;
      if (achievementId === 'BBAllRookie' && award.type === 'All-Rookie Team') return true;
      if (achievementId === 'BBAllLeague' && (award.type === 'First Team All-League' || award.type === 'Second Team All-League' || award.type === 'All-League Team')) return true;
      if (achievementId === 'BBPlayoffsMVP' && (award.type === 'Playoffs MVP' || award.type === 'Finals MVP')) return true;
      
      return false;
    }) || false;
  }
  
  // For regular career achievements, use the static achievement arrays
  const allAchievements = [...COMMON_ACHIEVEMENTS, ...BASKETBALL_ACHIEVEMENTS, ...FOOTBALL_ACHIEVEMENTS, ...HOCKEY_ACHIEVEMENTS, ...BASEBALL_ACHIEVEMENTS];
  const achievement = allAchievements.find(a => a.id === achievementId);
  
  // CRITICAL FIX: If it's a custom numerical achievement, directly use its test function
  if (achievementId.includes('_custom_')) {
    // We need to find the *actual* custom achievement object that was created
    // This means we need to get all achievements again, including the dynamically generated ones
    const allPossibleAchievements = getAllAchievements(getCachedSportDetection(), seasonIndex, undefined); // Pass undefined for leagueYears to avoid re-generating random achievements
    const customAchievement = allPossibleAchievements.find(a => a.id === achievementId);
    if (customAchievement) {
      return customAchievement.test(player);
    }
  }

  if (achievement) {
    const value = achievement.test(player);
    const threshold = parseFloat(achievement.label.match(/(\d+[,\d.]*)/)?.[0].replace(/,/g, '') || '0');
    return operator === '>=' ? value >= threshold : value <= threshold;
  }
  
  return false;
}

// Cache for season lengths
const seasonLengthCache: Record<number, number> = {};

// Sport detection cache
let cachedSport: 'basketball' | 'football' | 'hockey' | 'baseball' | undefined;

// Set cached sport detection
export function setCachedSportDetection(sport: 'basketball' | 'football' | 'hockey' | 'baseball'): void {
  cachedSport = sport;
}

// Get cached sport detection  
export function getCachedSportDetection(): 'basketball' | 'football' | 'hockey' | 'baseball' | undefined {
  return cachedSport;
}

// Debug function to test individual achievements and grid filtering
// NOTE: This function is disabled for performance - was causing extensive logging in hot paths
export function debugIndividualAchievements(players: Player[], seasonIndex?: SeasonIndex): void {
  // Debug logging disabled for performance
  const DEBUG = import.meta.env.VITE_DEBUG === 'true';
  if (!DEBUG) return;
  
  console.log(`🧪 [DEBUG] Testing individual achievements`);
  console.log(`   Players: ${players.length}, SeasonIndex: ${!!seasonIndex}`);
  
  // Only run detailed analysis if explicitly debugging - removed verbose loops for performance
}

// Clear season length cache
export function clearSeasonLengthCache(): void {
  Object.keys(seasonLengthCache).forEach(key => delete seasonLengthCache[parseInt(key)]);
}

// Calculate league leadership across all seasons
export function calculateLeagueLeadership(players: Player[], gameAttributes: any): any {
  // Simple stub for now - league leadership calculation would be complex
  return {};
}

// Calculate player achievements based on stats
export function calculatePlayerAchievements(player: Player, allPlayers: Player[], leadershipMap: any, playerFeats: any[], leagueYears?: { minSeason: number; maxSeason: number }): any {
  const achievements: any = {};
  const sport = getCachedSportDetection() || 'basketball';
  
  // OPTIMIZATION: Early termination for players with no meaningful stats (especially for FBGM)
  if (!player.stats || player.stats.length === 0) {
    return {};
  }
  
  // Quick check: Skip players with minimal career stats for large files
  const regularSeasonStats = player.stats.filter(s => !s.playoffs);
  if (regularSeasonStats.length === 0) {
    return {};
  }
  
  // For football, early exit if player has virtually no stats across all categories
  if (sport === 'football') {
    const hasMinimalFootballStats = regularSeasonStats.some(stat => {
      const s = stat as any;
      return (s.pssYds || 0) > 100 || (s.rusYds || 0) > 50 || (s.recYds || 0) > 50 ||
             (s.defSk || 0) > 0 || (s.defTck || 0) > 10 || (s.defInt || 0) > 0 ||
             (s.rec || 0) > 5 || (s.gp || 0) > 5; // Include basic participation
    });
    
    if (!hasMinimalFootballStats) {
      return {}; // Skip players with no meaningful football stats
    }
  }
  
  // Initialize all achievements as false - MUST pass leagueYears to include decade achievements
  const allAchievementIds = getAllAchievements(sport, undefined, leagueYears).map(a => a.id);
  allAchievementIds.forEach(id => {
    achievements[id] = false;
  });
  
  if (sport === 'football') {
    // Football-specific achievement calculations
    calculateFootballAchievements(player, achievements);
  } else if (sport === 'hockey') {
    // Hockey-specific achievement calculations
    calculateHockeyAchievements(player, achievements);
  } else if (sport === 'baseball') {
    // Baseball-specific achievement calculations
    calculateBaseballAchievements(player, achievements);
  } else {
    // Basketball-specific achievement calculations  
    calculateBasketballAchievements(player, achievements);
  }
  
  // Common achievements for both sports
  calculateCommonAchievements(player, achievements);
  
  // CRITICAL: Set decade achievement flags based on player's decade data
  if (player.debutDecade !== undefined) {
    achievements[`debutedIn${player.debutDecade}s`] = true;
  }
  if (player.decadesPlayed) {
    Array.from(player.decadesPlayed).forEach(decade => {
      achievements[`playedIn${decade}s`] = true;
    });
  }
  
  return achievements;
}

// Calculate football-specific achievements
function calculateFootballAchievements(player: Player, achievements: any): void {
  const stats = player.stats || [];
  
  // Career totals
  let careerPassTDs = 0;
  let careerRushYds = 0, careerRushTDs = 0;
  let careerRecYds = 0, careerRecTDs = 0;
  let careerSacks = 0, careerInts = 0;
  
  
  stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season stats
    
    // Passing stats - debug what fields are available
    if (Math.random() < 0.001) { // Log 0.1% of seasons to see field names
      console.log('Football season stat fields:', Object.keys(season));
    }
    
    // FBGM passing stats - correct field names from documentation
    const passTDs = season.pssTD || 0;  // Passing TDs use pssTD in FBGM
    
    careerPassTDs += passTDs;
    
    // Debug passing stats when they exist
    if (passTDs > 15) {
      console.log(`Player with ${passTDs} passing TDs in season, career total so far: ${careerPassTDs}`);
    }
    
    // Rushing stats
    careerRushYds += season.rusYds || 0;
    careerRushTDs += season.rusTD || 0;
    
    // Receiving stats
    careerRecYds += season.recYds || 0;
    careerRecTDs += season.recTD || 0;
    
    // Defensive stats - FBGM uses 'sk' field, fallback to 'defSk'
    const seasonSacks = season.sks ?? season.defSk ?? 0;
    careerSacks += seasonSacks;
    careerInts += season.defInt || 0;
  });
  
  // Set career achievements - FBGM doesn't track passing yards, only TDs
  // Debug career stats validation 
  if (careerPassTDs > 50) {
    console.log(`${player.firstName} ${player.lastName}: ${careerPassTDs} career passing TDs`);
  }
  if (careerRushYds > 3000) {
    console.log(`${player.firstName} ${player.lastName}: ${careerRushYds} career rushing yards`);
  }
  if (careerRecYds > 5000) {
    console.log(`${player.firstName} ${player.lastName}: ${careerRecYds} career receiving yards`);
  }
  if (careerSacks > 30) {
    console.log(`${player.firstName} ${player.lastName}: ${careerSacks} career sacks`);
  }
  
  achievements.career300PassTDs = careerPassTDs >= 150; // Lowered for FBGM
  achievements.career12kRushYds = careerRushYds >= 8000; // Lowered from 11k
  achievements.career100RushTDs = careerRushTDs >= 40; // Lowered to get 3→5+ players
  achievements.career12kRecYds = careerRecYds >= 6000; // Lowered to get 2→5+ players  
  achievements.career100RecTDs = careerRecTDs >= 40; // Lowered to get 4→5+ players
  achievements.career100Sacks = careerSacks >= 60; // Lowered from 100
  achievements.career20Ints = careerInts >= 20;
  
  
  // Note: Single-season award calculations removed from game entirely
}

// Calculate baseball-specific achievements
function calculateBaseballAchievements(player: Player, achievements: any): void {
  const stats = player.stats || [];
  
  // Career batting totals
  let careerHits = 0, careerHRs = 0, careerRBIs = 0, careerSBs = 0, careerRuns = 0;
  // Career pitching totals
  let careerWins = 0, careerKs = 0, careerSaves = 0;
  
  
  stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season stats
    
    // Batting stats
    careerHits += season.h || 0;
    careerHRs += season.hr || 0;
    careerRBIs += season.rbi || 0;
    careerSBs += season.sb || 0;
    careerRuns += season.r || 0;
    
    // Pitching stats - baseball uses soPit (strikeouts pitched), not so
    careerWins += season.w || 0;
    careerSaves += season.sv || 0;
    careerKs += season.soPit || 0; // Strikeouts pitched in baseball
    
  });
  
  // Set career achievements
  achievements.career3000Hits = careerHits >= 3000;
  achievements.career500HRs = careerHRs >= 500;
  achievements.career1500RBIs = careerRBIs >= 1500;
  achievements.career400SBs = careerSBs >= 400;
  achievements.career1800Runs = careerRuns >= 1800;
  achievements.career300Wins = careerWins >= 300;
  achievements.career3000Ks = careerKs >= 3000;
  achievements.career300Saves = careerSaves >= 300;
  
  
  // Note: Single-season award calculations removed from game entirely
}

// Calculate hockey-specific achievements
function calculateHockeyAchievements(player: Player, achievements: any): void {
  const stats = player.stats || [];
  
  // Career totals (regular season only)
  let careerGoals = 0, careerAssists = 0, careerPoints = 0;
  let careerWins = 0, careerShutouts = 0;
  
  // Tracking for multi-team seasons
  const seasonStats = new Map<number, {
    goals: number; assists: number; points: number;
    wins: number; shutouts: number; saves: number; shotsAgainst: number;
    gp: number; isGoalie: boolean;
    // Add all raw stat fields needed for season-specific computed achievements
    pm: number; s: number; hit: number; blk: number; tk: number; shG: number; gwG: number;
    fow: number; number; min: number; pim: number; ga: number; gs: number;
    ppG: number; ppA: number;
  }>();
  
  // First pass: aggregate stats by season (merge multi-team stints)
  stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season stats
    
    const seasonYear = season.season;
    if (!seasonYear) return;
    
    const existing = seasonStats.get(seasonYear) || {
      goals: 0, assists: 0, points: 0,
      wins: 0, shutouts: 0, saves: 0, shotsAgainst: 0,
      gp: 0, isGoalie: false,
      pm: 0, s: 0, hit: 0, blk: 0, tk: 0, shG: 0, gwG: 0,
      fow: 0, fol: 0, min: 0, pim: 0, ga: 0, gs: 0,
      ppG: 0, ppA: 0,
    };
    
    // Use ACTUAL ZGMH field names: evG+ppG+shG for goals, evA+ppA+shA for assists
    const goals = (season.evG || 0) + (season.ppG || 0) + (season.shG || 0);
    const assists = (season.evA || 0) + (season.ppA || 0) + (season.shA || 0);
    const points = goals + assists; // Calculate total points
    
    // Debug stat fields for first few players - increase probability to see more
    if (Math.random() < 0.05) {
      console.log('Hockey season fields:', Object.keys(season));
      console.log(`Season ${seasonYear}: Goals=${goals} (evG=${season.evG}, ppG=${season.ppG}, shG=${season.shG}), Assists=${assists} (evA=${season.evA}, ppA=${season.ppA}, shA=${season.shA}), Points=${points}, GP=${season.gp}`);
    }
    
    existing.goals += goals;
    existing.assists += assists;
    existing.points += points;
    existing.gp += season.gp || 0;

    // Aggregate all raw stat fields needed for season-specific computed achievements
    existing.pm += season.pm || 0;
    existing.s += season.s || 0;
    existing.hit += season.hit || 0;
    existing.blk += season.blk || 0;
    existing.tk += season.tk || 0;
    existing.shG += season.shG || 0;
    existing.gwG += season.gwG || 0;
    existing.fow += season.fow || 0;
    existing.fol += season.fol || 0;
    existing.min += season.min || 0;
    existing.pim += season.pim || 0;
    existing.ga += season.ga || 0;
    existing.gs += season.gs || 0;
    existing.ppG += season.ppG || 0;
    existing.ppA += season.ppA || 0;
    
    // Goalie stats - filter to goalies only
    const isGoalie = player.pos === 'G' || season.svPct != null || season.so != null || season.w != null;
    if (isGoalie) {
      existing.isGoalie = true;
      existing.wins += season.w || 0;
      existing.shutouts += season.so || 0;
      
      // For save percentage calculation
      if (season.sa && season.svPct != null) {
        existing.saves += Math.round((season.svPct * season.sa));
        existing.shotsAgainst += season.sa;
      }
    }
    
    seasonStats.set(seasonYear, existing);
  });
  
  // Second pass: calculate career totals and store season-specific computed stats
  player.achievements.seasonStatsComputed = player.achievements.seasonStatsComputed || {};

  seasonStats.forEach((seasonData, seasonYear) => {
    // Career totals
    careerGoals += seasonData.goals;
    careerAssists += seasonData.assists;
    careerPoints += seasonData.points;
    
    // Goalie stats (only for goalies)
    if (seasonData.isGoalie) {
      careerWins += seasonData.wins;
      careerShutouts += seasonData.shutouts;
    }

    // Store computed season stats on player.achievements for easy access
    // Ensure player.achievements.seasonStatsComputed is initialized
    const faceoffTotal = seasonData.fow + seasonData.fol;
    const faceoffPct = faceoffTotal > 0 ? seasonData.fow / faceoffTotal : 0;
    const toiPerGame = (seasonData.gp || 0) > 0 ? (seasonData.min || 0) / (seasonData.gp || 1) : 0;
    const powerPlayPoints = seasonData.ppG + seasonData.ppA;
    const savesTotal = seasonData.saves + seasonData.ga;
    const savePct = savesTotal > 0 ? seasonData.saves / savesTotal : 0;
    const gaaRate = (seasonData.min || 0) > 0 ? (seasonData.ga || 0) / ((seasonData.min || 0) / 60) : 0;

    player.achievements.seasonStatsComputed[seasonYear] = {
      goals: seasonData.goals,
      assists: seasonData.assists,
      points: seasonData.points,
      pm: seasonData.pm,
      s: seasonData.s,
      hit: seasonData.hit,
      blk: seasonData.blk,
      tk: seasonData.tk,
      powerPlayPoints: powerPlayPoints,
      shG: seasonData.shG,
      gwG: seasonData.gwG,
      faceoffPct: faceoffPct,
      toiPerGame: toiPerGame,
      pim: seasonData.pim,
      savePct: savePct,
      gaaRate: gaaRate,
      so: seasonData.so,
      sv: seasonData.sv,
      gs: seasonData.gs,
    };
  });
  
  // Set career achievements - using EXACT user-specified NHL thresholds
  achievements.career500Goals = careerGoals >= 500;   // 500+ Career Goals
  achievements.career1000Points = careerPoints >= 1000; // 1,000+ Career Points
  achievements.career500Assists = careerAssists >= 500;  // 500+ Career Assists
  achievements.career200Wins = careerWins >= 200;      // 200+ Career Wins (G)
  achievements.career50Shutouts = careerShutouts >= 50; // 50+ Career Shutouts (G)
  
  // Debug career stats - show players with significant stats
  if (careerGoals >= 20 || careerPoints >= 40) {
    console.log(`Hockey: ${player.firstName} ${player.lastName} - Career: ${careerGoals}G, ${careerAssists}A, ${careerPoints}P (${seasonStats.size} seasons)`);
  }
  
  
  
  // Note: Single-season award calculations removed from game entirely
}

// Calculate basketball-specific achievements
function calculateBasketballAchievements(player: Player, achievements: any): void {
  const stats = player.stats || [];
  
  // Career totals
  let careerPts = 0, careerReb = 0, careerAst = 0, careerStl = 0, careerBlk = 0, careerThree = 0;
  
  
  stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season stats
    
    careerPts += season.pts || 0;
    // Handle different rebound field names in BBGM files
    let seasonRebounds = 0;
    if (season.trb !== undefined) {
      seasonRebounds = season.trb;
    } else if (season.orb !== undefined || season.drb !== undefined) {
      seasonRebounds = (season.orb || 0) + (season.drb || 0);
    } else if (season.reb !== undefined) {
      seasonRebounds = season.reb;
    }
    careerReb += seasonRebounds;
    
    careerAst += season.ast || 0;
    careerStl += season.stl || 0;
    careerBlk += season.blk || 0;
    // Handle different three-pointer field names
    const seasonThrees = season.tpm || season.tp || season.fg3 || 0;
    careerThree += seasonThrees;
    
  });
  
  // Set career achievements
  achievements.career20kPoints = careerPts >= 20000;
  achievements.career10kRebounds = careerReb >= 10000;
  achievements.career5kAssists = careerAst >= 5000;
  achievements.career2kSteals = careerStl >= 2000;
  achievements.career1500Blocks = careerBlk >= 1500;
  achievements.career2kThrees = careerThree >= 2000;
  
  // Helper function to get decade from season
  const getDecade = (season: number) => Math.floor(season / 10) * 10;
  
  // Contest achievements (check awards)
  const awards = player.awards || [];
  achievements.threePointContestWinner = awards.some(a => a.type === 'Three-Point Contest Winner');
  achievements.dunkContestWinner = awards.some(a => a.type === 'Slam Dunk Contest Winner');
  
  // Age 40+ achievement
  achievements.playedAtAge40Plus = stats.some(s => 
    !s.playoffs && (s.gp || 0) > 0 && s.season - (player.born?.year || 0) >= 40
  );
  
  // ROY who later won MVP achievement
  const roySeasons = awards.filter(a => a.type === 'Rookie of the Year').map(a => a.season);
  const mvpSeasons = awards.filter(a => a.type === 'Most Valuable Player').map(a => a.season);
  achievements.royLaterMVP = roySeasons.length > 0 && mvpSeasons.length > 0 && 
    mvpSeasons.some(mvp => roySeasons.some(roy => mvp > roy));
  
  // Played for 5+ franchises (use statsTids if available)
  if (player.statsTids && player.statsTids.length >= 5) {
    achievements.played5PlusFranchises = true;
  } else {
    // Fallback: count unique team IDs from stats
    const uniqueTids = new Set(stats.filter(s => !s.playoffs && (s.gp || 0) > 0).map(s => s.tid));
    achievements.played5PlusFranchises = uniqueTids.size >= 5;
  }
  
  // Regular season stats for decade calculations
  const regularSeasonStats = stats.filter(s => !s.playoffs && (s.gp || 0) > 0);
  const playedDecades = new Set(regularSeasonStats.map(s => getDecade(s.season)));
  
  // Decade achievements
  achievements.playedIn1970s = playedDecades.has(1970);
  achievements.playedIn1980s = playedDecades.has(1980);
  achievements.playedIn1990s = playedDecades.has(1990);
  achievements.playedIn2000s = playedDecades.has(2000);
  achievements.playedIn2010s = playedDecades.has(2010);
  achievements.playedIn2020s = playedDecades.has(2020);
  achievements.playedIn2030s = playedDecades.has(2030);
  
  // Debut decade achievements
  // Avoid stack overflow - find min manually
  let firstSeason: number | null = null;
  if (regularSeasonStats.length > 0) {
    firstSeason = regularSeasonStats[0].season;
    for (const stat of regularSeasonStats) {
      if (stat.season < firstSeason) firstSeason = stat.season;
    }
  }
  if (firstSeason) {
    const debutDecade = getDecade(firstSeason);
    achievements.debutedIn1970s = debutDecade === 1970;
    achievements.debutedIn1980s = debutDecade === 1980;
    achievements.debutedIn1990s = debutDecade === 1990;
    achievements.debutedIn2000s = debutDecade === 2000;
    achievements.debutedIn2010s = debutDecade === 2010;
    achievements.debutedIn2020s = debutDecade === 2020;
    achievements.debutedIn2030s = debutDecade === 2030;
  }
  
  
  // Multi-decade achievements
  achievements.playedInThreeDecades = playedDecades.size >= 3;
  
  // Note: Single-season award calculations removed from game entirely
}

// Calculate common achievements for both sports
function calculateCommonAchievements(player: Player, achievements: any): void {
  // Draft achievements
  const draft = player.draft;
  if (draft) {
    achievements.isPick1Overall = draft.pick === 1 && draft.round === 1;
    achievements.isFirstRoundPick = draft.round === 1;
    achievements.isSecondRoundPick = draft.round === 2;
    achievements.isUndrafted = !draft.round || draft.round === 0;
    
    // Drafted as teenager
    const draftYear = draft.year;
    const birthYear = player.born?.year;
    if (draftYear && birthYear) {
      achievements.draftedTeen = (draftYear - birthYear) <= 19;
    }
  } else {
    achievements.isUndrafted = true;
  }
  
  // Career length - count distinct seasons with regular season games played
  const stats = player.stats || [];
  const seasonsPlayed = new Set<number>();
  stats.forEach((s: any) => {
    if (!s.playoffs && (s.gp || 0) > 0) {
      seasonsPlayed.add(s.season);
    }
  });
  const seasonCount = seasonsPlayed.size;
  achievements.played10PlusSeasons = seasonCount >= 10;
  achievements.played15PlusSeasons = seasonCount >= 15;
  
  // DEBUG: Log for the first few players with 15+ seasons
  if (seasonCount >= 15 && Math.random() < 0.01) {
    console.log(`🐛 [calculateCommonAchievements] Player ${player.name} has ${seasonCount} seasons, played15PlusSeasons: ${achievements.played15PlusSeasons}`);
  }
  
  
  // Location - check if born outside the 50 US states + DC
  achievements.bornOutsideUS50DC = isBornOutsideUS50DC(player.born);
  
  
  // Hall of Fame - check awards only (hof property doesn't exist in Player type)
  const awards = player.awards || [];
  achievements.isHallOfFamer = awards.some((a: any) => a.type === 'Inducted into the Hall of Fame');
}

// Helper function to check if player was born outside the 50 US states + DC
function isBornOutsideUS50DC(born: any): boolean {
  // If no birth location data, qualify (assume outside US)
  if (!born || !born.loc) return true;
  
  const location = born.loc.trim();
  if (!location) return true;
  
  // Normalize for comparisons (case-insensitive, handle punctuation)
  const normalized = location.toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Check if this is definitively a US birth location (50 states + DC)
  // If it is, they DON'T qualify for "outside" achievement
  const isUSBorn = isBornInUS50DC(normalized);
  
  // Debug logging specifically for hockey to help diagnose issues
  if (location.includes('Hockey') || Math.random() < 0.001) {
    console.log(`🏒 HOCKEY BIRTH DEBUG: "${location}" -> normalized: "${normalized}" -> isUSBorn: ${isUSBorn} -> qualifies: ${!isUSBorn}`);
  }
  
  return !isUSBorn;
}

// Check if location definitively indicates birth in the 50 US states + DC
function isBornInUS50DC(normalized: string): boolean {
  // A) District of Columbia - any of these = reject (inside US)
  if (isDC(normalized)) {
    return true;
  }
  
  // B) U.S. state postal codes
  if (hasUSStateCode(normalized)) {
    return true;
  }
  
  // C) U.S. state full names
  if (hasUSStateName(normalized)) {
    return true;
  }
  
  // D) "Commonwealth of..." variants
  if (hasCommonwealthVariant(normalized)) {
    return true;
  }
  
  // E) "Inside-USA" catch-alls (without clear foreign/territory cue)
  if (hasUSACatchall(normalized)) {
    return true;
  }
  
  // F) Address patterns that imply "inside"
  if (hasUSAddressPattern(normalized)) {
    return true;
  }
  
  // If none of the above, treat as outside (qualifies for achievement)
  return false;
}

// A) District of Columbia detection
function isDC(normalized: string): boolean {
  return normalized.includes('washington dc') ||
         normalized.includes('washington d c') ||
         normalized.includes('district of columbia') ||
         normalized.match(/\bdc\b/) !== null ||
         normalized.match(/\bd\.c\.\b/) !== null;
}

// B) U.S. state postal codes detection
function hasUSStateCode(normalized: string): boolean {
  const stateCodes = [
    'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 
    'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 
    'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 
    'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy'
  ];
  
  for (const code of stateCodes) {
    const regex = new RegExp(`\\b${code}\\b`);
    if (regex.test(normalized)) {
      // Handle ambiguous case: GA could be Georgia state or Georgia country
      if (code === 'ga') {
        // Look for context clues that indicate Georgia state
        if (normalized.includes('atlanta') || normalized.includes('savannah') || 
            normalized.includes('augusta') || normalized.includes('columbus') ||
            normalized.includes('usa') || normalized.includes('united states')) {
          return true; // Clearly Georgia state
        }
        // Look for context clues that indicate Georgia country
        if (normalized.includes('tbilisi') || 
            (normalized.includes('georgia') && !normalized.includes('usa') && !normalized.includes('united states'))) {
          continue; // Likely Georgia country, keep checking other codes
        }
        // Default to state if still ambiguous (conservative approach)
        return true;
      }
      return true;
    }
  }
  
  return false;
}

// C) U.S. state full names detection
function hasUSStateName(normalized: string): boolean {
  const stateNames = [
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut',
    'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 
    'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 
    'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 
    'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 
    'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 
    'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia', 
    'wisconsin', 'wyoming'
  ];
  
  for (const stateName of stateNames) {
    if (normalized.includes(stateName)) {
      // Special handling for ambiguous names
      if (stateName === 'washington') {
        // Washington could be state, DC, or foreign
        if (normalized.includes('seattle') || normalized.includes('spokane') || 
            normalized.includes('tacoma') || normalized.includes('washington state') ||
            normalized.match(/\bwa\b/)) {
          return true; // Clearly Washington state
        }
        if (normalized.includes('dc') || normalized.includes('d c') || 
            normalized.includes('district')) {
          return true; // Washington DC (handled by DC check but catch here too)
        }
        // If just "washington" without context, default to inside (conservative)
        return true;
      }
      
      if (stateName === 'georgia') {
        // Same logic as GA code above
        if (normalized.includes('atlanta') || normalized.includes('savannah') || 
            normalized.includes('augusta') || normalized.includes('usa') || 
            normalized.includes('united states')) {
          return true; // Clearly Georgia state
        }
        if (normalized.includes('tbilisi')) {
          continue; // Clearly Georgia country
        }
        return true; // Default to state
      }
      
      return true;
    }
  }
  
  // Also check "State of ___" patterns
  const stateOfRegex = /state of (alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)/;
  if (stateOfRegex.test(normalized)) {
    return true;
  }
  
  return false;
}

// D) Commonwealth variants detection
function hasCommonwealthVariant(normalized: string): boolean {
  const commonwealths = [
    'commonwealth of kentucky',
    'commonwealth of massachusetts', 
    'commonwealth of pennsylvania',
    'commonwealth of virginia'
  ];
  
  for (const commonwealth of commonwealths) {
    if (normalized.includes(commonwealth)) {
      return true;
    }
  }
  
  return false;
}

// E) USA catch-alls detection
function hasUSACatchall(normalized: string): boolean {
  const usaPatterns = [
    'usa', 'u.s.a.', 'u s a', 'us', 'u.s.', 'u s',
    'united states', 'united states of america'
  ];
  
  for (const pattern of usaPatterns) {
    if (normalized.includes(pattern)) {
      // Check if this is combined with a US state/city (clearly inside)
      // OR if it's just "USA" alone (treat as inside per conservative approach)
      return true;
    }
  }
  
  return false;
}

// F) US address patterns detection
function hasUSAddressPattern(normalized: string): boolean {
  // Pattern: City, StateCode (e.g., "dallas tx", "miami fl")
  const cityStatePattern = /\b[a-z\s]+,?\s+(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b/;
  if (cityStatePattern.test(normalized)) {
    return true;
  }
  
  // Pattern: City, StateName (e.g., "portland oregon", "buffalo new york")
  const cityStateNamePattern = /\b[a-z\s]+,?\s+(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/;
  if (cityStateNamePattern.test(normalized)) {
    return true;
  }
  
  return false;
}


// Calculate team seasons and achievement seasons for same-season alignment
export function calculateTeamSeasonsAndAchievementSeasons(player: Player, leadershipMap: any, gameAttributes: any): void {
  // Initialize if not exists
  if (!player.teamSeasonsPaired) {
    player.teamSeasonsPaired = new Set<string>();
  }
  if (!player.achievementSeasons) {
    player.achievementSeasons = {
      // Major awards
      mvpWinner: new Set<number>(),
      dpoyWinner: new Set<number>(),
      royWinner: new Set<number>(),
      smoyWinner: new Set<number>(),
      mipWinner: new Set<number>(),
      fmvpWinner: new Set<number>(),
      // Team honors  
      allLeagueTeam: new Set<number>(),
      allDefensiveTeam: new Set<number>(),
      allStarSelection: new Set<number>(),
      champion: new Set<number>(),
      // Note: Single season achievements removed from game
      season30ppg: new Set<number>(),
      season10apg: new Set<number>(),
      season15rpg: new Set<number>(),
      season3bpg: new Set<number>(),
      season25spg: new Set<number>(),
      season504090: new Set<number>(),
      ledScoringAny: new Set<number>(),
      ledRebAny: new Set<number>(),
      ledAstAny: new Set<number>(),
      ledStlAny: new Set<number>(),
      ledBlkAny: new Set<number>(),
      // played15PlusSeasons: new Set<number>(), // Not needed in achievement seasons
      // Note: Draft achievements removed from UI
      // Note: Draft achievements still used for some sports
      isFirstRoundPick: new Set<number>(),
      isSecondRoundPick: new Set<number>(),
      isUndrafted: new Set<number>(),
      draftedTeen: new Set<number>(),
      bornOutsideUS50DC: new Set<number>(),
      allStar35Plus: new Set<number>(),
      oneTeamOnly: new Set<number>(),
      isHallOfFamer: new Set<number>()
    };
  }
}

// Get viable achievements that have at least the minimum number of qualifying players
export function getViableAchievements(
  players: Player[], 
  minCount = 15, 
  sport?: 'basketball' | 'football' | 'hockey' | 'baseball',
  seasonIndex?: any, // SeasonIndex from season-achievements
  leagueYears?: { minSeason: number; maxSeason: number }
): Achievement[] {
  const achievements = getAllAchievements(sport, seasonIndex, leagueYears);
  
  return achievements.filter(achievement => {
    // For season-specific achievements, use playerMeetsAchievement which properly handles seasonIndex
    // For career achievements, use the original test function
    const qualifyingPlayers = players.filter(player => {
      if (achievement.isSeasonSpecific) {
        return playerMeetsAchievement(player, achievement.id, seasonIndex);
      } else {
        return achievement.test(player);
      }
    });
    const hasEnough = qualifyingPlayers.length >= Math.max(minCount, achievement.minPlayers);
    
    // Debug logging removed for performance - was causing logs for every achievement evaluation
    const DEBUG = import.meta.env.VITE_DEBUG === 'true';
    if (DEBUG) {
      if (hasEnough) {
        console.log(`✓ ${achievement.id}: ${qualifyingPlayers.length} players`);
      } else {
        console.log(`✗ ${achievement.id}: only ${qualifyingPlayers.length} players (need ${Math.max(minCount, achievement.minPlayers)})`);
      }
    }
    
    return hasEnough;
  });
}