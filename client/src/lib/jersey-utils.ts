import type { Player, Team } from '@/types/bbgm';

export interface JerseyInfo {
  colors: string[];
  jersey: string;
}

/**
 * Determines which team's jersey colors and style a player should wear
 */
export function getPlayerJerseyInfo(player: Player, teams: Team[], sport?: string): JerseyInfo {
  const teamMap = new Map(teams.map(team => [team.tid, team]));
  
  // Remove debug logs for cleaner output
  
  // Sport-specific default jersey styles
  let defaultJerseyStyle = 'modern';
  if (sport === 'baseball') {
    // Use proper baseball jersey style that faces.js supports
    defaultJerseyStyle = 'baseball2'; // Use baseball2 style which is the correct one
  }
  
  // Default fallback
  const defaultJersey: JerseyInfo = {
    colors: ['#1f2937', '#ffffff'], // Default gray/white
    jersey: defaultJerseyStyle
  };

  // Active player (tid >= 0)
  if (player.tid >= 0) {
    const currentTeam = teamMap.get(player.tid);
    if (currentTeam && currentTeam.colors && currentTeam.colors.length > 0) {
      return {
        colors: currentTeam.colors,
        jersey: sport === 'baseball' ? 'baseball2' : (currentTeam.jersey || defaultJerseyStyle)
      };
    }
  }

  // For free agents (-1) or retired players (-2, -3, or has retiredYear)
  // Always use the last team they recorded a game with
  if (!player.stats || player.stats.length === 0) {
    return defaultJersey;
  }

  // Find the most recent team they played for (by season and games played)
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
    if (lastTeam && lastTeam.colors && lastTeam.colors.length > 0) {
      return {
        colors: lastTeam.colors,
        jersey: sport === 'baseball' ? 'baseball2' : (lastTeam.jersey || defaultJerseyStyle)
      };
    }
  }

  return defaultJersey;
}