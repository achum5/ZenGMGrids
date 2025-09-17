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
  // New Basketball achievements (season-aligned)
  Champion: 'Won Championship',
  AllRookieTeam: 'All-Rookie Team',
  Season250ThreePM: '250+ 3PM (Season)',
  
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
  Season60eFG500FGA: '60%+ eFG on ≥500 FGA (Season)',
  Season90FT250FTA: '90%+ FT on ≥250 FTA (Season)',
  Season40_3PT200_3PA: '40%+ 3PT on ≥200 3PA (Season)',
  Season70Games: '70+ Games Played (Season)',
  Season36MPG: '36.0+ MPG (Season)',
  Season25_10: '25/10 Season (PPG/RPG)',
  Season25_5_5: '25/5/5 Season (PPG/RPG/APG)',
  Season20_10_5: '20/10/5 Season (PPG/RPG/APG)',
  Season1_1_1: '1/1/1 Season (SPG/BPG/3PM/G)',
  
  // Statistical Leaders with Rank Variations (36 achievements)
  PointsLeader1st: '1st in Points',
  PointsLeader3rd: 'Top 3 in Points',
  PointsLeader5th: 'Top 5 in Points',
  PointsLeader10th: 'Top 10 in Points',
  PointsLeader15th: 'Top 15 in Points',
  PointsLeader20th: 'Top 20 in Points',
  ReboundsLeader1st: '1st in Rebounds',
  ReboundsLeader3rd: 'Top 3 in Rebounds',
  ReboundsLeader5th: 'Top 5 in Rebounds',
  ReboundsLeader10th: 'Top 10 in Rebounds',
  ReboundsLeader15th: 'Top 15 in Rebounds',
  ReboundsLeader20th: 'Top 20 in Rebounds',
  AssistsLeader1st: '1st in Assists',
  AssistsLeader3rd: 'Top 3 in Assists',
  AssistsLeader5th: 'Top 5 in Assists',
  AssistsLeader10th: 'Top 10 in Assists',
  AssistsLeader15th: 'Top 15 in Assists',
  AssistsLeader20th: 'Top 20 in Assists',
  StealsLeader1st: '1st in Steals',
  StealsLeader3rd: 'Top 3 in Steals',
  StealsLeader5th: 'Top 5 in Steals',
  StealsLeader10th: 'Top 10 in Steals',
  StealsLeader15th: 'Top 15 in Steals',
  StealsLeader20th: 'Top 20 in Steals',
  BlocksLeader1st: '1st in Blocks',
  BlocksLeader3rd: 'Top 3 in Blocks',
  BlocksLeader5th: 'Top 5 in Blocks',
  BlocksLeader10th: 'Top 10 in Blocks',
  BlocksLeader15th: 'Top 15 in Blocks',
  BlocksLeader20th: 'Top 20 in Blocks',
  ThreePMLeader1st: '1st in 3PM',
  ThreePMLeader3rd: 'Top 3 in 3PM',
  ThreePMLeader5th: 'Top 5 in 3PM',
  ThreePMLeader10th: 'Top 10 in 3PM',
  ThreePMLeader15th: 'Top 15 in 3PM',
  ThreePMLeader20th: 'Top 20 in 3PM',
  
  // PPG Variations (18 achievements)
  SeasonPPG1: '1+ PPG (Season)',
  SeasonPPG2: '2+ PPG (Season)',
  SeasonPPG3: '3+ PPG (Season)',
  SeasonPPG4: '4+ PPG (Season)',
  SeasonPPG5: '5+ PPG (Season)',
  SeasonPPG8: '8+ PPG (Season)',
  SeasonPPG10: '10+ PPG (Season)',
  SeasonPPG12: '12+ PPG (Season)',
  SeasonPPG15: '15+ PPG (Season)',
  SeasonPPG18: '18+ PPG (Season)',
  SeasonPPG20: '20+ PPG (Season)',
  SeasonPPG22: '22+ PPG (Season)',
  SeasonPPG24: '24+ PPG (Season)',
  SeasonPPG26: '26+ PPG (Season)',
  SeasonPPG28: '28+ PPG (Season)',
  SeasonPPG30: '30+ PPG (Season)',
  SeasonPPG32: '32+ PPG (Season)',
  SeasonPPG35: '35+ PPG (Season)',
  
  // Points Variations (10 achievements)
  SeasonPoints800: '800+ Points (Season)',
  SeasonPoints1000: '1,000+ Points (Season)',
  SeasonPoints1100: '1,100+ Points (Season)',
  SeasonPoints1200: '1,200+ Points (Season)',
  SeasonPoints1400: '1,400+ Points (Season)',
  SeasonPoints1600: '1,600+ Points (Season)',
  SeasonPoints1800: '1,800+ Points (Season)',
  SeasonPoints2000: '2,000+ Points (Season)',
  SeasonPoints2200: '2,200+ Points (Season)',
  SeasonPoints2400: '2,400+ Points (Season)',
  
  // 3PM Variations (12 achievements)
  Season3PM50: '50+ 3PM (Season)',
  Season3PM75: '75+ 3PM (Season)',
  Season3PM100: '100+ 3PM (Season)',
  Season3PM125: '125+ 3PM (Season)',
  Season3PM150: '150+ 3PM (Season)',
  Season3PM175: '175+ 3PM (Season)',
  Season3PM200: '200+ 3PM (Season)',
  Season3PM225: '225+ 3PM (Season)',
  Season3PM250: '250+ 3PM (Season)',
  Season3PM275: '275+ 3PM (Season)',
  Season3PM300: '300+ 3PM (Season)',
  Season3PM325: '325+ 3PM (Season)',
  
  // RPG Variations (12 achievements)
  SeasonRPG3: '3+ RPG (Season)',
  SeasonRPG4: '4+ RPG (Season)',
  SeasonRPG5: '5+ RPG (Season)',
  SeasonRPG6: '6+ RPG (Season)',
  SeasonRPG7: '7+ RPG (Season)',
  SeasonRPG8: '8+ RPG (Season)',
  SeasonRPG9: '9+ RPG (Season)',
  SeasonRPG10: '10+ RPG (Season)',
  SeasonRPG11: '11+ RPG (Season)',
  SeasonRPG12: '12+ RPG (Season)',
  SeasonRPG13: '13+ RPG (Season)',
  SeasonRPG15: '15+ RPG (Season)',
  
  // APG Variations (11 achievements)
  SeasonAPG2: '2+ APG (Season)',
  SeasonAPG3: '3+ APG (Season)',
  SeasonAPG4: '4+ APG (Season)',
  SeasonAPG5: '5+ APG (Season)',
  SeasonAPG6: '6+ APG (Season)',
  SeasonAPG7: '7+ APG (Season)',
  SeasonAPG8: '8+ APG (Season)',
  SeasonAPG9: '9+ APG (Season)',
  SeasonAPG10: '10+ APG (Season)',
  SeasonAPG11: '11+ APG (Season)',
  SeasonAPG12: '12+ APG (Season)',
  
  // Rebounds Variations (8 achievements)
  SeasonRebounds300: '300+ Rebounds (Season)',
  SeasonRebounds400: '400+ Rebounds (Season)',
  SeasonRebounds500: '500+ Rebounds (Season)',
  SeasonRebounds600: '600+ Rebounds (Season)',
  SeasonRebounds700: '700+ Rebounds (Season)',
  SeasonRebounds800: '800+ Rebounds (Season)',
  SeasonRebounds900: '900+ Rebounds (Season)',
  SeasonRebounds1000: '1,000+ Rebounds (Season)',
  
  // Assists Variations (7 achievements)
  SeasonAssists200: '200+ Assists (Season)',
  SeasonAssists300: '300+ Assists (Season)',
  SeasonAssists400: '400+ Assists (Season)',
  SeasonAssists500: '500+ Assists (Season)',
  SeasonAssists600: '600+ Assists (Season)',
  SeasonAssists700: '700+ Assists (Season)',
  SeasonAssists800: '800+ Assists (Season)',
  
  // SPG Variations (9 achievements)
  SeasonSPG0_5: '0.5+ SPG (Season)',
  SeasonSPG0_8: '0.8+ SPG (Season)',
  SeasonSPG0_9: '0.9+ SPG (Season)',
  SeasonSPG1_0: '1.0+ SPG (Season)',
  SeasonSPG1_3: '1.3+ SPG (Season)',
  SeasonSPG1_5: '1.5+ SPG (Season)',
  SeasonSPG1_7: '1.7+ SPG (Season)',
  SeasonSPG2_0: '2.0+ SPG (Season)',
  SeasonSPG2_3: '2.3+ SPG (Season)',
  
  // BPG Variations (8 achievements)
  SeasonBPG0_5: '0.5+ BPG (Season)',
  SeasonBPG0_8: '0.8+ BPG (Season)',
  SeasonBPG0_9: '0.9+ BPG (Season)',
  SeasonBPG1_0: '1.0+ BPG (Season)',
  SeasonBPG1_5: '1.5+ BPG (Season)',
  SeasonBPG2_0: '2.0+ BPG (Season)',
  SeasonBPG2_5: '2.5+ BPG (Season)',
  SeasonBPG3_0: '3.0+ BPG (Season)',
  
  // Steals Variations (8 achievements)
  SeasonSteals50: '50+ Steals (Season)',
  SeasonSteals75: '75+ Steals (Season)',
  SeasonSteals90: '90+ Steals (Season)',
  SeasonSteals100: '100+ Steals (Season)',
  SeasonSteals125: '125+ Steals (Season)',
  SeasonSteals150: '150+ Steals (Season)',
  SeasonSteals175: '175+ Steals (Season)',
  SeasonSteals200: '200+ Steals (Season)',
  
  // Blocks Variations (8 achievements)
  SeasonBlocks50: '50+ Blocks (Season)',
  SeasonBlocks75: '75+ Blocks (Season)',
  SeasonBlocks90: '90+ Blocks (Season)',
  SeasonBlocks100: '100+ Blocks (Season)',
  SeasonBlocks125: '125+ Blocks (Season)',
  SeasonBlocks150: '150+ Blocks (Season)',
  SeasonBlocks175: '175+ Blocks (Season)',
  SeasonBlocks200: '200+ Blocks (Season)',
  
  // Stocks Variations (9 achievements)
  SeasonStocks100: '100+ Stocks (Season)',
  SeasonStocks120: '120+ Stocks (Season)',
  SeasonStocks130: '130+ Stocks (Season)',
  SeasonStocks140: '140+ Stocks (Season)',
  SeasonStocks150: '150+ Stocks (Season)',
  SeasonStocks175: '175+ Stocks (Season)',
  SeasonStocks200: '200+ Stocks (Season)',
  SeasonStocks225: '225+ Stocks (Season)',
  SeasonStocks250: '250+ Stocks (Season)',
  
  // TS% Variations (6 achievements)
  SeasonTSPct54: '54%+ TS% (Season)',
  SeasonTSPct56: '56%+ TS% (Season)',
  SeasonTSPct58: '58%+ TS% (Season)',
  SeasonTSPct60: '60%+ TS% (Season)',
  SeasonTSPct62: '62%+ TS% (Season)',
  SeasonTSPct64: '64%+ TS% (Season)',
  
  // eFG% Variations (7 achievements)
  SeasoneFGPct54: '54%+ eFG% (Season)',
  SeasoneFGPct55: '55%+ eFG% (Season)',
  SeasoneFGPct56: '56%+ eFG% (Season)',
  SeasoneFGPct57: '57%+ eFG% (Season)',
  SeasoneFGPct60: '60%+ eFG% (Season)',
  SeasoneFGPct63: '63%+ eFG% (Season)',
  SeasoneFGPct65: '65%+ eFG% (Season)',
  
  // FT% Variations (6 achievements)
  SeasonFTPct80: '80%+ FT% (Season)',
  SeasonFTPct83: '83%+ FT% (Season)',
  SeasonFTPct85: '85%+ FT% (Season)',
  SeasonFTPct88: '88%+ FT% (Season)',
  SeasonFTPct90: '90%+ FT% (Season)',
  SeasonFTPct92: '92%+ FT% (Season)',
  
  // 3PT% Variations (7 achievements)
  Season3PPct33: '33%+ 3PT% (Season)',
  Season3PPct35: '35%+ 3PT% (Season)',
  Season3PPct36: '36%+ 3PT% (Season)',
  Season3PPct37: '37%+ 3PT% (Season)',
  Season3PPct38: '38%+ 3PT% (Season)',
  Season3PPct40: '40%+ 3PT% (Season)',
  Season3PPct42: '42%+ 3PT% (Season)',
  
  // Games Played Variations (8 achievements)
  SeasonGames40: '40+ Games (Season)',
  SeasonGames45: '45+ Games (Season)',
  SeasonGames50: '50+ Games (Season)',
  SeasonGames55: '55+ Games (Season)',
  SeasonGames60: '60+ Games (Season)',
  SeasonGames65: '65+ Games (Season)',
  SeasonGames70: '70+ Games (Season)',
  SeasonGames75: '75+ Games (Season)',
  
  // MPG Variations (7 achievements)
  SeasonMPG28: '28+ MPG (Season)',
  SeasonMPG30: '30+ MPG (Season)',
  SeasonMPG31: '31+ MPG (Season)',
  SeasonMPG32: '32+ MPG (Season)',
  SeasonMPG34: '34+ MPG (Season)',
  SeasonMPG36: '36+ MPG (Season)',
  SeasonMPG38: '38+ MPG (Season)',
  
  // Career Threshold Variations
  // Career Points (12 achievements)
  Career6kPoints: '6,000+ Career Points',
  Career8kPoints: '8,000+ Career Points',
  Career10kPoints: '10,000+ Career Points',
  Career11kPoints: '11,000+ Career Points',
  Career12kPoints: '12,000+ Career Points',
  Career15kPoints: '15,000+ Career Points',
  Career18kPoints: '18,000+ Career Points',
  Career20kPoints: '20,000+ Career Points',
  Career22kPoints: '22,000+ Career Points',
  Career25kPoints: '25,000+ Career Points',
  Career28kPoints: '28,000+ Career Points',
  Career30kPoints: '30,000+ Career Points',
  
  // Career Rebounds (6 achievements)
  Career4kRebounds: '4,000+ Career Rebounds',
  Career5kRebounds: '5,000+ Career Rebounds',
  Career6kRebounds: '6,000+ Career Rebounds',
  Career8kRebounds: '8,000+ Career Rebounds',
  Career10kRebounds: '10,000+ Career Rebounds',
  Career12kRebounds: '12,000+ Career Rebounds',
  
  // Career Assists (8 achievements)
  Career1_5kAssists: '1,500+ Career Assists',
  Career2kAssists: '2,000+ Career Assists',
  Career2_5kAssists: '2,500+ Career Assists',
  Career3kAssists: '3,000+ Career Assists',
  Career4kAssists: '4,000+ Career Assists',
  Career5kAssists: '5,000+ Career Assists',
  Career6kAssists: '6,000+ Career Assists',
  Career8kAssists: '8,000+ Career Assists',
  
  // Career Steals (7 achievements)
  Career600Steals: '600+ Career Steals',
  Career800Steals: '800+ Career Steals',
  Career900Steals: '900+ Career Steals',
  Career1kSteals: '1,000+ Career Steals',
  Career1_5kSteals: '1,500+ Career Steals',
  Career2kSteals: '2,000+ Career Steals',
  Career2_5kSteals: '2,500+ Career Steals',
  
  // Career Blocks (7 achievements)
  Career600Blocks: '600+ Career Blocks',
  Career800Blocks: '800+ Career Blocks',
  Career900Blocks: '900+ Career Blocks',
  Career1kBlocks: '1,000+ Career Blocks',
  Career1_2kBlocks: '1,200+ Career Blocks',
  Career1_5kBlocks: '1,500+ Career Blocks',
  Career2kBlocks: '2,000+ Career Blocks',
  
  // Career 3PM (8 achievements)
  Career600_3PM: '600+ Career 3PM',
  Career800_3PM: '800+ Career 3PM',
  Career900_3PM: '900+ Career 3PM',
  Career1k_3PM: '1,000+ Career 3PM',
  Career1_5k_3PM: '1,500+ Career 3PM',
  Career2k_3PM: '2,000+ Career 3PM',
  Career2_5k_3PM: '2,500+ Career 3PM',
  Career3k_3PM: '3,000+ Career 3PM',
  
  // Seasons Played (9 achievements)
  Seasons5: '5+ Seasons Played',
  Seasons6: '6+ Seasons Played',
  Seasons7: '7+ Seasons Played',
  Seasons8: '8+ Seasons Played',
  Seasons10: '10+ Seasons Played',
  Seasons12: '12+ Seasons Played',
  Seasons15: '15+ Seasons Played',
  Seasons18: '18+ Seasons Played',
  Seasons20: '20+ Seasons Played',
  
  // Combo Season Variations (20 achievements)
  Season18_8: '18/8 Season (PPG/RPG)',
  Season20_8: '20/8 Season (PPG/RPG)',
  Season22_8: '22/8 Season (PPG/RPG)',
  Season24_10: '24/10 Season (PPG/RPG)',
  Season26_10: '26/10 Season (PPG/RPG)',
  Season28_12: '28/12 Season (PPG/RPG)',
  Season30_15: '30/15 Season (PPG/RPG)',
  Season18_4_4: '18/4/4 Season (PPG/RPG/APG)',
  Season20_5_5: '20/5/5 Season (PPG/RPG/APG)',
  Season22_5_5: '22/5/5 Season (PPG/RPG/APG)',
  Season24_6_6: '24/6/6 Season (PPG/RPG/APG)',
  Season26_6_6: '26/6/6 Season (PPG/RPG/APG)',
  Season28_8_8: '28/8/8 Season (PPG/RPG/APG)',
  Season16_7_4: '16/7/4 Season (PPG/RPG/APG)',
  Season18_8_5: '18/8/5 Season (PPG/RPG/APG)',
  Season22_10_6: '22/10/6 Season (PPG/RPG/APG)',
  Season24_12_7: '24/12/7 Season (PPG/RPG/APG)',
  Season0_5_0_5_0_5: '0.5/0.5/0.5 Season (SPG/BPG/3PM/G)',
  Season0_8_0_8_0_8: '0.8/0.8/0.8 Season (SPG/BPG/3PM/G)',
  Season1_0_1_0_1_0: '1.0/1.0/1.0 Season (SPG/BPG/3PM/G)',
  Season1_2_1_2_1_2: '1.2/1.2/1.2 Season (SPG/BPG/3PM/G)',
  
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
  HKFinalsMVP: 'Finals MVP',
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

  // Baseball GM Season Statistical Achievements (28 new achievements)
  // Hitters (15 achievements)
  BBSeason40HR: '40+ HR (Season)',
  BBSeason200Hits: '200+ Hits (Season)',
  BBSeason100RBI: '100+ RBI (Season)',
  BBSeason100Runs: '100+ Runs (Season)',
  BBSeason50SB: '50+ SB (Season)',
  BBSeason100BB: '100+ BB (Season)',
  BBSeason300TB: '300+ TB (Season)',
  BBSeason60XBH: '60+ XBH (Season)',
  BBSeason300Avg500PA: '.300+ AVG on ≥500 PA (Season)',
  BBSeason400OBP500PA: '.400+ OBP on ≥500 PA (Season)',
  BBSeason550SLG500PA: '.550+ SLG on ≥500 PA (Season)',
  BBSeason900OPS500PA: '.900+ OPS on ≥500 PA (Season)',
  BBSeason10Triples: '10+ Triples (Season)',
  BBSeason20HBP: '20+ HBP (Season)',
  BBSeason25_25Club: '25/25 Club HR/SB (Season)',
  // Pitchers (12 achievements)
  BBSeason200SO: '200+ SO (Season)',
  BBSeason250ERA162IP: '≤2.50 ERA on ≥162 IP (Season)',
  BBSeason105WHIP162IP: '≤1.05 WHIP on ≥162 IP (Season)',
  BBSeason20Wins: '20+ Wins (Season)',
  BBSeason40Saves: '40+ Saves (Season)',
  BBSeason3CG: '3+ CG (Season)',
  BBSeason4SHO: '4+ SHO (Season)',
  BBSeason220IP: '220+ IP (Season)',
  BBSeasonKBB4_162IP: 'K/BB ≥ 4.0 on ≥162 IP (Season)',
  BBSeasonK9_10_100IP: 'K/9 ≥ 10.0 on ≥100 IP (Season)',
  BBSeason30GS: '30+ GS (Season)',
  BBSeason50APP: '50+ APP (Season)',
  // Two-Way (1 achievement)
  BBSeasonTwoWay20HR100IP: 'Two-Way 20+ HR & 100+ IP (Season)'
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

// Helper function to extract season achievement data from player
function getSeasonAchievementSeasons(player: Player, achievementId: SeasonAchievementId, teams: Team[], teamId?: number): string[] {
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
    // New Basketball achievements (season-aligned)
    Champion: ['Won Championship', 'championship', 'champion'],
    AllRookieTeam: ['All-Rookie Team', 'all-rookie team'],
    Season250ThreePM: ['250+ Three-Pointers Made', '250+ 3PM', 'three-pointers'],
    
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
    HKFinalsMVP: ['Finals MVP', 'finals mvp'],
    HKChampion: ['Won Championship', 'won championship'],
    
    // Baseball GM achievements
    BBAllStar: ['All-Star'],
    BBMVP: ['Most Valuable Player'],
    BBROY: ['Rookie of the Year'],
    BBAllRookie: ['All-Rookie Team'],
    BBAllLeague: ['All-League Team', 'First Team All-League', 'Second Team All-League'],
    BBPlayoffsMVP: ['Playoffs MVP', 'Finals MVP'],
    BBChampion: ['Won Championship']
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
  
  // Always generate separate bullet points for both constraints
  // No special case - let both constraints be processed individually
  
  // Standard rule: Generate one bullet per constraint header
  // Process constraints in order: Teams first, then season achievements, then career/misc
  const constraints = [rowConstraint, colConstraint];
  const teamConstraints = constraints.filter(c => c.type === 'team');
  const seasonAchConstraints = constraints.filter(c => c.type === 'achievement' && isSeasonAchievement(c.achievementId!));
  const otherAchConstraints = constraints.filter(c => c.type === 'achievement' && !isSeasonAchievement(c.achievementId!));
  
  // 1) Team bullets first
  for (const constraint of teamConstraints) {
    const bullet = buildTeamBullet(player, constraint.tid!, teams);
    if (bullet) bullets.push(bullet);
  }
  
  // 2) Season achievement bullets
  for (const constraint of seasonAchConstraints) {
    const bullet = buildSeasonAchievementBullet(player, constraint.achievementId! as SeasonAchievementId, teams);
    if (bullet) bullets.push(bullet);
  }
  
  // 3) Career/misc achievement bullets
  for (const constraint of otherAchConstraints) {
    const bullet = buildCareerAchievementBullet(player, constraint.achievementId!, teams, sport);
    if (bullet) bullets.push(bullet);
  }
  
  // Deduplicate identical bullets (if row and column are the same type/value)
  const uniqueBullets = bullets.filter((bullet, index, array) => 
    array.findIndex(b => b.text === bullet.text) === index
  );
  
  return uniqueBullets.slice(0, 3); // Max 3 bullets
}

// Build a team bullet: Team Name (minYear–maxYear)
function buildTeamBullet(player: Player, teamTid: number, teams: Team[]): ReasonBullet | null {
  if (!player.stats) return null;
  
  const teamSeasons = player.stats
    .filter(s => s.tid === teamTid && !s.playoffs && (s.gp || 0) > 0)
    .map(s => s.season)
    .sort((a, b) => a - b);
  
  if (teamSeasons.length === 0) return null;
  
  const team = teams.find(t => t.tid === teamTid);
  const teamName = team ? `${team.region} ${team.name}` : `Team ${teamTid}`;
  
  const seasonRange = teamSeasons.length === 1 
    ? teamSeasons[0].toString()
    : `${teamSeasons[0]}–${teamSeasons[teamSeasons.length - 1]}`;
  
  return {
    text: `${teamName} (${seasonRange})`,
    type: 'team'
  };
}

// Build a season achievement bullet: Award Label (season list with playoff teams for Finals/CFMVP)
function buildSeasonAchievementBullet(player: Player, achievementId: SeasonAchievementId, teams: Team[]): ReasonBullet | null {
  const achLabel = SEASON_ACHIEVEMENT_LABELS[achievementId];
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
function buildCareerAchievementBullet(player: Player, achievementId: string, teams: Team[], sport: string): ReasonBullet | null {
  // Use existing achievement bullet generation logic
  return generateAchievementBullet(player, achievementId, teams, sport);
}

// Legacy function for compatibility
function generateCategoryBullet(
  player: Player,
  constraint: GridConstraint,
  teams: Team[],
  sport: string
): ReasonBullet | null {
  if (constraint.type === 'team') {
    return buildTeamBullet(player, constraint.tid!, teams);
  } else if (constraint.type === 'achievement') {
    if (isSeasonAchievement(constraint.achievementId!)) {
      return buildSeasonAchievementBullet(player, constraint.achievementId! as SeasonAchievementId, teams);
    } else {
      return buildCareerAchievementBullet(player, constraint.achievementId!, teams, sport);
    }
  }
  
  return null;
}


function generateAchievementBullet(
  player: Player,
  achievementId: string,
  teams: Team[],
  sport: string
): ReasonBullet | null {
  // Decade achievements
  if (achievementId.includes('playedIn') && achievementId.endsWith('s')) {
    return generateDecadeBullet(player, achievementId, 'played');
  }
  
  if (achievementId.includes('debutedIn') && achievementId.endsWith('s')) {
    return generateDecadeBullet(player, achievementId, 'debuted');
  }
  
  if (achievementId.includes('retiredIn') && achievementId.endsWith('s')) {
    return generateDecadeBullet(player, achievementId, 'retired');
  }
  
  // Draft achievements
  if (['isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen'].includes(achievementId)) {
    return generateDraftBullet(player, achievementId);
  }
  
  // Longevity achievements  
  if (['played15PlusSeasons', 'played10PlusSeasons'].includes(achievementId)) {
    return generateLongevityBullet(player, achievementId);
  }
  
  // Career thresholds
  if (achievementId.startsWith('career')) {
    return generateCareerThresholdBullet(player, achievementId, sport);
  }
  
  // Season thresholds
  if (achievementId.startsWith('season')) {
    return generateSeasonThresholdBullet(player, achievementId, sport);
  }
  
  // Awards
  if (['wonMVP', 'hasMVP', 'wonDPOY', 'hasDPOY', 'wonROY', 'hasROY', 'wonFinalsMVP', 'wonSixMOY', 'hasAllStar', 'madeAllStar', 'wonChampionship'].includes(achievementId)) {
    return generateAwardBullet(player, achievementId, sport);
  }
  
  // Hall of Fame
  if (achievementId === 'isHallOfFamer') {
    return generateHallOfFameBullet(player);
  }
  
  return null;
}

function generateDraftBullet(player: Player, achievementId: string): ReasonBullet | null {
  const draftYear = player.draft?.year || 'unknown';
  
  const draftLabels: Record<string, string> = {
    isPick1Overall: '#1 Overall Pick',
    isFirstRoundPick: 'First-Round Pick', 
    isSecondRoundPick: 'Second-Round Pick',
    isUndrafted: 'Undrafted',
    draftedTeen: 'Drafted as Teenager'
  };
  
  const label = draftLabels[achievementId];
  if (!label) return null;
  
  return {
    text: `${label} (${draftYear})`,
    type: 'draft'
  };
}

function generateLongevityBullet(player: Player, achievementId: string): ReasonBullet | null {
  if (!player.stats) return null;
  
  const seasons = new Set(
    player.stats
      .filter(s => !s.playoffs && (s.gp || 0) > 0)
      .map(s => s.season)
  ).size;
  
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
    // For "debuted", show the first season
    actualYear = Math.min(...regularSeasonStats.map(s => s.season));
    labelText = `Debuted in ${actualYear}`;
  } else if (type === 'retired') {
    // For "retired", show the last season
    actualYear = Math.max(...regularSeasonStats.map(s => s.season));
    labelText = `Retired in ${actualYear}`;
  } else {
    return null;
  }
  
  return {
    text: labelText,
    type: 'decade'
  };
}

function generateCareerThresholdBullet(player: Player, achievementId: string, sport: string): ReasonBullet | null {
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
  
  // Debug logging for hockey assists specifically
  if (threshold.stat === 'a' && player.name) {
    console.log(`🏒 CAREER ASSISTS DEBUG: ${player.name}, career total: ${actualValue}`);
    if (player.stats) {
      console.log(`🏒 Player has ${player.stats.filter(s => !s.playoffs).length} regular season records`);
      console.log(`🏒 Sample season stats:`, player.stats.filter(s => !s.playoffs)[0]);
    }
  }
  
  return {
    text: `${threshold.label} (${formatNumber(actualValue)})`,
    type: 'category'
  };
}

function generateSeasonThresholdBullet(player: Player, achievementId: string, sport: string): ReasonBullet | null {
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
    return generatePerGameBullet(player, achievementId, threshold);
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
  
  return {
    text: `${threshold.label} (${valueStr}) in ${bestSeason.year}`,
    type: 'category'
  };
}

function generatePerGameBullet(player: Player, achievementId: string, threshold: { label: string; stat: string }): ReasonBullet | null {
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
  
  return {
    text: `${threshold.label} (${bestValue.toFixed(1)}) in ${bestYear}`,
    type: 'category'
  };
}

function generateAwardBullet(player: Player, achievementId: string, sport: string): ReasonBullet | null {
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
  
  return {
    text: `${award.label} (${seasonText})`,
    type: 'award'
  };
}