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
export function getSeasonsForSeasonStatAchievement(player: Player, achievementId: SeasonAchievementId, customThreshold?: number, customOperator?: '≥' | '≤', minGames: number = 1): string[] {
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
export function getSeasonAchievementSeasons(player: Player, achievementId: SeasonAchievementId, teams: Team[], teamId?: number, sport?: string): string[] {
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

  // Handle Season* statistical achievements by calculating from stats
  if (baseAchievementId.startsWith('Season') || baseAchievementId.startsWith('FBSeason') || baseAchievementId.startsWith('HKSeason') || baseAchievementId.startsWith('BBSeason')) {
    // Need to get the minGames from the original achievement definition
    const allAchievements = getAllAchievements(sport as any);
    const baseAchievement = allAchievements.find(ach => ach.id === baseAchievementId);
    const minGamesForAchievement = baseAchievement?.minPlayers || 1; // Default to 1 game if not specified

    return getSeasonsForSeasonStatAchievement(player, baseAchievementId, customThreshold, customOperator, minGamesForAchievement);
  }

  // Handle award-based achievements
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

  const seasons = player.awards
    .filter(award => awardTypesToLookFor.some(type => award.type.includes(type)))
    .map(award => award.season);

  const uniqueSeasons = [...new Set(seasons)].sort((a, b) => a - b);
  return uniqueSeasons.map(s => s.toString());
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
        groups.push(`${start}-${end}`);
      }
      start = sortedYears[i];
      end = sortedYears[i];
    }
  }
  
  // Add the final range
  if (start === end) {
    groups.push(start.toString());
  } else {
    groups.push(`${start}-${end}`);
  }
  
  return groups;
}

// Helper function to format season list for bullets
export function formatBulletSeasonList(seasons: string[], isFinalsOrCFMVP: boolean = false): string {
  if (seasons.length === 0) return '';
  if (seasons.length === 1) return seasons[0];
  
  // For Finals MVP/CFMVP with team abbreviations, use semicolon separator
  if (isFinalsOrCFMVP) {
    // Group by consecutive years while preserving team abbreviations
    const yearsWithTeams = seasons.map(s => {
      const parts = s.split(' ');
      return { year: parseInt(parts[0]), team: parts[1] || '', original: s };
    });
    
    // If all seasons have the same team, group years and append team
    const uniqueTeams = Array.from(new Set(yearsWithTeams.map(y => y.team)));
    if (uniqueTeams.length === 1 && uniqueTeams[0]) {
      const years = uniqueTeams[0] ? yearsWithTeams.filter(y => y.team === uniqueTeams[0]).map(y => y.year) : [];
      const yearRanges = groupConsecutiveYears(years);
      return yearRanges.map(range => `${range} ${uniqueTeams[0]}`).join('; ');
    } else {
      // Different teams or no teams, just use original format
      return seasons.join('; ');
    }
  }
  
  // For other awards, group consecutive years: "2023-2028, 2030"
  const years = seasons.map(s => parseInt(s)).filter(y => !isNaN(y));
  const yearRanges = groupConsecutiveYears(years);
  return yearRanges.join(', ');
}

// Helper function to get team year range from stats
export function getTeamYearRange(player: Player, teamId: number): string {
  if (!player.stats) return '';
  
  const seasons = player.stats
    .filter(s => s.tid === teamId && !s.playoffs && (s.gp || 0) > 0)
    .map(s => s.season)
    .sort((a, b) => a - b);
  
  if (seasons.length === 0) return '';
  if (seasons.length === 1) return seasons[0].toString();
  
  return `${seasons[0]}–${seasons[seasons.length - 1]}`;
}

export function generatePlayerGuessFeedback(player: Player, rowConstraint: CatTeam, colConstraint: CatTeam, teams: Team[], sport: string, seasonIndex: SeasonIndex, isCorrectGuess: boolean = true): string[] {
  const bullets: string[] = [];

  // --- Row (Team) Bullet ---
  const team = teams.find(t => t.tid === rowConstraint.tid);
  const teamName = rowConstraint.label || (team ? `${team.region} ${team.name}` : `Team ${rowConstraint.tid}`);
  const teamYearRange = getTeamYearRange(player, rowConstraint.tid!);

  if (teamYearRange === '') {
    bullets.push(`• Never played for the ${teamName}.`);
  } else {
    bullets.push(`• ${teamName} (${teamYearRange})`);
  }

  // --- Column Bullet ---
  if (colConstraint.type === 'team') {
    const colTeam = teams.find(t => t.tid === colConstraint.tid);
    const colTeamName = colConstraint.label || (colTeam ? `${colTeam.region} ${colTeam.name}` : `Team ${colConstraint.tid}`);
    const colTeamYearRange = getTeamYearRange(player, colConstraint.tid!);

    if (colTeamYearRange === '') {
      bullets.push(`• Never played for the ${colTeamName}.`);
    } else {
      bullets.push(`• ${colTeamName} (${colTeamYearRange})`);
    }
  } else if (colConstraint.type === 'achievement') {
    const achievementId = colConstraint.achievementId!;
    const achievementLabel = colConstraint.label;

    // For both correct and incorrect, check if player achieved it (without team requirement for incorrect)
    const achievedWithTeam = playerMeetsAchievement(player, achievementId, seasonIndex, '>=', rowConstraint.tid, undefined);
    const achievedGlobally = playerMeetsAchievement(player, achievementId, seasonIndex, '>=', undefined, undefined);

    // Get achievement years/count for display
    const achievementYears = getSeasonAchievementSeasons(player, achievementId as SeasonAchievementId, teams, undefined, sport);
    let finalAchievementLabel = achievementLabel;

    // Handle custom numerical achievements for label formatting
    const parsedCustom = parseCustomAchievementId(achievementId);
    if (parsedCustom) {
      const parsedOriginalLabel = parseAchievementLabel(achievementLabel, sport);
      finalAchievementLabel = generateUpdatedLabel(parsedOriginalLabel, parsedCustom.threshold, parsedCustom.operator);
    } else {
      // For standard season achievements, remove "(Season)" suffix if present
      finalAchievementLabel = finalAchievementLabel.replace(/\s*\(Season\)/gi, '').trim();
    }

    // Check if it's a career counting stat achievement
    const isCareerStat = achievementId.startsWith('career');

    if (achievedWithTeam && isCorrectGuess) {
      // Correct guess - show achievement with seasons/years
      if (achievementYears.length > 0) {
        const count = achievementYears.length;
        const formattedYears = formatBulletSeasonList(achievementYears, false);
        
        // Format awards with count like "4x MVP (2010, 2012, 2014, 2016)"
        if (count > 1 && !isCareerStat && !achievementId.startsWith('Season')) {
          bullets.push(`• ${count}x ${finalAchievementLabel} (${formattedYears})`);
        } else {
          bullets.push(`• ${finalAchievementLabel} (${formattedYears})`);
        }
      } else if (isCareerStat) {
        // Career stat - show the actual value in simple format
        const statInfo = getCareerStatInfo(player, achievementId);
        if (statInfo) {
          bullets.push(`• ${statInfo.value.toLocaleString()} ${statInfo.label}`);
        }
      } else {
        bullets.push(`• ${finalAchievementLabel}`);
      }
    } else if (!isCorrectGuess) {
      // Incorrect guess - show what they had globally
      if (achievedGlobally) {
        if (achievementYears.length > 0) {
          const count = achievementYears.length;
          const formattedYears = formatBulletSeasonList(achievementYears, false);
          
          // Format awards with count like "4x MVP (2010, 2012, 2014, 2016)"
          if (count > 1 && !isCareerStat && !achievementId.startsWith('Season')) {
            bullets.push(`• ${count}x ${finalAchievementLabel} (${formattedYears})`);
          } else {
            bullets.push(`• ${finalAchievementLabel} (${formattedYears})`);
          }
        } else if (isCareerStat) {
          // Career stat - show the actual value in simple format
          const statInfo = getCareerStatInfo(player, achievementId);
          if (statInfo) {
            bullets.push(`• ${statInfo.value.toLocaleString()} ${statInfo.label}`);
          }
        } else {
          bullets.push(`• ${finalAchievementLabel}`);
        }
      } else {
        // Didn't achieve it at all
        if (isCareerStat) {
          // Show what they actually had in simple format
          const statInfo = getCareerStatInfo(player, achievementId);
          if (statInfo) {
            bullets.push(`• ${statInfo.value.toLocaleString()} ${statInfo.label}`);
          } else {
            bullets.push(`• 0 career points`);
          }
        } else {
          bullets.push(`• Did not achieve: ${finalAchievementLabel}`);
        }
      }
    }
  }

  return bullets;
}

// Helper function to get career stat value and name from player
function getCareerStatInfo(player: Player, achievementId: string): { value: number; label: string } | null {
  const statMap: Record<string, { field: string; label: string }> = {
    // Basketball
    'careerPoints': { field: 'pts', label: 'career points' },
    'career20kPoints': { field: 'pts', label: 'career points' },
    'career20000Points': { field: 'pts', label: 'career points' },
    'careerRebounds': { field: 'trb', label: 'career rebounds' },
    'career10kRebounds': { field: 'trb', label: 'career rebounds' },
    'career10000Rebounds': { field: 'trb', label: 'career rebounds' },
    'careerAssists': { field: 'ast', label: 'career assists' },
    'career5kAssists': { field: 'ast', label: 'career assists' },
    'career5000Assists': { field: 'ast', label: 'career assists' },
    'careerSteals': { field: 'stl', label: 'career steals' },
    'career2kSteals': { field: 'stl', label: 'career steals' },
    'career2000Steals': { field: 'stl', label: 'career steals' },
    'careerBlocks': { field: 'blk', label: 'career blocks' },
    'career1500Blocks': { field: 'blk', label: 'career blocks' },
    'career3PM': { field: 'tpm', label: 'career threes made' },
    'career2kThrees': { field: 'tpm', label: 'career threes made' },
    'career2000ThreeMade': { field: 'tpm', label: 'career threes made' },
    
    // Baseball
    'career3000Hits': { field: 'h', label: 'career hits' },
    'career500HRs': { field: 'hr', label: 'career home runs' },
    'career1500RBIs': { field: 'rbi', label: 'career RBIs' },
    'career400SBs': { field: 'sb', label: 'career stolen bases' },
    'career1800Runs': { field: 'r', label: 'career runs' },
    'career300Wins': { field: 'w', label: 'career wins (pitcher)' },
    'career3000Ks': { field: 'so', label: 'career strikeouts' },
    'career300Saves': { field: 'sv', label: 'career saves' },
    
    // Hockey
    'career500Goals': { field: 'g', label: 'career goals' },
    'career1000Points': { field: 'pts', label: 'career points' },
    'career500Assists': { field: 'a', label: 'career assists' },
    'career200Wins': { field: 'gw', label: 'career wins (goalie)' },
    'career50Shutouts': { field: 'so', label: 'career shutouts' },
    
    // Football
    'career300PassTDs': { field: 'pssTD', label: 'career passing TDs' },
    'career50kPassYds': { field: 'pssYds', label: 'career passing yards' },
    'career12kRushYds': { field: 'rusYds', label: 'career rushing yards' },
    'career100RushTDs': { field: 'rusTD', label: 'career rushing TDs' },
    'career100RecTDs': { field: 'recTD', label: 'career receiving TDs' },
    'career12kRecYds': { field: 'recYds', label: 'career receiving yards' },
    'career100Sacks': { field: 'defSck', label: 'career sacks' },
    'career30Ints': { field: 'defInt', label: 'career interceptions' },
  };

  // Handle custom achievements (e.g., "career20000Points_custom_15000_gte")
  let baseAchievementId = achievementId;
  if (achievementId.includes('_custom_')) {
    baseAchievementId = achievementId.split('_custom_')[0];
  }

  const statInfo = statMap[baseAchievementId];
  if (!statInfo || !player.stats) return null;

  const value = getPlayerCareerTotal(player, statInfo.field as any);
  return { value, label: statInfo.label };
}
