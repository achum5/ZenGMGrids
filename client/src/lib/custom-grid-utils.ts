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

  const eligiblePlayers = players.filter(player => 
    rowConstraint.test(player) && colConstraint.test(player)
  );

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

// Auto-fill remaining empty headers intelligently
export function autoFillGrid(
  currentState: CustomGridState,
  players: Player[],
  teams: Team[],
  teamOptions: TeamOption[],
  achievementOptions: AchievementOption[],
  seasonIndex?: SeasonIndex
): CustomGridState {
  const newState = { ...currentState };
  
  // Identify which positions are already filled
  const filledPositions = new Set<string>();
  const usedTeams = new Set<number>();
  const usedAchievements = new Set<string>();
  
  // Track what's already selected
  newState.rows.forEach((row, i) => {
    if (row.selectedId) {
      filledPositions.add(`row-${i}`);
      if (row.type === 'team') usedTeams.add(row.selectedId as number);
      if (row.type === 'achievement') usedAchievements.add(row.selectedId as string);
    }
  });
  
  newState.cols.forEach((col, i) => {
    if (col.selectedId) {
      filledPositions.add(`col-${i}`);
      if (col.type === 'team') usedTeams.add(col.selectedId as number);
      if (col.type === 'achievement') usedAchievements.add(col.selectedId as string);
    }
  });
  
  // Get available options
  const availableTeams = teamOptions.filter(t => !usedTeams.has(t.id));
  const availableAchievements = achievementOptions.filter(a => !usedAchievements.has(a.id));
  
  // Identify empty positions
  const emptyRows: number[] = [];
  const emptyCols: number[] = [];
  
  for (let i = 0; i < 3; i++) {
    if (!filledPositions.has(`row-${i}`)) emptyRows.push(i);
    if (!filledPositions.has(`col-${i}`)) emptyCols.push(i);
  }
  
  // Smart filling strategy - try to ensure all intersections have players
  let teamIndex = 0;
  let achievementIndex = 0;
  
  // Fill rows first
  for (const rowIndex of emptyRows) {
    // Alternate between teams and achievements for variety
    if (rowIndex % 2 === 0 && teamIndex < availableTeams.length) {
      // Use team for even rows
      const team = availableTeams[teamIndex++];
      newState.rows[rowIndex] = {
        type: 'team',
        selectedId: team.id,
        selectedLabel: team.label
      };
    } else if (achievementIndex < availableAchievements.length) {
      // Use achievement for odd rows or if no teams left
      const achievement = availableAchievements[achievementIndex++];
      newState.rows[rowIndex] = {
        type: 'achievement',
        selectedId: achievement.id,
        selectedLabel: achievement.label
      };
    } else if (teamIndex < availableTeams.length) {
      // Fallback to team if no achievements left
      const team = availableTeams[teamIndex++];
      newState.rows[rowIndex] = {
        type: 'team',
        selectedId: team.id,
        selectedLabel: team.label
      };
    }
  }
  
  // Fill columns
  for (const colIndex of emptyCols) {
    // Alternate the opposite way for columns
    if (colIndex % 2 === 1 && teamIndex < availableTeams.length) {
      // Use team for odd columns
      const team = availableTeams[teamIndex++];
      newState.cols[colIndex] = {
        type: 'team',
        selectedId: team.id,
        selectedLabel: team.label
      };
    } else if (achievementIndex < availableAchievements.length) {
      // Use achievement for even columns or if no teams left
      const achievement = availableAchievements[achievementIndex++];
      newState.cols[colIndex] = {
        type: 'achievement',
        selectedId: achievement.id,
        selectedLabel: achievement.label
      };
    } else if (teamIndex < availableTeams.length) {
      // Fallback to team if no achievements left
      const team = availableTeams[teamIndex++];
      newState.cols[colIndex] = {
        type: 'team',
        selectedId: team.id,
        selectedLabel: team.label
      };
    }
  }
  
  // If we still have empty positions, fill with whatever is available
  for (let i = 0; i < 3; i++) {
    if (!newState.rows[i].selectedId) {
      if (teamIndex < availableTeams.length) {
        const team = availableTeams[teamIndex++];
        newState.rows[i] = {
          type: 'team',
          selectedId: team.id,
          selectedLabel: team.label
        };
      } else if (achievementIndex < availableAchievements.length) {
        const achievement = availableAchievements[achievementIndex++];
        newState.rows[i] = {
          type: 'achievement',
          selectedId: achievement.id,
          selectedLabel: achievement.label
        };
      }
    }
    
    if (!newState.cols[i].selectedId) {
      if (achievementIndex < availableAchievements.length) {
        const achievement = availableAchievements[achievementIndex++];
        newState.cols[i] = {
          type: 'achievement',
          selectedId: achievement.id,
          selectedLabel: achievement.label
        };
      } else if (teamIndex < availableTeams.length) {
        const team = availableTeams[teamIndex++];
        newState.cols[i] = {
          type: 'team',
          selectedId: team.id,
          selectedLabel: team.label
        };
      }
    }
  }
  
  return updateCustomGridState(newState, players, teams, seasonIndex);
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