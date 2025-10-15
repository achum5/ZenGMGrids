import { Player, Award, SeasonRecord } from './types';

interface SeasonOccurrence {
  seasonLabel: string;
  teamAbbrev?: string;
}

const TEAM_ABBREVIATIONS: { [key: string]: string } = {
  "Atlanta Hawks": "ATL",
  "Boston Celtics": "BOS",
  "Brooklyn Nets": "BKN",
  "Charlotte Hornets": "CHA",
  "Chicago Bulls": "CHI",
  "Cleveland Cavaliers": "CLE",
  "Dallas Mavericks": "DAL",
  "Denver Nuggets": "DEN",
  "Detroit Pistons": "DET",
  "Golden State Warriors": "GSW",
  "Houston Rockets": "HOU",
  "Indiana Pacers": "IND",
  "Los Angeles Clippers": "LAC",
  "Los Angeles Lakers": "LAL",
  "Memphis Grizzlies": "MEM",
  "Miami Heat": "MIA",
  "Milwaukee Bucks": "MIL",
  "Minnesota Timberwolves": "MIN",
  "New Orleans Pelicans": "NOP",
  "New York Knicks": "NYK",
  "Oklahoma City Thunder": "OKC",
  "Orlando Magic": "ORL",
  "Philadelphia 76ers": "PHI",
  "Phoenix Suns": "PHX",
  "Portland Trail Blazers": "POR",
  "Sacramento Kings": "SAC",
  "San Antonio Spurs": "SAS",
  "Toronto Raptors": "TOR",
  "Utah Jazz": "UTA",
  "Washington Wizards": "WAS",
  "Seattle SuperSonics": "SEA", // For historical teams
  // Add other sports teams as needed
};

function getTeamAbbrev(teamName: string): string | undefined {
  return TEAM_ABBREVIATIONS[teamName];
}

function deriveTeamAbbrevFromSeasonRecords(player: Player, season: string): string | undefined {
  const seasonRecords = player.seasonRecords.filter(sr => sr.season === season);
  if (seasonRecords.length === 0) {
    return undefined;
  }

  // Group by team and sum games/minutes
  const teamStats: { [team: string]: { games: number; minutes: number; lastEntry: number } } = {};
  seasonRecords.forEach((sr, index) => {
    if (!teamStats[sr.team]) {
      teamStats[sr.team] = { games: 0, minutes: 0, lastEntry: index };
    }
    teamStats[sr.team].games += sr.games;
    teamStats[sr.team].minutes += sr.minutes;
    teamStats[sr.team].lastEntry = index; // Keep track of chronological order
  });

  let bestTeam: string | undefined = undefined;
  let maxGames = -1;
  let maxMinutes = -1;
  let lastEntryIndex = -1;

  for (const team in teamStats) {
    const stats = teamStats[team];
    if (stats.games > maxGames) {
      maxGames = stats.games;
      maxMinutes = stats.minutes;
      lastEntryIndex = stats.lastEntry;
      bestTeam = team;
    } else if (stats.games === maxGames) {
      if (stats.minutes > maxMinutes) {
        maxMinutes = stats.minutes;
        lastEntryIndex = stats.lastEntry;
        bestTeam = team;
      } else if (stats.minutes === maxMinutes) {
        if (stats.lastEntry > lastEntryIndex) {
          lastEntryIndex = stats.lastEntry;
          bestTeam = team;
        }
      }
    }
  }

  return bestTeam ? getTeamAbbrev(bestTeam) : undefined;
}

export function collectSeasonOccurrences(player: Player, achievementKey: string, isTeamAward: boolean = false): SeasonOccurrence[] {
  const occurrences: SeasonOccurrence[] = [];

  // Handle awards and leaders stored as awards
  if (player.awards) {
    player.awards.forEach(award => {
      if (award.awardType === achievementKey) {
        let teamAbbrev = award.teamAbbrev;
        if (!teamAbbrev && isTeamAward) { // Only derive team if it's a team-tied award and abbrev is missing
          teamAbbrev = deriveTeamAbbrevFromSeasonRecords(player, award.season);
        }
        occurrences.push({ seasonLabel: award.season, teamAbbrev });
      }
    });
  }

  // TODO: Handle per-season thresholds (C2) - this will require specific logic for each threshold type
  // For now, this function primarily handles C1 achievements (awards/leaders)

  // Sort ascending by season
  occurrences.sort((a, b) => parseInt(a.seasonLabel) - parseInt(b.seasonLabel));

  return occurrences;
}

export function formatSeasonOccurrences(
  occurrences: SeasonOccurrence[],
  showTeam: boolean,
  achievementName: string,
  count: number = 1,
): string {
  if (occurrences.length === 0) {
    return `• Never ${achievementName}`;
  }

  const prefix = count > 1 ? `${count}x ` : '';
  let formattedList = occurrences.map(occ => {
    if (showTeam && occ.teamAbbrev) {
      return `${occ.seasonLabel} – ${occ.teamAbbrev}`;
    }
    return occ.seasonLabel;
  }).join('; ');

  if (occurrences.length > 6) {
    const firstFive = occurrences.slice(0, 5).map(occ => {
      if (showTeam && occ.teamAbbrev) {
        return `${occ.seasonLabel} – ${occ.teamAbbrev}`;
      }
      return occ.seasonLabel;
    }).join('; ');
    formattedList = `${firstFive}; ... +${occurrences.length - 5} more`;
  }

  return `• ${prefix}${achievementName} (${formattedList})`;
}

// Special case for "ROY who later won MVP"
export function formatRoyMvpAchievement(player: Player): string {
  const royAwards = player.awards?.filter(a => a.awardType === "Rookie of the Year") || [];
  const mvpAwards = player.awards?.filter(a => a.awardType === "Most Valuable Player") || [];

  if (royAwards.length > 0 && mvpAwards.length > 0) {
    const royOccurrences = royAwards.map(a => ({
      seasonLabel: a.season,
      teamAbbrev: a.teamAbbrev || deriveTeamAbbrevFromSeasonRecords(player, a.season)
    })).sort((a, b) => parseInt(a.seasonLabel) - parseInt(b.seasonLabel));

    const mvpOccurrences = mvpAwards.map(a => ({
      seasonLabel: a.season,
      teamAbbrev: a.teamAbbrev || deriveTeamAbbrevFromSeasonRecords(player, a.season)
    })).sort((a, b) => parseInt(a.seasonLabel) - parseInt(b.seasonLabel));

    const firstRoy = royOccurrences[0];
    const firstMvp = mvpOccurrences[0];

    const royTeam = firstRoy.teamAbbrev ? ` – ${firstRoy.teamAbbrev}` : '';
    const mvpTeam = firstMvp.teamAbbrev ? ` – ${firstMvp.teamAbbrev}` : '';

    return `• ROY (${firstRoy.seasonLabel}${royTeam}) → MVP (${firstMvp.seasonLabel}${mvpTeam})`;
  } else {
    return `• Never both ROY and MVP`;
  }
}
