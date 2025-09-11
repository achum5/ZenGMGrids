import type { Player, Team, CatTeam, LeagueData } from '@/types/bbgm';
import type { SeasonIndex } from '@/lib/season-achievements';
import { getAchievements, playerMeetsAchievement } from '@/lib/achievements';

export interface HeaderConfig {
  type: 'team' | 'achievement' | null;
  selectedId: string | number | null;
  selectedLabel: string | null;
}

export interface CustomGridState {
  rows: [HeaderConfig, HeaderConfig, HeaderConfig];
  cols: [HeaderConfig, HeaderConfig, HeaderConfig];
  cellResults: number[][]; // 3x3 array of player counts
  isValid: boolean;
  isSolvable: boolean;
}

export interface TeamOption {
  id: number;
  label: string;
}

export interface AchievementOption {
  id: string;
  label: string;
}

// Initialize empty custom grid state
export function createEmptyCustomGrid(): CustomGridState {
  return {
    rows: [
      { type: null, selectedId: null, selectedLabel: null },
      { type: null, selectedId: null, selectedLabel: null },
      { type: null, selectedId: null, selectedLabel: null }
    ],
    cols: [
      { type: null, selectedId: null, selectedLabel: null },
      { type: null, selectedId: null, selectedLabel: null },
      { type: null, selectedId: null, selectedLabel: null }
    ],
    cellResults: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ],
    isValid: false,
    isSolvable: false
  };
}

// Get available team options from league data
export function getTeamOptions(teams: Team[]): TeamOption[] {
  return teams
    .filter(team => !team.disabled)
    .map(team => ({
      id: team.tid,
      label: `${team.region || team.abbrev} ${team.name}`.trim()
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Get available achievement options from league data
export function getAchievementOptions(sport: string, seasonIndex?: SeasonIndex): AchievementOption[] {
  const achievements = getAchievements(sport as any, seasonIndex);
  return achievements
    .filter(achievement => achievement.id !== 'bornOutsideUS50DC') // Exclude problematic achievement
    .map(achievement => ({
      id: achievement.id,
      label: achievement.label
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Convert header config to CatTeam constraint for intersection calculation
export function headerConfigToCatTeam(
  config: HeaderConfig,
  teams: Team[],
  seasonIndex?: SeasonIndex
): CatTeam | null {
  if (!config.type || !config.selectedId || !config.selectedLabel) {
    return null;
  }

  if (config.type === 'team') {
    const team = teams.find(t => t.tid === config.selectedId);
    if (!team) return null;
    
    return {
      key: `team-${config.selectedId}`,
      label: config.selectedLabel,
      tid: config.selectedId as number,
      type: 'team',
      test: (p: Player) => p.teamsPlayed.has(config.selectedId as number),
    };
  } else {
    return {
      key: `achievement-${config.selectedId}`,
      label: config.selectedLabel,
      achievementId: config.selectedId as string,
      type: 'achievement',
      test: (p: Player) => playerMeetsAchievement(p, config.selectedId as string, seasonIndex),
    };
  }
}

// Calculate intersection for a single cell
export function calculateCustomCellIntersection(
  rowConfig: HeaderConfig,
  colConfig: HeaderConfig,
  players: Player[],
  teams: Team[],
  seasonIndex?: SeasonIndex
): number {
  const rowConstraint = headerConfigToCatTeam(rowConfig, teams, seasonIndex);
  const colConstraint = headerConfigToCatTeam(colConfig, teams, seasonIndex);
  
  if (!rowConstraint || !colConstraint) {
    return 0;
  }

  // Debug logging for our specific problematic intersection
  const isDebugIntersection = 
    (rowConstraint.achievementId === 'career10kRebounds' && colConstraint.achievementId === 'AssistsLeader') ||
    (colConstraint.achievementId === 'career10kRebounds' && rowConstraint.achievementId === 'AssistsLeader');
    
  if (isDebugIntersection) {
    console.log(`🔍 [DEBUG INTERSECTION] Testing intersection:`);
    console.log(`   Row: ${rowConstraint.label} (${rowConstraint.achievementId || rowConstraint.tid})`);
    console.log(`   Col: ${colConstraint.label} (${colConstraint.achievementId || colConstraint.tid})`);
    console.log(`   Total players: ${players.length}`);
    console.log(`   SeasonIndex available: ${!!seasonIndex}`);
    
    // Test each constraint individually first
    const rowQualifiers = players.filter(player => rowConstraint.test(player));
    const colQualifiers = players.filter(player => colConstraint.test(player));
    
    console.log(`   Players qualifying for "${rowConstraint.label}": ${rowQualifiers.length}`);
    console.log(`     - Sample players: ${rowQualifiers.slice(0, 5).map(p => p.name || `pid:${p.pid}`).join(', ')}`);
    
    console.log(`   Players qualifying for "${colConstraint.label}": ${colQualifiers.length}`);
    console.log(`     - Sample players: ${colQualifiers.slice(0, 5).map(p => p.name || `pid:${p.pid}`).join(', ')}`);
  }

  const eligiblePlayers = players.filter(player => 
    rowConstraint.test(player) && colConstraint.test(player)
  );

  if (isDebugIntersection) {
    console.log(`   Final intersection: ${eligiblePlayers.length} players`);
    if (eligiblePlayers.length > 0) {
      console.log(`     - Intersection players: ${eligiblePlayers.slice(0, 5).map(p => p.name || `pid:${p.pid}`).join(', ')}`);
    } else {
      console.log(`     - ❌ No players in intersection!`);
    }
  }

  return eligiblePlayers.length;
}

// Update cell results for entire grid
export function updateCellResults(
  state: CustomGridState,
  players: Player[],
  teams: Team[],
  seasonIndex?: SeasonIndex
): number[][] {
  const results: number[][] = [[], [], []];
  
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const count = calculateCustomCellIntersection(
        state.rows[row],
        state.cols[col],
        players,
        teams,
        seasonIndex
      );
      results[row][col] = count;
    }
  }
  
  return results;
}

// Check if grid is valid (all cells have ≥1 players)
export function isGridValid(cellResults: number[][]): boolean {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (cellResults[row][col] === 0) {
        return false;
      }
    }
  }
  return true;
}

// Check if grid is solvable (no single player required for multiple cells)
export function isGridSolvable(
  state: CustomGridState,
  players: Player[],
  teams: Team[],
  seasonIndex?: SeasonIndex
): boolean {
  // Get all cells with exactly 1 eligible player
  const singlePlayerCells: { row: number; col: number; playerId: number }[] = [];
  
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (state.cellResults[row][col] === 1) {
        // Find the single eligible player for this cell
        const rowConstraint = headerConfigToCatTeam(state.rows[row], teams, seasonIndex);
        const colConstraint = headerConfigToCatTeam(state.cols[col], teams, seasonIndex);
        
        if (rowConstraint && colConstraint) {
          const eligiblePlayers = players.filter(player => 
            rowConstraint.test(player) && colConstraint.test(player)
          );
          
          if (eligiblePlayers.length === 1) {
            singlePlayerCells.push({
              row,
              col,
              playerId: eligiblePlayers[0].pid
            });
          }
        }
      }
    }
  }
  
  // Check if any player is required for multiple cells
  const playerCellCounts = new Map<number, number>();
  for (const cell of singlePlayerCells) {
    const count = playerCellCounts.get(cell.playerId) || 0;
    playerCellCounts.set(cell.playerId, count + 1);
  }
  
  // Grid is unsolvable if any player is the only option for multiple cells
  for (const count of Array.from(playerCellCounts.values())) {
    if (count > 1) {
      return false;
    }
  }
  
  return true;
}

// Update the complete grid state with new configuration
export function updateCustomGridState(
  state: CustomGridState,
  players: Player[],
  teams: Team[],
  seasonIndex?: SeasonIndex
): CustomGridState {
  const cellResults = updateCellResults(state, players, teams, seasonIndex);
  const isValid = isGridValid(cellResults);
  const isSolvable = isValid ? isGridSolvable(state, players, teams, seasonIndex) : false;
  
  return {
    ...state,
    cellResults,
    isValid,
    isSolvable
  };
}

// Debug function to test specific achievement intersection
export function debugAchievementIntersection(
  players: Player[],
  teams: Team[],
  seasonIndex?: SeasonIndex
): void {
  console.log(`🚀 [DEBUG] Starting achievement intersection debug test`);
  console.log(`   Players: ${players.length}, Teams: ${teams.length}, SeasonIndex: ${!!seasonIndex}`);
  
  // Create test configurations for our problematic intersection
  const reboundsConfig: HeaderConfig = {
    type: 'achievement',
    selectedId: 'career10kRebounds',
    selectedLabel: '10,000+ Career Rebounds'
  };
  
  const assistsConfig: HeaderConfig = {
    type: 'achievement', 
    selectedId: 'AssistsLeader',
    selectedLabel: 'League Assists Leader'
  };
  
  // Test the intersection
  const intersection = calculateCustomCellIntersection(
    reboundsConfig,
    assistsConfig, 
    players,
    teams,
    seasonIndex
  );
  
  console.log(`🎯 [DEBUG] Final intersection result: ${intersection} players`);
}

// Convert custom grid state to grid generation format
export function customGridToGenerated(
  state: CustomGridState,
  teams: Team[],
  seasonIndex?: SeasonIndex
): { rows: CatTeam[]; cols: CatTeam[] } | null {
  if (!state.isValid || !state.isSolvable) {
    return null;
  }
  
  const rows: CatTeam[] = [];
  const cols: CatTeam[] = [];
  
  // Convert rows
  for (let i = 0; i < 3; i++) {
    const constraint = headerConfigToCatTeam(state.rows[i], teams, seasonIndex);
    if (!constraint) return null;
    rows.push(constraint);
  }
  
  // Convert cols
  for (let i = 0; i < 3; i++) {
    const constraint = headerConfigToCatTeam(state.cols[i], teams, seasonIndex);
    if (!constraint) return null;
    cols.push(constraint);
  }
  
  return { rows, cols };
}