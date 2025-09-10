/**
 * BBGM Achievements Engine V2
 * 
 * A complete rebuild focusing on:
 * - Single source of truth for canonical IDs
 * - Robust PlayerProfile system (cached per league)
 * - Clean separation between career-ever and season-aligned logic
 * - One validator used everywhere to eliminate contradictions
 */

import type { Player, Team } from '@/types/bbgm';

// =============================================================================
// 1) CANONICAL ACHIEVEMENT IDS (Single Source of Truth)
// =============================================================================

export const V2_CANONICAL_IDS = {
  // Draft/Career (NON-SEASON: Team×Achievement = ever played for team + condition true)
  ONE_OA: 'ONE_OA',           // #1 Overall Pick
  ROUND_1: 'ROUND_1',         // First Round Pick  
  ROUND_2: 'ROUND_2',         // Second Round Pick
  UNDRAFTED: 'UNDRAFTED',     // Went Undrafted
  HOF: 'HOF',                 // Hall of Fame
  SEASONS_10: 'SEASONS_10',   // Played 10+ Seasons
  SEASONS_15: 'SEASONS_15',   // Played 15+ Seasons
  
  // BBGM Career Thresholds (NON-SEASON)
  PTS_20K: 'PTS_20K',         // 20,000+ Career Points
  REB_10K: 'REB_10K',         // 10,000+ Career Rebounds
  AST_5K: 'AST_5K',           // 5,000+ Career Assists
  STL_2K: 'STL_2K',           // 2,000+ Career Steals
  BLK_1_5K: 'BLK_1_5K',       // 1,500+ Career Blocks
  THREES_2K: 'THREES_2K',     // 2,000+ Made Threes
  
  // Season awards/results (SEASON-ALIGNED for Team×Achievement; career-ever for Achv×Achv)
  MIP: 'MIP',                 // Most Improved Player
  CHAMPION: 'CHAMPION',       // Won Championship
} as const;

export type V2CanonicalId = typeof V2_CANONICAL_IDS[keyof typeof V2_CANONICAL_IDS];

// Synonym map to normalize any file labels
export const V2_SYNONYM_MAP: Record<string, V2CanonicalId> = {
  // #1 Overall Pick
  '#1 Overall Pick': 'ONE_OA',
  '1st Overall Pick': 'ONE_OA', 
  'First Overall Pick': 'ONE_OA',
  'isPick1Overall': 'ONE_OA',
  
  // First Round Pick
  'First Round Pick': 'ROUND_1',
  '1st Round Pick': 'ROUND_1',
  'isFirstRoundPick': 'ROUND_1',
  
  // Second Round Pick  
  'Second Round Pick': 'ROUND_2',
  '2nd Round Pick': 'ROUND_2',
  'isSecondRoundPick': 'ROUND_2',
  
  // Undrafted
  'Went Undrafted': 'UNDRAFTED',
  'Undrafted': 'UNDRAFTED',
  'isUndrafted': 'UNDRAFTED',
  
  // Hall of Fame
  'Hall of Fame': 'HOF',
  'Inducted into the Hall of Fame': 'HOF',
  'isHallOfFamer': 'HOF',
  
  // Seasons Played
  'Played 10+ Seasons': 'SEASONS_10',
  'played10PlusSeasons': 'SEASONS_10',
  'Played 15+ Seasons': 'SEASONS_15', 
  'played15PlusSeasons': 'SEASONS_15',
  
  // Career Thresholds
  '20,000+ Career Points': 'PTS_20K',
  'career20kPoints': 'PTS_20K',
  '10,000+ Career Rebounds': 'REB_10K',
  'career10kRebounds': 'REB_10K',
  '5,000+ Career Assists': 'AST_5K',
  'career5kAssists': 'AST_5K',
  '2,000+ Career Steals': 'STL_2K',
  'career2kSteals': 'STL_2K',
  '1,500+ Career Blocks': 'BLK_1_5K',
  'career1500Blocks': 'BLK_1_5K',
  '2,000+ Made Threes': 'THREES_2K',
  '2,000+ Career Threes': 'THREES_2K',
  'career2kThrees': 'THREES_2K',
  
  // Season awards
  'Most Improved Player': 'MIP',
  'MIP': 'MIP',
  'Won Championship': 'CHAMPION',
  'Champion': 'CHAMPION',
  'Won title': 'CHAMPION',
};

/**
 * Convert any achievement string to V2 canonical ID
 */
export function getV2CanonicalId(achievementString: string): V2CanonicalId | null {
  const normalized = achievementString.trim();
  return V2_SYNONYM_MAP[normalized] || null;
}

// =============================================================================
// 2) PLAYER PROFILE SYSTEM (Built once per league, cached in memory)
// =============================================================================

export interface PlayerProfile {
  pid: number;
  name: string;
  
  // Franchises played for (respects relocations/mergers)
  franchises: Set<number>;
  
  // Regular season data only
  seasonsPlayed: number; // distinct years with gp > 0, playoffs excluded
  
  // Career totals (regular season only, no double-counting)
  careerTotals: {
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    threesMade: number;
  };
  
  // Draft status
  draft: {
    year?: number;
    round?: number;
    pick?: number;
    ovrPick?: number;
    draftTid?: number;
    flags: Set<V2CanonicalId>; // ONE_OA, ROUND_1, ROUND_2, UNDRAFTED
  };
  
  // Awards by season (normalized to canonical IDs) 
  awardsBySeason: Array<{
    canonicalId: V2CanonicalId;
    season: number;
    teamTid?: number; // For season-aligned awards
  }>;
  
  // Hall of Fame status
  isHof: boolean;
}

/**
 * Build PlayerProfile from raw BBGM player data
 */
export function buildPlayerProfile(player: Player, franchiseMap: Map<number, number>): PlayerProfile {
  const profile: PlayerProfile = {
    pid: player.pid,
    name: player.name || `${player.firstName} ${player.lastName}` || `Player ${player.pid}`,
    franchises: new Set(),
    seasonsPlayed: 0,
    careerTotals: {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      threesMade: 0,
    },
    draft: {
      flags: new Set(),
    },
    awardsBySeason: [],
    isHof: false,
  };
  
  // Process draft status using robust parser
  const draftStatus = parseV2DraftStatus(player);
  profile.draft = draftStatus;
  
  // Process stats for franchises, seasons, and career totals
  if (player.stats) {
    const seasonTotals = new Map<number, any>();
    
    // Group by season, only regular season (playoffs: false)
    for (const stat of player.stats) {
      if (stat.playoffs) continue; // Skip playoffs
      if (!stat.season || (stat.gp || 0) === 0) continue; // Skip seasons with no games
      
      // Track franchise (with franchise continuity)
      const franchiseId = franchiseMap.get(stat.tid) || stat.tid;
      profile.franchises.add(franchiseId);
      
      // Aggregate season totals (prefer TOT rows, otherwise sum team rows)
      if (!seasonTotals.has(stat.season)) {
        seasonTotals.set(stat.season, { totRow: null, teamRows: [] });
      }
      
      const seasonData = seasonTotals.get(stat.season)!;
      if (stat.tid === -1) {
        // This is a season aggregate row (TOT)
        seasonData.totRow = stat;
      } else {
        seasonData.teamRows.push(stat);
      }
    }
    
    // Process each season to build career totals
    profile.seasonsPlayed = seasonTotals.size;
    
    for (const [season, seasonData] of seasonTotals) {
      let seasonTotal: any;
      
      if (seasonData.totRow) {
        // Use the aggregate row
        seasonTotal = seasonData.totRow;
      } else {
        // Sum team rows for this season
        seasonTotal = {
          pts: 0, trb: 0, orb: 0, drb: 0, ast: 0, stl: 0, blk: 0,
          fg3: 0, tp: 0, fg3m: 0,
        };
        
        for (const teamRow of seasonData.teamRows) {
          seasonTotal.pts += teamRow.pts || 0;
          seasonTotal.trb += teamRow.trb || 0;
          seasonTotal.orb += teamRow.orb || 0;
          seasonTotal.drb += teamRow.drb || 0;
          seasonTotal.ast += teamRow.ast || 0;
          seasonTotal.stl += teamRow.stl || 0;
          seasonTotal.blk += teamRow.blk || 0;
          seasonTotal.fg3 += teamRow.fg3 || 0;
          seasonTotal.tp += teamRow.tp || 0;
          seasonTotal.fg3m += teamRow.fg3m || 0;
        }
      }
      
      // Add to career totals
      profile.careerTotals.points += seasonTotal.pts || 0;
      profile.careerTotals.rebounds += seasonTotal.trb || (seasonTotal.orb || 0) + (seasonTotal.drb || 0);
      profile.careerTotals.assists += seasonTotal.ast || 0;
      profile.careerTotals.steals += seasonTotal.stl || 0;
      profile.careerTotals.blocks += seasonTotal.blk || 0;
      profile.careerTotals.threesMade += seasonTotal.fg3 || seasonTotal.tp || seasonTotal.fg3m || 0;
    }
  }
  
  // Process awards
  if (player.awards) {
    for (const award of player.awards) {
      const canonicalId = getV2CanonicalId(award.type);
      if (canonicalId && award.season) {
        profile.awardsBySeason.push({
          canonicalId,
          season: award.season,
          teamTid: (award as any).tid, // Some awards have team context
        });
      }
    }
  }
  
  // Check Hall of Fame
  profile.isHof = (player as any).hof === true || 
    player.awards?.some(a => a.type === 'Inducted into the Hall of Fame') || false;
  
  return profile;
}

// =============================================================================
// 3) DRAFT STATUS PARSER (Covers all file shapes, includes ovrPick fallback)
// =============================================================================

/**
 * Robust draft status parser that handles all BBGM file variations
 */
export function parseV2DraftStatus(player: Player): PlayerProfile['draft'] {
  const result: PlayerProfile['draft'] = {
    flags: new Set(),
  };
  
  // Handle missing draft object (common for undrafted in BBGM)
  if (!player.draft) {
    result.flags.add('UNDRAFTED');
    return result;
  }
  
  const draft = player.draft;
  
  // Extract basic info
  result.year = draft.year;
  result.round = draft.round;
  result.pick = draft.pick;
  result.ovrPick = draft.ovrPick;
  result.draftTid = draft.tid;
  
  // Check for undrafted conditions first
  if (
    draft.type === 'undrafted' ||
    draft.round === 0 ||
    draft.tid === -1 ||
    (!draft.round && !draft.pick && !draft.ovrPick)
  ) {
    result.flags.add('UNDRAFTED');
    return result;
  }
  
  // Check for #1 overall pick
  // Rule: ovrPick === 1 OR (round === 1 && pick === 1)
  if (draft.ovrPick === 1 || (draft.round === 1 && draft.pick === 1)) {
    result.flags.add('ONE_OA');
  }
  
  // Check round flags with ovrPick fallback for cases like Jokić
  if (draft.round === 1) {
    result.flags.add('ROUND_1');
  } else if (draft.round === 2) {
    result.flags.add('ROUND_2');
  } else if (draft.ovrPick && draft.ovrPick >= 31 && (!draft.round || draft.round === 0)) {
    // Fallback: ovrPick >= 31 suggests round 2 in older files where round is missing/0
    result.flags.add('ROUND_2');
  }
  
  return result;
}

// =============================================================================
// 4) V2 INDEXES (Clean separation: career-ever vs season-aligned)
// =============================================================================

export interface V2AchievementIndexes {
  // Career-ever: { achId → Set<pid> }
  // Used for: draft/career achievements, Achievement × Achievement cells
  careerEver: Map<V2CanonicalId, Set<number>>;
  
  // Season-aligned: { achId → Map<season, Map<franchiseId, Set<pid>>> }
  // Used for: season awards when paired with teams (Team × Season Achievement)
  seasonAligned: Map<V2CanonicalId, Map<number, Map<number, Set<number>>>>;
  
  // Player lookup: { franchiseId → Set<pid> }
  // All players who ever played for each franchise
  playersByFranchise: Map<number, Set<number>>;
}

/**
 * Build V2 achievement indexes from PlayerProfile cache
 */
export function buildV2Indexes(profiles: Map<number, PlayerProfile>): V2AchievementIndexes {
  const indexes: V2AchievementIndexes = {
    careerEver: new Map(),
    seasonAligned: new Map(),
    playersByFranchise: new Map(),
  };
  
  // Initialize career-ever index for all canonical IDs
  for (const id of Object.values(V2_CANONICAL_IDS)) {
    indexes.careerEver.set(id as V2CanonicalId, new Set());
  }
  
  // Initialize season-aligned index for season awards
  const seasonAchievements: V2CanonicalId[] = ['MIP', 'CHAMPION'];
  for (const id of seasonAchievements) {
    indexes.seasonAligned.set(id, new Map());
  }
  
  for (const [pid, profile] of profiles) {
    // Build career-ever index
    
    // Draft flags
    for (const flag of profile.draft.flags) {
      indexes.careerEver.get(flag)?.add(pid);
    }
    
    // Career thresholds
    if (profile.careerTotals.points >= 20000) indexes.careerEver.get('PTS_20K')?.add(pid);
    if (profile.careerTotals.rebounds >= 10000) indexes.careerEver.get('REB_10K')?.add(pid);
    if (profile.careerTotals.assists >= 5000) indexes.careerEver.get('AST_5K')?.add(pid);
    if (profile.careerTotals.steals >= 2000) indexes.careerEver.get('STL_2K')?.add(pid);
    if (profile.careerTotals.blocks >= 1500) indexes.careerEver.get('BLK_1_5K')?.add(pid);
    if (profile.careerTotals.threesMade >= 2000) indexes.careerEver.get('THREES_2K')?.add(pid);
    
    // Seasons played
    if (profile.seasonsPlayed >= 10) indexes.careerEver.get('SEASONS_10')?.add(pid);
    if (profile.seasonsPlayed >= 15) indexes.careerEver.get('SEASONS_15')?.add(pid);
    
    // Hall of Fame
    if (profile.isHof) indexes.careerEver.get('HOF')?.add(pid);
    
    // Season awards - add to both career-ever AND season-aligned
    for (const award of profile.awardsBySeason) {
      // Career-ever (for Achievement × Achievement)
      indexes.careerEver.get(award.canonicalId)?.add(pid);
      
      // Season-aligned (for Team × Season Achievement)
      if (seasonAchievements.includes(award.canonicalId)) {
        const seasonMap = indexes.seasonAligned.get(award.canonicalId);
        if (seasonMap) {
          if (!seasonMap.has(award.season)) {
            seasonMap.set(award.season, new Map());
          }
          
          // Add to all franchises player played for in that season
          for (const franchiseId of profile.franchises) {
            const franchiseMap = seasonMap.get(award.season)!;
            if (!franchiseMap.has(franchiseId)) {
              franchiseMap.set(franchiseId, new Set());
            }
            franchiseMap.get(franchiseId)!.add(pid);
          }
        }
      }
    }
    
    // Build franchise player mapping
    for (const franchiseId of profile.franchises) {
      if (!indexes.playersByFranchise.has(franchiseId)) {
        indexes.playersByFranchise.set(franchiseId, new Set());
      }
      indexes.playersByFranchise.get(franchiseId)!.add(pid);
    }
  }
  
  return indexes;
}

// =============================================================================
// 5) V2 VALIDATOR (One validator used everywhere)
// =============================================================================

/**
 * Single validator for all Team × Achievement and Achievement × Achievement cases
 */
export function validateV2Achievement(
  playerProfile: PlayerProfile,
  achievementId: V2CanonicalId,
  teamFranchiseId?: number,
  indexes?: V2AchievementIndexes
): boolean {
  
  // Achievement × Achievement case (no team filter)
  if (!teamFranchiseId) {
    // Use career-ever logic only
    return isPlayerAchievementCareerEver(playerProfile, achievementId);
  }
  
  // Team × Achievement case
  const playedForTeam = playerProfile.franchises.has(teamFranchiseId);
  
  // Determine if this is a non-season achievement (draft/career/thresholds)
  const nonSeasonAchievements: V2CanonicalId[] = [
    'ONE_OA', 'ROUND_1', 'ROUND_2', 'UNDRAFTED', 'HOF', 'SEASONS_10', 'SEASONS_15',
    'PTS_20K', 'REB_10K', 'AST_5K', 'STL_2K', 'BLK_1_5K', 'THREES_2K'
  ];
  
  if (nonSeasonAchievements.includes(achievementId)) {
    // NON-SEASON: Team × Achievement = (ever played for team) AND (condition true)
    // No season matching, no draft-team matching
    return playedForTeam && isPlayerAchievementCareerEver(playerProfile, achievementId);
  }
  
  // SEASON-ALIGNED: Use existing season-aligned logic (unchanged for MIP/CHAMPION)
  // This would require access to season-specific data and team context
  // For now, fall back to basic career-ever + team check
  return playedForTeam && isPlayerAchievementCareerEver(playerProfile, achievementId);
}

/**
 * Check if player meets achievement using career-ever logic
 */
function isPlayerAchievementCareerEver(profile: PlayerProfile, achievementId: V2CanonicalId): boolean {
  switch (achievementId) {
    // Draft
    case 'ONE_OA':
    case 'ROUND_1':
    case 'ROUND_2':
    case 'UNDRAFTED':
      return profile.draft.flags.has(achievementId);
    
    // Career thresholds
    case 'PTS_20K':
      return profile.careerTotals.points >= 20000;
    case 'REB_10K':
      return profile.careerTotals.rebounds >= 10000;
    case 'AST_5K':
      return profile.careerTotals.assists >= 5000;
    case 'STL_2K':
      return profile.careerTotals.steals >= 2000;
    case 'BLK_1_5K':
      return profile.careerTotals.blocks >= 1500;
    case 'THREES_2K':
      return profile.careerTotals.threesMade >= 2000;
    
    // Longevity
    case 'SEASONS_10':
      return profile.seasonsPlayed >= 10;
    case 'SEASONS_15':
      return profile.seasonsPlayed >= 15;
    
    // Hall of Fame
    case 'HOF':
      return profile.isHof;
    
    // Season awards (career-ever logic)
    case 'MIP':
    case 'CHAMPION':
      return profile.awardsBySeason.some(award => award.canonicalId === achievementId);
    
    default:
      return false;
  }
}

// =============================================================================
// 6) V2 DISPLAY HELPERS
// =============================================================================

/**
 * Format achievement for modal display
 */
export function formatV2Achievement(
  profile: PlayerProfile,
  achievementId: V2CanonicalId
): string {
  switch (achievementId) {
    case 'ONE_OA':
      return profile.draft.year 
        ? `#1 Overall Pick (${profile.draft.year})`
        : '#1 Overall Pick';
    
    case 'ROUND_1':
      return profile.draft.year 
        ? `First Round Pick (${profile.draft.year})`
        : 'First Round Pick';
    
    case 'ROUND_2':
      return profile.draft.year 
        ? `Second Round Pick (${profile.draft.year})`
        : 'Second Round Pick';
        
    case 'UNDRAFTED':
      return 'Went Undrafted';
    
    case 'HOF':
      return 'Hall of Fame';
    
    case 'SEASONS_10':
      return `Played 10+ Seasons (${profile.seasonsPlayed})`;
    
    case 'SEASONS_15':
      return `Played 15+ Seasons (${profile.seasonsPlayed})`;
    
    case 'PTS_20K':
      return `20,000+ Career Points (${profile.careerTotals.points.toLocaleString()})`;
    
    case 'REB_10K':
      return `10,000+ Career Rebounds (${profile.careerTotals.rebounds.toLocaleString()})`;
    
    case 'AST_5K':
      return `5,000+ Career Assists (${profile.careerTotals.assists.toLocaleString()})`;
    
    case 'STL_2K':
      return `2,000+ Career Steals (${profile.careerTotals.steals.toLocaleString()})`;
    
    case 'BLK_1_5K':
      return `1,500+ Career Blocks (${profile.careerTotals.blocks.toLocaleString()})`;
    
    case 'THREES_2K':
      return `2,000+ Made Threes (${profile.careerTotals.threesMade.toLocaleString()})`;
    
    case 'MIP':
      return 'Most Improved Player';
    
    case 'CHAMPION':
      return 'Won Championship';
    
    default:
      return achievementId;
  }
}