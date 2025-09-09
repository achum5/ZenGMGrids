import type { Player, Team, CatTeam, LeagueData } from '@/types/bbgm';
import type { SeasonIndex, SeasonAchievementId } from '@/lib/season-achievements';
import { getAchievements, playerMeetsAchievement } from '@/lib/achievements';
import { getSeasonEligiblePlayers, SEASON_ACHIEVEMENTS } from '@/lib/season-achievements';
import { evaluateConstraintPair } from '@/lib/feedback';

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
  seasonIndex?: SeasonIndex,
  position?: string // Add position parameter to make keys unique
): CatTeam | null {
  if (!config.type || !config.selectedId || !config.selectedLabel) {
    return null;
  }

  if (config.type === 'team') {
    const team = teams.find(t => t.tid === config.selectedId);
    if (!team) return null;
    
    return {
      key: position ? `team-${config.selectedId}-${position}` : `team-${config.selectedId}`,
      label: config.selectedLabel,
      tid: config.selectedId as number,
      type: 'team',
      test: (p: Player) => p.teamsPlayed.has(config.selectedId as number),
    };
  } else {
    return {
      key: position ? `achievement-${config.selectedId}-${position}` : `achievement-${config.selectedId}`,
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

  // Use the same logic as grid generator for proper Team × Achievement alignment
  let eligiblePlayers: Player[];
  
  // Check if either constraint is a season achievement
  const rowIsSeasonAchievement = rowConstraint.type === 'achievement' && SEASON_ACHIEVEMENTS.some(sa => sa.id === rowConstraint.achievementId);
  const colIsSeasonAchievement = colConstraint.type === 'achievement' && SEASON_ACHIEVEMENTS.some(sa => sa.id === colConstraint.achievementId);
  
  if (rowIsSeasonAchievement && colConstraint.type === 'team' && seasonIndex) {
    // Season achievement × team
    const eligiblePids = getSeasonEligiblePlayers(seasonIndex, colConstraint.tid!, rowConstraint.achievementId as SeasonAchievementId);
    eligiblePlayers = players.filter(p => eligiblePids.has(p.pid));
  } else if (colIsSeasonAchievement && rowConstraint.type === 'team' && seasonIndex) {
    // Team × season achievement  
    const eligiblePids = getSeasonEligiblePlayers(seasonIndex, rowConstraint.tid!, colConstraint.achievementId as SeasonAchievementId);
    eligiblePlayers = players.filter(p => eligiblePids.has(p.pid));
  } else if (rowIsSeasonAchievement && colIsSeasonAchievement && seasonIndex) {
    // Season achievement × season achievement
    if (rowConstraint.achievementId === colConstraint.achievementId) {
      // Same achievement - just find all players who have it
      const eligiblePids = new Set<number>();
      for (const seasonStr of Object.keys(seasonIndex)) {
        const season = parseInt(seasonStr);
        const seasonData = seasonIndex[season];
        for (const teamStr of Object.keys(seasonData)) {
          const teamId = parseInt(teamStr);
          const teamData = seasonData[teamId];
          if (teamData[rowConstraint.achievementId as SeasonAchievementId]) {
            const achievementPids = teamData[rowConstraint.achievementId as SeasonAchievementId];
            achievementPids.forEach(pid => eligiblePids.add(pid));
          }
        }
      }
      eligiblePlayers = players.filter(p => eligiblePids.has(p.pid));
    } else {
      // Different achievements - find players who have both in the same season
      const eligiblePids = new Set<number>();
      for (const seasonStr of Object.keys(seasonIndex)) {
        const season = parseInt(seasonStr);
        const seasonData = seasonIndex[season];
        for (const teamStr of Object.keys(seasonData)) {
          const teamId = parseInt(teamStr);
          const teamData = seasonData[teamId];
          const rowAchievementPids = teamData[rowConstraint.achievementId as SeasonAchievementId] || new Set();
          const colAchievementPids = teamData[colConstraint.achievementId as SeasonAchievementId] || new Set();
          
          // Find intersection of both achievements in this season
          rowAchievementPids.forEach(pid => {
            if (colAchievementPids.has(pid)) {
              eligiblePids.add(pid);
            }
          });
        }
      }
      eligiblePlayers = players.filter(p => eligiblePids.has(p.pid));
    }
  } else {
    // Standard evaluation for career achievements or mixed career/season
    eligiblePlayers = players.filter(p => 
      evaluateConstraintPair(p, rowConstraint, colConstraint, seasonIndex)
    );
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
  
  // Convert rows with position information to ensure unique keys
  for (let i = 0; i < 3; i++) {
    const constraint = headerConfigToCatTeam(state.rows[i], teams, seasonIndex, `r${i}`);
    if (!constraint) return null;
    rows.push(constraint);
  }
  
  // Convert cols with position information to ensure unique keys
  for (let i = 0; i < 3; i++) {
    const constraint = headerConfigToCatTeam(state.cols[i], teams, seasonIndex, `c${i}`);
    if (!constraint) return null;
    cols.push(constraint);
  }
  
  return { rows, cols };
}