import type { Player, Team } from '@/types/bbgm';
import { SEASON_ALIGNED_ACHIEVEMENTS } from '@/lib/achievements';
import { playerMeetsAchievement } from '@/lib/achievements';
import { SEASON_ACHIEVEMENTS, type SeasonAchievementId, resolveDynamicLabel } from './season-achievements';

// Static achievement labels for legacy achievements
const STATIC_LABELS: Partial<Record<SeasonAchievementId, {
  label: string;
  short: string;
  verbTeam: string;
  verbGeneric: string;
}>> = {
  AllStar: {
    label: 'All-Star',
    short: 'All-Star',
    verbTeam: 'made an All-Star team',
    verbGeneric: 'made an All-Star team'
  },
  MVP: {
    label: 'Most Valuable Player',
    short: 'MVP',
    verbTeam: 'won an MVP',
    verbGeneric: 'won an MVP'
  },
  DPOY: {
    label: 'Defensive Player of the Year',
    short: 'DPOY',
    verbTeam: 'won a Defensive Player of the Year',
    verbGeneric: 'won a Defensive Player of the Year'
  },
  ROY: {
    label: 'Rookie of the Year',
    short: 'ROY',
    verbTeam: 'won Rookie of the Year',
    verbGeneric: 'won Rookie of the Year his rookie season'
  },
  SMOY: {
    label: 'Sixth Man of the Year',
    short: 'SMOY',
    verbTeam: 'won Sixth Man of the Year',
    verbGeneric: 'won Sixth Man of the Year'
  },
  MIP: {
    label: 'Most Improved Player',
    short: 'MIP',
    verbTeam: 'won Most Improved Player',
    verbGeneric: 'won Most Improved Player'
  },
  FinalsMVP: {
    label: 'Finals MVP',
    short: 'Finals MVP',
    verbTeam: 'won a Finals MVP',
    verbGeneric: 'won a Finals MVP'
  },
  SFMVP: {
    label: 'Conference Finals MVP',
    short: 'CFMVP',
    verbTeam: 'won a Conference Finals MVP',
    verbGeneric: 'won a Conference Finals MVP'
  },
  AllLeagueAny: {
    label: 'All-League Team',
    short: 'All-League',
    verbTeam: 'made an All-League Team',
    verbGeneric: 'made an All-League Team'
  },
  AllDefAny: {
    label: 'All-Defensive Team',
    short: 'All-Defensive',
    verbTeam: 'made an All-Defensive Team',
    verbGeneric: 'made an All-Defensive Team'
  },
  AllRookieAny: {
    label: 'All-Rookie Team',
    short: 'All-Rookie',
    verbTeam: 'made an All-Rookie Team',
    verbGeneric: 'made the All-Rookie team his rookie season'
  },
  PointsLeader: {
    label: 'League Points Leader',
    short: 'Points Leader',
    verbTeam: 'led the league in points',
    verbGeneric: 'led the league in points'
  },
  ReboundsLeader: {
    label: 'League Rebounds Leader',
    short: 'Rebounds Leader',
    verbTeam: 'led the league in rebounds',
    verbGeneric: 'led the league in rebounds'
  },
  AssistsLeader: {
    label: 'League Assists Leader',
    short: 'Assists Leader',
    verbTeam: 'led the league in assists',
    verbGeneric: 'led the league in assists'
  },
  StealsLeader: {
    label: 'League Steals Leader',
    short: 'Steals Leader',
    verbTeam: 'led the league in steals',
    verbGeneric: 'led the league in steals'
  },
  BlocksLeader: {
    label: 'League Blocks Leader',
    short: 'Blocks Leader',
    verbTeam: 'led the league in blocks',
    verbGeneric: 'led the league in blocks'
  }
};

// Dynamic achievement label resolver for modal copy
function getAchievementMetadata(achievementId: string): {
  label: string;
  short: string;
  verbTeam: string;
  verbGeneric: string;
} {
  // Handle dynamic threshold-based achievements (with @ symbol)
  if (achievementId.includes('@')) {
    const label = resolveDynamicLabel(achievementId);
    return {
      label,
      short: label,
      verbTeam: `achieved ${label.toLowerCase()}`,
      verbGeneric: `achieved ${label.toLowerCase()}`
    };
  }
  
  // Fallback to static achievement labels for legacy achievements
  const metadata = STATIC_LABELS[achievementId as SeasonAchievementId];
  if (metadata) {
    return metadata;
  }
  
  // Default fallback for unknown achievements
  return {
    label: achievementId,
    short: achievementId,
    verbTeam: `achieved ${achievementId}`,
    verbGeneric: `achieved ${achievementId}`
  };
}

// Helper function to check if an achievement ID is a season achievement
function isSeasonAchievement(achievementId: string): achievementId is SeasonAchievementId {
  // Check if it's a dynamic achievement (contains @) or a known static achievement
  if (achievementId.includes('@')) return false; // Dynamic achievements are handled separately
  return Object.keys(STATIC_LABELS).includes(achievementId);
}

// Helper function to get season achievement data for a player
function getPlayerSeasonAchievementData(player: Player, achievementId: SeasonAchievementId, teamId?: number) {
  if (!player.awards) {
    return {
      count: 0,
      seasons: [] as number[],
      seasonsWithTeam: [] as string[]
    };
  }

  // Map achievement ID to award type patterns
  const awardTypePatterns: Partial<Record<SeasonAchievementId, string[]>> = {
    AllStar: ['All-Star', 'all-star', 'allstar'],
    MVP: ['MVP', 'Most Valuable Player', 'most valuable player'],
    DPOY: ['DPOY', 'Defensive Player of the Year', 'defensive player of the year'],
    ROY: ['ROY', 'Rookie of the Year', 'rookie of the year'],
    SMOY: ['SMOY', 'Sixth Man of the Year', 'sixth man of the year', '6MOY', '6th man'],
    MIP: ['MIP', 'Most Improved Player', 'most improved player'],
    FinalsMVP: ['Finals MVP', 'finals mvp', 'championship mvp'],
    SFMVP: ['Conference Finals MVP', 'conference finals mvp', 'CFMVP', 'cfmvp'],
    AllLeagueAny: ['All-League', 'all-league', 'First Team All-League', 'Second Team All-League', 'Third Team All-League'],
    AllDefAny: ['All-Defensive', 'all-defensive', 'First Team All-Defensive', 'Second Team All-Defensive'],
    AllRookieAny: ['All-Rookie', 'all-rookie', 'All-Rookie Team'],
    PointsLeader: ['League Points Leader', 'league points leader', 'points leader', 'scoring leader'],
    ReboundsLeader: ['League Rebounds Leader', 'league rebounds leader', 'rebounds leader', 'rebounding leader'],
    AssistsLeader: ['League Assists Leader', 'league assists leader', 'assists leader'],
    StealsLeader: ['League Steals Leader', 'league steals leader', 'steals leader'],
    BlocksLeader: ['League Blocks Leader', 'league blocks leader', 'blocks leader']
  };

  const patterns = awardTypePatterns[achievementId] || [];
  const matchingAwards = player.awards.filter(award => {
    const awardType = (award.type || '').toLowerCase();
    return patterns.some(pattern => awardType.includes(pattern.toLowerCase()));
  });

  // Extract seasons and format with team info if needed
  const seasonsWithTeam: string[] = [];
  const seasons: number[] = [];

  for (const award of matchingAwards) {
    if (award.season) {
      seasons.push(award.season);
      seasonsWithTeam.push(`${award.season}`);
    }
  }

  // Sort seasons
  seasons.sort((a, b) => a - b);
  seasonsWithTeam.sort();

  return {
    count: matchingAwards.length,
    seasons,
    seasonsWithTeam
  };
}

// Helper function to format consecutive years with hyphens
function formatYearsWithRanges(years: number[]): string {
  if (years.length === 0) return '';
  if (years.length === 1) return years[0].toString();
  
  const ranges: string[] = [];
  let start = years[0];
  let end = years[0];
  
  for (let i = 1; i < years.length; i++) {
    if (years[i] === end + 1) {
      // Consecutive year, extend the range
      end = years[i];
    } else {
      // Non-consecutive, push the current range and start a new one
      if (start === end) {
        ranges.push(start.toString());
      } else {
        ranges.push(`${start}-${end}`);
      }
      start = years[i];
      end = years[i];
    }
  }
  
  // Don't forget the final range
  if (start === end) {
    ranges.push(start.toString());
  } else {
    ranges.push(`${start}-${end}`);
  }
  
  return ranges.join(', ');
}

// Helper function to format season lists
function formatSeasonList(seasons: string[], isFinalsOrCFMVP: boolean = false): string {
  if (seasons.length === 0) return '';
  if (seasons.length === 1) return seasons[0];
  
  // For Finals MVP/CFMVP, use semicolon separator: "1994 HOU; 1995 HOU"
  if (isFinalsOrCFMVP) {
    return seasons.join('; ');
  }
  
  // For other awards, try to parse years and format with ranges
  const numericYears = seasons
    .map(s => parseInt(s, 10))
    .filter(year => !isNaN(year))
    .sort((a, b) => a - b);
    
  if (numericYears.length === seasons.length) {
    // All seasons are numeric years, format with ranges
    return formatYearsWithRanges(numericYears);
  }
  
  // Fall back to comma separator if seasons contain non-numeric data
  return seasons.join(', ');
}

// Grid constraint type for feedback generation
export interface GridConstraint {
  team?: number;
  category?: string;
  achievement?: string;
  decade?: string;
  draft?: number;
  longevity?: number;
}

// Season achievement feedback for team-based constraints
export function generateSeasonAchievementFeedback(
  player: Player,
  achievementA: SeasonAchievementId,
  achievementB: SeasonAchievementId,
  teams: Team[],
  teamId?: number
): string {
  const achDataA = getAchievementMetadata(achievementA);
  const achDataB = getAchievementMetadata(achievementB);
  const playerDataA = getPlayerSeasonAchievementData(player, achievementA, teamId);
  const playerDataB = getPlayerSeasonAchievementData(player, achievementB, teamId);

  // Case: Player has both achievements
  if (playerDataA.count > 0 && playerDataB.count > 0) {
    const seasonsA = formatSeasonList(playerDataA.seasonsWithTeam, achievementA === 'FinalsMVP' || achievementA === 'SFMVP');
    const seasonsB = formatSeasonList(playerDataB.seasonsWithTeam, achievementB === 'FinalsMVP' || achievementB === 'SFMVP');
    
    if (isRookieAchievement(achievementA) && isRookieAchievement(achievementB)) {
      return `${player.name} ${achDataA.verbGeneric} and ${achDataB.verbGeneric}.`;
    } else if (isRookieAchievement(achievementA)) {
      return `${player.name} ${achDataA.verbGeneric} and ${achDataB.verbGeneric}. (${achDataB.short}: ${playerDataB.count}x — ${seasonsB})`;
    } else if (isRookieAchievement(achievementB)) {
      return `${player.name} ${achDataA.verbGeneric} and ${achDataB.verbGeneric}. (${achDataA.short}: ${playerDataA.count}x — ${seasonsA})`;
    }
    return `${player.name} ${achDataA.verbGeneric} and ${achDataB.verbGeneric}. (${achDataA.short}: ${playerDataA.count}x — ${seasonsA}; ${achDataB.short}: ${playerDataB.count}x — ${seasonsB})`;
  }
  
  // Case: Player has only achievement A
  if (playerDataA.count > 0 && playerDataB.count === 0) {
    const seasonsA = formatSeasonList(playerDataA.seasonsWithTeam, achievementA === 'FinalsMVP' || achievementA === 'SFMVP');
    const verbB = isRookieAchievement(achievementB) 
      ? achDataB.verbGeneric.replace('made the', 'didn\'t make the').replace('won', 'didn\'t win')
      : achDataB.verbGeneric.replace('made', 'did not make').replace('won', 'did not win');
    
    if (isRookieAchievement(achievementA) && isRookieAchievement(achievementB)) {
      return `${player.name} did earn ${achDataA.label}, but ${verbB}.`;
    } else if (isRookieAchievement(achievementB)) {
      return `${player.name} did earn ${achDataA.label}, but ${verbB}. (${achDataA.short}: ${playerDataA.count}x — ${seasonsA})`;
    } else if (isRookieAchievement(achievementA)) {
      return `${player.name} did earn ${achDataA.label}, but never ${achDataB.verbGeneric}. (${achDataB.short}: 0x)`;
    }
    return `${player.name} did earn ${achDataA.label}, but never ${achDataB.verbGeneric}. (${achDataA.short}: ${playerDataA.count}x — ${seasonsA}; ${achDataB.short}: 0x)`;
  }
  
  // Case: Player has only achievement B
  if (playerDataB.count > 0 && playerDataA.count === 0) {
    const seasonsB = formatSeasonList(playerDataB.seasonsWithTeam, achievementB === 'FinalsMVP' || achievementB === 'SFMVP');
    const verbA = isRookieAchievement(achievementA) 
      ? achDataA.verbGeneric.replace('made the', 'didn\'t make the').replace('won', 'didn\'t win')
      : achDataA.verbGeneric.replace('made', 'did not make').replace('won', 'did not win');
    
    if (isRookieAchievement(achievementA) && isRookieAchievement(achievementB)) {
      return `${player.name} did earn ${achDataB.label}, but ${verbA}.`;
    } else if (isRookieAchievement(achievementA)) {
      return `${player.name} did earn ${achDataB.label}, but ${verbA}. (${achDataB.short}: ${playerDataB.count}x — ${seasonsB})`;
    } else if (isRookieAchievement(achievementB)) {
      return `${player.name} did earn ${achDataB.label}, but never ${achDataA.verbGeneric}. (${achDataA.short}: 0x)`;
    }
    return `${player.name} did earn ${achDataB.label}, but never ${achDataA.verbGeneric}. (${achDataB.short}: ${playerDataB.count}x — ${seasonsB}; ${achDataA.short}: 0x)`;
  }
  
  // Case: Player has neither achievement
  let verbA, verbB;
  if (isRookieAchievement(achievementA)) {
    verbA = achDataA.verbGeneric.replace('made the', 'didn\'t make the').replace('won', 'didn\'t win');
  } else {
    verbA = `never ${achDataA.verbGeneric}`;
  }
  
  if (isRookieAchievement(achievementB)) {
    verbB = achDataB.verbGeneric.replace('made the', 'didn\'t make the').replace('won', 'didn\'t win');
  } else {
    verbB = `never ${achDataB.verbGeneric}`;
  }
  
  if (isRookieAchievement(achievementA) && isRookieAchievement(achievementB)) {
    return `${player.name} ${verbA} and ${verbB}.`;
  } else if (isRookieAchievement(achievementA)) {
    return `${player.name} ${verbA} and ${verbB}. (${achDataB.short}: 0x)`;
  } else if (isRookieAchievement(achievementB)) {
    return `${player.name} ${verbA} and ${verbB}. (${achDataA.short}: 0x)`;
  }
  return `${player.name} ${verbA} and ${verbB}. (${achDataA.short}: 0x; ${achDataB.short}: 0x)`;
}

/**
 * Check if an achievement is a rookie achievement (should not show count in parentheses)
 */
function isRookieAchievement(achievementId: SeasonAchievementId): boolean {
  const rookieAchievements = [
    'ROY', 'AllRookieAny', 
    'FBOffROY', 'FBDefROY', 'FBAllRookie',
    'HKROY', 'HKAllRookie',
    'BBROY', 'BBAllRookie'
  ];
  return rookieAchievements.includes(achievementId);
}

// Main feedback generation function for wrong guesses
export function generateFeedbackMessage(
  player: Player,
  rowConstraint: GridConstraint,
  colConstraint: GridConstraint,
  teams: Team[]
): string {
  // Check if it's a season achievement pairing
  if (rowConstraint.achievement && colConstraint.achievement &&
      isSeasonAchievement(rowConstraint.achievement) && isSeasonAchievement(colConstraint.achievement)) {
    return generateSeasonAchievementFeedback(
      player,
      rowConstraint.achievement as SeasonAchievementId,
      colConstraint.achievement as SeasonAchievementId,
      teams,
      rowConstraint.team || colConstraint.team
    );
  }
  
  // Default fallback feedback
  return `${player.name} does not satisfy both constraints.`;
}

// Constraint evaluation function
export function evaluateConstraintPair(
  player: Player,
  rowConstraint: GridConstraint,
  colConstraint: GridConstraint
): boolean {
  // Evaluate row constraint
  const rowMatch = evaluateConstraint(player, rowConstraint);
  const colMatch = evaluateConstraint(player, colConstraint);
  
  return rowMatch && colMatch;
}

// Helper function to evaluate individual constraints
function evaluateConstraint(player: Player, constraint: GridConstraint): boolean {
  // Team constraint
  if (constraint.team !== undefined) {
    return player.stats?.some(s => s.tid === constraint.team && !s.playoffs && (s.gp || 0) > 0) || false;
  }
  
  // Achievement constraint
  if (constraint.achievement) {
    // Check if it's a season achievement
    if (isSeasonAchievement(constraint.achievement)) {
      const achievementData = getPlayerSeasonAchievementData(player, constraint.achievement as SeasonAchievementId);
      return achievementData.count > 0;
    }
    
    // For career/aligned achievements, use existing system
    if (SEASON_ALIGNED_ACHIEVEMENTS[constraint.achievement]) {
      return playerMeetsAchievement(player, constraint.achievement);
    }
    
    // For dynamic achievements (with @ symbol), check against achievement system
    if (constraint.achievement.includes('@')) {
      return playerMeetsAchievement(player, constraint.achievement);
    }
    
    // Default achievement check
    return playerMeetsAchievement(player, constraint.achievement);
  }
  
  // Category constraint
  if (constraint.category) {
    // Handle category-based constraints if needed
    return true; // Placeholder - implement specific category logic as needed
  }
  
  // Draft constraint
  if (constraint.draft !== undefined) {
    return player.draft?.round === constraint.draft;
  }
  
  // Decade constraint
  if (constraint.decade) {
    const startYear = parseInt(constraint.decade);
    const endYear = startYear + 9;
    return player.stats?.some(s => s.season >= startYear && s.season <= endYear) || false;
  }
  
  // Longevity constraint
  if (constraint.longevity !== undefined) {
    const seasonsPlayed = player.stats?.filter(s => !s.playoffs && (s.gp || 0) > 0).length || 0;
    return seasonsPlayed >= constraint.longevity;
  }
  
  return false;
}