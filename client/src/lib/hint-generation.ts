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
 * Check if a player has recorded relevant stats for a specific achievement
 * @param player - Player to check
 * @param achievementId - Achievement ID to check stats for
 * @returns true if player has relevant stats, false otherwise
 */
function hasRelevantStats(player: Player, achievementId: string): boolean {
  if (!player.stats || player.stats.length === 0) {
    return false;
  }

  // Check if player has any stats in the relevant category across all seasons
  for (const stat of player.stats) {
    if (stat.playoffs) continue; // Only check regular season stats

    // Basketball GM achievements
    if (achievementId.includes('Points') || achievementId.includes('30PPG') || achievementId.includes('2000Points') || 
        achievementId.includes('PointsLeader') || achievementId.includes('Scoring')) {
      if ((stat.pts || 0) > 0) return true;
    }

    if (achievementId.includes('Rebounds') || achievementId.includes('RPG') || achievementId.includes('ReboundsLeader') || 
        achievementId.includes('Reb')) {
      if ((stat.trb || 0) > 0) return true;
    }

    if (achievementId.includes('Assists') || achievementId.includes('APG') || achievementId.includes('AssistsLeader') || 
        achievementId.includes('Ast')) {
      if ((stat.ast || 0) > 0) return true;
    }

    if (achievementId.includes('Steals') || achievementId.includes('SPG') || achievementId.includes('StealsLeader') || 
        achievementId.includes('Stl')) {
      if ((stat.stl || 0) > 0) return true;
    }

    if (achievementId.includes('Blocks') || achievementId.includes('BPG') || achievementId.includes('BlocksLeader') || 
        achievementId.includes('Blk')) {
      if ((stat.blk || 0) > 0) return true;
    }

    if (achievementId.includes('3PM') || achievementId.includes('Threes') || achievementId.includes('3PT')) {
      if ((stat.tpm || stat.tp || 0) > 0) return true;
    }

    if (achievementId.includes('FGA') || achievementId.includes('FG') || achievementId.includes('eFG')) {
      if ((stat.fga || 0) > 0) return true;
    }

    if (achievementId.includes('FT') && achievementId.includes('FTA')) {
      if ((stat.fta || 0) > 0) return true;
    }

    if (achievementId.includes('Minutes') || achievementId.includes('MPG')) {
      if ((stat.min || 0) > 0) return true;
    }

    if (achievementId.includes('Games') || achievementId.includes('GP')) {
      if ((stat.gp || 0) > 0) return true;
    }

    // Football GM achievements
    const footballStat = stat as any; // Cast to access football-specific properties
    
    if (achievementId.includes('Pass') && (achievementId.includes('Yds') || achievementId.includes('TD'))) {
      if ((footballStat.pssYds || 0) > 0 || (footballStat.pssTD || 0) > 0) return true;
    }

    if (achievementId.includes('Rush') && (achievementId.includes('Yds') || achievementId.includes('TD'))) {
      if ((footballStat.rusYds || 0) > 0 || (footballStat.rusTD || 0) > 0) return true;
    }

    if (achievementId.includes('Rec') && (achievementId.includes('Yds') || achievementId.includes('TD') || achievementId.includes('Receptions'))) {
      if ((footballStat.recYds || 0) > 0 || (footballStat.recTD || 0) > 0 || (footballStat.rec || 0) > 0) return true;
    }

    if (achievementId.includes('Sacks')) {
      if ((footballStat.defSk || footballStat.sacks || 0) > 0) return true;
    }

    if (achievementId.includes('Tackles')) {
      if ((footballStat.defTck || footballStat.tackles || 0) > 0) return true;
    }

    if (achievementId.includes('Interceptions') || achievementId.includes('Ints')) {
      if ((footballStat.defInt || footballStat.ints || 0) > 0) return true;
    }

    if (achievementId.includes('Scrimmage') || achievementId.includes('AllPurpose')) {
      if ((footballStat.rusYds || 0) > 0 || (footballStat.recYds || 0) > 0) return true;
    }

    if (achievementId.includes('TFL')) {
      if ((footballStat.defTfl || footballStat.tfl || 0) > 0) return true;
    }

    // Hockey GM achievements
    const hockeyStat = stat as any; // Cast to access hockey-specific properties
    
    if (achievementId.includes('Goals')) {
      if ((hockeyStat.g || hockeyStat.goals || 0) > 0) return true;
    }

    if (achievementId.includes('Assists') && (achievementId.startsWith('HK') || achievementId.includes('Hockey'))) {
      if ((hockeyStat.a || hockeyStat.assists || 0) > 0) return true;
    }

    if (achievementId.includes('Points') && (achievementId.startsWith('HK') || achievementId.includes('Hockey'))) {
      if ((hockeyStat.pts || hockeyStat.points || 0) > 0) return true;
    }

    if (achievementId.includes('Saves')) {
      if ((hockeyStat.sv || hockeyStat.saves || 0) > 0) return true;
    }

    if (achievementId.includes('SavePct') || achievementId.includes('GAA') || achievementId.includes('Shutouts')) {
      if ((hockeyStat.sv || hockeyStat.saves || 0) > 0) return true; // Goalie stats
    }

    if (achievementId.includes('Shots')) {
      if ((hockeyStat.s || hockeyStat.shots || 0) > 0) return true;
    }

    if (achievementId.includes('Hits')) {
      if ((hockeyStat.hit || hockeyStat.hits || 0) > 0) return true;
    }

    if (achievementId.includes('Blocks') && (achievementId.startsWith('HK') || achievementId.includes('Hockey'))) {
      if ((hockeyStat.blk || hockeyStat.blocks || 0) > 0) return true;
    }

    if (achievementId.includes('Takeaways')) {
      if ((hockeyStat.tk || hockeyStat.takeaways || 0) > 0) return true;
    }

    if (achievementId.includes('PowerPlay')) {
      if ((hockeyStat.ppG || hockeyStat.ppA || 0) > 0) return true;
    }

    if (achievementId.includes('SHGoals')) {
      if ((hockeyStat.shG || hockeyStat.shGoals || 0) > 0) return true;
    }

    if (achievementId.includes('GWGoals')) {
      if ((hockeyStat.gwG || hockeyStat.gwGoals || 0) > 0) return true;
    }

    if (achievementId.includes('FaceoffPct')) {
      if ((hockeyStat.fow || hockeyStat.faceoffWins || 0) > 0) return true;
    }

    if (achievementId.includes('TOI')) {
      if ((hockeyStat.toi || hockeyStat.timeOnIce || 0) > 0) return true;
    }

    if (achievementId.includes('PIM')) {
      if ((hockeyStat.pim || hockeyStat.penaltyMinutes || 0) > 0) return true;
    }

    if (achievementId.includes('Starts')) {
      if ((hockeyStat.gs || hockeyStat.starts || 0) > 0) return true;
    }

    // Baseball GM achievements
    const baseballStat = stat as any; // Cast to access baseball-specific properties
    
    if (achievementId.includes('Hits')) {
      if ((baseballStat.h || baseballStat.hits || 0) > 0) return true;
    }

    if (achievementId.includes('HRs') || achievementId.includes('HomeRuns')) {
      if ((baseballStat.hr || baseballStat.homeRuns || 0) > 0) return true;
    }

    if (achievementId.includes('RBIs')) {
      if ((baseballStat.rbi || baseballStat.rbis || 0) > 0) return true;
    }

    if (achievementId.includes('SBs') || achievementId.includes('StolenBases')) {
      if ((baseballStat.sb || baseballStat.stolenBases || 0) > 0) return true;
    }

    if (achievementId.includes('Runs')) {
      if ((baseballStat.r || baseballStat.runs || 0) > 0) return true;
    }

    if (achievementId.includes('Wins') && (achievementId.startsWith('BB') || achievementId.includes('Baseball'))) {
      if ((baseballStat.w || baseballStat.wins || 0) > 0) return true; // Pitcher wins
    }

    if (achievementId.includes('Ks') || achievementId.includes('Strikeouts')) {
      if ((baseballStat.so || baseballStat.strikeouts || 0) > 0) return true;
    }

    if (achievementId.includes('Saves')) {
      if ((baseballStat.sv || baseballStat.saves || 0) > 0) return true;
    }

    if (achievementId.includes('ERA')) {
      if ((baseballStat.ip || baseballStat.inningsPitched || 0) > 0) return true; // Pitched innings
    }
  }

  // If no relevant stats found, return false
  return false;
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
        seasons: [],
        teamsPlayed: new Set([]),
        tid: -1,
        firstName: `Player`,
        lastName: `${i + 1}`,
        pos: 'G',
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

  // Sort by rarity (lowest rarity = most common)
  playersWithRarity.sort((a, b) => a.rarity - b.rarity);

  // Select correct answer from bottom 20% of rarity scores (most common players)
  let correctPlayerData: { player: Player; rarity: number };
  const rng = createSeededRandom(gridId, cellKey);
  
  if (playersWithRarity.length < 5) {
    // If fewer than 5 players, just pick the most common (lowest rarity)
    correctPlayerData = playersWithRarity[0];
  } else {
    // Pick from bottom 20% of rarity scores (most common)
    const bottom20PercentCount = Math.max(1, Math.ceil(playersWithRarity.length * 0.2));
    const mostCommonPlayers = playersWithRarity.slice(0, bottom20PercentCount);
    correctPlayerData = rng.pick(mostCommonPlayers)!;
  }
  
  const correctPlayer = correctPlayerData.player;

  // Generate exactly 5 PROMINENT distractors (players who meet only ONE constraint and are similar in career level)
  const distractors: Player[] = [];
  
  // Find players who meet ONLY the row constraint (not both)
  const rowOnlyPlayers = allPlayers.filter(player => {
    const meetsRow = evaluateConstraint(player, rowConstraint, leagueData?.seasonIndex);
    const meetsCol = evaluateConstraint(player, colConstraint, leagueData?.seasonIndex);
    const hasRowStats = rowConstraint.type === 'achievement' ? hasRelevantStats(player, rowConstraint.achievementId!) : true;
    return meetsRow && !meetsCol && hasRowStats &&
           !usedPids.has(player.pid) && 
           player.pid !== correctPlayer.pid;
  });
  
  // Find players who meet ONLY the column constraint (not both)
  const colOnlyPlayers = allPlayers.filter(player => {
    const meetsRow = evaluateConstraint(player, rowConstraint, leagueData?.seasonIndex);
    const meetsCol = evaluateConstraint(player, colConstraint, leagueData?.seasonIndex);
    const hasColStats = colConstraint.type === 'achievement' ? hasRelevantStats(player, colConstraint.achievementId!) : true;
    return meetsCol && !meetsRow && hasColStats &&
           !usedPids.has(player.pid) && 
           player.pid !== correctPlayer.pid;
  });
  
  // Calculate career prominence for the correct player (reference point)
  const correctPlayerProminence = calculatePlayerProminence(correctPlayer);
  
  // Filter and sort both pools by prominence and career similarity
  const getProminentSimilarPlayers = (players: Player[]) => {
    return players
      .map(player => ({
        player,
        prominence: calculatePlayerProminence(player),
        careerSimilarity: calculateCareerSimilarity(correctPlayerProminence, calculatePlayerProminence(player))
      }))
      .filter(item => item.prominence > 5) // Only prominent players (filter out scrubs)
      .sort((a, b) => b.careerSimilarity - a.careerSimilarity) // Most similar career level first
      .map(item => item.player);
  };
  
  const rowOnlyProminent = getProminentSimilarPlayers(rowOnlyPlayers);
  const colOnlyProminent = getProminentSimilarPlayers(colOnlyPlayers);
  
  // Try to get a good mix of both types of distractors
  const maxFromEach = Math.ceil(5 / 2);
  
  // Add prominent row-only players similar in career to correct answer
  if (rowOnlyProminent.length > 0) {
    const count = Math.min(maxFromEach, rowOnlyProminent.length);
    // Take from top similar prominent players with some variety
    const topSimilar = rowOnlyProminent.slice(0, Math.max(count * 2, 8));
    const rowSample = rng.sample(topSimilar, count);
    distractors.push(...rowSample);
  }
  
  // Add prominent column-only players to fill remaining slots
  const remainingSlots = 5 - distractors.length;
  if (remainingSlots > 0 && colOnlyProminent.length > 0) {
    const count = Math.min(remainingSlots, colOnlyProminent.length);
    // Take from top similar prominent players with some variety
    const topSimilar = colOnlyProminent.slice(0, Math.max(count * 2, 8));
    const colSample = rng.sample(topSimilar, count);
    distractors.push(...colSample);
  }
  
  // If we still need more players, use sophisticated fallback system
  const stillNeeded = 5 - distractors.length;
  if (stillNeeded > 0) {
    const usedPids = new Set(distractors.map(d => d.pid));
    const allSingleConstraint = [...rowOnlyProminent, ...colOnlyProminent].filter(
      p => !usedPids.has(p.pid)
    );
    
    if (allSingleConstraint.length >= stillNeeded) {
      // Take the most career-similar remaining players
      const remaining = allSingleConstraint
        .map(player => ({
          player,
          careerSimilarity: calculateCareerSimilarity(correctPlayerProminence, calculatePlayerProminence(player))
        }))
        .sort((a, b) => b.careerSimilarity - a.careerSimilarity)
        .slice(0, stillNeeded * 2) // Take top options for variety
        .map(item => item.player);
      
      distractors.push(...rng.sample(remaining, stillNeeded));
    } else {
      // Add all available single constraint players
      distractors.push(...allSingleConstraint);
      
      // ENHANCED FALLBACK: Find "near miss" players who are close to meeting both constraints
      const remainingNeeded = 5 - distractors.length;
      if (remainingNeeded > 0) {
        const nearMissPlayers = findNearMissPlayers(
          allPlayers,
          rowConstraint,
          colConstraint,
          usedPids,
          correctPlayer.pid,
          leagueData?.seasonIndex
        );
        
        const availableNearMiss = nearMissPlayers.filter(p => !usedPids.has(p.pid));
        
        if (availableNearMiss.length > 0) {
          const count = Math.min(remainingNeeded, availableNearMiss.length);
          distractors.push(...rng.sample(availableNearMiss, count));
        }
        
        // Only create dummy players as absolute last resort
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
 * Find "near miss" players who meet one constraint and are close on the other
 * Example: For "40%+ 3PT AND debuted in 2050s", find players who debuted in 2050s 
 * and had high 3PT% (like 38-39%) but didn't quite reach 40%
 */
function findNearMissPlayers(
  allPlayers: Player[],
  rowConstraint: CatTeam,
  colConstraint: CatTeam,
  usedPids: Set<number>,
  correctPid: number,
  seasonIndex?: any
): Player[] {
  const nearMissPlayers: Player[] = [];
  
  for (const player of allPlayers) {
    if (usedPids.has(player.pid) || player.pid === correctPid) continue;
    
    const meetsRow = evaluateConstraint(player, rowConstraint, seasonIndex);
    const meetsCol = evaluateConstraint(player, colConstraint, seasonIndex);
    
    // Skip players who already meet both or neither constraint
    if ((meetsRow && meetsCol) || (!meetsRow && !meetsCol)) continue;
    
    // Check if player is "close" to meeting the other constraint
    let isNearMiss = false;
    
    // If meets row but not column, check if close on column
    if (meetsRow && !meetsCol) {
      isNearMiss = isCloseToConstraint(player, colConstraint, seasonIndex);
    }
    
    // If meets column but not row, check if close on row
    if (meetsCol && !meetsRow) {
      isNearMiss = isCloseToConstraint(player, rowConstraint, seasonIndex);
    }
    
    if (isNearMiss) {
      nearMissPlayers.push(player);
    }
  }
  
  return nearMissPlayers;
}

/**
 * Check if a player is "close" to meeting a constraint
 * Returns true for players who are close but don't quite meet the threshold
 */
function isCloseToConstraint(player: Player, constraint: CatTeam, seasonIndex?: any): boolean {
  if (constraint.type !== 'achievement' || !constraint.achievementId) return false;
  
  const achievementId = constraint.achievementId;
  
  // For statistical achievements, check if player is close to the threshold
  if (achievementId.includes('3PT') && achievementId.includes('40')) {
    // For 40%+ 3PT achievements, find players with 35-39% 3PT
    return isClose3PTPercentage(player, 35, 39);
  }
  
  if (achievementId.includes('PPG') && achievementId.includes('30')) {
    // For 30+ PPG achievements, find players with 25-29.9 PPG
    return isCloseSeasonStat(player, 'pts', 25, 29.9, 'average');
  }
  
  if (achievementId.includes('RPG') && achievementId.includes('12')) {
    // For 12+ RPG achievements, find players with 10-11.9 RPG
    return isCloseSeasonStat(player, 'trb', 10, 11.9, 'average');
  }
  
  if (achievementId.includes('APG') && achievementId.includes('10')) {
    // For 10+ APG achievements, find players with 8-9.9 APG
    return isCloseSeasonStat(player, 'ast', 8, 9.9, 'average');
  }
  
  // For decade achievements (debuted/played/retired), check adjacent decades
  if (achievementId.includes('debutedIn') || achievementId.includes('playedIn') || achievementId.includes('retiredIn')) {
    return isCloseToDecade(player, achievementId);
  }
  
  // For career achievements, check if player is close to threshold
  if (achievementId.includes('career') && achievementId.includes('k')) {
    return isCloseToCareerThreshold(player, achievementId);
  }
  
  return false;
}

/**
 * Check if player has close 3PT percentage in any season
 */
function isClose3PTPercentage(player: Player, minPercent: number, maxPercent: number): boolean {
  if (!player.stats) return false;
  
  for (const stat of player.stats) {
    if (stat.playoffs) continue;
    
    const made = stat.tpm || stat.tp || 0;
    const attempted = stat.tpa || 0;
    
    if (attempted >= 100) { // Minimum attempts for meaningful percentage
      const percentage = (made / attempted) * 100;
      if (percentage >= minPercent && percentage <= maxPercent) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if player is close to a season statistical threshold
 */
function isCloseSeasonStat(
  player: Player, 
  statField: string, 
  minValue: number, 
  maxValue: number, 
  type: 'total' | 'average'
): boolean {
  if (!player.stats) return false;
  
  for (const stat of player.stats) {
    if (stat.playoffs) continue;
    
    const gamesPlayed = stat.gp || 0;
    if (gamesPlayed < 20) continue; // Minimum games for meaningful season
    
    const statValue = (stat as any)[statField] || 0;
    
    let checkValue = statValue;
    if (type === 'average' && gamesPlayed > 0) {
      checkValue = statValue / gamesPlayed;
    }
    
    if (checkValue >= minValue && checkValue <= maxValue) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if player is close to a decade achievement (adjacent decades)
 */
function isCloseToDecade(player: Player, achievementId: string): boolean {
  if (!player.stats || player.stats.length === 0) return false;
  
  // Extract target decade from achievement ID
  const decadeMatch = achievementId.match(/(\d{4})s/);
  if (!decadeMatch) return false;
  
  const targetDecade = parseInt(decadeMatch[1]);
  const adjacentDecades = [targetDecade - 10, targetDecade + 10];
  
  // Check if player has stats in adjacent decades
  for (const stat of player.stats) {
    if (stat.playoffs) continue;
    
    const season = stat.season;
    const playerDecade = Math.floor(season / 10) * 10;
    
    if (adjacentDecades.includes(playerDecade)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if player is close to a career threshold
 */
function isCloseToCareerThreshold(player: Player, achievementId: string): boolean {
  if (!player.stats) return false;
  
  // Extract number and stat from achievement ID (e.g., "career20kPoints" -> 20000 points)
  const match = achievementId.match(/career(\d+)k?(.+)/);
  if (!match) return false;
  
  const [, numberStr, statType] = match;
  const threshold = parseInt(numberStr) * (achievementId.includes('k') ? 1000 : 1);
  const closeThreshold = threshold * 0.8; // 80% of threshold is "close"
  
  // Calculate career total for the relevant stat
  let careerTotal = 0;
  
  for (const stat of player.stats) {
    if (stat.playoffs) continue;
    
    if (statType.includes('Points') || statType.includes('Pts')) {
      careerTotal += stat.pts || 0;
    } else if (statType.includes('Rebounds') || statType.includes('Reb')) {
      careerTotal += stat.trb || 0;
    } else if (statType.includes('Assists') || statType.includes('Ast')) {
      careerTotal += stat.ast || 0;
    }
    // Add more stat mappings as needed
  }
  
  return careerTotal >= closeThreshold && careerTotal < threshold;
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

/**
 * Calculate a player's overall skill level for similarity comparison
 */
function calculatePlayerSkillLevel(player: Player): number {
  // Calculate career totals from player stats
  let totalPts = 0, totalAst = 0, totalTrb = 0, totalGp = 0, totalMin = 0;
  
  for (const stat of player.stats || []) {
    if (stat.playoffs) continue;
    totalPts += stat.pts || 0;
    totalAst += stat.ast || 0;
    totalTrb += stat.trb || 0;
    totalGp += stat.gp || 0;
    totalMin += stat.min || 0;
  }
  
  // Weight different stats for overall skill assessment
  const pointsScore = Math.log10(1 + totalPts) * 2;
  const assistsScore = Math.log10(1 + totalAst) * 1.5;
  const reboundsScore = Math.log10(1 + totalTrb) * 1.5;
  const efficiencyScore = (totalMin > 0 ? totalPts / totalMin * 48 : 15) / 10; // Rough PER estimate
  const gamesScore = Math.log10(1 + totalGp) * 0.8;
  
  // Awards heavily impact skill perception
  const awards = player.awards || [];
  const mvpCount = awards.filter(a => a.type === 'Most Valuable Player').length;
  const allStarCount = awards.filter(a => a.type === 'All-Star').length;
  const hofBonus = awards.some(a => a.type === 'Inducted into the Hall of Fame') ? 5 : 0;
  
  const awardsScore = mvpCount * 4 + allStarCount * 0.5 + hofBonus;
  
  return pointsScore + assistsScore + reboundsScore + efficiencyScore + gamesScore + awardsScore;
}

/**
 * Calculate player prominence/career level for hint generation
 */
function calculatePlayerProminence(player: Player): number {
  // Calculate career totals from player stats
  let totalPts = 0, totalAst = 0, totalTrb = 0, totalGp = 0, totalMin = 0;
  
  for (const stat of player.stats || []) {
    if (stat.playoffs) continue;
    totalPts += stat.pts || 0;
    totalAst += stat.ast || 0;
    totalTrb += stat.trb || 0;
    totalGp += stat.gp || 0;
    totalMin += stat.min || 0;
  }
  
  // Base prominence from career totals (log scale)
  const statsScore = Math.log10(1 + totalPts) + Math.log10(1 + totalAst + totalTrb) + Math.log10(1 + totalGp);
  
  // Awards heavily boost prominence
  const awards = player.awards || [];
  const mvpCount = awards.filter(a => a.type === 'Most Valuable Player').length;
  const allStarCount = awards.filter(a => a.type === 'All-Star').length;
  const hofBonus = awards.some(a => a.type === 'Inducted into the Hall of Fame') ? 8 : 0;
  
  const awardsScore = mvpCount * 6 + allStarCount * 1 + hofBonus;
  
  return statsScore + awardsScore;
}

/**
 * Calculate similarity between two career levels (higher = more similar)
 */
function calculateCareerSimilarity(prominence1: number, prominence2: number): number {
  const diff = Math.abs(prominence1 - prominence2);
  // Exponential decay - players within ~3 prominence points are very similar
  return Math.exp(-diff / 4);
}