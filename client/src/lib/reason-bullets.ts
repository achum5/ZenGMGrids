import type { Player, Team, CatTeam } from '@/types/bbgm';
import type { SeasonAchievementId, SeasonIndex } from './season-achievements';
import { getPlayerCareerTotal, parseAchievementLabel, singularizeStatWord, parseCustomAchievementId, createCustomNumericalAchievement, generateUpdatedLabel } from './editable-achievements';
import { getCachedLeagueYears, getCachedSportDetection, getAllAchievements, playerMeetsAchievement } from './achievements';

// Season achievement labels for bullet display
const SEASON_ACHIEVEMENT_LABELS: Partial<Record<SeasonAchievementId, string>> = {
  // Basketball GM achievements
  AllStar: 'All-Star',
  MVP: 'MVP',
  DPOY: 'Defensive Player of the Year',
  ROY: 'Rookie of the Year',
  SMOY: 'Sixth Man of the Year',
  MIP: 'Most Improved Player',
  FinalsMVP: 'Finals MVP',
  SFMVP: 'Conference Finals MVP',
  AllLeagueAny: 'All-League Team',
  AllDefAny: 'All-Defensive Team',
  AllRookieAny: 'All-Rookie Team',
  PointsLeader: 'League Points Leader',
  ReboundsLeader: 'League Rebounds Leader',
  AssistsLeader: 'League Assists Leader',
  StealsLeader: 'League Steals Leader',
  BlocksLeader: 'League Blocks Leader',
  
  // Basketball GM Season Statistical Achievements (24 new achievements)
  Season30PPG: '30+ PPG (Season)',
  Season2000Points: '2,000+ Points (Season)',

  Season200_3PM: '200+ 3PM (Season)',
  Season12RPG: '12+ RPG (Season)',
  Season10APG: '10+ APG (Season)',
  Season800Rebounds: '800+ Rebounds (Season)',
  Season700Assists: '700+ Assists (Season)',
  Season2SPG: '2.0+ SPG (Season)',
  Season2_5BPG: '2.5+ BPG (Season)',
  Season150Steals: '150+ Steals (Season)',
  Season150Blocks: '150+ Blocks (Season)',
  Season200Stocks: '200+ Stocks (Season)',
  Season50_40_90: '50/40/90 Club (Season)',

  Season60eFG500FGA: '60%+ eFG (Season)',
  Season90FT250FTA: '90%+ FT (Season)',
  SeasonFGPercent: '40%+ FG (Season)',
  Season3PPercent: '40%+ 3PT (Season)',

  Season70Games: '70+ Games Played (Season)',
  Season36MPG: '36.0+ MPG (Season)',
  Season25_10: '25/10 Season (PPG/RPG)',
  Season25_5_5: '25/5/5 Season (PPG/RPG/APG)',
  Season20_10_5: '20/10/5 Season (PPG/RPG/APG)',
  Season1_1_1: '1/1/1 Season (SPG/BPG/3PM/G)',
  
  // Football GM achievements
  FBAllStar: 'All-Star',
  FBMVP: 'MVP',
  FBDPOY: 'Defensive Player of the Year',
  FBOffROY: 'Offensive Rookie of the Year',
  FBDefROY: 'Defensive Rookie of the Year',
  FBAllRookie: 'All-Rookie Team',
  FBAllLeague: 'All-League Team',
  FBFinalsMVP: 'Finals MVP',
  FBChampion: 'Won Championship',
  FBSeason4kPassYds: '4,000+ Passing Yards (Season)',
  FBSeason1200RushYds: '1,200+ Rushing Yards (Season)',
  FBSeason100Receptions: '100+ Receptions (Season)',
  FBSeason15Sacks: '15+ Sacks (Season)',
  FBSeason140Tackles: '140+ Tackles (Season)',
  FBSeason5Interceptions: '5+ Interceptions (Season)',
  FBSeason30PassTD: '30+ Passing TD (Season)',
  FBSeason1300RecYds: '1,300+ Receiving Yards (Season)',
  FBSeason10RecTD: '10+ Receiving TD (Season)',
  FBSeason12RushTD: '12+ Rushing TD (Season)',
  FBSeason1600Scrimmage: '1,600+ Yards from Scrimmage (Season)',
  FBSeason2000AllPurpose: '2,000+ All-Purpose Yards (Season)',
  FBSeason15TFL: '15+ Tackles for Loss (Season)',
  
  // Hockey GM achievements
  HKAllStar: 'All-Star',
  HKAllStarMVP: 'All-Star MVP',
  HKMVP: 'MVP',
  HKDefenseman: 'Best Defenseman',
  HKROY: 'Rookie of the Year',
  HKAllRookie: 'All-Rookie Team',
  HKAllLeague: 'All-League Team',
  HKAssistsLeader: 'League Assists Leader',
  HKPlayoffsMVP: 'Playoffs MVP',
  HKChampion: 'Won Championship',
  
  // Hockey GM Season Statistical Achievements (19 new achievements)
  HKSeason40Goals: '40+ Goals (Season)',
  HKSeason60Assists: '60+ Assists (Season)',
  HKSeason90Points: '90+ Points (Season)',
  HKSeason25Plus: '+25 Plus/Minus (Season)',
  HKSeason250Shots: '250+ Shots (Season)',
  HKSeason150Hits: '150+ Hits (Season)',
  HKSeason100Blocks: '100+ Blocks (Season)',
  HKSeason60Takeaways: '60+ Takeaways (Season)',
  HKSeason20PowerPlay: '20+ Power-Play Points (Season)',
  HKSeason3SHGoals: '3+ Short-Handed Goals (Season)',
  HKSeason7GWGoals: '7+ Game-Winning Goals (Season)',
  HKSeason55FaceoffPct: '55%+ Faceoff Win Rate (Season)',
  HKSeason22TOI: '22:00+ TOI per Game (Season)',
  HKSeason70PIM: '70+ PIM (Season)',
  HKSeason920SavePct: '.920+ Save Percentage (Season)',
  HKSeason260GAA: '≤2.60 GAA (Season)',
  HKSeason6Shutouts: '6+ Shutouts (Season)',
  HKSeason2000Saves: '2000+ Saves (Season)',
  HKSeason60Starts: '60+ Starts (Season)',
  
  // Baseball GM achievements
  BBAllStar: 'All-Star',
  BBMVP: 'MVP',
  BBROY: 'Rookie of the Year',
  BBAllRookie: 'All-Rookie Team',
  BBAllLeague: 'All-League Team',
  BBPlayoffsMVP: 'Playoffs MVP',
  BBChampion: 'Won Championship',

  // Additional missing achievements
  Champion: 'Won Championship',
  HKFinalsMVP: 'Finals MVP'
};

// Helper function to calculate seasons where player achieved Season* statistical thresholds
export function getSeasonsForSeasonStatAchievement(player: Player, achievementId: SeasonAchievementId, seasonIndex: SeasonIndex, teamId?: number, customThreshold?: number, customOperator?: '≥' | '≤', minGames: number = 1): string[] {
  if (!player.stats || player.stats.length === 0) return [];
  
  const qualifyingSeasons: number[] = [];

  // Align with grid filtering logic: for '≤' checks, disqualify if career total is zero for this stat.
  if (customOperator === '≤') {
    // This logic needs to be adapted if getStatFieldForAchievement is removed or changed
    // For now, keeping it as is, assuming getStatFieldForAchievement will be available or inlined
    // const statField = getStatFieldForAchievement(achievementId);
    // if (statField) {
    //   const careerTotal = getPlayerCareerTotal(player, statField);
    //   if (careerTotal === 0) {
    //     return []; // Disqualify players who never recorded the stat
    //   }
    // }
  }
  
  // Only check regular season stats (not playoffs)
  const regularSeasonStats = player.stats.filter(s => !s.playoffs);
  
  for (const stat of regularSeasonStats) {
    const season = stat.season;
    // Filter by teamId if provided
    if (teamId !== undefined && (!player.teams || player.teams[season]?.tid !== teamId)) {
      continue;
    }
    const gp = stat.gp || 0;
    const min = stat.min || 0;
    const pts = stat.pts || 0;
    const trb = stat.trb || 0;
    const ast = stat.ast || 0;
    const stl = stat.stl || 0;
    const blk = stat.blk || 0;
    const tp = stat.tpm || stat.tp || 0; // Use tpm as preferred, tp as fallback
    const tpa = stat.tpa || 0; // 3PA
    const fga = stat.fga || 0;
    const fta = stat.fta || 0;
    const ft = stat.ft || 0;
    const fg = stat.fg || 0;
    
    // Helper for dynamic comparison
    const check = (value: number, threshold: number, operator: '≥' | '≤') => {
      if (operator === '≤') return value <= threshold;
      return value >= threshold;
    };

    // Basketball GM Season achievements
    switch (achievementId) {
      case 'Season30PPG':
        if (gp >= minGames && check(pts / gp, customThreshold !== undefined ? customThreshold : 30, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season2000Points':
        if (check(pts, customThreshold !== undefined ? customThreshold : 2000, customOperator || '≥')) qualifyingSeasons.push(season);
        break;

      case 'Season200_3PM':
        if (check(tp, customThreshold !== undefined ? customThreshold : 200, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season12RPG':
        if (gp >= minGames && check(trb / gp, customThreshold !== undefined ? customThreshold : 12, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season10APG':
        if (gp >= minGames && check(ast / gp, customThreshold !== undefined ? customThreshold : 10, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season800Rebounds':
        if (check(trb, customThreshold !== undefined ? customThreshold : 800, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season700Assists':
        if (check(ast, customThreshold !== undefined ? customThreshold : 700, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season2SPG':
        if (gp >= minGames && check(stl / gp, customThreshold !== undefined ? customThreshold : 2.0, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season2_5BPG':
        if (gp >= minGames && check(blk / gp, customThreshold !== undefined ? customThreshold : 2.5, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season150Steals':
        if (check(stl, customThreshold !== undefined ? customThreshold : 150, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season150Blocks':
        if (check(blk, customThreshold !== undefined ? customThreshold : 150, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season200Stocks':
        if (check((stl + blk), customThreshold !== undefined ? customThreshold : 200, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season50_40_90':
        if (fga >= 400 && tpa >= 100 && fta >= 100) {
          const fgPct = fg / fga;
          const tpPct = tp / tpa;
          const ftPct = ft / fta;
          if (check(fgPct, customThreshold !== undefined ? customThreshold / 100 : 0.50, customOperator || '≥') &&
              check(tpPct, customThreshold !== undefined ? customThreshold / 100 : 0.40, customOperator || '≥') &&
              check(ftPct, customThreshold !== undefined ? customThreshold / 100 : 0.90, customOperator || '≥')) {
            qualifyingSeasons.push(season);
          }
        }
        break;

      case 'Season60eFG500FGA':
        if (fga >= 500) {
          const eFG = (fg + 0.5 * tp) / fga;
          if (check(eFG, customThreshold !== undefined ? customThreshold / 100 : 0.60, customOperator || '≥')) qualifyingSeasons.push(season);
        }
        break;
    case 'Season90FT250FTA':
        if (fta >= 250 && check(ft / fta, customThreshold !== undefined ? customThreshold / 100 : 0.90, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
    case 'SeasonFGPercent':
        if (fga >= 300 && check(fg / fga, customThreshold !== undefined ? customThreshold / 100 : 0.40, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
    case 'Season3PPercent':
        if (tpa >= 100 && check(tp / tpa, customThreshold !== undefined ? customThreshold / 100 : 0.40, customOperator || '≥')) qualifyingSeasons.push(season);
        break;

      case 'Season70Games':
        if (check(gp, customThreshold !== undefined ? customThreshold : 70, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season36MPG':
        if (gp >= minGames && check(min / gp, customThreshold !== undefined ? customThreshold : 36.0, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season25_10':
        if (gp >= minGames && check(pts / gp, customThreshold !== undefined ? customThreshold : 25, customOperator || '≥') && check(trb / gp, customThreshold !== undefined ? customThreshold : 10, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season25_5_5':
        if (gp >= minGames && check(pts / gp, customThreshold !== undefined ? customThreshold : 25, customOperator || '≥') && check(trb / gp, customThreshold !== undefined ? customThreshold : 5, customOperator || '≥') && check(ast / gp, customThreshold !== undefined ? customThreshold : 5, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season20_10_5':
        if (gp >= minGames && check(pts / gp, customThreshold !== undefined ? customThreshold : 20, customOperator || '≥') && check(trb / gp, customThreshold !== undefined ? customThreshold : 10, customOperator || '≥') && check(ast / gp, customThreshold !== undefined ? customThreshold : 5, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'Season1_1_1':
        if (gp >= minGames && check(stl / gp, customThreshold !== undefined ? customThreshold : 1, customOperator || '≥') && check(blk / gp, customThreshold !== undefined ? customThreshold : 1, customOperator || '≥') && check(tp / gp, customThreshold !== undefined ? customThreshold : 1, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
        
      // Football GM Season achievements would go here
      case 'FBSeason4kPassYds':
        if (check((stat as any).pssYds, customThreshold !== undefined ? customThreshold : 4000, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      case 'FBSeason1200RushYds':
        if (check((stat as any).rushYds, customThreshold !== undefined ? customThreshold : 1200, customOperator || '≥')) qualifyingSeasons.push(season);
        break;
      // Add more FB achievements as needed...
        
      // Hockey GM Season achievements would go here  
      // Add HK achievements as needed...
        
      // Baseball GM Season achievements would go here
      // Add BB achievements as needed...
      
    }
  }
  
  // Remove duplicates and sort
  const uniqueSeasons = qualifyingSeasons.filter((value, index, self) => self.indexOf(value) === index).sort();
  return uniqueSeasons.map(s => s.toString());
}

// Helper function to extract season achievement data from player
export function getSeasonAchievementSeasons(player: Player, achievementId: SeasonAchievementId, teams: Team[], seasonIndex: SeasonIndex, teamId?: number, sport?: string): Array<{ season: number; teamAbbrev?: string }> {
  let baseAchievementId: SeasonAchievementId = achievementId;
  let customThreshold: number | undefined;
  let customOperator: '≥' | '≤' | undefined;

  // Check if it's a custom numerical achievement
  if (achievementId.includes('_custom_')) {
    const parts = achievementId.split('_custom_');
    baseAchievementId = parts[0] as SeasonAchievementId;
    const customParts = parts[1].split('_');
    customThreshold = parseFloat(customParts[0]);
    customOperator = customParts[1] === 'lte' ? '≤' : '≥';
  }

  // Handle championship achievements specifically
  if (baseAchievementId.includes('Champion')) {
    if (player.achievementSeasons?.champion && player.achievementSeasons.champion.size > 0) {
      const filteredSeasons = teamId !== undefined
        ? Array.from(player.achievementSeasons.champion).filter(s => player.teams && player.teams[s]?.tid === teamId)
        : Array.from(player.achievementSeasons.champion);
      return filteredSeasons.sort((a, b) => a - b).map(s => {
        const teamSeason = player.seasons?.find(ps => ps.season === s && ps.tid !== undefined);
        const team = teamSeason ? teams.find(t => t.tid === teamSeason.tid) : undefined;
        return { season: s, teamAbbrev: team?.abbrev || '' };
      });
    }
    // Fallback to player.awards if achievementSeasons.champion is not available or empty
    if (!player.awards) return [];

    const championshipAwards = player.awards
      .filter(award => award.type.includes('Won Championship') || award.type.includes('Championship'))
      .filter(award => teamId === undefined || (player.teams && player.teams[award.season]?.tid === teamId)) // Add teamId filter here
      .map(award => award.season);

    const uniqueChampionshipYears = [...new Set(championshipAwards)].sort((a, b) => a - b);
    return uniqueChampionshipYears.map(s => {
      const teamSeason = player.seasons?.find(ps => ps.season === s && ps.tid !== undefined);
      const team = teamSeason ? teams.find(t => t.tid === teamSeason.tid) : undefined;
      return { season: s, teamAbbrev: team?.abbrev || '' };
    });
  }

  // Handle Season* statistical achievements by calculating from stats
  if (baseAchievementId.startsWith('Season') || baseAchievementId.startsWith('FBSeason') || baseAchievementId.startsWith('HKSeason') || baseAchievementId.startsWith('BBSeason')) {
    // Need to get the minGames from the original achievement definition
    const allAchievements = getAllAchievements(sport as any);
    const baseAchievement = allAchievements.find(ach => ach.id === baseAchievementId);
    const minGamesForAchievement = baseAchievement?.minPlayers || 1; // Default to 1 game if not specified

    const seasons = getSeasonsForSeasonStatAchievement(player, baseAchievementId, seasonIndex, teamId, customThreshold, customOperator, minGamesForAchievement);
    return seasons.map(s => {
      const seasonNum = parseInt(s, 10);
      const teamSeason = player.seasons?.find(ps => ps.season === seasonNum && ps.tid !== undefined);
      const team = teamSeason ? teams.find(t => t.tid === teamSeason.tid) : undefined;
      return { season: seasonNum, teamAbbrev: team?.abbrev || '' };
    });
  }

  // Handle other award-based achievements
  if (!player.awards) return [];

  const awardMap: Record<string, string[]> = {
    'AllStar': ['All-Star'],
    'MVP': ['Most Valuable Player'],
    'DPOY': ['Defensive Player of the Year', 'DPOY'],
    'ROY': ['Rookie of the Year'],
    'SMOY': ['Sixth Man of the Year'],
    'MIP': ['Most Improved Player'],
    'FinalsMVP': ['Finals MVP'],
    'AllLeagueAny': ['All-League'],
    'AllDefAny': ['All-Defensive'],
    'AllRookieAny': ['All-Rookie'],
    'PointsLeader': ['Points Leader'],
    'ReboundsLeader': ['Rebounds Leader'],
    'AssistsLeader': ['Assists Leader'],
    'StealsLeader': ['Steals Leader'],
    'BlocksLeader': ['Blocks Leader'],
    'Champion': ['Won Championship', 'Championship'],
    'FBAllStar': ['All-Star'],
    'FBMVP': ['MVP'],
    'FBDPOY': ['Defensive Player of the Year'],
    'FBOffROY': ['Offensive Rookie of the Year'],
    'FBDefROY': ['Defensive Rookie of the Year'],
    'FBAllRookie': ['All-Rookie Team'],
    'FBAllLeague': ['All-League Team'],
    'FBFinalsMVP': ['Finals MVP'],
    'FBChampion': ['Won Championship'],
    'HKAllStar': ['All-Star'],
    'HKMVP': ['MVP'],
    'HKROY': ['Rookie of the Year'],
    'HKAllRookie': ['All-Rookie Team'],
    'HKAllLeague': ['All-League Team'],
    'HKPlayoffsMVP': ['Playoffs MVP'],
    'HKChampion': ['Won Championship'],
    'HKFinalsMVP': ['Finals MVP'],
    'BBAllStar': ['All-Star'],
    'BBMVP': ['MVP'],
    'BBROY': ['Rookie of the Year'],
    'BBAllRookie': ['All-Rookie Team'],
    'BBAllLeague': ['All-League Team'],
    'BBPlayoffsMVP': ['Playoffs MVP'],
    'BBChampion': ['Won Championship'],
  };

  const awardTypesToLookFor = awardMap[baseAchievementId];
  if (!awardTypesToLookFor) {
    return [];
  }

  const seasonsWithTeams: { season: number; teamAbbrev?: string }[] = [];

  player.awards
    .filter(award => awardTypesToLookFor.some(type => award.type.includes(type)))
    .filter(award => teamId === undefined || (player.teams && player.teams[award.season]?.tid === teamId)) // Re-add teamId filter here with optional chaining
    .forEach(award => {
      let teamAbbrev: string | undefined;
      // Always try to find the team abbreviation for that season
      const teamSeason = player.seasons?.find(s => s.season === award.season && s.tid !== undefined);
      console.log(`Award Season: ${award.season}, Player Seasons: ${JSON.stringify(player.seasons)}`);
      if (teamSeason) {
        const team = teams.find(t => t.tid === teamSeason.tid);
        console.log(`Team Season: ${JSON.stringify(teamSeason)}, Found Team: ${JSON.stringify(team)}`);
        if (team) {
          teamAbbrev = team.abbrev;
        }
      }
      seasonsWithTeams.push({ season: award.season, teamAbbrev });
    });

  // Sort by season and then filter unique seasons (if teamAbbrev is the same for a season)
  const uniqueSeasonsMap = new Map<string, { season: number; teamAbbrev?: string }>();
  seasonsWithTeams.forEach(item => {
    const key = item.season.toString() + (item.teamAbbrev ? `-${item.teamAbbrev}` : '');
    if (!uniqueSeasonsMap.has(key)) {
      uniqueSeasonsMap.set(key, item);
    }
  });

  const sortedUniqueSeasons = Array.from(uniqueSeasonsMap.values())
    .sort((a, b) => a.season - b.season);

  return sortedUniqueSeasons;
}

// Helper function to group consecutive years into ranges
export function groupConsecutiveYears(years: number[]): string[] {
  if (years.length === 0) return [];
  if (years.length === 1) return [years[0].toString()];
  
  const sortedYears = [...years].sort((a, b) => a - b);
  const groups: string[] = [];
  let start = sortedYears[0];
  let end = sortedYears[0];
  
  for (let i = 1; i < sortedYears.length; i++) {
    if (sortedYears[i] === end + 1) {
      // Consecutive year, extend the range
      end = sortedYears[i];
    } else {
      // Non-consecutive year, close the current range
      if (start === end) {
        groups.push(start.toString());
      } else {
        groups.push(`${start}–${end}`);
      }
      start = sortedYears[i];
      end = sortedYears[i];
    }
  }
  
  // Add the final range
  if (start === end) {
    groups.push(start.toString());
  } else {
    groups.push(`${start}–${end}`);
  }
  
  return groups;
}

// Helper function to format season list for bullets
export function formatBulletSeasonList(seasonsWithTeams: Array<{ season: number; teamAbbrev?: string }>): string {
  if (seasonsWithTeams.length === 0) return '';

  // Group seasons by team abbreviation
  const teamSeasonMap = new Map<string, number[]>();
  seasonsWithTeams.forEach(item => {
    const teamKey = item.teamAbbrev || ''; // Use empty string for no team
    if (!teamSeasonMap.has(teamKey)) {
      teamSeasonMap.set(teamKey, []);
    }
    teamSeasonMap.get(teamKey)!.push(item.season);
  });

  const formattedEntries: string[] = [];

  // Process each team's seasons
  teamSeasonMap.forEach((years, teamAbbrev) => {
    const sortedYears = [...years].sort((a, b) => a - b);
    const yearRanges: string[] = [];
    let start = sortedYears[0];
    let end = sortedYears[0];

    for (let i = 1; i < sortedYears.length; i++) {
      if (sortedYears[i] === end + 1) {
        end = sortedYears[i];
      } else {
        if (start === end) {
          yearRanges.push(start.toString());
        } else {
          yearRanges.push(`${start}–${end}`);
        }
        start = sortedYears[i];
        end = sortedYears[i];
      }
    }
    // Add the last range
    if (start === end) {
      yearRanges.push(start.toString());
    } else {
      yearRanges.push(`${start}–${end}`);
    }

    const teamSuffix = teamAbbrev ? ` – ${teamAbbrev}` : '';
    formattedEntries.push(...yearRanges.map(range => `${range}${teamSuffix}`));
  });

  // Sort entries by year (first year in range) to maintain chronological order
  formattedEntries.sort((a, b) => {
    const yearA = parseInt(a.split('–')[0], 10);
    const yearB = parseInt(b.split('–')[0], 10);
    return yearA - yearB;
  });

  return `(${formattedEntries.join('; ')})`;
}

// Helper function to get team year range from stats
export function getTeamYearRange(player: Player, teamId: number, sport: string): string {
  if (!player.stats) return '';
  
  const seasons = player.stats
    .filter(s => s.tid === teamId && !s.playoffs && (s.gp || 0) > 0)
    .map(s => s.season)
    .sort((a, b) => a - b);
  
  if (seasons.length === 0) return '';
  if (seasons.length === 1) {
    if (sport === 'basketball' || sport === 'hockey') {
      return `${seasons[0]}–${seasons[0]}`;
    } else {
      return seasons[0].toString();
    }
  }
  
  return `${seasons[0]}–${seasons[seasons.length - 1]}`;
}

interface ParsedSeasonAchievement {
  threshold: number;
  operator: '>=' | '≤' | '<';
  statName: string;
  isRateStat: boolean;
  originalLabel: string;
}

function parseSeasonAchievementDetails(achievementId: string, achievementLabel: string, sport: string): ParsedSeasonAchievement | null {
  // Handle 50/40/90 separately as it's a composite
  if (achievementId === 'Season50_40_90') {
    return {
      threshold: 0, // Not a single numerical threshold
      operator: '>=',
      statName: '50/40/90',
      isRateStat: true,
      originalLabel: achievementLabel,
    };
  }

  // Regex to capture threshold, operator, and stat name
  // Examples:
  // "30+ PPG (Season)" -> 30, +, PPG
  // "2,000+ Points (Season)" -> 2000, +, Points
  // "≤2.60 GAA (Season)" -> 2.60, ≤, GAA
  // "55%+ Faceoff Win Rate (Season)" -> 55, %, Faceoff Win Rate
  // "Under 2,000 Points in a Season" -> 2000, <, Points

  let match;

  // Pattern for "Under N StatName"
  match = achievementLabel.match(/Under\s+([\d,.]+)\s+(.+)(?:\s+\(Season\))?/i);
  if (match) {
    return {
      threshold: parseFloat(match[1].replace(/,/g, '')),
      operator: '<',
      statName: match[2].trim(),
      isRateStat: achievementLabel.includes('%') || achievementLabel.includes('GAA') || achievementLabel.includes('TOI'),
      originalLabel: achievementLabel,
    };
  }

  // Pattern for "N+ StatName" or "N StatName or fewer"
  match = achievementLabel.match(/([\d,.]+)(?:\+|%|\s+or\s+fewer)?\s*(.+)(?:\s+\(Season\))?/i);
  if (match) {
    const threshold = parseFloat(match[1].replace(/,/g, ''));
    let operator: '>=' | '≤' | '<' = '>=';
    if (achievementLabel.includes('or fewer') || achievementLabel.includes('≤')) {
      operator = '≤';
    } else if (achievementLabel.includes('+') || achievementLabel.includes('%')) {
      operator = '>=';
    }

    let statName = match[2].trim();
    // Clean up statName from common suffixes like "(Season)"
    statName = statName.replace(/\s*\(Season\)/i, '').trim();
    
    // Normalize specific stat names
    if (statName === 'Save Percentage') {
      statName = 'Save%';
    } else if (statName === 'Faceoff Win Rate') {
      statName = 'Faceoff%';
    } else if (statName === 'TOI per Game') {
      statName = 'TOI/G';
    }

    const isRateStat = achievementLabel.includes('%') || achievementLabel.includes('GAA') || achievementLabel.includes('TOI');

    return {
      threshold,
      operator,
      statName,
      isRateStat,
      originalLabel: achievementLabel,
    };
  }

  // Fallback for cases like "2.60 or less GAA in a Season" where the operator is at the start
  match = achievementLabel.match(/(?:≤|>=)\s*([\d,.]+)\s*(.+)(?:\s+\(Season\))?/i);
  if (match) {
    const threshold = parseFloat(match[1].replace(/,/g, ''));
    let operator: '>=' | '≤' | '<' = '>=';
    if (achievementLabel.includes('≤')) {
      operator = '≤';
    } else if (achievementLabel.includes('>=')) {
      operator = '>=';
    }
    let statName = match[2].trim();
    statName = statName.replace(/\s*\(Season\)/i, '').trim();
    const isRateStat = achievementLabel.includes('%') || achievementLabel.includes('GAA') || achievementLabel.includes('TOI');

    return {
      threshold,
      operator,
      statName,
      isRateStat,
      originalLabel: achievementLabel,
    };
  }

  return null;
}

export function formatAwardYears(seasonsWithTeams: Array<{ season: number; teamAbbrev?: string }>): string {
  if (seasonsWithTeams.length === 0) return '';

  const formattedEntries: string[] = [];

  seasonsWithTeams.forEach(item => {
    const teamSuffix = item.teamAbbrev ? ` – ${item.teamAbbrev}` : '';
    formattedEntries.push(`${item.season}${teamSuffix}`);
  });

  return `(${formattedEntries.join('; ')})`;
}

function getPlayerRoyMvpYears(player: Player): { royYear?: number; mvpYear?: number } | null {
  if (!player.awards) return null;

  const royAwards = player.awards.filter(a => a.type === 'Rookie of the Year');
  const mvpAwards = player.awards.filter(a => a.type === 'Most Valuable Player');

  for (const roy of royAwards) {
    for (const mvp of mvpAwards) {
      if (mvp.season > roy.season) {
        return { royYear: roy.season, mvpYear: mvp.season };
      }
    }
  }
  return null;
}

function getPlayerMaxAge(player: Player): number | null {
  if (!player.stats || !player.born?.year) return null;
  let maxAge = 0;
  player.stats.forEach(s => {
    if (!s.playoffs && (s.gp || 0) > 0) {
      const age = s.season - player.born!.year;
      if (age > maxAge) {
        maxAge = age;
      }
    }
  });
  return maxAge > 0 ? maxAge : null;
}

function getPlayerDebutAge(player: Player): number | null {
  if (!player.stats || !player.born?.year) return null;
  let debutSeason: number | null = null;
  player.stats.forEach(s => {
    if (!s.playoffs && (s.gp || 0) > 0) {
      if (debutSeason === null || s.season < debutSeason) {
        debutSeason = s.season;
      }
    }
  });
  if (debutSeason !== null) {
    return debutSeason - player.born.year;
  }
  return null;
}

function getPlayerSeasonsPlayed(player: Player): number {
  if (!player.stats) return 0;
  const seasonsPlayed = new Set<number>();
  player.stats.forEach((s: any) => {
    if (!s.playoffs && (s.gp || 0) > 0) {
      seasonsPlayed.add(s.season);
    }
  });
  return seasonsPlayed.size;
}

function getPlayerFranchisesPlayed(player: Player): number {
  if (!player.stats) return 0;
  const uniqueTids = new Set(player.stats.filter(s => !s.playoffs && (s.gp || 0) > 0).map(s => s.tid));
  return uniqueTids.size;
}

function getPlayerHallOfFameStatus(player: Player): { isHoF: boolean; year?: number } {
  if (!player.awards) return { isHoF: false };
  const hofAward = player.awards.find((a: any) => a.type === 'Inducted into the Hall of Fame');
  if (hofAward) {
    return { isHoF: true, year: hofAward.season };
  }
  return { isHoF: false };
}

export function generatePlayerGuessFeedback(player: Player, rowConstraint: CatTeam, colConstraint: CatTeam, teams: Team[], sport: string, seasonIndex: SeasonIndex, isCorrectGuess: boolean = true): string[] {

  const bullets: string[] = [];



  // --- Row Bullet ---

    if (rowConstraint.type === 'team') {

      const team = teams.find(t => t.tid === rowConstraint.tid);

          const teamName = rowConstraint.label || (team ? `${team.region} ${team.name}` : `Team ${rowConstraint.tid}`);

          const teamYearRange = getTeamYearRange(player, rowConstraint.tid!, sport);

  

      if (teamYearRange === '') {

        bullets.push(`• Never played for the ${teamName}`);

      } else {

        bullets.push(`• Played for ${teamName} (${teamYearRange})`);

      }
    } else if (rowConstraint.type === 'achievement') {
    const achievementId = rowConstraint.achievementId!;
    const achievementLabel = rowConstraint.label;

    const achievementYears = getSeasonAchievementSeasons(player, achievementId as SeasonAchievementId, teams, seasonIndex, rowConstraint.tid, sport);

    let finalAchievementLabel = achievementLabel;

    // Handle draft achievements
    if (player.draft) {
      if (achievementId === 'isPick1Overall' || achievementId === 'isFirstRoundPick') {
        if (player.draft.round && player.draft.pick && player.draft.year) {
          finalAchievementLabel = `Round ${player.draft.round} Pick ${player.draft.pick} (${player.draft.year})`;
        }
      } else if (achievementId === 'isUndrafted') {
        if (player.draft.year) {
          finalAchievementLabel = `Undrafted (${player.draft.year})`;
        }
      }
    }

    // Handle career counting achievements
    if (achievementId.startsWith('career')) {
      const careerStats = getCareerStatDetails(player, achievementId, sport);
      if (careerStats) {
        finalAchievementLabel = `${careerStats.value.toLocaleString()} Career ${careerStats.statName}`;
      }
    }

    // Handle seasons played achievement
    if (achievementId === 'played15PlusSeasons') {
      const seasons = getPlayerSeasonsPlayed(player);
      finalAchievementLabel = `Played ${seasons} seasons`;
    }

    // Handle franchises played achievement
    if (achievementId === 'played5PlusFranchises') {
      const franchises = getPlayerFranchisesPlayed(player);
      finalAchievementLabel = `Played for ${franchises} franchises`;
    }

    // Handle Hall of Fame achievement
    if (achievementId === 'isHallOfFamer') {
      const hofStatus = getPlayerHallOfFameStatus(player);
      if (hofStatus.isHoF) {
        finalAchievementLabel = `Hall of Fame inductee${hofStatus.year ? ` (${hofStatus.year})` : ''}`;
      } else {
        finalAchievementLabel = `Not in the Hall of Fame`;
      }
    }

    // Handle "Played in the YYYYs" achievements
    if (achievementId.startsWith('playedIn') && achievementId.endsWith('s')) {
      if (player.decadesPlayed && player.decadesPlayed.size > 0) {
        const decades = Array.from(player.decadesPlayed).sort((a, b) => a - b);
        const minDecade = decades[0];
        const maxDecade = decades[decades.length - 1];
        finalAchievementLabel = `Played from ${minDecade}–${maxDecade}`;
      }
    }

    // Handle "Debuted in the YYYYs" achievements
    if (achievementId.startsWith('debutedIn') && achievementId.endsWith('s')) {
      if (player.debutDecade) {
        finalAchievementLabel = `Debuted in ${player.debutDecade}`;
      }
    }

    // Handle "Played at age N+" achievement (e.g., playedAtAge40Plus)
    if (achievementId === 'playedAtAge40Plus') {
      const maxAge = getPlayerMaxAge(player);
      if (maxAge !== null) {
        finalAchievementLabel = `Played until age ${maxAge}`;
      }
    }

    // Handle Awards, Honors, and Leader achievements
            const isAwardOrLeader = Object.keys(SEASON_ACHIEVEMENT_LABELS).includes(achievementId);
            if (isAwardOrLeader) {
              const awardName = SEASON_ACHIEVEMENT_LABELS[achievementId as SeasonAchievementId] || finalAchievementLabel.replace(/\s*\(Season\)/gi, '').trim();
              const achievementYearsFormatted = formatAwardYears(achievementYears);
              const count = achievementYears.length;
    
              if (playerAchieved) {
                const countPrefix = count > 1 ? `${count}x ` : '';
                bullets.push(`• ${countPrefix}${awardName}${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);
              } else {
                if (awardName.includes('Leader')) {
                  bullets.push(`• Never was League ${awardName}`);
                } else {
                  bullets.push(`• Never won ${awardName}`);
                }
              }
            } else if (achievementId === 'royLaterMVP') {
              if (playerAchieved) {
                const royMvpYears = getPlayerRoyMvpYears(player);
                if (royMvpYears?.royYear && royMvpYears.mvpYear) {
                  bullets.push(`• ROY (${royMvpYears.royYear}) → MVP (${royMvpYears.mvpYear})`);
                }
              } else {
                bullets.push(`• Never both ROY and MVP`);
              }
            } else if (achievementId.startsWith('Season') || achievementId.startsWith('FBSeason') || achievementId.startsWith('HKSeason') || achievementId.startsWith('BBSeason')) {
              const parsedDetails = parseSeasonAchievementDetails(achievementId, achievementLabel, sport);
              const achievementYearsFormatted = formatAwardYears(achievementYears);
    
              if (parsedDetails) {
                if (achievementId === 'Season50_40_90') {
                  if (playerAchieved) {
                    bullets.push(`• 50/40/90${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);
                  } else {
                    bullets.push(`• Never had a 50/40/90 season`);
                  }
                } else if (parsedDetails.isRateStat) {
                  // Rate stat thresholds
                  const formattedThreshold = parsedDetails.isRateStat && parsedDetails.statName.includes('%')
                    ? `${(parsedDetails.threshold * 100).toFixed(parsedDetails.threshold % 1 !== 0 ? 1 : 0)}`
                    : parsedDetails.threshold.toLocaleString(undefined, { minimumFractionDigits: parsedDetails.threshold % 1 !== 0 ? 1 : 0 });
                  const label = parsedDetails.statName;
                  const percentSuffix = parsedDetails.isRateStat && parsedDetails.statName.includes('%') ? '%' : '';
    
                  if (playerAchieved) {
                    if (parsedDetails.operator === '>=') {
                      bullets.push(`• ${formattedThreshold}+ ${label}${percentSuffix}${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);
                    } else if (parsedDetails.operator === '≤') {
                      bullets.push(`• ${formattedThreshold} ${label} or lower${percentSuffix}${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);
                    }
                  } else {
                    if (parsedDetails.operator === '>=') {
                      bullets.push(`• Never had ${formattedThreshold}+ ${label}${percentSuffix} in a season`);
                    } else if (parsedDetails.operator === '≤') {
                      bullets.push(`• Never had ${formattedThreshold} or lower ${label}${percentSuffix} in a season`);
                    }
                  }
                } else {
                  // Counting stat thresholds
                  const formattedThreshold = parsedDetails.threshold.toLocaleString();
                  const label = parsedDetails.statName;
    
                  if (playerAchieved) {
                    if (parsedDetails.operator === '>=') {
                      bullets.push(`• ${formattedThreshold}+ ${label}${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);
                    } else if (parsedDetails.operator === '≤') {
                      bullets.push(`• ${formattedThreshold} ${label} or fewer${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);
                    } else if (parsedDetails.operator === '<') {
                      bullets.push(`• Under ${formattedThreshold} ${label}${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);
                    }
                  } else {
                    if (parsedDetails.operator === '>=') {
                      bullets.push(`• Never had ${formattedThreshold}+ ${label} in a season`);
                    } else if (parsedDetails.operator === '≤') {
                      bullets.push(`• Never had ${formattedThreshold} or fewer ${label} in a season`);
                    } else if (parsedDetails.operator === '<') {
                      bullets.push(`• Never had under ${formattedThreshold} ${label} in a season`);
                    }
                  }
                }
              } else {
                // Fallback if parsing fails for a season achievement
                if (playerAchieved) {
                  bullets.push(`• ${finalAchievementLabel}`);
                }
                else {
                  bullets.push(`• Never achieved: ${finalAchievementLabel}`);
                }
              }
            } else {
              // Generic fallback for achievements not covered by specific handlers
              if (playerAchieved) {
                if (isChampionship) {
                  const formattedYears = formatBulletSeasonList(achievementYears);
                  const count = achievementYears.length;
                  const championshipText = count > 1 ? `${count} Championships` : `a Championship`;
                  bullets.push(`• Won ${championshipText}${formattedYears ? ` ${formattedYears}` : ''}`);
                } else {
                  bullets.push(`• ${finalAchievementLabel}`);
                }
              } else {
                if (isChampionship) {
                  bullets.push(`• Never won a Championship`);
                } else {
                  bullets.push(`• Never achieved: ${finalAchievementLabel}`);
                }
              }
            }
            const parsedCustom = parseCustomAchievementId(achievementId);


  // --- Column Bullet ---

    if (colConstraint.type === 'team') {

      const colTeam = teams.find(t => t.tid === colConstraint.tid);

          const colTeamName = colConstraint.label || (colTeam ? `${colTeam.region} ${colTeam.name}` : `Team ${colConstraint.tid}`);

          const colTeamYearRange = getTeamYearRange(player, colConstraint.tid!, sport);

  

      if (colTeamYearRange === '') {

        bullets.push(`• Never played for the ${colTeamName}`);

      } else {

        bullets.push(`• Played for ${colTeamName} (${colTeamYearRange})`);

      }

      } else if (colConstraint.type === 'achievement') {

        const achievementId = colConstraint.achievementId!;

        const achievementLabel = colConstraint.label;

    

        const teamIdForAchievementCheck = rowConstraint.type === 'team' ? rowConstraint.tid : undefined;

        const achievementYears = getSeasonAchievementSeasons(player, achievementId as SeasonAchievementId, teams, seasonIndex, teamIdForAchievementCheck, sport);

    

        let finalAchievementLabel = achievementLabel;

    

                // Handle draft achievements

    

                if (player.draft) {

    

                  if (achievementId === 'isPick1Overall' || achievementId === 'isFirstRoundPick') {

    

                    if (player.draft.round && player.draft.pick && player.draft.year) {

    

                      finalAchievementLabel = `Round ${player.draft.round} Pick ${player.draft.pick} (${player.draft.year})`;

    

                    }

    

                  } else if (achievementId === 'isUndrafted') {

    

                    if (player.draft.year) {

    

                      finalAchievementLabel = `Undrafted (${player.draft.year})`;

    

                    }

    

                  }

    

                }

    

        

    

                        // Handle career counting achievements

    

        

    

                        if (achievementId.startsWith('career')) {

    

        

    

                          const careerStats = getCareerStatDetails(player, achievementId, sport);

    

        

    

                          if (careerStats) {

    

        

    

                            finalAchievementLabel = `${careerStats.value.toLocaleString()} Career ${careerStats.statName}`;

    

        

    

                          }

    

        

    

                        }

    

        

    

                

    

        

    

                        // Handle seasons played achievement

    

        

    

                        if (achievementId === 'played15PlusSeasons') {

    

        

    

                          const seasons = getPlayerSeasonsPlayed(player);

    

        

    

                          finalAchievementLabel = `Played ${seasons} seasons`;

    

        

    

                        }

    

        

    

                

    

        

    

                        // Handle franchises played achievement

    

        

    

                        if (achievementId === 'played5PlusFranchises') {

    

        

    

                          const franchises = getPlayerFranchisesPlayed(player);

    

        

    

                          finalAchievementLabel = `Played for ${franchises} franchises`;

    

        

    

                        }

    

        

    

                

    

        

    

                                // Handle Hall of Fame achievement

    

        

    

                

    

        

    

                                if (achievementId === 'isHallOfFamer') {

    

        

    

                

    

        

    

                                  const hofStatus = getPlayerHallOfFameStatus(player);

    

        

    

                

    

        

    

                                  if (hofStatus.isHoF) {

    

        

    

                

    

        

    

                                    finalAchievementLabel = `Hall of Fame inductee${hofStatus.year ? ` (${hofStatus.year})` : ''}`;

    

        

    

                

    

        

    

                                  } else {

    

        

    

                

    

        

    

                                    finalAchievementLabel = `Not in the Hall of Fame`;

    

        

    

                

    

        

    

                                  }

    

        

    

                

    

        

    

                                }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                // Handle "Played in the YYYYs" achievements

    

        

    

                

    

        

    

                                if (achievementId.startsWith('playedIn') && achievementId.endsWith('s')) {

    

        

    

                

    

        

    

                                  if (player.decadesPlayed && player.decadesPlayed.size > 0) {

    

        

    

                

    

        

    

                                    const decades = Array.from(player.decadesPlayed).sort((a, b) => a - b);

    

        

    

                

    

        

    

                                    const minDecade = decades[0];

    

        

    

                

    

        

    

                                    const maxDecade = decades[decades.length - 1];

    

        

    

                

    

        

    

                                    finalAchievementLabel = `Played from ${minDecade}–${maxDecade}`;

    

        

    

                

    

        

    

                                  }

    

        

    

                

    

        

    

                                }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                        // Handle "Debuted in the YYYYs" achievements

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                        if (achievementId.startsWith('debutedIn') && achievementId.endsWith('s')) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                          if (player.debutDecade) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                            finalAchievementLabel = `Debuted in ${player.debutDecade}`;

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                          }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                        }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                // Handle "Played at age N+" achievement (e.g., playedAtAge40Plus)

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                if (achievementId === 'playedAtAge40Plus') {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                  const maxAge = getPlayerMaxAge(player);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                  if (maxAge !== null) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                    finalAchievementLabel = `Played until age ${maxAge}`;

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                  }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                        

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                // Handle Awards, Honors, and Leader achievements

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                const isAwardOrLeader = Object.keys(SEASON_ACHIEVEMENT_LABELS).includes(achievementId);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                if (isAwardOrLeader) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                  const awardName = SEASON_ACHIEVEMENT_LABELS[achievementId as SeasonAchievementId] || finalAchievementLabel.replace(/\s*\(Season\)/gi, '').trim();

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                  const achievementYearsFormatted = formatAwardYears(achievementYears);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                  const count = achievementYears.length;

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                        

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                  if (playerAchieved) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                    const countPrefix = count > 1 ? `${count}x ` : '';

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                    bullets.push(`• ${countPrefix}${awardName}${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                  } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                    if (awardName.includes('Leader')) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                      bullets.push(`• Never was League ${awardName}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                    } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                      bullets.push(`• Never won ${awardName}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                    }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                  }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                  // Fallback for other achievements (e.g., custom numerical, combined awards)

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                  if (achievementId === 'royLaterMVP') {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                    if (playerAchieved) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                      const royMvpYears = getPlayerRoyMvpYears(player);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                      if (royMvpYears?.royYear && royMvpYears.mvpYear) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                        bullets.push(`• ROY (${royMvpYears.royYear}) → MVP (${royMvpYears.mvpYear})`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                      }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                    } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                      bullets.push(`• Never both ROY and MVP`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                    }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                            } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                              if (playerAchieved) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                if (isChampionship) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                  const formattedYears = formatBulletSeasonList(achievementYears);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                  const count = achievementYears.length;

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                  const championshipText = count > 1 ? `${count} Championships` : `a Championship`;

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                  bullets.push(`• Won ${championshipText}${formattedYears ? ` ${formattedYears}` : ''}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                  bullets.push(`• ${finalAchievementLabel}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                              } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                if (isChampionship) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                  bullets.push(`• Never won a Championship`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                  bullets.push(`• Never achieved: ${finalAchievementLabel}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                              }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                            }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                          }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                        } else if (achievementId.startsWith('Season') || achievementId.startsWith('FBSeason') || achievementId.startsWith('HKSeason') || achievementId.startsWith('BBSeason')) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                          const parsedDetails = parseSeasonAchievementDetails(achievementId, achievementLabel, sport);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                          const achievementYearsFormatted = formatAwardYears(achievementYears);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                  

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                          if (parsedDetails) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                            if (achievementId === 'Season50_40_90') {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                              if (playerAchieved) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                bullets.push(`• 50/40/90${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                              } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                bullets.push(`• Never had a 50/40/90 season`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                              }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                            } else if (parsedDetails.isRateStat) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                              // Rate stat thresholds

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                          const formattedThreshold = parsedDetails.isRateStat && parsedDetails.statName.includes('%')

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            ? `${(parsedDetails.threshold * 100).toFixed(parsedDetails.threshold % 1 !== 0 ? 1 : 0)}`

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            : parsedDetails.threshold.toLocaleString(undefined, { minimumFractionDigits: parsedDetails.threshold % 1 !== 0 ? 1 : 0 });

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                          const label = parsedDetails.statName;

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                          const percentSuffix = parsedDetails.isRateStat && parsedDetails.statName.includes('%') ? '%' : '';

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                              

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                          if (playerAchieved) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            if (parsedDetails.operator === '>=') {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                              bullets.push(`• ${formattedThreshold}+ ${label}${percentSuffix}${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            } else if (parsedDetails.operator === '≤') {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                              bullets.push(`• ${formattedThreshold} ${label} or lower${percentSuffix}${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                          } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            if (parsedDetails.operator === '>=') {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                              bullets.push(`• Never had ${formattedThreshold}+ ${label}${percentSuffix} in a season`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            } else if (parsedDetails.operator === '≤') {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                              bullets.push(`• Never had ${formattedThreshold} or lower ${label}${percentSuffix} in a season`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                          }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                        } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                          // Counting stat thresholds

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                          const formattedThreshold = parsedDetails.threshold.toLocaleString();

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                          const label = parsedDetails.statName;

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                            

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                          if (playerAchieved) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            if (parsedDetails.operator === '>=') {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                              bullets.push(`• ${formattedThreshold}+ ${label}${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            } else if (parsedDetails.operator === '≤') {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                              bullets.push(`• ${formattedThreshold} ${label} or fewer${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            } else if (parsedDetails.operator === '<') {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                              bullets.push(`• Under ${formattedThreshold} ${label}${achievementYearsFormatted ? ` ${achievementYearsFormatted}` : ''}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                          } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            if (parsedDetails.operator === '>=') {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                              bullets.push(`• Never had ${formattedThreshold}+ ${label} in a season`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            } else if (parsedDetails.operator === '≤') {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                              bullets.push(`• Never had ${formattedThreshold} or fewer ${label} in a season`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            } else if (parsedDetails.operator === '<') {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                              bullets.push(`• Never had under ${formattedThreshold} ${label} in a season`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                            }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                          }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                                        }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                          } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                            // Fallback if parsing fails for a season achievement

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                            if (playerAchieved) {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                              bullets.push(`• ${finalAchievementLabel}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                            } else {

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                              bullets.push(`• Never achieved: ${finalAchievementLabel}`);

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                            }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                          }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                        }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                      }

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                  

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                

    

        

    

                

    

        

    

                        

    

        

    

                

    

        

    

                                                          const parsedCustom = parseCustomAchievementId(achievementId);



  return bullets;

}

// Helper function to get career stat value and name from player
function getCareerStatDetails(player: Player, achievementId: string): { value: number; statName: string } | null {
  const statMap: Record<string, { field: string; statName: string }> = {
    // Basketball
    'career20kPoints': { field: 'pts', statName: 'Points' },
    'career10kRebounds': { field: 'trb', statName: 'Rebounds' },
    'career5kAssists': { field: 'ast', statName: 'Assists' },
    'career2kSteals': { field: 'stl', statName: 'Steals' },
    'career1500Blocks': { field: 'blk', statName: 'Blocks' },
    'career2kThrees': { field: 'tpm', statName: '3PM' },
    
    // Baseball
    'career3000Hits': { field: 'h', statName: 'Hits' },
    'career500HRs': { field: 'hr', statName: 'Home Runs' },
    'career1500RBIs': { field: 'rbi', statName: 'RBIs' },
    'career400SBs': { field: 'sb', statName: 'Stolen Bases' },
    'career1800Runs': { field: 'r', statName: 'Runs' },
    'career300Wins': { field: 'w', statName: 'Wins (P)' },
    'career3000Ks': { field: 'soPit', statName: 'Strikeouts' },
    'career300Saves': { field: 'sv', statName: 'Saves' },
    
    // Hockey
    'career500Goals': { field: 'goals', statName: 'Goals' }, // Custom computed field
    'career1000Points': { field: 'points', statName: 'Points' }, // Custom computed field
    'career500Assists': { field: 'assists', statName: 'Assists' }, // Custom computed field
    'career200Wins': { field: 'wins', statName: 'Wins (G)' }, // Custom computed field
    'career50Shutouts': { field: 'shutouts', statName: 'Shutouts (G)' }, // Custom computed field
    
    // Football
    'career300PassTDs': { field: 'pssTD', statName: 'Passing TDs' },
    'career50kPassYds': { field: 'pssYds', statName: 'Passing Yards' },
    'career12kRushYds': { field: 'rusYds', statName: 'Rushing Yards' },
    'career100RushTDs': { field: 'rusTD', statName: 'Rushing TDs' },
    'career100RecTDs': { field: 'recTD', statName: 'Receiving TDs' },
    'career12kRecYds': { field: 'recYds', statName: 'Receiving Yards' },
    'career100Sacks': { field: 'sks', statName: 'Sacks' }, // Using 'sks' from FBGM stats
    'career20Ints': { field: 'defInt', statName: 'Interceptions' },
  };

  // Handle custom achievements (e.g., "career20000Points_custom_15000_gte")
  let baseAchievementId = achievementId;
  if (achievementId.includes('_custom_')) {
    baseAchievementId = achievementId.split('_custom_')[0];
  }

  const statInfo = statMap[baseAchievementId];
  if (!statInfo || !player.stats) return null;

  // Special handling for hockey computed fields
  if (sport === 'hockey') {
    if (!player.achievements?.seasonStatsComputed) return null;

    let totalValue = 0;
    for (const seasonData of Object.values(player.achievements.seasonStatsComputed)) {
      totalValue += (seasonData as any)[statInfo.field] || 0;
    }
    return { value: totalValue, statName: statInfo.statName };
  }

  const value = getPlayerCareerTotal(player, statInfo.field as any);
  return { value, statName: statInfo.statName };
}