import type { Player, Team } from '@/types/bbgm';

export interface JerseyInfo {
  colors: string[];
  jersey: string;
}

/**
 * Determines which team's jersey colors and style a player should wear
 */
export function getPlayerJerseyInfo(player: Player, teams: Team[], sport?: string, season?: number | null): JerseyInfo {
  const teamMap = new Map(teams.map(team => [team.tid, team]));
  
  // Sport-specific default jersey styles
  let defaultJerseyStyle = 'modern';
  if (sport === 'baseball') {
    defaultJerseyStyle = 'baseball2';
  }
  
  // Default fallback
  const defaultJersey: JerseyInfo = {
    colors: ['#1f2937', '#ffffff'], // Default gray/white
    jersey: defaultJerseyStyle
  };

  let targetTeam: Team | undefined;
  let targetSeasonInfo: any | undefined;

  // If a specific season is provided, try to find the team and its season-specific info
  if (season !== undefined && season !== null) {
    const teamInSeason = player.seasons?.find(s => !s.playoffs && s.season === season && s.gp > 0);
    if (teamInSeason) {
      targetTeam = teamMap.get(teamInSeason.tid);
      targetSeasonInfo = targetTeam?.seasons?.find(s => s.season === season);
    }
  }

  // Fallback to current team if no season or season-specific team found
  if (!targetTeam && player.tid >= 0) {
    targetTeam = teamMap.get(player.tid);
    // If current team, try to find its latest season info if no specific season was requested
    if (targetTeam && (season === undefined || season === null)) {
      targetSeasonInfo = targetTeam.seasons?.[targetTeam.seasons.length - 1]; // Latest season
    }
  }

  // If a target team and season info is found, use its colors and jersey
  if (targetTeam && targetSeasonInfo) {
    const colors = targetSeasonInfo.colors || targetTeam.colors;
    const jersey = targetSeasonInfo.jersey || targetTeam.jersey || defaultJerseyStyle;
    if (colors && colors.length > 0) {
      return {
        colors: colors,
        jersey: sport === 'baseball' ? 'baseball2' : jersey
      };
    }
  }

  // For free agents (-1) or retired players (-2, -3, or has retiredYear)
  // Always use the last team they recorded a game with if no specific season was provided
  if ((season === undefined || season === null) && player.stats && player.stats.length > 0) {
    let lastTeamId = -1;
    let lastSeason = -1;

    for (const stat of player.stats) {
      if (!stat.playoffs && stat.gp && stat.gp > 0 && stat.season > lastSeason) {
        lastSeason = stat.season;
        lastTeamId = stat.tid;
      }
    }

    if (lastTeamId >= 0) {
      const lastTeam = teamMap.get(lastTeamId);
      if (lastTeam) {
        const lastTeamSeasonInfo = lastTeam.seasons?.find(s => s.season === lastSeason);
        const colors = lastTeamSeasonInfo?.colors || lastTeam.colors;
        const jersey = lastTeamSeasonInfo?.jersey || lastTeam.jersey || defaultJerseyStyle;
        if (colors && colors.length > 0) {
          return {
            colors: colors,
            jersey: sport === 'baseball' ? 'baseball2' : jersey
          };
        }
      }
    }
  }

  return defaultJersey;
}