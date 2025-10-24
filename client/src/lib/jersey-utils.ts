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

  // Default fallback (Free Agent colors: gray, white, black)
  const defaultJersey: JerseyInfo = {
    colors: ['#4b5563', '#ffffff', '#1f2937'], // gray-600, white, gray-800
    jersey: defaultJerseyStyle
  };

  // Check if this is a draft prospect year (first year in ratings)
  // If so, use the jersey they wear in their current/retired state instead
  const isDraftProspect = season !== undefined && season !== null && player.ratings && player.ratings.length > 0
    ? season === Math.min(...player.ratings.map(r => r.season))
    : false;

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

  // If no team found for the season, check if player is retired or use current team
  if (!targetTeam && player.stats && player.stats.length > 0) {
    const isRetired = player.tid === -2 || player.tid === -3 || (player.retiredYear && player.retiredYear > 0);

    if (isRetired) {
      // For retired players, use the team they spent the most seasons with
      const teamSeasonCounts = new Map<number, number>();

      for (const stat of player.stats) {
        if (!stat.playoffs && stat.gp && stat.gp > 0) {
          const count = teamSeasonCounts.get(stat.tid) || 0;
          teamSeasonCounts.set(stat.tid, count + 1);
        }
      }

      // Find team with most seasons
      let mostSeasonsTeamId = -1;
      let maxSeasons = 0;

      for (const [teamId, seasonCount] of teamSeasonCounts.entries()) {
        if (seasonCount > maxSeasons) {
          maxSeasons = seasonCount;
          mostSeasonsTeamId = teamId;
        }
      }

      if (mostSeasonsTeamId >= 0) {
        const mostSeasonsTeam = teamMap.get(mostSeasonsTeamId);
        if (mostSeasonsTeam) {
          // Get the latest season they played for this team
          let latestSeasonWithTeam = -1;
          for (const stat of player.stats) {
            if (!stat.playoffs && stat.gp && stat.gp > 0 && stat.tid === mostSeasonsTeamId && stat.season > latestSeasonWithTeam) {
              latestSeasonWithTeam = stat.season;
            }
          }

          const teamSeasonInfo = mostSeasonsTeam.seasons?.find(s => s.season === latestSeasonWithTeam);
          const colors = teamSeasonInfo?.colors || mostSeasonsTeam.colors;
          const jersey = teamSeasonInfo?.jersey || mostSeasonsTeam.jersey || defaultJerseyStyle;
          if (colors && colors.length > 0) {
            return {
              colors: colors,
              jersey: sport === 'baseball' ? 'baseball2' : jersey
            };
          }
        }
      }
    } else if (isDraftProspect && player.tid >= 0) {
      // For draft prospects who are still active, use their current team
      const currentTeam = teamMap.get(player.tid);
      if (currentTeam) {
        const colors = currentTeam.colors;
        const jersey = currentTeam.jersey || defaultJerseyStyle;
        if (colors && colors.length > 0) {
          return {
            colors: colors,
            jersey: sport === 'baseball' ? 'baseball2' : jersey
          };
        }
      }
    }
  }

  // For free agents (-1) or retired players (-2, -3, or has retiredYear) when no specific season provided
  if ((season === undefined || season === null) && player.stats && player.stats.length > 0) {
    const isRetired = player.tid === -2 || player.tid === -3 || (player.retiredYear && player.retiredYear > 0);

    if (isRetired) {
      // For retired players, use the team they spent the most seasons with
      const teamSeasonCounts = new Map<number, number>();

      for (const stat of player.stats) {
        if (!stat.playoffs && stat.gp && stat.gp > 0) {
          const count = teamSeasonCounts.get(stat.tid) || 0;
          teamSeasonCounts.set(stat.tid, count + 1);
        }
      }

      // Find team with most seasons
      let mostSeasonsTeamId = -1;
      let maxSeasons = 0;

      for (const [teamId, seasonCount] of teamSeasonCounts.entries()) {
        if (seasonCount > maxSeasons) {
          maxSeasons = seasonCount;
          mostSeasonsTeamId = teamId;
        }
      }

      if (mostSeasonsTeamId >= 0) {
        const mostSeasonsTeam = teamMap.get(mostSeasonsTeamId);
        if (mostSeasonsTeam) {
          // Get the latest season they played for this team
          let latestSeasonWithTeam = -1;
          for (const stat of player.stats) {
            if (!stat.playoffs && stat.gp && stat.gp > 0 && stat.tid === mostSeasonsTeamId && stat.season > latestSeasonWithTeam) {
              latestSeasonWithTeam = stat.season;
            }
          }

          const teamSeasonInfo = mostSeasonsTeam.seasons?.find(s => s.season === latestSeasonWithTeam);
          const colors = teamSeasonInfo?.colors || mostSeasonsTeam.colors;
          const jersey = teamSeasonInfo?.jersey || mostSeasonsTeam.jersey || defaultJerseyStyle;
          if (colors && colors.length > 0) {
            return {
              colors: colors,
              jersey: sport === 'baseball' ? 'baseball2' : jersey
            };
          }
        }
      }
    } else {
      // For free agents and other cases, use the last team they played for
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
  }

  return defaultJersey;
}