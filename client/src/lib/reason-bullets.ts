import type { Player, Team } from '@/types/bbgm';
import type { GridConstraint } from '@/lib/feedback';
import { type SeasonAchievementId } from '@/lib/season-achievements';

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
  Season300_3PM: '300+ 3PM (Season)',
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
  Season60TS20PPG: '60%+ TS on 20+ PPG (Season)',
  Season60eFG500FGA: '60%+ eFG (Season)',
  Season90FT250FTA: '90%+ FT (Season)',
  Season40_3PT200_3PA: '40%+ 3PT (Season)',
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
  Season250ThreePM: '250+ 3PM (Season)',
  HKFinalsMVP: 'Finals MVP'
};

export interface ReasonBullet {
  text: string;
  type: 'category' | 'team' | 'award' | 'draft' | 'longevity' | 'decade';
}

// Helper function to format numbers with commas
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Helper function to get team abbreviation
function getTeamAbbrev(teams: Team[], tid: number): string {
  const team = teams.find(t => t.tid === tid);
  return team?.abbrev || team?.region || team?.name || 'Unknown';
}

// Helper function to check if an achievement ID is a season achievement
function isSeasonAchievement(achievementId: string): achievementId is SeasonAchievementId {
  return Object.keys(SEASON_ACHIEVEMENT_LABELS).includes(achievementId as SeasonAchievementId);
}

// Helper function to calculate seasons where player achieved Season* statistical thresholds
function getSeasonsForSeasonStatAchievement(player: Player, achievementId: SeasonAchievementId): string[] {
  if (!player.stats || player.stats.length === 0) return [];
  
  const qualifyingSeasons: number[] = [];
  
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
    const tp = stat.tp || 0; // 3PM
    const tpa = stat.tpa || 0; // 3PA
    const fga = stat.fga || 0;
    const fta = stat.fta || 0;
    const ft = stat.ft || 0;
    const fg = stat.fg || 0;
    
    // Basketball GM Season achievements
    switch (achievementId) {
      case 'Season30PPG':
        if (gp >= 50 && (pts / gp) >= 30) qualifyingSeasons.push(season);
        break;
      case 'Season2000Points':
        if (pts >= 2000) qualifyingSeasons.push(season);
        break;
      case 'Season300_3PM':
        if (tp >= 300) qualifyingSeasons.push(season);
        break;
      case 'Season200_3PM':
        if (tp >= 200) qualifyingSeasons.push(season);
        break;
      case 'Season12RPG':
        if (gp >= 50 && (trb / gp) >= 12) qualifyingSeasons.push(season);
        break;
      case 'Season10APG':
        if (gp >= 50 && (ast / gp) >= 10) qualifyingSeasons.push(season);
        break;
      case 'Season800Rebounds':
        if (trb >= 800) qualifyingSeasons.push(season);
        break;
      case 'Season700Assists':
        if (ast >= 700) qualifyingSeasons.push(season);
        break;
      case 'Season2SPG':
        if (gp >= 50 && (stl / gp) >= 2.0) qualifyingSeasons.push(season);
        break;
      case 'Season2_5BPG':
        if (gp >= 50 && (blk / gp) >= 2.5) qualifyingSeasons.push(season);
        break;
      case 'Season150Steals':
        if (stl >= 150) qualifyingSeasons.push(season);
        break;
      case 'Season150Blocks':
        if (blk >= 150) qualifyingSeasons.push(season);
        break;
      case 'Season200Stocks':
        if ((stl + blk) >= 200) qualifyingSeasons.push(season);
        break;
      case 'Season50_40_90':
        if (fga >= 400 && tpa >= 100 && fta >= 100) {
          const fgPct = fg / fga;
          const tpPct = tp / tpa;
          const ftPct = ft / fta;
          if (fgPct >= 0.50 && tpPct >= 0.40 && ftPct >= 0.90) {
            qualifyingSeasons.push(season);
          }
        }
        break;
      case 'Season60TS20PPG':
        if (gp >= 50 && (pts / gp) >= 20 && fga >= 400) {
          const ts = pts / (2 * (fga + 0.44 * fta));
          if (ts >= 0.60) qualifyingSeasons.push(season);
        }
        break;
      case 'Season60eFG500FGA':
        if (fga >= 500) {
          const eFG = (fg + 0.5 * tp) / fga;
          if (eFG >= 0.60) qualifyingSeasons.push(season);
        }
        break;
      case 'Season90FT250FTA':
        if (fta >= 250 && (ft / fta) >= 0.90) qualifyingSeasons.push(season);
        break;
      case 'Season40_3PT200_3PA':
        if (tpa >= 200 && (tp / tpa) >= 0.40) qualifyingSeasons.push(season);
        break;
      case 'Season70Games':
        if (gp >= 70) qualifyingSeasons.push(season);
        break;
      case 'Season36MPG':
        if (gp >= 50 && (min / gp) >= 36.0) qualifyingSeasons.push(season);
        break;
      case 'Season25_10':
        if (gp >= 50 && (pts / gp) >= 25 && (trb / gp) >= 10) qualifyingSeasons.push(season);
        break;
      case 'Season25_5_5':
        if (gp >= 50 && (pts / gp) >= 25 && (trb / gp) >= 5 && (ast / gp) >= 5) qualifyingSeasons.push(season);
        break;
      case 'Season20_10_5':
        if (gp >= 50 && (pts / gp) >= 20 && (trb / gp) >= 10 && (ast / gp) >= 5) qualifyingSeasons.push(season);
        break;
      case 'Season1_1_1':
        if (gp >= 50 && (stl / gp) >= 1 && (blk / gp) >= 1 && (tp / gp) >= 1) qualifyingSeasons.push(season);
        break;
        
      // Football GM Season achievements would go here
      case 'FBSeason4kPassYds':
        if ((stat as any).passYds >= 4000) qualifyingSeasons.push(season);
        break;
      case 'FBSeason1200RushYds':
        if ((stat as any).rushYds >= 1200) qualifyingSeasons.push(season);
        break;
      // Add more FB achievements as needed...
        
      // Hockey GM Season achievements would go here  
      // Add HK achievements as needed...
        
      // Baseball GM Season achievements would go here
      // Add BB achievements as needed...
      
      // Additional Season achievements
      case 'Season250ThreePM':
        if (tp >= 250) qualifyingSeasons.push(season);
        break;
    }
  }
  
  // Remove duplicates and sort
  const uniqueSeasons = qualifyingSeasons.filter((value, index, self) => self.indexOf(value) === index).sort();
  return uniqueSeasons.map(s => s.toString());
}

// Helper function to extract season achievement data from player
function getSeasonAchievementSeasons(player: Player, achievementId: SeasonAchievementId, teams: Team[], teamId?: number): string[] {
  // Handle Season* statistical achievements by calculating from stats
  if (achievementId.startsWith('Season')) {
    return getSeasonsForSeasonStatAchievement(player, achievementId);
  }

  if (!player.awards) return [];

  // Map achievement ID to award type patterns
  const awardTypePatterns: Partial<Record<SeasonAchievementId, string[]>> = {
    // Basketball GM achievements
    AllStar: ['All-Star', 'all-star', 'allstar'],
    MVP: ['MVP', 'Most Valuable Player', 'most valuable player'],
    DPOY: ['DPOY', 'Defensive Player of the Year', 'defensive player of the year'],
    ROY: ['ROY', 'Rookie of the Year', 'rookie of the year'],
    SMOY: ['SMOY', 'Sixth Man of the Year', 'sixth man of the year', '6MOY', '6th man'],
    MIP: ['MIP', 'Most Improved Player', 'most improved player'],
    FinalsMVP: ['Finals MVP', 'finals mvp', 'championship mvp'],
    SFMVP: ['Conference Finals MVP', 'conference finals mvp', 'CFMVP', 'cfmvp'],
    AllLeagueAny: ['All-League', 'all-league', 'First Team All-League', 'Second Team All-League', 'Third Team All-League'],
    AllDefAny: ['All-Defensive', 'all-defensive', 'First Team All-Defensive', 'Second Team All-Defensive'],
    AllRookieAny: ['All-Rookie', 'all-rookie', 'All-Rookie Team'],
    PointsLeader: ['League Points Leader', 'league points leader', 'points leader', 'scoring leader'],
    ReboundsLeader: ['League Rebounds Leader', 'league rebounds leader', 'rebounds leader', 'rebounding leader'],
    AssistsLeader: ['League Assists Leader', 'league assists leader', 'assists leader'],
    StealsLeader: ['League Steals Leader', 'league steals leader', 'steals leader'],
    BlocksLeader: ['League Blocks Leader', 'league blocks leader', 'blocks leader'],
    
    // Football GM achievements
    FBAllStar: ['All-Star'],
    FBMVP: ['Most Valuable Player'],
    FBDPOY: ['Defensive Player of the Year'],
    FBOffROY: ['Offensive Rookie of the Year'],
    FBDefROY: ['Defensive Rookie of the Year'],
    FBAllRookie: ['All-Rookie Team'],
    FBAllLeague: ['First Team All-League', 'Second Team All-League', 'All-League Team'],
    FBSeason4kPassYds: ['4,000+ Passing Yards', '4000+ passing yards', 'passing yards'],
    FBSeason1200RushYds: ['1,200+ Rushing Yards', '1200+ rushing yards', 'rushing yards'],
    FBSeason100Receptions: ['100+ Receptions', '100+ receptions', 'receptions'],
    FBSeason15Sacks: ['15+ Sacks', '15+ sacks', 'sacks'],
    FBSeason140Tackles: ['140+ Tackles', '140+ tackles', 'tackles'],
    FBSeason5Interceptions: ['5+ Interceptions', '5+ interceptions', 'interceptions'],
    FBSeason30PassTD: ['30+ Passing TD', '30+ passing td', 'passing touchdowns'],
    FBSeason1300RecYds: ['1,300+ Receiving Yards', '1300+ receiving yards', 'receiving yards'],
    FBSeason10RecTD: ['10+ Receiving TD', '10+ receiving td', 'receiving touchdowns'],
    FBSeason12RushTD: ['12+ Rushing TD', '12+ rushing td', 'rushing touchdowns'],
    FBSeason1600Scrimmage: ['1,600+ Yards from Scrimmage', '1600+ scrimmage yards', 'scrimmage yards'],
    FBSeason2000AllPurpose: ['2,000+ All-Purpose Yards', '2000+ all-purpose yards', 'all-purpose yards'],
    FBSeason15TFL: ['15+ Tackles for Loss', '15+ tackles for loss', 'tackles for loss'],
    FBFinalsMVP: ['Finals MVP'],
    FBChampion: ['Won Championship'],
    
    // Hockey GM achievements
    HKAllStar: ['All-Star', 'all-star'],
    HKAllStarMVP: ['All-Star MVP', 'all-star mvp'],
    HKMVP: ['Most Valuable Player', 'most valuable player'],
    HKROY: ['Rookie of the Year', 'rookie of the year'],
    HKAllRookie: ['All-Rookie Team', 'all-rookie team'],
    HKAllLeague: ['All-League Team', 'all-league team', 'First Team All-League', 'Second Team All-League'],
    HKAssistsLeader: ['League Assists Leader', 'league assists leader'],
    HKPlayoffsMVP: ['Playoffs MVP', 'playoffs mvp'],
    HKChampion: ['Won Championship', 'won championship'],
    
    // Baseball GM achievements
    BBAllStar: ['All-Star'],
    BBMVP: ['Most Valuable Player'],
    BBROY: ['Rookie of the Year'],
    BBAllRookie: ['All-Rookie Team'],
    BBAllLeague: ['All-League Team', 'First Team All-League', 'Second Team All-League'],
    BBPlayoffsMVP: ['Playoffs MVP', 'Finals MVP'],
    BBChampion: ['Won Championship'],

    // Additional missing achievements
    Champion: ['Won Championship', 'won championship'],
    Season250ThreePM: ['250+ 3PM', '250+ three-pointers', '250+ threes'],
    HKDefenseman: ['Best Defenseman', 'best defenseman'],
    HKFinalsMVP: ['Finals MVP', 'finals mvp']
  };

  const patterns = awardTypePatterns[achievementId] || [];
  const matchingAwards = player.awards.filter(award => {
    const awardType = (award.type || '').toLowerCase();
    const awardName = ((award as any).name || '').toLowerCase();
    return patterns.some(pattern => 
      awardType.includes(pattern.toLowerCase()) || 
      awardName.includes(pattern.toLowerCase())
    );
  });

  // Extract seasons and format
  const seasonsWithTeam: string[] = [];
  
  for (const award of matchingAwards) {
    if (award.season) {
      // For Finals MVP, Conference Finals MVP, Championship, and Playoffs MVP, try to include team abbreviation
      if (achievementId === 'FinalsMVP' || achievementId === 'SFMVP' || achievementId === 'FBFinalsMVP' || 
          achievementId === 'HKPlayoffsMVP' || achievementId === 'BBPlayoffsMVP' || 
          achievementId === 'FBChampion' || achievementId === 'HKChampion' || achievementId === 'BBChampion') {
        const playoffTeam = getBulletPlayoffTeam(player, award.season, teams);
        if (playoffTeam) {
          seasonsWithTeam.push(`${award.season} ${playoffTeam}`);
        } else {
          // If we can't resolve playoff team, just show the year without team
          seasonsWithTeam.push(`${award.season}`);
        }
      } else {
        seasonsWithTeam.push(`${award.season}`);
      }
    }
  }

  return seasonsWithTeam.sort();
}

// Helper function to get playoff team abbreviation for bullets
function getBulletPlayoffTeam(player: Player, season: number, teams: Team[]): string | null {
  if (!player.stats) return null;
  
  const playoffStats = player.stats.find(s => 
    s.season === season && s.playoffs && (s.gp || 0) > 0
  );
  
  if (playoffStats) {
    const team = teams.find(t => t.tid === playoffStats.tid);
    return team?.abbrev || null; // Return null instead of T{tid} fallback
  }
  
  return null;
}

// Helper function to group consecutive years into ranges
function groupConsecutiveYears(years: number[]): string[] {
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
function formatBulletSeasonList(seasons: string[], isFinalsOrCFMVP: boolean = false): string {
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
      const years = yearsWithTeams.map(y => y.year);
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
function getTeamYearRange(player: Player, teamId: number): string {
  if (!player.stats) return '';
  
  const seasons = player.stats
    .filter(s => s.tid === teamId && !s.playoffs && (s.gp || 0) > 0)
    .map(s => s.season)
    .sort((a, b) => a - b);
  
  if (seasons.length === 0) return '';
  if (seasons.length === 1) return seasons[0].toString();
  
  return `${seasons[0]}–${seasons[seasons.length - 1]}`;
}

// Helper function to get career stats for any sport
function getCareerStats(player: Player, statTypes: string[]) {
  if (!player.stats || !Array.isArray(player.stats)) return {};
  
  const careerStats: Record<string, number> = {};
  
  statTypes.forEach(statType => {
    let total = 0;
    
    player.stats!
      .filter(s => !s.playoffs)
      .forEach(season => {
        // Handle special case for three-pointers - try multiple field names
        if (statType === 'fg3') {
          const seasonThrees = (season as any).tpm || (season as any).tp || (season as any).fg3 || 0;
          total += seasonThrees;
        } 
        // Handle hockey assists - calculate from component assists
        else if (statType === 'a') {
          // Hockey assists are the sum of even-strength, power-play, and short-handed assists
          const evA = (season as any).evA || 0;
          const ppA = (season as any).ppA || 0;
          const shA = (season as any).shA || 0;
          const seasonAssists = evA + ppA + shA;
          
          // Fallback to direct field if components not available
          const fallbackAssists = seasonAssists || (season as any).a || (season as any).ast || (season as any).assists || 0;
          
          // Debug logging for hockey assists
          if (fallbackAssists > 0) {
            console.log(`🏒 ASSISTS DEBUG: Season ${season.season}, evA:${evA} + ppA:${ppA} + shA:${shA} = ${seasonAssists}, total so far: ${total + fallbackAssists}`);
          }
          total += fallbackAssists;
        } else {
          total += (season as any)[statType] || 0;
        }
      });
    
    careerStats[statType] = total;
  });
  
  return careerStats;
}

// Helper function to get best season performance
function getBestSeason(player: Player, statType: string, isMin = false) {
  if (!player.stats || !Array.isArray(player.stats)) return { value: 0, year: 0 };
  
  let bestValue = isMin ? Infinity : -Infinity;
  let bestYear = 0;
  
  player.stats.forEach(season => {
    if (season.playoffs) return;
    
    let value = 0;
    
    // Handle hockey assists - calculate from component assists
    if (statType === 'a') {
      const evA = (season as any).evA || 0;
      const ppA = (season as any).ppA || 0;
      const shA = (season as any).shA || 0;
      const calculatedAssists = evA + ppA + shA;
      value = calculatedAssists || (season as any).a || (season as any).ast || (season as any).assists || 0;
    } else {
      value = (season as any)[statType] || (isMin ? Infinity : 0);
    }
    
    if ((isMin && value < bestValue && value > 0) || (!isMin && value > bestValue)) {
      bestValue = value;
      bestYear = season.season;
    }
  });
  
  return { 
    value: bestValue === Infinity ? 0 : bestValue, 
    year: bestYear 
  };
}

// Helper function to get award seasons
function getAwardSeasons(player: Player, awardTypes: string[]): number[] {
  if (!player.awards || !Array.isArray(player.awards)) return [];
  
  const seasons: number[] = [];
  
  player.awards.forEach(award => {
    for (const awardType of awardTypes) {
      if (award.type?.includes(awardType) || (award as any).name?.includes(awardType)) {
        if (award.season) seasons.push(award.season);
        break;
      }
    }
  });
  
  return seasons.sort((a, b) => a - b);
}

// Build proof bullets for both constraints in a cell
export function generateReasonBullets(
  player: Player,
  rowConstraint: GridConstraint,
  colConstraint: GridConstraint,
  teams: Team[],
  sport: string = 'basketball'
): ReasonBullet[] {
  const bullets: ReasonBullet[] = [];
  
  // Always generate exactly 2 bullets:
  // 1. Column constraint (top bullet) 
  // 2. Row constraint (bottom bullet)
  
  // Generate bullet for column constraint
  const colBullet = generateSimpleBullet(player, colConstraint, teams);
  if (colBullet) bullets.push(colBullet);
  
  // Generate bullet for row constraint  
  const rowBullet = generateSimpleBullet(player, rowConstraint, teams);
  if (rowBullet) bullets.push(rowBullet);
  
  return bullets;
}

// Generate a simple bullet for any constraint (team or achievement)
function generateSimpleBullet(player: Player, constraint: GridConstraint, teams: Team[], sport: string): ReasonBullet | null {
  if (constraint.type === 'team') {
    return generateSimpleTeamBullet(player, constraint.tid!, teams, constraint.label);
  } else if (constraint.type === 'achievement') {
    return generateSimpleAchievementBullet(player, constraint.achievementId!, teams, constraint.label, sport);
  }
  return null;
}

// Generate simple team bullet: "Team Name (years)"
function generateSimpleTeamBullet(player: Player, teamTid: number, teams: Team[], constraintLabel?: string): ReasonBullet | null {
  if (!player.stats) return null;
  
  const teamSeasons = player.stats
    .filter(s => s.tid === teamTid && !s.playoffs && (s.gp || 0) > 0)
    .map(s => s.season)
    .sort((a, b) => a - b);
  
  if (teamSeasons.length === 0) return null;
  
  const team = teams.find(t => t.tid === teamTid);
  const teamName = constraintLabel || (team ? `${team.region} ${team.name}` : `Team ${teamTid}`);
  
  const seasonRange = teamSeasons.length === 1 
    ? teamSeasons[0].toString()
    : `${teamSeasons[0]}–${teamSeasons[teamSeasons.length - 1]}`;
  
  return {
    text: `${teamName} (${seasonRange})`,
    type: 'team'
  };
}

// Generate simple achievement bullet: "Achievement Name (years)"
function generateSimpleAchievementBullet(player: Player, achievementId: string, teams: Team[], constraintLabel?: string, sport?: string): ReasonBullet | null {
  if (isSeasonAchievement(achievementId)) {
    return generateSimpleSeasonAchievementBullet(player, achievementId as SeasonAchievementId, teams, constraintLabel);
  } else {
    return generateSimpleCareerAchievementBullet(player, achievementId, teams, constraintLabel, sport);
  }
}

// Generate simple season achievement bullet
function generateSimpleSeasonAchievementBullet(player: Player, achievementId: SeasonAchievementId, teams: Team[], constraintLabel?: string): ReasonBullet | null {
  let achLabel = constraintLabel || SEASON_ACHIEVEMENT_LABELS[achievementId] || achievementId;
  
  const seasons = getSeasonAchievementSeasons(player, achievementId, teams);
  
  if (seasons.length === 0) return null;
  
  const seasonStr = formatBulletSeasonList(seasons, false);
  
  return {
    text: `${achLabel} (${seasonStr})`,
    type: 'award'
  };
}

// Helper function to calculate actual years for decade achievements
function getActualDecadeYears(player: Player, achievementType: 'played' | 'debuted'): string {
  if (!player.stats || player.stats.length === 0) return '';
  
  const regularSeasonStats = player.stats.filter(s => !s.playoffs && (s.gp || 0) > 0);
  if (regularSeasonStats.length === 0) return '';
  
  if (achievementType === 'played') {
    // For "played", show the year span or range
    const seasons = regularSeasonStats.map(s => s.season).sort((a, b) => a - b);
    const firstSeason = seasons[0];
    const lastSeason = seasons[seasons.length - 1];
    
    if (firstSeason === lastSeason) {
      return firstSeason.toString();
    } else {
      return `${firstSeason}–${lastSeason}`;
    }
  } else if (achievementType === 'debuted') {
    // For "debuted", show the first season - avoid stack overflow
    let actualYear = regularSeasonStats.length > 0 ? regularSeasonStats[0].season : 0;
    for (const stat of regularSeasonStats) {
      if (stat.season < actualYear) actualYear = stat.season;
    }
    return actualYear.toString();
  }
  
  return '';
}

import { getAllAchievements } from '@/lib/achievements';
import { parseAchievementLabel } from '@/lib/editable-achievements';

// ... (rest of the file)

// Generate simple career achievement bullet
function generateSimpleCareerAchievementBullet(player: Player, achievementId: string, teams: Team[], constraintLabel?: string, sport?: string): ReasonBullet | null {
  let baseAchievementId = achievementId;
  if (achievementId.includes('_custom_')) {
    baseAchievementId = achievementId.split('_custom_')[0];
  }

  // Map career achievements to their corresponding stat key
  const careerStatMap: Record<string, string> = {
    career20kPoints: 'pts',
    career5kAssists: 'ast',
    career2kSteals: 'stl',
    career1500Blocks: 'blk',
    career2kThrees: 'tpm',
    career10kRebounds: 'trb',
    // Add other sports' career stats here
    FBCareer50kPassYds: 'pssYds',
    career12kRushYds: 'rusYds',
    career12kRecYds: 'recYds',
    career100Sacks: 'defSk',
    career20Ints: 'defInt',
    career300PassTDs: 'pssTD',
    career100RushTDs: 'rusTD',
    career100RecTDs: 'recTD',
    career3000Hits: 'h',
    career500HRs: 'hr',
    career1500RBIs: 'rbi',
    career400SBs: 'sb',
    career1800Runs: 'r',
    career300Wins: 'w',
    career3000Ks: 'soPit',
    career300Saves: 'sv',
    career500Goals: 'g',
    career1000Points: 'pts',
    career500Assists: 'ast',
    career200Wins: 'w',
    career50Shutouts: 'so',
  };

  const statKey = careerStatMap[baseAchievementId];

  // Case 1: Career Statistical Milestones
  if (statKey) {
    if (!player.stats) return null;
    const total = player.stats
      .filter(s => !s.playoffs)
      .reduce((acc, season) => {
        const statValue = statKey === 'tpm' ? ((season as any).tpm || (season as any).tp || 0) : ((season as any)[statKey] || 0);
        return acc + statValue;
      }, 0);
    
    // Find the original achievement using the BASE ID to get its canonical label
    const allAchievements = getAllAchievements(sport as any);
    const originalAchievement = allAchievements.find(ach => ach.id === baseAchievementId);
    
    if (!originalAchievement) {
      // Fallback if something goes wrong
      const fallbackStatName = baseAchievementId.replace('career', '').replace(/([A-Z])/g, ' $1').trim();
      return {
        text: `${formatNumber(total)} ${fallbackStatName}`,
        type: 'award'
      };
    }

    const originalLabel = originalAchievement.label;

    // Parse the original label to get the clean stat name
    const parsedLabel = parseAchievementLabel(originalLabel, sport);
    const cleanStatName = parsedLabel.suffix.trim();

    return {
      text: `${formatNumber(total)} ${cleanStatName}`,
      type: 'award'
    };
  }

  // Case 2: Dynamic Longevity Achievements
  if (achievementId === 'played5PlusFranchises') {
    if (!player.stats) return null;
    const franchiseCount = new Set(player.stats.filter(s => s.tid !== -1).map(s => s.tid)).size;
    return {
      text: `Played for ${franchiseCount} Franchises`,
      type: 'longevity'
    };
  }
  if (achievementId === 'played10PlusSeasons' || achievementId === 'played15PlusSeasons') {
    if (!player.stats) return null;
    const seasonCount = new Set(player.stats.filter(s => !s.playoffs).map(s => s.season)).size;
    return {
      text: `Played ${seasonCount} Seasons`,
      type: 'longevity'
    };
  }

  // Case 3: Simple, Non-Parenthetical Achievements
  if (achievementId === 'isHallOfFamer') {
    return {
      text: 'Hall of Fame',
      type: 'award'
    };
  }

  // Fallback for other career achievements (like decades)
  if (isSeasonAchievement(achievementId)) {
    return generateSimpleSeasonAchievementBullet(player, achievementId as SeasonAchievementId, teams, constraintLabel);
  }

  // Handle draft achievements
  if (['isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen'].includes(achievementId)) {
    return generateDraftBullet(player, achievementId);
  }
  
  // Handle decade achievements
  if (achievementId.includes('playedIn') && achievementId.endsWith('s')) {
    const decadeMatch = achievementId.match(/playedIn(\d{4})s/);
    if (decadeMatch) {
      const decade = decadeMatch[1];
      const label = constraintLabel || `Played in the ${decade}s`;
      const actualYears = getActualDecadeYears(player, 'played');
      
      return {
        text: actualYears ? `${label} (${actualYears})` : `${label}`,
        type: 'decade'
      };
    }
  }
  
  if (achievementId.includes('debutedIn') && achievementId.endsWith('s')) {
    const decadeMatch = achievementId.match(/debutedIn(\d{4})s/);
    if (decadeMatch) {
      const decade = decadeMatch[1];
      const label = constraintLabel || `Debuted in the ${decade}s`;
      const actualYears = getActualDecadeYears(player, 'debuted');
      
      return {
        text: actualYears ? `${label} (${actualYears})` : `${label}`,
        type: 'decade'
      };
    }
  }

  // Default fallback for any other unhandled career achievements
  const label = constraintLabel || achievementId;
  return {
    text: label,
    type: 'award'
  };
}

// Build a team bullet: Team Name (minYear–maxYear)
function buildTeamBullet(player: Player, teamTid: number, teams: Team[], constraintLabel?: string): ReasonBullet | null {
  if (!player.stats) return null;
  
  const teamSeasons = player.stats
    .filter(s => s.tid === teamTid && !s.playoffs && (s.gp || 0) > 0)
    .map(s => s.season)
    .sort((a, b) => a - b);
  
  if (teamSeasons.length === 0) return null;
  
  const team = teams.find(t => t.tid === teamTid);
  const teamName = constraintLabel || (team ? `${team.region} ${team.name}` : `Team ${teamTid}`);
  
  const seasonRange = teamSeasons.length === 1 
    ? teamSeasons[0].toString()
    : `${teamSeasons[0]}–${teamSeasons[teamSeasons.length - 1]}`;
  
  return {
    text: `${teamName} (${seasonRange})`,
    type: 'team'
  };
}

// Build a season achievement bullet: Award Label (season list with playoff teams for Finals/CFMVP)
function buildSeasonAchievementBullet(player: Player, achievementId: SeasonAchievementId, teams: Team[], constraintLabel?: string): ReasonBullet | null {
  const achLabel = constraintLabel || SEASON_ACHIEVEMENT_LABELS[achievementId];
  const seasons = getSeasonAchievementSeasons(player, achievementId, teams);
  
  if (seasons.length === 0) return null;
  
  const isPlayoffAward = achievementId === 'FinalsMVP' || achievementId === 'SFMVP' || 
                        achievementId === 'FBFinalsMVP' || achievementId === 'HKPlayoffsMVP' || 
                        achievementId === 'BBPlayoffsMVP' || achievementId === 'FBChampion' || 
                        achievementId === 'HKChampion' || achievementId === 'BBChampion';
  const seasonStr = formatBulletSeasonList(seasons, isPlayoffAward);
  
  return {
    text: `${achLabel} (${seasonStr})`,
    type: 'award'
  };
}

// Build a career/misc achievement bullet: Award Label (value)
function buildCareerAchievementBullet(player: Player, achievementId: string, teams: Team[], sport: string, constraintLabel?: string): ReasonBullet | null {
  // Use existing achievement bullet generation logic
  return generateAchievementBullet(player, achievementId, teams, sport, constraintLabel);
}

// Legacy function for compatibility
function generateCategoryBullet(
  player: Player,
  constraint: GridConstraint,
  teams: Team[],
  sport: string
): ReasonBullet | null {
  if (constraint.type === 'team') {
    return buildTeamBullet(player, constraint.tid!, teams, constraint.label);
  } else if (constraint.type === 'achievement') {
    if (isSeasonAchievement(constraint.achievementId!)) {
      return buildSeasonAchievementBullet(player, constraint.achievementId! as SeasonAchievementId, teams, constraint.label);
    } else {
      return buildCareerAchievementBullet(player, constraint.achievementId!, teams, sport, constraint.label);
    }
  }
  
  return null;
}


function generateAchievementBullet(
  player: Player,
  achievementId: string,
  teams: Team[],
  sport: string,
  constraintLabel?: string
): ReasonBullet | null {
  // Decade achievements
  if (achievementId.includes('playedIn') && achievementId.endsWith('s')) {
    return generateDecadeBullet(player, achievementId, 'played');
  }
  
  if (achievementId.includes('debutedIn') && achievementId.endsWith('s')) {
    return generateDecadeBullet(player, achievementId, 'debuted');
  }
  
  // Draft achievements
  if (['isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen'].includes(achievementId)) {
    return generateDraftBullet(player, achievementId);
  }
  
  // Longevity achievements  
  if (['played15PlusSeasons', 'played10PlusSeasons', 'played5PlusFranchises'].includes(achievementId)) {
    return generateLongevityBullet(player, achievementId);
  }
  
  // Career thresholds
  if (achievementId.startsWith('career')) {
    return generateCareerThresholdBullet(player, achievementId, sport, constraintLabel);
  }
  
  // Season thresholds
  if (achievementId.startsWith('season')) {
    return generateSeasonThresholdBullet(player, achievementId, sport, constraintLabel);
  }
  
  // Awards
  if (['wonMVP', 'hasMVP', 'wonDPOY', 'hasDPOY', 'wonROY', 'hasROY', 'wonFinalsMVP', 'wonSixMOY', 'hasAllStar', 'madeAllStar', 'wonChampionship'].includes(achievementId)) {
    return generateAwardBullet(player, achievementId, sport, constraintLabel);
  }
  
  // Hall of Fame
  if (achievementId === 'isHallOfFamer') {
    return generateHallOfFameBullet(player);
  }
  
  return null;
}

function generateDraftBullet(player: Player, achievementId: string): ReasonBullet | null {
  const draftInfo = player.draft;
  
  const draftLabels: Record<string, string> = {
    isPick1Overall: '#1 Overall Pick',
    isFirstRoundPick: 'First Round Pick', 
    isSecondRoundPick: 'Second Round Pick',
    isUndrafted: 'Went Undrafted',
    draftedTeen: 'Drafted as Teenager'
  };
  
  const label = draftLabels[achievementId];
  if (!label) return null;
  
  // Handle undrafted players - just show the year
  if (achievementId === 'isUndrafted') {
    const draftYear = draftInfo?.year || 'unknown';
    return {
      text: `${label} (${draftYear})`,
      type: 'draft'
    };
  }
  
  // Handle drafted players - show full draft information
  if (draftInfo?.year && draftInfo?.round && draftInfo?.pick) {
    const draftYear = draftInfo.year;
    const round = draftInfo.round;
    const pick = draftInfo.pick;
    
    return {
      text: `${label} (${draftYear} - Round ${round} Pick ${pick})`,
      type: 'draft'
    };
  }
  
  // Fallback for incomplete draft data - just show year if available
  const draftYear = draftInfo?.year || 'unknown';
  return {
    text: `${label} (${draftYear})`,
    type: 'draft'
  };
}

function generateLongevityBullet(player: Player, achievementId: string): ReasonBullet | null {
  if (!player.stats) return null;
  
  if (achievementId === 'played5PlusFranchises') {
    // Count unique franchise IDs from stats
    const franchiseIds = new Set<number>();
    for (const stat of player.stats) {
      if (stat.tid !== undefined && stat.tid !== -1 && (stat.gp || 0) > 0) {
        franchiseIds.add(stat.tid);
      }
    }
    const franchiseCount = franchiseIds.size;
    return {
      text: `played for ${franchiseCount} franchise${franchiseCount !== 1 ? 's' : ''} (5+ required)`,
      type: 'longevity'
    };
  }
  
  const seasons = new Set(
    player.stats
      .filter(s => !s.playoffs && (s.gp || 0) > 0)
      .map(s => s.season)
  ).size;
  
  if (achievementId === 'played15PlusSeasons') {
    return {
      text: `played ${seasons} seasons (15+ required)`,
      type: 'longevity'
    };
  }
  
  if (achievementId === 'played10PlusSeasons') {
    return {
      text: `played ${seasons} seasons (10+ required)`,
      type: 'longevity'
    };
  }
  
  return {
    text: `Played ${seasons} Seasons`,
    type: 'longevity'
  };
}

function generateHallOfFameBullet(player: Player): ReasonBullet | null {
  if (!player.awards || !Array.isArray(player.awards)) return null;
  
  // Find the Hall of Fame induction award
  const hofAward = player.awards.find((award: any) => 
    award.type === 'Inducted into the Hall of Fame'
  );
  
  if (!hofAward || !hofAward.season) return null;
  
  return {
    text: `Hall of Fame (${hofAward.season})`,
    type: 'award'
  };
}

function generateDecadeBullet(player: Player, achievementId: string, type: 'played' | 'debuted' | 'retired'): ReasonBullet | null {
  if (!player.stats || player.stats.length === 0) return null;
  
  const regularSeasonStats = player.stats.filter(s => !s.playoffs && (s.gp || 0) > 0);
  if (regularSeasonStats.length === 0) return null;
  
  let actualYear: number;
  let labelText: string;
  
  if (type === 'played') {
    // For "played", show the year span or range
    const seasons = regularSeasonStats.map(s => s.season).sort((a, b) => a - b);
    const firstSeason = seasons[0];
    const lastSeason = seasons[seasons.length - 1];
    
    if (firstSeason === lastSeason) {
      labelText = `Played in ${firstSeason}`;
    } else {
      labelText = `Played ${firstSeason}–${lastSeason}`;
    }
  } else if (type === 'debuted') {
    // For "debuted", show the first season - avoid stack overflow
    actualYear = regularSeasonStats.length > 0 ? regularSeasonStats[0].season : 0;
    for (const stat of regularSeasonStats) {
      if (stat.season < actualYear) actualYear = stat.season;
    }
    labelText = `Debuted in ${actualYear}`;
  } else if (type === 'retired') {
    // For "retired", show the last season - avoid stack overflow
    actualYear = regularSeasonStats.length > 0 ? regularSeasonStats[0].season : 0;
    for (const stat of regularSeasonStats) {
      if (stat.season > actualYear) actualYear = stat.season;
    }
    labelText = `Retired in ${actualYear}`;
  } else {
    return null;
  }
  
  return {
    text: labelText,
    type: 'decade'
  };
}

function generateCareerThresholdBullet(player: Player, achievementId: string, sport: string, constraintLabel?: string): ReasonBullet | null {
  const thresholds: Record<string, { label: string; stat: string }> = {
    // Basketball
    career20kPoints: { label: '20,000+ Career Points', stat: 'pts' },
    career10kRebounds: { label: '10,000+ Career Rebounds', stat: 'trb' },
    career5kAssists: { label: '5,000+ Career Assists', stat: 'ast' },
    career2kSteals: { label: '2,000+ Career Steals', stat: 'stl' },
    career1500Blocks: { label: '1,500+ Career Blocks', stat: 'blk' },
    career2kThrees: { label: '2,000+ Made Threes', stat: 'fg3' },
    
    // Football
    career300PassTDs: { label: '300+ Career Pass TDs', stat: 'pssTD' },
    career100RushTDs: { label: '100+ Career Rush TDs', stat: 'rusTD' },
    career12kRecYds: { label: '12,000+ Career Rec Yards', stat: 'recYds' },
    career100RecTDs: { label: '85+ Career Rec TDs', stat: 'recTD' },
    career100Sacks: { label: '100+ Career Sacks', stat: 'sk' },
    career20Ints: { label: '20+ Career Interceptions', stat: 'defInt' },
    
    // Baseball
    career3000Hits: { label: '3,000+ Career Hits', stat: 'h' },
    career500HRs: { label: '500+ Career Home Runs', stat: 'hr' },
    career1500RBIs: { label: '1,500+ Career RBIs', stat: 'rbi' },
    career400SBs: { label: '400+ Career Stolen Bases', stat: 'sb' },
    career1800Runs: { label: '1,800+ Career Runs', stat: 'r' },
    career300Wins: { label: '300+ Career Wins', stat: 'w' },
    career3000Ks: { label: '3,000+ Career Strikeouts', stat: 'so' },
    career300Saves: { label: '300+ Career Saves', stat: 'sv' },
    
    // Hockey
    career500Goals: { label: '500+ Career Goals', stat: 'g' },
    career1000Points: { label: '1,000+ Career Points', stat: 'pts' },
    career500Assists: { label: '500+ Career Assists', stat: 'a' },
    career200Wins: { label: '200+ Career Wins (G)', stat: 'w' },
    career50Shutouts: { label: '50+ Career Shutouts', stat: 'so' }
  };
  
  const threshold = thresholds[achievementId];
  if (!threshold) return null;
  
  const careerStats = getCareerStats(player, [threshold.stat]);
  const actualValue = careerStats[threshold.stat] || 0;
  
  // Use constraint label if provided, otherwise fall back to hardcoded label
  const displayLabel = constraintLabel || threshold.label;
  
  // Debug logging for hockey assists specifically
  if (threshold.stat === 'a' && player.name) {
    console.log(`🏒 CAREER ASSISTS DEBUG: ${player.name}, career total: ${actualValue}`);
    if (player.stats) {
      console.log(`🏒 Player has ${player.stats.filter(s => !s.playoffs).length} regular season records`);
      console.log(`🏒 Sample season stats:`, player.stats.filter(s => !s.playoffs)[0]);
    }
  }
  
  return {
    text: `${displayLabel} (${formatNumber(actualValue)})`,
    type: 'category'
  };
}

function generateSeasonThresholdBullet(player: Player, achievementId: string, sport: string, constraintLabel?: string): ReasonBullet | null {
  const thresholds: Record<string, { label: string; stat: string; isMin?: boolean }> = {
    // Basketball  
    season30ppg: { label: '30+ PPG', stat: 'pts' }, // Will be calculated per game
    season10apg: { label: '10+ APG', stat: 'ast' },
    season15rpg: { label: '15+ RPG', stat: 'trb' },
    season3bpg: { label: '3+ BPG', stat: 'blk' },
    season25spg: { label: '2.5+ SPG', stat: 'stl' },
    
    // Football
    season35PassTDs: { label: '35+ Pass TDs', stat: 'pssTD' },
    season1400RecYds: { label: '1,400+ Rec Yards', stat: 'recYds' },
    season15RecTDs: { label: '15+ Rec TDs', stat: 'recTD' },
    season15Sacks: { label: '15+ Sacks', stat: 'sk' },
    season8Ints: { label: '8+ Interceptions', stat: 'defInt' },
    season1800RushYds: { label: '1,600+ Rush Yards', stat: 'rusYds' },
    season20RushTDs: { label: '20+ Rush TDs', stat: 'rusTD' },
    
    // Baseball
    season50HRs: { label: '50+ Home Runs', stat: 'hr' },
    season130RBIs: { label: '130+ RBIs', stat: 'rbi' },
    season200Hits: { label: '200+ Hits', stat: 'h' },
    season50SBs: { label: '50+ Stolen Bases', stat: 'sb' },
    season20Wins: { label: '20+ Wins (P)', stat: 'w' },
    season40Saves: { label: '40+ Saves', stat: 'sv' },
    season300Ks: { label: '300+ Strikeouts', stat: 'so' },
    season200ERA: { label: 'Sub-2.00 ERA', stat: 'era', isMin: true },
    
    // Hockey
    season50Goals: { label: '50+ Goals', stat: 'g' },
    season100Points: { label: '100+ Points', stat: 'pts' },
    season60Assists: { label: '60+ Assists', stat: 'a' },
    season35Wins: { label: '35+ Wins (G)', stat: 'w' },
    season10Shutouts: { label: '10+ Shutouts', stat: 'so' },
    season925SavePct: { label: '.925+ Save %', stat: 'svPct' }
  };
  
  const threshold = thresholds[achievementId];
  if (!threshold) return null;
  
  // Handle per-game stats for basketball
  if (['season30ppg', 'season10apg', 'season15rpg', 'season3bpg', 'season25spg'].includes(achievementId)) {
    return generatePerGameBullet(player, achievementId, threshold, constraintLabel);
  }
  
  const bestSeason = getBestSeason(player, threshold.stat, threshold.isMin);
  if (bestSeason.year === 0) return null;
  
  let valueStr = formatNumber(bestSeason.value);
  
  // Special formatting for save percentage and ERA
  if (achievementId === 'season925SavePct') {
    valueStr = bestSeason.value.toFixed(3);
  } else if (achievementId === 'season200ERA') {
    valueStr = bestSeason.value.toFixed(2);
  }
  
  // Use constraint label if provided, otherwise fall back to hardcoded label
  const displayLabel = constraintLabel || threshold.label;
  
  return {
    text: `${displayLabel} (${valueStr}) in ${bestSeason.year}`,
    type: 'category'
  };
}

function generatePerGameBullet(player: Player, achievementId: string, threshold: { label: string; stat: string }, constraintLabel?: string): ReasonBullet | null {
  if (!player.stats) return null;
  
  let bestValue = 0;
  let bestYear = 0;
  
  player.stats.forEach(season => {
    if (season.playoffs) return;
    
    const gp = season.gp || (season as any).g || 0;
    if (gp < 10) return; // Minimum games requirement
    
    const total = (season as any)[threshold.stat] || 0;
    const perGame = total / gp;
    
    if (perGame > bestValue) {
      bestValue = perGame;
      bestYear = season.season;
    }
  });
  
  if (bestYear === 0) return null;
  
  // Use constraint label if provided, otherwise fall back to hardcoded label
  const displayLabel = constraintLabel || threshold.label;
  
  return {
    text: `${displayLabel} (${bestValue.toFixed(1)}) in ${bestYear}`,
    type: 'category'
  };
}

function generateAwardBullet(player: Player, achievementId: string, sport: string, constraintLabel?: string): ReasonBullet | null {
  const awardMap: Record<string, { label: string; searchTerms: string[] }> = {
    // Basketball
    wonMVP: { label: 'MVP', searchTerms: ['MVP', 'Most Valuable Player'] },
    hasMVP: { label: 'MVP', searchTerms: ['MVP', 'Most Valuable Player'] },
    wonDPOY: { label: 'Defensive Player of the Year', searchTerms: ['DPOY', 'Defensive Player'] },
    hasDPOY: { label: 'Defensive Player of the Year', searchTerms: ['DPOY', 'Defensive Player'] },
    wonROY: { label: 'Rookie of the Year', searchTerms: ['ROY', 'Rookie of the Year'] },
    hasROY: { label: 'Rookie of the Year', searchTerms: ['ROY', 'Rookie of the Year'] },
    wonFinalsMVP: { label: 'Finals MVP', searchTerms: ['Finals MVP', 'FMVP'] },
    wonSixMOY: { label: 'Sixth Man of the Year', searchTerms: ['SMOY', 'Sixth Man'] },
    hasAllStar: { label: 'All-Star', searchTerms: ['All-Star', 'All Star'] },
    madeAllStar: { label: 'All-Star', searchTerms: ['All-Star', 'All Star'] },
    wonChampionship: { label: 'Champion', searchTerms: ['Champion', 'Championship'] }
  };
  
  const award = awardMap[achievementId];
  if (!award) return null;
  
  const seasons = getAwardSeasons(player, award.searchTerms);
  if (seasons.length === 0) return null;
  
  let seasonText = '';
  if (seasons.length === 1) {
    seasonText = seasons[0].toString();
  } else if (seasons.length <= 3) {
    seasonText = seasons.join(', ');
  } else {
    seasonText = `${seasons.slice(0, 3).join(', ')}, +${seasons.length - 3}`;
  }
  
  // Use constraint label if provided, otherwise fall back to hardcoded label
  const displayLabel = constraintLabel || award.label;
  
  return {
    text: `${displayLabel} (${seasonText})`,
    type: 'award'
  };
}