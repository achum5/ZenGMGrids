import type { Player, Team, CatTeam } from '@/types/bbgm';
import { computeCellAwareRarity } from './cell-aware-rarity';

export type EligiblePlayerLite = {
  pid: number;
  awards?: {
    hof?: number; 
    mvp?: number; 
    fmvp?: number; 
    allLeague?: number; 
    allStar?: number;
  };
  career?: {
    gp?: number; 
    min?: number; 
    pts?: number;
  };
};

export interface CellContext {
  rowConstraint: CatTeam;
  colConstraint: CatTeam;
}

// Extract award counts from BBGM player.awards array
function awardCounts(p: Player) {
  const a = { hof: 0, mvp: 0, fmvp: 0, allLeague: 0, allStar: 0 };
  for (const w of (p.awards ?? [])) {
    switch (w.type) {
      case "Inducted into the Hall of Fame": 
        a.hof++; 
        break;
      case "Most Valuable Player": 
        a.mvp++; 
        break;
      case "Finals MVP": 
        a.fmvp++; 
        break;
      case "First Team All-League":
      case "Second Team All-League":
      case "Third Team All-League": 
        a.allLeague++; 
        break;
      case "All-Star": 
        a.allStar++; 
        break;
    }
  }
  return a;
}

// Extract career totals from BBGM player.stats array (regular season only)
function careerTotals(p: Player) {
  let gp = 0, min = 0, pts = 0;
  for (const s of (p.stats ?? [])) {
    if (s.playoffs) continue; // use RS for stability
    gp += s.gp ?? 0;
    min += s.min ?? 0;
    pts += s.pts ?? 0;
  }
  return { gp, min, pts };
}

// Convert Player to EligiblePlayerLite for rarity computation
export function playerToEligibleLite(p: Player): EligiblePlayerLite {
  return {
    pid: p.pid,
    awards: awardCounts(p),
    career: careerTotals(p)
  };
}

export function computeRarityForGuess(opts: {
  guessed: EligiblePlayerLite;
  eligiblePool: EligiblePlayerLite[];   // E for this cell
  puzzleSeed: string;                   // stable per shared grid
  cellContext?: CellContext;            // Optional cell context for enhanced rarity
  fullPlayers?: Player[];               // Full player data for cell-aware calculations
  teams?: Map<number, Team>;            // Team data for cell-aware calculations
  seasonIndex?: import('@/lib/season-achievements').SeasonIndex;  // Season achievements data
}): number {
  const { guessed, eligiblePool, puzzleSeed, cellContext, fullPlayers, teams, seasonIndex } = opts;
  const N = eligiblePool.length;

  if (N <= 0) return 1;

  // Use Cell-Aware system if we have the required data
  if (cellContext && fullPlayers && teams) {
    const guessedPlayer = fullPlayers.find(p => p.pid === guessed.pid);
    const fullEligiblePool = eligiblePool
      .map(lite => fullPlayers.find(p => p.pid === lite.pid))
      .filter(Boolean) as Player[];
    
    if (guessedPlayer && fullEligiblePool.length === eligiblePool.length) {
      try {
        const result = computeCellAwareRarity({
          guessed: guessedPlayer,
          eligiblePool: fullEligiblePool,
          cellContext: {
            rowConstraint: cellContext.rowConstraint,
            colConstraint: cellContext.colConstraint,
            teams: teams
          },
          puzzleSeed,
          seasonIndex
        });
        return result.finalRarity;
      } catch (error) {
        console.warn('Cell-aware rarity calculation failed, falling back to enhanced system:', error);
      }
    }
  }

  // Fallback to enhanced system with Small-Pool Bonus
  return computeEnhancedRarity({ guessed, eligiblePool, puzzleSeed });
}

// Small pool difficulty factor D(N)
function getPoolDifficultyFactor(poolSize: number): number {
  if (poolSize <= 3) return 0.60;
  if (poolSize <= 5) return 0.50;
  if (poolSize <= 10) return 0.35;
  if (poolSize <= 20) return 0.25;
  if (poolSize <= 50) return 0.15;
  if (poolSize <= 100) return 0.08;
  return 0.05;
}

// Enhanced rarity calculation with Small-Pool Bonus
function computeEnhancedRarity(opts: {
  guessed: EligiblePlayerLite;
  eligiblePool: EligiblePlayerLite[];
  puzzleSeed: string;
}): number {
  const { guessed, eligiblePool, puzzleSeed } = opts;
  const N = eligiblePool.length;

  // Popularity proxy (higher = more common; lower = rarer)
  const pop = (p: EligiblePlayerLite) => {
    const a = p.awards ?? {};
    const c = p.career ?? {};
    const awardsScore =
      (a.hof ?? 0) * 6 +
      (a.mvp ?? 0) * 4 +
      (a.fmvp ?? 0) * 3 +
      (a.allLeague ?? 0) * 2 +
      (a.allStar ?? 0) * 1;

    // log dampening to avoid blowups on volume
    const volumeScore = Math.log10(1 + (c.min ?? 0) + (c.pts ?? 0) / 5 + (c.gp ?? 0) * 2);

    return awardsScore * 5 + volumeScore;
  };

  // Seeded tiebreaker (keeps determinism across shares)
  const hash = (s: string) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  const seed = hash(puzzleSeed);

  const keyed = eligiblePool.map(p => ({
    p,
    pop: pop(p),
    tie: (hash(String(p.pid)) ^ seed) >>> 0,
  }));

  // Sort ascending by popularity (rarer first), then by seeded tie
  keyed.sort((a, b) => (a.pop - b.pop) || (a.tie - b.tie));

  const rank = Math.max(1, keyed.findIndex(k => k.p.pid === guessed.pid) + 1); // 1..N
  
  // Calculate base rarity (10-100)
  const commonness = N === 1 ? 1 : (rank - 1) / (N - 1); // 0..1 (0 = rarest, 1 = most common)
  const baseRarity = 10 + (1 - commonness) * 90;
  
  // Calculate Small-Pool Bonus
  const difficultyFactor = getPoolDifficultyFactor(N);
  const obviousness = commonness; // Same as commonness percentile
  const bonusMagnitude = 22; // B_max from spec
  const smallPoolBonus = bonusMagnitude * difficultyFactor * Math.pow(1 - obviousness, 0.7);
  
  // Final rarity with bonus
  const finalRarity = baseRarity + smallPoolBonus;
  return Math.min(100, Math.max(10, Math.round(finalRarity)));
}