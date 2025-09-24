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
      // Remove duplicate lower-tier random achievements (keep only highest thresholds)
      !achievement.id.startsWith('Randomcareer3000') && // Remove 3k+ career achievements
      !achievement.id.startsWith('Randomcareer5000') && // Remove 5k+ career achievements  
      !achievement.id.startsWith('Randomcareer7500') && // Remove 7.5k+ career achievements
      !achievement.id.startsWith('Randomcareer10000') && // Remove 10k+ career achievements
      !achievement.id.startsWith('Randomcareer12500') && // Remove 12.5k+ career achievements
      !achievement.id.startsWith('Randomcareer15000') && // Remove 15k+ career achievements
      !achievement.id.startsWith('Randomcareer17500') && // Remove 17.5k+ career achievements
      !achievement.id.startsWith('Randomcareer500') && // Remove 500+ career achievements (assists/steals/blocks/rebounds/threes)
      !achievement.id.startsWith('Randomcareer1000') && // Remove 1k+ career achievements
      !achievement.id.startsWith('Randomcareer1250') && // Remove 1.25k+ career achievements
      !achievement.id.startsWith('Randomcareer1500') && // Remove 1.5k+ career achievements 
      !achievement.id.startsWith('Randomcareer2000') && // Remove 2k+ career achievements
      !achievement.id.startsWith('Randomcareer2500') && // Remove 2.5k+ career achievements
      !achievement.id.startsWith('Randomcareer3000') && // Remove 3k+ career achievements
      !achievement.id.startsWith('Randomcareer4000') && // Remove 4k+ career achievements
      !achievement.id.startsWith('Randomcareer6000') && // Remove 6k+ career achievements
      !achievement.id.startsWith('Randomcareer7500') && // Remove 7.5k+ career achievements (rebounds)
      achievement.id !== 'Randomcareer100threes' && // Remove 100+ threes (we want 2k+)
      achievement.id !== 'Randomcareer200threes' && // Remove 200+ threes (we want 2k+)
      achievement.id !== 'Randomcareer300threes' && // Remove 300+ threes (we want 2k+)
      achievement.id !== 'Randomcareer500threes' && // Remove 500+ threes (we want 2k+)
      achievement.id !== 'Randomcareer750threes' && // Remove 750+ threes (we want 2k+)
      achievement.id !== 'Randomcareer1000threes' && // Remove 1k+ threes (we want 2k+)
      achievement.id !== 'Randomcareer1250threes' && // Remove 1.25k+ threes (we want 2k+)
      achievement.id !== 'Randomcareer1500threes' && // Remove 1.5k+ threes (we want 2k+)
      achievement.id !== 'Randomseason16rpg' // Remove 16+ RPG season achievement
    )
    .map(achievement => ({
      id: achievement.id,
      label: achievement.label
    }))
    .sort((a, b) => {
      // Custom sort order matching user's categorized structure
      const getAchievementPriority = (id: string): number => {
        // 1. Honors & Awards
        if (['MVP', 'ROY', 'SMOY', 'DPOY', 'MIP', 'FinalsMVP', 'AllLeagueAny', 'AllDefAny', 'AllRookieAny', 'AllStar', 'Champion', 'isHallOfFamer', 'threePointContestWinner', 'dunkContestWinner', 'royLaterMVP'].includes(id)) return 1;
        
        // 2. League Leaders  
        if (['PointsLeader', 'ReboundsLeader', 'AssistsLeader', 'StealsLeader', 'BlocksLeader'].includes(id)) return 2;
        
        // 3. Career Milestones
        if (['career20kPoints', 'career5kAssists', 'career2kSteals', 'career1500Blocks', 'career2kThrees'].includes(id)) return 3;
        
        // 4. Single-Season Volume & Combos
        if (['Season2000Points', 'Season30PPG', 'Season200_3PM', 'Season250ThreePM', 'Season300_3PM', 'Season700Assists', 'Season10APG', 'Season800Rebounds', 'Season12RPG', 'Season150Steals', 'Season2SPG', 'Season150Blocks', 'Season2_5BPG', 'Season200Stocks', 'Season25_10', 'Season25_5_5', 'Season20_10_5', 'Season1_1_1'].includes(id)) return 4;
        
        // 5. Single-Season Efficiency & Workload
        if (['Season50_40_90', 'Season40_3PT200_3PA', 'Season90FT250FTA', 'Season60eFG500FGA', 'Season60TS20PPG', 'Season36MPG', 'Season70Games'].includes(id)) return 5;
        
        // 6. Longevity & Journey
        if (['played10PlusSeasons', 'played15PlusSeasons', 'playedAtAge40Plus', 'playedInThreeDecades', 'played5PlusFranchises'].includes(id) || id.includes('playedIn') || id.includes('debutedIn')) return 6;
        
        // 7. Draft & Entry
        if (['isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen'].includes(id)) return 7;
        
        // 8. Random achievements (lowest priority)
        if (id.startsWith('Random')) return 8;
        
        // Default fallback
        return 9;
      };
      
      const aPriority = getAchievementPriority(a.id);
      const bPriority = getAchievementPriority(b.id);
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Within same category, use specific order for each section
      if (aPriority === 1) {
        // Honors & Awards specific order
        const honorsOrder = ['MVP', 'ROY', 'SMOY', 'DPOY', 'MIP', 'FinalsMVP', 'AllLeagueAny', 'AllDefAny', 'AllRookieAny', 'AllStar', 'Champion', 'isHallOfFamer', 'threePointContestWinner', 'dunkContestWinner', 'royLaterMVP'];
        return honorsOrder.indexOf(a.id) - honorsOrder.indexOf(b.id);
      }
      
      if (aPriority === 2) {
        // League Leaders specific order
        const leadersOrder = ['PointsLeader', 'ReboundsLeader', 'AssistsLeader', 'StealsLeader', 'BlocksLeader'];
        return leadersOrder.indexOf(a.id) - leadersOrder.indexOf(b.id);
      }
      
      if (aPriority === 3) {
        // Career Milestones specific order  
        const careerOrder = ['career20kPoints', 'career5kAssists', 'career2kSteals', 'career1500Blocks', 'career2kThrees'];
        return careerOrder.indexOf(a.id) - careerOrder.indexOf(b.id);
      }
      
      if (aPriority === 4) {
        // Single-Season Volume specific order
        const volumeOrder = ['Season2000Points', 'Season30PPG', 'Season200_3PM', 'Season250ThreePM', 'Season300_3PM', 'Season700Assists', 'Season10APG', 'Season800Rebounds', 'Season12RPG', 'Season150Steals', 'Season2SPG', 'Season150Blocks', 'Season2_5BPG', 'Season200Stocks', 'Season25_10', 'Season25_5_5', 'Season20_10_5', 'Season1_1_1'];
        return volumeOrder.indexOf(a.id) - volumeOrder.indexOf(b.id);
      }
      
      if (aPriority === 5) {
        // Single-Season Efficiency specific order
        const efficiencyOrder = ['Season50_40_90', 'Season40_3PT200_3PA', 'Season90FT250FTA', 'Season60eFG500FGA', 'Season60TS20PPG', 'Season36MPG', 'Season70Games'];
        return efficiencyOrder.indexOf(a.id) - efficiencyOrder.indexOf(b.id);
      }
      
      if (aPriority === 6) {
        // Longevity & Journey specific order
        const longevityOrder = ['played10PlusSeasons', 'played15PlusSeasons', 'playedAtAge40Plus', 'playedInThreeDecades', 'played5PlusFranchises'];
        const aIndex = longevityOrder.indexOf(a.id);
        const bIndex = longevityOrder.indexOf(b.id);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        // For decade achievements, sort alphabetically  
        return a.label.localeCompare(b.label);
      }
      
      if (aPriority === 7) {
        // Draft & Entry specific order
        const draftOrder = ['isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen'];
        return draftOrder.indexOf(a.id) - draftOrder.indexOf(b.id);
      }
      
      // Fallback to alphabetical
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