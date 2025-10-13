import type { Achievement } from './achievements';
import { getPlayerCareerAttemptsTotal } from './achievements';
import type { Player } from '@/types/bbgm';

// Helper function to singularize stat words
export function singularizeStatWord(word: string): string {
  const pluralToSingular: Record<string, string> = {
    'points': 'point',
    'rebounds': 'rebound',
    'assists': 'assist',
    'steals': 'steal',
    'blocks': 'block',
    'games': 'game',
    'seasons': 'season',
    'decades': 'decade',
    'hrs': 'hr',
    'rbis': 'rbi',
    'sacks': 'sack',
    'interceptions': 'interception',
    'wins': 'win',
    'shutouts': 'shutout',
    'saves': 'save',
    'starts': 'start',
    'hits': 'hit',
    'runs': 'run',
    'strikeouts': 'strikeout',
    'tackles': 'tackle',
    'fumbles': 'fumble',
    'yds': 'yd', // For Pass Yds, Rush Yds, Rec Yds
    'home runs': 'home run',
    'stolen bases': 'stolen base',
  };

  const lowerCaseWord = word.toLowerCase();
  if (pluralToSingular[lowerCaseWord]) {
    // Preserve original casing for the first letter if it was capitalized
    if (word[0] === word[0].toUpperCase()) {
      return pluralToSingular[lowerCaseWord].charAt(0).toUpperCase() + pluralToSingular[lowerCaseWord].slice(1);
    }
    return pluralToSingular[lowerCaseWord];
  }

  // Simple plural to singular for words ending in 's' if not in dictionary
  // Avoids singularizing words like "3PM" or "TPM" which are already singular-like or acronyms
  if (lowerCaseWord.endsWith('s') && lowerCaseWord.length > 1 && !['3pm', 'tpm'].includes(lowerCaseWord)) {
    return word.slice(0, -1);
  }
  return word;
}

// Pattern to match numerical thresholds in achievement labels
export interface ParsedAchievement {
  originalLabel: string;
  prefix: string;     // Text before the number
  number: number;     // The numerical threshold (now supports decimals)
  suffix: string;     // Text after the number
  operatorPart?: string; // e.g., "%+", "%"
  statUnit?: string; // e.g., "FG", "3PT", "eFG%"
  isEditable: boolean; // Whether this achievement has an editable number
}

// Regex patterns for different numerical achievement formats
// Order matters! Decimal-aware patterns must come BEFORE comma-separated patterns
const ACHIEVEMENT_PATTERNS = [
  // Percentage achievements (e.g., "60%+ TS on 20+ PPG (Season)", "90%+ FT (Season)", "40%+ 3PT (Season)")
  /^([^.\d]*?)(\d+(?:\.\d+)?)(%?\+?)\s*(TS on \d+\+ PPG|eFG|FT|3PT|FG)\s*\(Season\)(.*)$/i,
  // "1 PPG (Season)" or "30 PPG (Season)" or "2.5 BPG (Season)" - season stats without +
  /^([^.\d]*?)(\d+(?:\.\d+)?)\s*(PPG|RPG|APG|SPG|BPG|FG%|3P%|FT%|eFG%|TS%|PER|WS|BPM|VORP|USG%|TOV%|ORB%|DRB%|AST%|STL%|BLK%)\s*\(Season\)(.*)$/i,
  // "Played in X+ Decades"
  /^([^.\d]*?)(\d+(?:\.\d+)?)\+\s*Decades(.*)$/i,
  // "Age 40+" 
  /^(.* )(\d+(?:\.\d+)?)\+(.*)$/i,
  // Percentage achievements with "or less" (e.g., "50% or less FG (Season)")
  /^([^.\d]*?)(\d+(?:\.\d+)?)(%?)\s*or less\s*(TS on \d+\+ PPG|eFG|FT|3PT|FG)\s*\(Season\)(.*)$/i,
  // "15+ Seasons" or "30+ PPG" or "2.5+ BPG"
  /^([^.\d]*?)(\d+(?:\.\d+)?)\+(.*)$/,
  // "Played at Age 40+"
  /^(.* Age )(\d+(?:\.\d+)?)\+(.*)$/,
  // Generic pattern for numbers followed by units (including decimals)
  /^([^.\d]*?)(\d+(?:\.\d+)?)\s*(Points?|Rebounds?|Assists?|Steals?|Blocks?|Games?|Minutes?|Shots?|FGA?|FGM?|3PA?|3PM?|FTA?|FTM?|Pass Yds?|Rush Yds?|Rec Yds?|Sacks?|Interceptions?|Rebounds|3PM)(.*)$/,
  // "2,000+ Career Points" or "700+ Assists in a Season" - MUST come after decimal patterns
  // Modified to NOT match if there's a decimal point before the number
  /^((?:(?!\d+\.\d+).)*?)(\d{1,3}(?:,\d{3})*)\+(.*)$/,
];

/**
 * Parse an achievement label to identify if it contains an editable numerical threshold
 * Only basketball achievements are editable for now
 */
export function parseAchievementLabel(label: string, sport?: string): ParsedAchievement {
  let statUnit: string = ''; // Declare statUnit here
  // console.log(`[DEBUG parseAchievementLabel] Input label: "${label}", Sport: ${sport}`);
  // Try each pattern to find numerical thresholds
  for (const pattern of ACHIEVEMENT_PATTERNS) {
    const match = label.match(pattern);
    if (match) {
      // console.log(`[DEBUG parseAchievementLabel] Matched pattern: ${pattern.source}, Match:`, match);
      let prefix: string, numberStr: string, suffix: string;
      let operatorPart: string = '';
      let unit: string = '';
      
      // Handle different capture group patterns
      if (match.length === 7 && match[3] && match[4] && match[5] && match[6]) {
        // New "or less" percentage patterns: [full, prefix, number, percentSign, "or less", unit, seasonLiteral, suffixEnd]
        const [, prefixMatch, numberStrMatch, percentSignMatch, , unitMatch, seasonLiteralMatch, suffixEndMatch] = match;
        prefix = prefixMatch;
        numberStr = numberStrMatch;
        operatorPart = percentSignMatch; // Store the '%' part
        suffix = `${unitMatch}${seasonLiteralMatch}${suffixEndMatch}`;
        statUnit = unitMatch; // Store the stat unit
      } else if (match.length === 6 && (pattern === ACHIEVEMENT_PATTERNS[0] || pattern === ACHIEVEMENT_PATTERNS[4])) {
        // Specific handling for percentage patterns (e.g., "90%+ FT (Season)")
        // Match: [full, prefix, number, operatorPart, statUnit, suffixEnd]
        const [, prefixMatch, numberStrMatch, operatorPartMatch, statUnitMatch, suffixEndMatch] = match;
        prefix = prefixMatch;
        numberStr = numberStrMatch;
        operatorPart = operatorPartMatch;
        suffix = suffixEndMatch;
        statUnit = statUnitMatch; // Store the stat unit
      } else if (match.length === 5 && match[3] && !match[4]) {
        // Pattern 24 (season stats): [full, prefix, number, unit, suffix]
        [, prefix, numberStr, unit, suffix] = match;
        // For season stats, reconstruct the suffix to include the unit and (Season)
        if (label.includes('+')) {
          suffix = `+ ${unit} (Season)${suffix}`;
        } else {
          suffix = ` ${unit} (Season)${suffix}`;
        }
        statUnit = unit; // Store the stat unit
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
          operatorPart: operatorPart || '',
          statUnit: statUnit || '',
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
export function generateUpdatedLabel(parsed: ParsedAchievement, newNumber: number | undefined, operator?: '≥' | '≤'): string {
  // console.log('[DEBUG generateUpdatedLabel] Input parsed:', parsed, 'newNumber:', newNumber, 'operator:', operator);
  if (!parsed.isEditable) {
    return parsed.originalLabel;
  }

  // Use parsed.number as a fallback if newNumber is undefined
  const numberToFormat = newNumber !== undefined ? newNumber : parsed.number;

  // Format the number part of the label
  let formattedNumber: string;
  if (newNumber !== undefined) {
    formattedNumber = newNumber.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    });
  } else {
    formattedNumber = ''; // If newNumber is undefined, display an empty string
  }
  // console.log('[DEBUG generateUpdatedLabel] formattedNumber:', formattedNumber);

  const cleanSuffix = parsed.suffix.replace(/^\+\s*/, '').trim();
  const cleanPrefix = parsed.prefix.trim();

  // Determine if the original achievement was season-specific
  const isOriginalSeasonSpecific = parsed.originalLabel.toLowerCase().includes('(season)');
  let finalSeasonSuffix = '';
  if (isOriginalSeasonSpecific && !cleanSuffix.toLowerCase().includes('(season)')) {
    finalSeasonSuffix = ' (Season)';
  }

  // Handle 'less than or equal to' cases
  if (operator === '≤') {
    if (parsed.originalLabel.toLowerCase().includes('age')) {
      const result = `Played at Age ${formattedNumber} or younger`;
      // console.log('[DEBUG generateUpdatedLabel] Result (age <=):', result);
      return result;
    }
    // Handle percentage achievements (e.g., "FG%", "3PT", "eFG")
    if (parsed.operatorPart === '%+' || parsed.operatorPart === '%') {
      const statPart = parsed.statUnit || '';
      const result = `${formattedNumber}% or less ${statPart}${finalSeasonSuffix}`.trim();
      // console.log('[DEBUG generateUpdatedLabel] Result (percentage <=):', result);
      return result;
    } else {
      // For counting stats, rephrase to "[number] [prefix] [stat] or fewer (Context)"
      let contextWord = '';
      let mainSuffix = cleanSuffix;

      if (cleanSuffix.toLowerCase().includes('(season)')) {
        contextWord = 'Season';
        mainSuffix = cleanSuffix.replace(/\(season\)/gi, '').trim();
      } else if (cleanSuffix.toLowerCase().includes('(career)')) {
        contextWord = 'Career';
        mainSuffix = cleanSuffix.replace(/\(career\)/gi, '').trim();
      }

      let statPartToSingularize = '';
      if (parsed.statUnit?.trim()) {
        statPartToSingularize = parsed.statUnit.trim();
      } else {
        // Fallback to mainSuffix if no specific stat unit was parsed
        // This handles cases like "Rebounds" where "Rebounds" is in suffix
        statPartToSingularize = mainSuffix.replace(/^\+\s*/, '').trim(); // Remove leading '+'
      }

      // Singularize if the number is 1
      if (formattedNumber === '1') {
        statPartToSingularize = singularizeStatWord(statPartToSingularize);
      }

      let result = `${formattedNumber} ${cleanPrefix} ${statPartToSingularize} or fewer`;
      if (contextWord) {
        result += ` (${contextWord})`;
      }
      // console.log('[DEBUG generateUpdatedLabel] Result (counting <=):', result.trim());
      return result.trim();
    }
  }

  // Handle 'greater than or equal to' cases (default)
  // This block is reached if operator is '≥'
  if (parsed.operatorPart === '%+' || parsed.operatorPart === '%') {
    const statPart = parsed.statUnit || '';
    const operatorSymbol = parsed.operatorPart === '%+' ? '%+' : '%';
    const result = `${formattedNumber}${operatorSymbol} ${statPart}${finalSeasonSuffix}`.trim();
    // console.log('[DEBUG generateUpdatedLabel] Result (percentage >=):', result);
    return result;
  }
  
  // For labels that don't originally have a "+", like "30 PPG (Season)"
  if (!parsed.originalLabel.includes('+')) {
      const result = `${cleanPrefix} ${formattedNumber} ${cleanSuffix}${finalSeasonSuffix}`;
      // console.log('[DEBUG generateUpdatedLabel] Result (no plus >=):', result);
      return result;
  }

  const result = `${cleanPrefix} ${formattedNumber}+ ${cleanSuffix}${finalSeasonSuffix}`;
  // console.log('[DEBUG generateUpdatedLabel] Result (default >=):', result);
  return result;
}

/**
 * Create a dynamic achievement with a custom numerical threshold
 */
export function createCustomNumericalAchievement(
  baseAchievement: Achievement, 
  newThreshold: number | undefined,
  sport: string,
  operator: '≥' | '≤'
): Achievement {
  const parsed = parseAchievementLabel(baseAchievement.label, sport);
  
  if (!parsed.isEditable) {
    return baseAchievement; // Return original if not editable
  }
  
  // Ensure newThreshold is a number for generateUpdatedLabel
  const numberForLabel = newThreshold !== undefined ? newThreshold : parsed.number;
  const newLabel = generateUpdatedLabel(parsed, numberForLabel, operator);
  
  // Generate new test function based on achievement type patterns
  const newTestFunction = generateTestFunction(baseAchievement, parsed, newThreshold !== undefined ? newThreshold : parsed.number, sport, operator);
  
  const operatorStr = operator === '≤' ? 'lte' : 'gte';
  
  return {
    ...baseAchievement,
    id: `${baseAchievement.id}_custom_${newThreshold !== undefined ? newThreshold : parsed.number}_${operatorStr}`,
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
      if (sport === 'football') {
      // Career achievements for football
      if (baseAchievement.id === 'career300PassTDs') {
        return (player: Player) => checkCareerTotal(player, 'pssTD', newThreshold, operator);
      }
      if (baseAchievement.id === 'FBCareer50kPassYds') {
        return (player: Player) => checkCareerTotal(player, 'pssYds', newThreshold, operator);
      }
      if (baseAchievement.id === 'career12kRushYds') {
        return (player: Player) => checkCareerTotal(player, 'rusYds', newThreshold, operator);
      }
      if (baseAchievement.id === 'career100RushTDs') {
        return (player: Player) => checkCareerTotal(player, 'rusTD', newThreshold, operator);
      }
      if (baseAchievement.id === 'career12kRecYds') {
        return (player: Player) => checkCareerTotal(player, 'recYds', newThreshold, operator);
      }
      if (baseAchievement.id === 'career100RecTDs') {
        return (player: Player) => checkCareerTotal(player, 'recTD', newThreshold, operator);
      }
      if (baseAchievement.id === 'career100Sacks') {
        return (player: Player) => checkCareerTotal(player, 'defSk', newThreshold, operator);
      }
      if (baseAchievement.id === 'career20Ints') {
        return (player: Player) => checkCareerTotal(player, 'defInt', newThreshold, operator);
      }
  
      // Single-Season — Passing
      if (baseAchievement.id === 'FBSeason4kPassYds') {
        return (player: Player) => checkSeasonTotal(player, 'pssYds', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'FBSeason30PassTD') {
        return (player: Player) => checkSeasonTotal(player, 'pssTD', newThreshold, operator, 1);
      }
  
      // Single-Season — Rushing
      if (baseAchievement.id === 'FBSeason1200RushYds') {
        return (player: Player) => checkSeasonTotal(player, 'rusYds', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'FBSeason12RushTD') {
        return (player: Player) => checkSeasonTotal(player, 'rusTD', newThreshold, operator, 1);
      }
  
      // Single-Season — Receiving
      if (baseAchievement.id === 'FBSeason1300RecYds') {
        return (player: Player) => checkSeasonTotal(player, 'recYds', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'FBSeason10RecTD') {
        return (player: Player) => checkSeasonTotal(player, 'recTD', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'FBSeason100Receptions') {
        return (player: Player) => checkSeasonTotal(player, 'rec', newThreshold, operator, 1);
      }
  
      // Single-Season — Defense
      if (baseAchievement.id === 'FBSeason15Sacks') {
        return (player: Player) => checkSeasonTotal(player, 'defSk', newThreshold, operator, 1);
      }
          if (baseAchievement.id === 'FBSeason140Tackles') {
            return (player: Player) => checkSeasonTotal(player, ['defTckSolo', 'defTckAst'], newThreshold, operator, 1);
          }      if (baseAchievement.id === 'FBSeason5Interceptions') {
        return (player: Player) => checkSeasonTotal(player, 'defInt', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'FBSeason15TFL') {
        return (player: Player) => checkSeasonTotal(player, 'defTFL', newThreshold, operator, 1);
      }
  
      // Single-Season — Combined
      if (baseAchievement.id === 'FBSeason1600Scrimmage') {
        return (player: Player) => checkSeasonTotal(player, ['rusYds', 'recYds'], newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'FBSeason2000AllPurpose') {
        return (player: Player) => checkSeasonTotal(player, ['rusYds', 'recYds', 'krYds', 'prYds'], newThreshold, operator, 1);
      }
    }  // Handle hockey-specific achievements
      if (sport === 'hockey') {
      // Career achievements for hockey
      if (baseAchievement.id === 'career500Goals') {
        return (player: Player) => checkCareerTotal(player, ['evG', 'ppG', 'shG'], newThreshold, operator);
      }
      if (baseAchievement.id === 'career1000Points') {
        return (player: Player) => checkCareerTotal(player, ['evG', 'ppG', 'shG', 'evA', 'ppA', 'shA'], newThreshold, operator);
      }
      if (baseAchievement.id === 'career500Assists') {
        return (player: Player) => checkCareerTotal(player, ['evA', 'ppA', 'shA'], newThreshold, operator);
      }
      if (baseAchievement.id === 'career200Wins') {
        return (player: Player) => checkCareerTotal(player, 'gW', newThreshold, operator);
      }
      if (baseAchievement.id === 'career50Shutouts') {
        return (player: Player) => checkCareerTotal(player, 'so', newThreshold, operator);
      }
  
      // Season achievements for hockey
      if (baseAchievement.id === 'HKSeason40Goals') {
        return (player: Player) => checkSeasonTotal(player, ['evG', 'ppG', 'shG'], newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason60Assists') {
        return (player: Player) => checkSeasonTotal(player, ['evA', 'ppA', 'shA'], newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason90Points') {
        return (player: Player) => checkSeasonTotal(player, ['evG', 'ppG', 'shG', 'evA', 'ppA', 'shA'], newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason20PowerPlay') {
        return (player: Player) => checkSeasonTotal(player, ['ppG', 'ppA'], newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason3SHGoals') {
        return (player: Player) => checkSeasonTotal(player, 'shG', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason7GWGoals') {
        return (player: Player) => checkSeasonTotal(player, 'gwG', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason250Shots') {
        return (player: Player) => checkSeasonTotal(player, 's', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason150Hits') {
        return (player: Player) => checkSeasonTotal(player, 'hit', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason100Blocks') {
        return (player: Player) => checkSeasonTotal(player, 'blk', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason60Takeaways') {
        return (player: Player) => checkSeasonTotal(player, 'tk', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason70PIM') {
        return (player: Player) => checkSeasonTotal(player, 'pim', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason25Plus') {
        return (player: Player) => checkSeasonTotal(player, 'pm', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason55FaceoffPct') {
        const thresholdDecimal = newThreshold / 100;
        return (player: Player) => checkSeasonPercentage(player, 'faceoffPct', thresholdDecimal, operator, 1, 1, sport);
      }
      if (baseAchievement.id === 'HKSeason22TOI') {
        return (player: Player) => checkSeasonAverage(player, 'toi', newThreshold, operator, 1, sport);
      }
      if (baseAchievement.id === 'HKSeason920SavePct') {
        const thresholdDecimal = newThreshold / 1000; // Save percentage is usually .920, so divide by 1000
        return (player: Player) => checkSeasonPercentage(player, 'savePct', thresholdDecimal, operator, 1, 1, sport);
      }
      if (baseAchievement.id === 'HKSeason260GAA') {
        return (player: Player) => checkSeasonAverage(player, 'gaa', newThreshold, operator, 1, sport);
      }
      if (baseAchievement.id === 'HKSeason6Shutouts') {
        return (player: Player) => checkSeasonTotal(player, 'so', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason2000Saves') {
        return (player: Player) => checkSeasonTotal(player, 'sv', newThreshold, operator, 1);
      }
      if (baseAchievement.id === 'HKSeason60Starts') {
        return (player: Player) => checkSeasonTotal(player, 'gs', newThreshold, operator, 1);
      }
    } else if (sport === 'baseball') {
    // Career achievements for baseball
    if (baseAchievement.id === 'career3000Hits') {
      return (player: Player) => checkCareerTotal(player, 'h', newThreshold, operator);
    }
    if (baseAchievement.id === 'career500HRs') {
      return (player: Player) => checkCareerTotal(player, 'hr', newThreshold, operator);
    }
    if (baseAchievement.id === 'career1500RBIs') {
      return (player: Player) => checkCareerTotal(player, 'rbi', newThreshold, operator);
    }
    if (baseAchievement.id === 'career400SBs') {
      return (player: Player) => checkCareerTotal(player, 'sb', newThreshold, operator);
    }
    if (baseAchievement.id === 'career1800Runs') {
      return (player: Player) => checkCareerTotal(player, 'r', newThreshold, operator);
    }
    if (baseAchievement.id === 'career300Wins') {
      return (player: Player) => checkCareerTotal(player, 'w', newThreshold, operator);
    }
    if (baseAchievement.id === 'career3000Ks') {
      return (player: Player) => checkCareerTotal(player, 'so', newThreshold, operator);
    }
    if (baseAchievement.id === 'career300Saves') {
      return (player: Player) => checkCareerTotal(player, 'sv', newThreshold, operator);
    }
  } else {
    // Default to basketball logic
    // Default to basketball logic
    // Career achievements - check career totals
    if (baseAchievement.id === 'career20kPoints') {
      return (player: Player) => checkCareerTotal(player, 'pts', newThreshold, operator);
    }
    if (baseAchievement.id === 'career10kRebounds') {
      return (player: Player) => checkCareerTotal(player, 'trb', newThreshold, operator);
    }
    if (baseAchievement.id === 'career5kAssists') {
      return (player: Player) => checkCareerTotal(player, 'ast', newThreshold, operator);
    }
    if (baseAchievement.id === 'career2kSteals') {
      return (player: Player) => checkCareerTotal(player, 'stl', newThreshold, operator);
    }
    if (baseAchievement.id === 'career1500Blocks') {
      return (player: Player) => checkCareerTotal(player, 'blk', newThreshold, operator);
    }
    if (baseAchievement.id === 'career2kThrees') {
      return (player: Player) => checkCareerTotal(player, ['tpm', 'tp'], newThreshold, operator);
    }

    // Season achievements - check single season bests
    if (baseAchievement.id === 'Season2000Points') {
      return (player: Player) => checkSeasonTotal(player, 'pts', newThreshold, operator, 10);
    }
    if (baseAchievement.id === 'Season30PPG') {
      return (player: Player) => checkSeasonAverage(player, 'pts', newThreshold, operator, 10, sport);
    }
    if (baseAchievement.id === 'Season200_3PM') {
      return (player: Player) => checkSeasonTotal(player, ['tpm', 'tp'], newThreshold, operator, 10);
    }
    if (baseAchievement.id === 'Season300_3PM') {
      return (player: Player) => checkSeasonTotal(player, ['tpm', 'tp'], newThreshold, operator, 10);
    }
    if (baseAchievement.id === 'Season700Assists') {
      return (player: Player) => checkSeasonTotal(player, 'ast', newThreshold, operator, 10);
    }
    if (baseAchievement.id === 'Season10APG') {
      return (player: Player) => checkSeasonAverage(player, 'ast', newThreshold, operator, 10, sport);
    }
    if (baseAchievement.id === 'Season800Rebounds') {
      return (player: Player) => checkSeasonTotal(player, 'trb', newThreshold, operator, 10);
    }
    if (baseAchievement.id === 'Season12RPG') {
      return (player: Player) => checkSeasonAverage(player, 'trb', newThreshold, operator, 10, sport);
    }
    if (baseAchievement.id === 'Season150Steals') {
      return (player: Player) => checkSeasonTotal(player, 'stl', newThreshold, operator, 10);
    }
    if (baseAchievement.id === 'Season2SPG') {
      return (player: Player) => checkSeasonAverage(player, 'stl', newThreshold, operator, 10, sport);
    }
    if (baseAchievement.id === 'Season150Blocks') {
      return (player: Player) => checkSeasonTotal(player, 'blk', newThreshold, operator, 10);
    }
    if (baseAchievement.id === 'Season2_5BPG') {
      return (player: Player) => checkSeasonAverage(player, 'blk', newThreshold, operator, 10, sport);
    }
    if (baseAchievement.id === 'Season200Stocks') {
      return (player: Player) => checkSeasonTotal(player, ['stl', 'blk'], newThreshold, operator, 10);
    }
    if (baseAchievement.id === 'Season25_10') {
      return (player: Player) => checkSeasonCombo(player, { pts: newThreshold, trb: 10 }, newThreshold, operator, 10);
    }
    if (baseAchievement.id === 'Season25_5_5') {
      return (player: Player) => checkSeasonCombo(player, { pts: newThreshold, trb: 5, ast: 5 }, newThreshold, operator, 10);
    }
    if (baseAchievement.id === 'Season20_10_5') {
      return (player: Player) => checkSeasonCombo(player, { pts: newThreshold, trb: 10, ast: 5 }, newThreshold, operator, 10);
    }
    if (baseAchievement.id === 'Season1_1_1') {
      return (player: Player) => checkSeasonCombo(player, { pts: newThreshold, trb: 1, ast: 1, stl: 1, blk: 1 }, newThreshold, operator, 1);
    }
    if (baseAchievement.id === 'Season50_40_90') {
      return (player: Player) => checkSeason50_40_90(player, newThreshold, operator, 10);
    }
    if (baseAchievement.id === 'Season60eFG500FGA') {
      const minAttempts = 500;
      const thresholdDecimal = newThreshold / 100;
      return (player: Player) => checkSeasonPercentage(player, 'efg', thresholdDecimal, operator, 10, minAttempts, sport);
    }
    if (baseAchievement.id === 'Season60TS20PPG') {
      return (player: Player) => checkSeason60TS20PPG(player, newThreshold, operator, 10);
    }
    if (baseAchievement.id === 'Season90FT250FTA') {
      const minAttempts = 250;
      const thresholdDecimal = newThreshold / 100;
      return (player: Player) => checkSeasonPercentage(player, 'ft', thresholdDecimal, operator, 10, minAttempts, sport);
    }
    if (baseAchievement.id === 'SeasonFGPercent') {
      const minAttempts = 300;
      const thresholdDecimal = newThreshold / 100;
      return (player: Player) => checkSeasonPercentage(player, 'fg', thresholdDecimal, operator, 10, minAttempts, sport);
    }
    if (baseAchievement.id === 'Season3PPercent') {
      const minAttempts = 100;
      const thresholdDecimal = newThreshold / 100;
      return (player: Player) => checkSeasonPercentage(player, 'tp', thresholdDecimal, operator, 10, minAttempts, sport);
    }
    if (baseAchievement.id === 'Season36MPG') {
      return (player: Player) => checkSeasonAverage(player, 'min', newThreshold, operator, 10, sport);
    }
    if (baseAchievement.id === 'Season70Games') {
      return (player: Player) => checkSeasonTotal(player, 'gp', newThreshold, operator, 1);
    }
  }
  
  // Longevity achievements
  if (baseAchievement.id === 'playedInThreeDecades') {
    return (player: Player) => {
      const decadesPlayedCount = player.decadesPlayed?.size || 0;
      return operator === '≤'
        ? decadesPlayedCount <= newThreshold
        : decadesPlayedCount >= newThreshold;
    };
  }
  if (baseAchievement.id === 'played15PlusSeasons') {
    return (player: Player) => {
      const seasonsPlayedCount = player.stats?.filter(s => !s.playoffs).length || 0;
      return operator === '≤'
        ? seasonsPlayedCount <= newThreshold
        : seasonsPlayedCount >= newThreshold;
    };
  }
  
  // Age achievements  
  if (baseAchievement.id === 'playedAtAge40Plus') {
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

// Helper function to get a player's career total for a specific stat
export function getPlayerCareerTotal(player: Player, statField: string | string[]): number {
  if (!player.stats) return 0;

  let total = 0;
  for (const stat of player.stats) {
    if (stat.playoffs) continue; // Only regular season

    if (Array.isArray(statField)) {
      let valueFound = false;
      for (const field of statField) {
        if ((stat as any)[field] !== undefined) {
          total += (stat as any)[field];
          valueFound = true;
          break; // Stop after finding the first valid field
        }
      }
    } else {
      // Single stat field
      if (statField === 'trb') {
        if ((stat as any).trb !== undefined) {
          total += (stat as any).trb;
        } else if ((stat as any).drb !== undefined || (stat as any).orb !== undefined) {
          total += ((stat as any).drb || 0) + ((stat as any).orb || 0);
        }
      } else {
        if ((stat as any)[statField] !== undefined) {
          total += (stat as any)[statField];
        }
      }
    }
  }
  return total;
}

// Helper functions for stat calculations
function checkCareerTotal(player: Player, statField: string | string[], newThreshold: number, operator: '≥' | '≤'): boolean {
  const total = getPlayerCareerTotal(player, statField);

  if (operator === '≤') {
    return total <= newThreshold;
  } else {
    return total >= newThreshold;
  }
}

function checkSeasonTotal(player: Player, statField: string | string[], newThreshold: number, operator: '≥' | '≤', minGames: number = 1): boolean {
  if (!player.stats) return false;


  for (const stat of player.stats) {
    if (!stat.playoffs && (stat.gp || 0) >= minGames) {
      let value = 0;
      if (Array.isArray(statField)) {
        for (const field of statField) {
          if ((stat as any)[field] !== undefined) {
            value = (stat as any)[field];
            break; // Use the first valid field found
          }
        }
      } else {
        value = (stat as any)[statField] || 0;
      }

      if (operator === '≤' && value <= newThreshold) {
        return true;
      } else if (operator === '≥' && value >= newThreshold) {
        return true;
      }
    }
  }
  return false;
}

function checkSeasonAverage(player: Player, statField: string, newThreshold: number, operator: '≥' | '≤', minGames: number = 1, sport: string): boolean {
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

function checkSeasonPercentage(player: Player, percentageType: string, newThreshold: number, operator: '≥' | '≤', minGames: number = 1, minAttempts: number = 1, sport: string): boolean {
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
        
        // Ensure there was at least one attempt for this season for percentages
        let seasonAttempts = 0;
        switch (percentageType) {
          case 'savePct':
            seasonAttempts = (rawStat as any)?.sa || 0;
            break;
          case 'faceoffPct':
            seasonAttempts = ((rawStat as any)?.fow || 0) + ((rawStat as any)?.fol || 0);
            break;
          default:
            seasonAttempts = 1; // Assume 1 for other computed percentages if no direct attempt stat
        }

        if (seasonAttempts === 0) continue; // Skip season if no attempts

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
        let attempts = 0;
        
        switch (percentageType) {
          case 'fg':
            attempts = stat.fga || 0;
            percentage = attempts > 0 ? ((stat.fg || 0) / attempts) : 0;
            break;
          case 'ft':
            attempts = stat.fta || 0;
            percentage = attempts > 0 ? ((stat.ft || 0) / attempts) : 0;
            break;
          case 'tp':
            attempts = stat.tpa || 0;
            percentage = attempts > 0 ? ((stat.tpm || stat.tp || 0) / attempts) : 0;
            break;
          case 'efg':
            attempts = stat.fga || 0;
            if (attempts > 0) {
              percentage = ((stat.fg || 0) + 0.5 * (stat.tpm || 0)) / attempts;
            }
            break;
          case 'ts':
            attempts = (stat.fga || 0) + (stat.fta || 0); // Approximate attempts for TS
            const tsDenominator = 2 * ((stat.fga || 0) + 0.44 * (stat.fta || 0));
            if (tsDenominator > 0) {
              percentage = (stat.pts || 0) / tsDenominator;
            }
            break;
          default:
            percentage = 0;
        }
        
        if (attempts === 0 && percentageType !== 'ts') continue; // Skip season if no attempts (TS is special)
        if (attempts < minAttempts) continue; // Skip if not enough attempts for percentage achievement

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

// Helper function for combo achievements (e.g., 25+ PTS, 10+ REB/AST)
function checkSeasonCombo(player: Player, statThresholds: Record<string, number>, newThreshold: number, operator: '≥' | '≤', minGames: number = 1): boolean {
  if (!player.stats) return false;

  for (const stat of player.stats) {
    if (!stat.playoffs && (stat.gp || 0) >= minGames) {
      let allConditionsMet = true;
      for (const statField in statThresholds) {
        const threshold = statThresholds[statField];
        let value = (stat as any)[statField] || 0;

        // Special handling for trb (total rebounds) if orb/drb are present
        if (statField === 'trb' && (stat as any).drb !== undefined || (stat as any).orb !== undefined) {
          value = ((stat as any).drb || 0) + ((stat as any).orb || 0);
        }

        if (operator === '≤') {
          if (value > threshold) {
            allConditionsMet = false;
            break;
          }
        } else { // operator === '≥'
          if (value < threshold) {
            allConditionsMet = false;
            break;
          }
        }
      }
      if (allConditionsMet) return true;
    }
  }
  return false;
}

// Helper function for 50/40/90 achievement
function checkSeason50_40_90(player: Player, newThreshold: number, operator: '≥' | '≤', minGames: number = 1): boolean {
  if (!player.stats) return false;

  for (const stat of player.stats) {
    if (!stat.playoffs && (stat.gp || 0) >= minGames) {
      const fgPct = (stat.fga || 0) > 0 ? ((stat.fg || 0) / (stat.fga || 0)) : 0;
      const tpPct = (stat.tpa || 0) > 0 ? ((stat.tpm || 0) / (stat.tpa || 0)) : 0;
      const ftPct = (stat.fta || 0) > 0 ? ((stat.ft || 0) / (stat.fta || 0)) : 0;

      const fgThreshold = 0.50; // 50%
      const tpThreshold = 0.40; // 40%
      const ftThreshold = 0.90; // 90%

      // For 50/40/90, the newThreshold from the input box isn't directly used for the percentages themselves,
      // but rather the *existence* of the achievement. If we wanted to make the percentages editable,
      // we'd need to parse them from the label. For now, we assume fixed 50/40/90.

      const fgCondition = operator === '≤' ? fgPct <= fgThreshold : fgPct >= fgThreshold;
      const tpCondition = operator === '≤' ? tpPct <= tpThreshold : tpPct >= tpThreshold;
      const ftCondition = operator === '≤' ? ftPct <= ftThreshold : ftPct >= ftThreshold;

      if (fgCondition && tpCondition && ftCondition) {
        return true;
      }
    }
  }
  return false;
}

// Helper function for 60% TS on 20+ PPG achievement
function checkSeason60TS20PPG(player: Player, newThreshold: number, operator: '≥' | '≤', minGames: number = 1): boolean {
  if (!player.stats) return false;

  for (const stat of player.stats) {
    if (!stat.playoffs && (stat.gp || 0) >= minGames) {
      const pts = stat.pts || 0;
      const fga = stat.fga || 0;
      const fta = stat.fta || 0;
      const gp = stat.gp || 1;

      const ppg = gp > 0 ? pts / gp : 0;

      let tsPct = 0;
      const tsDenominator = 2 * (fga + 0.44 * fta);
      if (tsDenominator > 0) {
        tsPct = pts / tsDenominator;
      }

      const tsThreshold = 0.60; // 60% TS
      const ppgThreshold = 20;  // 20 PPG

      const tsCondition = operator === '≤' ? tsPct <= tsThreshold : tsPct >= tsThreshold;
      const ppgCondition = operator === '≤' ? ppg <= ppgThreshold : ppg >= ppgThreshold;

      if (tsCondition && ppgCondition) {
        return true;
      }
    }
  }
  return false;
}

export function parseCustomAchievementId(achievementId: string): { baseId: string; threshold: number; operator: '≥' | '≤' } | null {
  const match = achievementId.match(/_custom_(\d+)_(\w+)$/);
  if (!match) return null;

  const [, thresholdStr, operatorStr] = match;
  const threshold = parseInt(thresholdStr, 10);
  const operator = operatorStr === 'lte' ? '≤' : '≥';
  const baseId = achievementId.split('_custom_')[0];

  return { baseId, threshold, operator };
}
