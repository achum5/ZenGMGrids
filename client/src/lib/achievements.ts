import type { Player } from "@/types/bbgm";

export interface Achievement {
  id: string;
  label: string;
  test: (player: Player) => boolean;
  minPlayers: number;
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
  // Season achievements
  {
    id: 'season30ppg',
    label: '30+ PPG Season',
    test: (p: Player) => p.achievements?.season30ppg || false,
    minPlayers: 5
  },
  {
    id: 'season10apg',
    label: '10+ APG Season',
    test: (p: Player) => p.achievements?.season10apg || false,
    minPlayers: 5
  },
  {
    id: 'season15rpg',
    label: '15+ RPG Season',
    test: (p: Player) => p.achievements?.season15rpg || false,
    minPlayers: 5
  },
  {
    id: 'season3bpg',
    label: '3+ BPG Season',
    test: (p: Player) => p.achievements?.season3bpg || false,
    minPlayers: 5
  },
  {
    id: 'season25spg',
    label: '2.5+ SPG Season',
    test: (p: Player) => p.achievements?.season25spg || false,
    minPlayers: 5
  },
  {
    id: 'season504090',
    label: '50/40/90 Season',
    test: (p: Player) => p.achievements?.season504090 || false,
    minPlayers: 5
  },
  // Awards achievements
  {
    id: 'hasMVP',
    label: 'Most Valuable Player',
    test: (p: Player) => p.achievements?.hasMVP || false,
    minPlayers: 5
  },
  {
    id: 'hasDPOY',
    label: 'Defensive Player of the Year',
    test: (p: Player) => p.achievements?.hasDPOY || false,
    minPlayers: 5
  },
  {
    id: 'hasROY',
    label: 'Rookie of the Year',
    test: (p: Player) => p.achievements?.hasROY || false,
    minPlayers: 5
  },
  {
    id: 'wonSixMOY',
    label: 'Sixth Man of the Year',
    test: (p: Player) => p.achievements?.wonSixMOY || false,
    minPlayers: 5
  },
  {
    id: 'wonFinalsMVP',
    label: 'Finals MVP',
    test: (p: Player) => p.achievements?.wonFinalsMVP || false,
    minPlayers: 5
  },
  {
    id: 'hasAllStar',
    label: 'All-Star',
    test: (p: Player) => p.achievements?.hasAllStar || false,
    minPlayers: 5
  },
  {
    id: 'wonChampionship',
    label: 'Champion',
    test: (p: Player) => p.achievements?.wonChampionship || false,
    minPlayers: 5
  }
];

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
  // Single season achievements
  {
    id: 'season50HRs',
    label: '50+ Home Runs Season',
    test: (p: Player) => p.achievements?.season50HRs || false,
    minPlayers: 5
  },
  {
    id: 'season130RBIs',
    label: '130+ RBIs Season',
    test: (p: Player) => p.achievements?.season130RBIs || false,
    minPlayers: 5
  },
  {
    id: 'season200Hits',
    label: '200+ Hits Season',
    test: (p: Player) => p.achievements?.season200Hits || false,
    minPlayers: 5
  },
  {
    id: 'season50SBs',
    label: '50+ Stolen Bases Season',
    test: (p: Player) => p.achievements?.season50SBs || false,
    minPlayers: 5
  },
  {
    id: 'season20Wins',
    label: '20+ Wins Season (P)',
    test: (p: Player) => p.achievements?.season20Wins || false,
    minPlayers: 5
  },
  {
    id: 'season40Saves',
    label: '40+ Saves Season',
    test: (p: Player) => p.achievements?.season40Saves || false,
    minPlayers: 5
  },
  {
    id: 'season300Ks',
    label: '300+ Strikeouts Season',
    test: (p: Player) => p.achievements?.season300Ks || false,
    minPlayers: 5
  },
  {
    id: 'season200ERA',
    label: 'Sub-2.00 ERA Season',
    test: (p: Player) => p.achievements?.season200ERA || false,
    minPlayers: 5
  },
  // Awards achievements
  {
    id: 'wonMVP',
    label: 'Most Valuable Player',
    test: (p: Player) => p.achievements?.wonMVP || false,
    minPlayers: 5
  },
  {
    id: 'wonFinalsMVP',
    label: 'Finals MVP',
    test: (p: Player) => p.achievements?.wonFinalsMVP || false,
    minPlayers: 5
  },
  {
    id: 'wonPitcherOfYear',
    label: 'Pitcher of the Year',
    test: (p: Player) => p.achievements?.wonPitcherOfYear || false,
    minPlayers: 5
  },
  {
    id: 'wonReliefPitcherOfYear',
    label: 'Relief Pitcher of the Year', 
    test: (p: Player) => p.achievements?.wonReliefPitcherOfYear || false,
    minPlayers: 5
  },
  {
    id: 'wonROY',
    label: 'Rookie of the Year',
    test: (p: Player) => p.achievements?.wonROY || false,
    minPlayers: 5
  },
  {
    id: 'madeAllStar',
    label: 'All-Star',
    test: (p: Player) => p.achievements?.madeAllStar || false,
    minPlayers: 5
  },
  {
    id: 'wonChampionship',
    label: 'Champion',
    test: (p: Player) => p.achievements?.wonChampionship || false,
    minPlayers: 5
  }
];

// Hockey-specific achievements
export const HOCKEY_ACHIEVEMENTS: Achievement[] = [
  // Career achievements
  {
    id: 'career500Goals',
    label: '500+ Career Goals',
    test: (p: Player) => p.achievements?.career500Goals || false,
    minPlayers: 5
  },
  {
    id: 'career1000Points',
    label: '1,000+ Career Points',
    test: (p: Player) => p.achievements?.career1000Points || false,
    minPlayers: 5
  },
  {
    id: 'career500Assists',
    label: '500+ Career Assists',
    test: (p: Player) => p.achievements?.career500Assists || false,
    minPlayers: 5
  },
  {
    id: 'career200Wins',
    label: '200+ Career Wins (G)',
    test: (p: Player) => p.achievements?.career200Wins || false,
    minPlayers: 5
  },
  {
    id: 'career50Shutouts',
    label: '50+ Career Shutouts (G)',
    test: (p: Player) => p.achievements?.career50Shutouts || false,
    minPlayers: 5
  },
  // Season achievements
  {
    id: 'season50Goals',
    label: '50+ Goals Season',
    test: (p: Player) => p.achievements?.season50Goals || false,
    minPlayers: 5
  },
  {
    id: 'season100Points',
    label: '100+ Points Season',
    test: (p: Player) => p.achievements?.season100Points || false,
    minPlayers: 5
  },
  {
    id: 'season60Assists',
    label: '60+ Assists Season',
    test: (p: Player) => p.achievements?.season60Assists || false,
    minPlayers: 5
  },
  {
    id: 'season35Wins',
    label: '35+ Wins Season (G)',
    test: (p: Player) => p.achievements?.season35Wins || false,
    minPlayers: 5
  },
  {
    id: 'season10Shutouts',
    label: '10+ Shutouts Season (G)',
    test: (p: Player) => p.achievements?.season10Shutouts || false,
    minPlayers: 5
  },
  {
    id: 'season925SavePct',
    label: '.925+ Save % Season (G)',
    test: (p: Player) => p.achievements?.season925SavePct || false,
    minPlayers: 5
  },
  // Awards achievements
  {
    id: 'wonMVP',
    label: 'Most Valuable Player',
    test: (p: Player) => p.achievements?.wonMVP || false,
    minPlayers: 5
  },
  {
    id: 'wonDefensiveForward',
    label: 'Defensive Forward of the Year',
    test: (p: Player) => p.achievements?.wonDefensiveForward || false,
    minPlayers: 5
  },
  {
    id: 'wonGoalieOfYear',
    label: 'Goalie of the Year',
    test: (p: Player) => p.achievements?.wonGoalieOfYear || false,
    minPlayers: 5
  },
  {
    id: 'wonROY',
    label: 'Rookie of the Year',
    test: (p: Player) => p.achievements?.wonROY || false,
    minPlayers: 5
  },
  {
    id: 'wonPlayoffsMVP',
    label: 'Playoffs MVP',
    test: (p: Player) => p.achievements?.wonPlayoffsMVP || false,
    minPlayers: 5
  },
  {
    id: 'madeAllStar',
    label: 'All-Star',
    test: (p: Player) => p.achievements?.madeAllStar || false,
    minPlayers: 5
  },
  {
    id: 'wonChampionship',
    label: 'Champion',
    test: (p: Player) => p.achievements?.wonChampionship || false,
    minPlayers: 5
  }
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
    id: 'season35PassTDs',
    label: '35+ Pass TDs Season',
    test: (p: Player) => p.achievements?.season35PassTDs || false,
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
  {
    id: 'season1800RushYds',
    label: '1,600+ Rush Yards Season',
    test: (p: Player) => p.achievements?.season1800RushYds || false,
    minPlayers: 5
  },
  {
    id: 'season20RushTDs',
    label: '20+ Rush TDs Season',
    test: (p: Player) => p.achievements?.season20RushTDs || false,
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
  {
    id: 'season1400RecYds',
    label: '1,400+ Rec Yards Season',
    test: (p: Player) => p.achievements?.season1400RecYds || false,
    minPlayers: 5
  },
  {
    id: 'season15RecTDs',
    label: '15+ Rec TDs Season',
    test: (p: Player) => p.achievements?.season15RecTDs || false,
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
  {
    id: 'season15Sacks',
    label: '15+ Sacks Season',
    test: (p: Player) => p.achievements?.season15Sacks || false,
    minPlayers: 5
  },
  {
    id: 'season8Ints',
    label: '8+ Interceptions Season',
    test: (p: Player) => p.achievements?.season8Ints || false,
    minPlayers: 5
  },
  // Awards achievements
  {
    id: 'wonMVP',
    label: 'Most Valuable Player',
    test: (p: Player) => p.achievements?.wonMVP || false,
    minPlayers: 5
  },
  {
    id: 'wonDPOY',
    label: 'Defensive Player of the Year',
    test: (p: Player) => p.achievements?.wonDPOY || false,
    minPlayers: 5
  },
  {
    id: 'wonROY',
    label: 'Rookie of the Year',
    test: (p: Player) => p.achievements?.wonROY || false,
    minPlayers: 5
  }
];

// Get achievements based on sport
export function getAchievements(sport?: 'basketball' | 'football' | 'hockey' | 'baseball'): Achievement[] {
  const common = COMMON_ACHIEVEMENTS;
  
  if (sport === 'football') {
    // Exclude draftedTeen for football
    const footballCommon = common.filter(a => a.id !== 'draftedTeen');
    return [...footballCommon, ...FOOTBALL_ACHIEVEMENTS];
  } else if (sport === 'hockey') {
    return [...common, ...HOCKEY_ACHIEVEMENTS];
  } else if (sport === 'baseball') {
    return [...common, ...BASEBALL_ACHIEVEMENTS];
  } else {
    // Default to basketball for backwards compatibility
    return [...common, ...BASKETBALL_ACHIEVEMENTS];
  }
}

// Season-aligned achievements that need same-season matching for Team × Achievement cells
export const SEASON_ALIGNED_ACHIEVEMENTS = new Set([
  // Basketball season stats
  'season30ppg', 'season10apg', 'season15rpg', 'season3bpg', 'season25spg', 'season504090',
  // Basketball league leaders
  'ledScoringAny', 'ledRebAny', 'ledAstAny', 'ledStlAny', 'ledBlkAny',
  // Basketball awards (season-specific) - Only add the most important ones that we know work
  'hasMVP', 'hasDPOY', 'hasAllStar', 'hasFMVP', 'hasChampion',
  // Football season stats
  'season4500PassYds', 'season35PassTDs', 'season1800RushYds', 'season20RushTDs', 
  'season1400RecYds', 'season15RecTDs', 'season15Sacks', 'season8Ints',
  // Hockey season stats
  'season50Goals', 'season100Points', 'season60Assists', 'season35Wins', 'season10Shutouts', 'season925SavePct',
  // Baseball season stats
  'season50HRs', 'season130RBIs', 'season200Hits', 'season50SBs', 'season20Wins', 'season40Saves', 'season300Ks', 'season200ERA'
]);

// Check if a player meets a specific achievement
export function playerMeetsAchievement(player: Player, achievementId: string): boolean {
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
  Object.keys(seasonLengthCache).forEach(key => delete seasonLengthCache[key]);
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
  
  // Season maximums
  let maxSeasonPassTDs = 0;
  let maxSeasonRushYds = 0, maxSeasonRushTDs = 0;
  let maxSeasonRecYds = 0, maxSeasonRecTDs = 0;
  let maxSeasonSacks = 0, maxSeasonInts = 0;
  
  stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season stats
    
    // Passing stats - debug what fields are available
    if (Math.random() < 0.001) { // Log 0.1% of seasons to see field names
      console.log('Football season stat fields:', Object.keys(season));
    }
    
    // FBGM passing stats - correct field names from documentation
    const passTDs = season.pssTD || 0;  // Passing TDs use pssTD in FBGM
    
    careerPassTDs += passTDs;
    maxSeasonPassTDs = Math.max(maxSeasonPassTDs, passTDs);
    
    // Debug passing stats when they exist
    if (passTDs > 15) {
      console.log(`Player with ${passTDs} passing TDs in season, career total so far: ${careerPassTDs}`);
    }
    
    // Rushing stats
    careerRushYds += season.rusYds || 0;
    careerRushTDs += season.rusTD || 0;
    maxSeasonRushYds = Math.max(maxSeasonRushYds, season.rusYds || 0);
    maxSeasonRushTDs = Math.max(maxSeasonRushTDs, season.rusTD || 0);
    
    // Receiving stats
    careerRecYds += season.recYds || 0;
    careerRecTDs += season.recTD || 0;
    maxSeasonRecYds = Math.max(maxSeasonRecYds, season.recYds || 0);
    maxSeasonRecTDs = Math.max(maxSeasonRecTDs, season.recTD || 0);
    
    // Defensive stats - FBGM uses 'sk' field, fallback to 'defSk'
    const seasonSacks = season.sk ?? season.defSk ?? 0;
    careerSacks += seasonSacks;
    careerInts += season.defInt || 0;
    maxSeasonSacks = Math.max(maxSeasonSacks, seasonSacks);
    maxSeasonInts = Math.max(maxSeasonInts, season.defInt || 0);
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
  
  // Set season achievements - FBGM doesn't track passing yards, only TDs
  achievements.season35PassTDs = maxSeasonPassTDs >= 35;
  achievements.season1800RushYds = maxSeasonRushYds >= 1600;
  achievements.season20RushTDs = maxSeasonRushTDs >= 20;
  achievements.season1400RecYds = maxSeasonRecYds >= 1400;
  achievements.season15RecTDs = maxSeasonRecTDs >= 15;
  achievements.season15Sacks = maxSeasonSacks >= 15;
  achievements.season8Ints = maxSeasonInts >= 8;
  
  // Awards (simplified for now)
  const awards = player.awards || [];
  
  // Debug: Log unique award types for football (temporary)
  if (awards.length > 0 && Math.random() < 0.05) { // Log 5% of players with awards
    const awardTypes = awards.map((a: any) => a.type);
    const uniqueTypes = Array.from(new Set(awardTypes));
    console.log('Football award types found:', uniqueTypes);
  }
  
  achievements.wonMVP = awards.some((a: any) => a.type === 'Most Valuable Player' || a.type === 'MVP');
  achievements.wonOPOY = awards.some((a: any) => a.type === 'Offensive Player of the Year' || a.type === 'OPOY');
  achievements.wonDPOY = awards.some((a: any) => a.type === 'Defensive Player of the Year' || a.type === 'DPOY');
  // ROY fix: FBGM has separate offensive and defensive ROY
  achievements.wonROY = awards.some((a: any) => 
    a.type === 'Rookie of the Year' || 
    a.type === 'ROY' || 
    a.type === 'Offensive Rookie of the Year' ||
    a.type === 'Defensive Rookie of the Year'
  );
}

// Calculate baseball-specific achievements
function calculateBaseballAchievements(player: Player, achievements: any): void {
  const stats = player.stats || [];
  
  // Career batting totals
  let careerHits = 0, careerHRs = 0, careerRBIs = 0, careerSBs = 0, careerRuns = 0;
  // Career pitching totals
  let careerWins = 0, careerKs = 0, careerSaves = 0;
  
  // Season maximums
  let maxSeasonHRs = 0, maxSeasonRBIs = 0, maxSeasonHits = 0, maxSeasonSBs = 0;
  let maxSeasonWins = 0, maxSeasonSaves = 0, maxSeasonKs = 0, minSeasonERA = 999;
  
  stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season stats
    
    // Batting stats
    careerHits += season.h || 0;
    careerHRs += season.hr || 0;
    careerRBIs += season.rbi || 0;
    careerSBs += season.sb || 0;
    careerRuns += season.r || 0;
    maxSeasonHRs = Math.max(maxSeasonHRs, season.hr || 0);
    maxSeasonRBIs = Math.max(maxSeasonRBIs, season.rbi || 0);
    maxSeasonHits = Math.max(maxSeasonHits, season.h || 0);
    maxSeasonSBs = Math.max(maxSeasonSBs, season.sb || 0);
    
    // Pitching stats - baseball uses soPit (strikeouts pitched), not so
    careerWins += season.w || 0;
    careerSaves += season.sv || 0;
    careerKs += season.soPit || 0; // Strikeouts pitched in baseball
    maxSeasonWins = Math.max(maxSeasonWins, season.w || 0);
    maxSeasonSaves = Math.max(maxSeasonSaves, season.sv || 0);
    maxSeasonKs = Math.max(maxSeasonKs, season.soPit || 0);
    
    // ERA (calculated from runs and innings)
    if (season.outs && season.outs > 0) {
      const innings = season.outs / 3; // Outs to innings
      const runs = season.er || season.rPit || 0; // Earned runs
      if (innings > 0) {
        const era = (runs * 9) / innings;
        if (era > 0) {
          minSeasonERA = Math.min(minSeasonERA, era);
        }
      }
    }
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
  
  // Set season achievements
  achievements.season50HRs = maxSeasonHRs >= 50;
  achievements.season130RBIs = maxSeasonRBIs >= 130;
  achievements.season200Hits = maxSeasonHits >= 200;
  achievements.season50SBs = maxSeasonSBs >= 50;
  achievements.season20Wins = maxSeasonWins >= 20;
  achievements.season40Saves = maxSeasonSaves >= 40;
  achievements.season300Ks = maxSeasonKs >= 300;
  achievements.season200ERA = minSeasonERA < 2.00 && minSeasonERA > 0;
  
  // Awards - Use EXACT ZGMB strings only (no aliases)
  const awards = player.awards || [];
  
  // Log ALL award types to debug what's actually in the ZGMB file
  if (awards.length > 0) {
    awards.forEach((award: any) => {
      console.log(`Baseball Award Found: "${award.type}" (season ${award.season})`);
    });
  }
  
  // EXACT award type matching per ZGMB specification
  achievements.wonMVP = awards.some((a: any) => a.type === 'Most Valuable Player');
  achievements.wonFinalsMVP = awards.some((a: any) => a.type === 'Finals MVP');
  achievements.wonPitcherOfYear = awards.some((a: any) => a.type === 'Pitcher of the Year');
  achievements.wonReliefPitcherOfYear = awards.some((a: any) => a.type === 'Relief Pitcher of the Year');
  achievements.wonROY = awards.some((a: any) => a.type === 'Rookie of the Year');
  
  // Note: All-Star not mentioned in ZGMB spec, keeping as-is
  achievements.madeAllStar = awards.some((a: any) => a.type === 'All-Star');
}

// Calculate hockey-specific achievements
function calculateHockeyAchievements(player: Player, achievements: any): void {
  const stats = player.stats || [];
  
  // Career totals (regular season only)
  let careerGoals = 0, careerAssists = 0, careerPoints = 0;
  let careerWins = 0, careerShutouts = 0;
  
  // Season maximums and tracking for multi-team seasons
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
  
  // Second pass: calculate career totals and season maximums
  let maxSeasonGoals = 0, maxSeasonAssists = 0, maxSeasonPoints = 0;
  let maxSeasonWins = 0, maxSeasonShutouts = 0, maxSeasonSavePct = 0;
  
  for (const seasonData of seasonStats.values()) {
    // Career totals
    careerGoals += seasonData.goals;
    careerAssists += seasonData.assists;
    careerPoints += seasonData.points;
    
    // Season maximums
    maxSeasonGoals = Math.max(maxSeasonGoals, seasonData.goals);
    maxSeasonAssists = Math.max(maxSeasonAssists, seasonData.assists);
    maxSeasonPoints = Math.max(maxSeasonPoints, seasonData.points);
    
    // Goalie stats (only for goalies)
    if (seasonData.isGoalie) {
      careerWins += seasonData.wins;
      careerShutouts += seasonData.shutouts;
      
      maxSeasonWins = Math.max(maxSeasonWins, seasonData.wins);
      maxSeasonShutouts = Math.max(maxSeasonShutouts, seasonData.shutouts);
      
      // Calculate save percentage for this season
      if (seasonData.shotsAgainst > 0) {
        const savePct = seasonData.saves / seasonData.shotsAgainst;
        maxSeasonSavePct = Math.max(maxSeasonSavePct, savePct);
      }
    }
  }
  
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
  
  // Debug high season performers
  if (maxSeasonGoals >= 20 || maxSeasonPoints >= 40) {
    console.log(`Hockey: ${player.firstName} ${player.lastName} - Best season: ${maxSeasonGoals}G, ${maxSeasonPoints}P`);
  }
  
  // Set season achievements - using EXACT user-specified NHL thresholds
  achievements.season50Goals = maxSeasonGoals >= 50;   // 50+ Goals Season
  achievements.season100Points = maxSeasonPoints >= 100; // 100+ Points Season
  achievements.season60Assists = maxSeasonAssists >= 60; // 60+ Assists Season
  achievements.season35Wins = maxSeasonWins >= 35;     // 35+ Wins Season (G)
  achievements.season10Shutouts = maxSeasonShutouts >= 10; // 10+ Shutouts Season (G)
  achievements.season925SavePct = maxSeasonSavePct >= 0.925; // .925+ Save % Season (G)
  
  // Awards - use exact ZGMH award type strings from documentation
  const awards = player.awards || [];
  
  // Debug: Log actual award types to see what strings are used in this league
  if (awards.length > 0 && Math.random() < 0.5) {  // 50% sample to catch more award types
    const awardTypes = awards.map((a: any) => a.type).join(', ');
    console.log('Hockey award types found:', awardTypes);
  }
  
  // Log ALL award types to debug what's actually in the ZGMH file
  if (awards.length > 0) {
    awards.forEach((award: any) => {
      console.log(`Hockey Award Found: "${award.type}" (season ${award.season})`);
    });
  }
  
  // Fix: Use correct achievement property names that match the definitions
  achievements.wonMVP = awards.some((a: any) => a.type === 'Most Valuable Player');
  achievements.wonDefensiveForward = awards.some((a: any) => a.type === 'Defensive Forward of the Year');
  achievements.wonGoalieOfYear = awards.some((a: any) => a.type === 'Goalie of the Year');
  achievements.wonROY = awards.some((a: any) => a.type === 'Rookie of the Year');
  achievements.wonPlayoffsMVP = awards.some((a: any) => a.type === 'Playoffs MVP');
  achievements.madeAllStar = awards.some((a: any) => a.type === 'All-Star');
  
  // Championship - need to derive from team data, not player awards
  // This is a placeholder - proper championship detection would require team season data
  achievements.wonChampionship = awards.some((a: any) => a.type === 'Won Championship');
}

// Calculate basketball-specific achievements
function calculateBasketballAchievements(player: Player, achievements: any): void {
  const stats = player.stats || [];
  
  // Career totals
  let careerPts = 0, careerReb = 0, careerAst = 0, careerStl = 0, careerBlk = 0, careerThree = 0;
  
  // Season maximums
  let maxSeasonPPG = 0, maxSeasonAPG = 0, maxSeasonRPG = 0, maxSeasonSPG = 0, maxSeasonBPG = 0;
  
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
    
    // Calculate per-game averages
    const gp = season.gp || 1;
    maxSeasonPPG = Math.max(maxSeasonPPG, (season.pts || 0) / gp);
    maxSeasonAPG = Math.max(maxSeasonAPG, (season.ast || 0) / gp);
    maxSeasonRPG = Math.max(maxSeasonRPG, seasonRebounds / gp);
    maxSeasonSPG = Math.max(maxSeasonSPG, (season.stl || 0) / gp);
    maxSeasonBPG = Math.max(maxSeasonBPG, (season.blk || 0) / gp);
  });
  
  // Set career achievements
  achievements.career20kPoints = careerPts >= 20000;
  achievements.career10kRebounds = careerReb >= 10000;
  achievements.career5kAssists = careerAst >= 5000;
  achievements.career2kSteals = careerStl >= 2000;
  achievements.career1500Blocks = careerBlk >= 1500;
  achievements.career2kThrees = careerThree >= 2000;
  
  // Set season achievements
  achievements.season30ppg = maxSeasonPPG >= 30;
  achievements.season10apg = maxSeasonAPG >= 10;
  achievements.season15rpg = maxSeasonRPG >= 15;
  achievements.season25spg = maxSeasonSPG >= 2.5;
  achievements.season3bpg = maxSeasonBPG >= 3;
  
  // 50/40/90 Season calculation
  let has504090Season = false;
  stats.forEach((season: any) => {
    if (season.playoffs) return;
    const gp = season.gp || 1;
    
    // Need sufficient attempts to qualify
    if (gp >= 41) { // At least half season
      const fg = season.fg || 0;
      const fga = season.fga || 0;
      const threes = season.tpm || season.tp || season.fg3 || 0;
      const tpa = season.tpa || 0;
      const ft = season.ft || 0;
      const fta = season.fta || 0;
      
      // Calculate percentages (handle both 0-1 and 0-100 formats)
      let fgPct = 0, tpPct = 0, ftPct = 0;
      
      if (fga > 0) {
        fgPct = fg / fga;
        if (fgPct > 1) fgPct = fgPct / 100; // Convert from percentage
      }
      if (tpa > 0) {
        tpPct = threes / tpa;
        if (tpPct > 1) tpPct = tpPct / 100;
      }
      if (fta > 0) {
        ftPct = ft / fta;
        if (ftPct > 1) ftPct = ftPct / 100;
      }
      
      // Check 50/40/90 thresholds with minimum attempts
      if (fgPct >= 0.50 && tpPct >= 0.40 && ftPct >= 0.90 &&
          fga >= 300 && tpa >= 55 && fta >= 125) {
        has504090Season = true;
      }
    }
  });
  achievements.season504090 = has504090Season;
  
  // Awards
  const awards = player.awards || [];
  // Fix award detection - try multiple possible award strings
  achievements.hasMVP = awards.some((a: any) => 
    a.type === 'Most Valuable Player' || a.type === 'MVP' || a.type === 'Regular Season MVP'
  );
  achievements.hasDPOY = awards.some((a: any) => 
    a.type === 'Defensive Player of the Year' || a.type === 'DPOY'
  );
  achievements.hasROY = awards.some((a: any) => 
    a.type === 'Rookie of the Year' || a.type === 'ROY'
  );
  achievements.wonSixMOY = awards.some((a: any) => 
    a.type === 'Sixth Man of the Year' || a.type === 'SMOY' || a.type === 'Sixth Man'
  );
  achievements.wonFinalsMVP = awards.some((a: any) => 
    a.type === 'Finals MVP' || a.type === 'Playoffs MVP'
  );
  achievements.hasAllStar = awards.some((a: any) => 
    a.type === 'All-Star' || a.type === 'All Star'
  );
  achievements.wonChampionship = awards.some((a: any) => a.type === 'Won Championship');
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
  achievements.played15PlusSeasons = seasonCount >= 12;  // Lower for shorter league
  
  // Debug career length for anyone with 8+ seasons
  if (seasonCount >= 8) {
    console.log(`Hockey: ${player.firstName} ${player.lastName} played ${seasonCount} seasons`);
  }
  
  // Location  
  achievements.bornOutsideUS50DC = player.born?.loc && !isUSState(player.born.loc);
  
  // Hall of Fame - check awards only (hof property doesn't exist in Player type)
  const awards = player.awards || [];
  achievements.isHallOfFamer = awards.some((a: any) => a.type === 'Inducted into the Hall of Fame');
}

// Helper function to check if location is a US state
function isUSState(location: string): boolean {
  const usStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];
  return usStates.includes(location);
}

// Calculate team seasons and achievement seasons for same-season alignment
export function calculateTeamSeasonsAndAchievementSeasons(player: Player, leadershipMap: any, gameAttributes: any): void {
  // Initialize if not exists
  if (!player.teamSeasonsPaired) {
    player.teamSeasonsPaired = new Set<string>();
  }
  if (!player.achievementSeasons) {
    player.achievementSeasons = {
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
      isPick1Overall: new Set<number>(),
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
export function getViableAchievements(players: Player[], minCount = 15, sport?: 'basketball' | 'football' | 'hockey' | 'baseball'): Achievement[] {
  const achievements = getAchievements(sport);
  
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