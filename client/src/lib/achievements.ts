import type { Player } from "@/types/bbgm";
import { SEASON_ACHIEVEMENTS, type SeasonAchievement, type SeasonIndex, type SeasonAchievementId, getSeasonEligiblePlayers } from './season-achievements';

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
      // Football: only FB* prefixed achievements and some general ones
      return seasonAch.id.startsWith('FB') || ['PointsLeader', 'ReboundsLeader', 'AssistsLeader'].includes(seasonAch.id);
    } else if (sport === 'hockey') {
      // Hockey: only HK* prefixed achievements and some general ones
      return seasonAch.id.startsWith('HK') || ['PointsLeader', 'ReboundsLeader', 'AssistsLeader'].includes(seasonAch.id);
    } else if (sport === 'baseball') {
      // Baseball: only BB* prefixed achievements and some general ones
      return seasonAch.id.startsWith('BB') || ['PointsLeader', 'ReboundsLeader', 'AssistsLeader'].includes(seasonAch.id);
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
      const statisticalLeaders = ['PointsLeader', 'ReboundsLeader', 'AssistsLeader', 'StealsLeader', 'BlocksLeader'];
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

// Get achievements based on sport
export function getAchievements(sport?: 'basketball' | 'football' | 'hockey' | 'baseball', seasonIndex?: SeasonIndex): Achievement[] {
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
    // Basketball: add season-specific achievements
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

// Check if a player meets a specific achievement
export function playerMeetsAchievement(player: Player, achievementId: string, seasonIndex?: SeasonIndex): boolean {
  // First, check if it's a statistical leader achievement that needs season index
  const statisticalLeaders = ['PointsLeader', 'ReboundsLeader', 'AssistsLeader', 'StealsLeader', 'BlocksLeader'];
  if (statisticalLeaders.includes(achievementId)) {
    // For statistical leaders, check if player appears in any season/team for this achievement
    if (!seasonIndex) return false;
    
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
    // For traditional award-based achievements, check player awards using the same mapping logic as season index building
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
      if (achievementId === 'BBAllLeague' && (award.type === 'First Team All-League' || award.type === 'Second Team All-League')) return true;
      if (achievementId === 'BBPlayoffsMVP' && award.type === 'Playoffs MVP') return true;
      
      return false;
    }) || false;
  }
  
  // For regular career achievements, use the static achievement arrays
  const allAchievements = [...COMMON_ACHIEVEMENTS, ...BASKETBALL_ACHIEVEMENTS, ...FOOTBALL_ACHIEVEMENTS, ...HOCKEY_ACHIEVEMENTS, ...BASEBALL_ACHIEVEMENTS];
  const achievement = allAchievements.find(a => a.id === achievementId);
  return achievement ? achievement.test(player) : false;
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
export function calculatePlayerAchievements(player: Player, allPlayers: Player[], leadershipMap: any, playerFeats: any[]): any {
  const achievements: any = {};
  const sport = getCachedSportDetection() || 'basketball';
  
  // Initialize all achievements as false
  const allAchievementIds = getAchievements(sport).map(a => a.id);
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
    const seasonSacks = season.sk ?? season.defSk ?? 0;
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
  }>();
  
  // First pass: aggregate stats by season (merge multi-team stints)
  stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season stats
    
    const seasonYear = season.season;
    if (!seasonYear) return;
    
    const existing = seasonStats.get(seasonYear) || {
      goals: 0, assists: 0, points: 0,
      wins: 0, shutouts: 0, saves: 0, shotsAgainst: 0,
      gp: 0, isGoalie: false
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
  
  // Second pass: calculate career totals
  
  seasonStats.forEach((seasonData) => {
    // Career totals
    careerGoals += seasonData.goals;
    careerAssists += seasonData.assists;
    careerPoints += seasonData.points;
    
    
    // Goalie stats (only for goalies)
    if (seasonData.isGoalie) {
      careerWins += seasonData.wins;
      careerShutouts += seasonData.shutouts;
      
    }
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
  seasonIndex?: any // SeasonIndex from season-achievements
): Achievement[] {
  const achievements = getAchievements(sport, seasonIndex);
  
  return achievements.filter(achievement => {
    const qualifyingPlayers = players.filter(achievement.test);
    const hasEnough = qualifyingPlayers.length >= Math.max(minCount, achievement.minPlayers);
    
    if (hasEnough) {
      console.log(`✓ ${achievement.id}: ${qualifyingPlayers.length} players`);
    } else {
      console.log(`✗ ${achievement.id}: only ${qualifyingPlayers.length} players (need ${Math.max(minCount, achievement.minPlayers)})`);
    }
    
    return hasEnough;
  });
}