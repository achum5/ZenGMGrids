import type { Player, Team } from '@/types/bbgm';

// Award type normalization mapping
export const AWARD_TYPE_MAP: Record<string, string> = {
  'All-Star': 'AllStar',
  'Most Valuable Player': 'MVP',
  'Defensive Player of the Year': 'DPOY',
  'Rookie of the Year': 'ROY', 
  'Sixth Man of the Year': 'SMOY',
  'Most Improved Player': 'MIP',
  'Finals MVP': 'FinalsMVP',
  'Conference Finals MVP': 'SFMVP',
  'Semi-Finals MVP': 'SFMVP',
  'First Team All-League': 'AllLeagueAny',
  'Second Team All-League': 'AllLeagueAny',
  'Third Team All-League': 'AllLeagueAny',
  'First Team All-Defensive': 'AllDefAny',
  'Second Team All-Defensive': 'AllDefAny',
  'First Team All-Rookie': 'AllRookieAny',
  'Second Team All-Rookie': 'AllRookieAny',
};

// Achievement display names
export const ACHIEVEMENT_NAMES: Record<string, string> = {
  'AllStar': 'All-Star',
  'MVP': 'MVP',
  'DPOY': 'Defensive Player of the Year',
  'ROY': 'Rookie of the Year',
  'SMOY': 'Sixth Man of the Year', 
  'MIP': 'Most Improved Player',
  'FinalsMVP': 'Finals MVP',
  'SFMVP': 'Conference Finals MVP',
  'AllLeagueAny': 'All-League Team',
  'AllDefAny': 'All-Defensive Team',
  'AllRookieAny': 'All-Rookie Team',
};

// US states and DC for birthplace checking
const US_STATES_AND_DC = new Set([
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia',
  // Common abbreviations
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

// Franchise continuity mapping (team relocations/rebrandings)
const FRANCHISE_CONTINUITY_MAP: Record<string, string[]> = {
  // Seattle SuperSonics = Oklahoma City Thunder
  'SEA': ['OKC', 'SEA'],
  'OKC': ['OKC', 'SEA'],
  // Charlotte Hornets = New Orleans Pelicans = Charlotte Bobcats
  'CHA': ['CHA', 'NOH', 'NOP', 'NOK'],
  'NOH': ['CHA', 'NOH', 'NOP', 'NOK'],
  'NOP': ['CHA', 'NOH', 'NOP', 'NOK'],
  'NOK': ['CHA', 'NOH', 'NOP', 'NOK'],
  // New Jersey Nets = Brooklyn Nets
  'NJN': ['BRK', 'NJN'],
  'BRK': ['BRK', 'NJN'],
  // Vancouver Grizzlies = Memphis Grizzlies
  'VAN': ['MEM', 'VAN'],
  'MEM': ['MEM', 'VAN'],
  // Washington franchise history
  'WSB': ['WAS', 'WSB', 'WSH'],
  'WAS': ['WAS', 'WSB', 'WSH'],
  'WSH': ['WAS', 'WSB', 'WSH'],
};

/**
 * Get franchise IDs for a team (including historical names)
 */
export function getFranchiseIds(teamAbbrev: string): string[] {
  return FRANCHISE_CONTINUITY_MAP[teamAbbrev] || [teamAbbrev];
}

/**
 * Format team name with region and abbreviation
 */
export function formatTeamName(team: Team): string {
  const region = team.region || '';
  const name = team.name || '';
  const displayName = region && name ? `${region} ${name}` : (name || team.abbrev);
  return `${displayName}`;
}

/**
 * Get seasons player played for a specific team (regular season only)
 */
export function getSeasonsOnTeam(player: Player, tid: number): string {
  if (!player.stats) return '';
  
  const teamSeasons = player.stats
    .filter(stat => stat.tid === tid && !stat.playoffs && (stat.gp || 0) > 0)
    .map(stat => stat.season)
    .sort((a, b) => a - b);
    
  if (teamSeasons.length === 0) return '';
  if (teamSeasons.length === 1) return teamSeasons[0].toString();
  
  return `${teamSeasons[0]}–${teamSeasons[teamSeasons.length - 1]}`;
}

/**
 * Get seasons when player won a specific award
 */
export function getAwardSeasons(player: Player, achievementId: string): number[] {
  if (!player.awards) return [];
  
  const seasons = player.awards
    .filter(award => {
      const normalizedType = AWARD_TYPE_MAP[award.type];
      return normalizedType === achievementId;
    })
    .map(award => award.season)
    .sort((a, b) => a - b);
    
  return seasons;
}

/**
 * Format seasons list with compression for long lists
 */
export function formatSeasonsList(seasons: number[]): string {
  if (seasons.length === 0) return '0×';
  if (seasons.length === 1) return seasons[0].toString();
  if (seasons.length <= 6) return seasons.join(', ');
  
  // Compress long lists: "6×: 2012–2017"
  return `${seasons.length}×: ${seasons[0]}–${seasons[seasons.length - 1]}`;
}

/**
 * Calculate career totals for a player
 */
export function getCareerTotals(player: Player): {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  threes: number;
  seasonsPlayed: number;
} {
  if (!player.stats) {
    return { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, threes: 0, seasonsPlayed: 0 };
  }
  
  const regularSeasonStats = player.stats.filter(stat => !stat.playoffs);
  const uniqueSeasons = new Set(regularSeasonStats.map(stat => stat.season));
  
  return {
    points: regularSeasonStats.reduce((sum, stat) => sum + (stat.pts || 0), 0),
    rebounds: regularSeasonStats.reduce((sum, stat) => sum + (stat.trb || 0), 0),
    assists: regularSeasonStats.reduce((sum, stat) => sum + (stat.ast || 0), 0),
    steals: regularSeasonStats.reduce((sum, stat) => sum + (stat.stl || 0), 0),
    blocks: regularSeasonStats.reduce((sum, stat) => sum + (stat.blk || 0), 0),
    threes: regularSeasonStats.reduce((sum, stat) => sum + (stat.tpm || stat.tp || 0), 0),
    seasonsPlayed: uniqueSeasons.size,
  };
}

/**
 * Get the team a player was on during Finals MVP season
 */
export function getFinalsTeamForSeason(player: Player, season: number): number | null {
  if (!player.stats) return null;
  
  // Look for playoffs stats for that season
  const playoffStats = player.stats.filter(stat => stat.season === season && stat.playoffs);
  
  // Should only be one playoffs team per season for Finals MVP
  if (playoffStats.length === 1) {
    return playoffStats[0].tid;
  }
  
  // Fallback to regular season team if no playoffs data
  const regularStats = player.stats.filter(stat => stat.season === season && !stat.playoffs);
  if (regularStats.length === 1) {
    return regularStats[0].tid;
  }
  
  return null;
}

/**
 * Check if birthplace is in US 50 states + DC
 */
export function isUS50OrDC(birthplace: string | null | undefined): boolean {
  if (!birthplace) return false;
  
  // Check for state names or abbreviations in the birthplace string
  const upperBirthplace = birthplace.toUpperCase();
  
  // Check if any US state/DC is mentioned
  for (const state of US_STATES_AND_DC) {
    if (upperBirthplace.includes(state.toUpperCase())) {
      return true;
    }
  }
  
  // Common US patterns
  if (upperBirthplace.includes('USA') || 
      upperBirthplace.includes('UNITED STATES') ||
      upperBirthplace.includes('U.S.')) {
    return true;
  }
  
  return false;
}

/**
 * Get draft age at time of draft
 */
export function getDraftAge(player: Player): number | null {
  if (!player.draft?.year || !player.born?.year) return null;
  return player.draft.year - player.born.year;
}

/**
 * Format draft information
 */
export function formatDraftInfo(player: Player): string {
  if (!player.draft) return 'Draft info unavailable';
  
  const { round, pick, year } = player.draft;
  
  if (!round || round === 0 || !pick || pick === 0) {
    return `Undrafted${year ? ` (${year})` : ''}`;
  }
  
  return `Round ${round}, Pick ${pick}${year ? `, ${year}` : ''}`;
}

/**
 * Get list of all teams a player played for (career)
 */
export function getCareerTeams(player: Player, teamsById: Record<number, Team>): string[] {
  if (!player.stats) return [];
  
  const teamIds = new Set(
    player.stats
      .filter(stat => !stat.playoffs && (stat.gp || 0) > 0)
      .map(stat => stat.tid)
  );
  
  return Array.from(teamIds)
    .map(tid => teamsById[tid])
    .filter(team => team)
    .map(team => team.abbrev)
    .sort();
}

/**
 * Check if player played for team in same season as achievement
 */
export function hasSeasonHarmonization(
  player: Player, 
  tid: number, 
  achievementId: string, 
  achievementSeasons: number[]
): { hasHarmonization: boolean; teamSeasons: number[]; overlapSeasons: number[] } {
  if (!player.stats) {
    return { hasHarmonization: false, teamSeasons: [], overlapSeasons: [] };
  }
  
  const teamSeasons = player.stats
    .filter(stat => stat.tid === tid && !stat.playoffs && (stat.gp || 0) > 0)
    .map(stat => stat.season);
    
  const overlapSeasons = achievementSeasons.filter(season => teamSeasons.includes(season));
  
  return {
    hasHarmonization: overlapSeasons.length > 0,
    teamSeasons: teamSeasons.sort((a, b) => a - b),
    overlapSeasons: overlapSeasons.sort((a, b) => a - b)
  };
}