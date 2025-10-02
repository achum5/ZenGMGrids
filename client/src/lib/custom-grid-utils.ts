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
      achievement.id !== 'career10kRebounds' && // 10k+ career rebounds returns 0 players
      achievement.id !== 'Season22PPG' && // 22+ ppg in a season returns 0 players
      // achievement.id !== 'Season3PPercent' && // 3pt% in a season achievement
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
      // Complete hardcoded sort order exactly as requested
      const EXACT_ORDER = [
        // Honors & Awards
        'MVP', 'ROY', 'SMOY', 'DPOY', 'MIP', 'FinalsMVP', 'AllLeagueAny', 'AllDefAny', 'AllRookieAny', 'AllStar', 'Champion', 'isHallOfFamer', 'threePointContestWinner', 'dunkContestWinner', 'royLaterMVP',
        // League Leaders
        'PointsLeader', 'ReboundsLeader', 'AssistsLeader', 'StealsLeader', 'BlocksLeader',
        // Career Milestones  
        'career20kPoints', 'career5kAssists', 'career2kSteals', 'career1500Blocks', 'career2kThrees',
        // Single-Season Volume & Combos
        'Season2000Points', 'Season30PPG', 'Season200_3PM', 'Season300_3PM', 'Season700Assists', 'Season10APG', 'Season800Rebounds', 'Season12RPG', 'Season150Steals', 'Season2SPG', 'Season150Blocks', 'Season2_5BPG', 'Season200Stocks', 'Season25_10', 'Season25_5_5', 'Season20_10_5', 'Season1_1_1',
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
    // Use custom achievement if available, otherwise use original
    const achievementToUse = config.customAchievement || { id: config.selectedId };
    
    
    return {
      key: `achievement-${achievementToUse.id}-${config.customAchievement ? 'custom' : 'original'}`,
      label: config.customAchievement?.label || config.selectedLabel, // Use custom achievement label if available
      achievementId: achievementToUse.id as string,
      type: 'achievement',
      test: (p: Player) => {
        if (config.customAchievement) {
          // For custom achievements, use the custom achievement's test function directly
          // Fix: Ensure playerMeetsAchievement is used for Season3PPercent to handle season filtering correctly
          if (achievementToUse.id === 'Season3PPercent' || achievementToUse.id === 'SeasonFTPercent') {
            // Use a custom test that properly handles season filtering and percentage threshold
            // The customAchievement.test may not handle season filtering correctly, so override here
            if (!seasonIndex) return false;
            const seasonIds = Object.keys(seasonIndex);
            for (const seasonStr of seasonIds) {
              const seasonNum = parseInt(seasonStr);
              if (seasonNum === undefined || isNaN(seasonNum)) continue;
              const achievementsForSeason = seasonIndex[seasonNum];
              if (!achievementsForSeason) continue;
              const playersWithAchievement = achievementsForSeason[achievementToUse.id];
              if (!playersWithAchievement) continue;
              if (!(playersWithAchievement as Set<number>).has(p.pid)) continue;

              // Now check if player's 3pt% in that season meets the operator and threshold
              // We must get player's stats for that season and calculate 3pt%
              if (!p.stats) continue;
              const seasonStats = p.stats.find(s => s.season === seasonNum && !s.playoffs) as any;
              if (!seasonStats) continue;

              // FT% calculation like 3P%: use ftm/fta, handle 0 attempts
              if (achievementToUse.id === 'SeasonFTPercent') {
                const ftm = seasonStats.ftm ?? 0;
                const fta = seasonStats.fta ?? 0;
                if (fta === 0) continue;
                const ftPct = (ftm / fta) * 100;
                if (config.operator === '≤' && ftPct <= (config.customAchievement?.threshold ?? 0)) {
                  return true;
                }
                if (config.operator === '≥' && ftPct >= (config.customAchievement?.threshold ?? 0)) {
                  return true;
                }
                continue;
              }

              const threePM = (seasonStats as any).fg3m ?? 0;
              const threePA = (seasonStats as any).fg3a ?? 0;
              if (threePA === 0) continue;
              const threePct = (threePM / threePA) * 100;
              if (config.operator === '≤' && threePct <= (config.customAchievement?.threshold ?? 0)) {
                return true;
              }
              if (config.operator === '≥' && threePct >= (config.customAchievement?.threshold ?? 0)) {
                return true;
              }
            }
            return false;
          } else if (config.customAchievement.test) {
            return config.customAchievement.test(p);
          }
        } else {
          // For regular achievements, use the standard function
          return playerMeetsAchievement(p, achievementToUse.id as string, seasonIndex, config.operator === '≤' ? '<=' : '>=');
        }
      },
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
      if (rowConstraint.test(player) && colConstraint.test(player)) {
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
