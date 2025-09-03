import type { Player, Team } from '@/types/bbgm';
import type { GridConstraint } from '@/lib/feedback';

// ===== TYPES AND INTERFACES =====

export interface CellContext {
  rowConstraint: GridConstraint;
  colConstraint: GridConstraint;
  teams: Map<number, Team>;
}

export interface PlayerCache {
  // Per-team career aggregates
  teamStats: Map<number, {
    gp: number;
    min: number;
    ws: number;
    pts: number;
    trb: number;
    ast: number;
    stl: number;
    blk: number;
    tpm: number;
  }>;
  
  // Per-season totals
  seasonStats: Map<number, {
    gp: number;
    min: number;
    pts: number;
    trb: number;
    ast: number;
    stl: number;
    blk: number;
    fg: number;
    fga: number;
    tpm: number;
    tpa: number;
    ft: number;
    fta: number;
    ppg: number;
    rpg: number;
    apg: number;
    spg: number;
    bpg: number;
    fgPercent: number;
    tpPercent: number;
    ftPercent: number;
    // Team minutes breakdown for that season
    teamMinutes: Map<number, number>;
  }>;
  
  // Career totals
  career: {
    gp: number;
    min: number;
    pts: number;
    trb: number;
    ast: number;
    stl: number;
    blk: number;
    tpm: number;
    distinctTeams: number;
    seasonsPlayed: number;
  };
  
  // Global popularity score
  globalPopularity: number;
}

export interface CellPopularityComponents {
  teamAffinity: number;      // 0..1
  categoryFit: number;       // 0..1  
  globalPopularity: number;  // 0..1
}

export interface CellRarityResult {
  finalRarity: number;       // 10..100
  baseRarity: number;        // 10..100
  smallPoolBonus: number;    // 0..22
  components: CellPopularityComponents;
  cellPopularity: number;    // Combined weighted score
}

// ===== WEIGHTS CONFIGURATION =====

const CELL_WEIGHTS = {
  teamCareer: { wT: 0.45, wC: 0.37, wG: 0.18 },      // Team × Category (career)
  teamSeason: { wT: 0.45, wC: 0.37, wG: 0.18 },      // Team × Category (season-aligned)
  categoryOnly: { wT: 0.00, wC: 0.78, wG: 0.22 },    // Category-only (no team)
  teamTeam: { wT: 0.84, wC: 0.00, wG: 0.16 },        // Team × Team
  teamDraftHof: { wT: 0.62, wC: 0.16, wG: 0.22 },    // Team × Draft/HOF/15+ seasons
  categoryCategory: { wT: 0.00, wC: 0.82, wG: 0.18 } // Category × Category
};

// Season-aligned achievements
const SEASON_ALIGNED = new Set([
  'season30ppg', 'season10apg', 'season15rpg', 'season3bpg', 'season25spg', 'season504090',
  'ledScoringAny', 'ledRebAny', 'ledAstAny', 'ledStlAny', 'ledBlkAny',
  'mvpWinner', 'dpoyWinner', 'royWinner', 'smoyWinner', 'mipWinner', 'fmvpWinner',
  'allNba1st', 'allNba2nd', 'allNba3rd', 'allDef1st', 'allDef2nd', 'allDef3rd',
  'allStar', 'champion', 'allStar35Plus'
]);

// Draft/Special achievements (no season alignment)
const DRAFT_HOF_SPECIAL = new Set([
  'isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 
  'draftedTeen', 'bornOutsideUS50DC',
  'isHallOfFamer', 'played15PlusSeasons'
]);

// ===== CACHING SYSTEM =====

const playerCacheMap = new Map<number, PlayerCache>();

export function buildPlayerCache(player: Player): PlayerCache {
  if (playerCacheMap.has(player.pid)) {
    return playerCacheMap.get(player.pid)!;
  }

  const cache: PlayerCache = {
    teamStats: new Map(),
    seasonStats: new Map(),
    career: {
      gp: 0, min: 0, pts: 0, trb: 0, ast: 0, stl: 0, blk: 0, tpm: 0,
      distinctTeams: 0, seasonsPlayed: 0
    },
    globalPopularity: 0
  };

  // Build per-team aggregates
  for (const stat of player.stats ?? []) {
    if (stat.playoffs) continue; // Use regular season only
    
    if (!cache.teamStats.has(stat.tid)) {
      cache.teamStats.set(stat.tid, {
        gp: 0, min: 0, ws: 0, pts: 0, trb: 0, ast: 0, stl: 0, blk: 0, tpm: 0
      });
    }
    
    const teamStat = cache.teamStats.get(stat.tid)!;
    teamStat.gp += stat.gp ?? 0;
    teamStat.min += stat.min ?? 0;
    teamStat.ws += stat.ws ?? 0;
    teamStat.pts += stat.pts ?? 0;
    // Handle different rebound field names
    let rebounds = 0;
    if (stat.trb !== undefined) {
      rebounds = stat.trb;
    } else if (stat.orb !== undefined || stat.drb !== undefined) {
      rebounds = (stat.orb || 0) + (stat.drb || 0);
    } else if (stat.reb !== undefined) {
      rebounds = stat.reb;
    }
    teamStat.trb += rebounds;
    teamStat.ast += stat.ast ?? 0;
    teamStat.stl += stat.stl ?? 0;
    teamStat.blk += stat.blk ?? 0;
    teamStat.tpm += (stat.tpm ?? stat.tp ?? 0);
  }

  // Build per-season merged stats
  const seasonGroups = new Map<number, Array<NonNullable<typeof player.stats>[number]>>();
  for (const stat of player.stats ?? []) {
    if (stat.playoffs) continue;
    
    if (!seasonGroups.has(stat.season)) {
      seasonGroups.set(stat.season, []);
    }
    seasonGroups.get(stat.season)!.push(stat);
  }

  for (const [season, stats] of Array.from(seasonGroups.entries())) {
    const merged = {
      gp: 0, min: 0, pts: 0, trb: 0, ast: 0, stl: 0, blk: 0,
      fg: 0, fga: 0, tpm: 0, tpa: 0, ft: 0, fta: 0,
      ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0,
      fgPercent: 0, tpPercent: 0, ftPercent: 0,
      teamMinutes: new Map<number, number>()
    };

    for (const stat of stats) {
      merged.gp += stat.gp ?? 0;
      merged.min += stat.min ?? 0;
      merged.pts += stat.pts ?? 0;
      // Handle different rebound field names
      let rebounds = 0;
      if (stat.trb !== undefined) {
        rebounds = stat.trb;
      } else if (stat.orb !== undefined || stat.drb !== undefined) {
        rebounds = (stat.orb || 0) + (stat.drb || 0);
      } else if (stat.reb !== undefined) {
        rebounds = stat.reb;
      }
      merged.trb += rebounds;
      merged.ast += stat.ast ?? 0;
      merged.stl += stat.stl ?? 0;
      merged.blk += stat.blk ?? 0;
      merged.fg += stat.fg ?? 0;
      merged.fga += stat.fga ?? 0;
      // Handle different three-pointer field names consistently
      const threes = stat.tpm || stat.tp || stat.fg3 || 0;
      merged.tpm += threes;
      merged.tpa += stat.tpa ?? 0;
      merged.ft += stat.ft ?? 0;
      merged.fta += stat.fta ?? 0;

      // Track minutes by team for overlap calculations
      const teamMin = stat.min ?? 0;
      merged.teamMinutes.set(stat.tid, (merged.teamMinutes.get(stat.tid) ?? 0) + teamMin);
    }

    // Calculate per-game and percentage stats
    if (merged.gp > 0) {
      merged.ppg = merged.pts / merged.gp;
      merged.rpg = merged.trb / merged.gp;
      merged.apg = merged.ast / merged.gp;
      merged.spg = merged.stl / merged.gp;
      merged.bpg = merged.blk / merged.gp;
    }
    
    merged.fgPercent = merged.fga > 0 ? merged.fg / merged.fga : 0;
    merged.tpPercent = merged.tpa > 0 ? merged.tpm / merged.tpa : 0;
    merged.ftPercent = merged.fta > 0 ? merged.ft / merged.fta : 0;

    cache.seasonStats.set(season, merged);
  }

  // Build career totals
  for (const teamStat of Array.from(cache.teamStats.values())) {
    cache.career.gp += teamStat.gp;
    cache.career.min += teamStat.min;
    cache.career.pts += teamStat.pts;
    cache.career.trb += teamStat.trb;
    cache.career.ast += teamStat.ast;
    cache.career.stl += teamStat.stl;
    cache.career.blk += teamStat.blk;
    cache.career.tpm += teamStat.tpm;
  }
  
  cache.career.distinctTeams = cache.teamStats.size;
  cache.career.seasonsPlayed = cache.seasonStats.size;

  // Calculate global popularity
  cache.globalPopularity = calculateGlobalPopularity(player);

  playerCacheMap.set(player.pid, cache);
  return cache;
}

// ===== UTILITY FUNCTIONS =====

function calculateGlobalPopularity(player: Player): number {
  let awardsScore = 0;
  
  for (const award of player.awards ?? []) {
    switch (award.type) {
      case "Inducted into the Hall of Fame": awardsScore += 6; break;
      case "Most Valuable Player": awardsScore += 4; break;
      case "Finals MVP": awardsScore += 3; break;
      case "First Team All-League":
      case "Second Team All-League":
      case "Third Team All-League": awardsScore += 2; break;
      case "All-Star": awardsScore += 1; break;
    }
  }

  let totalGp = 0, totalMin = 0, totalPts = 0;
  for (const stat of player.stats ?? []) {
    if (stat.playoffs) continue;
    totalGp += stat.gp ?? 0;
    totalMin += stat.min ?? 0;
    totalPts += stat.pts ?? 0;
  }

  const volumeScore = Math.log10(1 + totalMin + totalPts / 5 + totalGp * 2);
  return awardsScore * 5 + volumeScore;
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getPoolDifficultyFactor(poolSize: number): number {
  if (poolSize <= 3) return 0.60;
  if (poolSize <= 5) return 0.50;
  if (poolSize <= 10) return 0.35;
  if (poolSize <= 20) return 0.25;
  if (poolSize <= 50) return 0.15;
  if (poolSize <= 100) return 0.08;
  return 0.05;
}

function normalizeToRange(values: number[]): number[] {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  
  if (range === 0) return values.map(() => 0);
  return values.map(v => (v - min) / range);
}

// ===== TEAM AFFINITY CALCULATION =====

export function calculateTeamAffinity(
  player: Player, 
  cache: PlayerCache,
  cellContext: CellContext
): number {
  const { rowConstraint, colConstraint } = cellContext;
  
  // No team in cell
  if (rowConstraint.type !== 'team' && colConstraint.type !== 'team') {
    return 0;
  }
  
  // Team × Team case
  if (rowConstraint.type === 'team' && colConstraint.type === 'team') {
    const team1Affinity = calculateSingleTeamAffinity(cache, rowConstraint.tid!);
    const team2Affinity = calculateSingleTeamAffinity(cache, colConstraint.tid!);
    // Geometric mean penalizes cameos on either side
    return Math.sqrt(team1Affinity * team2Affinity);
  }
  
  // Single team case
  const teamTid = rowConstraint.type === 'team' ? rowConstraint.tid! : colConstraint.tid!;
  const achievementId = rowConstraint.type === 'achievement' ? 
    rowConstraint.achievementId! : colConstraint.achievementId!;
  
  // For season-aligned categories, use season-specific team affinity
  if (SEASON_ALIGNED.has(achievementId)) {
    return calculateSeasonTeamAffinity(player, cache, teamTid, achievementId);
  }
  
  // For career categories, use career team affinity
  return calculateSingleTeamAffinity(cache, teamTid);
}

function calculateSingleTeamAffinity(cache: PlayerCache, teamTid: number): number {
  const teamStat = cache.teamStats.get(teamTid);
  if (!teamStat) return 0;
  
  // Base: log(1 + minutes + 2*games) + 10*WS
  return Math.log(1 + teamStat.min + 2 * teamStat.gp) + 10 * teamStat.ws;
}

function calculateSeasonTeamAffinity(
  player: Player, 
  cache: PlayerCache, 
  teamTid: number, 
  achievementId: string
): number {
  const qualifyingSeasons = getQualifyingSeasonsForAchievement(player, achievementId);
  let bestAffinity = 0;
  let debugInfo: any[] = [];
  
  for (const season of qualifyingSeasons) {
    const seasonStat = cache.seasonStats.get(season);
    if (!seasonStat) continue;
    
    const teamMinutes = seasonStat.teamMinutes.get(teamTid) ?? 0;
    if (teamMinutes === 0) continue;
    
    // Estimate games from minutes ratio (approximate)
    const totalMinutes = seasonStat.min;
    const minutesRatio = totalMinutes > 0 ? teamMinutes / totalMinutes : 0;
    const teamGames = Math.round(seasonStat.gp * minutesRatio);
    
    const affinity = Math.log(1 + teamMinutes + 2 * teamGames);
    debugInfo.push({
      season,
      teamMinutes,
      teamGames,
      affinity: affinity.toFixed(3)
    });
    
    if (affinity > bestAffinity) {
      bestAffinity = affinity;
    }
  }
  
  // Debug log for season-specific team affinity
  if (debugInfo.length > 0) {
    console.log(`${player.name} - Season Team Affinity (tid=${teamTid}, achievement=${achievementId}):`);
    console.log(`  Qualifying seasons: ${qualifyingSeasons.join(', ')}`);
    console.log(`  Details:`, debugInfo);
    console.log(`  Best affinity: ${bestAffinity.toFixed(3)}`);
  }
  
  return bestAffinity;
}

// ===== CATEGORY FIT CALCULATION =====

export function calculateCategoryFit(
  player: Player,
  cache: PlayerCache,
  cellContext: CellContext
): number {
  const { rowConstraint, colConstraint } = cellContext;
  
  // Category × Category case
  if (rowConstraint.type === 'achievement' && colConstraint.type === 'achievement') {
    const strength1 = calculateCategoryStrength(player, cache, rowConstraint.achievementId!);
    const strength2 = calculateCategoryStrength(player, cache, colConstraint.achievementId!);
    // Geometric mean - being weak in either reduces commonness
    return Math.sqrt(strength1 * strength2);
  }
  
  // Single category case
  const achievementId = rowConstraint.type === 'achievement' ? 
    rowConstraint.achievementId! : colConstraint.achievementId!;
  const teamTid = rowConstraint.type === 'team' ? 
    rowConstraint.tid : colConstraint.tid;
  
  let baseStrength = calculateCategoryStrength(player, cache, achievementId);
  
  // Apply team overlap if team is present
  if (teamTid !== undefined) {
    const overlap = calculateTeamOverlap(player, cache, teamTid, achievementId);
    // Softening exponent to avoid annihilating short but legit stints
    baseStrength *= Math.pow(overlap, 0.5);
  }
  
  return baseStrength;
}

function calculateCategoryStrength(player: Player, cache: PlayerCache, achievementId: string): number {
  // Career milestones
  if (achievementId === 'career20kPoints') {
    return Math.max(0, cache.career.pts - 20000) / 10000;
  }
  if (achievementId === 'career10kRebounds') {
    return Math.max(0, cache.career.trb - 10000) / 5000;
  }
  if (achievementId === 'career5kAssists') {
    return Math.max(0, cache.career.ast - 5000) / 2500;
  }
  if (achievementId === 'career2kSteals') {
    return Math.max(0, cache.career.stl - 2000) / 1000;
  }
  if (achievementId === 'career1500Blocks') {
    return Math.max(0, cache.career.blk - 1500) / 750;
  }
  if (achievementId === 'career2kThrees') {
    return Math.max(0, cache.career.tpm - 2000) / 1000;
  }
  if (achievementId === 'played15PlusSeasons') {
    return Math.max(0, cache.career.seasonsPlayed - 15) / 5;
  }
  if (achievementId === 'oneTeamOnly') {
    if (cache.career.distinctTeams !== 1) return 0;
    return cache.career.seasonsPlayed / 20; // Longer tenure = more on-brand
  }
  
  // Single-season achievements
  if (achievementId === 'season30ppg') {
    return getBestSeasonValue(cache, 'ppg', 30) / 10; // Normalize
  }
  if (achievementId === 'season10apg') {
    return getBestSeasonValue(cache, 'apg', 10) / 5;
  }
  if (achievementId === 'season15rpg') {
    return getBestSeasonValue(cache, 'rpg', 15) / 5;
  }
  if (achievementId === 'season3bpg') {
    return getBestSeasonValue(cache, 'bpg', 3) / 2;
  }
  if (achievementId === 'season25spg') {
    return getBestSeasonValue(cache, 'spg', 2.5) / 2;
  }
  if (achievementId === 'season504090') {
    return calculate504090Strength(cache);
  }
  
  // League leadership - use best season performance
  if (achievementId === 'ledScoringAny') {
    return getBestSeasonValue(cache, 'ppg', 0); // No threshold, just best PPG
  }
  if (achievementId === 'ledRebAny') {
    return getBestSeasonValue(cache, 'rpg', 0); // No threshold, just best RPG
  }
  if (achievementId === 'ledAstAny') {
    const bestAPG = getBestSeasonValue(cache, 'apg', 0); // Get best assists per game
    console.log(`${player.name} - ledAstAny strength: ${bestAPG.toFixed(3)} (best season APG)`);
    return bestAPG;
  }
  if (achievementId === 'ledStlAny') {
    return getBestSeasonValue(cache, 'spg', 0); // No threshold, just best SPG
  }
  if (achievementId === 'ledBlkAny') {
    return getBestSeasonValue(cache, 'bpg', 0); // No threshold, just best BPG
  }
  
  // Awards (simplified - would need full award mapping)
  if (achievementId === 'mvpWinner') {
    return getAwardCount(player, 'Most Valuable Player');
  }
  if (achievementId === 'isHallOfFamer') {
    return getAwardCount(player, 'Inducted into the Hall of Fame') > 0 ? 1 : 0;
  }
  if (achievementId === 'allStar') {
    return getAwardCount(player, 'All-Star') / 10; // Normalize
  }
  
  // Draft achievements
  if (achievementId === 'isPick1Overall') {
    return (player.draft?.round === 1 && player.draft?.pick === 1) ? 1 : 0;
  }
  if (achievementId === 'isUndrafted') {
    return (!player.draft?.round) ? 0.65 : 0;
  }
  
  return 0; // Default fallback
}

function getBestSeasonValue(cache: PlayerCache, stat: string, threshold: number): number {
  let best = 0;
  for (const seasonStat of Array.from(cache.seasonStats.values())) {
    const value = seasonStat[stat as keyof typeof seasonStat] as number;
    if (threshold === 0) {
      // For leadership achievements, just find the best raw value
      best = Math.max(best, value);
    } else if (value >= threshold) {
      // For threshold achievements, find excess over threshold
      best = Math.max(best, value - threshold);
    }
  }
  return best;
}

function calculate504090Strength(cache: PlayerCache): number {
  let bestStrength = 0;
  
  for (const seasonStat of Array.from(cache.seasonStats.values())) {
    // Minimum attempt thresholds
    if (seasonStat.fga < 300 || seasonStat.tpa < 82 || seasonStat.fta < 125) continue;
    
    const fgMargin = Math.max(0, seasonStat.fgPercent - 0.50);
    const tpMargin = Math.max(0, seasonStat.tpPercent - 0.40);
    const ftMargin = Math.max(0, seasonStat.ftPercent - 0.90);
    
    const strength = fgMargin + tpMargin + ftMargin;
    bestStrength = Math.max(bestStrength, strength);
  }
  
  return bestStrength * 10; // Scale up
}

function getLeadershipStrength(player: Player, category: string): number {
  // This would require season leadership data - simplified for now
  const hasLeadership = player.achievements?.[`led${category.charAt(0).toUpperCase() + category.slice(1)}Any` as keyof typeof player.achievements];
  return hasLeadership ? 1 : 0;
}

function getAwardCount(player: Player, awardType: string): number {
  return (player.awards ?? []).filter(a => a.type === awardType).length;
}

function calculateTeamOverlap(
  player: Player, 
  cache: PlayerCache, 
  teamTid: number, 
  achievementId: string
): number {
  if (SEASON_ALIGNED.has(achievementId)) {
    // For season-aligned: minutes share with team in qualifying season
    const qualifyingSeasons = getQualifyingSeasonsForAchievement(player, achievementId);
    let bestOverlap = 0;
    
    for (const season of qualifyingSeasons) {
      const seasonStat = cache.seasonStats.get(season);
      if (!seasonStat) continue;
      
      const totalMinutes = seasonStat.min;
      const teamMinutes = seasonStat.teamMinutes.get(teamTid) ?? 0;
      
      if (totalMinutes > 0) {
        bestOverlap = Math.max(bestOverlap, teamMinutes / totalMinutes);
      }
    }
    
    return bestOverlap;
  } else {
    // For career categories: fraction of career stat with team
    const teamStat = cache.teamStats.get(teamTid);
    if (!teamStat) return 0;
    
    const statName = getStatForAchievement(achievementId);
    const careerTotal = cache.career[statName as keyof typeof cache.career] as number;
    const teamTotal = teamStat[statName as keyof typeof teamStat] as number;
    
    return careerTotal > 0 ? teamTotal / careerTotal : 0;
  }
}

// ===== HELPER FUNCTIONS =====

function getQualifyingSeasonsForAchievement(player: Player, achievementId: string): number[] {
  const seasons: number[] = [];
  
  // For leadership achievements, we need to check player.achievements which should have 
  // season-specific data, but for now return all active seasons
  // TODO: This needs proper season-by-season leadership data
  
  if (achievementId.startsWith('led')) {
    // Leadership achievements - would need actual season leadership data
    // For now, return all seasons where player had significant stats
    for (const stat of player.stats ?? []) {
      if (!stat.playoffs && (stat.gp ?? 0) >= 20) { // Played significant games
        if (!seasons.includes(stat.season)) {
          seasons.push(stat.season);
        }
      }
    }
  } else if (achievementId.startsWith('season')) {
    // Single season achievements - check each season individually
    for (const stat of player.stats ?? []) {
      if (!stat.playoffs && (stat.gp ?? 0) >= 50) { // Full season threshold
        const season = stat.season;
        
        // Check if this season qualifies for the specific achievement
        if (achievementId === 'season10apg' && (stat.ast ?? 0) / (stat.gp ?? 1) >= 10.0) {
          if (!seasons.includes(season)) {
            seasons.push(season);
          }
        }
        // Add other season achievements as needed
      }
    }
  } else {
    // Career achievements or others - return all active seasons
    for (const stat of player.stats ?? []) {
      if (!stat.playoffs && !seasons.includes(stat.season)) {
        seasons.push(stat.season);
      }
    }
  }
  
  return seasons.sort((a, b) => a - b);
}

function getStatForAchievement(achievementId: string): string {
  const mapping: Record<string, string> = {
    'career20kPoints': 'pts',
    'career10kRebounds': 'trb',
    'career5kAssists': 'ast',
    'career2kSteals': 'stl',
    'career1500Blocks': 'blk',
    'career2kThrees': 'tpm'
  };
  return mapping[achievementId] || 'pts';
}

function getCellWeights(cellContext: CellContext) {
  const { rowConstraint, colConstraint } = cellContext;
  
  if (rowConstraint.type === 'team' && colConstraint.type === 'team') {
    return CELL_WEIGHTS.teamTeam;
  }
  
  if (rowConstraint.type === 'achievement' && colConstraint.type === 'achievement') {
    return CELL_WEIGHTS.categoryCategory;
  }
  
  // Team × Achievement cases
  const achievementId = rowConstraint.type === 'achievement' ? 
    rowConstraint.achievementId! : colConstraint.achievementId!;
    
  if (DRAFT_HOF_SPECIAL.has(achievementId)) {
    return CELL_WEIGHTS.teamDraftHof;
  }
  
  if (SEASON_ALIGNED.has(achievementId)) {
    return CELL_WEIGHTS.teamSeason;
  }
  
  return CELL_WEIGHTS.teamCareer;
}

// ===== MAIN CELL-AWARE RARITY FUNCTION =====

export function computeCellAwareRarity(opts: {
  guessed: Player;
  eligiblePool: Player[];
  cellContext: CellContext;
  puzzleSeed: string;
}): CellRarityResult {
  const { guessed, eligiblePool, cellContext, puzzleSeed } = opts;
  const N = eligiblePool.length;
  
  if (N <= 0) {
    throw new Error("Empty eligible pool");
  }
  
  // Build caches for all players
  const playersWithCaches = eligiblePool.map(player => ({
    player,
    cache: buildPlayerCache(player)
  }));
  
  // Calculate components for all players
  const playersWithComponents = playersWithCaches.map(({ player, cache }) => {
    const teamAffinity = calculateTeamAffinity(player, cache, cellContext);
    const categoryFit = calculateCategoryFit(player, cache, cellContext);
    const globalPopularity = cache.globalPopularity;
    
    return {
      player,
      cache,
      components: { teamAffinity, categoryFit, globalPopularity }
    };
  });
  
  // Normalize components to 0..1 within pool
  const teamAffinities = playersWithComponents.map(p => p.components.teamAffinity);
  const categoryFits = playersWithComponents.map(p => p.components.categoryFit);
  const globalPopularities = playersWithComponents.map(p => p.components.globalPopularity);
  
  const normalizedTeamAffinities = normalizeToRange(teamAffinities);
  const normalizedCategoryFits = normalizeToRange(categoryFits);
  const normalizedGlobalPopularities = normalizeToRange(globalPopularities);
  
  // Calculate Cell Popularity with weights
  const weights = getCellWeights(cellContext);
  const seed = hash(puzzleSeed);
  
  const playersWithPopularity = playersWithComponents.map(({ player, cache, components }, index) => {
    const normalizedComponents = {
      teamAffinity: normalizedTeamAffinities[index],
      categoryFit: normalizedCategoryFits[index],
      globalPopularity: normalizedGlobalPopularities[index]
    };
    
    const cellPopularity = 
      weights.wT * normalizedComponents.teamAffinity +
      weights.wC * normalizedComponents.categoryFit +
      weights.wG * normalizedComponents.globalPopularity;
      
    const tieBreaker = (hash(String(player.pid)) ^ seed) >>> 0;
    
    return {
      player,
      components: normalizedComponents,
      cellPopularity,
      tieBreaker
    };
  });
  
  // Sort by Cell Popularity (highest = most common first)
  playersWithPopularity.sort((a, b) => 
    (b.cellPopularity - a.cellPopularity) || (a.tieBreaker - b.tieBreaker)
  );
  
  // DEBUG: Log all player details
  console.log("=== CELL-AWARE RARITY DEBUG ===");
  console.log("Cell Context:", {
    row: cellContext.rowConstraint.label,
    col: cellContext.colConstraint.label,
    weights: weights
  });
  console.log("Raw components (before normalization):");
  playersWithComponents.forEach(({ player, components }, i) => {
    console.log(`${player.name}: T_raw=${components.teamAffinity.toFixed(3)}, C_raw=${components.categoryFit.toFixed(3)}, G_raw=${components.globalPopularity.toFixed(3)}`);
  });
  console.log("Normalized components and rankings:");
  playersWithPopularity.forEach((playerData, rank) => {
    const { player, components, cellPopularity } = playerData;
    // Since we sort most common first (rank 0), we need to invert for rarity calculation
    // rank 0 (most common) should get commonness = 1, rank N-1 (rarest) should get commonness = 0
    const commonness = N === 1 ? 1 : 1 - (rank / (N - 1));
    const baseRarity = 10 + (1 - commonness) * 90;
    const difficultyFactor = getPoolDifficultyFactor(N);
    const obviousness = 1 - commonness; // obviousness should be high for common answers
    const smallPoolBonus = 22 * difficultyFactor * Math.pow(1 - obviousness, 0.7);
    const finalRarity = Math.min(100, Math.max(10, baseRarity + smallPoolBonus));
    
    console.log(`${rank + 1}. ${player.name}:`);
    console.log(`   T=${components.teamAffinity.toFixed(3)}, C=${components.categoryFit.toFixed(3)}, G=${components.globalPopularity.toFixed(3)}`);
    console.log(`   P_cell=${cellPopularity.toFixed(4)}, rank=${rank + 1}/${N}`);
    console.log(`   commonness=${commonness.toFixed(3)}, obviousness=${obviousness.toFixed(3)}`);
    console.log(`   R_base=${baseRarity.toFixed(1)}, Δ_pool=${smallPoolBonus.toFixed(1)}, R_final=${finalRarity.toFixed(1)}`);
  });
  console.log("================================");
  
  // Find guessed player's rank
  const guessedIndex = playersWithPopularity.findIndex(p => p.player.pid === guessed.pid);
  if (guessedIndex === -1) {
    throw new Error("Guessed player not found in eligible pool");
  }
  
  // Calculate base rarity
  // Since we sort most common first (guessedIndex 0), we need to invert for rarity calculation
  const commonness = N === 1 ? 1 : 1 - (guessedIndex / (N - 1)); // 1..0 (1 = most common, 0 = rarest)
  const baseRarity = 10 + (1 - commonness) * 90;
  
  // Calculate Small-Pool Bonus
  const difficultyFactor = getPoolDifficultyFactor(N);
  const obviousness = 1 - commonness; // obviousness should be high for common answers
  const bonusMagnitude = 22; // B_max
  const smallPoolBonus = bonusMagnitude * difficultyFactor * Math.pow(1 - obviousness, 0.7);
  
  // Final rarity
  const finalRarity = Math.min(100, Math.max(10, baseRarity + smallPoolBonus));
  
  return {
    finalRarity: Math.round(finalRarity),
    baseRarity: Math.round(baseRarity),
    smallPoolBonus: Math.round(smallPoolBonus),
    components: playersWithPopularity[guessedIndex].components,
    cellPopularity: playersWithPopularity[guessedIndex].cellPopularity
  };
}