import type { Player, Team, CatTeam, LeagueData } from '@/types/bbgm';
import type { SeasonIndex, SeasonAchievementId } from '@/lib/season-achievements';
import { getAllAchievements, playerMeetsAchievement } from '@/lib/achievements';
import { getSeasonEligiblePlayers, SEASON_ACHIEVEMENTS } from '@/lib/season-achievements';
import { calculateOptimizedIntersection, type IntersectionConstraint } from '@/lib/intersection-cache';

// Create Set for O(1) lookup instead of O(N) .some() calls
const SEASON_ACHIEVEMENT_IDS = new Set(SEASON_ACHIEVEMENTS.map(sa => sa.id));

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
export function getAchievementOptions(
  sport: string, 
  seasonIndex?: SeasonIndex,
  leagueYears?: { minSeason: number; maxSeason: number }
): AchievementOption[] {
  const achievements = getAllAchievements(sport as any, seasonIndex, leagueYears);
  return achievements
    .filter(achievement => 
      achievement.id !== 'bornOutsideUS50DC' && // Exclude problematic achievement
      achievement.id !== 'SFMVP' && // Exclude Superstar Finals MVP
      achievement.id !== 'career10kRebounds' && // 10k+ career rebounds returns 0 players
      achievement.id !== 'Season22PPG' && // 22+ ppg in a season returns 0 players
      achievement.id !== 'RandomPoints25000pts' && // 25k+ career points returns 0 players  
      achievement.id !== 'RandomRebounds6000trb' && // 6k+ career rebounds returns 0 players
      // Remove duplicate lower-tier achievements
      achievement.id !== 'career3kPoints' && // Remove 3k+ points (we have 20k+)
      achievement.id !== 'career5kPoints' && // Remove 5k+ points (we have 20k+) 
      achievement.id !== 'career10kPoints' && // Remove 10k+ points (we have 20k+)
      achievement.id !== 'career15kPoints' && // Remove 15k+ points (we have 20k+)
      achievement.id !== 'career500Assists' && // Remove 500+ assists (we have 5k+)
      achievement.id !== 'career1kAssists' && // Remove 1k+ assists (we have 5k+)
      achievement.id !== 'career2kAssists' && // Remove 2k+ assists (we have 5k+)
      achievement.id !== 'career3kAssists' && // Remove 3k+ assists (we have 5k+)
      achievement.id !== 'career2500Rebounds' && // Remove 2.5k+ rebounds (we have 10k+)
      achievement.id !== 'career5kRebounds' && // Remove 5k+ rebounds (we have 10k+) 
      achievement.id !== 'career7500Rebounds' && // Remove 7.5k+ rebounds (we have 10k+)
      achievement.id !== 'career500Blocks' && // Remove 500+ blocks (we have 1500+)
      achievement.id !== 'career1kBlocks' && // Remove 1k+ blocks (we have 1500+)
      achievement.id !== 'career500Steals' && // Remove 500+ steals (we have 2k+)
      achievement.id !== 'career1kSteals' && // Remove 1k+ steals (we have 2k+)
      achievement.id !== 'career500Threes' && // Remove 500+ threes (we have 2k+)
      achievement.id !== 'career1kThrees' && // Remove 1k+ threes (we have 2k+)
      achievement.id !== 'career5Seasons' && // Remove 5+ seasons (we have 10+)
      achievement.id !== 'career8Seasons' // Remove 8+ seasons (we have 10+)
    )
    .map(achievement => ({
      id: achievement.id,
      label: achievement.label
    }))
    .sort((a, b) => {
      // Sort by career first (career achievements before season) - use O(1) Set lookup
      const aIsSeason = SEASON_ACHIEVEMENT_IDS.has(a.id as any);
      const bIsSeason = SEASON_ACHIEVEMENT_IDS.has(b.id as any);
      
      if (!aIsSeason && bIsSeason) return -1; // Career first
      if (aIsSeason && !bIsSeason) return 1;   // Season second
      
      // If both are same type (season or career), sort alphabetically
      return a.label.localeCompare(b.label);
    });
}

// Convert header config to CatTeam constraint for intersection calculation
export function headerConfigToCatTeam(
  config: HeaderConfig,
  teams: Team[],
  seasonIndex?: SeasonIndex
): CatTeam | null {
  // Fix: Allow selectedId of 0 (some teams have tid 0)
  if (config.type == null || config.selectedId == null || config.selectedLabel == null) {
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

// Calculate intersection for a single cell using optimized Set-based operations with memoization
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

  // Use optimized intersection calculation with memoization
  const rowIntersectionConstraint: IntersectionConstraint = {
    type: rowConstraint.type,
    id: rowConstraint.type === 'team' ? rowConstraint.tid! : rowConstraint.achievementId!,
    label: rowConstraint.label
  };
  
  const colIntersectionConstraint: IntersectionConstraint = {
    type: colConstraint.type,
    id: colConstraint.type === 'team' ? colConstraint.tid! : colConstraint.achievementId!,
    label: colConstraint.label
  };
  
  return calculateOptimizedIntersection(
    rowIntersectionConstraint,
    colIntersectionConstraint,
    players,
    teams,
    seasonIndex,
    true // Return count only
  ) as number;
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
  const DEBUG = import.meta.env.VITE_DEBUG === 'true';
  if (!DEBUG) return;
  
  console.log('Starting achievement intersection debug test');
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
  
  console.log(`Final intersection result: ${intersection} players`);
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