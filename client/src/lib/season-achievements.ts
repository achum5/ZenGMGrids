/**
 * Season-specific achievement system for Basketball GM Grids
 * 
 * This system adds awards like MVP, All-Star, Finals MVP, etc. with proper
 * season harmonization to ensure players only qualify when they earned the
 * achievement with the same team in the same season.
 */

import type { Player } from '@/types/bbgm';

// Season-specific achievement types
export type SeasonAchievementId = 
  // Basketball GM achievements
  | 'AllStar' 
  | 'MVP' 
  | 'DPOY' 
  | 'ROY' 
  | 'SMOY' 
  | 'MIP'
  | 'FinalsMVP'
  | 'SFMVP'
  | 'AllLeagueAny'
  | 'AllDefAny'
  | 'AllRookieAny'
  // Football GM achievements
  | 'FBAllStar'
  | 'FBMVP'
  | 'FBDPOY'
  | 'FBOffROY'
  | 'FBDefROY'
  | 'FBAllRookie'
  | 'FBAllLeague1st'
  | 'FBAllLeague2nd'
  | 'FBFinalsMVP'
  | 'FBChampion'
  | 'FBPassLeader'
  | 'FBRecLeader'
  | 'FBRushLeader'
  | 'FBScrimmageLeader'
  // Hockey GM achievements
  | 'HKAllStar'
  | 'HKAllStarMVP'
  | 'HKMVP'
  | 'HKDPOY'
  | 'HKDefForward'
  | 'HKGoalie'
  | 'HKROY'
  | 'HKAllRookie'
  | 'HKAllLeague'
  | 'HKPointsLeader'
  | 'HKAssistsLeader'
  | 'HKGoalsLeader'
  | 'HKPlayoffsMVP'
  | 'HKChampion';

// Award type normalization mapping
const AWARD_TYPE_MAPPING: Record<string, SeasonAchievementId> = {
  // Basketball GM - All-Star variations
  'all-star': 'AllStar',
  'all star': 'AllStar',
  'allstar': 'AllStar',
  
  // Basketball GM - MVP variations
  'most valuable player': 'MVP',
  'mvp': 'MVP',
  
  // Basketball GM - DPOY variations
  'defensive player of the year': 'DPOY',
  'dpoy': 'DPOY',
  'defensive player': 'DPOY',
  
  // Basketball GM - ROY variations
  'rookie of the year': 'ROY',
  'roy': 'ROY',
  
  // Basketball GM - SMOY variations
  'sixth man of the year': 'SMOY',
  'smoy': 'SMOY',
  '6th man of the year': 'SMOY',
  '6moy': 'SMOY',
  
  // Basketball GM - MIP variations
  'most improved player': 'MIP',
  'mip': 'MIP',
  
  // Basketball GM - Finals MVP variations
  'finals mvp': 'FinalsMVP',
  'finals most valuable player': 'FinalsMVP',
  'championship mvp': 'FinalsMVP',
  
  // Basketball GM - SFMVP/Conference Finals MVP variations
  'conference finals mvp': 'SFMVP',
  'semi-finals mvp': 'SFMVP',
  'cfmvp': 'SFMVP',
  'sfmvp': 'SFMVP',
  
  // Basketball GM - All-League (lumped) variations
  'first team all-league': 'AllLeagueAny',
  'second team all-league': 'AllLeagueAny',
  'third team all-league': 'AllLeagueAny',
  'all-league first team': 'AllLeagueAny',
  'all-league second team': 'AllLeagueAny',
  'all-league third team': 'AllLeagueAny',
  'all-nba first team': 'AllLeagueAny',
  'all-nba second team': 'AllLeagueAny',
  'all-nba third team': 'AllLeagueAny',
  
  // Basketball GM - All-Defensive (lumped) variations
  'first team all-defensive': 'AllDefAny',
  'second team all-defensive': 'AllDefAny',
  'all-defensive first team': 'AllDefAny',
  'all-defensive second team': 'AllDefAny',
  'all-nba defensive first team': 'AllDefAny',
  'all-nba defensive second team': 'AllDefAny',
  
  // Basketball GM - All-Rookie (lumped) variations
  'all-rookie first team': 'AllRookieAny',
  'all-rookie second team': 'AllRookieAny',
  'all-rookie team': 'AllRookieAny',
  
  // Football GM specific awards (case-sensitive exact matches from FBGM)
  'All-Star': 'FBAllStar',
  'Most Valuable Player': 'FBMVP',
  'Defensive Player of the Year': 'FBDPOY',
  'Offensive Rookie of the Year': 'FBOffROY',
  'Defensive Rookie of the Year': 'FBDefROY',
  'All-Rookie Team': 'FBAllRookie',
  'First Team All-League': 'FBAllLeague1st',
  'Second Team All-League': 'FBAllLeague2nd',
  'Finals MVP': 'FBFinalsMVP',
  'Won Championship': 'FBChampion',
  'League Passing Leader': 'FBPassLeader',
  'League Receiving Leader': 'FBRecLeader',
  'League Rushing Leader': 'FBRushLeader',
  'League Scrimmage Yards Leader': 'FBScrimmageLeader',
  
  // Hockey GM specific awards (case-sensitive exact matches from ZGMH)
  'all-star mvp': 'HKAllStarMVP',
  'defensive forward of the year': 'HKDefForward',
  'goalie of the year': 'HKGoalie',
  'all-league team': 'HKAllLeague',
  'league points leader': 'HKPointsLeader',
  'league assists leader': 'HKAssistsLeader',
  'league goals leader': 'HKGoalsLeader',
  'playoffs mvp': 'HKPlayoffsMVP'
};

// Season index structure: season -> team -> achievement -> Set<pid>
export type SeasonIndex = Record<number, Record<number, Record<SeasonAchievementId, Set<number>>>>;

/**
 * Normalize award type to canonical achievement ID with sport context
 */
function normalizeAwardType(awardType: string, sport?: string): SeasonAchievementId | null {
  const normalized = awardType.toLowerCase().trim();
  
  // Handle sport-specific conflicts
  if (sport === 'hockey') {
    // Hockey-specific mappings for conflicting awards
    switch (normalized) {
      case 'all-star': return 'HKAllStar';
      case 'most valuable player': return 'HKMVP';
      case 'defensive player of the year': return 'HKDPOY';
      case 'rookie of the year': return 'HKROY';
      case 'all-rookie team': return 'HKAllRookie';
      case 'first team all-league': return 'HKAllLeague';
      case 'second team all-league': return 'HKAllLeague';
      case 'won championship': return 'HKChampion';
    }
  } else if (sport === 'football') {
    // Football-specific mappings (case-sensitive exact matches)
    if (awardType === 'All-Star') return 'FBAllStar';
    if (awardType === 'Most Valuable Player') return 'FBMVP';
    if (awardType === 'Defensive Player of the Year') return 'FBDPOY';
    if (awardType === 'Won Championship') return 'FBChampion';
    if (awardType === 'All-Rookie Team') return 'FBAllRookie';
    if (awardType === 'First Team All-League') return 'FBAllLeague1st';
    if (awardType === 'Second Team All-League') return 'FBAllLeague2nd';
  }
  
  // Fall back to general mapping
  return AWARD_TYPE_MAPPING[normalized] || null;
}

/**
 * Get teams a player appeared for in a given season (gp > 0 or min > 0)
 */
function getSeasonTeams(player: Player, season: number): Set<number> {
  const teams = new Set<number>();
  
  if (!player.stats) return teams;
  
  for (const stat of player.stats) {
    if (stat.season === season && !stat.playoffs && ((stat.gp || 0) > 0 || (stat.min || 0) > 0)) {
      teams.add(stat.tid);
    }
  }
  
  return teams;
}

/**
 * Resolve Finals MVP team from playoffs stats
 * Used for both BBGM FinalsMVP and FBGM FBFinalsMVP
 */
function resolveFinalsMVPTeam(player: Player, season: number): number | null {
  if (!player.stats) return null;
  
  const playoffStats = player.stats.filter(s => 
    s.season === season && s.playoffs
  );
  
  if (playoffStats.length === 0) return null;
  
  // If only one playoffs team, use that
  if (playoffStats.length === 1) {
    return playoffStats[0].tid;
  }
  
  // Find the team with most playoff minutes/games (likely Finals team)
  let bestTeam = playoffStats[0].tid;
  let bestActivity = (playoffStats[0].min || 0) + (playoffStats[0].gp || 0) * 10; // Weight games more
  
  for (const stat of playoffStats) {
    const activity = (stat.min || 0) + (stat.gp || 0) * 10;
    if (activity > bestActivity) {
      bestActivity = activity;
      bestTeam = stat.tid;
    }
  }
  
  return bestTeam;
}

/**
 * Resolve Conference Finals MVP team from playoffs stats
 */
function resolveSFMVPTeam(player: Player, season: number): number | null {
  // For now, use similar logic as Finals MVP
  // In the future, could use round metadata if available
  return resolveFinalsMVPTeam(player, season);
}

/**
 * Build the player-derived season index from player data
 */
export function buildSeasonIndex(players: Player[], sport?: string): SeasonIndex {
  console.log('🏆 Building season-specific achievement index...');
  
  const seasonIndex: SeasonIndex = {};
  let totalIndexed = 0;
  let skippedEntries = 0;
  
  for (const player of players) {
    if (!player.awards) continue;
    
    // Process each award
    for (const award of player.awards) {
      const achievementId = normalizeAwardType(award.type, sport);
      if (!achievementId) continue;
      
      const season = award.season;
      
      // Handle Finals MVP and SFMVP (single playoffs team) - for BBGM, FBGM, and HKGM
      if (achievementId === 'FinalsMVP' || achievementId === 'FBFinalsMVP' || achievementId === 'HKPlayoffsMVP' || achievementId === 'HKChampion') {
        const playoffsTeam = resolveFinalsMVPTeam(player, season);
        if (playoffsTeam !== null) {
          if (!seasonIndex[season]) seasonIndex[season] = {};
          if (!seasonIndex[season][playoffsTeam]) seasonIndex[season][playoffsTeam] = {} as Record<SeasonAchievementId, Set<number>>;
          if (!seasonIndex[season][playoffsTeam][achievementId]) seasonIndex[season][playoffsTeam][achievementId] = new Set();
          
          seasonIndex[season][playoffsTeam][achievementId].add(player.pid);
          totalIndexed++;
        } else {
          skippedEntries++;
        }
        continue;
      }
      
      if (achievementId === 'SFMVP') {
        const playoffsTeam = resolveSFMVPTeam(player, season);
        if (playoffsTeam !== null) {
          if (!seasonIndex[season]) seasonIndex[season] = {};
          if (!seasonIndex[season][playoffsTeam]) seasonIndex[season][playoffsTeam] = {} as Record<SeasonAchievementId, Set<number>>;
          if (!seasonIndex[season][playoffsTeam][achievementId]) seasonIndex[season][playoffsTeam][achievementId] = new Set();
          
          seasonIndex[season][playoffsTeam][achievementId].add(player.pid);
          totalIndexed++;
        } else {
          skippedEntries++;
        }
        continue;
      }
      
      // Handle all other awards (multi-team rule)
      const seasonTeams = getSeasonTeams(player, season);
      
      if (seasonTeams.size === 0) {
        // No regular season stats for this award season, skip
        skippedEntries++;
        continue;
      }
      
      // Add to all teams the player appeared for in this season
      for (const tid of Array.from(seasonTeams)) {
        if (!seasonIndex[season]) seasonIndex[season] = {};
        if (!seasonIndex[season][tid]) seasonIndex[season][tid] = {} as Record<SeasonAchievementId, Set<number>>;
        if (!seasonIndex[season][tid][achievementId]) seasonIndex[season][tid][achievementId] = new Set();
        
        seasonIndex[season][tid][achievementId].add(player.pid);
        totalIndexed++;
      }
    }
  }
  
  // Log statistics
  const seasons = Object.keys(seasonIndex).length;
  const achievements = Object.values(seasonIndex).flatMap(season => 
    Object.values(season).flatMap(team => Object.keys(team))
  ).length;
  
  console.log(`✅ Season index built: ${totalIndexed} entries indexed, ${skippedEntries} skipped`);
  console.log(`📊 Coverage: ${seasons} seasons, ${achievements} team-achievement combinations`);
  
  return seasonIndex;
}

/**
 * Get eligible players for a team-achievement combination
 */
export function getSeasonEligiblePlayers(
  seasonIndex: SeasonIndex, 
  teamId: number, 
  achievementId: SeasonAchievementId
): Set<number> {
  const allPlayers = new Set<number>();
  
  // Search across all seasons for this team-achievement combination
  for (const seasonStr of Object.keys(seasonIndex)) {
    const season = parseInt(seasonStr);
    const seasonData = seasonIndex[season];
    if (seasonData[teamId] && seasonData[teamId][achievementId]) {
      for (const pid of Array.from(seasonData[teamId][achievementId])) {
        allPlayers.add(pid);
      }
    }
  }
  
  return allPlayers;
}

/**
 * Get all teams that have players for a specific achievement
 */
export function getTeamsForAchievement(
  seasonIndex: SeasonIndex,
  achievementId: SeasonAchievementId
): Set<number> {
  const teams = new Set<number>();
  
  for (const season of Object.values(seasonIndex)) {
    for (const [teamId, teamData] of Object.entries(season)) {
      if (teamData[achievementId] && teamData[achievementId].size > 0) {
        teams.add(parseInt(teamId));
      }
    }
  }
  
  return teams;
}

/**
 * Season-specific achievement definitions for grid generation
 */
export interface SeasonAchievement {
  id: SeasonAchievementId;
  label: string;
  isSeasonSpecific: true;
  minPlayers: number;
}

export const SEASON_ACHIEVEMENTS: SeasonAchievement[] = [
  // Basketball GM achievements
  {
    id: 'AllStar',
    label: 'All-Star',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'MVP',
    label: 'MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'DPOY',
    label: 'Defensive Player of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'ROY',
    label: 'Rookie of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'SMOY',
    label: 'Sixth Man of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'MIP',
    label: 'Most Improved Player',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FinalsMVP',
    label: 'Finals MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'AllLeagueAny',
    label: 'All-League Team',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'AllDefAny',
    label: 'All-Defensive Team',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'AllRookieAny',
    label: 'All-Rookie Team',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  
  // Football GM achievements
  {
    id: 'FBAllStar',
    label: 'All-Star',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'FBMVP',
    label: 'MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBDPOY',
    label: 'Defensive Player of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBOffROY',
    label: 'Offensive Rookie of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBDefROY',
    label: 'Defensive Rookie of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBAllRookie',
    label: 'All-Rookie Team',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'FBAllLeague1st',
    label: 'First Team All-League',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'FBAllLeague2nd',
    label: 'Second Team All-League',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'FBFinalsMVP',
    label: 'Finals MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBChampion',
    label: 'Won Championship',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBPassLeader',
    label: 'League Passing Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBRecLeader',
    label: 'League Receiving Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBRushLeader',
    label: 'League Rushing Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'FBScrimmageLeader',
    label: 'League Scrimmage Yards Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  
  // Hockey GM achievements
  {
    id: 'HKAllStar',
    label: 'All-Star',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'HKAllStarMVP',
    label: 'All-Star MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKMVP',
    label: 'MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKDPOY',
    label: 'Defensive Player of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKDefForward',
    label: 'Defensive Forward of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKGoalie',
    label: 'Goalie of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKROY',
    label: 'Rookie of the Year',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKAllRookie',
    label: 'All-Rookie Team',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'HKAllLeague',
    label: 'All-League Team',
    isSeasonSpecific: true,
    minPlayers: 5
  },
  {
    id: 'HKPointsLeader',
    label: 'League Points Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKAssistsLeader',
    label: 'League Assists Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKGoalsLeader',
    label: 'League Goals Leader',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKPlayoffsMVP',
    label: 'Playoffs MVP',
    isSeasonSpecific: true,
    minPlayers: 3
  },
  {
    id: 'HKChampion',
    label: 'Won Championship',
    isSeasonSpecific: true,
    minPlayers: 3
  },
];