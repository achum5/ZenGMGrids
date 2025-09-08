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

// Simple, fast auto-fill that just tries common combinations
export function autoFillGrid(
  currentState: CustomGridState,
  players: Player[],
  teams: Team[],
  teamOptions: TeamOption[],
  achievementOptions: AchievementOption[],
  seasonIndex?: SeasonIndex,
  fillType: 'mixed' | 'teams-only' | 'achievements-only' = 'mixed'
): CustomGridState {
  const newState = { ...currentState };
  
  // Identify what's already used and what's empty
  const usedTeams = new Set<number>();
  const usedAchievements = new Set<string>();
  const emptyRows: number[] = [];
  const emptyCols: number[] = [];
  let currentAchievementCount = 0;
  
  for (let i = 0; i < 3; i++) {
    if (!newState.rows[i].selectedId) {
      emptyRows.push(i);
    } else {
      if (newState.rows[i].type === 'team') {
        usedTeams.add(newState.rows[i].selectedId as number);
      } else {
        usedAchievements.add(newState.rows[i].selectedId as string);
        currentAchievementCount++;
      }
    }
    
    if (!newState.cols[i].selectedId) {
      emptyCols.push(i);
    } else {
      if (newState.cols[i].type === 'team') {
        usedTeams.add(newState.cols[i].selectedId as number);
      } else {
        usedAchievements.add(newState.cols[i].selectedId as string);
        currentAchievementCount++;
      }
    }
  }
  
  // Helper function to shuffle an array
  const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Get available options and shuffle them for variety
  const shuffledTeams = shuffleArray(teamOptions.filter(t => !usedTeams.has(t.id)));
  const shuffledAchievements = shuffleArray(achievementOptions.filter(a => !usedAchievements.has(a.id)));
  
  const availableTeams = shuffledTeams.slice(0, 15); // Increased from 10 for more variety
  const availableAchievements = shuffledAchievements.slice(0, 15);
  
  // Strategy: mix popular and random teams/achievements for variety
  const popularTeams = availableTeams.filter(t => 
    ['Lakers', 'Celtics', 'Warriors', 'Heat', 'Bulls', 'Spurs', 'Knicks'].some(name => 
      t.label.includes(name)
    )
  );
  const randomTeams = availableTeams.filter(t => !popularTeams.includes(t));
  const mixedTeams = shuffleArray([...popularTeams, ...randomTeams.slice(0, 16)]);
  
  const popularAchievements = availableAchievements.filter(a =>
    ['Hall of Fame', 'First Round', 'Played 15+', '20,000+'].some(phrase =>
      a.label.includes(phrase)
    )
  );
  const randomAchievements = availableAchievements.filter(a => !popularAchievements.includes(a));
  const mixedAchievements = shuffleArray([...popularAchievements, ...randomAchievements.slice(0, 16)]);
  
  // Achievement limit logic
  const maxAllowedAchievements = 3;
  const canAddMoreAchievements = currentAchievementCount < maxAllowedAchievements;
  const shouldAvoidAchievements = currentAchievementCount >= 3;
  const shouldLimitAchievements = currentAchievementCount === 2; // Only add max 1 more if we have 2
  
  // Create pools of available options and track usage
  const availableTeamPool = [...mixedTeams];
  const availableAchievementPool = [...mixedAchievements];
  let achievementsAdded = 0;
  
  // Helper to randomly pick and remove from pool
  const pickRandomTeam = () => {
    if (availableTeamPool.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * availableTeamPool.length);
    return availableTeamPool.splice(randomIndex, 1)[0];
  };
  
  const pickRandomAchievement = () => {
    if (availableAchievementPool.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * availableAchievementPool.length);
    return availableAchievementPool.splice(randomIndex, 1)[0];
  };
  
  // Fill empty rows with smart achievement limiting and randomization
  for (let i = 0; i < emptyRows.length; i++) {
    const rowIndex = emptyRows[i];
    
    // Determine what to use based on fillType and randomness
    let shouldUseTeam: boolean;
    if (fillType === 'teams-only') {
      shouldUseTeam = true;
    } else if (fillType === 'achievements-only') {
      shouldUseTeam = false;
    } else {
      // Mixed mode - add some randomness to the decision, not just strict alternating
      const useTeamBias = Math.random() > 0.4; // 60% chance to prefer team
      shouldUseTeam = shouldAvoidAchievements || 
                      (shouldLimitAchievements && achievementsAdded >= 1) ||
                      useTeamBias;
    }
    
    if (shouldUseTeam) {
      // Try to use team first
      const team = pickRandomTeam();
      if (team) {
        newState.rows[rowIndex] = {
          type: 'team',
          selectedId: team.id,
          selectedLabel: team.label
        };
        continue;
      }
    }
    
    // Try achievement if allowed and available (or if we're forced to use achievements-only)
    if ((canAddMoreAchievements && (!shouldLimitAchievements || achievementsAdded < 1)) ||
        fillType === 'achievements-only') {
      const achievement = pickRandomAchievement();
      if (achievement) {
        newState.rows[rowIndex] = {
          type: 'achievement',
          selectedId: achievement.id,
          selectedLabel: achievement.label
        };
        achievementsAdded++;
        continue;
      }
    }
    
    // Fallback to team if achievement didn't work
    const team = pickRandomTeam();
    if (team) {
      newState.rows[rowIndex] = {
        type: 'team',
        selectedId: team.id,
        selectedLabel: team.label
      };
    }
  }
  
  // Fill empty columns with smart achievement limiting and randomization
  for (let i = 0; i < emptyCols.length; i++) {
    const colIndex = emptyCols[i];
    
    // Determine what to use based on fillType and randomness (column logic)
    let shouldUseTeam: boolean;
    if (fillType === 'teams-only') {
      shouldUseTeam = true;
    } else if (fillType === 'achievements-only') {
      shouldUseTeam = false;
    } else {
      // Mixed mode - add some randomness to the decision with slight opposite bias from rows
      const useTeamBias = Math.random() > 0.3; // 70% chance to prefer team for balance
      shouldUseTeam = shouldAvoidAchievements || 
                      (shouldLimitAchievements && achievementsAdded >= 1) ||
                      useTeamBias;
    }
    
    if (shouldUseTeam) {
      // Try to use team first
      const team = pickRandomTeam();
      if (team) {
        newState.cols[colIndex] = {
          type: 'team',
          selectedId: team.id,
          selectedLabel: team.label
        };
        continue;
      }
    }
    
    // Try achievement if allowed and available (or if we're forced to use achievements-only)
    if ((canAddMoreAchievements && (!shouldLimitAchievements || achievementsAdded < 1)) ||
        fillType === 'achievements-only') {
      const achievement = pickRandomAchievement();
      if (achievement) {
        newState.cols[colIndex] = {
          type: 'achievement',
          selectedId: achievement.id,
          selectedLabel: achievement.label
        };
        achievementsAdded++;
        continue;
      }
    }
    
    // Fallback to team if achievement didn't work
    const team = pickRandomTeam();
    if (team) {
      newState.cols[colIndex] = {
        type: 'team',
        selectedId: team.id,
        selectedLabel: team.label
      };
    }
  }
  
  // Return updated state (even if not perfect, it's better than freezing)
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