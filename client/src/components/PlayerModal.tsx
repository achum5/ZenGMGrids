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
    // Special handling for "1/1/1 Season" to provide more detailed feedback
    if (constraint.achievementId === 'Season1_1_1') {
      if (met) {
        const seasons = getSeasonsForSeasonStatAchievement(player, 'Season1_1_1', 1, '≥', 1);
        const seasonStr = formatBulletSeasonList(seasons, false);
        return `${playerName} had a 1/1/1 season${seasonStr ? ` (${seasonStr})` : ''}`;
      } else {
        const all111Seasons = getSeasonsForSeasonStatAchievement(player, 'Season1_1_1', 1, '≥', 1);
        if (all111Seasons.length > 0) {
          const seasonStr = formatBulletSeasonList(all111Seasons, false);
          return `${playerName} did have a 1/1/1 season (${seasonStr}), just not with this team`;
        } else {
          return `${playerName} did not ever have a 1/1/1 season`;
        }
      }
    }

    let isCompletePhrase: boolean;
    if (!constraint.achievementId) {
      const fallbackLabel = getConstraintLabel(constraint, teams, allAchievements);
      isCompletePhrase = fallbackLabel.includes('MPG') || fallbackLabel.includes('Champion') || fallbackLabel.includes('Leader') || fallbackLabel.includes('Season');
      return met ? `${playerName} met the criteria${isCompletePhrase ? ':' : ' for:'} ${fallbackLabel}` : `${playerName} never achieved${isCompletePhrase ? ':' : ''} ${fallbackLabel.toLowerCase()}`;
    }
    
    const achievementDetails = getAchievementDetails(player, constraint.achievementId, teams, sport, allAchievements);
    if (!achievementDetails) {
      const fallbackLabel = getConstraintLabel(constraint, teams, allAchievements);
      isCompletePhrase = fallbackLabel.includes('MPG') || fallbackLabel.includes('Champion') || fallbackLabel.includes('Leader') || fallbackLabel.includes('Season');
      return met ? `${playerName} met the criteria${isCompletePhrase ? ':' : ' for:'} ${fallbackLabel}` : `${playerName} never achieved${isCompletePhrase ? ':' : ''} ${fallbackLabel.toLowerCase()}`;
    }

    const { value, years, label, isPlural } = achievementDetails;

    // Specific phrasing for different achievement types
    if (constraint.achievementId?.startsWith('career')) {
      const statName = label.replace(/(\d+,?\d*\+?)\s*Career\s*/, '').toLowerCase();
      if (met) {
        return `${playerName} had ${value} career ${statName}`;
      } else {
        // Parse the achievement to get operator information
        const parsed = parseCustomAchievementId(constraint.achievementId);
        if (parsed && value !== undefined) {
          // Use natural language based on operator
          if (parsed.operator === '≤') {
            // Failed "less than or equal" means they had MORE
            return `${playerName} had more than ${parsed.threshold.toLocaleString()} career ${statName} (${value})`;
          } else {
            // Failed "greater than or equal" means they had FEWER
            return `${playerName} had fewer than ${parsed.threshold.toLocaleString()} career ${statName} (${value})`;
          }
        }
        // Fallback if we can't parse
        const threshold = label.match(/(\d+,?\d*\+?)/)?.[1];
        if (threshold) {
          return `${playerName} ${value ? `had ${value} career ${statName}, but ` : ''}never reached ${threshold} career ${statName}`;
        }
        return `${playerName} did not achieve ${label.toLowerCase()}`;
      }
    } else if (['AllStar', 'MVP', 'DPOY', 'ROY', 'SMOY', 'MIP', 'FinalsMVP', 'AllLeagueAny', 'AllDefAny', 'AllRookieAny'].includes(constraint.achievementId!)) {
      const awardLabel = label.toLowerCase().replace('any', '').trim(); // Clean up 'AllLeagueAny' etc.
      if (met) {
        return `${playerName} was ${awardLabel.startsWith('all-') ? 'an' : 'a'} ${awardLabel}${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} was never ${awardLabel.startsWith('all-') ? 'an' : 'a'} ${awardLabel}`;
      }
    } else if (['threePointContestWinner', 'dunkContestWinner'].includes(constraint.achievementId!)) {
      const contestName = label.replace(' Champion', '').toLowerCase();
      if (met) {
        return `${playerName} won the ${contestName}${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} never won the ${contestName}`;
      }
    } else if (constraint.achievementId?.startsWith('Season') || label.includes('(Season)')) {
      // Special handling for "1/1/1 Season" to provide more detailed feedback
      if (constraint.achievementId === 'Season1_1_1') {
        if (met) {
          const seasons = getSeasonsForSeasonStatAchievement(player, 'Season1_1_1', 1, '≥', 1);
          const seasonStr = formatBulletSeasonList(seasons, false);
          return `${playerName} had a 1/1/1 season${seasonStr ? ` (${seasonStr})` : ''}`;
        } else {
          const all111Seasons = getSeasonsForSeasonStatAchievement(player, 'Season1_1_1', 1, '≥', 1);
          if (all111Seasons.length > 0) {
            const seasonStr = formatBulletSeasonList(all111Seasons, false);
            return `${playerName} did have a 1/1/1 season (${seasonStr}), just not with this team`;
          } else {
            return `${playerName} did not ever have a 1/1/1 season`;
          }
        }
      }

      const seasonStatLabel = label.replace(' (Season)', '');
      const statName = seasonStatLabel.replace(/(\d+,?\d*\+?)/, '').trim().toLowerCase();
      const verb = achievementDetails.isAverage ? 'averaged' : 'had';

      if (met) {
        return `${playerName} ${verb} ${seasonStatLabel.toLowerCase()} in a season${years ? ` (${years})` : ''}`;
      } else {
        // Parse the achievement to get operator information
        const parsed = parseCustomAchievementId(constraint.achievementId);
        
        // For any unmet Season* achievement, check if they ever achieved it in their career.
        const allSeasonsForStat = getSeasonsForSeasonStatAchievement(player, constraint.achievementId as any, undefined, undefined, 1);
        if (allSeasonsForStat.length > 0) {
          const seasonStr = formatBulletSeasonList(allSeasonsForStat, false);
          return `${playerName} did have a ${seasonStatLabel.toLowerCase()} season (${seasonStr}), just not with this team`;
        } else {
          // Use natural language based on operator
          if (parsed && parsed.operator === '≤') {
            // Failed "less than or equal" means they never had a season LOW enough
            const threshold = parsed.threshold.toLocaleString();
            if (achievementDetails.isAverage) {
              return `${playerName} never averaged under ${threshold} ${statName} in a season`;
            } else {
              return `${playerName} never had fewer than ${threshold} ${statName} in a season`;
            }
          } else {
            // Failed "greater than or equal" (default) means they never had a season HIGH enough
            const threshold = seasonStatLabel.match(/(\d+,?\d*\.?\d*\+?)/)?.[1] || '';
            if (achievementDetails.isAverage) {
              return `${playerName} never averaged ${threshold} ${statName} in a season`;
            } else {
              return `${playerName} never had ${threshold} ${statName} in a season`;
            }
          }
        }
      }
    } else if (['AllLeagueAny', 'AllDefAny', 'AllRookieAny'].includes(constraint.achievementId!)) {
      const awardLabel = label.toLowerCase().replace('any', '').trim();
      if (met) {
        return `${playerName} was named to an ${awardLabel}${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} was never named to an ${awardLabel}`;
      }
    } else if (constraint.achievementId === 'playedAtAge40Plus') {
      if (met) {
        return `${playerName} played at Age 40+${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} did not play at Age 40+`;
      }
    } else if (constraint.achievementId === 'royLaterMVP') {
      if (met) {
        return `${playerName} was a ROY who later won MVP${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} was not a ROY who later won MVP`;
      }
    } else if (constraint.achievementId.includes('playedIn') && constraint.achievementId.endsWith('s')) {
      if (met) {
        return `${playerName} played in the ${label.replace('Played in the ', '')}${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} did not play in the ${label.replace('Played in the ', '')}`;
      }
    } else if (constraint.achievementId.includes('debutedIn') && constraint.achievementId.endsWith('s')) {
      if (met) {
        return `${playerName} debuted in the ${label}${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} did not debut in the ${label}`;
      }
    } else if (constraint.achievementId === 'isHallOfFamer') {
      if (met) {
        return `${playerName} is a Hall of Famer${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} is not a Hall of Famer`;
      }
    } else if (constraint.achievementId === 'played15PlusSeasons') {
      if (met) {
        return `${playerName} played ${value} season${isPlural ? 's' : ''}`;
      } else {
        return `${playerName} did not play 15+ seasons`;
      }
    } else if (constraint.achievementId === 'played5PlusFranchises') {
      if (met) {
        return `${playerName} played for ${value} franchise${isPlural ? 's' : ''}`;
      } else {
        return `${playerName} did not play for 5+ franchises`;
      }
    } else if (constraint.achievementId === 'isPick1Overall') {
      if (met) {
        return `${playerName} was a #1 Overall Pick${years ? ` ${years}` : ''}`;
      } else {
        return `${playerName} was never a #1 Overall Pick`;
      }
    } else if (constraint.achievementId === 'isFirstRoundPick') {
      if (met) {
        return `${playerName} was a First Round Pick${years ? ` ${years}` : ''}`;
      } else {
        return `${playerName} was never a First Round Pick`;
      }
    } else if (constraint.achievementId === 'isSecondRoundPick') {
      if (met) {
        return `${playerName} was a Second Round Pick${years ? ` ${years}` : ''}`;
      } else {
        return `${playerName} was never a Second Round Pick`;
      }
    } else if (constraint.achievementId === 'isUndrafted') {
      if (met) {
        return `${playerName} went Undrafted${years ? ` ${years}` : ''}`;
      } else {
        return `${playerName} was not Undrafted`;
      }
    } else if (constraint.achievementId === 'draftedTeen') {
      if (met) {
        return `${playerName} was drafted as a teenager${years ? ` ${years}` : ''}`;
      } else {
        return `${playerName} was not drafted as a teenager`;
      }
    } else if (constraint.achievementId === 'bornOutsideUS50DC') {
      if (met) {
        return `${playerName} was born outside the US`;
      } else {
        return `${playerName} was born in the US`;
      }
    } else if (constraint.achievementId?.includes('Leader')) {
      const leaderType = label.replace('League ', '').replace(' Leader', '');
      if (met) {
        return `${playerName} was the League ${leaderType} Leader${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} was never the League ${leaderType} Leader`;
      }
    } else if (constraint.achievementId === 'Won Championship') {
      if (met) {
        return `${playerName} won a Championship${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} never won a Championship`;
      }
    } else if (constraint.achievementId?.startsWith('Season')) {
      // Generic phrasing for other season statistical achievements
      const seasonStatLabel = label.replace(' (Season)', '');
      if (met) {
        return `${playerName} had a season with ${seasonStatLabel}${years ? ` (${years})` : ''}`;
      } else {
        return `${playerName} never had a season with ${seasonStatLabel}`;
      }
    }
    // Fallback for any unhandled achievements (should be minimal now)
    isCompletePhrase = label.includes('MPG') || label.includes('Champion') || label.includes('Leader') || label.includes('Season');
    if (met) {
      return `${playerName} met the criteria${isCompletePhrase ? ':' : ' for:'} ${label}`;
    } else {
      // Parse the achievement to get operator information for more natural phrasing
      const parsed = parseCustomAchievementId(constraint.achievementId);
      
      if (label.includes('(Season)')) {
        const seasonStatLabel = label.replace(' (Season)', '').toLowerCase();
        const statName = seasonStatLabel.replace(/(\d+,?\d*\+?)/, '').trim();
        
        if (parsed && parsed.operator === '≤') {
          return `${playerName} never achieved under ${parsed.threshold.toLocaleString()} ${statName} in a season`;
        } else {
          return `${playerName} never achieved ${seasonStatLabel} in a season`;
        }
      }
      
      if (parsed && label.toLowerCase().includes('career')) {
        const statName = label.replace(/(\d+,?\d*\+?)\s*Career\s*/i, '').toLowerCase();
        if (parsed.operator === '≤') {
          return `${playerName} had more than ${parsed.threshold.toLocaleString()} ${statName}`;
        } else {
          return `${playerName} had fewer than ${parsed.threshold.toLocaleString()} ${statName}`;
        }
      }
      
      return `${playerName} never achieved${isCompletePhrase ? ':' : ''} ${label.toLowerCase()}`;
    }
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

export function PlayerModal({ open, onOpenChange, player, teams, eligiblePlayers = [], puzzleSeed = "", rows = [], cols = [], currentCellKey = "", sport, isGridCompleted = false }: Props) {
  if (!player) return null;

  const currentSport = sport || getCachedSportDetection() || 'basketball';
  const leagueYears = getCachedLeagueYears();
  const allAchievements = useMemo(() => getAllAchievements(currentSport as ('basketball' | 'football' | 'hockey' | 'baseball'), undefined, leagueYears), [currentSport, leagueYears]);
  const seasonIndex = useMemo(() => getCachedSeasonIndex(eligiblePlayers as Player[], currentSport as ('basketball' | 'football' | 'hockey' | 'baseball')), [eligiblePlayers, currentSport]);

  // Create team lookup map for efficient lookups - defensive check for teams array
  const teamsByTid = new Map(Array.isArray(teams) ? teams.map(team => [team.tid, team]) : []);

  // Memoize expensive calculations
  const modalData = useMemo(() => {
    try {
      if (!currentCellKey || rows.length === 0 || cols.length === 0) {
        return null;
      }

      let rowConstraint: any;
      let colConstraint: any;
      
      if (currentCellKey.includes('|')) {
        // Traditional format: "rowKey|colKey"
        const [rowKey, colKey] = currentCellKey.split('|');
        rowConstraint = rows.find(r => r.key === rowKey);
        colConstraint = cols.find(c => c.key === colKey);
      } else {
        // Position-based format: "rowIndex-colIndex"
        const [rowIndexStr, colIndexStr] = currentCellKey.split('-');
        const rowIndex = parseInt(rowIndexStr, 10);
        const colIndex = parseInt(colIndexStr, 10);
        rowConstraint = rows[rowIndex];
        colConstraint = cols[colIndex];
      }
      
      if (!rowConstraint || !colConstraint) {
        return null;
      }

      const isCorrectGuess = eligiblePlayers.some(p => p.pid === player.pid);
      
      if (isCorrectGuess) {
      // Calculate rarity for correct guesses
      const eligiblePool = eligiblePlayers.map(p => playerToEligibleLite(p));
      if (eligiblePool.length > 0) {
        const guessedPlayer = playerToEligibleLite(player);
        const rarity = computeRarityForGuess({
          guessed: guessedPlayer,
          eligiblePool: eligiblePool,
          puzzleSeed: puzzleSeed,
          cellContext: {
            rowConstraint: {
              type: rowConstraint.type,
              tid: rowConstraint.tid,
              achievementId: rowConstraint.achievementId,
              label: rowConstraint.label
            },
            colConstraint: {
              type: colConstraint.type,
              tid: colConstraint.tid,
              achievementId: colConstraint.achievementId,
              label: colConstraint.label
            }
          },
          fullPlayers: eligiblePlayers,
          teams: new Map(Array.isArray(teams) ? teams.map(t => [t.tid, t]) : [])
        });
        
        // Generate reason bullets for correct guess
        const reasonBullets = generateReasonBullets(
          player,
          {
            type: rowConstraint.type,
            tid: rowConstraint.tid,
            achievementId: rowConstraint.achievementId,
            label: rowConstraint.label
          },
          {
            type: colConstraint.type,
            tid: colConstraint.tid,
            achievementId: colConstraint.achievementId,
            label: colConstraint.label
          },
          Array.isArray(teams) ? teams : [],
          currentSport
        );

        return {
          type: 'correct' as const,
          rarity,
          reasonBullets
        };
      }
    } else {
      // Generate feedback for wrong guesses
      const feedbackMessage = generateFeedbackMessage(
        player,
        {
          type: rowConstraint.type,
          tid: rowConstraint.tid,
          achievementId: rowConstraint.achievementId,
          label: rowConstraint.label
        },
        {
          type: colConstraint.type,
          tid: colConstraint.tid,
          achievementId: colConstraint.achievementId,
          label: colConstraint.label
        },
        Array.isArray(teams) ? teams : [],
        currentSport as ('basketball' | 'football' | 'hockey' | 'baseball'),
        allAchievements,
        seasonIndex
      );

      return {
        type: 'wrong' as const,
        feedbackMessage
      };
    }

    return null;
    } catch (error) {
      console.error('Error in PlayerModal modalData calculation:', error);
      return null;
    }
  }, [player.pid, currentCellKey, eligiblePlayers, puzzleSeed, rows, cols, teams, sport, currentSport, allAchievements]);

  // Get feedback message and color for score
  const getScoreFeedback = (score: number): { message: string; colorClass: string } => {
    const feedbackOptions = {
      "10-20": [
        "Classic choice",
        "Reliable pick",
        "Can't go wrong",
        "Staple answer",
        "Trusted name"
      ],
      "21-40": [
        "Good call",
        "Solid choice",
        "Steady pick",
        "Well played",
        "Strong answer"
      ],
      "41-60": [
        "Nice find",
        "Quality pick",
        "Smart call",
        "Good eye",
        "Well spotted"
      ],
      "61-80": [
        "Great pull",
        "Sharp choice",
        "Underrated find",
        "Well done",
        "Strong grab"
      ],
      "81-100": [
        "Rare gem",
        "Brilliant find",
        "Elite choice",
        "Outstanding",
        "Legendary pick"
      ]
    };

    let options: string[] = [];
    let colorClass = "";

    if (score >= 10 && score <= 20) {
      options = feedbackOptions["10-20"];
      colorClass = "text-red-600";
    } else if (score >= 21 && score <= 40) {
      options = feedbackOptions["21-40"];
      colorClass = "text-orange-500";
    } else if (score >= 41 && score <= 60) {
      options = feedbackOptions["41-60"];
      colorClass = "text-yellow-600";
    } else if (score >= 61 && score <= 80) {
      options = feedbackOptions["61-80"];
      colorClass = "text-green-500";
    } else if (score >= 81 && score <= 100) {
      options = feedbackOptions["81-100"];
      colorClass = "text-indigo-600";
    }

    // Use player pid as seed for consistent random selection
    const randomIndex = Math.abs(player.pid) % options.length;
    const message = options[randomIndex] || "Nice pick";

    return { message, colorClass };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[92vw] max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden" data-testid="modal-player-details">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40">
              <PlayerFace
                pid={player.pid}
                name={player.name}
                imgURL={player.imgURL ?? undefined}
                face={player.face}
                size={160}
                hideName={true}
                player={player}
                teams={teams}
                sport={sport}
              />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight dark:text-white">
                {player.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Player details including career statistics, achievements, and team history.
              </DialogDescription>
              
              {/* Score feedback for correct guesses OR feedback message for wrong guesses */}
              {modalData && modalData.type === 'correct' && (
                <div className="mt-2">
                  {(() => {
                    const rarityTier = getRarityTier(modalData.rarity);
                    const styles = rarityStyles[rarityTier];
                
                    return (
                      <span className={`text-lg font-bold`} style={{ color: styles.textColor }}>
                        Score: {modalData.rarity}
                      </span>
                    );
                  })()}
                  
                  {/* Reason bullets for correct guesses */}
                  {modalData.reasonBullets.length > 0 && (
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {modalData.reasonBullets.map((bullet, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-xs leading-5">•</span>
                          <span className="leading-5">{bullet.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {modalData && modalData.type === 'wrong' && (
                <div className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-red-700 dark:text-red-300 leading-5">
                      {modalData.feedbackMessage}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 flex-1 overflow-y-auto min-h-0 space-y-4">
          {/* Awards */}
          {player.awards && player.awards.length > 0 && (
            <div>
              <h3 className="font-semibold text-base mb-2">Awards & Honors</h3>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  // Group and count awards
                  const awardCounts: Record<string, number> = {};
                  player.awards.forEach(award => {
                    awardCounts[award.type] = (awardCounts[award.type] || 0) + 1;
                  });

                  // Create condensed award display
                  const condensedAwards: { text: string; isHallOfFame?: boolean }[] = [];
                  
                  Object.entries(awardCounts).forEach(([type, count]) => {
                    switch (type) {
                      case "Inducted into the Hall of Fame":
                        condensedAwards.push({ text: "Hall of Fame", isHallOfFame: true });
                        break;
                      case "Most Valuable Player":
                        condensedAwards.push({ text: count > 1 ? `${count}x MVP` : "MVP" });
                        break;
                      case "Finals MVP":
                        condensedAwards.push({ text: count > 1 ? `${count}x FMVP` : "FMVP" });
                        break;
                      case "Won Championship":
                        condensedAwards.push({ text: count > 1 ? `${count}x Champion` : "Champion" });
                        break;
                      case "Rookie of the Year":
                        condensedAwards.push({ text: "ROY" });
                        break;
                      case "All-Star MVP":
                        condensedAwards.push({ text: count > 1 ? `${count}x All-Star MVP` : "All-Star MVP" });
                        break;
                      case "All-Star":
                        condensedAwards.push({ text: count > 1 ? `${count}x All-Star` : "All-Star" });
                        break;
                      case "First Team All-League":
                      case "Second Team All-League":
                      case "Third Team All-League":
                        // Count all All-League teams together
                        if (!condensedAwards.some(award => award.text.includes("All-League"))) {
                          const allLeagueCount = (player.awards || []).filter(a => 
                            a.type.includes("All-League")
                          ).length;
                          condensedAwards.push({ text: allLeagueCount > 1 ? `${allLeagueCount}x All-League` : "All-League" });
                        }
                        break;
                      case "First Team All-Defensive":
                      case "Second Team All-Defensive":
                        // Count all All-Defensive teams together
                        if (!condensedAwards.some(award => award.text.includes("All-Defensive"))) {
                          const allDefensiveCount = (player.awards || []).filter(a => 
                            a.type.includes("All-Defensive")
                          ).length;
                          condensedAwards.push({ text: allDefensiveCount > 1 ? `${allDefensiveCount}x All-Defensive` : "All-Defensive" });
                        }
                        break;
                      case "League Scoring Leader":
                        condensedAwards.push({ text: count > 1 ? `${count}x Scoring Leader` : "Scoring Leader" });
                        break;
                      case "League Rebounding Leader":
                        condensedAwards.push({ text: count > 1 ? `${count}x Rebounding Leader` : "Rebounding Leader" });
                        break;
                      case "League Assists Leader":
                        condensedAwards.push({ text: count > 1 ? `${count}x Assists Leader` : "Assists Leader" });
                        break;
                      case "League Steals Leader":
                        condensedAwards.push({ text: count > 1 ? `${count}x Steals Leader` : "Steals Leader" });
                        break;
                      case "League Blocks Leader":
                        condensedAwards.push({ text: count > 1 ? `${count}x Blocks Leader` : "Blocks Leader" });
                        break;
                      default:
                        // Handle dynamic decade achievements
                        if (type.includes('playedIn') && type.endsWith('s')) {
                          const decadeMatch = type.match(/playedIn(\d{4})s/);
                          if (decadeMatch) {
                            const decade = decadeMatch[1];
                            condensedAwards.push({ text: `Played in the ${decade}s` });
                            break;
                          }
                        }
                        if (type.includes('debutedIn') && type.endsWith('s')) {
                          const decadeMatch = type.match(/debutedIn(\d{4})s/);
                          if (decadeMatch) {
                            const decade = decadeMatch[1];
                            condensedAwards.push({ text: `Debuted in the ${decade}s` });
                            break;
                          }
                        }
                        
                        // Handle other achievement types with improved naming  
                        let displayText = type;
                        
                        // Handle age-related achievements
                        if (type.includes('playedAt') && type.includes('Plus')) {
                          const ageMatch = type.match(/playedAt(\d+)Plus/);
                          if (ageMatch) {
                            const age = ageMatch[1];
                            displayText = `Played at Age ${age}+`;
                          }
                        }
                        
                        // Default case for unknown types
                        condensedAwards.push({ text: count > 1 ? `${count}x ${displayText}` : displayText });
                        break;
                    }
                  });

                  if (player.achievements?.royLaterMVP) {
                    condensedAwards.push({ text: "ROY, then MVP" });
                  }

                  // Sort to put Hall of Fame first
                  const sortedAwards = condensedAwards.sort((a, b) => {
                    if (a.isHallOfFame && !b.isHallOfFame) return -1;
                    if (!a.isHallOfFame && b.isHallOfFame) return 1;
                    return 0;
                  });

                  return sortedAwards.map((award, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className={award.isHallOfFame 
                        ? "text-xs bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 border-yellow-500 font-bold dark:from-yellow-500 dark:to-yellow-700 dark:text-yellow-100" 
                        : "text-xs bg-slate-500 text-white dark:bg-slate-600 dark:text-slate-100"
                      }
                    >
                      {award.text}
                    </Badge>
                  ));
                })()}
              </div>
            </div>
          )}

          <Separator className="my-4" />

          {/* Career Summary - Teams and Years */}
          {player.seasons && player.seasons.length > 0 && (
            <div>
              <h3 className="font-semibold text-base mb-2">Career Summary</h3>
              <div className="w-full rounded-md border p-3 overflow-y-auto" style={{ maxHeight: '12rem' }}>
                <div className="space-y-1 text-sm">
                {(() => {
                  // Get regular season stats only and sort by season
                  const regularSeasonStats = player.seasons
                    .filter(s => !s.playoffs)
                    .sort((a, b) => a.season - b.season);

                  if (regularSeasonStats.length === 0) return null;

                  // Group consecutive seasons by team
                  const teamStints: Array<{
                    tid: number;
                    firstSeason: number;
                    lastSeason: number;
                    seasons: number[];
                  }> = [];

                  let currentStint = {
                    tid: regularSeasonStats[0].tid,
                    firstSeason: regularSeasonStats[0].season,
                    lastSeason: regularSeasonStats[0].season,
                    seasons: [regularSeasonStats[0].season]
                  };

                  for (let i = 1; i < regularSeasonStats.length; i++) {
                    const season = regularSeasonStats[i];
                    
                    // If same team and consecutive season, extend current stint
                    if (season.tid === currentStint.tid && 
                        season.season === currentStint.lastSeason + 1) {
                      currentStint.lastSeason = season.season;
                      currentStint.seasons.push(season.season);
                    } else {
                      // Different team or gap in years, start new stint
                      teamStints.push(currentStint);
                      currentStint = {
                        tid: season.tid,
                        firstSeason: season.season,
                        lastSeason: season.season,
                        seasons: [season.season]
                      };
                    }
                  }
                  
                  // Don't forget the last stint
                  teamStints.push(currentStint);

                  // Check if all teams in the career have working logos (all-or-nothing approach)
                  const teamsInCareer = teamStints.map(stint => teamsByTid.get(stint.tid)).filter(Boolean) as Team[];
                  const allTeamsHaveLogos = checkAllTeamsHaveLogos(teamsInCareer);
                  
                  
                  return teamStints.map((stint, idx) => {
                    const team = teamsByTid.get(stint.tid);
                    const teamName = teamNameAtSeason(teamsByTid, stint.tid, stint.firstSeason);
                    const yearRange = stint.firstSeason === stint.lastSeason 
                      ? `${stint.firstSeason}` 
                      : `${stint.firstSeason}–${stint.lastSeason}`;
                    
                    if (allTeamsHaveLogos && team) {
                      return (
                        <CareerTeamLogo
                          key={idx}
                          team={team}
                          yearRange={yearRange}
                        />
                      );
                    } else {
                      return (
                        <div key={idx} className="font-medium">
                          {teamName} {yearRange}
                        </div>
                      );
                    }
                  });
                })()}
                </div>
              </div>
            </div>
          )}

          <Separator className="my-4" />

          {/* Other Eligible Answers */}
          {eligiblePlayers.length > 0 && (
            <div>
              <h3 className="font-semibold text-base mb-2">
                {(() => {
                  // Check if the current player is in the eligible list (correct answer)
                  const isCorrectAnswer = player && eligiblePlayers.some(p => p.pid === player.pid);
                  return isCorrectAnswer ? "Other Eligible Answers" : "Eligible Answers";
                })()}
              </h3>
              <div className="w-full rounded-md border p-3 overflow-y-auto" style={{ maxHeight: '12rem' }}>
                {!isGridCompleted ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Revealed upon grid completion...
                  </div>
                ) : (
                  <div className="space-y-1 text-sm">
                  {(() => {
                    // Calculate rarity for all eligible players
                    const eligiblePool = eligiblePlayers.map(p => playerToEligibleLite(p));
                    const playersWithRarity = eligiblePlayers.map(p => {
                      const guessedPlayer = playerToEligibleLite(p);
                      
                      // Use the same cell context as the main score calculation
                      let rarity = computeRarityForGuess({
                        guessed: guessedPlayer,
                        eligiblePool: eligiblePool,
                        puzzleSeed: puzzleSeed
                      });
                      
                      // If we have cell context, recalculate with cell-aware system
                      if (currentCellKey && rows && cols) {
                        let rowKey, colKey;
                        if (currentCellKey.includes('|')) {
                          [rowKey, colKey] = currentCellKey.split('|');
                        } else {
                          const [rowIndexStr, colIndexStr] = currentCellKey.split('-');
                          const rowIndex = parseInt(rowIndexStr, 10);
                          const colIndex = parseInt(colIndexStr, 10);
                          rowKey = rows[rowIndex]?.key;
                          colKey = cols[colIndex]?.key;
                        }
                        const rowConstraint = rows.find(r => r.key === rowKey);
                        const colConstraint = cols.find(c => c.key === colKey);
                        
                        if (rowConstraint && colConstraint) {
                          rarity = computeRarityForGuess({
                            guessed: guessedPlayer,
                            eligiblePool: eligiblePool,
                            puzzleSeed: puzzleSeed,
                            cellContext: {
                              rowConstraint: {
                                type: rowConstraint.type,
                                tid: rowConstraint.tid,
                                achievementId: rowConstraint.achievementId,
                                label: rowConstraint.label
                              },
                              colConstraint: {
                                type: colConstraint.type,
                                tid: colConstraint.tid,
                                achievementId: colConstraint.achievementId,
                                label: colConstraint.label
                              }
                            },
                            fullPlayers: eligiblePlayers,
                            teams: new Map(teams?.map(t => [t.tid, t]) ?? []),
                            seasonIndex: seasonIndex
                          });
                        }
                      }
                      
                      return { player: p, rarity };
                    });

                    // Sort by rarity (most common first = lowest rarity score)
                    playersWithRarity.sort((a, b) => a.rarity - b.rarity);

                    return playersWithRarity.map(({ player: eligiblePlayer, rarity }, idx) => {
                      const isUserGuess = player && eligiblePlayer.pid === player.pid;
                      const rarityTier = getRarityTier(rarity);
                      const styles = rarityStyles[rarityTier];
                      
                      return (
                        <div 
                          key={eligiblePlayer.pid} 
                          className={`flex justify-between items-center py-1 px-2 rounded ${isUserGuess ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 italic font-medium" : ""}`}
                        >
                          <span className="flex-1">
                            {idx + 1}. {eligiblePlayer.name}
                          </span>
                          <span 
                            className="text-xs font-medium ml-2 px-2 py-0.5 rounded-md border"
                            style={{
                              background: styles.gradient !== 'none' ? styles.gradient : styles.bgColor,
                              color: styles.textColor,
                              borderColor: styles.borderColor,
                            }}
                          >
                            {rarity}
                          </span>
                        </div>
                      );
                    });
                  })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
