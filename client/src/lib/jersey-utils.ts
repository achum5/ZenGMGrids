import type { Player, Team } from '@/types/bbgm';

export interface JerseyInfo {
  colors: string[];
  jersey: string;
  sport?: string;
}

// Valid baseball jersey styles
const VALID_BASEBALL_JERSEYS = ['baseball', 'baseball2', 'baseball3', 'baseball4'];

// Validate and normalize jersey style - ONLY for baseball, pass through for other sports
function normalizeJerseyStyle(jersey: string | undefined, sport: string | undefined): string {
  // For baseball, validate and ensure it's one of the baseball styles
  if (sport === 'baseball') {
    if (!jersey) {
      return 'baseball2'; // Default baseball style
    }
    // If it's a valid baseball style, use it
    if (VALID_BASEBALL_JERSEYS.includes(jersey)) {
      return jersey;
    }
    // If it's not a valid baseball style, default to baseball2
    return 'baseball2';
  }

  // For all other sports, pass through whatever jersey style is provided
  // Only default to 'modern' if no jersey is provided at all
  if (!jersey) {
    return 'modern';
  }

  // Return the jersey as-is for non-baseball sports
  return jersey;
}

/**
 * Determines which team's jersey colors and style a player should wear
 */
export function getPlayerJerseyInfo(player: Player, teams: Team[], sport?: string, season?: number | null, teamId?: number): JerseyInfo {
  const teamMap = new Map(teams.map(team => [team.tid, team]));

  // Sport-specific default jersey styles
  const defaultJerseyStyle = sport === 'baseball' ? 'baseball2' : 'modern';

  // Default fallback (Free Agent colors: same as draft prospects - black, light grey, white)
  const defaultJersey: JerseyInfo = {
    colors: ['#000000', '#CCCCCC', '#ffffff'], // black, light grey, white
    jersey: normalizeJerseyStyle(defaultJerseyStyle, sport),
    sport
  };

  // Check if this is a draft prospect year (first year in ratings)
  const firstRatingYear = player.ratings && player.ratings.length > 0
    ? Math.min(...player.ratings.map(r => r.season))
    : null;
  const isDraftProspect = firstRatingYear !== null && season !== undefined && season !== null && season === firstRatingYear;

  // Draft prospects should use hardcoded black/light grey/white colors
  if (isDraftProspect) {
    return {
      colors: ['#000000', '#CCCCCC', '#ffffff'], // black, light grey, white
      jersey: normalizeJerseyStyle(defaultJerseyStyle, sport),
      sport
    };
  }

  let targetTeam: Team | undefined;
  let targetSeasonInfo: any | undefined;

  // If a specific season is provided, try to find the team and its season-specific info
  if (season !== undefined && season !== null) {
    // If teamId is provided, use it to filter; otherwise find any team for that season
    // Use player.stats instead of player.seasons for more accurate data
    const teamInSeason = player.stats?.find(s => {
      const matchesSeason = !s.playoffs && s.season === season;
      const matchesTeam = teamId !== undefined ? s.tid === teamId : true;
      return matchesSeason && matchesTeam;
    });

    if (teamInSeason) {
      targetTeam = teamMap.get(teamInSeason.tid);
      targetSeasonInfo = targetTeam?.seasons?.find(s => s.season === season);
    }
  }

  // Fallback to current team if no season or season-specific team found
  if (!targetTeam && player.tid >= 0) {
    targetTeam = teamMap.get(player.tid);
    // Try to find season info for the requested season or use latest
    if (targetTeam) {
      if (season !== undefined && season !== null) {
        targetSeasonInfo = targetTeam.seasons?.find(s => s.season === season);
      }
      // If no season-specific info found, use latest season as fallback
      if (!targetSeasonInfo && targetTeam.seasons && targetTeam.seasons.length > 0) {
        targetSeasonInfo = targetTeam.seasons[targetTeam.seasons.length - 1];
      }
    }
  }

  // If a target team is found, use its colors (targetSeasonInfo is now optional)
  if (targetTeam) {
    const colors = targetSeasonInfo?.colors || targetTeam.colors;
    const rawJersey = targetSeasonInfo?.jersey || targetTeam.jersey;
    const jersey = normalizeJerseyStyle(rawJersey, sport);

    // If team has colors, use them; otherwise provide default colors based on team abbrev
    if (colors && colors.length > 0) {
      return {
        colors: colors,
        jersey: jersey,
        sport
      };
    } else {
      // Team exists but has no colors - provide defaults based on abbreviation
      // Use blue/white as generic defaults if we can't determine better colors
      return {
        colors: ['#1d4ed8', '#ffffff', '#3b82f6'], // blue, white, light blue
        jersey: jersey,
        sport
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
          const rawJersey = teamSeasonInfo?.jersey || mostSeasonsTeam.jersey;
          const jersey = normalizeJerseyStyle(rawJersey, sport);
          if (colors && colors.length > 0) {
            return {
              colors: colors,
              jersey: jersey,
              sport
            };
          } else {
            // Team exists but has no colors - provide defaults
            return {
              colors: ['#1d4ed8', '#ffffff', '#3b82f6'],
              jersey: jersey,
              sport
            };
          }
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
          const rawJersey = teamSeasonInfo?.jersey || mostSeasonsTeam.jersey;
          const jersey = normalizeJerseyStyle(rawJersey, sport);
          if (colors && colors.length > 0) {
            return {
              colors: colors,
              jersey: jersey,
              sport
            };
          } else {
            // Team exists but has no colors - provide defaults
            return {
              colors: ['#1d4ed8', '#ffffff', '#3b82f6'],
              jersey: jersey,
              sport
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
          const rawJersey = lastTeamSeasonInfo?.jersey || lastTeam.jersey;
          const jersey = normalizeJerseyStyle(rawJersey, sport);
          if (colors && colors.length > 0) {
            return {
              colors: colors,
              jersey: jersey
            };
          } else {
            // Team exists but has no colors - provide defaults
            return {
              colors: ['#1d4ed8', '#ffffff', '#3b82f6'],
              jersey: jersey
            };
          }
        }
      }
    }
  }

  return defaultJersey;
}