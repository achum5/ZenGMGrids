import type { LeagueData, Player, SearchablePlayer, CatTeam } from '@/types/bbgm';
import { buildSearchIndex } from '@/lib/bbgm-parser';
import { generateTeamsGrid } from '@/lib/grid-generator';
import { clearIntersectionCachesForPlayers, calculateOptimizedIntersection, type IntersectionConstraint } from '@/lib/intersection-cache';
import { setCachedLeagueYears, debugIndividualAchievements } from '@/lib/achievements';

self.onmessage = async (event: MessageEvent<{ type: 'processLeagueData'; data: LeagueData }>) => {
  if (event.data.type === 'processLeagueData') {
    const data = event.data.data;

    try {
      // Clear caches for the new player dataset
      clearIntersectionCachesForPlayers(data.players);
      
      // Set cached league years
      if (data.leagueYears) {
        setCachedLeagueYears(data.leagueYears);
      }

      // Build search indices
      const indices = buildSearchIndex(data.players, data.teams);
      const byName = indices.byName;
      const byPid = indices.byPid;
      const searchablePlayers = indices.searchablePlayers;
      const teamsByTid = indices.teamsByTid;

      // Debug individual achievements
      debugIndividualAchievements(data.players, data.seasonIndex);

      // Generate initial grid
      const gridResult = generateTeamsGrid(data);
      const rows = gridResult.rows;
      const cols = gridResult.cols;
      const intersections = gridResult.intersections;

      self.postMessage({
        success: true,
        leagueData: data,
        rows,
        cols,
        intersections,
        byName,
        byPid,
        searchablePlayers,
        teamsByTid,
      });
    } catch (error) {
      console.error('Error in process-league.worker:', error);
      self.postMessage({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
};
