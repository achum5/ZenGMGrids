/**
 * Hint generation logic for Basketball GM Immaculate Grid
 * Generates 6 players (1 correct + 5 distractors) for hint mode
 */

import type { Player, CatTeam, LeagueData, Team } from '@/types/bbgm';
import { createSeededRandom } from './seeded';
import { playerMeetsAchievement } from './achievements';

export interface HintOption {
  player: Player;
  isCorrect: boolean;
  isIncorrect?: boolean; // Marked when user picks incorrectly
}

export interface HintGenerationResult {
  options: HintOption[];
  hasLimitedOptions: boolean;
  canReshuffle: boolean;
}

/**
 * Cache for hint generation results
 * Key: `${gridId}|${cellKey}|${reshuffleCount}`
 */
const hintCache = new Map<string, HintGenerationResult>();

/**
 * Clear hint cache (called when new grid is generated)
 */
export function clearHintCache(): void {
  hintCache.clear();
}

/**
 * Generate hint options for a specific cell
 */
export function generateHintOptions(
  gridId: string,
  cellKey: string,
  rowConstraint: CatTeam,
  colConstraint: CatTeam,
  eligiblePlayerIds: number[],
  allPlayers: Player[],
  byPid: Record<number, Player>,
  teams: Team[],
  usedPids: Set<number>,
  reshuffleCount: number = 0,
  leagueData?: LeagueData
): HintGenerationResult {
  const cacheKey = `${gridId}|${cellKey}|${reshuffleCount}`;
  
  // Check cache first
  if (hintCache.has(cacheKey)) {
    return hintCache.get(cacheKey)!;
  }

  // Get eligible players and filter out used ones
  const eligiblePlayers = eligiblePlayerIds
    .map(pid => byPid[pid])
    .filter(p => p && !usedPids.has(p.pid));

  if (eligiblePlayers.length === 0) {
    const result: HintGenerationResult = {
      options: [],
      hasLimitedOptions: true,
      canReshuffle: false
    };
    hintCache.set(cacheKey, result);
    return result;
  }

  // Create seeded random generator for correct player selection (deterministic across reshuffles)
  const correctRng = createSeededRandom(gridId, cellKey);
  
  // Pick one correct answer from eligible players (same player across reshuffles)
  const correctPlayer = correctRng.pick(eligiblePlayers)!;

  // Create separate seeded random generator for distractor selection and shuffling (changes on reshuffle)
  const distractorRng = createSeededRandom(gridId, cellKey, reshuffleCount);

  // Convert eligible player IDs to a Set for fast exclusion
  const eligiblePidSet = new Set(eligiblePlayerIds);

  // Generate distractors
  const distractors = generateDistractors(
    correctPlayer,
    rowConstraint,
    colConstraint,
    allPlayers,
    teams,
    usedPids,
    eligiblePidSet,
    distractorRng,
    leagueData
  );

  // Combine and shuffle options
  const allOptions: HintOption[] = [
    { player: correctPlayer, isCorrect: true },
    ...distractors.map(p => ({ player: p, isCorrect: false }))
  ];

  // Shuffle to randomize position of correct answer (using distractor RNG so position changes on reshuffle)
  const shuffledOptions = distractorRng.shuffle(allOptions);

  // Determine if we can reshuffle (need enough players for a different set)
  const totalAvailablePlayers = eligiblePlayers.length + 
    estimateDistractorPool(rowConstraint, colConstraint, allPlayers, teams);
  const canReshuffle = totalAvailablePlayers >= 12 && reshuffleCount < 3;

  const result: HintGenerationResult = {
    options: shuffledOptions,
    hasLimitedOptions: shuffledOptions.length < 6,
    canReshuffle
  };

  hintCache.set(cacheKey, result);
  return result;
}

/**
 * Generate smart distractors according to the specification priority:
 * 1. Near-miss players (satisfy exactly one category)
 * 2. Era/team context players (teammates, overlap years)  
 * 3. Archetype look-alikes (same position, similar career)
 * 4. General pool (position, decade, conference matches)
 */
function generateDistractors(
  correctPlayer: Player,
  rowConstraint: CatTeam,
  colConstraint: CatTeam,
  allPlayers: Player[],
  teams: Team[],
  usedPids: Set<number>,
  eligiblePidSet: Set<number>,
  rng: ReturnType<typeof createSeededRandom>,
  leagueData?: LeagueData
): Player[] {
  // Exclude the correct player, all used players, AND all other eligible players
  const excludePids = new Set([correctPlayer.pid, ...Array.from(usedPids), ...Array.from(eligiblePidSet)]);
  const distractors: Player[] = [];
  const maxDistractors = 5;

  // Filter out excluded players to ensure no other correct answers can be selected as distractors
  const availablePlayers = allPlayers.filter(p => 
    !excludePids.has(p.pid)
  );

  // 1. Near-miss players (satisfy exactly one constraint)
  const nearMissPlayers = availablePlayers.filter(player => {
    const meetsRow = evaluateConstraint(player, rowConstraint, leagueData?.seasonIndex);
    const meetsCol = evaluateConstraint(player, colConstraint, leagueData?.seasonIndex);
    return (meetsRow && !meetsCol) || (!meetsRow && meetsCol);
  });
  
  if (nearMissPlayers.length > 0 && distractors.length < maxDistractors) {
    const selected = rng.sample(nearMissPlayers, Math.min(3, maxDistractors - distractors.length));
    distractors.push(...selected);
    selected.forEach(p => excludePids.add(p.pid));
  }

  // 2. Era/team context players (teammates, overlapping years)
  if (distractors.length < maxDistractors) {
    const contextPlayers = availablePlayers.filter(player => {
      if (excludePids.has(player.pid)) return false;
      
      // Check for team overlap
      const sharedTeams = Array.from(correctPlayer.teamsPlayed).some(tid => 
        player.teamsPlayed.has(tid)
      );
      
      // Check for era overlap (within 5 years)
      const correctEra = getPlayerEra(correctPlayer);
      const playerEra = getPlayerEra(player);
      const eraOverlap = Math.abs(correctEra - playerEra) <= 5;
      
      return sharedTeams || eraOverlap;
    });
    
    if (contextPlayers.length > 0) {
      const selected = rng.sample(contextPlayers, Math.min(2, maxDistractors - distractors.length));
      distractors.push(...selected);
      selected.forEach(p => excludePids.add(p.pid));
    }
  }

  // 3. Archetype look-alikes (same position, similar career length)
  if (distractors.length < maxDistractors) {
    const archetypePlayers = availablePlayers.filter(player => {
      if (excludePids.has(player.pid)) return false;
      
      // Same position
      const samePosition = player.pos === correctPlayer.pos;
      
      // Similar career length (within 3 seasons)
      const correctCareerLength = correctPlayer.seasons.length;
      const playerCareerLength = player.seasons.length;
      const similarCareer = Math.abs(correctCareerLength - playerCareerLength) <= 3;
      
      return samePosition || similarCareer;
    });
    
    if (archetypePlayers.length > 0) {
      const selected = rng.sample(archetypePlayers, Math.min(2, maxDistractors - distractors.length));
      distractors.push(...selected);
      selected.forEach(p => excludePids.add(p.pid));
    }
  }

  // 4. General pool (position, decade, conference matches)
  if (distractors.length < maxDistractors) {
    const generalPlayers = availablePlayers.filter(player => {
      if (excludePids.has(player.pid)) return false;
      
      // Check for any connection
      const samePosition = player.pos === correctPlayer.pos;
      const sameDecade = Math.floor(getPlayerEra(player) / 10) === Math.floor(getPlayerEra(correctPlayer) / 10);
      const hasAnyTeamOverlap = Array.from(correctPlayer.teamsPlayed).some(tid => 
        player.teamsPlayed.has(tid)
      );
      
      return samePosition || sameDecade || hasAnyTeamOverlap;
    });
    
    if (generalPlayers.length > 0) {
      const needed = maxDistractors - distractors.length;
      const selected = rng.sample(generalPlayers, needed);
      distractors.push(...selected);
    } else {
      // Fallback: completely random players if no good matches
      const remainingPlayers = availablePlayers.filter(p => !excludePids.has(p.pid));
      if (remainingPlayers.length > 0) {
        const needed = maxDistractors - distractors.length;
        const selected = rng.sample(remainingPlayers, needed);
        distractors.push(...selected);
      }
    }
  }

  return distractors;
}

/**
 * Evaluate if a player meets a constraint (team or achievement)
 */
function evaluateConstraint(player: Player, constraint: CatTeam, seasonIndex?: any): boolean {
  if (constraint.type === 'team') {
    return player.teamsPlayed.has(constraint.tid!);
  } else if (constraint.type === 'achievement') {
    return playerMeetsAchievement(player, constraint.achievementId!, seasonIndex);
  }
  return false;
}

/**
 * Get approximate era for a player (median season)
 */
function getPlayerEra(player: Player): number {
  if (player.seasons.length === 0) return 2000; // Default fallback
  
  const seasons = player.seasons.map(s => s.season).sort((a, b) => a - b);
  const middleIndex = Math.floor(seasons.length / 2);
  
  if (seasons.length % 2 === 0) {
    return (seasons[middleIndex - 1] + seasons[middleIndex]) / 2;
  } else {
    return seasons[middleIndex];
  }
}

/**
 * Estimate the size of potential distractor pool for reshuffle determination
 */
function estimateDistractorPool(
  rowConstraint: CatTeam,
  colConstraint: CatTeam,
  allPlayers: Player[],
  teams: Team[]
): number {
  // Rough estimation - count players that satisfy at least one constraint
  let count = 0;
  
  for (const player of allPlayers) {
    const meetsRow = evaluateConstraint(player, rowConstraint);
    const meetsCol = evaluateConstraint(player, colConstraint);
    
    if (meetsRow || meetsCol) {
      count++;
    }
  }
  
  return count;
}

/**
 * Reset incorrect marks for reshuffle
 */
export function resetIncorrectMarks(options: HintOption[]): HintOption[] {
  return options.map(option => ({
    ...option,
    isIncorrect: false
  }));
}

/**
 * Mark an option as incorrect
 */
export function markOptionIncorrect(options: HintOption[], playerPid: number): HintOption[] {
  return options.map(option => 
    option.player.pid === playerPid 
      ? { ...option, isIncorrect: true }
      : option
  );
}