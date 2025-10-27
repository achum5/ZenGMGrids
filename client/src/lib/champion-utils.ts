import type { PlayoffSeasonData, Team } from '@/types/bbgm';

/**
 * Determines if a team won the championship in a given season
 * @param playoffSeriesData - Playoff series data for the season
 * @param tid - Team ID to check
 * @returns true if the team won the championship, false otherwise
 */
export function isChampion(
  playoffSeriesData: PlayoffSeasonData | undefined,
  tid: number | undefined
): boolean {
  // Guard clauses
  if (!playoffSeriesData || tid === undefined || tid < 0) {
    return false;
  }

  const { series } = playoffSeriesData;

  // Guard: need at least one round
  if (!series || series.length === 0) {
    return false;
  }

  // The finals is the last round
  const finalsRound = series[series.length - 1];

  // Guard: finals should have at least one matchup
  if (!finalsRound || finalsRound.length === 0) {
    return false;
  }

  // Usually there's only one matchup in the finals, but handle multiple just in case
  for (const matchup of finalsRound) {
    if (!matchup?.home || !matchup?.away) continue;

    const { home, away } = matchup;

    // Check if this team participated in this finals matchup
    if (home.tid === tid || away.tid === tid) {
      // Determine the winner by comparing won counts
      // The team with more wins is the champion
      if (home.tid === tid && home.won > (away.won || 0)) {
        return true;
      }
      if (away.tid === tid && away.won > (home.won || 0)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Gets all championship seasons for a team from playoff series data
 * @param teams - Array of teams
 * @param tid - Team ID to check
 * @param allPlayoffSeries - Array of playoff data for all seasons
 * @returns Array of championship seasons with season-aligned colors and logo info
 */
export function getAllChampionships(
  teams: Team[],
  tid: number,
  allPlayoffSeries?: PlayoffSeasonData[]
): Array<{
  season: number;
  colors: string[];
  logo?: string;
  teamName: string;
  abbrev: string;
}> {
  const team = teams.find(t => t.tid === tid);
  if (!team || !allPlayoffSeries) return [];

  const championships: Array<{
    season: number;
    colors: string[];
    logo?: string;
    teamName: string;
    abbrev: string;
  }> = [];

  // Check each season's playoff data to see if this team won
  for (const playoffData of allPlayoffSeries) {
    if (isChampion(playoffData, tid)) {
      // Find season-specific team data
      const seasonData = team.seasons?.find(s => s.season === playoffData.season);

      // Get season-aligned colors, logo, and name
      const seasonColors = seasonData?.colors || team.colors || ['#1d4ed8', '#3b82f6'];
      const seasonLogo = seasonData?.imgURL || team.imgURL;
      const seasonName = seasonData?.region
        ? `${seasonData.region} ${seasonData.name || team.name}`
        : team.name;
      const seasonAbbrev = seasonData?.abbrev || team.abbrev;

      championships.push({
        season: playoffData.season,
        colors: seasonColors,
        logo: seasonLogo ? seasonLogo : undefined,
        teamName: seasonName,
        abbrev: seasonAbbrev
      });
    }
  }

  return championships.sort((a, b) => b.season - a.season); // Most recent first
}

/**
 * Gets the championship year string for display
 */
export function getChampionshipYearDisplay(season: number): string {
  return season.toString();
}
