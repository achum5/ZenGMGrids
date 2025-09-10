/**
 * Achievement parsing and computation helpers
 * Implements the robust system specified for draft, career stats, and validation
 */

import type { Player } from '@/types/bbgm';

// Types for the new helper system
export interface DraftStatus {
  flags: Set<string>; // ONE_OA, ROUND_1, ROUND_2, UNDRAFTED
  year: number | null;
  round: number | null;
  pick: number | null;
  draftTid: number | null;
}

export interface CareerTotals {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  threesMade: number;
  seasonsPlayed: number;
}

/**
 * Robust draft parsing covering all file variants
 */
export function getDraftStatus(player: Player): DraftStatus {
  const flags = new Set<string>();
  let year: number | null = null;
  let round: number | null = null;
  let pick: number | null = null;
  let draftTid: number | null = null;

  // Handle missing draft object (common for undrafted in BBGM)
  if (!player.draft) {
    flags.add('UNDRAFTED');
    return { flags, year, round, pick, draftTid };
  }

  const draft = player.draft;
  
  // Extract basic info
  year = draft.year || null;
  round = draft.round || null;
  pick = draft.pick || null;
  draftTid = draft.tid || null;

  // Check for undrafted conditions
  if (
    draft.type === 'undrafted' ||
    draft.round === 0 ||
    draft.tid === -1 ||
    (!draft.round && !draft.pick && !draft.ovrPick)
  ) {
    flags.add('UNDRAFTED');
    return { flags, year, round, pick, draftTid };
  }

  // Check for #1 Overall Pick
  if (
    draft.ovrPick === 1 ||
    (draft.round === 1 && draft.pick === 1)
  ) {
    flags.add('ONE_OA');
  }

  // Check round flags
  if (draft.round === 1) {
    flags.add('ROUND_1');
  } else if (draft.round === 2) {
    flags.add('ROUND_2');
  }

  return { flags, year, round, pick, draftTid };
}

/**
 * Compute career totals without double-counting multi-team seasons
 */
export function computeCareerTotals(player: Player): CareerTotals {
  const totals: CareerTotals = {
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    threesMade: 0,
    seasonsPlayed: 0
  };

  if (!player.stats) {
    return totals;
  }

  // Group stats by season, only regular season
  const seasonStats = new Map<number, any[]>();
  
  player.stats.forEach(stat => {
    if (stat.playoffs) return; // Skip playoffs
    if (!stat.season) return; // Skip invalid seasons
    
    if (!seasonStats.has(stat.season)) {
      seasonStats.set(stat.season, []);
    }
    seasonStats.get(stat.season)!.push(stat);
  });

  // Process each season
  for (const [season, stats] of seasonStats) {
    // Prefer season aggregate row (TOT / tid === -1) if present
    const totRow = stats.find(s => s.tid === -1);
    let seasonTotal;
    
    if (totRow) {
      seasonTotal = totRow;
    } else {
      // Sum team rows for this season
      seasonTotal = {
        pts: 0, trb: 0, orb: 0, drb: 0, ast: 0, stl: 0, blk: 0,
        fg3: 0, tp: 0, fg3m: 0, gp: 0
      };
      
      stats.forEach(stat => {
        seasonTotal.pts += stat.pts || 0;
        seasonTotal.trb += stat.trb || 0;
        seasonTotal.orb += stat.orb || 0;
        seasonTotal.drb += stat.drb || 0;
        seasonTotal.ast += stat.ast || 0;
        seasonTotal.stl += stat.stl || 0;
        seasonTotal.blk += stat.blk || 0;
        seasonTotal.fg3 += stat.fg3 || 0;
        seasonTotal.tp += stat.tp || 0;
        seasonTotal.fg3m += stat.fg3m || 0;
        seasonTotal.gp += stat.gp || 0;
      });
    }

    // Only count seasons with games played
    if ((seasonTotal.gp || 0) > 0) {
      totals.seasonsPlayed++;
      
      // Add to career totals
      totals.points += seasonTotal.pts || 0;
      
      // Rebounds: prefer trb, fallback to orb + drb
      totals.rebounds += seasonTotal.trb || (seasonTotal.orb || 0) + (seasonTotal.drb || 0);
      
      totals.assists += seasonTotal.ast || 0;
      totals.steals += seasonTotal.stl || 0;
      totals.blocks += seasonTotal.blk || 0;
      
      // Made threes: support all synonyms
      totals.threesMade += seasonTotal.fg3 || seasonTotal.tp || seasonTotal.fg3m || 0;
    }
  }

  return totals;
}

/**
 * Check career thresholds against canonical IDs
 */
export function checkCareerThresholds(totals: CareerTotals): Set<string> {
  const achievements = new Set<string>();

  if (totals.points >= 20000) achievements.add('PTS_20K');
  if (totals.rebounds >= 10000) achievements.add('REB_10K');
  if (totals.assists >= 5000) achievements.add('AST_5K');
  if (totals.steals >= 2000) achievements.add('STL_2K');
  if (totals.blocks >= 1500) achievements.add('BLK_1_5K');
  if (totals.threesMade >= 2000) achievements.add('THREES_2K');
  if (totals.seasonsPlayed >= 10) achievements.add('SEASONS_10');
  if (totals.seasonsPlayed >= 15) achievements.add('SEASONS_15');

  return achievements;
}

/**
 * Check Hall of Fame status
 */
export function checkHallOfFame(player: Player): boolean {
  // Check player.hof flag
  if (player.hof === true) {
    return true;
  }

  // Check for HOF award
  if (player.awards) {
    return player.awards.some(award => 
      award.type === 'Inducted into the Hall of Fame' ||
      award.type.toLowerCase().includes('hall of fame')
    );
  }

  return false;
}

/**
 * Determine if an achievement is career-based (non-season-aligned)
 */
export function isCareerAchievement(canonicalId: string): boolean {
  const careerAchievements = new Set([
    'ONE_OA', 'ROUND_1', 'ROUND_2', 'UNDRAFTED', 'HOF',
    'SEASONS_10', 'SEASONS_15',
    'PTS_20K', 'REB_10K', 'AST_5K', 'STL_2K', 'BLK_1_5K', 'THREES_2K'
  ]);
  
  return careerAchievements.has(canonicalId);
}

/**
 * Format achievement details for modal display
 */
export function formatAchievementDetails(
  canonicalId: string, 
  player: Player, 
  draftStatus?: DraftStatus,
  careerTotals?: CareerTotals
): string {
  switch (canonicalId) {
    case 'ONE_OA':
      return draftStatus?.year 
        ? `#1 Overall Pick (${draftStatus.year} — drafted by Team ${draftStatus.draftTid})`
        : '#1 Overall Pick';
    
    case 'ROUND_1':
      return draftStatus?.year 
        ? `First Round Pick (${draftStatus.year} — Round ${draftStatus.round}, Pick ${draftStatus.pick})`
        : 'First Round Pick';
    
    case 'ROUND_2':
      return draftStatus?.year 
        ? `Second Round Pick (${draftStatus.year} — Round ${draftStatus.round}, Pick ${draftStatus.pick})`
        : 'Second Round Pick';
        
    case 'UNDRAFTED':
      return 'Went Undrafted';
    
    case 'HOF':
      return 'Hall of Fame';
    
    case 'SEASONS_10':
      return careerTotals 
        ? `Played 10+ Seasons (${careerTotals.seasonsPlayed})`
        : 'Played 10+ Seasons';
    
    case 'SEASONS_15':
      return careerTotals 
        ? `Played 15+ Seasons (${careerTotals.seasonsPlayed})`
        : 'Played 15+ Seasons';
    
    case 'PTS_20K':
      return careerTotals 
        ? `20,000+ Career Points (${careerTotals.points.toLocaleString()})`
        : '20,000+ Career Points';
    
    case 'REB_10K':
      return careerTotals 
        ? `10,000+ Career Rebounds (${careerTotals.rebounds.toLocaleString()})`
        : '10,000+ Career Rebounds';
    
    case 'AST_5K':
      return careerTotals 
        ? `5,000+ Career Assists (${careerTotals.assists.toLocaleString()})`
        : '5,000+ Career Assists';
    
    case 'STL_2K':
      return careerTotals 
        ? `2,000+ Career Steals (${careerTotals.steals.toLocaleString()})`
        : '2,000+ Career Steals';
    
    case 'BLK_1_5K':
      return careerTotals 
        ? `1,500+ Career Blocks (${careerTotals.blocks.toLocaleString()})`
        : '1,500+ Career Blocks';
    
    case 'THREES_2K':
      return careerTotals 
        ? `2,000+ Made Threes (${careerTotals.threesMade.toLocaleString()})`
        : '2,000+ Made Threes';
    
    default:
      return canonicalId;
  }
}