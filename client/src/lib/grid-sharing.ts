import type { CatTeam, LeagueData } from '@/types/bbgm';
import { getAllAchievements } from './achievements';
import { createCustomNumericalAchievement } from './editable-achievements';

// New interface for shared achievements to support custom values
export type SharedGridAchievement = {
  id: string;
  value?: number;
  operator?: 'gte' | 'lte';
};

export type SharedGridItem = number | SharedGridAchievement;

export interface SharedGrid {
  rows: SharedGridItem[];
  cols: SharedGridItem[];
  sport: 'basketball' | 'football' | 'hockey' | 'baseball';
  version: number;
  createdAt?: string;
}

/**
 * Export current grid to a shareable format
 */
export function exportGrid(
  rows: CatTeam[],
  cols: CatTeam[],
  sport: 'basketball' | 'football' | 'hockey' | 'baseball'
): SharedGrid {
  const mapCatTeamToSharedGridItem = (item: CatTeam): SharedGridItem => {
    if (item.type === 'team' && item.tid !== undefined) {
      return item.tid;
    } else if (item.type === 'achievement' && item.achievementId) {
      if (item.achievementId.includes('_custom_')) {
        const parts = item.achievementId.split('_custom_');
        const baseId = parts[0];
        const customPart = parts[1]; // e.g., "1500_gte"
        
        const customParts = customPart.split('_');
        const value = parseFloat(customParts[0]);
        const operatorStr = customParts[1] as 'gte' | 'lte';

        return { id: baseId, value, operator: operatorStr };
      }
      return { id: item.achievementId };
    }
    throw new Error(`Invalid grid constraint: ${item.key}`);
  };

  const exportedRows = rows.map(mapCatTeamToSharedGridItem);
  const exportedCols = cols.map(mapCatTeamToSharedGridItem);

  return {
    rows: exportedRows,
    cols: exportedCols,
    sport,
    version: 2, // Bump version for new structure
    createdAt: new Date().toISOString(),
  };
}

/**
 * Import a shared grid and reconstruct it with current league data
 */
export function importGrid(
  sharedGrid: any, // Use any to handle legacy and new formats
  leagueData: LeagueData
): { rows: CatTeam[]; cols: CatTeam[] } | null {
  try {
    const allAchievements = getAllAchievements(leagueData.sport, leagueData.seasonIndex, leagueData.leagueYears);
    const achievementMap = new Map(allAchievements.map(a => [a.id, a]));

    const reconstructCatTeam = (item: any): CatTeam => {
      if (typeof item === 'number') {
        // It's a team ID
        const team = leagueData.teams.find(t => t.tid === item);
        if (!team) throw new Error(`Team with ID ${item} not found`);
        return {
          key: `team-${item}`,
          label: `${team.region || team.abbrev} ${team.name}`,
          tid: item,
          type: 'team' as const,
          test: (p) => p.teamsPlayed.has(item),
        };
      }

      // Handle achievements (both old string format and new object format)
      let achievementId: string;
      let achievement: ReturnType<typeof achievementMap.get>;

      if (typeof item === 'string') {
        // Legacy format
        achievementId = item;
        achievement = achievementMap.get(achievementId);
        if (!achievement) throw new Error(`Achievement with ID ${achievementId} not found`);
        
        return {
          key: `achievement-${achievement.id}`,
          label: achievement.label,
          achievementId: achievement.id,
          type: 'achievement' as const,
          test: achievement.test,
        };

      } else if (typeof item === 'object' && item.id) {
        // New format
        achievementId = item.id;
        const baseAchievement = achievementMap.get(achievementId);
        if (!baseAchievement) throw new Error(`Base achievement with ID ${achievementId} not found`);

        if (item.value !== undefined && item.operator && leagueData.sport) {
          // It's a custom numerical achievement, reconstruct it
          const operatorSymbol = item.operator === 'lte' ? '≤' : '≥';
          const customAchievement = createCustomNumericalAchievement(
            baseAchievement,
            item.value,
            leagueData.sport,
            operatorSymbol
          );
          return {
            key: `achievement-${customAchievement.id}`,
            label: customAchievement.label,
            achievementId: customAchievement.id,
            type: 'achievement' as const,
            test: customAchievement.test,
          };
        }
        
        // It's a standard achievement
        return {
          key: `achievement-${baseAchievement.id}`,
          label: baseAchievement.label,
          achievementId: baseAchievement.id,
          type: 'achievement' as const,
          test: baseAchievement.test,
        };
      }
      
      throw new Error('Invalid item in grid data');
    };

    const reconstructedRows = sharedGrid.rows.map(reconstructCatTeam);
    const reconstructedCols = sharedGrid.cols.map(reconstructCatTeam);

    return { rows: reconstructedRows, cols: reconstructedCols };
  } catch (error) {
    console.error('Failed to import grid:', error);
    return null;
  }
}


/**
 * Generate a shareable grid code (base64 encoded JSON)
 */
export function generateGridCode(sharedGrid: SharedGrid): string {
  try {
    const json = JSON.stringify(sharedGrid);
    return btoa(json);
  } catch (error) {
    console.error('Failed to generate grid code for:', sharedGrid, error);
    throw new Error('Failed to generate grid code');
  }
}

/**
 * Parse a grid code back to SharedGrid
 */
export function parseGridCode(code: string): SharedGrid | null {
  try {
    const json = atob(code);
    const sharedGrid = JSON.parse(json) as SharedGrid;
    
    // Validate the structure
    if (!sharedGrid.rows || !sharedGrid.cols || !sharedGrid.sport || !sharedGrid.version) {
      throw new Error('Invalid grid code structure');
    }
    
    return sharedGrid;
  } catch (error) {
    console.error('Failed to parse grid code:', error);
    return null;
  }
}

/**
 * Get sport from league data for grid sharing
 */
export function detectSport(leagueData: LeagueData): 'basketball' | 'football' | 'hockey' | 'baseball' {
  // Use the sport property if available, otherwise detect from filename/structure
  if (leagueData.sport) {
    return leagueData.sport as 'basketball' | 'football' | 'hockey' | 'baseball';
  }
  
  // Fallback detection - since LeagueData may not have filename property
  // Most leagues should have the sport property set during parsing
  
  // Default to basketball
  return 'basketball';
}
