import type { Achievement } from './achievements';
import type { Player } from '@/types/bbgm';

// Pattern to match numerical thresholds in achievement labels
export interface ParsedAchievement {
  originalLabel: string;
  prefix: string;     // Text before the number
  number: number;     // The numerical threshold (now supports decimals)
  suffix: string;     // Text after the number
  isEditable: boolean; // Whether this achievement has an editable number
}

// Regex patterns for different numerical achievement formats
// Order matters! Decimal-aware patterns must come BEFORE comma-separated patterns
const ACHIEVEMENT_PATTERNS = [
  // Percentage achievements (e.g., "60%+ TS on 20+ PPG (Season)", "90%+ FT (Season)", "40%+ 3PT (Season)")
  /^([^.\d]*?)(\d+(?:\.\d+)?)\%\+\s*(TS on \d+\+ PPG|eFG|FT|3PT)\s*\(Season\)(.*)$/i,
  // "1 PPG (Season)" or "30 PPG (Season)" or "2.5 BPG (Season)" - season stats without +
  /^([^.\d]*?)(\d+(?:\.\d+)?)\s*(PPG|RPG|APG|SPG|BPG|FG%|3P%|FT%|eFG%|TS%|PER|WS|BPM|VORP|USG%|TOV%|ORB%|DRB%|AST%|STL%|BLK%)\s*\(Season\)(.*)$/i,
  // "Age 40+" 
  /^(.* )(\d+(?:\.\d+)?)\+(.*)$/,
  // "15+ Seasons" or "30+ PPG" or "2.5+ BPG"
  /^([^.\d]*?)(\d+(?:\.\d+)?)\+(.*)$/,
  // "Played at Age 40+"
  /^(.* Age )(\d+(?:\.\d+)?)\+(.*)$/,
  // Generic pattern for numbers followed by units (including decimals)
  /^([^.\d]*?)(\d+(?:\.\d+)?)\s*(Points?|Rebounds?|Assists?|Steals?|Blocks?|Games?|Minutes?|Shots?|FGA?|FGM?|3PA?|3PM?|FTA?|FTM?|Pass Yds?|Rush Yds?|Rec Yds?|Sacks?|Interceptions?)(.*)$/,
  // "2,000+ Career Points" or "700+ Assists in a Season" - MUST come after decimal patterns
  // Modified to NOT match if there's a decimal point before the number
  /^((?:(?!\d+\.\d+).)*?)(\d{1,3}(?:,\d{3})*)\+(.*)$/,
];

/**
 * Parse an achievement label to identify if it contains an editable numerical threshold
 * Only basketball achievements are editable for now
 */
export function parseAchievementLabel(label: string, sport?: string): ParsedAchievement {
  // Try each pattern to find numerical thresholds
  for (const pattern of ACHIEVEMENT_PATTERNS) {
    const match = label.match(pattern);
    if (match) {
      let prefix: string, numberStr: string, suffix: string;
      
      // Handle different capture group patterns
      if (match.length === 5 && match[3] && !match[4]) {
        // Pattern 24 (season stats): [full, prefix, number, unit, suffix]
        [, prefix, numberStr, , suffix] = match;
        // For season stats, reconstruct the suffix to include the unit and (Season)
        const unit = match[3];
        if (label.includes('+')) {
          suffix = `+ ${unit} (Season)${suffix}`;
        } else {
          suffix = ` ${unit} (Season)${suffix}`;
        }
      } else if (match.length === 5 && match[3] && match[4]) {
        // Percentage patterns: [full, prefix, number, unit, suffix]
        [, prefix, numberStr, , suffix] = match;
        const unit = match[3];
        suffix = `%+ ${unit} (Season)${suffix}`;
      } else {
        // Standard patterns: [full, prefix, number, suffix]
        [, prefix, numberStr, suffix] = match;
      }
      
      // Remove commas and parse as float to support decimals
      const number = parseFloat(numberStr.replace(/,/g, ''));
      
      if (!isNaN(number)) {
        return {
          originalLabel: label,
          prefix: prefix || '',
          number,
          suffix: suffix || '',
          isEditable: sport === 'basketball' || sport === 'football' || sport === 'hockey' || sport === 'baseball' // Only basketball, football, hockey, and baseball achievements are editable
        };
      }
    }
  }
  
  // If no numerical pattern found, return as non-editable
  return {
    originalLabel: label,
    prefix: label,
    number: 0,
    suffix: '',
    isEditable: false
  };
}

/**
 * Generate a new achievement label with a different numerical threshold
 */
export function generateUpdatedLabel(parsed: ParsedAchievement, newNumber: number, operator?: '≥' | '≤'): string {
  if (!parsed.isEditable) {
    return parsed.originalLabel;
  }

  // Format the number part of the label
  const formattedNumber = newNumber.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });

  const cleanSuffix = parsed.suffix.replace(/^\+\s*/, '').trim();
  const cleanPrefix = parsed.prefix.trim();

  // Handle 'less than or equal to' cases
  if (operator === '≤') {
    if (parsed.originalLabel.toLowerCase().includes('age')) {
      return `Played at Age ${formattedNumber} or younger`;
    }
    if (cleanSuffix.includes('%')) {
      const stat = cleanSuffix.replace('%', '').trim();
      return `${formattedNumber}% or less ${stat}`;
    } else {
      // For counting stats, rephrase to "[number] [prefix] [stat] or fewer"
      return `${formattedNumber} ${cleanPrefix} ${cleanSuffix} or fewer`;
    }
  }

  // Handle 'greater than or equal to' cases (default)
  if (cleanSuffix.includes('%')) {
    const stat = cleanSuffix.replace('%', '').trim();
    return `${formattedNumber}%+ ${stat}`;
  }
  
  // For labels that don't originally have a "+", like "30 PPG (Season)"
  if (!parsed.originalLabel.includes('+')) {
      return `${cleanPrefix} ${formattedNumber} ${cleanSuffix}`;
  }

  return `${cleanPrefix} ${formattedNumber}+ ${cleanSuffix}`;
}

/**
 * Create a dynamic achievement with a custom numerical threshold
 */
export function createCustomNumericalAchievement(
  baseAchievement: Achievement, 
  newThreshold: number,
  sport: string,
  operator: '≥' | '≤'
): Achievement {
  const parsed = parseAchievementLabel(baseAchievement.label, sport);
  
  if (!parsed.isEditable) {
    return baseAchievement; // Return original if not editable
  }
  
  const newLabel = generateUpdatedLabel(parsed, newThreshold, operator);
  
  // Generate new test function based on achievement type patterns
  const newTestFunction = generateTestFunction(baseAchievement, parsed, newThreshold, sport, operator);
  
  const operatorStr = operator === '≤' ? 'lte' : 'gte';
  
  return {
    ...baseAchievement,
    id: `${baseAchievement.id}_custom_${newThreshold}_${operatorStr}`,
    label: newLabel,
    test: newTestFunction
  };
}

/**
 * Generate a new test function for custom numerical thresholds
 */
function generateTestFunction(
  baseAchievement: Achievement, 
  parsed: ParsedAchievement, 
  newThreshold: number,
  sport: string,
  operator: '≥' | '≤'
): (player: Player) => boolean {
  const originalLabel = parsed.originalLabel.toLowerCase();
  
  // Handle football-specific achievements
  // Handle hockey-specific achievements
  if (sport === 'hockey') {
    // Career achievements for hockey
    if (originalLabel.includes('career')) {
      if (originalLabel.includes('goals')) {
        return (player: Player) => checkCareerTotal(player, 'goals', newThreshold, operator);
      }
      if (originalLabel.includes('assists')) {
        return (player: Player) => checkCareerTotal(player, 'assists', newThreshold, operator);
      }
      if (originalLabel.includes('points')) {
        return (player: Player) => checkCareerTotal(player, 'points', newThreshold, operator);
      }
      if (originalLabel.includes('wins (g)')) {
        return (player: Player) => checkCareerTotal(player, 'wins', newThreshold, operator);
      }
      if (originalLabel.includes('shutouts (g)')) {
        return (player: Player) => checkCareerTotal(player, 'shutouts', newThreshold, operator);
      }
    }

    // Season achievements for hockey
    if (originalLabel.includes('season') && !originalLabel.includes('seasons')) {
      if (originalLabel.includes('goals')) {
        return (player: Player) => checkSeasonTotal(player, 'goals', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('assists')) {
        return (player: Player) => checkSeasonTotal(player, 'assists', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('points')) {
        return (player: Player) => checkSeasonTotal(player, 'points', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('plus/minus')) {
        return (player: Player) => checkSeasonTotal(player, 'pm', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('shots')) {
        return (player: Player) => checkSeasonTotal(player, 's', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('hits')) {
        return (player: Player) => checkSeasonTotal(player, 'hit', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('blocks')) {
        return (player: Player) => checkSeasonTotal(player, 'blk', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('takeaways')) {
        return (player: Player) => checkSeasonTotal(player, 'tk', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('power-play points')) {
        return (player: Player) => checkSeasonTotal(player, 'powerPlayPoints', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('short-handed goals')) {
        return (player: Player) => checkSeasonTotal(player, 'shG', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('game-winning goals')) {
        return (player: Player) => checkSeasonTotal(player, 'gwG', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('faceoff win rate')) {
        return (player: Player) => checkSeasonPercentage(player, 'faceoffPct', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('toi per game')) {
        return (player: Player) => checkSeasonAverage(player, 'toiPerGame', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('pim')) {
        return (player: Player) => checkSeasonTotal(player, 'pim', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('save percentage')) {
        return (player: Player) => checkSeasonPercentage(player, 'savePct', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('gaa')) {
        return (player: Player) => checkSeasonAverage(player, 'gaaRate', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('shutouts')) {
        return (player: Player) => checkSeasonTotal(player, 'so', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('saves')) {
        return (player: Player) => checkSeasonTotal(player, 'sv', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('starts')) {
        return (player: Player) => checkSeasonTotal(player, 'gs', newThreshold, operator, 1, sport);
      }
    }
  } else if (sport === 'football') {
    // Career achievements for football
    if (originalLabel.includes('career')) {
      if (originalLabel.includes('pass yds')) {
        return (player: Player) => checkCareerTotal(player, 'pssYds', newThreshold, operator, sport);
      }
      if (originalLabel.includes('rush yds')) {
        return (player: Player) => checkCareerTotal(player, 'rusYds', newThreshold, operator, sport);
      }
      if (originalLabel.includes('rec yds')) {
        return (player: Player) => checkCareerTotal(player, 'recYds', newThreshold, operator, sport);
      }
      if (originalLabel.includes('sacks')) {
        return (player: Player) => checkCareerTotal(player, ['sks', 'defSk'], newThreshold, operator, sport);
      }
      if (originalLabel.includes('interceptions')) {
        return (player: Player) => checkCareerTotal(player, 'defInt', newThreshold, operator, sport);
      }
      if (originalLabel.includes('rush tds')) {
        return (player: Player) => checkCareerTotal(player, 'rusTD', newThreshold, operator, sport);
      }
      if (originalLabel.includes('rec tds')) {
        return (player: Player) => checkCareerTotal(player, 'recTD', newThreshold, operator, sport);
      }
      if (originalLabel.includes('tackles')) {
        return (player: Player) => checkCareerTotal(player, 'defTck', newThreshold, operator, sport);
      }
      if (originalLabel.includes('fumbles')) {
        return (player: Player) => checkCareerTotal(player, 'ff', newThreshold, operator, sport);
      }
    }

    // Season achievements for football
    if (originalLabel.includes('season') && !originalLabel.includes('seasons')) {
      if (originalLabel.includes('pass yds')) {
        return (player: Player) => checkSeasonTotal(player, 'pssYds', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('rush yds')) {
        return (player: Player) => checkSeasonTotal(player, 'rusYds', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('rec yds')) {
        return (player: Player) => checkSeasonTotal(player, 'recYds', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('sacks')) {
        return (player: Player) => checkSeasonTotal(player, ['sks', 'defSk'], newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('tackles')) {
        return (player: Player) => checkSeasonTotal(player, 'defTck', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('interceptions')) {
        return (player: Player) => checkSeasonTotal(player, 'defInt', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('fumbles')) {
        return (player: Player) => checkSeasonTotal(player, 'ff', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('pass tds')) {
        return (player: Player) => checkSeasonTotal(player, 'pssTD', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('rush tds')) {
        return (player: Player) => checkSeasonTotal(player, 'rusTD', newThreshold, operator, 1, sport);
      }
      if (originalLabel.includes('rec tds')) {
        return (player: Player) => checkSeasonTotal(player, 'recTD', newThreshold, operator, 1, sport);
      }
    }
  } else if (sport === 'baseball') {
    // Career achievements for baseball
    if (originalLabel.includes('career')) {
      if (originalLabel.includes('hits')) {
        return (player: Player) => checkCareerTotal(player, 'h', newThreshold, operator, sport);
      }
      if (originalLabel.includes('home runs')) {
        return (player: Player) => checkCareerTotal(player, 'hr', newThreshold, operator, sport);
      }
      if (originalLabel.includes('rbis')) {
        return (player: Player) => checkCareerTotal(player, 'rbi', newThreshold, operator, sport);
      }
      if (originalLabel.includes('stolen bases')) {
        return (player: Player) => checkCareerTotal(player, 'sb', newThreshold, operator, sport);
      }
      if (originalLabel.includes('runs')) {
        return (player: Player) => checkCareerTotal(player, 'r', newThreshold, operator, sport);
      }
      if (originalLabel.includes('wins (p)')) {
        return (player: Player) => checkCareerTotal(player, 'w', newThreshold, operator, sport);
      }
      if (originalLabel.includes('strikeouts')) {
        return (player: Player) => checkCareerTotal(player, 'soPit', newThreshold, operator, sport);
      }
      if (originalLabel.includes('saves')) {
        return (player: Player) => checkCareerTotal(player, 'sv', newThreshold, operator, sport);
      }
    }
  } else {
    // Default to basketball logic
    // Default to basketball logic
    // Career achievements - check career totals
    if (originalLabel.includes('career')) {
      if (originalLabel.includes('points')) {
        return (player: Player) => checkCareerTotal(player, 'pts', newThreshold, operator, sport);
      }
      if (originalLabel.includes('rebounds')) {
        return (player: Player) => checkCareerTotal(player, 'trb', newThreshold, operator, sport);
      }
      if (originalLabel.includes('assists')) {
        return (player: Player) => checkCareerTotal(player, 'ast', newThreshold, operator, sport);
      }
      if (originalLabel.includes('steals')) {
        return (player: Player) => checkCareerTotal(player, 'stl', newThreshold, operator, sport);
      }
      if (originalLabel.includes('blocks')) {
        return (player: Player) => checkCareerTotal(player, 'blk', newThreshold, operator, sport);
      }
      if (originalLabel.includes('3pm') || originalLabel.includes('threes')) {
        return (player: Player) => checkCareerTotal(player, 'tpm', newThreshold, operator, sport);
      }
    }

    // Season achievements - check single season bests
    if (originalLabel.includes('season') && !originalLabel.includes('seasons')) {
      if (originalLabel.includes('points') && !originalLabel.includes('ppg')) {
        return (player: Player) => checkSeasonTotal(player, 'pts', newThreshold, operator, 10, sport);
      }
      if (originalLabel.includes('assists') && !originalLabel.includes('apg')) {
        return (player: Player) => checkSeasonTotal(player, 'ast', newThreshold, operator, 10, sport);
      }
      if (originalLabel.includes('rebounds') && !originalLabel.includes('rpg')) {
        return (player: Player) => checkSeasonTotal(player, 'trb', newThreshold, operator, 10, sport);
      }
      if (originalLabel.includes('steals')) {
        return (player: Player) => checkSeasonTotal(player, 'stl', newThreshold, operator, 10, sport);
      }
      if (originalLabel.includes('blocks')) {
        return (player: Player) => checkSeasonTotal(player, 'blk', newThreshold, operator, 10, sport);
      }
      if (originalLabel.includes('3pm') || originalLabel.includes('threes')) {
        return (player: Player) => checkSeasonTotal(player, 'tpm', newThreshold, operator, 10, sport);
      }
      if (originalLabel.includes('games')) {
        return (player: Player) => checkSeasonTotal(player, 'gp', newThreshold, operator, 1, sport);
      }

      // Per-game averages
      if (originalLabel.includes('ppg')) {
        return (player: Player) => checkSeasonAverage(player, 'pts', newThreshold, operator, 10, sport);
      }
      if (originalLabel.includes('rpg')) {
        return (player: Player) => checkSeasonAverage(player, 'trb', newThreshold, operator, 10, sport);
      }
      if (originalLabel.includes('apg')) {
        return (player: Player) => checkSeasonAverage(player, 'ast', newThreshold, operator, 10, sport);
      }
      if (originalLabel.includes('spg')) {
        return (player: Player) => checkSeasonAverage(player, 'stl', newThreshold, operator, 10, sport);
      }
      if (originalLabel.includes('bpg')) {
        return (player: Player) => checkSeasonAverage(player, 'blk', newThreshold, operator, 10, sport);
      }

      // Percentage achievements - convert user's percentage input (e.g., 40) to decimal (0.40)
      const thresholdDecimal = newThreshold / 100;

      if (originalLabel.includes('ts') && originalLabel.includes('ppg')) {
        // 60%+ TS on 20+ PPG - check true shooting percentage
        return (player: Player) => checkSeasonPercentage(player, 'ts', thresholdDecimal, operator, 10, sport);
      }
      if (originalLabel.includes('efg')) {
        // Effective field goal percentage
        return (player: Player) => checkSeasonPercentage(player, 'efg', thresholdDecimal, operator, 10, sport);
      }
      if (originalLabel.includes('ft') && originalLabel.includes('%')) {
        // Free throw percentage
        return (player: Player) => checkSeasonPercentage(player, 'ft', thresholdDecimal, operator, 10, sport);
      }
      if (originalLabel.includes('3pt') || (originalLabel.includes('3p') && originalLabel.includes('%'))) {
        // 3-point percentage
        return (player: Player) => checkSeasonPercentage(player, 'tp', thresholdDecimal, operator, 10, sport);
      }
    }
  }
  
  // Longevity achievements
  if (originalLabel.includes('seasons') && originalLabel.includes('played')) {
    return (player: Player) => {
      const seasonsPlayedCount = player.stats?.filter(s => !s.playoffs).length || 0;
      return operator === '≤'
        ? seasonsPlayedCount <= newThreshold
        : seasonsPlayedCount >= newThreshold;
    };
  }
  
  // Age achievements  
  if (originalLabel.includes('age')) {
    return (player: Player) => {
      if (!player.born?.year || !player.stats) return false;
      
      // Check if player played at the specified age or met the condition
      for (const stat of player.stats) {
        if (!stat.playoffs && stat.season && (stat.gp || 0) > 0) {
          const ageInSeason = stat.season - player.born.year;
          
          if (operator === '≤') {
            // For "≤", check if played at this age or younger
            if (ageInSeason <= newThreshold) return true;
          } else {
            // For "≥", check if played at this age or older  
            if (ageInSeason >= newThreshold) return true;
          }
        }
      }
      return false;
    };
  }
  
  // If we can't determine the type, return the original test function
  return baseAchievement.test;
}

// Helper functions for stat calculations
function checkCareerTotal(player: Player, statField: string | string[], newThreshold: number, operator: '≥' | '≤'): boolean {
  if (!player.stats) return false;
  
  const fields = Array.isArray(statField) ? statField : [statField];
  
  let total = 0;
  for (const stat of player.stats) {
    if (stat.playoffs) continue; // Only regular season
    
    let seasonTotal = 0;
    for (const field of fields) {
      seasonTotal += (stat as any)[field] || 0;
    }
    total += seasonTotal;
  }
  
  if (operator === '≤') {
    return total <= newThreshold;
  } else {
    return total >= newThreshold;
  }
}

function checkSeasonTotal(player: Player, statField: string, newThreshold: number, operator: '≥' | '≤', minGames: number = 1, sport?: string): boolean {
  if (!player.stats) return false;

  if (sport === 'hockey' && player.achievements?.seasonStatsComputed) {
    for (const seasonYearStr in player.achievements.seasonStatsComputed) {
      const seasonYear = parseInt(seasonYearStr);
      const computedStats = player.achievements.seasonStatsComputed[seasonYear];
      
      // Find the raw stat for this season to get gp
      const rawStat = player.stats.find(s => s.season === seasonYear && !s.playoffs);
      const gp = rawStat?.gp || 0;

      if (gp >= minGames) {
        const value = (computedStats as any)[statField] || 0;
        if (operator === '≤' && value <= newThreshold) {
          return true;
        } else if (operator === '≥' && value >= newThreshold) {
          return true;
        }
      }
    }
  } else {
    for (const stat of player.stats) {
      if (!stat.playoffs && (stat.gp || 0) >= minGames) {
        const value = (stat as any)[statField] || 0;
        if (operator === '≤' && value <= newThreshold) {
          return true;
        } else if (operator === '≥' && value >= newThreshold) {
          return true;
        }
      }
    }
  }
  return false;
}

function checkSeasonAverage(player: Player, statField: string, newThreshold: number, operator: '≥' | '≤', minGames: number = 1, sport?: string): boolean {
  if (!player.stats) return false;

  if (sport === 'hockey' && player.achievements?.seasonStatsComputed) {
    for (const seasonYearStr in player.achievements.seasonStatsComputed) {
      const seasonYear = parseInt(seasonYearStr);
      const computedStats = player.achievements.seasonStatsComputed[seasonYear];

      // Find the raw stat for this season to get gp
      const rawStat = player.stats.find(s => s.season === seasonYear && !s.playoffs);
      const gp = rawStat?.gp || 0;
      
      if (gp >= minGames) {
        const average = (computedStats as any)[statField] || 0;
        if (operator === '≤' && average <= newThreshold) {
          return true;
        } else if (operator === '≥' && average >= newThreshold) {
          return true;
        }
      }
    }
  } else {
    for (const stat of player.stats) {
      if (!stat.playoffs && (stat.gp || 0) >= minGames) {
        const total = (stat as any)[statField] || 0;
        const games = stat.gp || 1;
        const average = games > 0 ? total / games : 0;
        if (operator === '≤' && average <= newThreshold) {
          return true;
        } else if (operator === '≥' && average >= newThreshold) {
          return true;
        }
      }
    }
  }
  return false;
}

function checkSeasonPercentage(player: Player, percentageType: string, newThreshold: number, operator: '≥' | '≤', minGames: number = 1, sport?: string): boolean {
  if (!player.stats) return false;

  if (sport === 'hockey' && player.achievements?.seasonStatsComputed) {
    for (const seasonYearStr in player.achievements.seasonStatsComputed) {
      const seasonYear = parseInt(seasonYearStr);
      const computedStats = player.achievements.seasonStatsComputed[seasonYear];

      // Find the raw stat for this season to get gp
      const rawStat = player.stats.find(s => s.season === seasonYear && !s.playoffs);
      const gp = rawStat?.gp || 0;

      if (gp >= minGames) {
        let percentage = 0;
        // For hockey, percentageType directly maps to the computed stat field
        percentage = (computedStats as any)[percentageType] || 0;
        
        if (operator === '≤' && percentage <= newThreshold) {
          return true;
        } else if (operator === '≥' && percentage >= newThreshold) {
          return true;
        }
      }
    }
  } else {
    for (const stat of player.stats) {
      if (!stat.playoffs && (stat.gp || 0) >= minGames) {
        let percentage = 0;
        
        switch (percentageType) {
          case 'fg':
            // Field goal percentage
            percentage = (stat.fga || 0) > 0 ? ((stat.fg || 0) / (stat.fga || 1)) : 0;
            break;
          case 'ft':
            // Free throw percentage  
            percentage = (stat.fta || 0) > 0 ? ((stat.ft || 0) / (stat.fta || 1)) : 0;
            break;
          case 'tp':
            // 3-point percentage
            percentage = (stat.tpa || 0) > 0 ? ((stat.tpm || 0) / (stat.tpa || 1)) : 0;
            break;
          case 'efg':
            // Effective field goal percentage: (FGM + 0.5 * 3PM) / FGA
            if ((stat.fga || 0) > 0) {
              percentage = ((stat.fg || 0) + 0.5 * (stat.tpm || 0)) / (stat.fga || 1);
            }
            break;
          case 'ts':
            // True shooting percentage: PTS / (2 * (FGA + 0.44 * FTA))
            const tsDenominator = 2 * ((stat.fga || 0) + 0.44 * (stat.fta || 0));
            if (tsDenominator > 0) {
              percentage = (stat.pts || 0) / tsDenominator;
            }
            break;
          default:
            percentage = 0;
        }
        
        if (operator === '≤' && percentage <= newThreshold) {
          return true;
        } else if (operator === '≥' && percentage >= newThreshold) {
          return true;
        }
      }
    }
  }
  return false;
}