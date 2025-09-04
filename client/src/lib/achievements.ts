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
  // Note: Single-season awards removed from game entirely
  // hasMVP, hasDPOY, hasROY, wonSixMOY, wonFinalsMVP, hasAllStar, wonChampionship
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
  'ledScoringAny', 'ledRebAny', 'ledAstAny'
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
      // Note: Single season achievements removed from game
      // season30ppg: new Set<number>(),
      // season10apg: new Set<number>(),
      // season15rpg: new Set<number>(),
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
      // isPick1Overall: new Set<number>(),
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