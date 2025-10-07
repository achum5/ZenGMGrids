import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlayerFace } from "@/components/PlayerFace";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { useMemo } from 'react';
import type { Player, Team, CatTeam } from '@/types/bbgm';
import { computeRarityForGuess, playerToEligibleLite } from '@/lib/rarity';
import { type GridConstraint } from '@/lib/feedback';
import { cellKey } from '@/lib/grid-generator';
import { CareerTeamLogo, checkAllTeamsHaveLogos } from '@/components/CareerTeamLogo';
import { generateReasonBullets, getSeasonsForSeasonStatAchievement, formatBulletSeasonList } from '@/lib/reason-bullets';
import { playerMeetsAchievement, getAllAchievements, getCachedSportDetection, getCachedLeagueYears } from '@/lib/achievements';
import { getCachedSeasonIndex } from '@/lib/season-index-cache';
import { parseAchievementLabel, parseCustomAchievementId } from '@/lib/editable-achievements';
import { rarityBadgeStyles } from '@/components/RarityChip';

// Helper to determine rarity tier based on playerCount
const getRarityTier = (count: number) => {
  if (count >= 90) return 'mythic';
  if (count >= 75) return 'legendary';
  if (count >= 60) return 'epic';
  if (count >= 40) return 'rare';
  if (count >= 20) return 'uncommon';
  if (count >= 10) return 'common';
  return 'none'; // For playerCount < 10 or 0
};

// Define color and gradient for each rarity tier
const rarityStyles: Record<string, { bgColor: string; gradient: string; textColor: string; borderColor: string }> = {
  common: {
    bgColor: '#3DB2FF',
    gradient: 'linear-gradient(135deg, #69C8FF 0%, #2A8AE0 100%)',
    textColor: 'white',
    borderColor: '#2A8AE0',
  },
  uncommon: {
    bgColor: '#00D68F',
    gradient: 'linear-gradient(135deg, #3EF1B3 0%, #00A070 100%)',
    textColor: 'white',
    borderColor: '#00A070',
  },
  rare: {
    bgColor: '#FFD93D',
    gradient: 'linear-gradient(135deg, #FFE875 0%, #E3B900 100%)',
    textColor: 'black',
    borderColor: '#E3B900',
  },
  epic: {
    bgColor: '#FF7A00',
    gradient: 'linear-gradient(135deg, #FF9C40 0%, #E66000 100%)',
    textColor: 'white',
    borderColor: '#E66000',
  },
  legendary: {
    bgColor: '#FF3D68',
    gradient: 'linear-gradient(135deg, #FF6D8C 0%, #D82A4F 100%)',
    textColor: 'white',
    borderColor: '#D82A4F',
  },
  mythic: {
    bgColor: '#B537F2',
    gradient: 'linear-gradient(135deg, #D178FF 0%, #8B1BD1 100%)',
    textColor: 'white',
    borderColor: '#8B1BD1',
  },
  none: { // For playerCount < 10 or 0
    bgColor: 'transparent',
    gradient: 'none',
    textColor: 'white',
    borderColor: '#ef4444', // Default red for invalid
  }
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  player: Player | null;
  teams: Team[];
  eligiblePlayers?: Player[];
  puzzleSeed?: string;
  rows?: CatTeam[];
  cols?: CatTeam[];
  currentCellKey?: string;
  sport?: string;
  isGridCompleted?: boolean;
};

// Generate feedback message for an incorrect guess
function generateFeedbackMessage(
  player: Player,
  rowConstraint: GridConstraint,
  colConstraint: GridConstraint,
  teams: Team[],
  sport: 'basketball' | 'football' | 'hockey' | 'baseball' | undefined,
  allAchievements: ReturnType<typeof getAllAchievements>,
  seasonIndex: any // Add seasonIndex here
): string {
  const rowMet = checkConstraint(player, rowConstraint, teams, sport, allAchievements, seasonIndex, colConstraint);
  const colMet = checkConstraint(player, colConstraint, teams, sport, allAchievements, seasonIndex, rowConstraint);

  const rowPhraseMet = getConstraintPhrase(player, rowConstraint, teams, sport, allAchievements, true);
  const rowPhraseNotMet = getConstraintPhrase(player, rowConstraint, teams, sport, allAchievements, false);
  const colPhraseMet = getConstraintPhrase(player, colConstraint, teams, sport, allAchievements, true);
  const colPhraseNotMet = getConstraintPhrase(player, colConstraint, teams, sport, allAchievements, false);

  if (rowMet && colMet) {
    // This case should ideally not be reached for an "incorrect guess" modal, but as a fallback:
    return `${player.name} ${rowPhraseMet.replace(`${player.name} `, '')} and ${colPhraseMet.replace(`${player.name} `, '')}. (Unexpected: This player meets both criteria.)`;
  } else if (rowMet && !colMet) {
    return `${player.name} ${rowPhraseMet.replace(`${player.name} `, '')}, but ${colPhraseNotMet.replace(`${player.name} `, '')}.`;
  } else if (!rowMet && colMet) {
    return `${player.name} ${colPhraseMet.replace(`${player.name} `, '')}, but ${rowPhraseNotMet.replace(`${player.name} `, '')}.`;
      } else { // !rowMet && !colMet
        const rowNegative = extractNegativeObjectAndVerb(rowPhraseNotMet, player.name);
        const colNegative = extractNegativeObjectAndVerb(colPhraseNotMet, player.name);

        if (rowNegative.verb === colNegative.verb) {
          // If verbs are the same, use "neither X nor Y"
          return `${player.name} ${rowNegative.verb} neither ${rowNegative.object} nor ${colNegative.object}.`;
        } else {
          // If verbs are different, use "nor did they..." or "nor was/is [player name]..."
          let norClause = '';
          if (colNegative.verb === 'was' || colNegative.verb === 'is') {
            norClause = `nor ${colNegative.verb} ${player.name} ${colNegative.object}`;
          } else {
            norClause = `nor did they ${colNegative.verb} ${colNegative.object}`;
          }
          return `${rowPhraseNotMet.replace('.', '')}, ${norClause}.`;
        }
      }
}

// Helper to check if a player meets a constraint
function checkConstraint(
  player: Player,
  constraint: GridConstraint,
  teams: Team[],
  sport: 'basketball' | 'football' | 'hockey' | 'baseball' | undefined,
  allAchievements: ReturnType<typeof getAllAchievements>,
  seasonIndex: any, // Add seasonIndex here
  otherConstraint?: GridConstraint // Add otherConstraint here
): boolean {
  if (constraint.type === 'team') {
    return player.stats?.some(s => s.tid === constraint.tid && !s.playoffs) || false;
  } else if (constraint.type === 'achievement') {
    const achievement = allAchievements.find(a => a.id === constraint.achievementId);
    if (achievement) {
      let teamIdForAchievement: number | undefined;
      let seasonForAchievement: number | undefined;

      // If the other constraint is a team, use its teamId and infer a season if possible
      if (otherConstraint?.type === 'team') {
        teamIdForAchievement = otherConstraint.tid;
        // For team constraints, we need to find a season where the player played for that team
        // This is a simplification; a more robust solution might involve iterating through seasons
        // or having the season passed explicitly from the grid cell context.
        // For now, we'll assume if a team constraint is present, we're looking for *any* season
        // where the player met the achievement *with that team*.
        // However, the `playerMeetsAchievement` function will handle the season iteration.
      }
      return playerMeetsAchievement(player, achievement.id, seasonIndex, '>=', teamIdForAchievement, seasonForAchievement);
    }
  }
  return false;
}

// Helper to get a readable label for a constraint
function getConstraintLabel(
  constraint: GridConstraint,
  teams: Team[],
  allAchievements: ReturnType<typeof getAllAchievements>
): string {
  if (constraint.type === 'team') {
    const team = teams.find(t => t.tid === constraint.tid);
    return constraint.label || (team ? `${team.region} ${team.name}` : `Team ${constraint.tid}`);
  } else if (constraint.type === 'achievement') {
    const achievement = allAchievements.find(a => a.id === constraint.achievementId);
    if (achievement) {
      return parseAchievementLabel(achievement.label, getCachedSportDetection() || 'basketball').originalLabel;
    }
    return constraint.label || constraint.achievementId || 'Unknown Achievement';
  }
  return 'Unknown Criteria';
}

// Helper to get specific details for an achievement (e.g., years for awards, value for stats)
function getAchievementDetails(
  player: Player,
  achievementId: string,
  teams: Team[],
  sport: 'basketball' | 'football' | 'hockey' | 'baseball' | undefined,
  allAchievements: ReturnType<typeof getAllAchievements>
): { value?: string | number; years?: string; label: string; isPlural?: boolean; isAverage?: boolean } | null {
  const achievement = allAchievements.find(a => a.id === achievementId);
  if (!achievement) return null;

  const baseLabel = parseAchievementLabel(achievement.label, sport).originalLabel || achievement.label || achievementId || 'Unknown Achievement';
  let value: string | number | undefined;
  let years: string | undefined;
  let isPlural = false;
  let isAverage = false; // Initialize isAverage

  const getAwardSeasons = (awardTypes: string[]) => {
    const seasons = player.awards?.filter(a => awardTypes.some(type => a.type?.includes(type))).map(a => a.season).sort((a, b) => a - b) || [];
    if (seasons.length > 0) {
      isPlural = seasons.length > 1;
      return seasons.length === 1 ? seasons[0].toString() : `${seasons[0]}–${seasons[seasons.length - 1]}`;
    }
    return undefined;
  };

  // Logic to extract details based on achievement type
  if (achievementId.startsWith('career')) {
    // Career statistical milestones
    if (achievementId.includes('Points')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + (s.pts || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Rebounds')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + (s.trb || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Assists')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + (s.ast || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Steals')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + (s.stl || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Blocks')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + (s.blk || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Threes')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).tpm || (s as any).tp || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('PassTDs')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).pssTD || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('RushYds')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).rusYds || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('RushTDs')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).rusTD || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('RecYds')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).recYds || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('RecTDs')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).recTD || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Sacks')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).sks || (s as any).defSk || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Ints')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).defInt || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Hits')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).h || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('HRs')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).hr || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('RBIs')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).rbi || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('SBs')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).sb || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Runs')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).r || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Wins') && sport === 'baseball') {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).w || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Ks')) {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).soPit || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Saves') && sport === 'baseball') {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).sv || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Goals') && sport === 'hockey') {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).goals || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Assists') && sport === 'hockey') {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).assists || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Points') && sport === 'hockey') {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).points || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Wins') && sport === 'hockey') {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).wins || 0), 0)?.toLocaleString();
    } else if (achievementId.includes('Shutouts') && sport === 'hockey') {
      value = player.stats?.filter(s => !s.playoffs).reduce((acc, s) => acc + ((s as any).shutouts || 0), 0)?.toLocaleString();
    }
  } else if (achievementId.startsWith('Season')) {
    // For ALL Season* achievements, use the robust logic from reason-bullets.
    const qualifyingSeasons = getSeasonsForSeasonStatAchievement(player, achievementId as any, undefined, undefined, 1);
    if (qualifyingSeasons.length > 0) {
      years = formatBulletSeasonList(qualifyingSeasons, false);
      isPlural = qualifyingSeasons.length > 1;
    }
    // No single "value" for these, so we leave it undefined.
  } else if (achievementId === 'AllStar') {
    years = getAwardSeasons(['All-Star']);
  } else if (achievementId === 'MVP') {
    years = getAwardSeasons(['Most Valuable Player']);
  } else if (achievementId === 'DPOY') {
    years = getAwardSeasons(['Defensive Player of the Year', 'DPOY']);
  } else if (achievementId === 'ROY') {
    years = getAwardSeasons(['Rookie of the Year']);
  } else if (achievementId === 'SMOY') {
    years = getAwardSeasons(['Sixth Man of the Year']);
  } else if (achievementId === 'MIP') {
    years = getAwardSeasons(['Most Improved Player']);
  } else if (achievementId === 'FinalsMVP') {
    years = getAwardSeasons(['Finals MVP']);
  } else if (achievementId === 'AllLeagueAny') {
    years = getAwardSeasons(['All-League']);
  } else if (achievementId === 'AllDefAny') {
    years = getAwardSeasons(['All-Defensive']);
  } else if (achievementId === 'AllRookieAny') {
    years = getAwardSeasons(['All-Rookie']);
  } else if (achievementId === 'threePointContestWinner') {
    years = getAwardSeasons(['Three-Point Contest Winner']);
  } else if (achievementId === 'dunkContestWinner') {
    years = getAwardSeasons(['Slam Dunk Contest Winner']);
  } else if (achievementId === 'playedAtAge40Plus') {
    const seasonsAtAge40Plus = player.stats?.filter(s => !s.playoffs && (s.gp || 0) > 0 && s.season - (player.born?.year || 0) >= 40).map(s => s.season).sort((a, b) => a - b) || [];
    if (seasonsAtAge40Plus.length > 0) {
      years = seasonsAtAge40Plus.length === 1 ? seasonsAtAge40Plus[0].toString() : `${seasonsAtAge40Plus[0]}–${seasonsAtAge40Plus[seasonsAtAge40Plus.length - 1]}`;
    }
  } else if (achievementId === 'royLaterMVP') {
    const roySeasons = player.awards?.filter(a => a.type?.includes('Rookie of the Year')).map(a => a.season) || [];
    const mvpSeasons = player.awards?.filter(a => a.type?.includes('Most Valuable Player')).map(a => a.season) || [];
    if (roySeasons.length > 0 && mvpSeasons.length > 0) {
      const combinedYears = [...new Set([...roySeasons, ...mvpSeasons])].sort((a, b) => a - b);
      years = combinedYears.length === 1 ? combinedYears[0].toString() : `${combinedYears[0]}–${combinedYears[combinedYears.length - 1]}`;
    }
  } else if (achievementId.includes('playedIn') && achievementId.endsWith('s')) {
    const decadeMatch = achievementId.match(/playedIn(\d{4})s/);
    if (decadeMatch) {
      const decade = parseInt(decadeMatch[1]);
      const playedSeasonsInDecade = player.stats?.filter(s => !s.playoffs && s.season >= decade && s.season < decade + 10).map(s => s.season).sort((a, b) => a - b) || [];
      if (playedSeasonsInDecade.length > 0) {
        years = playedSeasonsInDecade.length === 1 ? playedSeasonsInDecade[0].toString() : `${playedSeasonsInDecade[0]}–${playedSeasonsInDecade[playedSeasonsInDecade.length - 1]}`;
      }
    }
  } else if (achievementId.includes('debutedIn') && achievementId.endsWith('s')) {
    const firstSeason = player.firstSeason;
    if (firstSeason) {
      years = firstSeason.toString();
    }
  } else if (achievementId === 'isHallOfFamer') {
    years = getAwardSeasons(['Inducted into the Hall of Fame']);
  } else if (achievementId === 'played15PlusSeasons') {
    const seasonCount = new Set(player.stats?.filter(s => !s.playoffs && (s.gp || 0) > 0).map(s => s.season)).size;
    value = seasonCount;
    isPlural = seasonCount !== 1;
  } else if (achievementId === 'played5PlusFranchises') {
    const franchiseCount = new Set(player.stats?.filter(s => s.tid !== -1).map(s => s.tid)).size;
    value = franchiseCount;
    isPlural = franchiseCount !== 1;
  } else if (achievementId === 'isPick1Overall' || achievementId === 'isFirstRoundPick' || achievementId === 'isSecondRoundPick' || achievementId === 'isUndrafted' || achievementId === 'draftedTeen') {
    if (player.draft) {
      const draftYear = player.draft.year;
      const round = player.draft.round;
      const pick = player.draft.pick;
      if (achievementId === 'isUndrafted') {
        years = draftYear ? `(${draftYear})` : '';
      } else {
        years = draftYear && round && pick ? `(${draftYear} - Round ${round} Pick ${pick})` : (draftYear ? `(${draftYear})` : '');
      }
    }
  } else if (achievementId === 'bornOutsideUS50DC') {
    // No specific years or value needed, just the boolean status
  } else if (achievementId.includes('Leader')) {
    // For statistical leaders (e.g., PointsLeader)
    const leaderType = achievementId.replace('Leader', '');
    const statFieldMap: Record<string, string> = {
      Points: 'pts',
      Rebounds: 'trb',
      Assists: 'ast',
      Steals: 'stl',
      Blocks: 'blk',
    };
    const field = statFieldMap[leaderType];
    if (field) {
      const leaderSeasons = player.awards?.filter(a => a.type?.includes(`${leaderType} Leader`)).map(a => a.season).sort((a, b) => a - b) || [];
      if (leaderSeasons.length > 0) {
        years = leaderSeasons.length === 1 ? leaderSeasons[0].toString() : `${leaderSeasons[0]}–${leaderSeasons[leaderSeasons.length - 1]}`;
        isPlural = leaderSeasons.length > 1;
      }
    }
  } else if (achievementId === 'Won Championship') {
    years = getAwardSeasons(['Won Championship', 'Championship']);
  }

  return { value, years, label: baseLabel, isPlural, isAverage };
}

// Helper to generate a natural language phrase for a single constraint
function getConstraintPhrase(
  player: Player,
  constraint: GridConstraint,
  teams: Team[],
  sport: 'basketball' | 'football' | 'hockey' | 'baseball' | undefined,
  allAchievements: ReturnType<typeof getAllAchievements>,
  met: boolean
): string {
  const playerName = player.name;

  if (constraint.type === 'team') {
    const team = teams.find(t => t.tid === constraint.tid);
    const teamName = constraint.label || (team ? `${team.region} ${team.name}` : `Team ${constraint.tid}`);
    const teamSeasons = player.stats?.filter(s => s.tid === constraint.tid && !s.playoffs && (s.gp || 0) > 0).map(s => s.season).sort((a, b) => a - b) || [];
    const yearRange = teamSeasons.length === 1 ? teamSeasons[0].toString() : (teamSeasons.length > 1 ? `${teamSeasons[0]}–${teamSeasons[teamSeasons.length - 1]}` : '');

    if (met) {
      return `${playerName} played for the ${teamName}${yearRange ? ` (${yearRange})` : ''}`;
    } else {
      return `${playerName} never played for the ${teamName}`;
    }
  } else if (constraint.type === 'achievement') {
    const originalAchievementId = constraint.achievementId;
    let baseAchievementId = originalAchievementId;
    if (originalAchievementId?.includes('_custom_')) {
        baseAchievementId = originalAchievementId.split('_custom_')[0];
    }

    let isCompletePhrase: boolean;
    if (!constraint.achievementId) {
      const fallbackLabel = getConstraintLabel(constraint, teams, allAchievements);
      isCompletePhrase = fallbackLabel.includes('MPG') || fallbackLabel.includes('Champion') || fallbackLabel.includes('Leader') || fallbackLabel.includes('Season');
      return met ? `${playerName} met the criteria${isCompletePhrase ? ':' : ' for:'} ${fallbackLabel}` : `${playerName} did not meet the criteria${isCompletePhrase ? ':' : ' for:'} ${fallbackLabel}`;
    }
    
    const achievementDetails = getAchievementDetails(player, constraint.achievementId, teams, sport, allAchievements);
    if (!achievementDetails) {
      const fallbackLabel = getConstraintLabel(constraint, teams, allAchievements);
      isCompletePhrase = fallbackLabel.includes('MPG') || fallbackLabel.includes('Champion') || fallbackLabel.includes('Leader') || fallbackLabel.includes('Season');
      return met ? `${playerName} met the criteria${isCompletePhrase ? ':' : ' for:'} ${fallbackLabel}` : `${playerName} did not meet the criteria${isCompletePhrase ? ':' : ' for:'} ${fallbackLabel}`;
    }

    const { value, years, label, isPlural } = achievementDetails;

    // Specific phrasing for different achievement types
    if (baseAchievementId?.startsWith('career')) {
      const statName = label.replace(/(\d+,?\d*\+?)\s*Career\s*/, '').toLowerCase();
      if (met) {
        return `${playerName} had ${value} career ${statName}`;
      } else {
        return `${playerName} did not achieve ${label.toLowerCase()}`;
      }
    } else if (['AllStar', 'MVP', 'DPOY', 'ROY', 'SMOY', 'MIP', 'FinalsMVP', 'AllLeagueAny', 'AllDefAny', 'AllRookieAny'].includes(baseAchievementId!)) {
      const awardLabel = label.toLowerCase().replace('any', '').trim(); // Clean up 'AllLeagueAny' etc.
      if (met) {
        return `${playerName} was ${awardLabel.startsWith('all-') ? 'an' : 'a'} ${awardLabel}${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} was never ${awardLabel.startsWith('all-') ? 'an' : 'a'} ${awardLabel}`;
      }
    } else if (['threePointContestWinner', 'dunkContestWinner'].includes(baseAchievementId!)) {
      const contestName = label.replace(' Champion', '').toLowerCase();
      if (met) {
        return `${playerName} won the ${contestName}${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} never won the ${contestName}`;
      }
    } else if (baseAchievementId?.startsWith('Season') || label.includes('(Season)')) {
      const seasonStatLabel = label.replace(' (Season)', '');
      const verb = achievementDetails.isAverage ? 'averaged' : 'had';

      if (met) {
        return `${playerName} ${verb} ${seasonStatLabel.toLowerCase()} in a season${years ? ` (${years})` : ''}`;
      } else {
        // For any unmet Season* achievement, check if they ever achieved it in their career.
        const allSeasonsForStat = getSeasonsForSeasonStatAchievement(player, constraint.achievementId as any, undefined, undefined, 1);
        if (allSeasonsForStat.length > 0) {
          const seasonStr = formatBulletSeasonList(allSeasonsForStat, false);
          return `${playerName} did have a ${seasonStatLabel.toLowerCase()} season (${seasonStr}), just not with this team`;
        } else {
          // Generate a natural language phrase for the unmet criteria.
          const parsed = parseAchievementLabel(label, sport || 'basketball');
          const { threshold } = parsed;
          let phrase = `did not ever have a ${seasonStatLabel.toLowerCase()} season`; // Fallback

          if (threshold !== null) {
            switch (baseAchievementId) {
              case 'Season30PPG':
              case 'Season12RPG':
              case 'Season10APG':
              case 'Season2SPG':
              case 'Season2_5BPG':
              case 'Season36MPG':
                phrase = `never averaged ${threshold}+ ${parsed.statUnit} in a season`;
                break;
              case 'Season2000Points':
                phrase = `never scored ${threshold}+ points in a season`;
                break;
              case 'Season200_3PM':
                phrase = `never made ${threshold}+ 3-pointers in a season`;
                break;
              case 'Season800Rebounds':
                phrase = `never grabbed ${threshold}+ rebounds in a season`;
                break;
              case 'Season700Assists':
                phrase = `never recorded ${threshold}+ assists in a season`;
                break;
              case 'Season150Steals':
                phrase = `never recorded ${threshold}+ steals in a season`;
                break;
              case 'Season150Blocks':
                phrase = `never recorded ${threshold}+ blocks in a season`;
                break;
              case 'Season200Stocks':
                phrase = `never recorded ${threshold}+ stocks (steals + blocks) in a season`;
                break;
              case 'Season70Games':
                phrase = `never played ${threshold}+ games in a season`;
                break;
              case 'Season90FT250FTA':
                phrase = `never shot ${threshold}%+ from the free-throw line in a season`;
                break;
              case 'SeasonFGPercent':
                phrase = `never shot ${threshold}%+ from the field in a season`;
                break;
              case 'Season3PPercent':
                phrase = `never shot ${threshold}%+ on 3-pointers in a season`;
                break;
              case 'Season50_40_90':
                phrase = 'never had a 50/40/90 season';
                break;
              case 'Season60eFG500FGA':
                phrase = `never had an eFG% of ${threshold}%+ in a season`;
                break;
              case 'Season25_10':
                phrase = 'never had a 25/10 (PPG/RPG) season';
                break;
              case 'Season25_5_5':
                phrase = 'never had a 25/5/5 (PPG/RPG/APG) season';
                break;
              case 'Season20_10_5':
                phrase = 'never had a 20/10/5 (PPG/RPG/APG) season';
                break;
              case 'Season1_1_1':
                phrase = 'did not ever have a 1/1/1 season';
                break;
              default:
                // Generic fallback for other or custom seasonal stats
                if (achievementDetails.isAverage) {
                  phrase = `never averaged ${threshold}${parsed.operator === '≥' ? '+' : ''} ${parsed.statUnit} in a season`;
                } else {
                  phrase = `never recorded ${threshold}${parsed.operator === '≥' ? '+' : ''} ${parsed.statUnit} in a season`;
                }
                break;
            }
          }
          return `${playerName} ${phrase}`;
        }
      }
    } else if (['AllLeagueAny', 'AllDefAny', 'AllRookieAny'].includes(baseAchievementId!)) {
      const awardLabel = label.toLowerCase().replace('any', '').trim();
      if (met) {
        return `${playerName} was named to an ${awardLabel}${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} was never named to an ${awardLabel}`;
      }
    } else if (baseAchievementId === 'playedAtAge40Plus') {
      if (met) {
        return `${playerName} played at Age 40+${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} did not play at Age 40+`;
      }
    } else if (baseAchievementId === 'royLaterMVP') {
      if (met) {
        return `${playerName} was a ROY who later won MVP${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} was not a ROY who later won MVP`;
      }
    } else if (baseAchievementId.includes('playedIn') && baseAchievementId.endsWith('s')) {
      if (met) {
        return `${playerName} played in the ${label.replace('Played in the ', '')}${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} did not play in the ${label.replace('Played in the ', '')}`;
      }
    } else if (baseAchievementId.includes('debutedIn') && baseAchievementId.endsWith('s')) {
      if (met) {
        return `${playerName} debuted in the ${label}${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} did not debut in the ${label}`;
      }
    } else if (baseAchievementId === 'isHallOfFamer') {
      if (met) {
        return `${playerName} is a Hall of Famer${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} is not a Hall of Famer`;
      }
    } else if (baseAchievementId === 'played15PlusSeasons') {
      if (met) {
        return `${playerName} played ${value} season${isPlural ? 's' : ''}`;
      } else {
        return `${playerName} did not play 15+ seasons`;
      }
    } else if (baseAchievementId === 'played5PlusFranchises') {
      if (met) {
        return `${playerName} played for ${value} franchise${isPlural ? 's' : ''}`;
      } else {
        return `${playerName} did not play for 5+ franchises`;
      }
    } else if (baseAchievementId === 'isPick1Overall') {
      if (met) {
        return `${playerName} was a #1 Overall Pick${years ? ` ${years}` : ''}`;
      } else {
        return `${playerName} was not a #1 Overall Pick`;
      }
    } else if (baseAchievementId === 'isFirstRoundPick') {
      if (met) {
        return `${playerName} was a First Round Pick${years ? ` ${years}` : ''}`;
      } else {
        return `${playerName} was never a First Round Pick`;
      }
    } else if (baseAchievementId === 'isSecondRoundPick') {
      if (met) {
        return `${playerName} was a Second Round Pick${years ? ` ${years}` : ''}`;
      } else {
        return `${playerName} was never a Second Round Pick`;
      }
    } else if (baseAchievementId === 'isUndrafted') {
      if (met) {
        return `${playerName} went Undrafted${years ? ` ${years}` : ''}`;
      } else {
        return `${playerName} was not Undrafted`;
      }
    } else if (baseAchievementId === 'draftedTeen') {
      if (met) {
        return `${playerName} was drafted as a teenager${years ? ` ${years}` : ''}`;
      } else {
        return `${playerName} was not drafted as a teenager`;
      }
    } else if (baseAchievementId === 'bornOutsideUS50DC') {
      if (met) {
        return `${playerName} was born outside the US`;
      } else {
        return `${playerName} was born in the US`;
      }
    } else if (baseAchievementId?.includes('Leader')) {
      const leaderType = label.replace('League ', '').replace(' Leader', '');
      if (met) {
        return `${playerName} was the League ${leaderType} Leader${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} was never the League ${leaderType} Leader`;
      }
    } else if (baseAchievementId === 'Won Championship') {
      if (met) {
        return `${playerName} won a Championship${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} never won a Championship`;
      }
    }
    // Fallback for any unhandled achievements (should be minimal now)
    isCompletePhrase = label.includes('MPG') || label.includes('Champion') || label.includes('Leader') || label.includes('Season');
    return met ? `${playerName} met the criteria${isCompletePhrase ? ':' : ' for:'} ${label}` : `${playerName} did not meet the criteria${isCompletePhrase ? ':' : ' for:'} ${label}`;
  }
  
  // Fallback for unknown constraint types
  return met ? `${player.name} met the constraint` : `${player.name} did not meet the constraint`;
}
// Helper to extract the core negative object and verb from a negative phrase
function extractNegativeObjectAndVerb(phrase: string, playerName: string): { object: string; verb: string } {
  const cleanedPhrase = phrase.replace(`${playerName} `, ''); // Remove player name
  
  if (cleanedPhrase.startsWith('never played for ')) {
    return { object: cleanedPhrase.replace('never played for ', ''), verb: 'played for' };
  } else if (cleanedPhrase.startsWith('was never an ')) {
    return { object: cleanedPhrase.replace('was never ', ''), verb: 'was' };
  } else if (cleanedPhrase.startsWith('was never ')) { // Generic "was never" for other awards
    return { object: cleanedPhrase.replace('was never ', ''), verb: 'was' };
  } else if (cleanedPhrase.startsWith('did not achieve ')) {
    return { object: cleanedPhrase.replace('did not achieve ', ''), verb: 'achieve' };
  } else if (cleanedPhrase.startsWith('did not play in the ')) {
    return { object: cleanedPhrase.replace('did not play in the ', ''), verb: 'played in' };
  } else if (cleanedPhrase.startsWith('did not debut in the ')) {
    return { object: cleanedPhrase.replace('did not debut in the ', ''), verb: 'debuted in' };
  } else if (cleanedPhrase.startsWith('is not a Hall of Famer')) {
    return { object: 'a Hall of Famer', verb: 'is' };
  } else if (cleanedPhrase.startsWith('did not play ')) { // for played15PlusSeasons
    return { object: cleanedPhrase.replace('did not play ', ''), verb: 'played' };
  } else if (cleanedPhrase.startsWith('did not play for ')) { // for played5PlusFranchises
    return { object: cleanedPhrase.replace('did not play for ', ''), verb: 'played for' };
  } else if (cleanedPhrase.startsWith('was not Undrafted')) {
    return { object: 'Undrafted', verb: 'was' };
  } else if (cleanedPhrase.startsWith('was not drafted as a teenager')) {
    return { object: 'drafted as a teenager', verb: 'was' };
  } else if (cleanedPhrase.startsWith('was born in the US')) {
    return { object: 'born outside the US', verb: 'was' }; // Special case for negation
  } else if (cleanedPhrase.startsWith('never won the ')) {
    return { object: cleanedPhrase.replace('never won the ', ''), verb: 'won' };
  } else if (cleanedPhrase.startsWith('did not average ')) {
    return { object: cleanedPhrase.replace('did not average ', ''), verb: 'average' };
  } else if (cleanedPhrase.startsWith('did not have ')) {
    return { object: cleanedPhrase.replace('did not have ', ''), verb: 'have' };
  } else if (cleanedPhrase.startsWith('was never League ')) {
    return { object: cleanedPhrase.replace('was never ', ''), verb: 'was' };
  } else if (cleanedPhrase.startsWith('never won a ')) {
    return { object: cleanedPhrase.replace('never won a ', ''), verb: 'won' };
  } else if (cleanedPhrase.startsWith('was never named to an ')) {
    return { object: cleanedPhrase.replace('was never named to an ', ''), verb: 'was named to' };
  } else if (cleanedPhrase.startsWith('did not play at Age ')) {
    return { object: cleanedPhrase.replace('did not play at ', ''), verb: 'played at' };
  }
  // Fallback for unhandled or generic cases
  return { object: cleanedPhrase, verb: 'did not meet' };
}

// Helper function to get team name at a specific season

// Helper function to get team name at a specific season
function teamNameAtSeason(teamsByTid: Map<number, Team>, tid: number, season: number): string {
  const team = teamsByTid.get(tid);
  if (!team) {
    // Better fallback for missing teams - try to be more descriptive
    return `Historical Team (ID: ${tid})`;
  }
  
  const seasonInfo = team.seasons?.find(s => s.season === season);
  if (seasonInfo && seasonInfo.region && seasonInfo.name) {
    return `${seasonInfo.region} ${seasonInfo.name}`;
  }
  
  // fallback to current name, handle missing region gracefully
  const region = team.region || team.abbrev || '';
  const name = team.name || 'Unknown Team';
  return region ? `${region} ${name}` : name;
}