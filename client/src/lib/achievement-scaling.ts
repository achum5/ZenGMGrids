import type { Player, LeagueData } from "@/types/bbgm";
import type { Achievement } from "./achievements";

/**
 * League maturity levels that determine scaling factors
 */
export type LeagueMaturity = 'very_small' | 'small' | 'medium' | 'mature';

/**
 * League maturity analysis results
 */
export interface LeagueMaturityAnalysis {
  maturity: LeagueMaturity;
  totalSeasons: number;
  totalPlayers: number;
  playersWithMajorAchievements: number;
  scalingFactor: number;
  reasoning: string;
}

/**
 * Scalable stat configuration for different achievement types
 */
interface ScalableStatConfig {
  sport: string;
  statType: 'career' | 'season';
  achievementId: string;
  baseThreshold: number;
  label: (threshold: number) => string;
  testFieldPath: string; // dot notation path to the stat field
}

/**
 * Predefined scalable achievements with their base thresholds
 */
const SCALABLE_ACHIEVEMENTS: ScalableStatConfig[] = [
  // Basketball career achievements
  {
    sport: 'basketball',
    statType: 'career',
    achievementId: 'career20kPoints',
    baseThreshold: 20000,
    label: (n) => `${n.toLocaleString()}+ Career Points`,
    testFieldPath: 'pts'
  },
  {
    sport: 'basketball',
    statType: 'career',
    achievementId: 'career10kRebounds',
    baseThreshold: 10000,
    label: (n) => `${n.toLocaleString()}+ Career Rebounds`,
    testFieldPath: 'trb'
  },
  {
    sport: 'basketball',
    statType: 'career',
    achievementId: 'career5kAssists',
    baseThreshold: 5000,
    label: (n) => `${n.toLocaleString()}+ Career Assists`,
    testFieldPath: 'ast'
  },
  {
    sport: 'basketball',
    statType: 'career',
    achievementId: 'career2kSteals',
    baseThreshold: 2000,
    label: (n) => `${n.toLocaleString()}+ Career Steals`,
    testFieldPath: 'stl'
  },
  {
    sport: 'basketball',
    statType: 'career',
    achievementId: 'career1500Blocks',
    baseThreshold: 1500,
    label: (n) => `${n.toLocaleString()}+ Career Blocks`,
    testFieldPath: 'blk'
  },
  {
    sport: 'basketball',
    statType: 'career',
    achievementId: 'career2kThrees',
    baseThreshold: 2000,
    label: (n) => `${n.toLocaleString()}+ Made Threes`,
    testFieldPath: 'tpm'
  },
  
  // Football career achievements
  {
    sport: 'football',
    statType: 'career',
    achievementId: 'career300PassTDs',
    baseThreshold: 150, // Already scaled down in original
    label: (n) => `${n}+ Career Pass TDs`,
    testFieldPath: 'pssTD'
  },
  {
    sport: 'football',
    statType: 'career',
    achievementId: 'career12kRushYds',
    baseThreshold: 8000, // Already scaled down in original
    label: (n) => `${n.toLocaleString()}+ Career Rush Yards`,
    testFieldPath: 'rusYds'
  },
  {
    sport: 'football',
    statType: 'career',
    achievementId: 'career100RushTDs',
    baseThreshold: 40, // Already scaled down in original
    label: (n) => `${n}+ Career Rush TDs`,
    testFieldPath: 'rusTD'
  },
  {
    sport: 'football',
    statType: 'career',
    achievementId: 'career12kRecYds',
    baseThreshold: 6000, // Already scaled down in original
    label: (n) => `${n.toLocaleString()}+ Career Rec Yards`,
    testFieldPath: 'recYds'
  },
  {
    sport: 'football',
    statType: 'career',
    achievementId: 'career100RecTDs',
    baseThreshold: 40, // Already scaled down in original
    label: (n) => `${n}+ Career Rec TDs`,
    testFieldPath: 'recTD'
  },
  {
    sport: 'football',
    statType: 'career',
    achievementId: 'career100Sacks',
    baseThreshold: 60, // Already scaled down in original
    label: (n) => `${n}+ Career Sacks`,
    testFieldPath: 'sk'
  },
  {
    sport: 'football',
    statType: 'career',
    achievementId: 'career20Ints',
    baseThreshold: 20,
    label: (n) => `${n}+ Career Interceptions`,
    testFieldPath: 'defInt'
  },
  
  // Hockey career achievements
  {
    sport: 'hockey',
    statType: 'career',
    achievementId: 'career500Goals',
    baseThreshold: 500,
    label: (n) => `${n}+ Career Goals`,
    testFieldPath: 'goals'
  },
  {
    sport: 'hockey',
    statType: 'career',
    achievementId: 'career1000Points',
    baseThreshold: 1000,
    label: (n) => `${n.toLocaleString()}+ Career Points`,
    testFieldPath: 'points'
  },
  {
    sport: 'hockey',
    statType: 'career',
    achievementId: 'career500Assists',
    baseThreshold: 500,
    label: (n) => `${n}+ Career Assists`,
    testFieldPath: 'assists'
  },
  {
    sport: 'hockey',
    statType: 'career',
    achievementId: 'career200Wins',
    baseThreshold: 200,
    label: (n) => `${n}+ Career Wins (G)`,
    testFieldPath: 'wins'
  },
  {
    sport: 'hockey',
    statType: 'career',
    achievementId: 'career50Shutouts',
    baseThreshold: 50,
    label: (n) => `${n}+ Career Shutouts (G)`,
    testFieldPath: 'shutouts'
  },
  
  // Baseball career achievements
  {
    sport: 'baseball',
    statType: 'career',
    achievementId: 'career3000Hits',
    baseThreshold: 3000,
    label: (n) => `${n.toLocaleString()}+ Career Hits`,
    testFieldPath: 'h'
  },
  {
    sport: 'baseball',
    statType: 'career',
    achievementId: 'career500HRs',
    baseThreshold: 500,
    label: (n) => `${n}+ Career Home Runs`,
    testFieldPath: 'hr'
  },
  {
    sport: 'baseball',
    statType: 'career',
    achievementId: 'career1500RBIs',
    baseThreshold: 1500,
    label: (n) => `${n.toLocaleString()}+ Career RBIs`,
    testFieldPath: 'rbi'
  },
  {
    sport: 'baseball',
    statType: 'career',
    achievementId: 'career400SBs',
    baseThreshold: 400,
    label: (n) => `${n}+ Career Stolen Bases`,
    testFieldPath: 'sb'
  },
  {
    sport: 'baseball',
    statType: 'career',
    achievementId: 'career1800Runs',
    baseThreshold: 1800,
    label: (n) => `${n.toLocaleString()}+ Career Runs`,
    testFieldPath: 'r'
  },
  {
    sport: 'baseball',
    statType: 'career',
    achievementId: 'career300Wins',
    baseThreshold: 300,
    label: (n) => `${n}+ Career Wins (P)`,
    testFieldPath: 'w'
  },
  {
    sport: 'baseball',
    statType: 'career',
    achievementId: 'career3000Ks',
    baseThreshold: 3000,
    label: (n) => `${n.toLocaleString()}+ Career Strikeouts`,
    testFieldPath: 'soPit'
  },
  {
    sport: 'baseball',
    statType: 'career',
    achievementId: 'career300Saves',
    baseThreshold: 300,
    label: (n) => `${n}+ Career Saves`,
    testFieldPath: 'sv'
  }
];

/**
 * Analyze league maturity based on multiple factors
 */
export function analyzeLeagueMaturity(leagueData: LeagueData): LeagueMaturityAnalysis {
  const { players, sport } = leagueData;
  
  // Calculate total unique seasons
  const uniqueSeasons = new Set<number>();
  players.forEach(player => {
    if (player.stats) {
      player.stats.forEach(stat => uniqueSeasons.add(stat.season));
    }
  });
  const totalSeasons = uniqueSeasons.size;
  
  // Count players with major career achievements
  const majorAchievementPlayers = countPlayersWithMajorAchievements(players, sport || 'basketball');
  
  // Determine maturity level and scaling factor
  let maturity: LeagueMaturity;
  let scalingFactor: number;
  let reasoning: string;
  
  if (totalSeasons < 8) {
    maturity = 'very_small';
    scalingFactor = 0.25; // 25% of original thresholds
    reasoning = `Very small league: ${totalSeasons} seasons, ${majorAchievementPlayers} players with major achievements`;
  } else if (totalSeasons < 15) {
    maturity = 'small';
    scalingFactor = 0.45; // 45% of original thresholds
    reasoning = `Small league: ${totalSeasons} seasons, ${majorAchievementPlayers} players with major achievements`;
  } else if (totalSeasons < 25) {
    maturity = 'medium';
    scalingFactor = 0.75; // 75% of original thresholds
    reasoning = `Medium league: ${totalSeasons} seasons, ${majorAchievementPlayers} players with major achievements`;
  } else {
    maturity = 'mature';
    scalingFactor = 1.0; // No scaling
    reasoning = `Mature league: ${totalSeasons} seasons, ${majorAchievementPlayers} players with major achievements`;
  }
  
  // Adjust scaling based on player counts with achievements
  const totalPlayers = players.length;
  const achievementRate = totalPlayers > 0 ? majorAchievementPlayers / totalPlayers : 0;
  
  // If achievement rate is very low (< 2%), increase scaling slightly
  if (achievementRate < 0.02 && maturity !== 'very_small') {
    scalingFactor *= 0.85;
    reasoning += `. Low achievement rate (${(achievementRate * 100).toFixed(1)}%) - applied additional scaling`;
  }
  
  return {
    maturity,
    totalSeasons,
    totalPlayers,
    playersWithMajorAchievements: majorAchievementPlayers,
    scalingFactor,
    reasoning
  };
}

/**
 * Count players who have achieved major career milestones
 */
function countPlayersWithMajorAchievements(players: Player[], sport: string): number {
  let count = 0;
  
  for (const player of players) {
    if (!player.achievements) continue;
    
    // Check for major career achievements based on sport
    if (sport === 'basketball') {
      if (player.achievements.career20kPoints || 
          player.achievements.career10kRebounds || 
          player.achievements.career5kAssists) {
        count++;
        continue;
      }
    } else if (sport === 'football') {
      if (player.achievements.career300PassTDs || 
          player.achievements.career12kRushYds || 
          player.achievements.career12kRecYds) {
        count++;
        continue;
      }
    } else if (sport === 'hockey') {
      if (player.achievements.career500Goals || 
          player.achievements.career1000Points || 
          player.achievements.career500Assists) {
        count++;
        continue;
      }
    } else if (sport === 'baseball') {
      if (player.achievements.career3000Hits || 
          player.achievements.career500HRs || 
          player.achievements.career300Wins) {
        count++;
        continue;
      }
    }
    
    // Also count hall of fame as major achievement
    if (player.achievements.isHallOfFamer) {
      count++;
    }
  }
  
  return count;
}

/**
 * Round a threshold to a nice clean number
 */
function roundToNiceNumber(value: number): number {
  if (value <= 0) return 0;
  
  // Handle very small numbers (< 10)
  if (value < 10) {
    return Math.max(1, Math.round(value));
  }
  
  // Handle small numbers (10-100)
  if (value < 100) {
    return Math.round(value / 5) * 5; // Round to nearest 5
  }
  
  // Handle medium numbers (100-1000)
  if (value < 1000) {
    if (value < 500) {
      return Math.round(value / 25) * 25; // Round to nearest 25
    } else {
      return Math.round(value / 50) * 50; // Round to nearest 50
    }
  }
  
  // Handle large numbers (1000+)
  if (value < 10000) {
    return Math.round(value / 100) * 100; // Round to nearest 100
  }
  
  // Handle very large numbers (10000+)
  if (value < 100000) {
    return Math.round(value / 500) * 500; // Round to nearest 500
  }
  
  // Handle extremely large numbers
  return Math.round(value / 1000) * 1000; // Round to nearest 1000
}

/**
 * Create scaled versions of achievements based on league maturity
 */
export function createScaledAchievements(
  originalAchievements: Achievement[], 
  leagueData: LeagueData
): Achievement[] {
  const maturityAnalysis = analyzeLeagueMaturity(leagueData);
  
  // If league is mature, return original achievements
  if (maturityAnalysis.maturity === 'mature') {
    return originalAchievements;
  }
  
  const { sport, players } = leagueData;
  const scaledAchievements: Achievement[] = [];
  
  // Process each original achievement
  for (const achievement of originalAchievements) {
    // Find if this achievement is scalable
    const scalableConfig = SCALABLE_ACHIEVEMENTS.find(
      config => config.achievementId === achievement.id && config.sport === sport
    );
    
    if (scalableConfig) {
      // Create scaled version
      const scaledThreshold = roundToNiceNumber(
        scalableConfig.baseThreshold * maturityAnalysis.scalingFactor
      );
      
      // Only scale if the new threshold is meaningfully different and reasonable
      if (scaledThreshold !== scalableConfig.baseThreshold && scaledThreshold > 0) {
        const scaledAchievement: Achievement = {
          ...achievement,
          label: scalableConfig.label(scaledThreshold),
          test: (player: Player) => {
            return getCareerStatTotal(player, scalableConfig.testFieldPath) >= scaledThreshold;
          }
        };
        
        scaledAchievements.push(scaledAchievement);
        continue;
      }
    }
    
    // If not scalable or scaling didn't make sense, keep original
    scaledAchievements.push(achievement);
  }
  
  return scaledAchievements;
}

/**
 * Get career total for a stat field using dot notation path
 */
function getCareerStatTotal(player: Player, statFieldPath: string): number {
  if (!player.stats) return 0;
  
  let total = 0;
  for (const stat of player.stats) {
    if (stat.playoffs) continue; // Only regular season
    
    // Handle dot notation paths (future extensibility)
    const fieldParts = statFieldPath.split('.');
    let value: any = stat;
    
    for (const part of fieldParts) {
      value = value?.[part];
      if (value === undefined || value === null) {
        value = 0;
        break;
      }
    }
    
    total += Number(value) || 0;
  }
  
  return total;
}

/**
 * Debug function to test scaling on a league
 */
export function debugScaling(leagueData: LeagueData): void {
  const analysis = analyzeLeagueMaturity(leagueData);
  console.log('🔍 League Maturity Analysis:', analysis);
  
  const { sport } = leagueData;
  const relevantConfigs = SCALABLE_ACHIEVEMENTS.filter(config => config.sport === sport);
  
  console.log('📊 Scaling Preview:');
  for (const config of relevantConfigs) {
    const scaledThreshold = roundToNiceNumber(config.baseThreshold * analysis.scalingFactor);
    console.log(`  ${config.achievementId}:`, 
      `${config.baseThreshold.toLocaleString()} → ${scaledThreshold.toLocaleString()}`,
      `(${config.label(scaledThreshold)})`
    );
  }
}