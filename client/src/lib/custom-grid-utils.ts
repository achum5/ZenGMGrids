import type { Player, Team, CatTeam, LeagueData } from '@/types/bbgm';
import type { SeasonIndex, SeasonAchievementId } from '@/lib/season-achievements';
import { getAllAchievements, playerMeetsAchievement } from '@/lib/achievements';
import { getSeasonEligiblePlayers, SEASON_ACHIEVEMENTS } from '@/lib/season-achievements';
import { calculateOptimizedIntersection, type IntersectionConstraint } from '@/lib/intersection-cache';
import { parseAchievementLabel, generateUpdatedLabel } from '@/lib/editable-achievements';
import { getCachedSportDetection, getCachedLeagueYears } from '@/lib/achievements';

// Create Set for O(1) lookup instead of O(N) .some() calls
const SEASON_ACHIEVEMENT_IDS = new Set(SEASON_ACHIEVEMENTS.map(sa => sa.id));

export interface HeaderConfig {
  type: 'team' | 'achievement' | null;
  selectedId: string | number | null;
  selectedLabel: string | null;
  customAchievement?: any; // For dynamic numerical achievements
  operator?: '≥' | '≤'; // For tracking operator state in achievements
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
  console.log(`🔧 [ACHIEVEMENT OPTIONS] Called with sport: ${sport}, cache version: v2`);
  const achievements = getAllAchievements(sport as any, seasonIndex, leagueYears);
  return achievements
    .filter(achievement => 
      achievement.id !== 'bornOutsideUS50DC' && // Exclude problematic achievement
      achievement.id !== 'SFMVP' && // Exclude Superstar Finals MVP
      achievement.id !== 'Season22PPG' && // 22+ ppg in a season returns 0 players
      // achievement.id !== 'Season3PPercent' && // 3pt% in a season achievement
      achievement.id !== 'RandomPoints25000pts' && // 25k+ career points returns 0 players  
      achievement.id !== 'Randomseason16rpg' // Remove 16+ RPG season achievement
    )
    .map(achievement => ({
      id: achievement.id,
      label: achievement.label
    }))
    .sort((a, b) => {
      // Complete hardcoded sort order exactly as requested
      const EXACT_ORDER = [
        // Honors & Awards
        'MVP', 'ROY', 'SMOY', 'DPOY', 'MIP', 'FinalsMVP', 'AllLeagueAny', 'AllDefAny', 'AllRookieAny', 'AllStar', 'Champion', 'isHallOfFamer', 'threePointContestWinner', 'dunkContestWinner', 'royLaterMVP',
        // League Leaders
        'PointsLeader', 'ReboundsLeader', 'AssistsLeader', 'StealsLeader', 'BlocksLeader',
        // Career Milestones  
        'career20kPoints', 'career5kAssists', 'career2kSteals', 'career1500Blocks', 'career2kThrees',
        // Single-Season Volume & Combos
        'Season2000Points', 'Season30PPG', 'Season200_3PM', 'Season300_3PM', 'Season700Assists', 'Season10APG', 'Season800Rebounds', 'Season12RPG', 'Season150Steals', 'Season2SPG', 'Season2_5BPG', 'Season150Blocks', 'Season200Stocks', 'Season25_10', 'Season25_5_5', 'Season20_10_5', 'Season1_1_1',
        // Single-Season Efficiency & Workload  
        'Season50_40_90', 'Season90FT250FTA', 'SeasonFGPercent', 'Season3PPercent', 'Season60eFG500FGA', 'Season60TS20PPG', 'Season36MPG', 'Season70Games',
        // Longevity & Journey
        'played15PlusSeasons', 'playedAtAge40Plus', 'playedInThreeDecades', 'played5PlusFranchises',
        // Draft & Entry
        'isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen'
      ];
      
      const aIndex = EXACT_ORDER.indexOf(a.id);
      const bIndex = EXACT_ORDER.indexOf(b.id);
      
      // Both found in exact order - use that order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // Only A found - A comes first
      if (aIndex !== -1 && bIndex === -1) {
        return -1;
      }
      
      // Only B found - B comes first
      if (aIndex === -1 && bIndex !== -1) {
        return 1;
      }
      
      // Neither found - handle special cases
      // Decade achievements should be sorted in longevity section
      if (a.id.includes('playedIn') && b.id.includes('playedIn')) {
        return a.label.localeCompare(b.label);
      }
      if (a.id.includes('debutedIn') && b.id.includes('debutedIn')) {
        return a.label.localeCompare(b.label);
      }
      if ((a.id.includes('playedIn') || a.id.includes('debutedIn')) && !(b.id.includes('playedIn') || b.id.includes('debutedIn'))) {
        return -1; // Decade achievements come in longevity section
      }
      if (!(a.id.includes('playedIn') || a.id.includes('debutedIn')) && (b.id.includes('playedIn') || b.id.includes('debutedIn'))) {
        return 1; // Decade achievements come in longevity section
      }
      
      // Random achievements go last
      if (a.id.startsWith('Random') && !b.id.startsWith('Random')) {
        return 1;
      }
      if (!a.id.startsWith('Random') && b.id.startsWith('Random')) {
        return -1;
      }
      
      // Both random or both unknown - alphabetical
      return a.label.localeCompare(b.label);
    });
}

// Convert header config to CatTeam constraint for intersection calculation
export function headerConfigToCatTeam(
  config: HeaderConfig,
  teams: Team[],
  seasonIndex?: SeasonIndex
): CatTeam | null {
  console.log('[DEBUG headerConfigToCatTeam] Input config:', config);
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
    let achievementLabel = config.selectedLabel;
    let achievementId = config.selectedId as string;
    let achievementTest = (p: Player) => false; // Default test
    let operator: '≥' | '≤' = config.operator || '≥';

    if (config.customAchievement) {
      console.log('[DEBUG headerConfigToCatTeam] Using customAchievement:', config.customAchievement);
      // If a custom achievement object is provided, use its label and test function
      achievementLabel = config.customAchievement.label;
      achievementId = config.customAchievement.id;
      achievementTest = config.customAchievement.test;
      operator = config.customAchievement.operator || operator;
    } else {
      // If no custom achievement object, but it's an editable achievement, regenerate the label
      const sport = getCachedSportDetection();
      const leagueYears = getCachedLeagueYears();
      const allAchievements = getAllAchievements(sport, seasonIndex, leagueYears);
      const originalAchievement = allAchievements.find(a => a.id === config.selectedId);

      if (originalAchievement) {
        console.log('[DEBUG headerConfigToCatTeam] Found originalAchievement:', originalAchievement);
        const parsedOriginal = parseAchievementLabel(originalAchievement.label, sport);
        console.log('[DEBUG headerConfigToCatTeam] Parsed original achievement:', parsedOriginal);
        if (parsedOriginal.isEditable) {
          // Use the original number for the label if no custom number is set
          const numberToUse = parsedOriginal.number;
          console.log(`[DEBUG headerConfigToCatTeam] Generating label with number: ${numberToUse}, operator: ${operator}`);
          achievementLabel = generateUpdatedLabel(parsedOriginal, numberToUse, operator);
          console.log('[DEBUG headerConfigToCatTeam] Generated label:', achievementLabel);
          // For non-customized editable achievements, use the original achievement's test
          achievementTest = (p: Player) => playerMeetsAchievement(p, originalAchievement.id, seasonIndex, operator === '≤' ? '<=' : '>=');
        } else {
          // Not editable, use the original label and test
          achievementLabel = originalAchievement.label;
          achievementTest = originalAchievement.test;
        }
      } else {
        // Fallback for unknown achievements (should not happen if selectedId is valid)
        console.warn('[DEBUG headerConfigToCatTeam] Original achievement not found for ID:', config.selectedId);
        achievementLabel = config.selectedLabel;
        achievementTest = (p: Player) => playerMeetsAchievement(p, config.selectedId as string, seasonIndex, operator === '≤' ? '<=' : '>=');
      }
    }
    
    return {
      key: `achievement-${achievementId}-${config.customAchievement ? 'custom' : 'original'}`,
      label: achievementLabel,
      achievementId: achievementId as string,
      type: 'achievement',
      test: achievementTest,
    };
  }
}

// Async chunked processing for custom achievement intersections to prevent UI blocking
async function processCustomIntersectionAsync(
  rowConstraint: any,
  colConstraint: any,
  players: Player[],
  chunkSize: number = 500,
  returnPlayers: boolean = false
): Promise<number | Player[]> {
  const eligiblePlayers: Player[] = [];
  let count = 0;
  
  // Process players in chunks to avoid blocking the UI thread
  for (let i = 0; i < players.length; i += chunkSize) {
    const chunk = players.slice(i, i + chunkSize);
    
    // Process chunk synchronously
    for (const player of chunk) {
      if (rowConstraint.test(player) && colConstraint.test(player)) {
        if (returnPlayers) {
          eligiblePlayers.push(player);
        } else {
          count++;
        }
      }
    }
    
    // Yield control back to the UI thread after each chunk
    if (i + chunkSize < players.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return returnPlayers ? eligiblePlayers : count;
}

// Cache for custom achievement intersections
const customIntersectionCache = new Map<string, { result: number | Player[]; timestamp: number; }>();
const CUSTOM_CACHE_TTL = 30000; // 30 seconds

function generateCustomCacheKey(
  rowConfig: HeaderConfig,
  colConfig: HeaderConfig,
  returnPlayers: boolean = false
): string {
  const rowKey = rowConfig.customAchievement?.id || rowConfig.selectedId;
  const colKey = colConfig.customAchievement?.id || colConfig.selectedId;
  const rowOp = rowConfig.customAchievement?.operator || rowConfig.operator || '';
  const colOp = colConfig.customAchievement?.operator || colConfig.operator || '';
  return `${rowKey}-${rowOp}|${colKey}-${colOp}|${returnPlayers ? 'players' : 'count'}`;
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

  // If either constraint has custom achievements, use direct calculation to avoid cache conflicts
  const hasCustomAchievements = rowConfig.customAchievement || colConfig.customAchievement;
  
  if (hasCustomAchievements) {
    // Check cache first for custom achievements
    const cacheKey = generateCustomCacheKey(rowConfig, colConfig, false);
    const cached = customIntersectionCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CUSTOM_CACHE_TTL) {
      return cached.result as number;
    }
    
    // Direct calculation for custom achievements - count players that meet both constraints
    let count = 0;
    for (const player of players) {
      let rowMeets = false;
      let colMeets = false;

      // Evaluate row constraint
      if (rowConstraint.type === 'achievement' && rowConstraint.achievementId?.startsWith('career') && colConstraint.type === 'team') {
        // Career achievement intersected with a team
        rowMeets = playerMeetsAchievement(player, rowConstraint.achievementId, seasonIndex, rowConfig.operator, colConstraint.tid);
      } else {
        rowMeets = rowConstraint.test(player);
      }

      // Evaluate column constraint
      if (colConstraint.type === 'achievement' && colConstraint.achievementId?.startsWith('career') && rowConstraint.type === 'team') {
        // Career achievement intersected with a team
        colMeets = playerMeetsAchievement(player, colConstraint.achievementId, seasonIndex, colConfig.operator, rowConstraint.tid);
      } else {
        colMeets = colConstraint.test(player);
      }

      if (rowMeets && colMeets) {
        count++;
      }
    }
    
    // Cache the result
    customIntersectionCache.set(cacheKey, { result: count, timestamp: Date.now() });
    return count;
  }

  // Use optimized intersection calculation with memoization for standard achievements
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

// Async version for getting eligible players (for player modal and hints)
export async function getCustomCellEligiblePlayersAsync(
  rowConfig: HeaderConfig,
  colConfig: HeaderConfig,
  players: Player[],
  teams: Team[],
  seasonIndex?: SeasonIndex
): Promise<Player[]> {
  const rowConstraint = headerConfigToCatTeam(rowConfig, teams, seasonIndex);
  const colConstraint = headerConfigToCatTeam(colConfig, teams, seasonIndex);
  
  if (!rowConstraint || !colConstraint) {
    return [];
  }

  const hasCustomAchievements = rowConfig.customAchievement || colConfig.customAchievement;
  
  if (hasCustomAchievements) {
    // Check cache first
    const cacheKey = generateCustomCacheKey(rowConfig, colConfig, true);
    const cached = customIntersectionCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CUSTOM_CACHE_TTL) {
      return cached.result as Player[];
    }
    
    // Use async processing for large datasets to prevent UI blocking
    if (players.length > 1000) {
      const eligiblePlayers = await processCustomIntersectionAsync(
        rowConstraint,
        colConstraint,
        players,
        500, // Process 500 players per chunk
        true
      ) as Player[];
      
      // Cache the result
      customIntersectionCache.set(cacheKey, { result: eligiblePlayers, timestamp: Date.now() });
      return eligiblePlayers;
    } else {
      // For smaller datasets, use synchronous processing
      const eligiblePlayers = players.filter(player => 
        rowConstraint.test(player) && colConstraint.test(player)
      );
      
      // Cache the result
      customIntersectionCache.set(cacheKey, { result: eligiblePlayers, timestamp: Date.now() });
      return eligiblePlayers;
    }
  }

  // Use optimized intersection for standard achievements
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
  
  const eligiblePids = calculateOptimizedIntersection(
    rowIntersectionConstraint,
    colIntersectionConstraint,
    players,
    teams,
    seasonIndex,
    false // Return Set<number>
  ) as Set<number>;
  
  // Convert Set<number> to Player[]
  return players.filter(player => eligiblePids.has(player.pid));
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
  const DEBUG = import.meta.env.VITE_DEBUG;
  if (!DEBUG) return;
  
  console.log('Starting achievement intersection debug test');
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