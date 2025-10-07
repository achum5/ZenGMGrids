import { formatNumber } from '@/lib/utils';
import { BASKETBALL_NEGATIVE_MESSAGES, HOCKEY_NEGATIVE_MESSAGES, BASEBALL_NEGATIVE_MESSAGES, FOOTBALL_NEGATIVE_MESSAGES } from './feedback-messages';
import type { Player, Team } from '@/types/bbgm';
import { SEASON_ALIGNED_ACHIEVEMENTS, getAllAchievements, getCachedSportDetection } from '@/lib/achievements';
import { playerMeetsAchievement } from '@/lib/achievements';
import { SEASON_ACHIEVEMENTS, type SeasonAchievementId } from './season-achievements';
import { parseAchievementLabel, generateUpdatedLabel } from './editable-achievements';

export interface GridConstraint {
  type: 'team' | 'achievement';
  tid?: number;
  achievementId?: string;
  label: string;
}

interface ParsedCustomAchievement {
  baseId: string;
  threshold: number;
  operator: '≥' | '≤';
}

export function parseCustomAchievementId(id: string | undefined): ParsedCustomAchievement | null {
  console.log('parseCustomAchievementId called with:', id);
  if (!id || !id.includes('_custom_')) {
    return null;
  }
  const parts = id.split('_custom_');
  const baseId = parts[0];
  const customParts = parts[1].split('_');
  const threshold = parseFloat(customParts[0]);
  const operator = customParts[1] === 'lte' ? '≤' : '≥';

  if (baseId && !isNaN(threshold)) {
    return { baseId, threshold, operator };
  }
  return null;
}


// Season achievement metadata for modal copy
const SEASON_ACHIEVEMENT_LABELS: Record<SeasonAchievementId, {
  label: string;
  short: string;
  verbTeam: string;
  verbGeneric: string;
}> = {
  AllStar: {
    label: 'All-Star',
    short: 'All-Star',
    verbTeam: 'made an All-Star team',
    verbGeneric: 'made an All-Star team'
  },
  MVP: {
    label: 'Most Valuable Player',
    short: 'MVP',
    verbTeam: 'won an MVP',
    verbGeneric: 'won an MVP'
  },
  DPOY: {
    label: 'Defensive Player of the Year',
    short: 'DPOY',
    verbTeam: 'won a Defensive Player of the Year',
    verbGeneric: 'won a Defensive Player of the Year'
  },
  ROY: {
    label: 'Rookie of the Year',
    short: 'ROY',
    verbTeam: 'won Rookie of the Year',
    verbGeneric: 'won Rookie of the Year his rookie season'
  },
  SMOY: {
    label: 'Sixth Man of the Year',
    short: 'SMOY',
    verbTeam: 'won Sixth Man of the Year',
    verbGeneric: 'won Sixth Man of the Year'
  },
  MIP: {
    label: 'Most Improved Player',
    short: 'MIP',
    verbTeam: 'won Most Improved Player',
    verbGeneric: 'won Most Improved Player'
  },
  FinalsMVP: {
    label: 'Finals MVP',
    short: 'Finals MVP',
    verbTeam: 'won a Finals MVP',
    verbGeneric: 'won a Finals MVP'
  },
  SFMVP: {
    label: 'Conference Finals MVP',
    short: 'CFMVP',
    verbTeam: 'won a Conference Finals MVP',
    verbGeneric: 'won a Conference Finals MVP'
  },
  AllLeagueAny: {
    label: 'All-League Team',
    short: 'All-League',
    verbTeam: 'made an All-League Team',
    verbGeneric: 'made an All-League Team'
  },
  AllDefAny: {
    label: 'All-Defensive Team',
    short: 'All-Defensive',
    verbTeam: 'made an All-Defensive Team',
    verbGeneric: 'made an All-Defensive Team'
  },
  AllRookieAny: {
    label: 'All-Rookie Team',
    short: 'All-Rookie',
    verbTeam: 'made an All-Rookie Team',
    verbGeneric: 'made the All-Rookie team his rookie season'
  },
  PointsLeader: {
    label: 'League Points Leader',
    short: 'Points Leader',
    verbTeam: 'led the league in points',
    verbGeneric: 'led the league in points'
  },
  ReboundsLeader: {
    label: 'League Rebounds Leader',
    short: 'Rebounds Leader',
    verbTeam: 'led the league in rebounds',
    verbGeneric: 'led the league in rebounds'
  },
  AssistsLeader: {
    label: 'League Assists Leader',
    short: 'Assists Leader',
    verbTeam: 'led the league in assists',
    verbGeneric: 'led the league in assists'
  },
  StealsLeader: {
    label: 'League Steals Leader',
    short: 'Steals Leader',
    verbTeam: 'led the league in steals',
    verbGeneric: 'led the league in steals'
  },
  BlocksLeader: {
    label: 'League Blocks Leader',
    short: 'Blocks Leader',
    verbTeam: 'led the league in blocks',
    verbGeneric: 'led the league in blocks'
  },
  
  // Basketball GM Season Statistical Achievements (24 new achievements)
  Season30PPG: {
    label: '30+ PPG (Season)',
    short: '30+ PPG',
    verbTeam: 'averaged 30+ points per game in a season',
    verbGeneric: 'averaged 30+ points per game in a season'
  },
  Season2000Points: {
    label: '2,000+ Points (Season)',
    short: '2K Points',
    verbTeam: 'scored 2,000+ points in a season',
    verbGeneric: 'scored 2,000+ points in a season'
  },
  Season200_3PM: {
    label: '200+ 3PM (Season)',
    short: '200+ 3PM',
    verbTeam: 'made 200+ three-pointers in a season',
    verbGeneric: 'made 200+ three-pointers in a season'
  },
  Season12RPG: {
    label: '12+ RPG (Season)',
    short: '12+ RPG',
    verbTeam: 'averaged 12+ rebounds per game in a season',
    verbGeneric: 'averaged 12+ rebounds per game in a season'
  },
  Season10APG: {
    label: '10+ APG (Season)',
    short: '10+ APG',
    verbTeam: 'averaged 10+ assists per game in a season',
    verbGeneric: 'averaged 10+ assists per game in a season'
  },
  Season800Rebounds: {
    label: '800+ Rebounds (Season)',
    short: '800+ Rebounds',
    verbTeam: 'grabbed 800+ rebounds in a season',
    verbGeneric: 'grabbed 800+ rebounds in a season'
  },
  Season700Assists: {
    label: '700+ Assists (Season)',
    short: '700+ Assists',
    verbTeam: 'dished 700+ assists in a season',
    verbGeneric: 'dished 700+ assists in a season'
  },
  Season2SPG: {
    label: '2.0+ SPG (Season)',
    short: '2.0+ SPG',
    verbTeam: 'averaged 2.0+ steals per game in a season',
    verbGeneric: 'averaged 2.0+ steals per game in a season'
  },
  Season2_5BPG: {
    label: '2.5+ BPG (Season)',
    short: '2.5+ BPG',
    verbTeam: 'averaged 2.5+ blocks per game in a season',
    verbGeneric: 'averaged 2.5+ blocks per game in a season'
  },
  Season150Steals: {
    label: '150+ Steals (Season)',
    short: '150+ Steals',
    verbTeam: 'recorded 150+ steals in a season',
    verbGeneric: 'recorded 150+ steals in a season'
  },
  Season150Blocks: {
    label: '150+ Blocks (Season)',
    short: '150+ Blocks',
    verbTeam: 'recorded 150+ blocks in a season',
    verbGeneric: 'recorded 150+ blocks in a season'
  },
  Season200Stocks: {
    label: '200+ Stocks (Season)',
    short: '200+ Stocks',
    verbTeam: 'recorded 200+ combined steals and blocks in a season',
    verbGeneric: 'recorded 200+ combined steals and blocks in a season'
  },
  Season50_40_90: {
    label: '50/40/90 Club (Season)',
    short: '50/40/90 Club',
    verbTeam: 'joined the 50/40/90 club in a season',
    verbGeneric: 'joined the 50/40/90 club in a season'
  },

  Season60eFG500FGA: {
    label: '60%+ eFG (Season)',
    short: '60% eFG/500 FGA',
    verbTeam: 'shot 60%+ eFG on 500+ field goal attempts in a season',
    verbGeneric: 'shot 60%+ eFG on 500+ field goal attempts in a season'
  },
  Season90FT250FTA: {
    label: '90%+ FT (Season)',
    short: '90% FT/250 FTA',
    verbTeam: 'shot 90%+ FT on 250+ free throw attempts in a season',
    verbGeneric: 'shot 90%+ FT on 250+ free throw attempts in a season'
  },
  SeasonFGPercent: {
    label: '40%+ FG (Season)',
    short: '40% FG/300 FGA',
    verbTeam: 'shot 40%+ FG on 300+ field goal attempts in a season',
    verbGeneric: 'shot 40%+ FG on 300+ field goal attempts in a season'
  },
  Season3PPercent: {
    label: '40%+ 3PT (Season)',
    short: '40% 3PT/100 3PA',
    verbTeam: 'shot 40%+ 3PT on 100+ three-point attempts in a season',
    verbGeneric: 'shot 40%+ 3PT on 100+ three-point attempts in a season'
  },
  Season70Games: {
    label: '70+ Games Played (Season)',
    short: '70+ Games',
    verbTeam: 'played 70+ games in a season',
    verbGeneric: 'played 70+ games in a season'
  },
  Season36MPG: {
    label: '36.0+ MPG (Season)',
    short: '36+ MPG',
    verbTeam: 'averaged 36.0+ minutes per game in a season',
    verbGeneric: 'averaged 36.0+ minutes per game in a season'
  },
  Season25_10: {
    label: '25/10 Season (PPG/RPG)',
    short: '25/10 Season',
    verbTeam: 'had a 25/10 season (PPG/RPG)',
    verbGeneric: 'had a 25/10 season (PPG/RPG)'
  },
  Season25_5_5: {
    label: '25/5/5 Season (PPG/RPG/APG)',
    short: '25/5/5 Season',
    verbTeam: 'had a 25/5/5 season (PPG/RPG/APG)',
    verbGeneric: 'had a 25/5/5 season (PPG/RPG/APG)'
  },
  Season20_10_5: {
    label: '20/10/5 Season (PPG/RPG/APG)',
    short: '20/10/5 Season',
    verbTeam: 'had a 20/10/5 season (PPG/RPG/APG)',
    verbGeneric: 'had a 20/10/5 season (PPG/RPG/APG)'
  },
  Season1_1_1: {
    label: '1/1/1 Season (SPG/BPG/3PM/G)',
    short: '1/1/1 Season',
    verbTeam: 'had a 1/1/1 season (SPG/BPG/3PM/G)',
    verbGeneric: 'had a 1/1/1 season (SPG/BPG/3PM/G)'
  },
  
  // Football GM season achievements
  FBAllStar: {
    label: 'All-Star',
    short: 'All-Star',
    verbTeam: 'made an All-Star team',
    verbGeneric: 'made an All-Star team'
  },
  FBMVP: {
    label: 'Most Valuable Player',
    short: 'MVP',
    verbTeam: 'won an MVP',
    verbGeneric: 'won an MVP'
  },
  FBDPOY: {
    label: 'Defensive Player of the Year',
    short: 'DPOY',
    verbTeam: 'won a Defensive Player of the Year',
    verbGeneric: 'won a Defensive Player of the Year'
  },
  FBOffROY: {
    label: 'Offensive Rookie of the Year',
    short: 'Offensive ROY',
    verbTeam: 'won Offensive Rookie of the Year',
    verbGeneric: 'won Offensive Rookie of the Year his rookie season'
  },
  FBDefROY: {
    label: 'Defensive Rookie of the Year',
    short: 'Defensive ROY',
    verbTeam: 'won Defensive Rookie of the Year',
    verbGeneric: 'won Defensive Rookie of the Year his rookie season'
  },
  FBAllRookie: {
    label: 'All-Rookie Team',
    short: 'All-Rookie',
    verbTeam: 'made an All-Rookie Team',
    verbGeneric: 'made the All-Rookie team his rookie season'
  },
  FBAllLeague: {
    label: 'All-League Team',
    short: 'All-League',
    verbTeam: 'made an All-League Team',
    verbGeneric: 'made an All-League Team'
  },
  FBFinalsMVP: {
    label: 'Finals MVP',
    short: 'Finals MVP',
    verbTeam: 'won a Finals MVP',
    verbGeneric: 'won a Finals MVP'
  },
  FBChampion: {
    label: 'Won Championship',
    short: 'Champion',
    verbTeam: 'won a championship',
    verbGeneric: 'won a championship'
  },
  FBSeason4kPassYds: {
    label: '4,000+ Passing Yards (Season)',
    short: '4K Pass Yds',
    verbTeam: 'threw for 4,000+ yards in a season',
    verbGeneric: 'threw for 4,000+ yards in a season'
  },
  FBSeason1200RushYds: {
    label: '1,200+ Rushing Yards (Season)',
    short: '1.2K Rush Yds',
    verbTeam: 'rushed for 1,200+ yards in a season',
    verbGeneric: 'rushed for 1,200+ yards in a season'
  },
  FBSeason100Receptions: {
    label: '100+ Receptions (Season)',
    short: '100 Rec',
    verbTeam: 'had 100+ receptions in a season',
    verbGeneric: 'had 100+ receptions in a season'
  },
  FBSeason15Sacks: {
    label: '15+ Sacks (Season)',
    short: '15 Sacks',
    verbTeam: 'had 15+ sacks in a season',
    verbGeneric: 'had 15+ sacks in a season'
  },
  FBSeason140Tackles: {
    label: '140+ Tackles (Season)',
    short: '140 Tackles',
    verbTeam: 'had 140+ tackles in a season',
    verbGeneric: 'had 140+ tackles in a season'
  },
  FBSeason5Interceptions: {
    label: '5+ Interceptions (Season)',
    short: '5 INTs',
    verbTeam: 'had 5+ interceptions in a season',
    verbGeneric: 'had 5+ interceptions in a season'
  },
  FBSeason30PassTD: {
    label: '30+ Passing TD (Season)',
    short: '30 Pass TD',
    verbTeam: 'threw 30+ touchdown passes in a season',
    verbGeneric: 'threw 30+ touchdown passes in a season'
  },
  FBSeason1300RecYds: {
    label: '1,300+ Receiving Yards (Season)',
    short: '1.3K Rec Yds',
    verbTeam: 'had 1,300+ receiving yards in a season',
    verbGeneric: 'had 1,300+ receiving yards in a season'
  },
  FBSeason10RecTD: {
    label: '10+ Receiving TD (Season)',
    short: '10 Rec TD',
    verbTeam: 'had 10+ receiving touchdowns in a season',
    verbGeneric: 'had 10+ receiving touchdowns in a season'
  },
  FBSeason12RushTD: {
    label: '12+ Rushing TD (Season)',
    short: '12 Rush TD',
    verbTeam: 'had 12+ rushing touchdowns in a season',
    verbGeneric: 'had 12+ rushing touchdowns in a season'
  },
  FBSeason1600Scrimmage: {
    label: '1,600+ Yards from Scrimmage (Season)',
    short: '1.6K Scrimmage',
    verbTeam: 'had 1,600+ yards from scrimmage in a season',
    verbGeneric: 'had 1,600+ yards from scrimmage in a season'
  },
  FBSeason2000AllPurpose: {
    label: '2,000+ All-Purpose Yards (Season)',
    short: '2K All-Purpose',
    verbTeam: 'had 2,000+ all-purpose yards in a season',
    verbGeneric: 'had 2,000+ all-purpose yards in a season'
  },
  FBSeason15TFL: {
    label: '15+ Tackles for Loss (Season)',
    short: '15 TFL',
    verbTeam: 'had 15+ tackles for loss in a season',
    verbGeneric: 'had 15+ tackles for loss in a season'
  },
  
  // Hockey GM season achievements
  HKAllStar: {
    label: 'All-Star',
    short: 'All-Star',
    verbTeam: 'made an All-Star team',
    verbGeneric: 'made an All-Star team'
  },
  HKAllStarMVP: {
    label: 'All-Star MVP',
    short: 'All-Star MVP',
    verbTeam: 'won an All-Star MVP',
    verbGeneric: 'won an All-Star MVP'
  },
  HKMVP: {
    label: 'Most Valuable Player',
    short: 'MVP',
    verbTeam: 'won an MVP',
    verbGeneric: 'won an MVP'
  },
  HKROY: {
    label: 'Rookie of the Year',
    short: 'ROY',
    verbTeam: 'won Rookie of the Year',
    verbGeneric: 'won Rookie of the Year his rookie season'
  },
  HKAllRookie: {
    label: 'All-Rookie Team',
    short: 'All-Rookie',
    verbTeam: 'made an All-Rookie Team',
    verbGeneric: 'made the All-Rookie team his rookie season'
  },
  HKAllLeague: {
    label: 'All-League Team',
    short: 'All-League',
    verbTeam: 'made an All-League Team',
    verbGeneric: 'made an All-League Team'
  },
  HKAssistsLeader: {
    label: 'League Assists Leader',
    short: 'Assists Leader',
    verbTeam: 'led the league in assists',
    verbGeneric: 'led the league in assists'
  },
  HKPlayoffsMVP: {
    label: 'Playoffs MVP',
    short: 'Playoffs MVP',
    verbTeam: 'won a Playoffs MVP',
    verbGeneric: 'won a Playoffs MVP'
  },
  HKChampion: {
    label: 'Won Championship',
    short: 'Champion',
    verbTeam: 'won a championship',
    verbGeneric: 'won a championship'
  },
  
  // Hockey GM Season Statistical Achievements (19 new achievements)
  HKSeason40Goals: {
    label: '40+ Goals (Season)',
    short: '40+ Goals',
    verbTeam: 'scored 40+ goals in a season',
    verbGeneric: 'scored 40+ goals in a season'
  },
  HKSeason60Assists: {
    label: '60+ Assists (Season)',
    short: '60+ Assists',
    verbTeam: 'recorded 60+ assists in a season',
    verbGeneric: 'recorded 60+ assists in a season'
  },
  HKSeason90Points: {
    label: '90+ Points (Season)',
    short: '90+ Points',
    verbTeam: 'recorded 90+ points in a season',
    verbGeneric: 'recorded 90+ points in a season'
  },
  HKSeason25Plus: {
    label: '+25 Plus/Minus (Season)',
    short: '+25 Plus/Minus',
    verbTeam: 'had a +25 or better plus/minus in a season',
    verbGeneric: 'had a +25 or better plus/minus in a season'
  },
  HKSeason250Shots: {
    label: '250+ Shots (Season)',
    short: '250+ Shots',
    verbTeam: 'recorded 250+ shots in a season',
    verbGeneric: 'recorded 250+ shots in a season'
  },
  HKSeason150Hits: {
    label: '150+ Hits (Season)',
    short: '150+ Hits',
    verbTeam: 'recorded 150+ hits in a season',
    verbGeneric: 'recorded 150+ hits in a season'
  },
  HKSeason100Blocks: {
    label: '100+ Blocks (Season)',
    short: '100+ Blocks',
    verbTeam: 'recorded 100+ blocked shots in a season',
    verbGeneric: 'recorded 100+ blocked shots in a season'
  },
  HKSeason60Takeaways: {
    label: '60+ Takeaways (Season)',
    short: '60+ Takeaways',
    verbTeam: 'recorded 60+ takeaways in a season',
    verbGeneric: 'recorded 60+ takeaways in a season'
  },
  HKSeason20PowerPlay: {
    label: '20+ Power-Play Points (Season)',
    short: '20+ PP Points',
    verbTeam: 'recorded 20+ power-play points in a season',
    verbGeneric: 'recorded 20+ power-play points in a season'
  },
  HKSeason3SHGoals: {
    label: '3+ Short-Handed Goals (Season)',
    short: '3+ SH Goals',
    verbTeam: 'scored 3+ short-handed goals in a season',
    verbGeneric: 'scored 3+ short-handed goals in a season'
  },
  HKSeason7GWGoals: {
    label: '7+ Game-Winning Goals (Season)',
    short: '7+ GW Goals',
    verbTeam: 'scored 7+ game-winning goals in a season',
    verbGeneric: 'scored 7+ game-winning goals in a season'
  },
  HKSeason55FaceoffPct: {
    label: '55%+ Faceoff Win Rate (Season)',
    short: '55%+ Faceoffs',
    verbTeam: 'had a 55%+ faceoff win rate in a season',
    verbGeneric: 'had a 55%+ faceoff win rate in a season'
  },
  HKSeason22TOI: {
    label: '22:00+ TOI per Game (Season)',
    short: '22:00+ TOI/Game',
    verbTeam: 'averaged 22:00+ TOI per game in a season',
    verbGeneric: 'averaged 22:00+ TOI per game in a season'
  },
  HKSeason70PIM: {
    label: '70+ PIM (Season)',
    short: '70+ PIM',
    verbTeam: 'recorded 70+ penalty minutes in a season',
    verbGeneric: 'recorded 70+ penalty minutes in a season'
  },
  HKSeason920SavePct: {
    label: '.920+ Save Percentage (Season)',
    short: '.920+ SV%',
    verbTeam: 'had a .920+ save percentage in a season',
    verbGeneric: 'had a .920+ save percentage in a season'
  },
  HKSeason260GAA: {
    label: '≤2.60 GAA (Season)',
    short: '≤2.60 GAA',
    verbTeam: 'had a 2.60 or lower GAA in a season',
    verbGeneric: 'had a 2.60 or lower GAA in a season'
  },
  HKSeason6Shutouts: {
    label: '6+ Shutouts (Season)',
    short: '6+ Shutouts',
    verbTeam: 'recorded 6+ shutouts in a season',
    verbGeneric: 'recorded 6+ shutouts in a season'
  },
  HKSeason2000Saves: {
    label: '2000+ Saves (Season)',
    short: '2000+ Saves',
    verbTeam: 'made 2000+ saves in a season',
    verbGeneric: 'made 2000+ saves in a season'
  },
  HKSeason60Starts: {
    label: '60+ Starts (Season)',
    short: '60+ Starts',
    verbTeam: 'made 60+ starts in a season',
    verbGeneric: 'made 60+ starts in a season'
  },
  
  // Baseball GM season achievements
  BBAllStar: {
    label: 'All-Star',
    short: 'All-Star',
    verbTeam: 'made an All-Star team',
    verbGeneric: 'made an All-Star team'
  },
  BBMVP: {
    label: 'Most Valuable Player',
    short: 'MVP',
    verbTeam: 'won an MVP',
    verbGeneric: 'won an MVP'
  },
  BBROY: {
    label: 'Rookie of the Year',
    short: 'ROY',
    verbTeam: 'won Rookie of the Year',
    verbGeneric: 'won Rookie of the Year his rookie season'
  },
  BBAllRookie: {
    label: 'All-Rookie Team',
    short: 'All-Rookie',
    verbTeam: 'made an All-Rookie Team',
    verbGeneric: 'made the All-Rookie team his rookie season'
  },
  BBAllLeague: {
    label: 'All-League Team',
    short: 'All-League',
    verbTeam: 'made an All-League Team',
    verbGeneric: 'made an All-League Team'
  },
  BBPlayoffsMVP: {
    label: 'Playoffs MVP',
    short: 'Playoffs MVP',
    verbTeam: 'won a Playoffs MVP',
    verbGeneric: 'won a Playoffs MVP'
  },
  BBChampion: {
    label: 'Won Championship',
    short: 'Champion',
    verbTeam: 'won a championship',
    verbGeneric: 'won a championship'
  },

  // Additional missing achievements
  Champion: {
    label: 'Won Championship',
    short: 'Champion',
    verbTeam: 'won a championship',
    verbGeneric: 'won a championship'
  },
  HKDefenseman: {
    label: 'Best Defenseman',
    short: 'Best Defenseman',
    verbTeam: 'won Best Defenseman',
    verbGeneric: 'won Best Defenseman'
  },
  HKFinalsMVP: {
    label: 'Finals MVP',
    short: 'Finals MVP',
    verbTeam: 'won a Finals MVP',
    verbGeneric: 'won a Finals MVP'
  }
};

// Helper function to check if an achievement ID is a season achievement
function isSeasonAchievement(achievementId: string): achievementId is SeasonAchievementId {
  return Object.keys(SEASON_ACHIEVEMENT_LABELS).includes(achievementId as SeasonAchievementId);
}

// Helper function to get season achievement data for a player
function getPlayerSeasonAchievementData(player: Player, achievementId: SeasonAchievementId, teamId?: number) {
  if (!player.awards) {
    return {
      count: 0,
      seasons: [] as number[],
      seasonsWithTeam: [] as string[]
    };
  }

  // Map achievement ID to award type patterns
  const awardTypePatterns: Record<SeasonAchievementId, string[]> = {
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
    
    // Football GM achievements (exact case-sensitive matches from FBGM)
    FBAllStar: ['All-Star'],
    FBMVP: ['Most Valuable Player'],
    FBDPOY: ['Defensive Player of the Year'],
    FBOffROY: ['Offensive Rookie of the Year'],
    FBDefROY: ['Defensive Rookie of the Year'],
    FBAllRookie: ['All-Rookie Team'],
    FBAllLeague: ['First Team All-League', 'Second Team All-League'],
    FBFinalsMVP: ['Finals MVP'],
    FBChampion: ['Won Championship'],
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
    
    // Hockey GM achievements (case-insensitive matches from ZGMH)
    HKAllStar: ['All-Star', 'all-star'],
    HKAllStarMVP: ['All-Star MVP', 'all-star mvp'],
    HKMVP: ['Most Valuable Player', 'most valuable player'],
    HKROY: ['Rookie of the Year', 'rookie of the year'],
    HKAllRookie: ['All-Rookie Team', 'all-rookie team'],
    HKAllLeague: ['All-League Team', 'all-league team', 'First Team All-League', 'Second Team All-League'],
    HKAssistsLeader: ['League Assists Leader', 'league assists leader'],
    HKPlayoffsMVP: ['Playoffs MVP', 'playoffs mvp'],
    HKChampion: ['Won Championship', 'won championship'],
    
    // Baseball GM achievements (case-sensitive matches from ZGMB)
    BBAllStar: ['All-Star'],
    BBMVP: ['Most Valuable Player'],
    BBROY: ['Rookie of the Year'],
    BBAllRookie: ['All-Rookie Team'],
    BBAllLeague: ['All-League Team', 'First Team All-League', 'Second Team All-League'],
    BBPlayoffsMVP: ['Playoffs MVP', 'Finals MVP'],
    BBChampion: ['Won Championship'],

    // Additional missing achievements
    Champion: ['Won Championship', 'won championship'],
    HKDefenseman: ['Best Defenseman', 'best defenseman'],
    HKFinalsMVP: ['Finals MVP', 'finals mvp'],

    // All missing Season achievements from LSP errors
    Season30PPG: ['30+ PPG', '30 points per game'],
    Season2000Points: ['2000+ Points', '2000 points'],
    Season200_3PM: ['200+ 3PM', '200 three-pointers'],
    Season12RPG: ['12+ RPG', '12 rebounds per game'],
    Season10APG: ['10+ APG', '10 assists per game'],
    Season800Rebounds: ['800+ Rebounds', '800 rebounds'],
    Season700Assists: ['700+ Assists', '700 assists'],
    Season2SPG: ['2+ SPG', '2 steals per game'],
    Season2_5BPG: ['2.5+ BPG', '2.5 blocks per game'],
    Season150Steals: ['150+ Steals', '150 steals'],
    Season150Blocks: ['150+ Blocks', '150 blocks'],
    Season200Stocks: ['200+ Stocks', '200 steals+blocks'],
    Season50_40_90: ['50/40/90 Season', '50-40-90'],

    Season60eFG500FGA: ['60% eFG (500+ FGA)', '60 effective FG'],
  'Season90FT250FTA': ['90% FT (250+ FTA)', '90 free-throw'],
  'SeasonFGPercent': ['40% FG (300+ FGA)', '40 field-goal'],
  'Season3PPercent': ['40% 3PT (100+ 3PA)', '40 three-point'],
    Season70Games: ['70+ Games', '70 games'],
    Season36MPG: ['36+ MPG', '36 minutes per game'],
    Season25_10: ['25/10 Season (PPG/RPG)', '25-10 season'],
    Season25_5_5: ['25/5/5 Season (PPG/RPG/APG)', '25-5-5 season'],
    Season20_10_5: ['20/10/5 Season (PPG/RPG/APG)', '20-10-5 season'],
    Season1_1_1: ['1/1/1 Season (PPG/RPG/APG)', '1-1-1 season'],
    
    // Hockey achievements  
    HKSeason40Goals: ['40+ Goals', '40 goals'],
    HKSeason60Assists: ['60+ Assists', '60 assists'],
    HKSeason90Points: ['90+ Points', '90 points'],
    HKSeason25Plus: ['25+ Plus/Minus', '+25 plus-minus'],
    HKSeason250Shots: ['250+ Shots', '250 shots'],
    HKSeason150Hits: ['150+ Hits', '150 hits'],
    HKSeason100Blocks: ['100+ Blocks', '100 blocks'],
    HKSeason60Takeaways: ['60+ Takeaways', '60 takeaways'],
    HKSeason20PowerPlay: ['20+ PP Goals', '20 power play goals'],
    HKSeason3SHGoals: ['3+ SH Goals', '3 short-handed goals'],
    HKSeason7GWGoals: ['7+ GW Goals', '7 game-winning goals'],
    HKSeason55FaceoffPct: ['55%+ Faceoff %', '55% faceoff'],
    HKSeason22TOI: ['22+ TOI/GP', '22 minutes time on ice'],
    HKSeason70PIM: ['70+ PIM', '70 penalty minutes'],
    HKSeason920SavePct: ['.920+ Save %', '920 save percentage'],
    HKSeason260GAA: ['2.60- GAA', '2.60 goals against'],
    HKSeason6Shutouts: ['6+ Shutouts', '6 shutouts'],
    HKSeason2000Saves: ['2000+ Saves', '2000 saves'],
    HKSeason60Starts: ['60+ Starts', '60 starts']
  };

  const patterns = awardTypePatterns[achievementId] || [];
  const matchingAwards = player.awards.filter(award => {
    const awardType = (award.type || '').toLowerCase();
    const awardName = '';
    return patterns.some(pattern => 
      awardType.includes(pattern.toLowerCase()) || 
      awardName.includes(pattern.toLowerCase())
    );
  });

  // Extract seasons and format with team info if needed
  const seasonsWithTeam: string[] = [];
  const seasons: number[] = [];

  for (const award of matchingAwards) {
    if (award.season) {
      seasons.push(award.season);
      
      // For Finals MVP and Conference Finals MVP (BBGM, FBGM, HKGM, and BBGM), include team abbreviation
      if (achievementId === 'FinalsMVP' || achievementId === 'SFMVP' || achievementId === 'FBFinalsMVP' || achievementId === 'HKPlayoffsMVP' || achievementId === 'HKChampion' || achievementId === 'BBPlayoffsMVP' || achievementId === 'BBChampion') {
        // Try to get team from playoffs stats for that season
        const playoffTeam = getPlayoffTeamForSeason(player, award.season);
        if (playoffTeam) {
          seasonsWithTeam.push(`${award.season} ${playoffTeam}`);
        } else {
          seasonsWithTeam.push(`${award.season}`);
        }
      } else {
        seasonsWithTeam.push(`${award.season}`);
      }
    }
  }

  // Sort seasons
  seasons.sort((a, b) => a - b);
  seasonsWithTeam.sort();

  return {
    count: matchingAwards.length,
    seasons,
    seasonsWithTeam
  };
}

// Helper function to get playoff team abbreviation for a season
function getPlayoffTeamForSeason(player: Player, season: number): string | null {
  if (!player.stats) return null;
  
  const playoffStats = player.stats.find(s => 
    s.season === season && s.playoffs && (s.gp || 0) > 0
  );
  
  if (playoffStats) {
    // Return null instead of generic team identifier - team names will be resolved elsewhere
    return null;
  }
  
  return null;
}

// Helper function to format consecutive years with hyphens
function formatYearsWithRanges(years: number[]): string {
  if (years.length === 0) return '';
  if (years.length === 1) return years[0].toString();
  
  const ranges: string[] = [];
  let start = years[0];
  let end = years[0];
  
  for (let i = 1; i < years.length; i++) {
    if (years[i] === end + 1) {
      // Consecutive year, extend the range
      end = years[i];
    } else {
      // Non-consecutive, push the current range and start a new one
      if (start === end) {
        ranges.push(start.toString());
      } else {
        ranges.push(`${start}-${end}`);
      }
      start = years[i];
      end = years[i];
    }
  }
  
  // Don't forget the final range
  if (start === end) {
    ranges.push(start.toString());
  } else {
    ranges.push(`${start}-${end}`);
  }
  
  return ranges.join(', ');
}

// Helper function to format season lists
function formatSeasonList(seasons: string[], isFinalsOrCFMVP: boolean = false): string {
  if (seasons.length === 0) return '';
  if (seasons.length === 1) return seasons[0];
  
  // For Finals MVP/CFMVP, use semicolon separator: "1994 HOU; 1995 HOU"
  if (isFinalsOrCFMVP) {
    return seasons.join('; ');
  }
  
  // For other awards, try to parse years and format with ranges
  const numericYears = seasons
    .map(s => parseInt(s, 10))
    .filter(year => !isNaN(year))
    .sort((a, b) => a - b);
    
  if (numericYears.length === seasons.length) {
    // All seasons are numeric years, format with ranges
    return formatYearsWithRanges(numericYears);
  }
  
  // Fall back to comma separator if seasons contain non-numeric data
  return seasons.join(', ');
}

// Helper functions for football stat calculations
function getFootballCareerStats(player: Player) {
  if (!player.stats || !Array.isArray(player.stats)) {
    return { passTDs: 0, rushYds: 0, rushTDs: 0, recYds: 0, recTDs: 0, sacks: 0, ints: 0 };
  }

  let passTDs = 0, rushYds = 0, rushTDs = 0, recYds = 0, recTDs = 0, sacks = 0, ints = 0;
  
  player.stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season
    
    passTDs += season.pssTD || 0;
    rushYds += season.rusYds || 0;
    rushTDs += season.rusTD || 0;
    recYds += season.recYds || 0;
    recTDs += season.recTD || 0;
    sacks += season.sk ?? season.defSk ?? 0;
    ints += season.defInt || 0;
  });
  
  return { passTDs, rushYds, rushTDs, recYds, recTDs, sacks, ints };
}

function getFootballSeasonBests(player: Player) {
  if (!player.stats || !Array.isArray(player.stats)) {
    return { 
      passTDs: { max: 0, year: 0 }, rushYds: { max: 0, year: 0 }, rushTDs: { max: 0, year: 0 },
      recYds: { max: 0, year: 0 }, recTDs: { max: 0, year: 0 }, sacks: { max: 0, year: 0 }, 
      ints: { max: 0, year: 0 }
    };
  }

  let passTDs = { max: 0, year: 0 }, rushYds = { max: 0, year: 0 }, rushTDs = { max: 0, year: 0 };
  let recYds = { max: 0, year: 0 }, recTDs = { max: 0, year: 0 }, sacks = { max: 0, year: 0 }, ints = { max: 0, year: 0 };
  
  player.stats.forEach((season: any) => {
    if (season.playoffs) return;
    
    if ((season.pssTD || 0) > passTDs.max) {
      passTDs = { max: season.pssTD || 0, year: season.season };
    }
    if ((season.rusYds || 0) > rushYds.max) {
      rushYds = { max: season.rusYds || 0, year: season.season };
    }
    if ((season.rusTD || 0) > rushTDs.max) {
      rushTDs = { max: season.rusTD || 0, year: season.season };
    }
    if ((season.recYds || 0) > recYds.max) {
      recYds = { max: season.recYds || 0, year: season.season };
    }
    if ((season.recTD || 0) > recTDs.max) {
      recTDs = { max: season.recTD || 0, year: season.season };
    }
    const seasonSacks = season.sk ?? season.defSk ?? 0;
    if (seasonSacks > sacks.max) {
      sacks = { max: seasonSacks, year: season.season };
    }
    if ((season.defInt || 0) > ints.max) {
      ints = { max: season.defInt || 0, year: season.season };
    }
  });
  
  return { passTDs, rushYds, rushTDs, recYds, recTDs, sacks, ints };
}



/**
 * Universal function to convert achievement IDs to human-readable text
 * Handles dynamic decade achievements, Season* achievements, and other patterns
 */
function getHumanReadableAchievementText(achievementId: string): string {
  console.log('getHumanReadableAchievementText called with:', achievementId);
  const parsedCustom = parseCustomAchievementId(achievementId);
  if (parsedCustom) {
    // Use a default sport since we don't have the context here, but it's mostly for parsing structure.
    const sport = getCachedSportDetection() || 'basketball';
    const allAchievements = getAllAchievements(sport, undefined, undefined);
    const originalAchievement = allAchievements.find(ach => ach.id === parsedCustom.baseId);

    if (originalAchievement) {
      const parsedLabel = parseAchievementLabel(originalAchievement.label, sport);
      if (parsedLabel.isEditable) {
        // Generate the clean label like "fewer than 100 steals"
        return generateUpdatedLabel(parsedLabel, parsedCustom.threshold, parsedCustom.operator)
          .replace(/\s*\([^)]*\)/, '') // Remove parenthetical content like (Season)
          .trim();
      }
    }
    // Fallback if original achievement can't be found
    const fallbackStatName = parsedCustom.baseId
      .replace(/([A-Z])/g, ' $1')
      .replace(/^Season\s*/, '')
      .replace(/^FB\s*/, '')
      .replace(/^HK\s*/, '')
      .replace(/^BB\s*/, '')
      .toLowerCase()
      .trim();
    return `${parsedCustom.operator === '≤' ? 'fewer than' : ''} ${parsedCustom.threshold.toLocaleString()} ${fallbackStatName}`;
  }
  
  // Handle dynamic decade achievements
  if (achievementId.includes('playedIn') && achievementId.endsWith('s')) {
    const decadeMatch = achievementId.match(/playedIn(\d{4})s/);
    if (decadeMatch) {
      const decade = decadeMatch[1];
      const parsedCustom = parseCustomAchievementId(achievementId);
      if (parsedCustom) {
        return generateUpdatedLabel({ originalLabel: `Played in ${decade}+ Decades`, prefix: 'Played in ', number: parseInt(decade), suffix: '+ Decades', isEditable: true }, parsedCustom.threshold, parsedCustom.operator)
          .trim();
      }
      return `played in the ${decade}s`;
    }
  }
  
  if (achievementId.includes('debutedIn') && achievementId.endsWith('s')) {
    const decadeMatch = achievementId.match(/debutedIn(\d{4})s/);
    if (decadeMatch) {
      const decade = decadeMatch[1];
      const parsedCustom = parseCustomAchievementId(achievementId);
      if (parsedCustom) {
        return generateUpdatedLabel({ originalLabel: `Debuted in ${decade}s`, prefix: 'Debuted in ', number: parseInt(decade), suffix: 's', isEditable: true }, parsedCustom.threshold, parsedCustom.operator)
          .trim();
      }
      return `debuted in the ${decade}s`;
    }
  }
  
  
  // Handle special multi-decade achievements
  if (achievementId === 'playedInThreeDecades') {
    const parsedCustom = parseCustomAchievementId(achievementId);
    if (parsedCustom) {
      return generateUpdatedLabel({ originalLabel: 'Played in 3+ Decades', prefix: 'Played in ', number: 3, suffix: '+ Decades', isEditable: true }, parsedCustom.threshold, parsedCustom.operator)
        .trim();
    }
    return `played in 3 different decades`;
  }
  // Handle age-related achievements
  if (achievementId.includes('playedAt') && achievementId.includes('Plus')) {
    const ageMatch = achievementId.match(/playedAt(\d+)Plus/);
    if (ageMatch) {
      const age = ageMatch[1];
      return `played at age ${age}+`;
    }
  }
  
  // Handle Season* achievements
  if (achievementId.startsWith('Season')) {
    // Map common Season* achievement patterns
    const seasonMappings: Record<string, string> = {
      'Season30PPG': 'averaged 30+ PPG in a season',
      'Season2000Points': 'scored 2,000+ points in a season',
      'Season200_3PM': 'made 200+ threes in a season',
      'Season12RPG': 'averaged 12+ RPG in a season',
      'Season10APG': 'averaged 10+ APG in a season',
      'Season800Rebounds': 'grabbed 800+ rebounds in a season',
      'Season700Assists': 'recorded 700+ assists in a season',
      'Season2SPG': 'averaged 2.0+ SPG in a season',
      'Season2_5BPG': 'averaged 2.5+ BPG in a season',
      'Season150Steals': 'recorded 150+ steals in a season',
      'Season150Blocks': 'recorded 150+ blocks in a season',
      'Season200Stocks': 'recorded 200+ stocks in a season',
      'Season50_40_90': 'achieved 50/40/90 shooting in a season',

      'Season60eFG500FGA': 'shot 60%+ eFG on 500+ FGA in a season',
        'Season90FT250FTA': 'shot 90%+ FT on 250+ FTA in a season',
  'SeasonFGPercent': 'shot 40%+ FG on 300+ FGA in a season',
  'Season3PPercent': 'shot 40%+ 3PT on 100+ 3PA in a season',      'Season70Games': 'played 70+ games in a season',
      'Season36MPG': 'averaged 36.0+ MPG in a season',
      'Season25_10': 'achieved 25/10 season (PPG/RPG)',
      'Season25_5_5': 'achieved 25/5/5 season (PPG/RPG/APG)',
      'Season20_10_5': 'achieved 20/10/5 season (PPG/RPG/APG)',
      'Season1_1_1': 'achieved 1/1/1 season (SPG/BPG/3PM/G)'
    };
    
    if (seasonMappings[achievementId]) {
      return seasonMappings[achievementId];
    }
  }
  
  // Handle career achievements
  if (achievementId.includes('career')) {
    // Use pattern matching for career achievements
    const careerMatch = achievementId.match(/career(\d+)k?(.+)/);
    if (careerMatch) {
      const [, number, stat] = careerMatch;
      const formattedNumber = number.includes('k') ? `${number}000` : number;
      const formattedStat = stat.toLowerCase();
      return `reached ${formattedNumber}+ career ${formattedStat}`;
    }
  }
  
  // Handle other common patterns
  const commonMappings: Record<string, string> = {
    'oneTeamOnly': 'spent entire career with one team',
    'isHallOfFamer': 'was inducted into the Hall of Fame',
    'isPick1Overall': 'the #1 overall pick',
    'isFirstRoundPick': 'was a first round draft pick',
    'isSecondRoundPick': 'was a second round draft pick',
    'isUndrafted': 'went undrafted',
    'draftedTeen': 'was drafted as a teenager',
    'bornOutsideUS50DC': 'was born outside the US (50 states + DC)',
    'played15PlusSeasons': 'played 15+ seasons',
    'playedInThreeDecades': 'played in three different decades',
    'allStar35Plus': 'made All-Star team at age 35+'
  };
  
  if (commonMappings[achievementId]) {
    return commonMappings[achievementId];
  }
  
  // Final fallback: convert camelCase to readable text
  const readable = achievementId
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/^\s+/, '')
    .replace(/\s+/g, ' ');
    
  return `achieved ${readable}`;
}

// Football-specific message generation with detailed stats
function getFootballPositiveMessage(achievementId: string, player?: Player): string {
  if (!player) {
    // Fallback messages without detailed stats
    const fallbacks: Record<string, string> = {
      career300PassTDs: "threw 150+ career TDs",
      season35PassTDs: "had 35+ pass TDs in a season",
      career12kRushYds: "ran for 8,000+ career yards",
      career100RushTDs: "scored 40+ rushing TDs",
      season1800RushYds: "had 1,600+ rushing yards in a season",
      season20RushTDs: "had 20+ rushing TDs in a season",
      career12kRecYds: "had 6,000+ career receiving yards",
      career100RecTDs: "scored 40+ receiving TDs",
      season1400RecYds: "had 1,400+ receiving yards in a season",
      season15RecTDs: "had 15+ receiving TDs in a season",
      career100Sacks: "recorded 60+ career sacks",
      career20Ints: "recorded 20+ career interceptions",
      season15Sacks: "had 15+ sacks in a season",
      season8Ints: "had 8+ interceptions in a season",
      wonMVP: "won MVP",
      wonOPOY: "won Offensive Player of the Year",
      wonDPOY: "won Defensive Player of the Year",
      wonROY: "won Rookie of the Year"
    };
    return fallbacks[achievementId] || getHumanReadableAchievementText(achievementId);
  }

  const careerStats = getFootballCareerStats(player);
  const seasonBests = getFootballSeasonBests(player);

  switch (achievementId) {
    case 'isPick1Overall':
      const draftYear = player.draft?.year || 'unknown';
      return `was the #1 overall pick (${draftYear})`;
    case 'career300PassTDs':
      return `threw 150+ career pass TDs (${formatNumber(careerStats.passTDs)})`;
    case 'season35PassTDs':
      return `had 35+ pass TDs in a season (${seasonBests.passTDs.max}) in ${seasonBests.passTDs.year}`;
    case 'career12kRushYds':
      return `ran for 8,000+ career rushing yards (${formatNumber(careerStats.rushYds)})`;
    case 'career100RushTDs':
      return `scored 40+ career rushing TDs (${formatNumber(careerStats.rushTDs)})`;
    case 'season1800RushYds':
      return `had 1,600+ rushing yards in a season (${formatNumber(seasonBests.rushYds.max)}) in ${seasonBests.rushYds.year}`;
    case 'season20RushTDs':
      return `had 20+ rushing TDs in a season (${seasonBests.rushTDs.max}) in ${seasonBests.rushTDs.year}`;
    case 'career12kRecYds':
      return `had 6,000+ career receiving yards (${formatNumber(careerStats.recYds)})`;
    case 'career100RecTDs':
      return `scored 40+ career receiving TDs (${formatNumber(careerStats.recTDs)})`;
    case 'season1400RecYds':
      return `had 1,400+ receiving yards in a season (${formatNumber(seasonBests.recYds.max)}) in ${seasonBests.recYds.year}`;
    case 'season15RecTDs':
      return `had 15+ receiving TDs in a season (${seasonBests.recTDs.max}) in ${seasonBests.recTDs.year}`;
    case 'career100Sacks':
      return `recorded 60+ career sacks (${formatNumber(careerStats.sacks)})`;
    case 'career20Ints':
      return `recorded 20+ career interceptions (${formatNumber(careerStats.ints)})`;
    case 'season15Sacks':
      return `had 15+ sacks in a season (${seasonBests.sacks.max}) in ${seasonBests.sacks.year}`;
    case 'season8Ints':
      return `had 8+ interceptions in a season (${seasonBests.ints.max}) in ${seasonBests.ints.year}`;
    case 'wonMVP':
    case 'wonOPOY':
    case 'wonDPOY':
    case 'wonROY':
      // For awards, we'd need to check the awards data structure
      // For now, use simple message - can be enhanced later
      const awardNames = {
        wonMVP: "won MVP",
        wonOPOY: "won Offensive Player of the Year",
        wonDPOY: "won Defensive Player of the Year",
        wonROY: "won Rookie of the Year"
      };
      return awardNames[achievementId] || `won ${achievementId}`;
    default:
      return getHumanReadableAchievementText(achievementId);
  }
}

// Basketball-specific helper functions
function getBasketballCareerStats(player: Player) {
  const stats = player.stats || [];
  let pts = 0, trb = 0, ast = 0, stl = 0, blk = 0, fg3 = 0;
  
  stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season stats
    pts += season.pts || 0;
    
    // Handle different rebound field names in BBGM files
    // Some files use 'trb' (total rebounds), others use 'orb' + 'drb' (offensive + defensive)
    let seasonRebounds = 0;
    if (season.trb !== undefined) {
      seasonRebounds = season.trb;
    } else if (season.orb !== undefined || season.drb !== undefined) {
      seasonRebounds = (season.orb || 0) + (season.drb || 0);
    } else if (season.reb !== undefined) {
      seasonRebounds = season.reb;
    }
    trb += seasonRebounds;
    
    ast += season.ast || 0;
    stl += season.stl || 0;
    blk += season.blk || 0;
    // Handle different three-pointer field names
    const seasonThrees = season.tpm || season.tp || season.fg3 || 0;
    fg3 += seasonThrees;
  });
  
  return { pts, trb, ast, stl, blk, fg3 };
}

function getBasketballSeasonBests(player: Player) {
  const stats = player.stats || [];
  let ppg = { max: 0, year: 0 };
  let apg = { max: 0, year: 0 };
  let rpg = { max: 0, year: 0 };
  let spg = { max: 0, year: 0 };
  let bpg = { max: 0, year: 0 };
  
  stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season stats
    const gp = season.gp || 1;
    
    const seasonPPG = (season.pts || 0) / gp;
    if (seasonPPG > ppg.max) {
      ppg = { max: seasonPPG, year: season.season };
    }
    
    const seasonAPG = (season.ast || 0) / gp;
    if (seasonAPG > apg.max) {
      apg = { max: seasonAPG, year: season.season };
    }
    
    // Handle different rebound field names for season calculations too
    let seasonRebounds = 0;
    if (season.trb !== undefined) {
      seasonRebounds = season.trb;
    } else if (season.orb !== undefined || season.drb !== undefined) {
      seasonRebounds = (season.orb || 0) + (season.drb || 0);
    } else if (season.reb !== undefined) {
      seasonRebounds = season.reb;
    }
    
    const seasonRPG = seasonRebounds / gp;
    if (seasonRPG > rpg.max) {
      rpg = { max: seasonRPG, year: season.season };
    }
    
    const seasonSPG = (season.stl || 0) / gp;
    if (seasonSPG > spg.max) {
      spg = { max: seasonSPG, year: season.season };
    }
    
    const seasonBPG = (season.blk || 0) / gp;
    if (seasonBPG > bpg.max) {
      bpg = { max: seasonBPG, year: season.season };
    }
  });
  
  return { ppg, apg, rpg, spg, bpg };
}

// Helper function to get 50/40/90 season data for basketball
function getBasketball504090Season(player: Player) {
  if (!player.stats || !Array.isArray(player.stats)) {
    return null;
  }
  
  for (const season of player.stats) {
    if (season.playoffs) continue;
    
    const gp = season.gp || 0;
    if (gp < 10) continue; // Need minimum games
    
    const fgPct = season.fgp || (season.fg && season.fga ? season.fg / season.fga : 0) || 0;
    const fg3Pct = season.tpp || (season.tp && season.tpa ? season.tp / season.tpa : 0) || 0;
    const ftPct = season.ftp || (season.ft && season.fta ? season.ft / season.fta : 0) || 0;
    
    if (fgPct >= 0.5 && fg3Pct >= 0.4 && ftPct >= 0.9) {
      return {
        year: season.season,
        fg: (fgPct * 100).toFixed(1),
        fg3: (fg3Pct * 100).toFixed(1),
        ft: (ftPct * 100).toFixed(1)
      };
    }
  }
  return null;
}

// Helper function to get award seasons for basketball
function getBasketballAwardSeason(player: Player, awardType: string): string {
  if (!player.awards || !Array.isArray(player.awards)) {
    return 'unknown';
  }
  
  const awardMap: Record<string, string[]> = {
    mvp: ['Most Valuable Player', 'MVP'],
    dpoy: ['Defensive Player of the Year', 'DPOY'],
    roy: ['Rookie of the Year', 'ROY'],
    smoy: ['Sixth Man of the Year', 'SMOY'],
    fmvp: ['Finals MVP', 'FMVP'],
    allStar: ['All-Star', 'All Star'],
    champion: ['Champion', 'Championship']
  };
  
  const possibleNames = awardMap[awardType] || [];
  
  for (const award of player.awards) {
    for (const name of possibleNames) {
      if (award.type?.includes(name)) {
        return award.season?.toString() || 'unknown';
      }
    }
  }
  
  return 'unknown';
}

// Helper function to get award seasons for baseball
function getBaseballAwardSeason(player: Player, awardType: string): string {
  if (!player.awards || !Array.isArray(player.awards)) {
    return 'unknown';
  }
  
  const awardMap: Record<string, string[]> = {
    mvp: ['Most Valuable Player', 'MVP'],
    fmvp: ['Finals MVP', 'FMVP', 'World Series MVP'],
    roy: ['Rookie of the Year', 'ROY'],
    allStar: ['All-Star', 'All Star'],
    champion: ['Champion', 'Championship', 'World Series']
  };
  
  const possibleNames = awardMap[awardType] || [];
  
  for (const award of player.awards) {
    for (const name of possibleNames) {
      if (award.type?.includes(name)) {
        return award.season?.toString() || 'unknown';
      }
    }
  }
  
  return 'unknown';
}

// Helper function to get award seasons for hockey
function getHockeyAwardSeason(player: Player, awardType: string): string {
  if (!player.awards || !Array.isArray(player.awards)) {
    return 'unknown';
  }
  
  const awardMap: Record<string, string[]> = {
    mvp: ['Most Valuable Player', 'MVP'],
    defensiveForward: ['Defensive Forward of the Year', 'Selke'],
    goalieOfYear: ['Goalie of the Year', 'Vezina'],
    roy: ['Rookie of the Year', 'ROY', 'Calder'],
    playoffsMVP: ['Playoffs MVP', 'Conn Smythe'],
    allStar: ['All-Star', 'All Star'],
    champion: ['Champion', 'Championship', 'Stanley Cup']
  };
  
  const possibleNames = awardMap[awardType] || [];
  
  for (const award of player.awards) {
    for (const name of possibleNames) {
      if (award.type?.includes(name)) {
        return award.season?.toString() || 'unknown';
      }
    }
  }
  
  return 'unknown';
}

// Basketball-specific message generation following specification
function getBasketballPositiveMessage(achievementId: string, player?: Player): string {
  if (!player) {
    const fallbacks: Record<string, string> = {
      isSecondRoundPick: "was a second-round pick",
      career20kPoints: "reached 20,000+ career points",
      career10kRebounds: "reached 10,000+ career rebounds",
      career5kAssists: "reached 5,000+ career assists",
      career2kSteals: "reached 2,000+ career steals",
      career1500Blocks: "reached 1,500+ career blocks",
      career2kThrees: "made 2,000+ career threes",
      season30ppg: "averaged 30+ PPG in a season",
      season10apg: "averaged 10+ APG in a season",
      season15rpg: "averaged 15+ RPG in a season",
      season3bpg: "averaged 3+ BPG in a season",
      season25spg: "averaged 2.5+ SPG in a season",
      season504090: "had a 50/40/90 season",
      hasMVP: "won MVP",
      hasDPOY: "won Defensive Player of the Year",
      hasROY: "won Rookie of the Year",
      wonSixMOY: "won Sixth Man of the Year",
      wonFinalsMVP: "won Finals MVP",
      hasAllStar: "was an All-Star",
      wonChampionship: "won a championship"
    };
    return fallbacks[achievementId] || getHumanReadableAchievementText(achievementId);
  }

  const careerStats = getBasketballCareerStats(player);
  const seasonBests = getBasketballSeasonBests(player);

  switch (achievementId) {
    case 'isPick1Overall':
      const draftYear = player.draft?.year || 'unknown';
      return `was the #1 overall pick (${draftYear})`;
          case 'isSecondRoundPick':
            return `was a second-round pick in ${player.draft?.year || 'unknown'}`;    case 'career20kPoints':
      return `reached 20,000+ career points (${formatNumber(careerStats.pts)})`;
    case 'career10kRebounds':
      return `reached 10,000+ career rebounds (${formatNumber(careerStats.trb)})`;
    case 'career5kAssists':
      return `reached 5,000+ career assists (${formatNumber(careerStats.ast)})`;
    case 'career2kSteals':
      return `reached 2,000+ career steals (${formatNumber(careerStats.stl)})`;
    case 'career1500Blocks':
      return `reached 1,500+ career blocks (${formatNumber(careerStats.blk)})`;
    case 'career2kThrees':
      return `made 2,000+ career threes (${formatNumber(careerStats.fg3)})`;
    case 'season30ppg':
      return `averaged 30+ PPG (${seasonBests.ppg.max.toFixed(1)}) in ${seasonBests.ppg.year}`;
    case 'season10apg':
      return `averaged 10+ APG (${seasonBests.apg.max.toFixed(1)}) in ${seasonBests.apg.year}`;
    case 'season15rpg':
      return `averaged 15+ RPG (${seasonBests.rpg.max.toFixed(1)}) in ${seasonBests.rpg.year}`;
    case 'season3bpg':
      return `averaged 3+ BPG (${seasonBests.bpg.max.toFixed(1)}) in ${seasonBests.bpg.year}`;
    case 'season25spg':
      return `averaged 2.5+ SPG (${seasonBests.spg.max.toFixed(1)}) in ${seasonBests.spg.year}`;
    case 'season504090':
      const season504090 = getBasketball504090Season(player);
      if (season504090) {
        return `had a 50/40/90 season in ${season504090.year} (${season504090.fg}/${season504090.fg3}/${season504090.ft})`;
      }
      return `had a 50/40/90 season`;
    case 'hasMVP':
      const mvpSeason = getBasketballAwardSeason(player, 'mvp');
      return `won MVP in ${mvpSeason}`;
    case 'hasDPOY':
      const dpoySeason = getBasketballAwardSeason(player, 'dpoy');
      return `won Defensive Player of the Year in ${dpoySeason}`;
    case 'hasROY':
      const roySeason = getBasketballAwardSeason(player, 'roy');
      return `won Rookie of the Year in ${roySeason}`;
    case 'wonSixMOY':
      const sixMOYSeason = getBasketballAwardSeason(player, 'smoy');
      return `won Sixth Man of the Year in ${sixMOYSeason}`;
    case 'wonFinalsMVP':
      const fmvpSeason = getBasketballAwardSeason(player, 'fmvp');
      return `won Finals MVP in ${fmvpSeason}`;
    case 'hasAllStar':
      const allStarSeason = getBasketballAwardSeason(player, 'allStar');
      return `was an All-Star in ${allStarSeason}`;
    case 'wonChampionship':
      const champSeason = getBasketballAwardSeason(player, 'champion');
      return `won a championship in ${champSeason}`;
    default:
      return getHumanReadableAchievementText(achievementId);
  }
}

interface StatInfo {
  key: 'pts' | 'trb' | 'ast' | 'stl' | 'blk' | 'fg3' | 'ppg' | 'rpg' | 'apg' | 'spg' | 'bpg' | 'mpg' | 'gp' | // Basketball
       'passTDs' | 'rushYds' | 'rushTDs' | 'recYds' | 'recTDs' | 'sacks' | 'ints' | 'pssYds' | 'pssTD' | 'defTck' | 'ff' | // Football
       'g' | 'a' | 'pts' | 'w' | 'so' | 'svPct' | 'pm' | 's' | 'hit' | 'blk' | 'tk' | 'powerPlayPoints' | 'shG' | 'gwG' | 'faceoffPct' | 'toiPerGame' | 'pim' | 'savePct' | 'gaaRate' | 'gs' | // Hockey
       'h' | 'hr' | 'rbi' | 'sb' | 'r' | 'w' | 'sv' | 'so' | 'era'; // Baseball
  name: string;
  type: 'career' | 'season' | 'season_avg';
}

function getStatInfoForAchievement(baseId: string): StatInfo | null {
    console.log('getStatInfoForAchievement called with:', baseId);
    const statMap: Record<string, StatInfo> = {
        // Basketball Career
        career20kPoints: { key: 'pts', name: 'career points', type: 'career' },
        career10kRebounds: { key: 'trb', name: 'career rebounds', type: 'career' },
        career5kAssists: { key: 'ast', name: 'career assists', type: 'career' },
        career2kSteals: { key: 'stl', name: 'career steals', type: 'career' },
        career1500Blocks: { key: 'blk', name: 'career blocks', type: 'career' },
        career2kThrees: { key: 'fg3', name: 'career threes', type: 'career' },
        // Basketball Season (Averages)
        Season30PPG: { key: 'ppg', name: 'PPG in a season', type: 'season_avg' },
        Season12RPG: { key: 'rpg', name: 'RPG in a season', type: 'season_avg' },
        Season10APG: { key: 'apg', name: 'APG in a season', type: 'season_avg' },
        Season2SPG: { key: 'spg', name: 'SPG in a season', type: 'season_avg' },
        Season2_5BPG: { key: 'bpg', name: 'BPG in a season', type: 'season_avg' },
        Season36MPG: { key: 'mpg', name: 'MPG in a season', type: 'season_avg' },
        // Basketball Season (Totals)
        Season2000Points: { key: 'pts', name: 'points in a season', type: 'season' },
        Season200_3PM: { key: 'fg3', name: 'threes in a season', type: 'season' },
        Season800Rebounds: { key: 'trb', name: 'rebounds in a season', type: 'season' },
        Season700Assists: { key: 'ast', name: 'assists in a season', type: 'season' },
        Season150Steals: { key: 'stl', name: 'steals in a season', type: 'season' },
        Season150Blocks: { key: 'blk', name: 'blocks in a season', type: 'season' },
        Season70Games: { key: 'gp', name: 'games in a season', type: 'season' },
        // Baseball Career
        career3000Hits: { key: 'h', name: 'career hits', type: 'career' },
        career500HRs: { key: 'hr', name: 'career home runs', type: 'career' },
        career1500RBIs: { key: 'rbi', name: 'career RBIs', type: 'career' },
        career400SBs: { key: 'sb', name: 'career stolen bases', type: 'career' },
        career1800Runs: { key: 'r', name: 'career runs', type: 'career' },
        career300Wins: { key: 'w', name: 'career wins', type: 'career' },
        career3000Ks: { key: 'so', name: 'career strikeouts', type: 'career' },
        career300Saves: { key: 'sv', name: 'career saves', type: 'career' },
        // Baseball Season (Totals)
        BBSeason50HRs: { key: 'hr', name: 'home runs in a season', type: 'season' },
        BBSeason130RBIs: { key: 'rbi', name: 'RBIs in a season', type: 'season' },
        BBSeason200Hits: { key: 'h', name: 'hits in a season', type: 'season' },
        BBSeason50SBs: { key: 'sb', name: 'stolen bases in a season', type: 'season' },
        BBSeason20Wins: { key: 'w', name: 'wins in a season', type: 'season' },
        BBSeason40Saves: { key: 'sv', name: 'saves in a season', type: 'season' },
        BBSeason300Ks: { key: 'so', name: 'strikeouts in a season', type: 'season' },
        // Baseball Season (Averages/Percentages)
        BBSeason200ERA: { key: 'era', name: 'ERA in a season', type: 'season_avg' }, // ERA is an average, lower is better
    };
    return statMap[baseId] || null;
}

function getNegativeMessageForCustomAchievement(player: Player, achievementId: string): string | null {
  const customAchievementDetails = parseCustomAchievementId(achievementId);
  if (!customAchievementDetails) return null;

  if (customAchievementDetails) {
    const parsed = customAchievementDetails as ParsedCustomAchievement;

    if (parsed.baseId === 'playedInThreeDecades' || parsed.baseId.includes('playedIn') && parsed.baseId.endsWith('s') || parsed.baseId.includes('debutedIn') && parsed.baseId.endsWith('s')) {
      const actualDecades = player.decadesPlayed?.size || 0;
      const threshold = parsed.threshold;
      const operator = parsed.operator;
      const achievementType = parsed.baseId.includes('debutedIn') ? 'debuted in' : 'played in';

      let message: string;
      if (operator === '≤') {
        message = `played in ${actualDecades} decade${actualDecades === 1 ? '' : 's'} (more than ${threshold} required)`;
      } else {
        message = `played in ${actualDecades} decade${actualDecades === 1 ? '' : 's'} (fewer than ${threshold} required)`;
      }
      return message;
    } else if (parsed.baseId === 'played5PlusFranchises') {
      const actualFranchises = getPlayerFranchiseCount(player);
      const threshold = parsed.threshold;
      const operator = parsed.operator;

      let message: string;
      if (operator === '≤') {
        message = `played for ${actualFranchises} franchise${actualFranchises === 1 ? '' : 's'} (more than ${threshold} required)`;
      } else {
        message = `played for ${actualFranchises} franchise${actualFranchises === 1 ? '' : 's'} (fewer than ${threshold} required)`;
      }
      return message;
    }

    const statInfo = getStatInfoForAchievement(parsed.baseId);
    if (!statInfo) return null;

    const sport = getCachedSportDetection() || 'basketball';
    let actualValue: number | undefined;
    let year: number | undefined;

    if (sport === 'basketball') {
      const careerStats = getBaseballCareerStats(player);
      const seasonBests = getBasketballSeasonBests(player);
      if (statInfo.type === 'career') {
        actualValue = careerStats[statInfo.key as keyof typeof careerStats];
      } else if (statInfo.type === 'season_avg') {
        const best = seasonBests[statInfo.key as keyof typeof seasonBests];
        actualValue = best.max;
        year = best.year;
      } else if (statInfo.type === 'season') {
        // For season totals, we need to find the max total for that stat
        const maxSeasonTotal = player.stats?.reduce((max, s) => {
          if (s.playoffs) return max;
          const statValue = (s as any)[statInfo.key] || 0;
          return Math.max(max, statValue);
        }, 0);
        actualValue = maxSeasonTotal;
      }
    } else if (sport === 'football') {
      const careerStats = getFootballCareerStats(player);
      const seasonBests = getFootballSeasonBests(player);
      if (statInfo.type === 'career') {
        actualValue = careerStats[statInfo.key as keyof typeof careerStats];
      } else if (statInfo.type === 'season_avg') {
        // Football doesn't have season averages in this context, so handle as season total
        const best = seasonBests[statInfo.key as keyof typeof seasonBests];
        actualValue = best.max;
        year = best.year;
      } else if (statInfo.type === 'season') {
        const best = seasonBests[statInfo.key as keyof typeof seasonBests];
        actualValue = best.max;
        year = best.year;
      }
    } else if (sport === 'hockey') {
      const careerStats = getHockeyCareerStats(player);
      const seasonBests = getHockeySeasonBests(player);
      if (statInfo.type === 'career') {
        actualValue = careerStats[statInfo.key as keyof typeof careerStats];
      } else if (statInfo.type === 'season_avg') {
        const best = seasonBests[statInfo.key as keyof typeof seasonBests];
        actualValue = best.max;
        year = best.year;
      } else if (statInfo.type === 'season') {
        const maxSeasonTotal = player.stats?.reduce((max, s) => {
          if (s.playoffs) return max;
          const statValue = (s as any)[statInfo.key] || 0;
          return Math.max(max, statValue);
        }, 0);
        actualValue = maxSeasonTotal;
      }
    } else if (sport === 'baseball') {
      const careerStats = getBaseballCareerStats(player);
      const seasonBests = getBaseballSeasonBests(player);
      if (statInfo.type === 'career') {
        actualValue = careerStats[statInfo.key as keyof typeof careerStats];
      } else if (statInfo.type === 'season_avg') {
        // For ERA, lower is better, so we need to get the min
        if (statInfo.key === 'era') {
          actualValue = seasonBests.era.min;
          year = seasonBests.era.year;
        } else {
          const best = seasonBests[statInfo.key as keyof typeof seasonBests];
          actualValue = 'max' in best ? best.max : best.min;
          year = best.year;
        }
      } else if (statInfo.type === 'season') {
        const best = seasonBests[statInfo.key as keyof typeof seasonBests];
        actualValue = 'max' in best ? best.max : best.min;
        year = best.year;
      }
    }

    if (actualValue !== undefined) {
      const valueString = actualValue % 1 !== 0 ? actualValue.toFixed(1) : actualValue.toLocaleString();
      const thresholdString = parsed.threshold.toLocaleString();
      const statName = statInfo.name;

      let message: string;
      if (parsed.operator === '≤') {
        // Rule was "less than", player failed, so they had MORE.
        message = `had more than ${thresholdString} ${statName} (${valueString})`;
      } else {
        // Rule was "more than", player failed, so they had FEWER.
        message = `had fewer than ${thresholdString} ${statName} (${valueString})`;
      }
      
      if (year && year > 0) {
          // For season bests, the stat name already includes "in a season"
          return `never ${message.replace(statName, statInfo.name)} (best was ${valueString} in ${year})`;
      }

      return message;
    }

    // Fallback if we can't calculate the stat
    const cleanLabel = getHumanReadableAchievementText(achievementId);
    if (cleanLabel.includes('(Season)')) {
      const seasonStatLabel = cleanLabel.replace(' (Season)', '').toLowerCase();
      const statName = seasonStatLabel.replace(/(\d+,?\d*\+?)/, '').trim();
      
      if (parsed.operator === '≤') {
        return `never achieved under ${parsed.threshold.toLocaleString()} ${statName} in a season`;
      } else {
        return `never achieved ${seasonStatLabel} in a season`;
      }
    }
    
    if (cleanLabel.toLowerCase().includes('career')) {
      const statName = cleanLabel.replace(/(\d+,?\d*\+?)\s*Career\s*/i, '').toLowerCase();
      if (parsed.operator === '≤') {
        return `had more than ${parsed.threshold.toLocaleString()} ${statName}`;
      } else {
        return `had fewer than ${parsed.threshold.toLocaleString()} ${statName}`;
      }
    }
    
    return `never achieved ${cleanLabel.toLowerCase()}`;
  }

  return null; // Default return for all code paths}


function getPlayerFranchiseCount(player: Player): number {
  if (!player.stats) return 0;
  const franchiseIds = new Set<number>();
  for (const stat of player.stats) {
    if (stat.tid !== undefined && stat.tid !== -1 && !stat.playoffs && (stat.gp || 0) > 0) {
      franchiseIds.add(stat.tid);
    }
  }
  return franchiseIds.size;
}

function getBasketballNegativeMessage(achievementId: string, player?: Player): string {
  if (!player) {
    return "";
  }

  const customMessage = getNegativeMessageForCustomAchievement(player, achievementId);
  if (customMessage) return customMessage;

  const careerStats = getBasketballCareerStats(player);
  const seasonBests = getBasketballSeasonBests(player);

  const messageGenerator = (BASKETBALL_NEGATIVE_MESSAGES as any)[achievementId];

  if (messageGenerator) {
    switch (achievementId) {
      case 'career20kPoints':
        return messageGenerator(careerStats.pts);
      case 'career10kRebounds':
        return messageGenerator(careerStats.trb);
      case 'career5kAssists':
        return messageGenerator(careerStats.ast);
      case 'career2kSteals':
        return messageGenerator(careerStats.stl);
      case 'career1500Blocks':
        return messageGenerator(careerStats.blk);
      case 'career2kThrees':
        return messageGenerator(careerStats.fg3);
      case 'season30ppg':
        return messageGenerator(seasonBests.ppg.max, seasonBests.ppg.year);
      case 'season10apg':
        return messageGenerator(seasonBests.apg.max, seasonBests.apg.year);
      case 'season15rpg':
        return messageGenerator(seasonBests.rpg.max, seasonBests.rpg.year);
      case 'season3bpg':
        return messageGenerator(seasonBests.bpg.max, seasonBests.bpg.year);
      case 'season25spg':
        return messageGenerator(seasonBests.spg.max, seasonBests.spg.year);
      case 'played5PlusFranchises':
        return messageGenerator(getPlayerFranchiseCount(player));
      default:
        return messageGenerator();
    }
  }

  return BASKETBALL_NEGATIVE_MESSAGES.default(achievementId);
}

// Hockey-specific helper functions
function getHockeyCareerStats(player: Player) {
  const stats = player.stats || [];
  let g = 0, a = 0, pts = 0, w = 0, so = 0;
  
  stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season stats
    
    // Use ACTUAL ZGMH field names: evG+ppG+shG for goals, evA+ppA+shA for assists
    const goals = (season.evG || 0) + (season.ppG || 0) + (season.shG || 0);
    const assists = (season.evA || 0) + (season.ppA || 0) + (season.shA || 0);
    
    g += goals;
    a += assists;
    pts += goals + assists;
    w += season.w || 0; // goalie wins
    so += season.so || 0; // shutouts
  });
  
  return { g, a, pts, w, so };
}

function getHockeySeasonBests(player: Player) {
  const stats = player.stats || [];
  let g = { max: 0, year: 0 };
  let a = { max: 0, year: 0 };
  let pts = { max: 0, year: 0 };
  let w = { max: 0, year: 0 };
  let so = { max: 0, year: 0 };
  let svPct = { max: 0, year: 0 };
  
  stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season stats
    
    // Use ACTUAL ZGMH field names: evG+ppG+shG for goals, evA+ppA+shA for assists
    const goals = (season.evG || 0) + (season.ppG || 0) + (season.shG || 0);
    const assists = (season.evA || 0) + (season.ppA || 0) + (season.shA || 0);
    const points = goals + assists;
    
    if (goals > g.max) {
      g = { max: goals, year: season.season };
    }
    
    if (assists > a.max) {
      a = { max: assists, year: season.season };
    }
    
    if (points > pts.max) {
      pts = { max: points, year: season.season };
    }
    
    if ((season.w || 0) > w.max) {
      w = { max: season.w || 0, year: season.season };
    }
    
    if ((season.so || 0) > so.max) {
      so = { max: season.so || 0, year: season.season };
    }
    
    const seasonSvPct = season.svPct || 0;
    if (seasonSvPct > svPct.max) {
      svPct = { max: seasonSvPct, year: season.season };
    }
  });
  
  return { g, a, pts, w, so, svPct };
}

function getHockeyPositiveMessage(achievementId: string, player?: Player): string {
  if (!player) {
    const fallbacks: Record<string, string> = {
      career500Goals: "reached 500+ career goals",
      career1000Points: "reached 1,000+ career points",
      career500Assists: "reached 500+ career assists",
      career200Wins: "recorded 200+ career wins",
      career50Shutouts: "recorded 50+ career shutouts",
      season50Goals: "scored 50+ goals in a season",
      season100Points: "had 100+ points in a season",
      season60Assists: "had 60+ assists in a season",
      season35Wins: "recorded 35+ wins in a season",
      season10Shutouts: "recorded 10+ shutouts in a season",
      season925SavePct: "had a .925+ save percentage in a season",
      wonMVP: "won MVP",
      wonDefensiveForward: "won Defensive Forward of the Year",
      wonGoalieOfYear: "won Goalie of the Year",
      wonROY: "won Rookie of the Year",
      wonPlayoffsMVP: "won Playoffs MVP",
      madeAllStar: "was an All-Star",
      wonChampionship: "won a championship"
    };
    return fallbacks[achievementId] || getHumanReadableAchievementText(achievementId);
  }

  const careerStats = getHockeyCareerStats(player);
  const seasonBests = getHockeySeasonBests(player);

  switch (achievementId) {
    case 'isPick1Overall':
      const draftYear = player.draft?.year || 'unknown';
      return `was the #1 overall pick (${draftYear})`;
    case 'career500Goals':
      return `reached 500+ career goals (${formatNumber(careerStats.g)})`;
    case 'career1000Points':
      return `reached 1,000+ career points (${formatNumber(careerStats.pts)})`;
    case 'career500Assists':
      return `reached 500+ career assists (${formatNumber(careerStats.a)})`;
    case 'career200Wins':
      return `recorded 200+ career wins (${formatNumber(careerStats.w)})`;
    case 'career50Shutouts':
      return `recorded 50+ career shutouts (${formatNumber(careerStats.so)})`;
    case 'season50Goals':
      return `scored 50+ goals in a season (${seasonBests.g.max}) in ${seasonBests.g.year}`;
    case 'season100Points':
      return `had 100+ points in a season (${seasonBests.pts.max}) in ${seasonBests.pts.year}`;
    case 'season60Assists':
      return `had 60+ assists in a season (${seasonBests.a.max}) in ${seasonBests.a.year}`;
    case 'season35Wins':
      return `recorded 35+ wins in a season (${seasonBests.w.max}) in ${seasonBests.w.year}`;
    case 'season10Shutouts':
      return `recorded 10+ shutouts in a season (${seasonBests.so.max}) in ${seasonBests.so.year}`;
    case 'season925SavePct':
      return `had a .925+ save percentage in a season (${seasonBests.svPct.max.toFixed(3)}) in ${seasonBests.svPct.year}`;
    case 'wonMVP':
      const mvpSeason = getHockeyAwardSeason(player, 'mvp');
      return `won MVP in ${mvpSeason}`;
    case 'wonDefensiveForward':
      const defensiveForwardSeason = getHockeyAwardSeason(player, 'defensiveForward');
      return `won Defensive Forward of the Year in ${defensiveForwardSeason}`;
    case 'wonGoalieOfYear':
      const goalieOfYearSeason = getHockeyAwardSeason(player, 'goalieOfYear');
      return `won Goalie of the Year in ${goalieOfYearSeason}`;
    case 'wonROY':
      const roySeason = getHockeyAwardSeason(player, 'roy');
      return `won Rookie of the Year in ${roySeason}`;
    case 'wonPlayoffsMVP':
      const playoffsMVPSeason = getHockeyAwardSeason(player, 'playoffsMVP');
      return `won Playoffs MVP in ${playoffsMVPSeason}`;
    case 'madeAllStar':
      const allStarSeason = getHockeyAwardSeason(player, 'allStar');
      return `was an All-Star in ${allStarSeason}`;
    case 'wonChampionship':
      const champSeason = getHockeyAwardSeason(player, 'champion');
      return `won a championship in ${champSeason}`;
    default:
      return getHumanReadableAchievementText(achievementId);
  }
}

function getHockeyNegativeMessage(achievementId: string, player?: Player): string {
  if (!player) {
    return "";
  }
  
  const customMessage = getNegativeMessageForCustomAchievement(player, achievementId);
  if (customMessage) return customMessage;

  const careerStats = getHockeyCareerStats(player);
  const seasonBests = getHockeySeasonBests(player);

  const messageGenerator = (HOCKEY_NEGATIVE_MESSAGES as any)[achievementId];

  if (messageGenerator) {
    switch (achievementId) {
      case 'career500Goals':
        return messageGenerator(careerStats.g);
      case 'career1000Points':
        return messageGenerator(careerStats.pts);
      case 'career500Assists':
        return messageGenerator(careerStats.a);
      case 'career200Wins':
        return messageGenerator(careerStats.w);
      case 'career50Shutouts':
        return messageGenerator(careerStats.so);
      case 'season50Goals':
        return messageGenerator(seasonBests.g.max, seasonBests.g.year);
      case 'season100Points':
        return messageGenerator(seasonBests.pts.max, seasonBests.pts.year);
      case 'season60Assists':
        return messageGenerator(seasonBests.a.max, seasonBests.a.year);
      case 'season35Wins':
        return messageGenerator(seasonBests.w.max, seasonBests.w.year);
      case 'season10Shutouts':
        return messageGenerator(seasonBests.so.max, seasonBests.so.year);
      case 'season925SavePct':
        return messageGenerator(seasonBests.svPct.max, seasonBests.svPct.year);
      case 'played5PlusFranchises':
        return messageGenerator(getPlayerFranchiseCount(player));
      default:
        return messageGenerator();
    }
  }

  return HOCKEY_NEGATIVE_MESSAGES.default();
}

function getBaseballCareerStats(player: Player) {
  const stats = player.stats || [];
  let h = 0, hr = 0, rbi = 0, sb = 0, r = 0, w = 0, sv = 0, so = 0;
  
  stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season stats
    h += season.h || 0;
    hr += season.hr || 0;
    rbi += season.rbi || 0;
    sb += season.sb || 0;
    r += season.r || 0;
    w += season.w || 0; // pitcher wins
    sv += season.sv || 0; // saves
    so += season.so || 0; // strikeouts
  });
  
  return { h, hr, rbi, sb, r, w, sv, so };
}

function getBaseballSeasonBests(player: Player) {
  const stats = player.stats || [];
  let hr = { max: 0, year: 0 };
  let rbi = { max: 0, year: 0 };
  let h = { max: 0, year: 0 };
  let sb = { max: 0, year: 0 };
  let w = { max: 0, year: 0 };
  let sv = { max: 0, year: 0 };
  let so = { max: 0, year: 0 };
  let era = { min: 999, year: 0 };
  
  stats.forEach((season: any) => {
    if (season.playoffs) return; // Only regular season stats
    
    if ((season.hr || 0) > hr.max) {
      hr = { max: season.hr || 0, year: season.season };
    }
    
    if ((season.rbi || 0) > rbi.max) {
      rbi = { max: season.rbi || 0, year: season.season };
    }
    
    if ((season.h || 0) > h.max) {
      h = { max: season.h || 0, year: season.season };
    }
    
    if ((season.sb || 0) > sb.max) {
      sb = { max: season.sb || 0, year: season.season };
    }
    
    if ((season.w || 0) > w.max) {
      w = { max: season.w || 0, year: season.season };
    }
    
    if ((season.sv || 0) > sv.max) {
      sv = { max: season.sv || 0, year: season.season };
    }
    
    if ((season.so || 0) > so.max) {
      so = { max: season.so || 0, year: season.season };
    }
    
    const seasonERA = season.era || 999;
    if (seasonERA < era.min && seasonERA > 0) {
      era = { min: seasonERA, year: season.season };
    }
  });
  
  return { hr, rbi, h, sb, w, sv, so, era };
}

function getBaseballPositiveMessage(achievementId: string, player?: Player): string {
  if (!player) {
    const fallbacks: Record<string, string> = {
      career3000Hits: "reached 3,000+ career hits",
      career500HRs: "hit 500+ career home runs",
      career1500RBIs: "recorded 1,500+ career RBIs",
      career400SBs: "stole 400+ career bases",
      career1800Runs: "scored 1,800+ career runs",
      career300Wins: "won 300+ career games",
      career3000Ks: "recorded 3,000+ career strikeouts",
      career300Saves: "recorded 300+ career saves",
      season50HRs: "hit 50+ home runs in a season",
      season130RBIs: "had 130+ RBIs in a season",
      season200Hits: "had 200+ hits in a season",
      season50SBs: "stole 50+ bases in a season",
      season20Wins: "won 20+ games in a season",
      season40Saves: "recorded 40+ saves in a season",
      season300Ks: "recorded 300+ strikeouts in a season",
      season200ERA: "had a sub-2.00 ERA season",
      wonMVP: "won MVP",
      wonFinalsMVP: "won Finals MVP",
      wonROY: "won Rookie of the Year",
      madeAllStar: "was an All-Star",
      wonChampionship: "won a championship"
    };
    return fallbacks[achievementId] || getHumanReadableAchievementText(achievementId);
  }

  const careerStats = getBaseballCareerStats(player);
  const seasonBests = getBaseballSeasonBests(player);

  switch (achievementId) {
    case 'isPick1Overall':
      const draftYear = player.draft?.year || 'unknown';
      return `was the #1 overall pick (${draftYear})`;
    case 'career3000Hits':
      return `reached 3,000+ career hits (${formatNumber(careerStats.h)})`;
    case 'career500HRs':
      return `hit 500+ career home runs (${formatNumber(careerStats.hr)})`;
    case 'career1500RBIs':
      return `recorded 1,500+ career RBIs (${formatNumber(careerStats.rbi)})`;
    case 'career400SBs':
      return `stole 400+ career bases (${formatNumber(careerStats.sb)})`;
    case 'career1800Runs':
      return `scored 1,800+ career runs (${formatNumber(careerStats.r)})`;
    case 'career300Wins':
      return `won 300+ career games (${formatNumber(careerStats.w)})`;
    case 'career3000Ks':
      return `recorded 3,000+ career strikeouts (${formatNumber(careerStats.so)})`;
    case 'career300Saves':
      return `recorded 300+ career saves (${formatNumber(careerStats.sv)})`;
    case 'season50HRs':
      return `hit 50+ home runs in a season (${seasonBests.hr.max}) in ${seasonBests.hr.year}`;
    case 'season130RBIs':
      return `had 130+ RBIs in a season (${seasonBests.rbi.max}) in ${seasonBests.rbi.year}`;
    case 'season200Hits':
      return `had 200+ hits in a season (${seasonBests.h.max}) in ${seasonBests.h.year}`;
    case 'season50SBs':
      return `stole 50+ bases in a season (${seasonBests.sb.max}) in ${seasonBests.sb.year}`;
    case 'season20Wins':
      return `won 20+ games in a season (${seasonBests.w.max}) in ${seasonBests.w.year}`;
    case 'season40Saves':
      return `recorded 40+ saves in a season (${seasonBests.sv.max}) in ${seasonBests.sv.year}`;
    case 'season300Ks':
      return `recorded 300+ strikeouts in a season (${seasonBests.so.max}) in ${seasonBests.so.year}`;
    case 'season200ERA':
      return `had a sub-2.00 ERA season (${seasonBests.era.min.toFixed(2)}) in ${seasonBests.era.year}`;
    case 'wonMVP':
      const mvpSeason = getBaseballAwardSeason(player, 'mvp');
      return `won MVP in ${mvpSeason}`;
    case 'wonFinalsMVP':
      const fmvpSeason = getBaseballAwardSeason(player, 'fmvp');
      return `won Finals MVP in ${fmvpSeason}`;
    case 'wonROY':
      const roySeason = getBaseballAwardSeason(player, 'roy');
      return `won Rookie of the Year in ${roySeason}`;
    case 'madeAllStar':
      const allStarSeason = getBaseballAwardSeason(player, 'allStar');
      return `was an All-Star in ${allStarSeason}`;
    case 'wonChampionship':
      const champSeason = getBaseballAwardSeason(player, 'champion');
      return `won a championship in ${champSeason}`;
    default:
      return getHumanReadableAchievementText(achievementId);
  }
}

function getBaseballNegativeMessage(achievementId: string, player?: Player): string {
  if (!player) {
    return "";
  }

  const customMessage = getNegativeMessageForCustomAchievement(player, achievementId);
  if (customMessage) return customMessage;
  
  const careerStats = getBaseballCareerStats(player);
  const seasonBests = getBaseballSeasonBests(player);

  const messageGenerator = (BASEBALL_NEGATIVE_MESSAGES as any)[achievementId];

  if (messageGenerator) {
    switch (achievementId) {
      case 'career3000Hits':
        return messageGenerator(careerStats.h);
      case 'career500HRs':
        return messageGenerator(careerStats.hr);
      case 'career1500RBIs':
        return messageGenerator(careerStats.rbi);
      case 'career400SBs':
        return messageGenerator(careerStats.sb);
      case 'career1800Runs':
        return messageGenerator(careerStats.r);
      case 'career300Wins':
        return messageGenerator(careerStats.w);
      case 'career3000Ks':
        return messageGenerator(careerStats.so);
      case 'career300Saves':
        return messageGenerator(careerStats.sv);
      case 'season50HRs':
        return messageGenerator(seasonBests.hr.max, seasonBests.hr.year);
      case 'season130RBIs':
        return messageGenerator(seasonBests.rbi.max, seasonBests.rbi.year);
      case 'season200Hits':
        return messageGenerator(seasonBests.h.max, seasonBests.h.year);
      case 'season50SBs':
        return messageGenerator(seasonBests.sb.max, seasonBests.sb.year);
      case 'season20Wins':
        return messageGenerator(seasonBests.w.max, seasonBests.w.year);
      case 'season40Saves':
        return messageGenerator(seasonBests.sv.max, seasonBests.sv.year);
      case 'season300Ks':
        return messageGenerator(seasonBests.so.max, seasonBests.so.year);
      case 'season200ERA':
        return messageGenerator(seasonBests.era.min, seasonBests.era.year);
      case 'played5PlusFranchises':
        return messageGenerator(getPlayerFranchiseCount(player));
      default:
        return messageGenerator();
    }
  }

  return BASEBALL_NEGATIVE_MESSAGES.default();
}

function getFootballNegativeMessage(achievementId: string, player?: Player): string {
  if (!player) {
    return "";
  }

  const customMessage = getNegativeMessageForCustomAchievement(player, achievementId);
  if (customMessage) return customMessage;

  const careerStats = getFootballCareerStats(player);
  const seasonBests = getFootballSeasonBests(player);

  const messageGenerator = (FOOTBALL_NEGATIVE_MESSAGES as any)[achievementId];

  if (messageGenerator) {
    switch (achievementId) {
      case 'career300PassTDs':
        return messageGenerator(careerStats.passTDs);
      case 'season35PassTDs':
        return messageGenerator(seasonBests.passTDs.max, seasonBests.passTDs.year);
      case 'career12kRushYds':
        return messageGenerator(careerStats.rushYds);
      case 'career100RushTDs':
        return messageGenerator(careerStats.rushTDs);
      case 'season1800RushYds':
        return messageGenerator(seasonBests.rushYds.max, seasonBests.rushYds.year);
      case 'season20RushTDs':
        return messageGenerator(seasonBests.rushTDs.max, seasonBests.rushTDs.year);
      case 'career12kRecYds':
        return messageGenerator(careerStats.recYds);
      case 'career100RecTDs':
        return messageGenerator(careerStats.recTDs);
      case 'season1400RecYds':
        return messageGenerator(seasonBests.recYds.max, seasonBests.recYds.year);
      case 'season15RecTDs':
        return messageGenerator(seasonBests.recTDs.max, seasonBests.recTDs.year);
      case 'career100Sacks':
        return messageGenerator(careerStats.sacks);
      case 'career20Ints':
        return messageGenerator(careerStats.ints);
      case 'season15Sacks':
        return messageGenerator(seasonBests.sacks.max, seasonBests.sacks.year);
      case 'season8Ints':
        return messageGenerator(seasonBests.ints.max, seasonBests.ints.year);
      default:
        return messageGenerator();
    }
  }

  return FOOTBALL_NEGATIVE_MESSAGES.default();
}

// export interface FeedbackResult {
//   message: string;
//   isValid: boolean;
// }

/**
 * Check if a player played for a specific team (has at least 1 regular season game)
 */
function playerPlayedForTeam(player: Player, tid: number): boolean {
  if (!player.stats || !Array.isArray(player.stats)) return false;
  
  return player.stats.some(stat => stat.tid === tid && !stat.playoffs && (stat.gp || 0) > 0);
}

/**
 * Get the seasons a player played for a specific team
 */
function getPlayerTeamSeasons(player: Player, tid: number): number[] {
  if (!player.stats || !Array.isArray(player.stats)) return [];
  
  return player.stats
    .filter(stat => stat.tid === tid && !stat.playoffs && (stat.gp || 0) > 0)
    .map(stat => stat.season)
    .sort((a, b) => a - b);
}

/**
 * Get team name with historical accuracy for a specific season
 */
function getTeamNameAtSeason(teams: Team[], tid: number, season?: number): string {
  const team = teams.find(t => t.tid === tid);
  if (!team) return `Team ${tid}`;
  
  if (season && team.seasons) {
    const seasonInfo = team.seasons.find(s => s.season === season);
    if (seasonInfo && seasonInfo.region && seasonInfo.name) {
      return `${seasonInfo.region} ${seasonInfo.name}`;
    }
  }
  
  // fallback to current name, handle missing region gracefully
  const region = team.region || team.abbrev || '';
  const name = team.name || 'Unknown Team';
  return region ? `${region} ${name}` : name;
}

/**
 * Generate feedback message for an incorrect guess
 */
function generateFeedbackMessage(
  player: Player,
  rowConstraint: GridConstraint,
  colConstraint: GridConstraint,
  teams: Team[]
): string {
  const sport = getCachedSportDetection() || 'basketball';
  
  // Determine if player meets row and column constraints
  const meetsRow = rowConstraint.type === 'team'
    ? playerPlayedForTeam(player, rowConstraint.tid!)
    : playerMeetsAchievement(player, rowConstraint.achievementId!);
    
  const meetsCol = colConstraint.type === 'team'
    ? playerPlayedForTeam(player, colConstraint.tid!)
    : playerMeetsAchievement(player, colConstraint.achievementId!);

  // Case 1: Fails both constraints
  if (!meetsRow && !meetsCol) {
    // Prioritize achievement feedback over team feedback
    let failedConstraint: GridConstraint;
    let positiveConstraint: GridConstraint | null = null;
    
    if (rowConstraint.type === 'achievement' && colConstraint.type === 'achievement') {
      // If both are achievements, pick one (e.g., row)
      failedConstraint = rowConstraint;
    } else if (rowConstraint.type === 'achievement') {
      failedConstraint = rowConstraint;
    } else if (colConstraint.type === 'achievement') {
      failedConstraint = colConstraint;
    } else {
      // If both are teams, pick one (e.g., row)
      failedConstraint = rowConstraint;
    }
    
    const negativeMessage = getNegativeMessage(failedConstraint, player, teams, sport);
    const otherFailedConstraint = failedConstraint === rowConstraint ? colConstraint : rowConstraint;
    const otherNegativeMessage = getNegativeMessage(otherFailedConstraint, player, teams, sport);
    
    return `${player.name} ${negativeMessage}, and also ${otherNegativeMessage}.`;
  }
  
  // Case 2: Fails one constraint
  if (!meetsRow || !meetsCol) {
    const failedConstraint = !meetsRow ? rowConstraint : colConstraint;
    const metConstraint = !meetsRow ? colConstraint : rowConstraint;
    
    const negativeMessage = getNegativeMessage(failedConstraint, player, teams, sport);
    const positiveMessage = getPositiveMessage(metConstraint, player, teams, sport);
    
    // Handle season-aligned achievements for more specific feedback
    if (
      failedConstraint.type === 'team' &&
      metConstraint.type === 'achievement' &&
      isSeasonAchievement(metConstraint.achievementId! as SeasonAchievementId)
    ) {
      const achievementData = getPlayerSeasonAchievementData(player, metConstraint.achievementId! as SeasonAchievementId);
      if (achievementData.count > 0) {
        const seasonList = formatSeasonList(achievementData.seasonsWithTeam, 
          metConstraint.achievementId === 'FinalsMVP' || metConstraint.achievementId === 'SFMVP'
        );
        return `${player.name} ${positiveMessage} in ${seasonList}, but never played for the ${failedConstraint.label}.`;
      }
    }
    
    return `${player.name} ${positiveMessage}, but ${negativeMessage}.`;
  }
  
  // Should not be reached if player is incorrect, but as a fallback:
  return `An unknown error occurred for ${player.name}.`;
}

// Helper to get the appropriate negative message based on sport
function getNegativeMessage(constraint: GridConstraint, player: Player, teams: Team[], sport: string): string {
  if (constraint.type === 'team') {
    return `never played for the ${constraint.label}`;
  }
  
  const achievementId = constraint.achievementId!;

  // Handle dynamic decade achievements for negative messages
  if (achievementId.includes('playedIn') && achievementId.endsWith('s')) {
    const decadeMatch = achievementId.match(/playedIn(\d{4})s/);
    if (decadeMatch) {
      const decade = decadeMatch[1];
      return `never played in the ${decade}s`;
    }
  }
  
  if (achievementId.includes('debutedIn') && achievementId.endsWith('s')) {
    const decadeMatch = achievementId.match(/debutedIn(\d{4})s/);
    if (decadeMatch) {
      const decade = decadeMatch[1];
      return `never debuted in the ${decade}s`;
    }
  }
  
  switch (sport) {
    case 'basketball':
      return getBasketballNegativeMessage(achievementId, player);
    case 'football':
      return getFootballNegativeMessage(achievementId, player);
    case 'hockey':
      return getHockeyNegativeMessage(achievementId, player);
    case 'baseball':
      return getBaseballNegativeMessage(achievementId, player);
    default:
      return `did not achieve ${getHumanReadableAchievementText(achievementId)}`;
  }
}

// Helper to get the appropriate positive message based on sport
function getPositiveMessage(constraint: GridConstraint, player: Player, teams: Team[], sport: string): string {
  if (constraint.type === 'team') {
    const seasons = getPlayerTeamSeasons(player, constraint.tid!);
    const yearRange = formatYearsWithRanges(seasons);
    return `played for the ${constraint.label} (${yearRange})`;
  }
  
  const achievementId = constraint.achievementId!;
  
  switch (sport) {
    case 'basketball':
      return getBasketballPositiveMessage(achievementId, player);
    case 'football':
      return getFootballPositiveMessage(achievementId, player);
    case 'hockey':
      return getHockeyPositiveMessage(achievementId, player);
    case 'baseball':
      return getBaseballPositiveMessage(achievementId, player);
    default:
      return `did achieve ${getHumanReadableAchievementText(achievementId)}`;
  }
export { generateFeedbackMessage };
}
