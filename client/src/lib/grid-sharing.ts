import type { CatTeam, LeagueData } from '@/types/bbgm';
import { getAchievements, playerMeetsAchievement } from './achievements';

export interface SharedGrid {
  rows: (number | string)[];  // tid for teams, achievementId for achievements
  cols: (number | string)[];  // tid for teams, achievementId for achievements
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
  console.log('Exporting grid with sport:', sport);
  console.log('Rows:', rows.map(r => ({ key: r.key, type: r.type, tid: r.tid, achievementId: r.achievementId })));
  console.log('Cols:', cols.map(c => ({ key: c.key, type: c.type, tid: c.tid, achievementId: c.achievementId })));
  
  const exportedRows = rows.map(row => {
    if (row.type === 'team' && row.tid !== undefined) {
      return row.tid;
    } else if (row.type === 'achievement' && row.achievementId) {
      return row.achievementId;
    }
    throw new Error(`Invalid row constraint: ${row.key}`);
  });

  const exportedCols = cols.map(col => {
    if (col.type === 'team' && col.tid !== undefined) {
      return col.tid;
    } else if (col.type === 'achievement' && col.achievementId) {
      return col.achievementId;
    }
    throw new Error(`Invalid col constraint: ${col.key}`);
  });

  const result = {
    rows: exportedRows,
    cols: exportedCols,
    sport,
    version: 1,
    createdAt: new Date().toISOString()
  };
  
  console.log('Exported grid:', result);
  return result;
}

/**
 * Import a shared grid and reconstruct it with current league data
 */
export function importGrid(
  sharedGrid: SharedGrid, 
  leagueData: LeagueData
): { rows: CatTeam[]; cols: CatTeam[] } | null {
  try {
    console.log('Importing grid:', sharedGrid);
    console.log('Current league sport:', leagueData.sport);
    
    if (sharedGrid.version !== 1) {
      throw new Error(`Unsupported grid version: ${sharedGrid.version}`);
    }

    if (sharedGrid.rows.length !== 3 || sharedGrid.cols.length !== 3) {
      throw new Error('Invalid grid dimensions');
    }

    // Get available achievements for this sport
    const achievements = getAchievements(sharedGrid.sport);
    console.log('Available achievements for', sharedGrid.sport, ':', achievements.map(a => a.id));
    const achievementMap = new Map(achievements.map(a => [a.id, a]));

    // Reconstruct rows
    const reconstructedRows: CatTeam[] = sharedGrid.rows.map((item, index) => {
      if (typeof item === 'number') {
        // It's a team ID
        const team = leagueData.teams.find(t => t.tid === item);
        if (!team) {
          throw new Error(`Team with ID ${item} not found in current league`);
        }
        return {
          key: `team-${item}`,
          label: `${team.region || team.abbrev} ${team.name}`,
          tid: item,
          type: 'team' as const,
          test: (p) => p.teamsPlayed.has(item),
        };
      } else {
        // It's an achievement ID
        const achievement = achievementMap.get(item);
        if (!achievement) {
          throw new Error(`Achievement ${item} not available for ${sharedGrid.sport}`);
        }
        return {
          key: `achievement-${item}`,
          label: achievement.label,
          achievementId: item,
          type: 'achievement' as const,
          test: (p) => playerMeetsAchievement(p, item),
        };
      }
    });

    // Reconstruct cols
    const reconstructedCols: CatTeam[] = sharedGrid.cols.map((item, index) => {
      if (typeof item === 'number') {
        // It's a team ID
        const team = leagueData.teams.find(t => t.tid === item);
        if (!team) {
          throw new Error(`Team with ID ${item} not found in current league`);
        }
        return {
          key: `team-${item}`,
          label: `${team.region || team.abbrev} ${team.name}`,
          tid: item,
          type: 'team' as const,
          test: (p) => p.teamsPlayed.has(item),
        };
      } else {
        // It's an achievement ID
        const achievement = achievementMap.get(item);
        if (!achievement) {
          throw new Error(`Achievement ${item} not available for ${sharedGrid.sport}`);
        }
        return {
          key: `achievement-${item}`,
          label: achievement.label,
          achievementId: item,
          type: 'achievement' as const,
          test: (p) => playerMeetsAchievement(p, item),
        };
      }
    });

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