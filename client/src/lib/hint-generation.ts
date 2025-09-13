/**
 * Hint generation logic for Basketball GM Immaculate Grid
 * Generates 6 players (1 correct + 5 distractors) for hint mode
 */

import type { Player, CatTeam, LeagueData, Team } from '@/types/bbgm';
import { createSeededRandom } from './seeded';
import { playerMeetsAchievement } from './achievements';
import { computeCellAwareRarity, type CellContext } from './cell-aware-rarity';

export interface HintOption {
  player: Player;
  isCorrect: boolean;
  isIncorrect?: boolean; // Marked when user picks incorrectly
}

export interface HintGenerationResult {
  options: HintOption[];
  hasLimitedOptions: boolean;
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
      hasLimitedOptions: true
    };
    hintCache.set(cacheKey, result);
    return result;
  }

  // Sort eligible players by rarity using cell-aware logic
  const cellContext: CellContext = {
    rowConstraint: { type: rowConstraint.type, tid: rowConstraint.tid, achievementId: rowConstraint.achievementId, name: rowConstraint.label },
    colConstraint: { type: colConstraint.type, tid: colConstraint.tid, achievementId: colConstraint.achievementId, name: colConstraint.label },
    teams: new Map(teams.map(t => [t.tid, t]))
  };

  // Calculate rarity for all eligible players and sort them
  const playersWithRarity = eligiblePlayers.map(player => {
    try {
      const rarityResult = computeCellAwareRarity({
        guessed: player,
        eligiblePool: eligiblePlayers,
        cellContext,
        puzzleSeed: gridId,
        seasonIndex: leagueData?.seasonIndex
      });
      return { player, rarity: rarityResult.finalRarity };
    } catch {
      // Fallback for any calculation errors
      return { player, rarity: 50 };
    }
  });

  // Sort by rarity (highest rarity = hardest = what we want)
  playersWithRarity.sort((a, b) => b.rarity - a.rarity);

  // Select correct answer from top 20% hardest players
  const top20PercentCount = Math.max(1, Math.ceil(playersWithRarity.length * 0.2));
  const hardestPlayers = playersWithRarity.slice(0, top20PercentCount);
  const rng = createSeededRandom(gridId, cellKey);
  const correctPlayerData = rng.pick(hardestPlayers)!;
  const correctPlayer = correctPlayerData.player;

  // Generate 5 very similar players (all from the top 40% hardest)
  const top40PercentCount = Math.max(6, Math.ceil(playersWithRarity.length * 0.4));
  const similarHardPlayers = playersWithRarity.slice(0, top40PercentCount)
    .map(p => p.player)
    .filter(p => p.pid !== correctPlayer.pid);
  
  const distractors = rng.sample(similarHardPlayers, 5);

  // Combine and shuffle options
  const allOptions: HintOption[] = [
    { player: correctPlayer, isCorrect: true },
    ...distractors.map(p => ({ player: p, isCorrect: false }))
  ];

  // Shuffle to randomize position of correct answer
  const shuffledOptions = rng.shuffle(allOptions);

  const result: HintGenerationResult = {
    options: shuffledOptions,
    hasLimitedOptions: shuffledOptions.length < 6
  };

  hintCache.set(cacheKey, result);
  return result;
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