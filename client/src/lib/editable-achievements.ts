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
  // "1 PPG (Season)" or "30 PPG (Season)" or "2.5 BPG (Season)" - season stats without +
  /^([^.\d]*?)(\d+(?:\.\d+)?)\s*(PPG|RPG|APG|SPG|BPG|FG%|3P%|FT%|eFG%|TS%|PER|WS|BPM|VORP|USG%|TOV%|ORB%|DRB%|AST%|STL%|BLK%)\s*\(Season\)(.*)$/i,
  // "Age 40+" 
  /^(.* )(\d+(?:\.\d+)?)\+(.*)$/,
  // "15+ Seasons" or "30+ PPG" or "2.5+ BPG"
  /^([^.\d]*?)(\d+(?:\.\d+)?)\+(.*)$/,
  // "Played at Age 40+"
  /^(.* Age )(\d+(?:\.\d+)?)\+(.*)$/,
  // Generic pattern for numbers followed by units (including decimals)
  /^([^.\d]*?)(\d+(?:\.\d+)?)\s*(Points?|Rebounds?|Assists?|Steals?|Blocks?|Games?|Minutes?|Shots?|FGA?|FGM?|3PA?|3PM?|FTA?|FTM?)(.*)$/,
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
      if (match.length === 5) {
        // Pattern 24 (season stats): [full, prefix, number, unit, suffix]
        [, prefix, numberStr, , suffix] = match;
        // For season stats, reconstruct the suffix to include the unit and (Season)
        const unit = match[3];
        if (label.includes('+')) {
          suffix = `+ ${unit} (Season)${suffix}`;
        } else {
          suffix = ` ${unit} (Season)${suffix}`;
        }
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
          isEditable: sport === 'basketball' // Only basketball achievements are editable
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
export function generateUpdatedLabel(parsed: ParsedAchievement, newNumber: number): string {
  if (!parsed.isEditable) {
    return parsed.originalLabel;
  }
  
  // Format numbers appropriately - use locale string for large integers, preserve decimals
  let formattedNumber: string;
  if (newNumber % 1 === 0) {
    // Integer - use locale formatting for readability
    formattedNumber = newNumber.toLocaleString();
  } else {
    // Decimal - preserve decimal places without locale formatting commas
    formattedNumber = newNumber.toString();
  }
  
  // Check if the original had a "+" and maintain that format
  if (parsed.originalLabel.includes('+')) {
    return `${parsed.prefix}${formattedNumber}+${parsed.suffix}`;
  } else {
    // For patterns without "+", just replace the number directly
    return `${parsed.prefix}${formattedNumber}${parsed.suffix}`;
  }
}

/**
 * Create a dynamic achievement with a custom numerical threshold
 */
export function createCustomNumericalAchievement(
  baseAchievement: Achievement, 
  newThreshold: number,
  sport?: string
): Achievement {
  const parsed = parseAchievementLabel(baseAchievement.label, sport);
  
  if (!parsed.isEditable) {
    return baseAchievement; // Return original if not editable
  }
  
  const newLabel = generateUpdatedLabel(parsed, newThreshold);
  
  // Generate new test function based on achievement type patterns
  const newTestFunction = generateTestFunction(baseAchievement, parsed, newThreshold);
  
  return {
    ...baseAchievement,
    id: `${baseAchievement.id}_custom_${newThreshold}`,
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
  newThreshold: number
): (player: Player) => boolean {
  const originalLabel = parsed.originalLabel.toLowerCase();
  
  // Career achievements - check career totals
  if (originalLabel.includes('career')) {
    if (originalLabel.includes('points')) {
      return (player: Player) => getCareerTotal(player, 'pts') >= newThreshold;
    }
    if (originalLabel.includes('rebounds')) {
      return (player: Player) => getCareerTotal(player, 'trb') >= newThreshold;
    }
    if (originalLabel.includes('assists')) {
      return (player: Player) => getCareerTotal(player, 'ast') >= newThreshold;
    }
    if (originalLabel.includes('steals')) {
      return (player: Player) => getCareerTotal(player, 'stl') >= newThreshold;
    }
    if (originalLabel.includes('blocks')) {
      return (player: Player) => getCareerTotal(player, 'blk') >= newThreshold;
    }
    if (originalLabel.includes('3pm') || originalLabel.includes('threes')) {
      return (player: Player) => getCareerTotal(player, 'tpm') >= newThreshold;
    }
  }
  
  // Season achievements - check single season bests
  if (originalLabel.includes('season') && !originalLabel.includes('seasons')) {
    if (originalLabel.includes('points') && !originalLabel.includes('ppg')) {
      return (player: Player) => getBestSeasonTotal(player, 'pts') >= newThreshold;
    }
    if (originalLabel.includes('assists') && !originalLabel.includes('apg')) {
      return (player: Player) => getBestSeasonTotal(player, 'ast') >= newThreshold;
    }
    if (originalLabel.includes('rebounds') && !originalLabel.includes('rpg')) {
      return (player: Player) => getBestSeasonTotal(player, 'trb') >= newThreshold;
    }
    if (originalLabel.includes('steals')) {
      return (player: Player) => getBestSeasonTotal(player, 'stl') >= newThreshold;
    }
    if (originalLabel.includes('blocks')) {
      return (player: Player) => getBestSeasonTotal(player, 'blk') >= newThreshold;
    }
    if (originalLabel.includes('3pm') || originalLabel.includes('threes')) {
      return (player: Player) => getBestSeasonTotal(player, 'tpm') >= newThreshold;
    }
    if (originalLabel.includes('games')) {
      return (player: Player) => getBestSeasonTotal(player, 'gp') >= newThreshold;
    }
    
    // Per-game averages
    if (originalLabel.includes('ppg')) {
      return (player: Player) => getBestSeasonAverage(player, 'pts') >= newThreshold;
    }
    if (originalLabel.includes('rpg')) {
      return (player: Player) => getBestSeasonAverage(player, 'trb') >= newThreshold;
    }
    if (originalLabel.includes('apg')) {
      return (player: Player) => getBestSeasonAverage(player, 'ast') >= newThreshold;
    }
    if (originalLabel.includes('spg')) {
      return (player: Player) => getBestSeasonAverage(player, 'stl') >= newThreshold;
    }
    if (originalLabel.includes('bpg')) {
      return (player: Player) => getBestSeasonAverage(player, 'blk') >= newThreshold;
    }
  }
  
  // Longevity achievements
  if (originalLabel.includes('seasons') && originalLabel.includes('played')) {
    return (player: Player) => (player.stats?.filter(s => !s.playoffs).length || 0) >= newThreshold;
  }
  
  // Age achievements  
  if (originalLabel.includes('age')) {
    return (player: Player) => {
      // Use player.achievements for age-based achievements instead of stats
      // This matches the pattern used in existing achievements
      return player.achievements?.playedAtAge40Plus || false;
    };
  }
  
  // If we can't determine the type, return the original test function
  return baseAchievement.test;
}

// Helper functions for stat calculations
function getCareerTotal(player: Player, statField: string): number {
  if (!player.stats) return 0;
  return player.stats
    .filter(s => !s.playoffs)
    .reduce((total, stat) => total + ((stat as any)[statField] || 0), 0);
}

function getBestSeasonTotal(player: Player, statField: string): number {
  if (!player.stats) return 0;
  
  // Avoid stack overflow with large datasets - use manual iteration
  let maxValue = 0;
  for (const stat of player.stats) {
    if (!stat.playoffs && (stat.gp || 0) >= 20) {
      const value = (stat as any)[statField] || 0;
      if (value > maxValue) {
        maxValue = value;
      }
    }
  }
  return maxValue;
}

function getBestSeasonAverage(player: Player, statField: string): number {
  if (!player.stats) return 0;
  
  // Avoid stack overflow with large datasets - use manual iteration
  let maxAverage = 0;
  for (const stat of player.stats) {
    if (!stat.playoffs && (stat.gp || 0) >= 20) {
      const total = (stat as any)[statField] || 0;
      const games = stat.gp || 1;
      const average = games > 0 ? total / games : 0;
      if (average > maxAverage) {
        maxAverage = average;
      }
    }
  }
  return maxAverage;
}