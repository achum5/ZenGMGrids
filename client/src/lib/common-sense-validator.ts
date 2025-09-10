// Common-sense validator - single source of truth for all validation
// Reads directly from league file with plain English rules

import type { Player, Team } from '@/types/bbgm';

export interface ValidationResult {
  isValid: boolean;
  proofData: ProofData;
}

export interface ProofData {
  teams?: string[];
  draftInfo?: string;
  careerStats?: Record<string, number>;
  seasonsPlayed?: number;
  achievements?: string[];
  years?: number[];
  failureReason?: string;
}

interface RowColConstraint {
  type: 'team' | 'achievement';
  name: string; // Plain English name as shown to user
  tid?: number; // For teams
}

/**
 * Single validator for all use cases - grid validation, Give Up, eligible lists, modal
 * Input: row constraint, column constraint, player, teams data
 * Output: validation result with proof data for modal
 */
export function validatePlayerEligibility(
  rowConstraint: RowColConstraint,
  colConstraint: RowColConstraint,
  player: Player,
  teams: Team[]
): ValidationResult {
  
  // Build franchise mapping once
  const franchiseMap = new Map<number, number>();
  for (const team of teams) {
    const franchiseId = (team as any).franchiseId || team.tid;
    franchiseMap.set(team.tid, franchiseId);
  }
  
  // Case A: Team × Team
  if (rowConstraint.type === 'team' && colConstraint.type === 'team') {
    return validateTeamByTeam(player, rowConstraint.tid!, colConstraint.tid!, franchiseMap, teams);
  }
  
  // Case B: Team × Achievement or Achievement × Team
  if ((rowConstraint.type === 'team' && colConstraint.type === 'achievement') ||
      (rowConstraint.type === 'achievement' && colConstraint.type === 'team')) {
    
    const teamConstraint = rowConstraint.type === 'team' ? rowConstraint : colConstraint;
    const achievementConstraint = rowConstraint.type === 'achievement' ? rowConstraint : colConstraint;
    
    return validateTeamByAchievement(
      player, 
      teamConstraint.tid!, 
      achievementConstraint.name, 
      franchiseMap, 
      teams
    );
  }
  
  // Case C: Achievement × Achievement
  if (rowConstraint.type === 'achievement' && colConstraint.type === 'achievement') {
    return validateAchievementByAchievement(player, rowConstraint.name, colConstraint.name, teams);
  }
  
  return {
    isValid: false,
    proofData: { failureReason: 'Invalid constraint types' }
  };
}

/**
 * Case A: Team × Team
 * True if player played regular-season games for both franchises at any point
 */
function validateTeamByTeam(
  player: Player,
  teamId1: number,
  teamId2: number,
  franchiseMap: Map<number, number>,
  teams: Team[]
): ValidationResult {
  
  const franchise1 = franchiseMap.get(teamId1) || teamId1;
  const franchise2 = franchiseMap.get(teamId2) || teamId2;
  
  const teamsPlayed = getTeamsPlayerPlayedFor(player, franchiseMap);
  
  const playedForTeam1 = teamsPlayed.has(franchise1);
  const playedForTeam2 = teamsPlayed.has(franchise2);
  
  if (playedForTeam1 && playedForTeam2) {
    const team1Years = getYearsForTeam(player, franchise1, franchiseMap);
    const team2Years = getYearsForTeam(player, franchise2, franchiseMap);
    
    return {
      isValid: true,
      proofData: {
        teams: [
          `${getTeamName(teamId1, teams)} (${team1Years.join(', ')})`,
          `${getTeamName(teamId2, teams)} (${team2Years.join(', ')})`
        ]
      }
    };
  }
  
  const missingTeam = !playedForTeam1 ? getTeamName(teamId1, teams) : getTeamName(teamId2, teams);
  return {
    isValid: false,
    proofData: { failureReason: `Player never played for ${missingTeam}.` }
  };
}

/**
 * Case B: Team × Achievement
 * Logic depends on whether achievement is career/non-season or season-aligned
 */
function validateTeamByAchievement(
  player: Player,
  teamId: number,
  achievementName: string,
  franchiseMap: Map<number, number>,
  teams: Team[]
): ValidationResult {
  
  const franchiseId = franchiseMap.get(teamId) || teamId;
  const teamsPlayed = getTeamsPlayerPlayedFor(player, franchiseMap);
  const playedForTeam = teamsPlayed.has(franchiseId);
  
  // Check if achievement is season-aligned
  const isSeasonAligned = isSeasonAlignedAchievement(achievementName);
  
  if (isSeasonAligned) {
    // Season-aligned: must earn achievement and play for team in same season
    return validateSeasonAlignedTeamAchievement(player, teamId, achievementName, franchiseMap, teams);
  } else {
    // Career/non-season: ever played for team AND meets achievement
    if (!playedForTeam) {
      return {
        isValid: false,
        proofData: { failureReason: `Player never played for ${getTeamName(teamId, teams)}.` }
      };
    }
    
    const achievementResult = validateCareerAchievement(player, achievementName);
    if (!achievementResult.isValid) {
      return achievementResult;
    }
    
    const teamYears = getYearsForTeam(player, franchiseId, franchiseMap);
    return {
      isValid: true,
      proofData: {
        ...achievementResult.proofData,
        teams: [`${getTeamName(teamId, teams)} (${teamYears.join(', ')})`]
      }
    };
  }
}

/**
 * Case C: Achievement × Achievement  
 * True if player meets both achievements at any point (no season matching)
 */
function validateAchievementByAchievement(
  player: Player,
  achievement1: string,
  achievement2: string,
  teams: Team[]
): ValidationResult {
  
  const result1 = validateCareerAchievement(player, achievement1);
  if (!result1.isValid) {
    return result1;
  }
  
  const result2 = validateCareerAchievement(player, achievement2);
  if (!result2.isValid) {
    return result2;
  }
  
  return {
    isValid: true,
    proofData: {
      achievements: [
        ...(result1.proofData.achievements || []),
        ...(result2.proofData.achievements || [])
      ]
    }
  };
}

/**
 * Validate career/non-season achievements
 */
function validateCareerAchievement(player: Player, achievementName: string): ValidationResult {
  
  // Draft achievements
  if (achievementName.includes('#1 Overall Pick') || achievementName.includes('1 Overall Pick')) {
    return validateDraftAchievement(player, 'first_overall');
  }
  if (achievementName.includes('First Round Pick')) {
    return validateDraftAchievement(player, 'first_round');
  }
  if (achievementName.includes('Second Round Pick')) {
    return validateDraftAchievement(player, 'second_round');
  }
  if (achievementName.includes('Went Undrafted') || achievementName.includes('Undrafted')) {
    return validateDraftAchievement(player, 'undrafted');
  }
  
  // Career milestones
  if (achievementName.includes('Hall of Fame')) {
    return validateHallOfFame(player);
  }
  if (achievementName.includes('Played 10+ Seasons')) {
    return validateSeasonsPlayed(player, 10);
  }
  if (achievementName.includes('Played 15+ Seasons')) {
    return validateSeasonsPlayed(player, 15);
  }
  
  // Career stat thresholds
  if (achievementName.includes('20,000+ Career Points') || achievementName.includes('20000+ Career Points')) {
    return validateCareerStatThreshold(player, 'pts', 20000, 'Career Points');
  }
  if (achievementName.includes('10,000+ Career Rebounds') || achievementName.includes('10000+ Career Rebounds')) {
    return validateCareerStatThreshold(player, 'trb', 10000, 'Career Rebounds');
  }
  if (achievementName.includes('5,000+ Career Assists') || achievementName.includes('5000+ Career Assists')) {
    return validateCareerStatThreshold(player, 'ast', 5000, 'Career Assists');
  }
  if (achievementName.includes('2,000+ Career Steals') || achievementName.includes('2000+ Career Steals')) {
    return validateCareerStatThreshold(player, 'stl', 2000, 'Career Steals');
  }
  if (achievementName.includes('1,500+ Career Blocks') || achievementName.includes('1500+ Career Blocks')) {
    return validateCareerStatThreshold(player, 'blk', 1500, 'Career Blocks');
  }
  if (achievementName.includes('2,000+ Made Threes') || achievementName.includes('2000+ Made Threes')) {
    return validateCareerStatThreshold(player, 'fg3', 2000, 'Made Threes');
  }
  
  return {
    isValid: false,
    proofData: { failureReason: `Unknown achievement: ${achievementName}` }
  };
}

// Helper functions for specific validations

function validateDraftAchievement(player: Player, draftType: string): ValidationResult {
  const draft = player.draft;
  if (!draft) {
    return {
      isValid: draftType === 'undrafted',
      proofData: { 
        failureReason: draftType === 'undrafted' ? undefined : 'Player has no draft data (likely undrafted).' 
      }
    };
  }
  
  let isValid = false;
  let draftInfo = '';
  
  switch (draftType) {
    case 'first_overall':
      isValid = draft.ovrPick === 1 || (draft.round === 1 && draft.pick === 1);
      draftInfo = isValid ? `#1 Overall Pick (${draft.year})` : `Player is not #1 overall (Round ${draft.round}, Pick ${draft.pick}, ${draft.year})`;
      break;
      
    case 'first_round':
      isValid = draft.round === 1;
      draftInfo = isValid ? `First Round Pick (Round ${draft.round}, Pick ${draft.pick}, ${draft.year})` : `Player is not first round (Round ${draft.round}, Pick ${draft.pick}, ${draft.year})`;
      break;
      
    case 'second_round':
      isValid = draft.round === 2 || (draft.ovrPick && draft.ovrPick >= 31 && !draft.round);
      draftInfo = isValid ? `Second Round Pick (Round ${draft.round || '2'}, Pick ${draft.pick}, ${draft.year})` : `Player is not second round (Round ${draft.round}, Pick ${draft.pick}, ${draft.year})`;
      break;
      
    case 'undrafted':
      isValid = (draft as any).type === 'undrafted' || draft.round === 0 || draft.tid === -1;
      draftInfo = isValid ? 'Went Undrafted' : `Player was drafted (Round ${draft.round}, Pick ${draft.pick}, ${draft.year})`;
      break;
  }
  
  return {
    isValid,
    proofData: isValid ? { draftInfo } : { failureReason: draftInfo }
  };
}

function validateHallOfFame(player: Player): ValidationResult {
  // Check direct HOF property
  if ((player as any).hof === true) {
    return {
      isValid: true,
      proofData: { achievements: ['Hall of Fame'] }
    };
  }
  
  // Check awards for HOF induction
  if (player.awards) {
    const hofAward = player.awards.find(award => 
      award.type.toLowerCase().includes('hall of fame') ||
      award.type.toLowerCase().includes('inducted')
    );
    
    if (hofAward) {
      return {
        isValid: true,
        proofData: { achievements: ['Hall of Fame'] }
      };
    }
  }
  
  return {
    isValid: false,
    proofData: { failureReason: 'Player is not in the Hall of Fame.' }
  };
}

function validateSeasonsPlayed(player: Player, minSeasons: number): ValidationResult {
  const seasons = new Set<number>();
  
  if (player.stats) {
    for (const stat of player.stats) {
      if (!stat.playoffs && (stat.gp || 0) > 0) {
        seasons.add(stat.season);
      }
    }
  }
  
  const seasonsCount = seasons.size;
  const isValid = seasonsCount >= minSeasons;
  
  return {
    isValid,
    proofData: isValid 
      ? { seasonsPlayed: seasonsCount, achievements: [`Played ${seasonsCount} seasons`] }
      : { failureReason: `Player did not play ${minSeasons}+ seasons (played ${seasonsCount}).` }
  };
}

function validateCareerStatThreshold(player: Player, statField: string, threshold: number, statName: string): ValidationResult {
  const careerTotal = getCareerStatTotal(player, statField);
  const isValid = careerTotal >= threshold;
  
  return {
    isValid,
    proofData: isValid
      ? { careerStats: { [statName]: careerTotal }, achievements: [`${threshold.toLocaleString()}+ ${statName} (${careerTotal.toLocaleString()})`] }
      : { failureReason: `Player did not reach ${threshold.toLocaleString()}+ ${statName} (has ${careerTotal.toLocaleString()}).` }
  };
}

function validateSeasonAlignedTeamAchievement(
  player: Player,
  teamId: number,
  achievementName: string,
  franchiseMap: Map<number, number>,
  teams: Team[]
): ValidationResult {
  
  const franchiseId = franchiseMap.get(teamId) || teamId;
  
  // Find seasons where player earned the achievement
  const achievementSeasons = getAchievementSeasons(player, achievementName);
  
  if (achievementSeasons.length === 0) {
    return {
      isValid: false,
      proofData: { failureReason: `Player never earned ${achievementName}.` }
    };
  }
  
  // Check if player played for the team in any of those seasons
  for (const season of achievementSeasons) {
    const teamInSeason = getPlayerTeamInSeason(player, season, franchiseMap);
    if (teamInSeason === franchiseId) {
      return {
        isValid: true,
        proofData: {
          teams: [`${getTeamName(teamId, teams)} (${season})`],
          achievements: [`${achievementName} (${season})`]
        }
      };
    }
  }
  
  return {
    isValid: false,
    proofData: { 
      failureReason: `Player did not earn ${achievementName} in a season when he played for ${getTeamName(teamId, teams)}.` 
    }
  };
}

// Helper functions

function isSeasonAlignedAchievement(achievementName: string): boolean {
  const seasonAligned = [
    'Most Improved Player', 'Won Championship', 'MVP', 'All-League', 'All-Star',
    'Defensive Player of the Year', 'Rookie of the Year', 'Finals MVP',
    'League', 'Leader' // For league leaders
  ];
  
  return seasonAligned.some(term => achievementName.includes(term));
}

function getTeamsPlayerPlayedFor(player: Player, franchiseMap: Map<number, number>): Set<number> {
  const teams = new Set<number>();
  
  if (player.stats) {
    for (const stat of player.stats) {
      if (!stat.playoffs && (stat.gp || 0) > 0) {
        const franchiseId = franchiseMap.get(stat.tid) || stat.tid;
        teams.add(franchiseId);
      }
    }
  }
  
  return teams;
}

function getYearsForTeam(player: Player, franchiseId: number, franchiseMap: Map<number, number>): number[] {
  const years: number[] = [];
  
  if (player.stats) {
    for (const stat of player.stats) {
      if (!stat.playoffs && (stat.gp || 0) > 0) {
        const statFranchiseId = franchiseMap.get(stat.tid) || stat.tid;
        if (statFranchiseId === franchiseId) {
          years.push(stat.season);
        }
      }
    }
  }
  
  return years.sort((a, b) => a - b);
}

function getCareerStatTotal(player: Player, field: string): number {
  if (!player.stats) return 0;
  
  // Group by season and sum within each season (handling multiple teams)
  const seasonTotals = new Map<number, number>();
  
  for (const stat of player.stats) {
    if (stat.playoffs) continue; // Regular season only
    
    const season = stat.season;
    const value = (stat as any)[field] || 0;
    
    seasonTotals.set(season, (seasonTotals.get(season) || 0) + value);
  }
  
  // Sum across all seasons
  return Array.from(seasonTotals.values()).reduce((sum, value) => sum + value, 0);
}

function getAchievementSeasons(player: Player, achievementName: string): number[] {
  if (!player.awards) return [];
  
  const seasons: number[] = [];
  
  for (const award of player.awards) {
    if (matchesAchievementName(award.type, achievementName)) {
      seasons.push(award.season);
    }
  }
  
  return seasons;
}

function matchesAchievementName(awardType: string, achievementName: string): boolean {
  const awardLower = awardType.toLowerCase();
  const achievementLower = achievementName.toLowerCase();
  
  // Direct matches
  if (achievementLower.includes('most improved') && awardLower.includes('most improved')) return true;
  if (achievementLower.includes('champion') && awardLower.includes('champion')) return true;
  if (achievementLower.includes('mvp') && awardLower.includes('most valuable player')) return true;
  if (achievementLower.includes('all-league') && awardLower.includes('all-league')) return true;
  if (achievementLower.includes('all-star') && awardLower.includes('all-star')) return true;
  if (achievementLower.includes('defensive player') && awardLower.includes('defensive player')) return true;
  if (achievementLower.includes('rookie of the year') && awardLower.includes('rookie of the year')) return true;
  if (achievementLower.includes('finals mvp') && awardLower.includes('finals mvp')) return true;
  
  // League leaders
  if (achievementLower.includes('leader')) {
    if (achievementLower.includes('points') && awardLower.includes('scoring')) return true;
    if (achievementLower.includes('rebounds') && awardLower.includes('rebounding')) return true;
    if (achievementLower.includes('assists') && awardLower.includes('assists')) return true;
    if (achievementLower.includes('steals') && awardLower.includes('steals')) return true;
    if (achievementLower.includes('blocks') && awardLower.includes('blocks')) return true;
  }
  
  return false;
}

function getPlayerTeamInSeason(player: Player, season: number, franchiseMap: Map<number, number>): number | null {
  if (!player.stats) return null;
  
  // For regular season, find the team (use the last team if multiple)
  let teamId: number | null = null;
  for (const stat of player.stats) {
    if (stat.season === season && !stat.playoffs && (stat.gp || 0) > 0) {
      teamId = stat.tid;
    }
  }
  
  return teamId ? (franchiseMap.get(teamId) || teamId) : null;
}

function getTeamName(teamId: number, teams: Team[]): string {
  const team = teams.find(t => t.tid === teamId);
  return team?.name || `Team ${teamId}`;
}