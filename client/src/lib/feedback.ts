import type { Player, Team } from '@/types/bbgm';
import { SEASON_ALIGNED_ACHIEVEMENTS } from '@/lib/achievements';
import { playerMeetsAchievement } from '@/lib/achievements';
import { SEASON_ACHIEVEMENTS, type SeasonAchievementId } from './season-achievements';

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
  // REMOVED: SFMVP (fake achievement)
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
  FBPassLeader: {
    label: 'League Passing Leader',
    short: 'Pass Leader',
    verbTeam: 'led the league in passing',
    verbGeneric: 'led the league in passing'
  },
  FBRecLeader: {
    label: 'League Receiving Leader',
    short: 'Rec Leader',
    verbTeam: 'led the league in receiving',
    verbGeneric: 'led the league in receiving'
  },
  FBRushLeader: {
    label: 'League Rushing Leader',
    short: 'Rush Leader',
    verbTeam: 'led the league in rushing',
    verbGeneric: 'led the league in rushing'
  },
  FBScrimmageLeader: {
    label: 'League Scrimmage Yards Leader',
    short: 'Scrimmage Leader',
    verbTeam: 'led the league in scrimmage yards',
    verbGeneric: 'led the league in scrimmage yards'
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
  HKDPOY: {
    label: 'Defensive Player of the Year',
    short: 'DPOY',
    verbTeam: 'won a Defensive Player of the Year',
    verbGeneric: 'won a Defensive Player of the Year'
  },
  HKDefForward: {
    label: 'Defensive Forward of the Year',
    short: 'Def Forward',
    verbTeam: 'won Defensive Forward of the Year',
    verbGeneric: 'won Defensive Forward of the Year'
  },
  HKGoalie: {
    label: 'Goalie of the Year',
    short: 'Goalie',
    verbTeam: 'won Goalie of the Year',
    verbGeneric: 'won Goalie of the Year'
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
  HKPointsLeader: {
    label: 'League Points Leader',
    short: 'Points Leader',
    verbTeam: 'led the league in points',
    verbGeneric: 'led the league in points'
  },
  HKAssistsLeader: {
    label: 'League Assists Leader',
    short: 'Assists Leader',
    verbTeam: 'led the league in assists',
    verbGeneric: 'led the league in assists'
  },
  HKGoalsLeader: {
    label: 'League Goals Leader',
    short: 'Goals Leader',
    verbTeam: 'led the league in goals',
    verbGeneric: 'led the league in goals'
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
  
  // Baseball GM season achievements
  BBAllStar: {
    label: 'All-Star',
    short: 'All-Star',
    verbTeam: 'made an All-Star team',
    verbGeneric: 'made an All-Star team'
  },
  BBAllStarMVP: {
    label: 'All-Star MVP',
    short: 'All-Star MVP',
    verbTeam: 'won an All-Star MVP',
    verbGeneric: 'won an All-Star MVP'
  },
  BBMVP: {
    label: 'Most Valuable Player',
    short: 'MVP',
    verbTeam: 'won an MVP',
    verbGeneric: 'won an MVP'
  },
  BBPitcherOTY: {
    label: 'Pitcher of the Year',
    short: 'Pitcher OTY',
    verbTeam: 'won Pitcher of the Year',
    verbGeneric: 'won Pitcher of the Year'
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
  BBGoldGlove: {
    label: 'Gold Glove',
    short: 'Gold Glove',
    verbTeam: 'won a Gold Glove',
    verbGeneric: 'won a Gold Glove'
  },
  BBSilverSlugger: {
    label: 'Silver Slugger',
    short: 'Silver Slugger',
    verbTeam: 'won a Silver Slugger',
    verbGeneric: 'won a Silver Slugger'
  },
  BBBattingAvgLeader: {
    label: 'League Batting Average Leader',
    short: 'Batting Avg Leader',
    verbTeam: 'led the league in batting average',
    verbGeneric: 'led the league in batting average'
  },
  BBHomeRunLeader: {
    label: 'League Home Run Leader',
    short: 'HR Leader',
    verbTeam: 'led the league in home runs',
    verbGeneric: 'led the league in home runs'
  },
  BBRBILeader: {
    label: 'League RBI Leader',
    short: 'RBI Leader',
    verbTeam: 'led the league in RBIs',
    verbGeneric: 'led the league in RBIs'
  },
  BBStolenBaseLeader: {
    label: 'League Stolen Base Leader',
    short: 'SB Leader',
    verbTeam: 'led the league in stolen bases',
    verbGeneric: 'led the league in stolen bases'
  },
  BBOBPLeader: {
    label: 'League On-Base Percentage Leader',
    short: 'OBP Leader',
    verbTeam: 'led the league in on-base percentage',
    verbGeneric: 'led the league in on-base percentage'
  },
  BBSluggingLeader: {
    label: 'League Slugging Percentage Leader',
    short: 'Slugging Leader',
    verbTeam: 'led the league in slugging percentage',
    verbGeneric: 'led the league in slugging percentage'
  },
  BBOPSLeader: {
    label: 'League OPS Leader',
    short: 'OPS Leader',
    verbTeam: 'led the league in OPS',
    verbGeneric: 'led the league in OPS'
  },
  BBHitsLeader: {
    label: 'League Hits Leader',
    short: 'Hits Leader',
    verbTeam: 'led the league in hits',
    verbGeneric: 'led the league in hits'
  },
  BBERALeader: {
    label: 'League ERA Leader',
    short: 'ERA Leader',
    verbTeam: 'led the league in ERA',
    verbGeneric: 'led the league in ERA'
  },
  BBStrikeoutsLeader: {
    label: 'League Strikeouts Leader',
    short: 'Strikeouts Leader',
    verbTeam: 'led the league in strikeouts',
    verbGeneric: 'led the league in strikeouts'
  },
  BBSavesLeader: {
    label: 'League Saves Leader',
    short: 'Saves Leader',
    verbTeam: 'led the league in saves',
    verbGeneric: 'led the league in saves'
  },
  BBReliefPitcherOTY: {
    label: 'Relief Pitcher of the Year',
    short: 'Relief Pitcher OTY',
    verbTeam: 'won Relief Pitcher of the Year',
    verbGeneric: 'won Relief Pitcher of the Year'
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
    FBPassLeader: ['League Passing Leader'],
    FBRecLeader: ['League Receiving Leader'],
    FBRushLeader: ['League Rushing Leader'],
    FBScrimmageLeader: ['League Scrimmage Yards Leader'],
    
    // Hockey GM achievements (case-insensitive matches from ZGMH)
    HKAllStar: ['All-Star', 'all-star'],
    HKAllStarMVP: ['All-Star MVP', 'all-star mvp'],
    HKMVP: ['Most Valuable Player', 'most valuable player'],
    HKDPOY: ['Defensive Player of the Year', 'defensive player of the year'],
    HKDefForward: ['Defensive Forward of the Year', 'defensive forward of the year'],
    HKGoalie: ['Goalie of the Year', 'goalie of the year'],
    HKROY: ['Rookie of the Year', 'rookie of the year'],
    HKAllRookie: ['All-Rookie Team', 'all-rookie team'],
    HKAllLeague: ['All-League Team', 'all-league team', 'First Team All-League', 'Second Team All-League'],
    HKPointsLeader: ['League Points Leader', 'league points leader'],
    HKAssistsLeader: ['League Assists Leader', 'league assists leader'],
    HKGoalsLeader: ['League Goals Leader', 'league goals leader'],
    HKPlayoffsMVP: ['Playoffs MVP', 'playoffs mvp'],
    HKChampion: ['Won Championship', 'won championship'],
    
    // Baseball GM achievements (case-sensitive matches from ZGMB)
    BBAllStar: ['All-Star'],
    BBAllStarMVP: ['All-Star MVP'],
    BBMVP: ['Most Valuable Player'],
    BBPitcherOTY: ['Pitcher of the Year', 'Cy Young'],
    BBROY: ['Rookie of the Year'],
    BBAllRookie: ['All-Rookie Team'],
    BBAllLeague: ['All-League Team', 'First Team All-League', 'Second Team All-League'],
    BBGoldGlove: ['Gold Glove'],
    BBSilverSlugger: ['Silver Slugger'],
    BBBattingAvgLeader: ['League Batting Average Leader'],
    BBHomeRunLeader: ['League Home Run Leader'],
    BBRBILeader: ['League RBI Leader'],
    BBStolenBaseLeader: ['League Stolen Base Leader'],
    BBOBPLeader: ['League On-Base Percentage Leader'],
    BBSluggingLeader: ['League Slugging Percentage Leader'],
    BBOPSLeader: ['League OPS Leader'],
    BBHitsLeader: ['League Hits Leader', 'League Doubles Leader', 'League Triples Leader'],
    BBERALeader: ['League ERA Leader'],
    BBStrikeoutsLeader: ['League Strikeouts Leader'],
    BBSavesLeader: ['League Saves Leader'],
    BBReliefPitcherOTY: ['Relief Pitcher of the Year', 'Reliever of the Year'],
    BBPlayoffsMVP: ['Playoffs MVP', 'Finals MVP'],
    BBChampion: ['Won Championship']
  };

  const patterns = awardTypePatterns[achievementId] || [];
  const matchingAwards = player.awards.filter(award => {
    const awardType = (award.type || '').toLowerCase();
    const awardName = (award.name || '').toLowerCase();
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
      if (achievementId === 'FinalsMVP' || achievementId === 'FBFinalsMVP' || achievementId === 'HKPlayoffsMVP' || achievementId === 'HKChampion' || achievementId === 'BBPlayoffsMVP' || achievementId === 'BBChampion') {
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

// Helper function to format season lists
function formatSeasonList(seasons: string[], isFinalsOrCFMVP: boolean = false): string {
  if (seasons.length === 0) return '';
  if (seasons.length === 1) return seasons[0];
  
  // For Finals MVP/CFMVP, use semicolon separator: "1994 HOU; 1995 HOU"
  if (isFinalsOrCFMVP) {
    return seasons.join('; ');
  }
  
  // For other awards, use comma separator: "2019, 2020, 2021"
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

function formatNumber(num: number): string {
  return num.toLocaleString();
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
    return fallbacks[achievementId] || `achieved ${achievementId}`;
  }

  const careerStats = getFootballCareerStats(player);
  const seasonBests = getFootballSeasonBests(player);

  switch (achievementId) {
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
      return `achieved ${achievementId}`;
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
    
    const gp = season.gp || season.g || 0;
    if (gp < 10) continue; // Need minimum games
    
    const fgPct = season.fgp || season.fg_pct || 0;
    const fg3Pct = season.tpp || season.fg3_pct || 0;
    const ftPct = season.ftp || season.ft_pct || 0;
    
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
      if (award.type?.includes(name) || award.name?.includes(name)) {
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
      if (award.type?.includes(name) || award.name?.includes(name)) {
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
      if (award.type?.includes(name) || award.name?.includes(name)) {
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
    return fallbacks[achievementId] || `achieved ${achievementId}`;
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
      return `achieved ${achievementId}`;
  }
}

function getBasketballNegativeMessage(achievementId: string, player?: Player): string {
  if (!player) {
    return "";
  }

  const careerStats = getBasketballCareerStats(player);
  const seasonBests = getBasketballSeasonBests(player);

  switch (achievementId) {
    case 'isSecondRoundPick':
      return `was not a second-round pick`;
    case 'career20kPoints':
      return `did not reach 20,000+ career points (career ${formatNumber(careerStats.pts)})`;
    case 'career10kRebounds':
      return `did not reach 10,000+ career rebounds (career ${formatNumber(careerStats.trb)})`;
    case 'career5kAssists':
      return `did not reach 5,000+ career assists (career ${formatNumber(careerStats.ast)})`;
    case 'career2kSteals':
      return `did not reach 2,000+ career steals (career ${formatNumber(careerStats.stl)})`;
    case 'career1500Blocks':
      return `did not reach 1,500+ career blocks (career ${formatNumber(careerStats.blk)})`;
    case 'career2kThrees':
      return `did not make 2,000+ career threes (career ${formatNumber(careerStats.fg3)})`;
    case 'season30ppg':
      if (seasonBests.ppg.max === 0 && seasonBests.ppg.year === 0) {
        return `never averaged 30+ PPG in a season (never recorded a point)`;
      }
      return `never averaged 30+ PPG in a season (best ${seasonBests.ppg.max.toFixed(1)} in ${seasonBests.ppg.year})`;
    case 'season10apg':
      if (seasonBests.apg.max === 0 && seasonBests.apg.year === 0) {
        return `never averaged 10+ APG in a season (never recorded an assist)`;
      }
      return `never averaged 10+ APG in a season (best ${seasonBests.apg.max.toFixed(1)} in ${seasonBests.apg.year})`;
    case 'season15rpg':
      if (seasonBests.rpg.max === 0 && seasonBests.rpg.year === 0) {
        return `never averaged 15+ RPG in a season (never recorded a rebound)`;
      }
      return `never averaged 15+ RPG in a season (best ${seasonBests.rpg.max.toFixed(1)} in ${seasonBests.rpg.year})`;
    case 'season3bpg':
      if (seasonBests.bpg.max === 0 && seasonBests.bpg.year === 0) {
        return `never averaged 3+ BPG in a season (never recorded a block)`;
      }
      return `never averaged 3+ BPG in a season (best ${seasonBests.bpg.max.toFixed(1)} in ${seasonBests.bpg.year})`;
    case 'season25spg':
      if (seasonBests.spg.max === 0 && seasonBests.spg.year === 0) {
        return `never averaged 2.5+ SPG in a season (never recorded a steal)`;
      }
      return `never averaged 2.5+ SPG in a season (best ${seasonBests.spg.max.toFixed(1)} in ${seasonBests.spg.year})`;
    case 'season504090':
      return `never had a 50/40/90 season`;
    case 'hasMVP':
      return `never won MVP`;
    case 'hasDPOY':
      return `never won Defensive Player of the Year`;
    case 'hasROY':
      return `never won Rookie of the Year`;
    case 'wonSixMOY':
      return `never won Sixth Man of the Year`;
    case 'wonFinalsMVP':
      return `never won Finals MVP`;
    case 'hasAllStar':
      return `was never selected to an All-Star Game`;
    case 'wonChampionship':
      return `never won a championship`;
    default:
      return `did not achieve ${achievementId}`;
  }
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
    return fallbacks[achievementId] || `achieved ${achievementId}`;
  }

  const careerStats = getHockeyCareerStats(player);
  const seasonBests = getHockeySeasonBests(player);

  switch (achievementId) {
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
      return `achieved ${achievementId}`;
  }
}

function getHockeyNegativeMessage(achievementId: string, player?: Player): string {
  if (!player) {
    return "";
  }

  const careerStats = getHockeyCareerStats(player);
  const seasonBests = getHockeySeasonBests(player);

  switch (achievementId) {
    case 'career500Goals':
      return `did not reach 500+ career goals (career ${formatNumber(careerStats.g)})`;
    case 'career1000Points':
      return `did not reach 1,000+ career points (career ${formatNumber(careerStats.pts)})`;
    case 'career500Assists':
      return `did not reach 500+ career assists (career ${formatNumber(careerStats.a)})`;
    case 'career200Wins':
      return `did not reach 200+ career wins (career ${formatNumber(careerStats.w)})`;
    case 'career50Shutouts':
      return `did not reach 50+ career shutouts (career ${formatNumber(careerStats.so)})`;
    case 'season50Goals':
      if (seasonBests.g.max === 0 && seasonBests.g.year === 0) {
        return `never scored 50+ goals in a season (never recorded a goal)`;
      }
      return `never scored 50+ goals in a season (best ${seasonBests.g.max} in ${seasonBests.g.year})`;
    case 'season100Points':
      if (seasonBests.pts.max === 0 && seasonBests.pts.year === 0) {
        return `never had 100+ points in a season (never recorded a point)`;
      }
      return `never had 100+ points in a season (best ${seasonBests.pts.max} in ${seasonBests.pts.year})`;
    case 'season60Assists':
      if (seasonBests.a.max === 0 && seasonBests.a.year === 0) {
        return `never had 60+ assists in a season (never recorded an assist)`;
      }
      return `never had 60+ assists in a season (best ${seasonBests.a.max} in ${seasonBests.a.year})`;
    case 'season35Wins':
      if (seasonBests.w.max === 0 && seasonBests.w.year === 0) {
        return `never recorded 35+ wins in a season (never recorded a win)`;
      }
      return `never recorded 35+ wins in a season (best ${seasonBests.w.max} in ${seasonBests.w.year})`;
    case 'season10Shutouts':
      if (seasonBests.so.max === 0 && seasonBests.so.year === 0) {
        return `never recorded 10+ shutouts in a season (never recorded a shutout)`;
      }
      return `never recorded 10+ shutouts in a season (best ${seasonBests.so.max} in ${seasonBests.so.year})`;
    case 'season925SavePct':
      if (seasonBests.svPct.max === 0 && seasonBests.svPct.year === 0) {
        return `never had a .925+ save percentage in a season (no goalie stats recorded)`;
      }
      return `never had a .925+ save percentage in a season (best ${seasonBests.svPct.max.toFixed(3)} in ${seasonBests.svPct.year})`;
    case 'wonMVP':
      return `never won MVP`;
    case 'wonDefensiveForward':
      return `never won Defensive Forward of the Year`;
    case 'wonGoalieOfYear':
      return `never won Goalie of the Year`;
    case 'wonROY':
      return `never won Rookie of the Year`;
    case 'wonPlayoffsMVP':
      return `never won Playoffs MVP`;
    case 'madeAllStar':
      return `was never selected to an All-Star Game`;
    case 'wonChampionship':
      return `never won a championship`;
    default:
      return `did not achieve ${achievementId}`;
  }
}

// Baseball-specific helper functions  
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
    return fallbacks[achievementId] || `achieved ${achievementId}`;
  }

  const careerStats = getBaseballCareerStats(player);
  const seasonBests = getBaseballSeasonBests(player);

  switch (achievementId) {
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
      return `achieved ${achievementId}`;
  }
}

function getBaseballNegativeMessage(achievementId: string, player?: Player): string {
  if (!player) {
    return "";
  }

  const careerStats = getBaseballCareerStats(player);
  const seasonBests = getBaseballSeasonBests(player);

  switch (achievementId) {
    case 'career3000Hits':
      return `did not reach 3,000+ career hits (career ${formatNumber(careerStats.h)})`;
    case 'career500HRs':
      return `did not hit 500+ career home runs (career ${formatNumber(careerStats.hr)})`;
    case 'career1500RBIs':
      return `did not reach 1,500+ career RBIs (career ${formatNumber(careerStats.rbi)})`;
    case 'career400SBs':
      return `did not reach 400+ career stolen bases (career ${formatNumber(careerStats.sb)})`;
    case 'career1800Runs':
      return `did not reach 1,800+ career runs (career ${formatNumber(careerStats.r)})`;
    case 'career300Wins':
      return `did not reach 300+ career wins (career ${formatNumber(careerStats.w)})`;
    case 'career3000Ks':
      return `did not reach 3,000+ career strikeouts (career ${formatNumber(careerStats.so)})`;
    case 'career300Saves':
      return `did not reach 300+ career saves (career ${formatNumber(careerStats.sv)})`;
    case 'season50HRs':
      return `never hit 50+ home runs in a season (best ${seasonBests.hr.max} in ${seasonBests.hr.year})`;
    case 'season130RBIs':
      return `never had 130+ RBIs in a season (best ${seasonBests.rbi.max} in ${seasonBests.rbi.year})`;
    case 'season200Hits':
      return `never had 200+ hits in a season (best ${seasonBests.h.max} in ${seasonBests.h.year})`;
    case 'season50SBs':
      return `never stole 50+ bases in a season (best ${seasonBests.sb.max} in ${seasonBests.sb.year})`;
    case 'season20Wins':
      return `never won 20+ games in a season (best ${seasonBests.w.max} in ${seasonBests.w.year})`;
    case 'season40Saves':
      return `never recorded 40+ saves in a season (best ${seasonBests.sv.max} in ${seasonBests.sv.year})`;
    case 'season300Ks':
      return `never recorded 300+ strikeouts in a season (best ${seasonBests.so.max} in ${seasonBests.so.year})`;
    case 'season200ERA':
      return `never had a sub-2.00 ERA season (best ${seasonBests.era.min.toFixed(2)} in ${seasonBests.era.year})`;
    case 'wonMVP':
      return `never won MVP`;
    case 'wonFinalsMVP':
      return `never won Finals MVP`;
    case 'wonROY':
      return `never won Rookie of the Year`;
    case 'madeAllStar':
      return `was never selected to an All-Star Game`;
    case 'wonChampionship':
      return `never won a championship`;
    default:
      return `did not achieve ${achievementId}`;
  }
}

function getFootballNegativeMessage(achievementId: string, player?: Player): string {
  if (!player) {
    // Use the static messages defined in the main function
    return "";
  }

  const careerStats = getFootballCareerStats(player);
  const seasonBests = getFootballSeasonBests(player);

  switch (achievementId) {
    case 'career300PassTDs':
      return `never threw 300+ career TDs (career ${formatNumber(careerStats.passTDs)})`;
    case 'season35PassTDs':
      return `never had 35+ pass TDs in a season (best ${seasonBests.passTDs.max} in ${seasonBests.passTDs.year})`;
    case 'career12kRushYds':
      return `did not reach 11,000+ rushing yards (career ${formatNumber(careerStats.rushYds)})`;
    case 'career100RushTDs':
      return `did not score 100+ rushing TDs (career ${formatNumber(careerStats.rushTDs)})`;
    case 'season1800RushYds':
      return `never had 1,600+ rushing yards in a season (best ${formatNumber(seasonBests.rushYds.max)} in ${seasonBests.rushYds.year})`;
    case 'season20RushTDs':
      return `never had 20+ rushing TDs in a season (best ${seasonBests.rushTDs.max} in ${seasonBests.rushTDs.year})`;
    case 'career12kRecYds':
      return `did not reach 12,000+ receiving yards (career ${formatNumber(careerStats.recYds)})`;
    case 'career100RecTDs':
      return `did not score 85+ receiving TDs (career ${formatNumber(careerStats.recTDs)})`;
    case 'season1400RecYds':
      return `never had 1,400+ receiving yards in a season (best ${formatNumber(seasonBests.recYds.max)} in ${seasonBests.recYds.year})`;
    case 'season15RecTDs':
      return `never had 15+ receiving TDs in a season (best ${seasonBests.recTDs.max} in ${seasonBests.recTDs.year})`;
    case 'career100Sacks':
      return `did not record 100+ career sacks (career ${formatNumber(careerStats.sacks)})`;
    case 'career20Ints':
      return `did not record 20+ career interceptions (career ${formatNumber(careerStats.ints)})`;
    case 'season15Sacks':
      return `never had 15+ sacks in a season (best ${seasonBests.sacks.max} in ${seasonBests.sacks.year})`;
    case 'season8Ints':
      return `never had 8+ interceptions in a season (best ${seasonBests.ints.max} in ${seasonBests.ints.year})`;
    default:
      return `did not achieve ${achievementId}`;
  }
}

export interface GridConstraint {
  type: 'team' | 'achievement';
  tid?: number;
  achievementId?: string;
  label: string;
}

export interface FeedbackResult {
  message: string;
  isValid: boolean;
}

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
  
  return `${team.region} ${team.name}`;
}

/**
 * Get team name with "the" prefix for natural grammar
 */
function getTeamNameWithThe(teams: Team[], tid: number, season?: number): string {
  const teamName = getTeamNameAtSeason(teams, tid, season);
  return `the ${teamName}`;
}

/**
 * Format a season range for display (e.g., "2020-2023" or "2020")
 */
function formatSeasonRange(seasons: number[]): string {
  if (seasons.length === 0) return '';
  if (seasons.length === 1) return seasons[0].toString();
  
  const first = seasons[0];
  const last = seasons[seasons.length - 1];
  return `${first}–${last}`;
}

/**
 * Get positive message for team constraint
 */
function getTeamPositiveMessage(player: Player, teams: Team[], tid: number, suppressYears: boolean = false): string {
  const seasons = getPlayerTeamSeasons(player, tid);
  const teamNameWithThe = getTeamNameWithThe(teams, tid, seasons[0]);
  
  // If suppressYears is true (feedback context), don't show year parentheses since Career Summary shows them
  if (!suppressYears && seasons.length <= 3) {
    const seasonRange = formatSeasonRange(seasons);
    return `did play for ${teamNameWithThe} (${seasonRange})`;
  }
  
  return `did play for ${teamNameWithThe}`;
}

/**
  * Get negative message for team constraint
  */
function getTeamNegativeMessage(teams: Team[], tid: number): string {
  const teamNameWithThe = getTeamNameWithThe(teams, tid);
  return `never played for ${teamNameWithThe}`;
}

/**
  * Get positive message for achievement constraint with detailed stats for football
  */
function getAchievementPositiveMessage(achievementId: string, player?: Player): string {
  const messages: Record<string, string> = {
    // Basketball achievements - detailed with stats
    career20kPoints: getBasketballPositiveMessage('career20kPoints', player),
    career10kRebounds: getBasketballPositiveMessage('career10kRebounds', player),
    career5kAssists: getBasketballPositiveMessage('career5kAssists', player),
    career2kSteals: getBasketballPositiveMessage('career2kSteals', player),
    career1500Blocks: getBasketballPositiveMessage('career1500Blocks', player),
    career2kThrees: getBasketballPositiveMessage('career2kThrees', player),
    oneTeamOnly: "spent his entire career with one franchise",
    
    // Basketball season achievements - detailed with stats
    season30ppg: getBasketballPositiveMessage('season30ppg', player),
    season10apg: getBasketballPositiveMessage('season10apg', player),
    season15rpg: getBasketballPositiveMessage('season15rpg', player),
    season3bpg: getBasketballPositiveMessage('season3bpg', player),
    season25spg: getBasketballPositiveMessage('season25spg', player),
    season504090: "had a 50/40/90 season",
    
    // Leadership
    ledScoringAny: "led the league in scoring",
    ledRebAny: "led the league in rebounds",
    ledAstAny: "led the league in assists",
    ledStlAny: "led the league in steals",
    ledBlkAny: "led the league in blocks",
    
    // Major awards
    hasMVP: "won MVP",
    hasDPOY: "won Defensive Player of the Year",
    hasROY: "won Rookie of the Year",
    hasSixthMan: "won Sixth Man of the Year",
    hasMIP: "won Most Improved Player",
    hasFMVP: "won Finals MVP",
    
    // Team honors
    hasAllLeague: "made an All-League Team",
    hasAllDef: "made an All-Defensive Team",
    hasAllStar: "made an All-Star team",
    hasChampion: "won a championship",
    
    // Draft
    isPick1Overall: "was the #1 overall pick",
    isFirstRoundPick: "was a first-round pick",
    isSecondRoundPick: "was a second-round pick",
    isUndrafted: "went undrafted",
    draftedTeen: "was drafted as a teenager (19 or younger)",
    bornOutsideUS50DC: getBornOutsidePositiveMessage(player),
    
    // Special
    allStar35Plus: "made an All-Star team at age 35+",
    isHallOfFamer: "is in the Hall of Fame",
    played10PlusSeasons: getSeasonsMessage('played10PlusSeasons', player!, true),
    played15PlusSeasons: getSeasonsMessage('played15PlusSeasons', player!, true),
    
    // Football achievements - detailed with stats
    career300PassTDs: getFootballPositiveMessage('career300PassTDs', player),
    season35PassTDs: getFootballPositiveMessage('season35PassTDs', player),
    career12kRushYds: getFootballPositiveMessage('career12kRushYds', player),
    career100RushTDs: getFootballPositiveMessage('career100RushTDs', player),
    season1800RushYds: getFootballPositiveMessage('season1800RushYds', player),
    season20RushTDs: getFootballPositiveMessage('season20RushTDs', player),
    career12kRecYds: getFootballPositiveMessage('career12kRecYds', player),
    career100RecTDs: getFootballPositiveMessage('career100RecTDs', player),
    season1400RecYds: getFootballPositiveMessage('season1400RecYds', player),
    season15RecTDs: getFootballPositiveMessage('season15RecTDs', player),
    career100Sacks: getFootballPositiveMessage('career100Sacks', player),
    career20Ints: getFootballPositiveMessage('career20Ints', player),
    season15Sacks: getFootballPositiveMessage('season15Sacks', player),
    season8Ints: getFootballPositiveMessage('season8Ints', player),
    wonMVP: getFootballPositiveMessage('wonMVP', player),
    wonOPOY: getFootballPositiveMessage('wonOPOY', player),
    wonDPOY: getFootballPositiveMessage('wonDPOY', player),
    wonROY: getFootballPositiveMessage('wonROY', player),
    
    // Hockey achievements - detailed with stats
    career500Goals: getHockeyPositiveMessage('career500Goals', player),
    career1000Points: getHockeyPositiveMessage('career1000Points', player),
    career500Assists: getHockeyPositiveMessage('career500Assists', player),
    career200Wins: getHockeyPositiveMessage('career200Wins', player),
    career50Shutouts: getHockeyPositiveMessage('career50Shutouts', player),
    season50Goals: getHockeyPositiveMessage('season50Goals', player),
    season100Points: getHockeyPositiveMessage('season100Points', player),
    season60Assists: getHockeyPositiveMessage('season60Assists', player),
    season35Wins: getHockeyPositiveMessage('season35Wins', player),
    season10Shutouts: getHockeyPositiveMessage('season10Shutouts', player),
    season925SavePct: getHockeyPositiveMessage('season925SavePct', player),
    
    // Baseball achievements - detailed with stats
    career3000Hits: getBaseballPositiveMessage('career3000Hits', player),
    career500HRs: getBaseballPositiveMessage('career500HRs', player),
    career1500RBIs: getBaseballPositiveMessage('career1500RBIs', player),
    career400SBs: getBaseballPositiveMessage('career400SBs', player),
    career1800Runs: getBaseballPositiveMessage('career1800Runs', player),
    career300Wins: getBaseballPositiveMessage('career300Wins', player),
    career3000Ks: getBaseballPositiveMessage('career3000Ks', player),
    career300Saves: getBaseballPositiveMessage('career300Saves', player),
    season50HRs: getBaseballPositiveMessage('season50HRs', player),
    season130RBIs: getBaseballPositiveMessage('season130RBIs', player),
    season200Hits: getBaseballPositiveMessage('season200Hits', player),
    season50SBs: getBaseballPositiveMessage('season50SBs', player),
    season20Wins: getBaseballPositiveMessage('season20Wins', player),
    season40Saves: getBaseballPositiveMessage('season40Saves', player),
    season300Ks: getBaseballPositiveMessage('season300Ks', player),
    season200ERA: getBaseballPositiveMessage('season200ERA', player)
  };
  
  return messages[achievementId] || `achieved ${achievementId}`;
}

/**
  * Get negative message for achievement constraint
  */
function getAchievementNegativeMessage(achievementId: string, player?: Player): string {
  const messages: Record<string, string> = {
    // Basketball achievements - detailed with stats
    career20kPoints: getBasketballNegativeMessage('career20kPoints', player) || "did not reach 20,000 career points",
    career10kRebounds: getBasketballNegativeMessage('career10kRebounds', player) || "did not reach 10,000 career rebounds",
    career5kAssists: getBasketballNegativeMessage('career5kAssists', player) || "did not reach 5,000 career assists",
    career2kSteals: getBasketballNegativeMessage('career2kSteals', player) || "did not reach 2,000 career steals",
    career1500Blocks: getBasketballNegativeMessage('career1500Blocks', player) || "did not reach 1,500 career blocks",
    career2kThrees: getBasketballNegativeMessage('career2kThrees', player) || "did not reach 2,000 made threes",
    oneTeamOnly: "did not spend his entire career with one franchise",
    
    // Basketball season achievements - detailed with stats
    season30ppg: getBasketballNegativeMessage('season30ppg', player) || "never averaged 30+ PPG in a season",
    season10apg: getBasketballNegativeMessage('season10apg', player) || "never averaged 10+ APG in a season",
    season15rpg: getBasketballNegativeMessage('season15rpg', player) || "never averaged 15+ RPG in a season",
    season3bpg: getBasketballNegativeMessage('season3bpg', player) || "never averaged 3+ BPG in a season",
    season25spg: getBasketballNegativeMessage('season25spg', player) || "never averaged 2.5+ SPG in a season",
    season504090: "never recorded a 50/40/90 season",
    
    // Leadership
    ledScoringAny: "never led the league in scoring",
    ledRebAny: "never led the league in rebounds",
    ledAstAny: "never led the league in assists",
    ledStlAny: "never led the league in steals",
    ledBlkAny: "never led the league in blocks",
    
    // Major awards
    hasMVP: "never won MVP",
    hasDPOY: "never won Defensive Player of the Year",
    hasROY: "never won Rookie of the Year",
    hasSixthMan: "never won Sixth Man of the Year",
    hasMIP: "never won Most Improved Player",
    hasFMVP: "never won Finals MVP",
    
    // Team honors
    hasAllLeague: "never made an All-League Team",
    hasAllDef: "never made an All-Defensive Team",
    hasAllStar: "never made an All-Star team",
    hasChampion: "never won a championship",
    
    // Draft (will be handled specially)
    isPick1Overall: "",
    isFirstRoundPick: "",
    isSecondRoundPick: "",
    isUndrafted: "",
    draftedTeen: "",
    bornOutsideUS50DC: "",
    
    // Special
    allStar35Plus: "never made an All-Star team at age 35+",
    isHallOfFamer: "is not in the Hall of Fame",
    played10PlusSeasons: player ? getSeasonsMessage('played10PlusSeasons', player, false) : "did not play 10+ seasons",
    played15PlusSeasons: player ? getSeasonsMessage('played15PlusSeasons', player, false) : "did not play 15+ seasons",
    
    // Football - Passing
    career300PassTDs: getFootballNegativeMessage('career300PassTDs', player) || "never threw 300+ career TDs",
    season35PassTDs: getFootballNegativeMessage('season35PassTDs', player) || "never had 35+ pass TDs in a season",
    
    // Football - Rushing
    career12kRushYds: getFootballNegativeMessage('career12kRushYds', player) || "did not reach 11,000+ rushing yards",
    career100RushTDs: getFootballNegativeMessage('career100RushTDs', player) || "did not score 100+ rushing TDs",
    season1800RushYds: getFootballNegativeMessage('season1800RushYds', player) || "never had 1,600+ rushing yards in a season",
    season20RushTDs: getFootballNegativeMessage('season20RushTDs', player) || "never had 20+ rushing TDs in a season",
    
    // Football - Receiving
    career12kRecYds: getFootballNegativeMessage('career12kRecYds', player) || "did not reach 12,000+ receiving yards",
    career100RecTDs: getFootballNegativeMessage('career100RecTDs', player) || "did not score 85+ receiving TDs",
    season1400RecYds: getFootballNegativeMessage('season1400RecYds', player) || "never had 1,400+ receiving yards in a season",
    season15RecTDs: getFootballNegativeMessage('season15RecTDs', player) || "never had 15+ receiving TDs in a season",
    
    // Football - Defense
    career100Sacks: getFootballNegativeMessage('career100Sacks', player) || "did not record 100+ career sacks",
    career20Ints: getFootballNegativeMessage('career20Ints', player) || "did not record 20+ career interceptions",
    season15Sacks: getFootballNegativeMessage('season15Sacks', player) || "never had 15+ sacks in a season",
    season8Ints: getFootballNegativeMessage('season8Ints', player) || "never had 8+ interceptions in a season",
    
    // Football - Awards  
    wonMVP: "never won MVP",
    wonOPOY: "never won Offensive Player of the Year",
    wonDPOY: "never won Defensive Player of the Year",
    wonROY: "never won Rookie of the Year",
    
    // Hockey achievements - detailed with stats
    career500Goals: getHockeyNegativeMessage('career500Goals', player) || "did not reach 500 career goals",
    career1000Points: getHockeyNegativeMessage('career1000Points', player) || "did not reach 1,000 career points",
    career500Assists: getHockeyNegativeMessage('career500Assists', player) || "did not reach 500 career assists",
    career200Wins: getHockeyNegativeMessage('career200Wins', player) || "did not reach 200 career wins",
    career50Shutouts: getHockeyNegativeMessage('career50Shutouts', player) || "did not reach 50 career shutouts",
    season50Goals: getHockeyNegativeMessage('season50Goals', player) || "never scored 50+ goals in a season",
    season100Points: getHockeyNegativeMessage('season100Points', player) || "never recorded 100+ points in a season",
    season60Assists: getHockeyNegativeMessage('season60Assists', player) || "never recorded 60+ assists in a season",
    season35Wins: getHockeyNegativeMessage('season35Wins', player) || "never recorded 35+ wins in a season",
    season10Shutouts: getHockeyNegativeMessage('season10Shutouts', player) || "never recorded 10+ shutouts in a season",
    season925SavePct: getHockeyNegativeMessage('season925SavePct', player) || "never had .925+ save % in a season",
    
    // Baseball achievements - detailed with stats
    career3000Hits: getBaseballNegativeMessage('career3000Hits', player) || "did not reach 3,000 career hits",
    career500HRs: getBaseballNegativeMessage('career500HRs', player) || "did not reach 500 career home runs",
    career1500RBIs: getBaseballNegativeMessage('career1500RBIs', player) || "did not reach 1,500 career RBIs",
    career400SBs: getBaseballNegativeMessage('career400SBs', player) || "did not reach 400 career stolen bases",
    career1800Runs: getBaseballNegativeMessage('career1800Runs', player) || "did not reach 1,800 career runs",
    career300Wins: getBaseballNegativeMessage('career300Wins', player) || "did not reach 300 career wins",
    career3000Ks: getBaseballNegativeMessage('career3000Ks', player) || "did not reach 3,000 career strikeouts",
    career300Saves: getBaseballNegativeMessage('career300Saves', player) || "did not reach 300 career saves",
    season50HRs: getBaseballNegativeMessage('season50HRs', player) || "never hit 50+ home runs in a season",
    season130RBIs: getBaseballNegativeMessage('season130RBIs', player) || "never had 130+ RBIs in a season",
    season200Hits: getBaseballNegativeMessage('season200Hits', player) || "never had 200+ hits in a season",
    season50SBs: getBaseballNegativeMessage('season50SBs', player) || "never stole 50+ bases in a season",
    season20Wins: getBaseballNegativeMessage('season20Wins', player) || "never recorded 20+ wins in a season",
    season40Saves: getBaseballNegativeMessage('season40Saves', player) || "never recorded 40+ saves in a season",
    season300Ks: getBaseballNegativeMessage('season300Ks', player) || "never recorded 300+ strikeouts in a season",
    season200ERA: getBaseballNegativeMessage('season200ERA', player) || "never had 2.00 ERA in a season"
  };
  
  // Handle draft achievements specially
  if (['isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen', 'bornOutsideUS50DC'].includes(achievementId) && player) {
    return getDraftNegativeMessage(player, achievementId);
  }
  
  return messages[achievementId] || `did not achieve ${achievementId}`;
}


/**
  * Generate feedback message for a wrong guess
  */
export function generateFeedbackMessage(
  player: Player,
  rowConstraint: GridConstraint,
  colConstraint: GridConstraint,
  teams: Team[]
): string {
  const playerName = player.name;
  
  // Special handling for season achievement combinations
  const rowIsSeasonAch = rowConstraint.type === 'achievement' && isSeasonAchievement(rowConstraint.achievementId!);
  const colIsSeasonAch = colConstraint.type === 'achievement' && isSeasonAchievement(colConstraint.achievementId!);
  
  // Case 1: Team × Season Achievement
  if (rowConstraint.type === 'team' && colIsSeasonAch) {
    return generateTeamSeasonAchievementMessage(player, teams, rowConstraint.tid!, colConstraint.achievementId! as SeasonAchievementId);
  }
  
  if (colConstraint.type === 'team' && rowIsSeasonAch) {
    return generateTeamSeasonAchievementMessage(player, teams, colConstraint.tid!, rowConstraint.achievementId! as SeasonAchievementId);
  }
  
  // Case 2: Season Achievement × Season Achievement
  if (rowIsSeasonAch && colIsSeasonAch) {
    return generateSeasonSeasonAchievementMessage(player, rowConstraint.achievementId! as SeasonAchievementId, colConstraint.achievementId! as SeasonAchievementId);
  }
  
  // Fall back to original logic for other constraint combinations
  // Get detailed evaluation for both constraints using actual achievement results
  const rowDetails = getConstraintDetails(player, rowConstraint);
  const colDetails = getConstraintDetails(player, colConstraint);
  
  // Fix team messages with proper team names
  if (rowConstraint.type === 'team') {
    if (rowDetails.passed) {
      rowDetails.passText = getTeamPositiveMessage(player, teams, rowConstraint.tid!, true);
    } else {
      rowDetails.failText = getTeamNegativeMessage(teams, rowConstraint.tid!);
    }
  }
  
  if (colConstraint.type === 'team') {
    if (colDetails.passed) {
      colDetails.passText = getTeamPositiveMessage(player, teams, colConstraint.tid!, true);
    } else {
      colDetails.failText = getTeamNegativeMessage(teams, colConstraint.tid!);
    }
  }
  
  // Fix season achievement messages
  if (rowConstraint.type === 'achievement' && isSeasonAchievement(rowConstraint.achievementId!) && !rowDetails.passed) {
    const achData = SEASON_ACHIEVEMENT_LABELS[rowConstraint.achievementId! as SeasonAchievementId];
    rowDetails.failText = `never ${achData.verbGeneric}`;
  }
  
  if (colConstraint.type === 'achievement' && isSeasonAchievement(colConstraint.achievementId!) && !colDetails.passed) {
    const achData = SEASON_ACHIEVEMENT_LABELS[colConstraint.achievementId! as SeasonAchievementId];
    colDetails.failText = `never ${achData.verbGeneric}`;
  }
  
  // Apply strict 4-case logic based on actual pass/fail booleans
  
  // Case 1: Both fail (!row.ok && !col.ok)
  if (!rowDetails.passed && !colDetails.passed) {
    if (rowConstraint.type === 'team' && colConstraint.type === 'team') {
      // Team + Team (both fail) - use "neither...nor"
      const rowTeamName = getTeamNameWithThe(teams, rowConstraint.tid!);
      const colTeamName = getTeamNameWithThe(teams, colConstraint.tid!);
      return `${playerName} played for neither ${rowTeamName} nor ${colTeamName}.`;
    } else {
      // Any other combination - use "and"
      return `${playerName} ${rowDetails.failText}, and ${colDetails.failText}.`;
    }
  }
  
  // Case 2: Only row fails (!row.ok && col.ok)
  if (!rowDetails.passed && colDetails.passed) {
    return `${playerName} ${colDetails.passText}, but ${rowDetails.failText}.`;
  }
  
  // Case 3: Only column fails (row.ok && !col.ok)
  if (rowDetails.passed && !colDetails.passed) {
    return `${playerName} ${rowDetails.passText}, but ${colDetails.failText}.`;
  }
  
  // Case 4: Both pass (shouldn't happen for wrong guesses, but handle gracefully)
  // This might indicate a same-season alignment issue
  return `${playerName} ${rowDetails.passText} and ${colDetails.passText}, but there may be a season alignment issue.`;
}

/**
  * Check if a player satisfies a team × achievement constraint with same-season alignment
  */
function evaluateTeamAchievementWithAlignment(player: Player, teamTid: number, achievementId: string): boolean {
  // Check if this achievement requires same-season alignment
  if (!SEASON_ALIGNED_ACHIEVEMENTS.has(achievementId)) {
    // Career-based achievements: just check if player ever played for team AND has the achievement
    return playerPlayedForTeam(player, teamTid) && playerMeetsAchievement(player, achievementId, undefined);
  }

  // For new statistical leader achievements, we need to use the season index approach
  // These achievements are not stored in player.achievementSeasons but in the global season index
  const statisticalLeaders = ['PointsLeader', 'ReboundsLeader', 'AssistsLeader', 'StealsLeader', 'BlocksLeader'];
  if (statisticalLeaders.includes(achievementId)) {
    // This will be handled by the grid generator's season index logic
    // For now, return false here since the grid generator handles this case differently
    return false;
  }

  // Season-aligned achievements: need intersection of team seasons and achievement seasons
  if (!player.teamSeasonsPaired || !player.achievementSeasons) {
    return false;
  }

  // Get seasons when player achieved this specific achievement
  let achievementSeasons: Set<number>;
  
  // Map achievement IDs to their season data (handle existing vs new naming)
  switch (achievementId) {
    case 'season30ppg': achievementSeasons = player.achievementSeasons.season30ppg; break;
    case 'season10apg': achievementSeasons = player.achievementSeasons.season10apg; break;
    case 'season15rpg': achievementSeasons = player.achievementSeasons.season15rpg; break;
    case 'season3bpg': achievementSeasons = player.achievementSeasons.season3bpg; break;
    case 'season25spg': achievementSeasons = player.achievementSeasons.season25spg; break;
    case 'season504090': achievementSeasons = player.achievementSeasons.season504090; break;
    case 'ledScoringAny': achievementSeasons = player.achievementSeasons.ledScoringAny; break;
    case 'ledRebAny': achievementSeasons = player.achievementSeasons.ledRebAny; break;
    case 'ledAstAny': achievementSeasons = player.achievementSeasons.ledAstAny; break;
    case 'ledStlAny': achievementSeasons = player.achievementSeasons.ledStlAny; break;
    case 'ledBlkAny': achievementSeasons = player.achievementSeasons.ledBlkAny; break;
    case 'hasMVP': achievementSeasons = player.achievementSeasons.mvpWinner; break;
    case 'hasDPOY': achievementSeasons = player.achievementSeasons.dpoyWinner; break;
    case 'hasROY': achievementSeasons = player.achievementSeasons.royWinner; break;
    case 'hasSixthMan': achievementSeasons = player.achievementSeasons.smoyWinner; break;
    case 'hasMIP': achievementSeasons = player.achievementSeasons.mipWinner; break;
    case 'hasFMVP': achievementSeasons = player.achievementSeasons.fmvpWinner; break;
    case 'AllLeagueAny': 
    case 'hasAllLeague': achievementSeasons = player.achievementSeasons.allLeagueTeam; break;
    case 'AllDefAny':
    case 'hasAllDef': achievementSeasons = player.achievementSeasons.allDefensiveTeam; break;
    case 'AllStar':
    case 'hasAllStar': achievementSeasons = player.achievementSeasons.allStarSelection; break;
    case 'MVP': achievementSeasons = player.achievementSeasons.mvpWinner; break;
    case 'DPOY': achievementSeasons = player.achievementSeasons.dpoyWinner; break;
    case 'ROY': achievementSeasons = player.achievementSeasons.royWinner; break;
    case 'SMOY': achievementSeasons = player.achievementSeasons.smoyWinner; break;
    case 'MIP': achievementSeasons = player.achievementSeasons.mipWinner; break;
    case 'FinalsMVP': achievementSeasons = player.achievementSeasons.fmvpWinner; break;
    case 'hasChampion': achievementSeasons = player.achievementSeasons.champion; break;
    case 'allStar35Plus': achievementSeasons = player.achievementSeasons.allStar35Plus; break;
    // Football achievements that should use career-based check
    case 'wonMVP':
    case 'wonOPOY': 
    case 'wonDPOY':
    case 'wonROY':
    case 'season35PassTDs':
    case 'season1400RecYds':
    case 'season15RecTDs':
    case 'season15Sacks':
    case 'season8Ints':
    case 'season1800RushYds':
    case 'season20RushTDs':
    default:
      // Fallback to career-based check for unrecognized achievements
      return playerPlayedForTeam(player, teamTid) && playerMeetsAchievement(player, achievementId, undefined);
  }

  // Check if there's any season where player both played for the team AND achieved the accomplishment
  for (const season of Array.from(achievementSeasons)) {
    const teamSeasonKey = `${season}|${teamTid}`;
    if (player.teamSeasonsPaired.has(teamSeasonKey)) {
      return true;
    }
  }

  return false;
}

/**
  * Evaluate if a player meets a specific constraint (with enhanced same-season alignment)
  */
function evaluateConstraint(player: Player, constraint: GridConstraint): boolean {
  if (constraint.type === 'team') {
    return playerPlayedForTeam(player, constraint.tid!);
  } else if (constraint.type === 'achievement') {
    return playerMeetsAchievement(player, constraint.achievementId!, undefined);
  }
  return false;
}


// Create detailed constraint evaluation that knows WHY something passed or failed
function getConstraintDetails(player: Player, constraint: GridConstraint) {
  if (constraint.type === 'team') {
    const passed = playerPlayedForTeam(player, constraint.tid!);
    return {
      passed,
      passText: passed ? `did play for team ${constraint.tid}` : '', // Will be filled properly later
      failText: passed ? '' : `never played for team ${constraint.tid}` // Will be filled properly later
    };
  } else if (constraint.type === 'achievement') {
    const passed = playerMeetsAchievement(player, constraint.achievementId!);
    return {
      passed,
      passText: passed ? getAchievementPositiveMessage(constraint.achievementId!, player) : '',
      failText: passed ? '' : getAchievementNegativeMessage(constraint.achievementId!, player)
    };
  }
  return { passed: false, passText: '', failText: 'Unknown constraint' };
}

/**
  * Evaluate if a player meets both constraints with proper Team × Achievement alignment
  */
export function evaluateConstraintPair(player: Player, rowConstraint: GridConstraint, colConstraint: GridConstraint): boolean {
  // If both constraints are teams, check both separately
  if (rowConstraint.type === 'team' && colConstraint.type === 'team') {
    return evaluateConstraint(player, rowConstraint) && evaluateConstraint(player, colConstraint);
  }
  
  // If both are achievements, check both separately  
  if (rowConstraint.type === 'achievement' && colConstraint.type === 'achievement') {
    return evaluateConstraint(player, rowConstraint) && evaluateConstraint(player, colConstraint);
  }
  
  // Team × Achievement case: use same-season alignment
  if (rowConstraint.type === 'team' && colConstraint.type === 'achievement') {
    return evaluateTeamAchievementWithAlignment(player, rowConstraint.tid!, colConstraint.achievementId!);
  }
  
  if (rowConstraint.type === 'achievement' && colConstraint.type === 'team') {
    return evaluateTeamAchievementWithAlignment(player, colConstraint.tid!, rowConstraint.achievementId!);
  }
  
  return false;
}

/**
  * Format birthplace for players born outside the 50 U.S. states or D.C.
  */
function formatBirthPlaceForOutside(born: any): string {
  if (!born || !born.loc) {
    return '';
  }

  const fullLocation = born.loc.trim();
  
  // If born outside USA entirely
  if (born.country && born.country !== "USA") {
    // Use available parts: city, region/state (if present), country
    const parts = [];
    if (born.city) parts.push(born.city);
    if (born.region || born.state) parts.push(born.region || born.state);
    if (born.country) parts.push(born.country);
    return parts.join(', ') || fullLocation;
  }
  
  // If born in USA but not in the 50 states or DC (territories)
  if (born.country === "USA") {
    // Extract location without ", USA" suffix for territories
    if (fullLocation.endsWith(', USA')) {
      return fullLocation.slice(0, -5).trim(); // Remove ", USA"
    }
    return fullLocation;
  }
  
  // Fallback to the full location string
  return fullLocation;
}

/**
  * Get positive message for bornOutsideUS50DC with birthplace in parentheses
  */
function getBornOutsidePositiveMessage(player?: Player): string {
  if (!player || !player.born) {
    return "was born outside the 50 U.S. states or D.C.";
  }
  
  const birthplaceFormatted = formatBirthPlaceForOutside(player.born);
  
  if (birthplaceFormatted) {
    return `was born outside the 50 U.S. states or D.C. (born in ${birthplaceFormatted})`;
  }
  
  // Fallback if no birthplace info
  return "was born outside the 50 U.S. states or D.C.";
}

/**
  * Count the number of seasons a player played (excludes playoffs)
  */
function countPlayerSeasons(player: Player): number {
  if (!player.stats) return 0;
  
  // Count distinct regular season years with games played (matches achievement logic)
  const seasonsPlayed = new Set<number>();
  player.stats.forEach((s: any) => {
    if (!s.playoffs && (s.gp || 0) > 0) {
      seasonsPlayed.add(s.season);
    }
  });
  return seasonsPlayed.size;
}

/**
  * Format season count with proper singular/plural
  */
function formatSeasonCount(count: number): string {
  return count === 1 ? "1 season" : `${count} seasons`;
}

/**
  * Get messages for seasons-played achievements
  */
function getSeasonsMessage(achievementId: string, player: Player, isPositive: boolean): string {
  const seasonCount = countPlayerSeasons(player);
  const formattedCount = formatSeasonCount(seasonCount);
  
  if (achievementId === 'played10PlusSeasons') {
    if (isPositive) {
      return `played ${formattedCount}`;
    } else {
      return `did not play 10+ seasons (played ${seasonCount})`;
    }
  }
  
  if (achievementId === 'played15PlusSeasons') {
    if (isPositive) {
      return `played ${formattedCount}`;
    } else {
      return `did not play 15+ seasons (played ${seasonCount})`;
    }
  }
  
  return isPositive ? `played ${formattedCount}` : `did not meet season requirement`;
}

/**
  * Get draft-specific negative message based on player's actual draft status
  */
function getOrdinalNumber(num: number): string {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${num}th`;
  }
  
  switch (lastDigit) {
    case 1: return `${num}st`;
    case 2: return `${num}nd`;
    case 3: return `${num}rd`;
    default: return `${num}th`;
  }
}

function getDraftNegativeMessage(player: Player, achievementId: string): string {
  // Handle new non-draft-specific achievements
  if (achievementId === 'draftedTeen') {
    if (!player.born?.year || !player.draft?.year) {
      return "draft age information unavailable";
    }
    const ageAtDraft = player.draft.year - player.born.year;
    return `was ${ageAtDraft} years old when drafted (not a teenager)`;
  }
  
  if (achievementId === 'bornOutsideUS50DC') {
    if (!player.born?.loc) {
      return "birthplace information unavailable";
    }
    
    const birthplace = player.born.loc.trim();
    // For wrong guesses on "Born outside 50 states + DC", show their actual birth location
    return `was born in the US (${birthplace})`;
  }
  
  if (!player.draft) {
    // Player went undrafted
    switch (achievementId) {
      case 'isPick1Overall':
      case 'isFirstRoundPick':
      case 'isSecondRoundPick':
        return "went undrafted";
      case 'isUndrafted':
        return "was drafted"; // This shouldn't happen but just in case
      default:
        return "went undrafted";
    }
  }
  
  const { round, pick } = player.draft;
  
  // Handle missing draft data gracefully
  if (!round || !pick) {
    return "was drafted (pick/round information unavailable)";
  }
  
  const roundOrdinal = round === 1 ? "1st" : round === 2 ? "2nd" : round === 3 ? "3rd" : `${round}th`;
  
  // All draft messages use consistent format: "was drafted with the [X] pick in the [Y] round"
  const draftMessage = `was drafted with the ${getOrdinalNumber(pick)} pick in the ${roundOrdinal} round`;
  
  // Return the same consistent format for all draft-related feedback
  return draftMessage;
}

/**
 * Generate feedback message for Team × Season Achievement incorrect guesses
 */
function generateTeamSeasonAchievementMessage(
  player: Player,
  teams: Team[],
  teamTid: number,
  achievementId: SeasonAchievementId
): string {
  const teamName = teams.find(t => t.tid === teamTid);
  const teamStr = teamName ? `${teamName.region} ${teamName.name}` : `Team ${teamTid}`;
  const achData = SEASON_ACHIEVEMENT_LABELS[achievementId];
  const playerData = getPlayerSeasonAchievementData(player, achievementId, teamTid);
  
  const countStr = playerData.count === 0 ? '0x' : 
    `${playerData.count}x — ${formatSeasonList(playerData.seasonsWithTeam, achievementId === 'FinalsMVP')}`;
  
  // Check if player actually played for this team
  const playedForTeam = playerPlayedForTeam(player, teamTid);
  
  if (!playedForTeam) {
    // Player never played for the team at all
    if (isRookieAchievement(achievementId)) {
      const negativeVerb = achData.verbGeneric.replace('made the', 'didn\'t make the').replace('won', 'didn\'t win');
      return `${player.name} never played for the ${teamStr} and ${negativeVerb}.`;
    }
    return `${player.name} never played for the ${teamStr}. (${achData.short}: ${countStr})`;
  }
  
  // Player did play for team but didn't achieve the award with them
  if (isRookieAchievement(achievementId)) {
    return `${player.name} did play for the ${teamStr}, but ${achData.verbGeneric.replace('made', 'didn\'t make').replace('won', 'didn\'t win')}.`;
  }
  return `${player.name} did play for the ${teamStr}, but never ${achData.verbTeam} with the ${teamStr}. (${achData.short}: ${countStr})`;
}

/**
 * Generate feedback message for Season Achievement × Season Achievement incorrect guesses
 */
function generateSeasonSeasonAchievementMessage(
  player: Player,
  achievementA: SeasonAchievementId,
  achievementB: SeasonAchievementId
): string {
  const achDataA = SEASON_ACHIEVEMENT_LABELS[achievementA];
  const achDataB = SEASON_ACHIEVEMENT_LABELS[achievementB];
  const playerDataA = getPlayerSeasonAchievementData(player, achievementA);
  const playerDataB = getPlayerSeasonAchievementData(player, achievementB);
  
  // Case: Player has both awards but never in the same season
  if (playerDataA.count > 0 && playerDataB.count > 0) {
    const seasonsA = formatSeasonList(playerDataA.seasonsWithTeam, achievementA === 'FinalsMVP');
    const seasonsB = formatSeasonList(playerDataB.seasonsWithTeam, achievementB === 'FinalsMVP');
    
    return `${player.name} did earn ${achDataA.label} and ${achDataB.label}, but never in the same season. (${achDataA.short}: ${playerDataA.count}x — ${seasonsA}; ${achDataB.short}: ${playerDataB.count}x — ${seasonsB})`;
  }
  
  // Case: Player is missing one side entirely
  if (playerDataA.count > 0 && playerDataB.count === 0) {
    const seasonsA = formatSeasonList(playerDataA.seasonsWithTeam, achievementA === 'FinalsMVP');
    const verbB = isRookieAchievement(achievementB) 
      ? achDataB.verbGeneric.replace('made the', 'didn\'t make the').replace('won', 'didn\'t win')
      : achDataB.verbGeneric.replace('made', 'did not make').replace('won', 'did not win');
    
    if (isRookieAchievement(achievementA) && isRookieAchievement(achievementB)) {
      return `${player.name} did earn ${achDataA.label}, but ${verbB}.`;
    } else if (isRookieAchievement(achievementB)) {
      return `${player.name} did earn ${achDataA.label}, but ${verbB}. (${achDataA.short}: ${playerDataA.count}x — ${seasonsA})`;
    } else if (isRookieAchievement(achievementA)) {
      return `${player.name} did earn ${achDataA.label}, but never ${achDataB.verbGeneric}. (${achDataB.short}: 0x)`;
    }
    return `${player.name} did earn ${achDataA.label}, but never ${achDataB.verbGeneric}. (${achDataA.short}: ${playerDataA.count}x — ${seasonsA}; ${achDataB.short}: 0x)`;
  }
  
  if (playerDataB.count > 0 && playerDataA.count === 0) {
    const seasonsB = formatSeasonList(playerDataB.seasonsWithTeam, achievementB === 'FinalsMVP');
    const verbA = isRookieAchievement(achievementA) 
      ? achDataA.verbGeneric.replace('made the', 'didn\'t make the').replace('won', 'didn\'t win')
      : achDataA.verbGeneric.replace('made', 'did not make').replace('won', 'did not win');
    
    if (isRookieAchievement(achievementA) && isRookieAchievement(achievementB)) {
      return `${player.name} did earn ${achDataB.label}, but ${verbA}.`;
    } else if (isRookieAchievement(achievementA)) {
      return `${player.name} did earn ${achDataB.label}, but ${verbA}. (${achDataB.short}: ${playerDataB.count}x — ${seasonsB})`;
    } else if (isRookieAchievement(achievementB)) {
      return `${player.name} did earn ${achDataB.label}, but never ${achDataA.verbGeneric}. (${achDataA.short}: 0x)`;
    }
    return `${player.name} did earn ${achDataB.label}, but never ${achDataA.verbGeneric}. (${achDataB.short}: ${playerDataB.count}x — ${seasonsB}; ${achDataA.short}: 0x)`;
  }
  
  // Case: Player has neither achievement
  // For rookie achievements, we need proper grammar with "he"
  let verbA, verbB;
  if (isRookieAchievement(achievementA)) {
    verbA = achDataA.verbGeneric.replace('made the', 'didn\'t make the').replace('won', 'didn\'t win');
  } else {
    verbA = `never ${achDataA.verbGeneric}`;
  }
  
  if (isRookieAchievement(achievementB)) {
    verbB = achDataB.verbGeneric.replace('made the', 'didn\'t make the').replace('won', 'didn\'t win');
  } else {
    verbB = `never ${achDataB.verbGeneric}`;
  }
  
  if (isRookieAchievement(achievementA) && isRookieAchievement(achievementB)) {
    return `${player.name} ${verbA} and ${verbB}.`;
  } else if (isRookieAchievement(achievementA)) {
    return `${player.name} ${verbA} and ${verbB}. (${achDataB.short}: 0x)`;
  } else if (isRookieAchievement(achievementB)) {
    return `${player.name} ${verbA} and ${verbB}. (${achDataA.short}: 0x)`;
  }
  return `${player.name} ${verbA} and ${verbB}. (${achDataA.short}: 0x; ${achDataB.short}: 0x)`;
}

/**
 * Check if an achievement is a rookie achievement (should not show count in parentheses)
 */
function isRookieAchievement(achievementId: SeasonAchievementId): boolean {
  const rookieAchievements = [
    'ROY', 'AllRookieAny', 
    'FBOffROY', 'FBDefROY', 'FBAllRookie',
    'HKROY', 'HKAllRookie',
    'BBROY', 'BBAllRookie'
  ];
  return rookieAchievements.includes(achievementId);
}