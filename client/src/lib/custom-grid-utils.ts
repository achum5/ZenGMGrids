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
  autoFillError?: string;
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

// Test if a complete grid configuration has all cells with eligible players
function testGridConfiguration(
  rows: HeaderConfig[],
  cols: HeaderConfig[],
  players: Player[],
  teams: Team[],
  seasonIndex?: SeasonIndex
): boolean {
  // Check each intersection
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const rowConstraint = headerConfigToCatTeam(rows[r], teams, seasonIndex);
      const colConstraint = headerConfigToCatTeam(cols[c], teams, seasonIndex);
      
      if (!rowConstraint || !colConstraint) return false;
      
      // Count eligible players for this intersection  
      const eligiblePlayers = players.filter(player => 
        rowConstraint.test(player) && colConstraint.test(player)
      );
      const eligibleCount = eligiblePlayers.length;
      if (eligibleCount === 0) return false;
    }
  }
  return true;
}

// Generate all possible combinations for empty positions
function generateCombinations<T>(
  items: T[],
  count: number
): T[][] {
  if (count === 0) return [[]];
  if (count > items.length) return [];
  
  const result: T[][] = [];
  for (let i = 0; i <= items.length - count; i++) {
    const item = items[i];
    const remaining = items.slice(i + 1);
    const subCombinations = generateCombinations(remaining, count - 1);
    
    for (const subCombination of subCombinations) {
      result.push([item, ...subCombination]);
    }
  }
  return result;
}

// Auto-fill remaining empty headers with exhaustive testing
export function autoFillGrid(
  currentState: CustomGridState,
  players: Player[],
  teams: Team[],
  teamOptions: TeamOption[],
  achievementOptions: AchievementOption[],
  seasonIndex?: SeasonIndex
): CustomGridState {
  const newState = { ...currentState };
  
  // Identify which positions are already filled by user
  const emptyRowIndices: number[] = [];
  const emptyColIndices: number[] = [];
  const usedTeams = new Set<number>();
  const usedAchievements = new Set<string>();
  
  // Track what's already selected and what's empty
  for (let i = 0; i < 3; i++) {
    if (!newState.rows[i].selectedId) {
      emptyRowIndices.push(i);
    } else {
      if (newState.rows[i].type === 'team') usedTeams.add(newState.rows[i].selectedId as number);
      if (newState.rows[i].type === 'achievement') usedAchievements.add(newState.rows[i].selectedId as string);
    }
    
    if (!newState.cols[i].selectedId) {
      emptyColIndices.push(i);
    } else {
      if (newState.cols[i].type === 'team') usedTeams.add(newState.cols[i].selectedId as number);
      if (newState.cols[i].type === 'achievement') usedAchievements.add(newState.cols[i].selectedId as string);
    }
  }
  
  // Get available options (excluding already used)
  const availableTeams = teamOptions.filter(t => !usedTeams.has(t.id));
  const availableAchievements = achievementOptions.filter(a => !usedAchievements.has(a.id));
  const allAvailableOptions = [
    ...availableTeams.map(t => ({ type: 'team' as const, id: t.id, label: t.label })),
    ...availableAchievements.map(a => ({ type: 'achievement' as const, id: a.id, label: a.label }))
  ];
  
  const totalEmpty = emptyRowIndices.length + emptyColIndices.length;
  
  if (totalEmpty === 0) {
    // Nothing to fill
    return updateCustomGridState(newState, players, teams, seasonIndex);
  }
  
  if (allAvailableOptions.length < totalEmpty) {
    // Not enough options to fill all empty positions
    return newState;
  }
  
  // Try all possible combinations of available options for empty positions
  const combinations = generateCombinations(allAvailableOptions, totalEmpty);
  
  for (const combination of combinations) {
    // Create a test configuration
    const testRows = [...newState.rows];
    const testCols = [...newState.cols];
    
    // Fill empty positions with this combination
    let comboIndex = 0;
    
    // Fill empty rows first
    for (const rowIndex of emptyRowIndices) {
      const option = combination[comboIndex++];
      testRows[rowIndex] = {
        type: option.type,
        selectedId: option.id,
        selectedLabel: option.label
      };
    }
    
    // Then fill empty columns
    for (const colIndex of emptyColIndices) {
      const option = combination[comboIndex++];
      testCols[colIndex] = {
        type: option.type,
        selectedId: option.id,
        selectedLabel: option.label
      };
    }
    
    // Test if this configuration works (all cells have eligible players)
    if (testGridConfiguration(testRows, testCols, players, teams, seasonIndex)) {
      // Found a valid configuration! Apply it
      newState.rows = testRows as [HeaderConfig, HeaderConfig, HeaderConfig];
      newState.cols = testCols as [HeaderConfig, HeaderConfig, HeaderConfig];
      return updateCustomGridState(newState, players, teams, seasonIndex);
    }
  }
  
  // No valid configuration found after trying all combinations
  // Return original state with an error indicator
  return {
    ...newState,
    isValid: false,
    isSolvable: false,
    autoFillError: 'No valid combination found. Try changing your selections.'
  };
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