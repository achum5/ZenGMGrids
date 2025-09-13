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
    // Create 6 dummy players when no eligible players exist
    const dummyPlayers: Player[] = [];
    
    for (let i = 0; i < 6; i++) {
      const dummyPlayer: Player = {
        pid: -1000 - i,
        name: `Player ${i + 1}`,
        firstName: `Player`,
        lastName: `${i + 1}`,
        pos: 'G',
        hgt: 72,
        weight: 200,
        born: { year: 1999, loc: 'Unknown' },
        college: 'Unknown',
        draft: { round: 1, pick: i + 1, year: 2020 },
        face: undefined,
        imgURL: undefined,
        mood: undefined,
        injury: { type: 'Healthy', gamesRemaining: 0 },
        salaries: [],
        jerseyNumber: undefined,
        watch: false,
        relatives: [],
        srID: undefined,
        real: false,
        awards: [],
        freeAgent: false,
        yearsFreeAgent: 0,
        untradable: false,
        retiredYear: undefined,
        hof: false,
        statsTids: [],
        seasons: [],
        careerStats: {
          gp: 0, min: 0, fg: 0, fga: 0, fgp: 0,
          tp: 0, tpa: 0, tpp: 0, ft: 0, fta: 0, ftp: 0,
          orb: 0, drb: 0, trb: 0, ast: 0, tov: 0, stl: 0, blk: 0, pf: 0, pts: 0,
          per: 0, ewa: 0, ws: 0, vorp: 0
        },
        careerStatsPlayoffs: {
          gp: 0, min: 0, fg: 0, fga: 0, fgp: 0,
          tp: 0, tpa: 0, tpp: 0, ft: 0, fta: 0, ftp: 0,
          orb: 0, drb: 0, trb: 0, ast: 0, tov: 0, stl: 0, blk: 0, pf: 0, pts: 0,
          per: 0, ewa: 0, ws: 0, vorp: 0
        },
        teamsPlayed: new Set([]),
        achievements: {
          career20kPoints: false,
          career10kRebounds: false,
          career5kAssists: false,
          career2kSteals: false,
          career1500Blocks: false,
          career2kThrees: false,
          season30ppg: false,
          season10apg: false,
          season15rpg: false,
          season3bpg: false,
          season25spg: false,
          season504090: false,
          ledScoringAny: false,
          ledRebAny: false,
          ledAstAny: false,
          ledStlAny: false,
          ledBlkAny: false,
          played15PlusSeasons: false,
          isPick1Overall: false,
          isFirstRoundPick: false,
          isSecondRoundPick: false,
          isUndrafted: false,
          draftedTeen: false,
          bornOutsideUS50DC: false,
          allStar35Plus: false,
          oneTeamOnly: false,
          isHallOfFamer: false
        }
      };
      dummyPlayers.push(dummyPlayer);
    }
    
    // Mark first dummy as correct (randomly)
    const correctIndex = Math.floor(Math.random() * 6);
    const allOptions: HintOption[] = dummyPlayers.map((player, index) => ({
      player,
      isCorrect: index === correctIndex
    }));
    
    const rng = createSeededRandom(gridId, cellKey);
    const shuffledOptions = rng.shuffle(allOptions);
    
    const result: HintGenerationResult = {
      options: shuffledOptions,
      hasLimitedOptions: false
    };
    hintCache.set(cacheKey, result);
    return result;
  }

  // Sort eligible players by rarity using cell-aware logic
  const cellContext: CellContext = {
    rowConstraint: { type: rowConstraint.type, tid: rowConstraint.tid, achievementId: rowConstraint.achievementId, label: rowConstraint.label },
    colConstraint: { type: colConstraint.type, tid: colConstraint.tid, achievementId: colConstraint.achievementId, label: colConstraint.label },
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

  // Generate exactly 5 INCORRECT distractors (players who meet only ONE constraint)
  const distractors: Player[] = [];
  
  // Find players who meet ONLY the row constraint (not both)
  const rowOnlyPlayers = allPlayers.filter(player => {
    const meetsRow = evaluateConstraint(player, rowConstraint, leagueData?.seasonIndex);
    const meetsCol = evaluateConstraint(player, colConstraint, leagueData?.seasonIndex);
    return meetsRow && !meetsCol && 
           !usedPids.has(player.pid) && 
           player.pid !== correctPlayer.pid;
  });
  
  // Find players who meet ONLY the column constraint (not both)
  const colOnlyPlayers = allPlayers.filter(player => {
    const meetsRow = evaluateConstraint(player, rowConstraint, leagueData?.seasonIndex);
    const meetsCol = evaluateConstraint(player, colConstraint, leagueData?.seasonIndex);
    return meetsCol && !meetsRow && 
           !usedPids.has(player.pid) && 
           player.pid !== correctPlayer.pid;
  });
  
  // Try to get a good mix of both types of distractors
  const maxFromEach = Math.ceil(5 / 2);
  
  // Add row-only players
  if (rowOnlyPlayers.length > 0) {
    const rowSample = rng.sample(rowOnlyPlayers, Math.min(maxFromEach, rowOnlyPlayers.length));
    distractors.push(...rowSample);
  }
  
  // Add column-only players to fill remaining slots
  const remainingSlots = 5 - distractors.length;
  if (remainingSlots > 0 && colOnlyPlayers.length > 0) {
    const colSample = rng.sample(colOnlyPlayers, Math.min(remainingSlots, colOnlyPlayers.length));
    distractors.push(...colSample);
  }
  
  // If we still need more players, prioritize row-only then col-only
  const stillNeeded = 5 - distractors.length;
  if (stillNeeded > 0) {
    const allSingleConstraint = [...rowOnlyPlayers, ...colOnlyPlayers].filter(
      p => !distractors.some(d => d.pid === p.pid)
    );
    
    if (allSingleConstraint.length >= stillNeeded) {
      distractors.push(...rng.sample(allSingleConstraint, stillNeeded));
    } else {
      // Add all available single constraint players
      distractors.push(...allSingleConstraint);
      
      // Fill remaining with dummy players if absolutely necessary
      for (let i = distractors.length; i < 5; i++) {
        const dummyPlayer: Player = {
          ...correctPlayer,
          pid: -1000 - i, // Negative PIDs for dummy players
          name: `Player ${i + 1}`,
          imgURL: undefined,
          face: undefined
        };
        distractors.push(dummyPlayer);
      }
    }
  }

  // Combine options: 1 correct + 5 incorrect
  const allOptions: HintOption[] = [
    { player: correctPlayer, isCorrect: true },
    ...distractors.map(p => ({ player: p, isCorrect: false }))
  ];

  // Shuffle to randomize position of correct answer
  const shuffledOptions = rng.shuffle(allOptions);
  
  // Debug: Log the options to verify correctness
  console.log(`🎯 Hint options for ${cellKey}:`);
  shuffledOptions.forEach((option, i) => {
    const meetsRow = evaluateConstraint(option.player, rowConstraint, leagueData?.seasonIndex);
    const meetsCol = evaluateConstraint(option.player, colConstraint, leagueData?.seasonIndex);
    console.log(`  ${i + 1}. ${option.player.name} - Row: ${meetsRow}, Col: ${meetsCol}, Correct: ${option.isCorrect}`);
  });

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