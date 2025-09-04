import type { Player, Team } from '@/types/bbgm';
import { 
  formatTeamName, 
  getSeasonsOnTeam, 
  getAwardSeasons, 
  formatSeasonsList, 
  getCareerTotals, 
  getFinalsTeamForSeason,
  isUS50OrDC,
  getDraftAge,
  formatDraftInfo,
  getCareerTeams,
  hasSeasonHarmonization,
  ACHIEVEMENT_NAMES 
} from './player-modal-helpers';

export interface ModalContent {
  isCorrect: boolean;
  content: string[]; // Array of bullet points for correct, or sentences for incorrect
}

export interface CellConstraint {
  type: 'team' | 'achievement';
  tid?: number;
  achievementId?: string;
  label: string;
}

/**
 * Generate modal content for a player guess in a specific cell
 */
export function generateModalContent(
  player: Player,
  rowConstraint: CellConstraint,
  colConstraint: CellConstraint,
  teamsById: Record<number, Team>,
  isCorrectGuess: boolean
): ModalContent {
  
  if (isCorrectGuess) {
    return generateCorrectContent(player, rowConstraint, colConstraint, teamsById);
  } else {
    return generateIncorrectContent(player, rowConstraint, colConstraint, teamsById);
  }
}

/**
 * Generate content for correct guesses (bullet points)
 */
function generateCorrectContent(
  player: Player,
  rowConstraint: CellConstraint,
  colConstraint: CellConstraint,
  teamsById: Record<number, Team>
): ModalContent {
  const content: string[] = [];
  
  // Handle different cell types
  if (rowConstraint.type === 'team' && colConstraint.type === 'team') {
    // Team × Team
    const rowTeam = teamsById[rowConstraint.tid!];
    const colTeam = teamsById[colConstraint.tid!];
    
    content.push(`• ${formatTeamName(rowTeam)} (${getSeasonsOnTeam(player, rowConstraint.tid!)})`);
    content.push(`• ${formatTeamName(colTeam)} (${getSeasonsOnTeam(player, colConstraint.tid!)})`);
    
  } else if (rowConstraint.type === 'team' && colConstraint.type === 'achievement') {
    // Team × Achievement
    const team = teamsById[rowConstraint.tid!];
    
    content.push(`• ${formatTeamName(team)} (${getSeasonsOnTeam(player, rowConstraint.tid!)})`);
    content.push(formatAchievementBullet(player, colConstraint.achievementId!, teamsById));
    
  } else if (rowConstraint.type === 'achievement' && colConstraint.type === 'team') {
    // Achievement × Team
    const team = teamsById[colConstraint.tid!];
    
    content.push(formatAchievementBullet(player, rowConstraint.achievementId!, teamsById));
    content.push(`• ${formatTeamName(team)} (${getSeasonsOnTeam(player, colConstraint.tid!)})`);
    
  } else if (rowConstraint.type === 'achievement' && colConstraint.type === 'achievement') {
    // Achievement × Achievement
    content.push(formatAchievementBullet(player, rowConstraint.achievementId!, teamsById));
    content.push(formatAchievementBullet(player, colConstraint.achievementId!, teamsById));
  }
  
  return { isCorrect: true, content };
}

/**
 * Generate content for incorrect guesses (explanatory sentences)
 */
function generateIncorrectContent(
  player: Player,
  rowConstraint: CellConstraint,
  colConstraint: CellConstraint,
  teamsById: Record<number, Team>
): ModalContent {
  const content: string[] = [];
  
  // Handle different cell types
  if (rowConstraint.type === 'team' && colConstraint.type === 'team') {
    // Team × Team
    const rowTeam = teamsById[rowConstraint.tid!];
    const colTeam = teamsById[colConstraint.tid!];
    const careerTeams = getCareerTeams(player, teamsById);
    
    content.push(`${player.name} did not play for both ${formatTeamName(rowTeam)} and ${formatTeamName(colTeam)}. (Teams: ${careerTeams.join(', ')})`);
    
  } else if (rowConstraint.type === 'team' && colConstraint.type === 'achievement') {
    // Team × Achievement
    const team = teamsById[rowConstraint.tid!];
    const explanation = generateTeamAchievementError(player, rowConstraint.tid!, colConstraint.achievementId!, team, teamsById);
    content.push(explanation);
    
  } else if (rowConstraint.type === 'achievement' && colConstraint.type === 'team') {
    // Achievement × Team  
    const team = teamsById[colConstraint.tid!];
    const explanation = generateTeamAchievementError(player, colConstraint.tid!, rowConstraint.achievementId!, team, teamsById);
    content.push(explanation);
    
  } else if (rowConstraint.type === 'achievement' && colConstraint.type === 'achievement') {
    // Achievement × Achievement
    const explanation = generateAchievementAchievementError(player, rowConstraint.achievementId!, colConstraint.achievementId!, teamsById);
    content.push(explanation);
  }
  
  return { isCorrect: false, content };
}

/**
 * Format achievement bullet point for correct answers
 */
function formatAchievementBullet(player: Player, achievementId: string, teamsById: Record<number, Team>): string {
  const achievementName = ACHIEVEMENT_NAMES[achievementId] || achievementId;
  
  // Career achievements
  if (isCareerAchievement(achievementId)) {
    return formatCareerAchievementBullet(player, achievementId);
  }
  
  // Season achievements
  const seasons = getAwardSeasons(player, achievementId);
  if (achievementId === 'FinalsMVP') {
    // Special handling for Finals MVP to show teams
    const teamsSeasons = seasons.map(season => {
      const teamId = getFinalsTeamForSeason(player, season);
      const team = teamId ? teamsById[teamId] : null;
      return team ? `${season} – ${team.abbrev}` : season.toString();
    });
    return `• ${achievementName} (${teamsSeasons.join(', ')})`;
  }
  
  return `• ${achievementName} (${formatSeasonsList(seasons)})`;
}

/**
 * Format career achievement bullet points
 */
function formatCareerAchievementBullet(player: Player, achievementId: string): string {
  const totals = getCareerTotals(player);
  
  switch (achievementId) {
    case 'isPick1Overall':
      return `• #1 Overall Pick (${player.draft?.year || 'Unknown'})`;
    case 'isFirstRoundPick':
      return `• First Round Pick (${player.draft?.year || 'Unknown'})`;
    case 'isSecondRoundPick':
      return `• Second Round Pick (${player.draft?.year || 'Unknown'})`;
    case 'isUndrafted':
      return `• Undrafted (${player.draft?.year || 'Unknown'})`;
    case 'draftedTeen':
      const age = getDraftAge(player);
      return `• Drafted as Teenager (age ${age || 'Unknown'})`;
    case 'isHallOfFamer':
      return `• Hall of Fame`;
    case 'played10PlusSeasons':
      return `• Played ${totals.seasonsPlayed} Seasons`;
    case 'played15PlusSeasons':
      return `• Played ${totals.seasonsPlayed} Seasons`;
    case 'bornOutsideUS50DC':
      return `• Born: ${player.born?.loc || 'Unknown'}`;
    case 'career20kPoints':
      return `• Career Points (${totals.points.toLocaleString()})`;
    case 'career10kRebounds':
      return `• Career Rebounds (${totals.rebounds.toLocaleString()})`;
    case 'career5kAssists':
      return `• Career Assists (${totals.assists.toLocaleString()})`;
    case 'career2kSteals':
      return `• Career Steals (${totals.steals.toLocaleString()})`;
    case 'career1500Blocks':
      return `• Career Blocks (${totals.blocks.toLocaleString()})`;
    case 'career2kThrees':
      return `• Career Made Threes (${totals.threes.toLocaleString()})`;
    default:
      return `• ${achievementId}`;
  }
}

/**
 * Check if achievement is career-based vs season-based
 */
function isCareerAchievement(achievementId: string): boolean {
  const careerAchievements = [
    'isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen',
    'isHallOfFamer', 'played10PlusSeasons', 'played15PlusSeasons', 'bornOutsideUS50DC',
    'career20kPoints', 'career10kRebounds', 'career5kAssists', 'career2kSteals', 
    'career1500Blocks', 'career2kThrees'
  ];
  return careerAchievements.includes(achievementId);
}

/**
 * Generate error message for Team × Achievement mismatches
 */
function generateTeamAchievementError(
  player: Player, 
  tid: number, 
  achievementId: string, 
  team: Team,
  teamsById: Record<number, Team>
): string {
  const teamName = formatTeamName(team);
  const achievementName = ACHIEVEMENT_NAMES[achievementId] || achievementId;
  
  // Check if player played for the team
  const teamSeasons = getSeasonsOnTeam(player, tid);
  if (!teamSeasons) {
    const careerTeams = getCareerTeams(player, teamsById);
    return `${player.name} did not play for ${teamName}. (Teams: ${careerTeams.join(', ')})`;
  }
  
  // Career achievements - just check if they have it
  if (isCareerAchievement(achievementId)) {
    const actualProof = getCareerAchievementProof(player, achievementId);
    return `${player.name} did play for ${teamName}, but did not meet ${achievementName}. (${actualProof})`;
  }
  
  // Season achievements - check for season harmonization
  const achievementSeasons = getAwardSeasons(player, achievementId);
  if (achievementSeasons.length === 0) {
    return `${player.name} did play for ${teamName}, but did not win ${achievementName}. (${achievementName}: 0×)`;
  }
  
  // Check season harmonization
  const harmonization = hasSeasonHarmonization(player, tid, achievementId, achievementSeasons);
  if (!harmonization.hasHarmonization) {
    return `${player.name} did win ${achievementName}, but not in a season he played for ${teamName}. (${achievementName} seasons: ${formatSeasonsList(achievementSeasons)}; ${teamName} seasons: ${teamSeasons})`;
  }
  
  // Special case for Finals MVP team mismatch
  if (achievementId === 'FinalsMVP') {
    const season = achievementSeasons[0]; // Assume first one for simplicity
    const finalsTeamId = getFinalsTeamForSeason(player, season);
    const finalsTeam = finalsTeamId ? teamsById[finalsTeamId] : null;
    if (finalsTeam && finalsTeamId !== tid) {
      return `${player.name} did win Finals MVP, but not with ${teamName} in that Finals season. (Finals team: ${finalsTeam.abbrev}, ${season})`;
    }
  }
  
  return `${player.name} did not meet the criteria for ${teamName} × ${achievementName}.`;
}

/**
 * Generate error message for Achievement × Achievement mismatches
 */
function generateAchievementAchievementError(
  player: Player,
  achievementId1: string,
  achievementId2: string,
  teamsById: Record<number, Team>
): string {
  const achievement1Name = ACHIEVEMENT_NAMES[achievementId1] || achievementId1;
  const achievement2Name = ACHIEVEMENT_NAMES[achievementId2] || achievementId2;
  
  const hasAchievement1 = checkPlayerHasAchievement(player, achievementId1);
  const hasAchievement2 = checkPlayerHasAchievement(player, achievementId2);
  
  if (!hasAchievement1 && !hasAchievement2) {
    return `${player.name} did not win ${achievement1Name} or ${achievement2Name}.`;
  } else if (!hasAchievement1) {
    const proof2 = getAchievementProof(player, achievementId2);
    return `${player.name} did not win ${achievement1Name}. (${achievement1Name}: 0×)`;
  } else if (!hasAchievement2) {
    const proof1 = getAchievementProof(player, achievementId1);
    return `${player.name} did not win ${achievement2Name}. (${achievement2Name}: 0×)`;
  }
  
  // Both season achievements but no overlap
  if (!isCareerAchievement(achievementId1) && !isCareerAchievement(achievementId2)) {
    const seasons1 = getAwardSeasons(player, achievementId1);
    const seasons2 = getAwardSeasons(player, achievementId2);
    const overlap = seasons1.filter(s => seasons2.includes(s));
    
    if (overlap.length === 0) {
      return `${player.name} did win ${achievement1Name} (${formatSeasonsList(seasons1)}) and ${achievement2Name} (${formatSeasonsList(seasons2)}), but not in the same season.`;
    }
  }
  
  return `${player.name} did not meet the criteria for both achievements.`;
}

/**
 * Check if player has a specific achievement
 */
function checkPlayerHasAchievement(player: Player, achievementId: string): boolean {
  if (isCareerAchievement(achievementId)) {
    return checkCareerAchievement(player, achievementId);
  } else {
    return getAwardSeasons(player, achievementId).length > 0;
  }
}

/**
 * Check career achievement
 */
function checkCareerAchievement(player: Player, achievementId: string): boolean {
  const totals = getCareerTotals(player);
  const draftAge = getDraftAge(player);
  
  switch (achievementId) {
    case 'isPick1Overall':
      return player.draft?.round === 1 && player.draft?.pick === 1;
    case 'isFirstRoundPick':
      return player.draft?.round === 1;
    case 'isSecondRoundPick':
      return player.draft?.round === 2;
    case 'isUndrafted':
      return !player.draft?.round || player.draft.round === 0 || !player.draft?.pick || player.draft.pick === 0;
    case 'draftedTeen':
      return draftAge !== null && draftAge <= 19;
    case 'isHallOfFamer':
      return player.achievements?.isHallOfFamer === true;
    case 'played10PlusSeasons':
      return totals.seasonsPlayed >= 10;
    case 'played15PlusSeasons':
      return totals.seasonsPlayed >= 15;
    case 'bornOutsideUS50DC':
      return !isUS50OrDC(player.born?.loc);
    case 'career20kPoints':
      return totals.points >= 20000;
    case 'career10kRebounds':
      return totals.rebounds >= 10000;
    case 'career5kAssists':
      return totals.assists >= 5000;
    case 'career2kSteals':
      return totals.steals >= 2000;
    case 'career1500Blocks':
      return totals.blocks >= 1500;
    case 'career2kThrees':
      return totals.threes >= 2000;
    default:
      return false;
  }
}

/**
 * Get proof text for career achievements
 */
function getCareerAchievementProof(player: Player, achievementId: string): string {
  const totals = getCareerTotals(player);
  const draftAge = getDraftAge(player);
  
  switch (achievementId) {
    case 'isPick1Overall':
      return `Draft: ${formatDraftInfo(player)}`;
    case 'isFirstRoundPick':
      return `Draft: ${formatDraftInfo(player)}`;
    case 'isSecondRoundPick':
      return `Draft: ${formatDraftInfo(player)}`;
    case 'isUndrafted':
      return `Draft: ${formatDraftInfo(player)}`;
    case 'draftedTeen':
      return `Age at draft: ${draftAge || 'Unknown'}`;
    case 'played10PlusSeasons':
      return `Actual: ${totals.seasonsPlayed}`;
    case 'played15PlusSeasons':
      return `Actual: ${totals.seasonsPlayed}`;
    case 'bornOutsideUS50DC':
      return player.born?.loc || 'Unknown birthplace';
    case 'career20kPoints':
      return `Actual: ${totals.points.toLocaleString()}`;
    case 'career10kRebounds':
      return `Actual: ${totals.rebounds.toLocaleString()}`;
    case 'career5kAssists':
      return `Actual: ${totals.assists.toLocaleString()}`;
    case 'career2kSteals':
      return `Actual: ${totals.steals.toLocaleString()}`;
    case 'career1500Blocks':
      return `Actual: ${totals.blocks.toLocaleString()}`;
    case 'career2kThrees':
      return `Actual: ${totals.threes.toLocaleString()}`;
    default:
      return 'Unknown';
  }
}

/**
 * Get proof text for any achievement
 */
function getAchievementProof(player: Player, achievementId: string): string {
  if (isCareerAchievement(achievementId)) {
    return getCareerAchievementProof(player, achievementId);
  } else {
    const seasons = getAwardSeasons(player, achievementId);
    return formatSeasonsList(seasons);
  }
}