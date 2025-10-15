import type { Player, Team } from '@/types/bbgm';
import { SEASON_ALIGNED_ACHIEVEMENTS, getAllAchievements, getCachedSportDetection, type Achievement } from '@/lib/achievements';
import { playerMeetsAchievement } from '@/lib/achievements';
import { SEASON_ACHIEVEMENTS, type SeasonAchievementId, type SeasonIndex } from './season-achievements';
import { parseAchievementLabel, generateUpdatedLabel, parseCustomAchievementId } from './editable-achievements';
import {
  getSeasonsForSeasonStatAchievement,
  formatBulletSeasonList,
  getBasketballCareerStats,
  getBasketballSeasonBests,
  getBasketball504090Season,
  getBasketballAwardSeason,
  getFootballCareerStats,
  getFootballSeasonBests,
  getHockeyCareerStats,
  getHockeySeasonBests,
  getBaseballCareerStats,
  getBaseballSeasonBests,
} from "./reason-bullets";

export interface GridConstraint {
  type: 'team' | 'achievement';
  tid?: number;
  achievementId?: string;
  label: string;
}

// Helper to check if a player meets a constraint
function checkConstraint(
  player: Player,
  constraint: GridConstraint,
  teams: Team[],
  sport: "basketball" | "football" | "hockey" | "baseball" | undefined,
  allAchievements: ReturnType<typeof getAllAchievements>,
  seasonIndex: any, // Add seasonIndex here
  otherConstraint?: GridConstraint // Add otherConstraint here
): boolean {
  if (constraint.type === "team") {
    return (
      player.stats?.some(
        (s) => s.tid === constraint.tid && !s.playoffs && (s.gp || 0) > 0
      ) || false
    );
  } else if (constraint.type === "achievement") {
    if (!constraint.achievementId) return false;

    const parsedCustom = parseCustomAchievementId(constraint.achievementId);
    const baseAchievementId = parsedCustom
      ? parsedCustom.baseId
      : constraint.achievementId;

    // ** START OF MANUAL FIX for played15PlusSeasons **
    if (baseAchievementId === "played15PlusSeasons") {
      const seasonCount = new Set(
        player.stats
          ?.filter((s) => !s.playoffs && (s.gp || 0) > 0)
          .map((s) => s.season)
      ).size;
      const threshold = parsedCustom ? parsedCustom.threshold : 15;
      const operator = parsedCustom?.operator === "≤" ? "<=" : ">=";

      if (operator === ">=") {
        return seasonCount >= threshold;
      } else {
        // operator is "<="
        return seasonCount <= threshold;
      }
    }
    // ** END OF MANUAL FIX **

    // ** START OF MANUAL FIX for playedAtAge... **
    if (baseAchievementId.startsWith("playedAtAge")) {
      const age = parsedCustom
        ? parsedCustom.threshold
        : parseInt(
            baseAchievementId.match(/playedAtAge(\d+)Plus/)?.[1] || "40",
            10
          );
      const operator = parsedCustom?.operator === "≤" ? "<=" : ">=";

      let minAge = 999;
      let maxAge = 0;
      let hasPlayed = false;

      player.stats?.forEach((s) => {
        if (s.playoffs || (s.gp || 0) === 0 || !player.born?.year) return;
        hasPlayed = true;
        const currentAge = s.season - player.born.year;
        minAge = Math.min(minAge, currentAge);
        maxAge = Math.max(maxAge, currentAge);
      });

      if (!hasPlayed) return false;

      if (operator === ">=") {
        return maxAge >= age;
      } else {
        // operator is "<="
        return minAge <= age;
      }
    }
    // ** END OF MANUAL FIX **

    // ** START OF MANUAL FIX for royLaterMVP **
    if (baseAchievementId === "royLaterMVP") {
      const royAward = player.awards?.find((a) =>
        a.type?.includes("Rookie of the Year")
      );
      const mvpAwards = player.awards?.filter((a) =>
        a.type?.includes("Most Valuable Player")
      );

      if (!royAward?.season || !mvpAwards || mvpAwards.length === 0) {
        return false;
      }

      // Check if there's at least one MVP award with a season later than the ROY award
      return mvpAwards.some(
        (mvp) => mvp.season && mvp.season > royAward.season!
      );
    }
    // ** END OF MANUAL FIX **

    const achievement = allAchievements.find(
      (a) => a.id === baseAchievementId
    );

    if (achievement) {
      console.log(`DEBUG: checkConstraint - Achievement found for ${baseAchievementId}`);
      let teamIdForAchievement: number | undefined;

      const CAREER_ACHIEVEMENTS = [
        "isHallOfFamer",
        "isPick1Overall",
        "isFirstRoundPick",
        "isSecondRoundPick",
        "isUndrafted",
        "draftedTeen",
        "bornOutsideUS50DC",
        // "played15PlusSeasons" is now handled above
        "played5PlusFranchises",
        "playedInThreeDecades",
        // "royLaterMVP" is now handled above
      ];

      const isCareerAchievement =
        CAREER_ACHIEVEMENTS.includes(baseAchievementId) ||
        baseAchievementId.startsWith("career") ||
        (baseAchievementId.includes("playedIn") &&
          baseAchievementId.endsWith("s")) ||
        (baseAchievementId.includes("debutedIn") &&
          baseAchievementId.endsWith("s"));

      if (otherConstraint?.type === "team" && !isCareerAchievement) {
        teamIdForAchievement = otherConstraint.tid;
      }

      const operator = parsedCustom?.operator === "≤" ? "<=" : ">=";

      return playerMeetsAchievement(
        player,
        constraint.achievementId, // Pass the original, full ID
        seasonIndex,
        operator,
        teamIdForAchievement
      );
    }
  }
  return false;
}

interface ParsedCustomAchievement {
  baseId: string;
  threshold: number;
  operator: '≥' | '≤';
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
  SeasonPPG: {
    label: 'PPG (Season)',
    short: 'PPG',
    verbTeam: 'averaged PPG in a season',
    verbGeneric: 'averaged PPG in a season'
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
    SeasonPPG: ['PPG', 'points per game'],
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




function formatNumber(num: number): string {
  return num.toLocaleString();
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
    'isPick1Overall': 'was the #1 overall draft pick',
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



// Basketball-specific helper functions




// Helper function to get 50/40/90 season data for basketball


// Helper function to get award seasons for basketball


// Helper function to get award seasons for baseball


// Helper function to get award seasons for hockey


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
    case 'isSecondRoundPick':
      const draftYear = player.draft?.year || 'unknown';
      return `was a second-round pick in ${draftYear}`;
    case 'career20kPoints':
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
    let actualValue: number = 0; // Initialize with a default number
    let year: number | undefined;

    if (sport === 'basketball') {
      const careerStats = getBasketballCareerStats(player);
      const seasonBests = getBasketballSeasonBests(player);
      if (statInfo.type === 'career') {
        actualValue = careerStats[statInfo.key as keyof typeof careerStats] || 0;
      } else if (statInfo.type === 'season_avg') {
        const best = seasonBests[statInfo.key as keyof typeof seasonBests];
        actualValue = best.max || 0;
        year = best.year;
      } else if (statInfo.type === 'season') {
        // For season totals, we need to find the max total for that stat
        const maxSeasonTotal = player.stats?.reduce((max, s) => {
          if (s.playoffs) return max;
          const statValue = (s as any)[statInfo.key] || 0;
          return Math.max(max, statValue);
        }, 0) || 0;
        actualValue = maxSeasonTotal;
      }
    } else if (sport === 'football') {
      const careerStats = getFootballCareerStats(player);
      const seasonBests = getFootballSeasonBests(player);
      if (statInfo.type === 'career') {
        actualValue = careerStats[statInfo.key as keyof typeof careerStats] || 0;
      } else if (statInfo.type === 'season_avg') {
        // Football doesn't have season averages in this context, so handle as season total
        const best = seasonBests[statInfo.key as keyof typeof seasonBests];
        actualValue = best.max || 0;
        year = best.year;
      } else if (statInfo.type === 'season') {
        const best = seasonBests[statInfo.key as keyof typeof seasonBests];
        actualValue = best.max || 0;
        year = best.year;
      }
    } else if (sport === 'hockey') {
      const careerStats = getHockeyCareerStats(player);
      const seasonBests = getHockeySeasonBests(player);
      if (statInfo.type === 'career') {
        actualValue = careerStats[statInfo.key as keyof typeof careerStats] || 0;
      } else if (statInfo.type === 'season_avg') {
        const best = seasonBests[statInfo.key as keyof typeof seasonBests];
        actualValue = best.max || 0;
        year = best.year;
      } else if (statInfo.type === 'season') {
        const maxSeasonTotal = player.stats?.reduce((max, s) => {
          if (s.playoffs) return max;
          const statValue = (s as any)[statInfo.key] || 0;
          return Math.max(max, statValue);
        }, 0) || 0;
        actualValue = maxSeasonTotal;
      }
    } else if (sport === 'baseball') {
      const careerStats = getBaseballCareerStats(player);
      const seasonBests = getBaseballSeasonBests(player);
      if (statInfo.type === 'career') {
        actualValue = careerStats[statInfo.key as keyof typeof careerStats] || 0;
      } else if (statInfo.type === 'season_avg') {
        // For ERA, lower is better, so we need to get the min
        if (statInfo.key === 'era') {
          actualValue = seasonBests.era.min || 0;
          year = seasonBests.era.year;
        } else {
          const best = seasonBests[statInfo.key as keyof typeof seasonBests];
          actualValue = ('max' in best ? best.max : best.min) || 0;
          year = best.year;
        }
      } else if (statInfo.type === 'season') {
        const best = seasonBests[statInfo.key as keyof typeof seasonBests];
        actualValue = ('max' in best ? best.max : best.min) || 0;
        year = best.year;
      }
    }

    // Now actualValue is guaranteed to be a number
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

    // Define a type for the negative message generator functions
    type NegativeMessageGenerator = (player: Player, parsed: ParsedCustomAchievement, statInfo: StatInfo) => string;

    // Map of baseId to their respective negative message generator functions
    const negativeMessageGenerators: Record<string, NegativeMessageGenerator> = {
      // Decade achievements
      'playedInThreeDecades': (player, parsed) => {
        const actualDecades = player.decadesPlayed?.size || 0;
        const threshold = parsed.threshold;
        const operator = parsed.operator;
        return operator === '≤'
          ? `played in ${actualDecades} decade${actualDecades === 1 ? '' : 's'} (more than ${threshold} required)`
          : `played in ${actualDecades} decade${actualDecades === 1 ? '' : 's'} (fewer than ${threshold} required)`;
      },
      'playedIn': (player, parsed) => { // Generic handler for playedInXXXXs
        const actualDecades = player.decadesPlayed?.size || 0;
        const threshold = parsed.threshold;
        const operator = parsed.operator;
        return operator === '≤'
          ? `played in ${actualDecades} decade${actualDecades === 1 ? '' : 's'} (more than ${threshold} required)`
          : `played in ${actualDecades} decade${actualDecades === 1 ? '' : 's'} (fewer than ${threshold} required)`;
      },
      'debutedIn': (player, parsed) => { // Generic handler for debutedInXXXXs
        const actualDecades = player.decadesPlayed?.size || 0; // Assuming decadesPlayed is relevant for debut
        const threshold = parsed.threshold;
        const operator = parsed.operator;
        return operator === '≤'
          ? `debuted in ${actualDecades} decade${actualDecades === 1 ? '' : 's'} (more than ${threshold} required)`
          : `debuted in ${actualDecades} decade${actualDecades === 1 ? '' : 's'} (fewer than ${threshold} required)`;
      },
      // Franchise achievements
      'played5PlusFranchises': (player, parsed) => {
        const actualFranchises = getPlayerFranchiseCount(player);
        const threshold = parsed.threshold;
        const operator = parsed.operator;
        return operator === '≤'
          ? `played for ${actualFranchises} franchise${actualFranchises === 1 ? '' : 's'} (more than ${threshold} required)`
          : `played for ${actualFranchises} franchise${actualFranchises === 1 ? '' : 's'} (fewer than ${threshold} required)`;
      },
      // Combo achievements
      'Season25_10': (player, parsed) => {
        return parsed.operator === '≤'
          ? `never had under 25 PPG or under 10 RPG in a season`
          : `never had 25+ PPG and 10+ RPG in a season`;
      },
      'Season25_5_5': (player, parsed) => {
        return parsed.operator === '≤'
          ? `never had under 25 PPG or under 5 RPG or under 5 APG in a season`
          : `never had 25+ PPG, 5+ RPG, and 5+ APG in a season`;
      },
      'Season20_10_5': (player, parsed) => {
        return parsed.operator === '≤'
          ? `never had under 20 PPG or under 10 RPG or under 5 APG in a season`
          : `never had 20+ PPG, 10+ RPG, and 5+ APG in a season`;
      },
      'Season1_1_1': (player, parsed) => {
        return parsed.operator === '≤'
          ? `never averaged under 1 SPG or under 1 BPG or under 1 3PM/G in a season`
          : `never averaged 1+ SPG, 1+ BPG, and 1+ 3PM/G in a season`;
      },
      'Season50_40_90': (player, parsed) => {
        return parsed.operator === '≤'
          ? `never had under 50/40/90 splits in a season`
          : `never had a 50/40/90 season`;
      },
      'Season200Stocks': (player, parsed) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} stocks in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ stocks in a season`;
      },
      // Generic season stat achievements (Basketball, Football, Hockey)
      'Season30PPG': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never averaged under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never averaged ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'Season2000Points': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'Season200_3PM': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never hit under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never hit ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'Season12RPG': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never averaged under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never averaged ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'Season10APG': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never averaged under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never averaged ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'Season800Rebounds': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'Season700Assists': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'Season2SPG': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never averaged under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never averaged ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'Season2_5BPG': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never averaged under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never averaged ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'Season150Steals': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'Season150Blocks': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'Season60eFG500FGA': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never posted under ${parsed.threshold.toLocaleString()}% ${statInfo.name} in a season`
          : `never posted ${parsed.threshold.toLocaleString()}%+ ${statInfo.name} in a season`;
      },
      'Season90FT250FTA': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never posted under ${parsed.threshold.toLocaleString()}% ${statInfo.name} in a season`
          : `never posted ${parsed.threshold.toLocaleString()}%+ ${statInfo.name} in a season`;
      },
      'SeasonFGPercent': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never posted under ${parsed.threshold.toLocaleString()}% ${statInfo.name} in a season`
          : `never posted ${parsed.threshold.toLocaleString()}%+ ${statInfo.name} in a season`;
      },
      'Season3PPercent': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never posted under ${parsed.threshold.toLocaleString()}% ${statInfo.name} in a season`
          : `never posted ${parsed.threshold.toLocaleString()}%+ ${statInfo.name} in a season`;
      },
      'Season70Games': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never played under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never played ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'Season36MPG': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never averaged under ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`
          : `never averaged ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      // Football Season Stats
      'FBSeason4kPassYds': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'FBSeason1200RushYds': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'FBSeason100Receptions': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'FBSeason15Sacks': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'FBSeason140Tackles': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'FBSeason5Interceptions': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'FBSeason30PassTD': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'FBSeason1300RecYds': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'FBSeason10RecTD': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'FBSeason12RushTD': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'FBSeason1600Scrimmage': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'FBSeason2000AllPurpose': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'FBSeason15TFL': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      // Hockey Season Stats
      'HKSeason40Goals': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason60Assists': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason90Points': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason25Plus': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason250Shots': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason150Hits': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason100Blocks': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason60Takeaways': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason20PowerPlay': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason3SHGoals': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason7GWGoals': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason55FaceoffPct': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never posted under ${parsed.threshold.toLocaleString()}% ${statInfo.name} in a season`
          : `never posted ${parsed.threshold.toLocaleString()}%+ ${statInfo.name} in a season`;
      },
      'HKSeason22TOI': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never averaged under ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`
          : `never averaged ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason70PIM': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason920SavePct': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never posted under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never posted ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason260GAA': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had over ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`;
      },
      'HKSeason6Shutouts': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason2000Saves': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      'HKSeason60Starts': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `never had under ${parsed.threshold.toLocaleString()} ${statInfo.name} in a season`
          : `never had ${parsed.threshold.toLocaleString()}+ ${statInfo.name} in a season`;
      },
      // Generic career stat achievements
      'careerPoints': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `had more than ${parsed.threshold.toLocaleString()} ${statInfo.name}`
          : `had fewer than ${parsed.threshold.toLocaleString()} ${statInfo.name}`;
      },
      'careerRebounds': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `had more than ${parsed.threshold.toLocaleString()} ${statInfo.name}`
          : `had fewer than ${parsed.threshold.toLocaleString()} ${statInfo.name}`;
      },
      'careerAssists': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `had more than ${parsed.threshold.toLocaleString()} ${statInfo.name}`
          : `had fewer than ${parsed.threshold.toLocaleString()} ${statInfo.name}`;
      },
      'careerWinsG': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `had more than ${parsed.threshold.toLocaleString()} ${statInfo.name}`
          : `had fewer than ${parsed.threshold.toLocaleString()} ${statInfo.name}`;
      },
      'careerShutoutsG': (player, parsed, statInfo) => {
        return parsed.operator === '≤'
          ? `had more than ${parsed.threshold.toLocaleString()} ${statInfo.name}`
          : `had fewer than ${parsed.threshold.toLocaleString()} ${statInfo.name}`;
      },
    };

    // Check for specific generators first
    if (negativeMessageGenerators[parsed.baseId]) {
      // For generic 'playedIn' and 'debutedIn' achievements, use the specific handlers
      if (parsed.baseId.includes('playedIn') && parsed.baseId.endsWith('s')) {
        return negativeMessageGenerators['playedIn'](player, parsed, statInfo);
      }
      if (parsed.baseId.includes('debutedIn') && parsed.baseId.endsWith('s')) {
        return negativeMessageGenerators['debutedIn'](player, parsed, statInfo);
      }
      return negativeMessageGenerators[parsed.baseId](player, parsed, statInfo);
    }

    // Fallback for generic stat achievements if no specific generator is found
    if (statInfo) {
      const valueString = actualValue !== undefined ? (actualValue % 1 !== 0 ? actualValue.toFixed(1) : actualValue.toLocaleString()) : 'N/A';
      const thresholdString = parsed.threshold.toLocaleString();
      const statName = statInfo.name;

      let message: string;
      if (parsed.operator === '≤') {
        message = `had more than ${thresholdString} ${statName} (${valueString})`;
      } else {
        message = `had fewer than ${thresholdString} ${statName} (${valueString})`;
      }

      if (year && year > 0) {
        return `never ${message.replace(statName, statInfo.name)} (best was ${valueString} in ${year})`;
      }

      return message;
    }

    // Final fallback if no specific or generic stat message can be generated
    return `never achieved ${cleanLabel.toLowerCase()}`;
  }

  return null; // Default return for all code paths
}


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



// Generate feedback message for an incorrect guess
export function generateFeedbackMessage(
  player: Player,
  rowConstraint: GridConstraint,
  colConstraint: GridConstraint,
  teams: Team[],
  sport: "basketball" | "football" | "hockey" | "baseball",
  allAchievements: Achievement[],
  seasonIndex?: SeasonIndex
): string[] {
  const feedback: string[] = [];

  // --- First bullet point (Row - Team) ---
  if (rowConstraint.type === "team") {
    const team = teams.find((t) => t.tid === rowConstraint.tid);
    const teamName = team ? `${team.region} ${team.name}` : `Team ${rowConstraint.tid}`;
    const playerPlayed = playerPlayedForTeam(player, rowConstraint.tid!);

    if (playerPlayed) {
      const teamSeasons = getPlayerTeamSeasons(player, rowConstraint.tid!);
      const yearRange =
        teamSeasons.length === 1
          ? teamSeasons[0].toString()
          : teamSeasons.length > 1
          ? `${teamSeasons[0]}–${teamSeasons[teamSeasons.length - 1]}`
          : "";
      feedback.push(`${teamName}${yearRange ? ` (${yearRange})` : ""}`);
    } else {
      feedback.push(`Never played for the ${teamName}`);
    }
  } else {
    // Fallback for if row is an achievement (shouldn't happen based on grid structure, but for safety)
    feedback.push(`Row: ${getConstraintLabel(rowConstraint, teams, allAchievements)}`);
  }

  // --- Second bullet point (Column - Achievement) ---
  if (colConstraint.type === "achievement") {
    const achievementId = colConstraint.achievementId!;
    const achievementLabel = getHumanReadableAchievementText(achievementId);
    const metGlobally = playerMeetsAchievement(
      player,
      achievementId,
      seasonIndex,
      undefined, // operator
      undefined, // teamId - check globally
      undefined  // season
    );
    const metWithTeam = playerMeetsAchievement(
      player,
      achievementId,
      seasonIndex,
      undefined, // operator
      rowConstraint.tid, // teamId - check with row team
      undefined  // season
    );

    if (metWithTeam) {
      const achievementDetails = getAchievementDetails(
        player,
        achievementId,
        teams,
        sport,
        allAchievements
      );
      feedback.push(`${achievementLabel}${achievementDetails?.years ? ` (${achievementDetails.years})` : ""}`);
    } else if (metGlobally) {
      // Player has the achievement, but not with the guessed team (row team)
      const achievementDetails = getAchievementDetails(
        player,
        achievementId,
        teams,
        sport,
        allAchievements
      );
      const teamName = teams.find(t => t.tid === rowConstraint.tid)?.name || "this team";
      feedback.push(`${achievementLabel}${achievementDetails?.years ? ` (${achievementDetails.years})` : ""} (never with the ${teamName})`);
    } else {
      const customMessage = getNegativeMessageForCustomAchievement(player, achievementId);
      feedback.push(customMessage || `Did not achieve: ${achievementLabel}`);
    }
  } else {
    // Fallback for if col is a team (shouldn't happen based on grid structure, but for safety)
    feedback.push(`Col: ${getConstraintLabel(colConstraint, teams, allAchievements)}`);
  }

  return feedback;
}



// Helper to get a readable label for a constraint
function getConstraintLabel(
  constraint: GridConstraint,
  teams: Team[],
  allAchievements: ReturnType<typeof getAllAchievements>
): string {
  if (constraint.type === "team") {
    const team = teams.find((t) => t.tid === constraint.tid);
    return (
      constraint.label ||
      (team ? `${team.region} ${team.name}` : `Team ${constraint.tid}`)
    );
  } else if (constraint.type === "achievement") {
    const achievement = allAchievements.find(
      (a) => a.id === constraint.achievementId
    );
    if (achievement) {
      return parseAchievementLabel(
        achievement.label,
        getCachedSportDetection() || "basketball"
      ).originalLabel;
    }
    return (
      constraint.label || constraint.achievementId || "Unknown Achievement"
    );
  }
  return "Unknown Criteria";
}

// Helper to get specific details for an achievement (e.g., years for awards, value for stats)
function getAchievementDetails(
  player: Player,
  achievementId: string,
  teams: Team[],
  sport: "basketball" | "football" | "hockey" | "baseball" | undefined,
  allAchievements: ReturnType<typeof getAllAchievements>
): {
  value?: string | number;
  years?: string;
  label: string;
  isPlural?: boolean;
  isAverage?: boolean;
} | null {
  const parsedCustom = parseCustomAchievementId(achievementId);
  const baseAchievementId = parsedCustom ? parsedCustom.baseId : achievementId;

  const achievement = allAchievements.find((a) => a.id === baseAchievementId);
  if (!achievement) return null;

  let baseLabel =
    parseAchievementLabel(achievement.label, sport).originalLabel ||
    achievement.label ||
    achievementId ||
    "Unknown Achievement";
  let value: string | number | undefined;
  let years: string | undefined;
  let isPlural = false;
  let isAverage = false; // Initialize isAverage

  const getAwardSeasons = (awardTypes: string[]) => {
    const seasons =
      player.awards
        ?.filter(
          (a) =>
            a.season !== undefined &&
            awardTypes.some((type) => a.type?.includes(type))
        )
        .map((a) => a.season)
        .sort((a, b) => a - b) as number[] | undefined;

    if (seasons && seasons.length > 0) {
      isPlural = seasons.length > 1;
      return formatYearsWithRanges(seasons);
    }
    return undefined;
  };

  // Logic to extract details based on achievement type
  if (baseAchievementId.startsWith("career")) {
    // Career statistical milestones
    if (baseAchievementId.includes("Points")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + (s.pts || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("Rebounds")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => {
            let seasonRebounds = 0;
            if ((s as any).trb !== undefined) {
                seasonRebounds = (s as any).trb;
            } else if ((s as any).orb !== undefined || (s as any).drb !== undefined) {
                seasonRebounds = ((s as any).orb || 0) + ((s as any).drb || 0);
            } else if ((s as any).reb !== undefined) {
                seasonRebounds = (s as any).reb;
            }
            return acc + seasonRebounds;
        }, 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("Assists")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + (s.ast || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("Steals")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + (s.stl || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("Blocks")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + (s.blk || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("Threes")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).tpm || (s as any).tp || (s as any).fg3 || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("PassTDs")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).pssTD || 0), 0)
        ?.toLocaleString();
      baseLabel = baseLabel.replace("TDs", "passing touchdowns");
    } else if (baseAchievementId.includes("RushYds")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).rusYds || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("RushTDs")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).rusTD || 0), 0)
        ?.toLocaleString();
      baseLabel = baseLabel.replace("TDs", "rushing touchdowns");
    } else if (baseAchievementId.includes("RecYds")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).recYds || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("RecTDs")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).recTD || 0), 0)
        ?.toLocaleString();
      baseLabel = baseLabel.replace("TDs", "receiving touchdowns");
    } else if (baseAchievementId.includes("Sacks")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).sks || (s as any).defSk || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("Ints")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).defInt || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("Hits")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).h || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("HRs")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).hr || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("RBIs")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).rbi || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("SBs")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).sb || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("Runs")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).r || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("Wins") && sport === "baseball") {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).w || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("Ks")) {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).soPit || 0), 0)
        ?.toLocaleString();
    } else if (baseAchievementId.includes("Saves") && sport === "baseball") {
      value = player.stats
        ?.filter((s) => !s.playoffs)
        .reduce((acc, s) => acc + ((s as any).sv || 0), 0)
        ?.toLocaleString();
                    } else if (baseAchievementId.includes("Goals") && sport === "hockey") {
                      value = getHockeyCareerStats(player).g.toLocaleString();
                    } else if (baseAchievementId.includes("Assists") && sport === "hockey") {
                      value = getHockeyCareerStats(player).a.toLocaleString();
                    } else if (baseAchievementId.includes("Points") && sport === "hockey") {
                      value = getHockeyCareerStats(player).pts.toLocaleString();
                    } else if (baseAchievementId.includes("Wins") && sport === "hockey") {
                      value = getHockeyCareerStats(player).w.toLocaleString();
                    } else if (baseAchievementId.includes("Shutouts") && sport === "hockey") {
                      value = getHockeyCareerStats(player).so.toLocaleString();
                    }  } else if (baseAchievementId.startsWith("Season")) {
    // For ALL Season* achievements, use the robust logic from reason-bullets.
    const qualifyingSeasons = getSeasonsForSeasonStatAchievement(
      player,
      achievementId as any,
      undefined,
      undefined,
      1
    );
    if (qualifyingSeasons.length > 0) {
      years = formatBulletSeasonList(qualifyingSeasons, false);
      isPlural = qualifyingSeasons.length > 1;
    }
    // No single "value" for these, so we leave it undefined.
  } else if (baseAchievementId === "AllStar") {
    years = getAwardSeasons(["All-Star"]);
  } else if (baseAchievementId === "MVP") {
    years = getAwardSeasons(["Most Valuable Player"]);
  } else if (baseAchievementId === "DPOY") {
    years = getAwardSeasons(["Defensive Player of the Year", "DPOY"]);
  } else if (baseAchievementId === "ROY") {
    years = getAwardSeasons(["Rookie of the Year"]);
  } else if (baseAchievementId === "SMOY") {
    years = getAwardSeasons(["Sixth Man of the Year"]);
  } else if (baseAchievementId === "MIP") {
    years = getAwardSeasons(["Most Improved Player"]);
  } else if (baseAchievementId === "FinalsMVP") {
    years = getAwardSeasons(["Finals MVP"]);
  } else if (baseAchievementId === "AllLeagueAny") {
    years = getAwardSeasons(["All-League"]);
  } else if (baseAchievementId === "AllDefAny") {
    years = getAwardSeasons(["All-Defensive"]);
  } else if (baseAchievementId === "AllRookieAny") {
    years = getAwardSeasons(["All-Rookie"]);
  } else if (baseAchievementId === "threePointContestWinner") {
    years = getAwardSeasons(["Three-Point Contest Winner"]);
  } else if (baseAchievementId === "dunkContestWinner") {
    years = getAwardSeasons(["Slam Dunk Contest Winner"]);
  } else if (
    baseAchievementId.startsWith("playedAtAge") &&
    baseAchievementId.endsWith("Plus")
  ) {
    const age = parsedCustom
      ? parsedCustom.threshold
      : parseInt(
          baseAchievementId.match(/playedAtAge(\d+)Plus/)?.[1] || "40",
          10
        );
    const seasonsAtAgePlus =
      player.stats
        ?.filter(
          (s) =>
            !s.playoffs &&
            (s.gp || 0) > 0 &&
            s.season - (player.born?.year || 0) >= age
        )
        .map((s) => s.season)
        .sort((a, b) => a - b) || [];
    if (seasonsAtAgePlus.length > 0) {
      years = formatYearsWithRanges(seasonsAtAgePlus);
    }
  } else if (baseAchievementId === "royLaterMVP") {
    const royAward = player.awards?.find((a) =>
      a.type?.includes("Rookie of the Year")
    );
    const mvpAwards =
      player.awards
        ?.filter(
          (a) =>
            a.season !== undefined && a.type?.includes("Most Valuable Player")
        )
        .map((a) => a.season)
        .sort((a, b) => a - b) as number[] | undefined;

    if (royAward?.season && mvpAwards && mvpAwards.length > 0) {
      const royYear = royAward.season;
      const mvpYears = formatYearsWithRanges(mvpAwards);
      years = `(ROY ${royYear}; MVP ${mvpYears})`;
    }
  } else if (
    baseAchievementId.includes("playedIn") &&
    baseAchievementId.endsWith("s")
  ) {
    const decadeMatch = baseAchievementId.match(/playedIn(\d{4})s/);
    if (decadeMatch) {
      const decade = parseInt(decadeMatch[1]);
      const playedSeasonsInDecade =
        player.stats
          ?.filter(
            (s) => !s.playoffs && s.season >= decade && s.season < decade + 10
          )
          .map((s) => s.season)
          .sort((a, b) => a - b) || [];
      if (playedSeasonsInDecade.length > 0) {
        years = formatYearsWithRanges(playedSeasonsInDecade);
      }
    }
  } else if (
    baseAchievementId.includes("debutedIn") &&
    baseAchievementId.endsWith("s")
  ) {
    const firstSeason = player.firstSeason;
    if (firstSeason) {
      years = firstSeason.toString();
    }
  } else if (baseAchievementId === "isHallOfFamer") {
    years = getAwardSeasons(["Inducted into the Hall of Fame"]);
  } else if (baseAchievementId === "played15PlusSeasons") {
    const seasonCount = new Set(
      player.stats
        ?.filter((s) => !s.playoffs && (s.gp || 0) > 0)
        .map((s) => s.season)
    ).size;
    value = seasonCount;
    isPlural = seasonCount !== 1;
  } else if (baseAchievementId === "played5PlusFranchises") {
    const franchiseCount = new Set(
      player.stats?.filter((s) => s.tid !== -1).map((s) => s.tid)
    ).size;
    value = franchiseCount;
    isPlural = franchiseCount !== 1;
  } else if (
    baseAchievementId === "isPick1Overall" ||
    baseAchievementId === "isFirstRoundPick" ||
    baseAchievementId === "isSecondRoundPick" ||
    baseAchievementId === "isUndrafted" ||
    baseAchievementId === "draftedTeen"
  ) {
    if (player.draft) {
      const draftYear = player.draft.year;
      const round = player.draft.round;
      const pick = player.draft.pick;
      if (player.born?.year && draftYear) {
        value = draftYear - player.born.year;
      }
      // The 'isUndrafted' case is now handled directly in getConstraintPhrase
      if (baseAchievementId === "isPick1Overall" && draftYear) {
        years = `(${draftYear})`;
      } else if (round && pick) {
        years = `(${draftYear} R${round}P${pick})`;
      } else if (draftYear) {
        years = `(${draftYear})`;
      } else {
        years = "";
      }
    }
  } else if (baseAchievementId === "bornOutsideUS50DC") {
    // No specific years or value needed, just the boolean status
  } else if (baseAchievementId.includes("Leader")) {
    // For statistical leaders (e.g., PointsLeader)
    const leaderType = baseAchievementId.replace("Leader", "");
    const statFieldMap: Record<string, string> = {
      Points: "pts",
      Rebounds: "trb",
      Assists: "ast",
      Steals: "stl",
      Blocks: "blk",
    };
    const field = statFieldMap[leaderType];
    if (field) {
      const leaderSeasons =
        player.awards
          ?.filter(
            (a) =>
              a.season !== undefined &&
              a.type?.includes(`${leaderType} Leader`)
          )
          .map((a) => a.season)
          .sort((a, b) => a - b) as number[] | undefined;
      if (leaderSeasons && leaderSeasons.length > 0) {
        years = formatYearsWithRanges(leaderSeasons);
        isPlural = leaderSeasons.length > 1;
      }
    }
  } else if (baseAchievementId === "Won Championship") {
    years = getAwardSeasons(["Won Championship", "Championship"]);
  }

  return { value, years, label: baseLabel, isPlural, isAverage };
}

// Helper to generate a natural language phrase for a single constraint

// Helper to get the appropriate negative message based on sport

