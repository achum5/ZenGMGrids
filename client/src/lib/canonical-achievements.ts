/**
 * Canonical Achievement Mapping System
 * 
 * This provides a single source of truth for achievement IDs and their synonyms
 * across parsing, validation, grid generation, and display.
 */

export interface CanonicalAchievement {
  id: string;
  displayLabel: string;
  synonyms: string[];
  sport: string[];
  category: 'award' | 'leader' | 'career' | 'draft' | 'misc';
}

export const CANONICAL_ACHIEVEMENTS: CanonicalAchievement[] = [
  // Basketball Statistical Leaders
  {
    id: 'PTS_LEADER',
    displayLabel: 'League Points Leader',
    synonyms: ['League Points Leader', 'League Scoring Leader', 'Scoring Leader', 'Points Leader', 'Scoring Champ', 'PTS Leader', 'league points leader', 'league scoring leader', 'scoring leader', 'points leader', 'PointsLeader'],
    sport: ['basketball'],
    category: 'leader'
  },
  {
    id: 'REB_LEADER', 
    displayLabel: 'League Rebounds Leader',
    synonyms: ['League Rebounds Leader', 'League Rebounding Leader', 'Rebounds Leader', 'Rebounding Leader', 'REB Leader', 'league rebounds leader', 'league rebounding leader', 'rebounds leader', 'rebounding leader', 'ReboundsLeader'],
    sport: ['basketball'],
    category: 'leader'
  },
  {
    id: 'AST_LEADER',
    displayLabel: 'League Assists Leader', 
    synonyms: ['League Assists Leader', 'Assists Leader', 'Assist Leader', 'AST Leader', 'league assists leader', 'assists leader', 'assist leader', 'AssistsLeader'],
    sport: ['basketball'],
    category: 'leader'
  },
  {
    id: 'STL_LEADER',
    displayLabel: 'League Steals Leader',
    synonyms: ['League Steals Leader', 'Steals Leader', 'STL Leader', 'league steals leader', 'steals leader', 'StealsLeader'],
    sport: ['basketball'],
    category: 'leader'
  },
  {
    id: 'BLK_LEADER',
    displayLabel: 'League Blocks Leader',
    synonyms: ['League Blocks Leader', 'Blocks Leader', 'BLK Leader', 'league blocks leader', 'blocks leader', 'BlocksLeader'],
    sport: ['basketball'],
    category: 'leader'
  },

  // Basketball Awards
  {
    id: 'ALL_STAR',
    displayLabel: 'All-Star',
    synonyms: ['All-Star', 'all-star', 'allstar'],
    sport: ['basketball'],
    category: 'award'
  },
  {
    id: 'MVP',
    displayLabel: 'Most Valuable Player',
    synonyms: ['MVP', 'Most Valuable Player', 'most valuable player'],
    sport: ['basketball'],
    category: 'award'
  },
  {
    id: 'DPOY',
    displayLabel: 'Defensive Player of the Year',
    synonyms: ['DPOY', 'Defensive Player of the Year', 'defensive player of the year'],
    sport: ['basketball'],
    category: 'award'
  },
  {
    id: 'ROY',
    displayLabel: 'Rookie of the Year',
    synonyms: ['ROY', 'Rookie of the Year', 'rookie of the year'],
    sport: ['basketball'],
    category: 'award'
  },
  {
    id: 'SMOY',
    displayLabel: 'Sixth Man of the Year',
    synonyms: ['SMOY', 'Sixth Man of the Year', 'sixth man of the year', '6MOY', '6th man'],
    sport: ['basketball'],
    category: 'award'
  },
  {
    id: 'MIP',
    displayLabel: 'Most Improved Player',
    synonyms: ['MIP', 'Most Improved Player', 'most improved player'],
    sport: ['basketball'],
    category: 'award'
  },
  {
    id: 'FINALS_MVP',
    displayLabel: 'Finals MVP',
    synonyms: ['Finals MVP', 'finals mvp', 'championship mvp'],
    sport: ['basketball'],
    category: 'award'
  },
  {
    id: 'ALL_LEAGUE',
    displayLabel: 'All-League Team',
    synonyms: ['All-League', 'all-league', 'First Team All-League', 'Second Team All-League', 'Third Team All-League'],
    sport: ['basketball'],
    category: 'award'
  },
  {
    id: 'ALL_DEF',
    displayLabel: 'All-Defensive Team',
    synonyms: ['All-Defensive', 'all-defensive', 'First Team All-Defensive', 'Second Team All-Defensive'],
    sport: ['basketball'],
    category: 'award'
  },
  {
    id: 'ALL_ROOKIE',
    displayLabel: 'All-Rookie Team',
    synonyms: ['All-Rookie', 'all-rookie', 'All-Rookie Team'],
    sport: ['basketball'],
    category: 'award'
  },
  {
    id: 'CHAMPION',
    displayLabel: 'Won Championship',
    synonyms: ['Won Championship', 'Champion', 'won championship', 'champion'],
    sport: ['basketball'],
    category: 'award'
  },

  // Football Awards & Leaders
  {
    id: 'FB_ALL_STAR',
    displayLabel: 'All-Star',
    synonyms: ['All-Star'],
    sport: ['football'],
    category: 'award'
  },
  {
    id: 'FB_MVP',
    displayLabel: 'Most Valuable Player',
    synonyms: ['Most Valuable Player'],
    sport: ['football'],
    category: 'award'
  },
  {
    id: 'FB_DPOY',
    displayLabel: 'Defensive Player of the Year',
    synonyms: ['Defensive Player of the Year'],
    sport: ['football'],
    category: 'award'
  },
  {
    id: 'FB_OFF_ROY',
    displayLabel: 'Offensive Rookie of the Year',
    synonyms: ['Offensive Rookie of the Year'],
    sport: ['football'],
    category: 'award'
  },
  {
    id: 'FB_DEF_ROY',
    displayLabel: 'Defensive Rookie of the Year',
    synonyms: ['Defensive Rookie of the Year'],
    sport: ['football'],
    category: 'award'
  },
  {
    id: 'FB_ALL_ROOKIE',
    displayLabel: 'All-Rookie Team',
    synonyms: ['All-Rookie Team'],
    sport: ['football'],
    category: 'award'
  },
  {
    id: 'FB_ALL_LEAGUE',
    displayLabel: 'All-League Team',
    synonyms: ['First Team All-League', 'Second Team All-League'],
    sport: ['football'],
    category: 'award'
  },
  {
    id: 'FB_FINALS_MVP',
    displayLabel: 'Finals MVP',
    synonyms: ['Finals MVP'],
    sport: ['football'],
    category: 'award'
  },
  {
    id: 'FB_CHAMPION',
    displayLabel: 'Won Championship',
    synonyms: ['Won Championship'],
    sport: ['football'],
    category: 'award'
  },

  // Hockey Awards & Leaders  
  {
    id: 'HK_ALL_STAR',
    displayLabel: 'All-Star',
    synonyms: ['All-Star', 'all-star'],
    sport: ['hockey'],
    category: 'award'
  },
  {
    id: 'HK_ALL_STAR_MVP',
    displayLabel: 'All-Star MVP',
    synonyms: ['All-Star MVP', 'all-star mvp'],
    sport: ['hockey'],
    category: 'award'
  },
  {
    id: 'HK_MVP',
    displayLabel: 'Most Valuable Player',
    synonyms: ['Most Valuable Player', 'most valuable player'],
    sport: ['hockey'],
    category: 'award'
  },
  {
    id: 'HK_ROY',
    displayLabel: 'Rookie of the Year',
    synonyms: ['Rookie of the Year', 'rookie of the year'],
    sport: ['hockey'],
    category: 'award'
  },
  {
    id: 'HK_ALL_ROOKIE',
    displayLabel: 'All-Rookie Team',
    synonyms: ['All-Rookie Team', 'all-rookie team'],
    sport: ['hockey'],
    category: 'award'
  },
  {
    id: 'HK_ALL_LEAGUE',
    displayLabel: 'All-League Team',
    synonyms: ['All-League Team', 'all-league team', 'First Team All-League', 'Second Team All-League'],
    sport: ['hockey'],
    category: 'award'
  },
  {
    id: 'HK_PTS_LEADER',
    displayLabel: 'League Points Leader',
    synonyms: ['League Points Leader', 'league points leader'],
    sport: ['hockey'],
    category: 'leader'
  },
  {
    id: 'HK_AST_LEADER',
    displayLabel: 'League Assists Leader',
    synonyms: ['League Assists Leader', 'league assists leader'],
    sport: ['hockey'],
    category: 'leader'
  },
  {
    id: 'HK_GOALS_LEADER',
    displayLabel: 'League Goals Leader',
    synonyms: ['League Goals Leader', 'league goals leader'],
    sport: ['hockey'],
    category: 'leader'
  },
  {
    id: 'HK_PLAYOFFS_MVP',
    displayLabel: 'Playoffs MVP',
    synonyms: ['Playoffs MVP', 'playoffs mvp'],
    sport: ['hockey'],
    category: 'award'
  },
  {
    id: 'HK_CHAMPION',
    displayLabel: 'Won Championship',
    synonyms: ['Won Championship', 'won championship'],
    sport: ['hockey'],
    category: 'award'
  },

  // Baseball Awards & Leaders
  {
    id: 'BB_ALL_STAR',
    displayLabel: 'All-Star',
    synonyms: ['All-Star'],
    sport: ['baseball'],
    category: 'award'
  },
  {
    id: 'BB_ALL_STAR_MVP',
    displayLabel: 'All-Star MVP',
    synonyms: ['All-Star MVP'],
    sport: ['baseball'],
    category: 'award'
  },
  {
    id: 'BB_MVP',
    displayLabel: 'Most Valuable Player',
    synonyms: ['Most Valuable Player'],
    sport: ['baseball'],
    category: 'award'
  },
  {
    id: 'BB_PITCHER_OTY',
    displayLabel: 'Pitcher of the Year',
    synonyms: ['Pitcher of the Year', 'Cy Young'],
    sport: ['baseball'],
    category: 'award'
  },
  {
    id: 'BB_ROY',
    displayLabel: 'Rookie of the Year',
    synonyms: ['Rookie of the Year'],
    sport: ['baseball'],
    category: 'award'
  },
  {
    id: 'BB_ALL_ROOKIE',
    displayLabel: 'All-Rookie Team',
    synonyms: ['All-Rookie Team'],
    sport: ['baseball'],
    category: 'award'
  },
  {
    id: 'BB_ALL_LEAGUE',
    displayLabel: 'All-League Team',
    synonyms: ['All-League Team', 'First Team All-League', 'Second Team All-League'],
    sport: ['baseball'],
    category: 'award'
  },
  {
    id: 'BB_GOLD_GLOVE',
    displayLabel: 'Gold Glove',
    synonyms: ['Gold Glove'],
    sport: ['baseball'],
    category: 'award'
  },
  {
    id: 'BB_SILVER_SLUGGER',
    displayLabel: 'Silver Slugger',
    synonyms: ['Silver Slugger'],
    sport: ['baseball'],
    category: 'award'
  },
  {
    id: 'BB_BA_LEADER',
    displayLabel: 'League Batting Average Leader',
    synonyms: ['League Batting Average Leader'],
    sport: ['baseball'],
    category: 'leader'
  },
  {
    id: 'BB_HR_LEADER',
    displayLabel: 'League Home Run Leader',
    synonyms: ['League Home Run Leader'],
    sport: ['baseball'],
    category: 'leader'
  },
  {
    id: 'BB_RBI_LEADER',
    displayLabel: 'League RBI Leader',
    synonyms: ['League RBI Leader'],
    sport: ['baseball'],
    category: 'leader'
  },
  {
    id: 'BB_SB_LEADER',
    displayLabel: 'League Stolen Base Leader',
    synonyms: ['League Stolen Base Leader'],
    sport: ['baseball'],
    category: 'leader'
  },
  {
    id: 'BB_OBP_LEADER',
    displayLabel: 'League On-Base Percentage Leader',
    synonyms: ['League On-Base Percentage Leader'],
    sport: ['baseball'],
    category: 'leader'
  },
  {
    id: 'BB_SLG_LEADER',
    displayLabel: 'League Slugging Percentage Leader',
    synonyms: ['League Slugging Percentage Leader'],
    sport: ['baseball'],
    category: 'leader'
  },
  {
    id: 'BB_OPS_LEADER',
    displayLabel: 'League OPS Leader',
    synonyms: ['League OPS Leader'],
    sport: ['baseball'],
    category: 'leader'
  },
  {
    id: 'BB_HITS_LEADER',
    displayLabel: 'League Hits Leader',
    synonyms: ['League Hits Leader', 'League Doubles Leader', 'League Triples Leader'],
    sport: ['baseball'],
    category: 'leader'
  },
  {
    id: 'BB_ERA_LEADER',
    displayLabel: 'League ERA Leader',
    synonyms: ['League ERA Leader'],
    sport: ['baseball'],
    category: 'leader'
  },
  {
    id: 'BB_K_LEADER',
    displayLabel: 'League Strikeouts Leader',
    synonyms: ['League Strikeouts Leader'],
    sport: ['baseball'],
    category: 'leader'
  },
  {
    id: 'BB_SAVES_LEADER',
    displayLabel: 'League Saves Leader',
    synonyms: ['League Saves Leader'],
    sport: ['baseball'],
    category: 'leader'
  },
  {
    id: 'BB_RP_OTY',
    displayLabel: 'Relief Pitcher of the Year',
    synonyms: ['Relief Pitcher of the Year', 'Reliever of the Year'],
    sport: ['baseball'],
    category: 'award'
  },
  {
    id: 'BB_PLAYOFFS_MVP',
    displayLabel: 'Playoffs MVP',
    synonyms: ['Playoffs MVP'],
    sport: ['baseball'],
    category: 'award'
  },
  {
    id: 'BB_CHAMPION',
    displayLabel: 'Won Championship',
    synonyms: ['Won Championship'],
    sport: ['baseball'],
    category: 'award'
  },

  // Universal Career Achievements
  {
    id: 'SEASONS_10',
    displayLabel: 'Played 10+ Seasons',
    synonyms: ['Played 10+ Seasons', 'played 10+ seasons', 'played10PlusSeasons'],
    sport: ['basketball', 'football', 'hockey', 'baseball'],
    category: 'career'
  },
  {
    id: 'SEASONS_15',
    displayLabel: 'Played 15+ Seasons',
    synonyms: ['Played 15+ Seasons', 'played 15+ seasons', 'played15PlusSeasons'],
    sport: ['basketball', 'football', 'hockey', 'baseball'],
    category: 'career'
  },

  // Basketball Career Thresholds
  {
    id: 'PTS_20K',
    displayLabel: '20,000+ Career Points',
    synonyms: ['20,000+ Career Points', '20000+ Career Points', '20k+ Career Points', 'career20kPoints'],
    sport: ['basketball'],
    category: 'career'
  },
  {
    id: 'REB_10K',
    displayLabel: '10,000+ Career Rebounds',
    synonyms: ['10,000+ Career Rebounds', '10000+ Career Rebounds', '10k+ Career Rebounds', 'career10kRebounds'],
    sport: ['basketball'],
    category: 'career'
  },
  {
    id: 'AST_5K',
    displayLabel: '5,000+ Career Assists',
    synonyms: ['5,000+ Career Assists', '5000+ Career Assists', '5k+ Career Assists', 'career5kAssists'],
    sport: ['basketball'],
    category: 'career'
  },
  {
    id: 'STL_2K',
    displayLabel: '2,000+ Career Steals',
    synonyms: ['2,000+ Career Steals', '2000+ Career Steals', '2k+ Career Steals', 'career2kSteals'],
    sport: ['basketball'],
    category: 'career'
  },
  {
    id: 'BLK_1_5K',
    displayLabel: '1,500+ Career Blocks',
    synonyms: ['1,500+ Career Blocks', '1500+ Career Blocks', '1.5k+ Career Blocks', 'career1500Blocks'],
    sport: ['basketball'],
    category: 'career'
  },
  {
    id: 'THREES_2K',
    displayLabel: '2,000+ Career Threes',
    synonyms: ['2,000+ Career Threes', '2000+ Career Threes', '2k+ Career Threes', 'career2kThrees', 'career2k3PM'],
    sport: ['basketball'],
    category: 'career'
  },

  // Draft Achievements
  {
    id: 'PICK_1_OA',
    displayLabel: '#1 Overall Pick',
    synonyms: ['#1 Overall Pick', '1st Overall Pick', 'First Overall Pick', 'isPick1Overall'],
    sport: ['basketball', 'football', 'hockey', 'baseball'],
    category: 'draft'
  },
  {
    id: 'FIRST_ROUND',
    displayLabel: 'First Round Pick',
    synonyms: ['First Round Pick', '1st Round Pick', 'isFirstRoundPick'],
    sport: ['basketball', 'football', 'hockey', 'baseball'],
    category: 'draft'
  },
  {
    id: 'SECOND_ROUND',
    displayLabel: 'Second Round Pick',
    synonyms: ['Second Round Pick', '2nd Round Pick', 'isSecondRoundPick'],
    sport: ['basketball', 'football', 'hockey', 'baseball'],
    category: 'draft'
  },
  {
    id: 'UNDRAFTED',
    displayLabel: 'Went Undrafted',
    synonyms: ['Went Undrafted', 'Undrafted', 'isUndrafted'],
    sport: ['basketball', 'football', 'hockey', 'baseball'],
    category: 'draft'
  },

  // Miscellaneous
  {
    id: 'HOF',
    displayLabel: 'Hall of Fame',
    synonyms: ['Hall of Fame', 'Inducted into the Hall of Fame', 'isHallOfFamer'],
    sport: ['basketball', 'football', 'hockey', 'baseball'],
    category: 'misc'
  }
];

// Create reverse lookup maps for efficiency
export const SYNONYM_TO_CANONICAL = new Map<string, string>();
export const CANONICAL_BY_ID = new Map<string, CanonicalAchievement>();

// Build lookup maps
CANONICAL_ACHIEVEMENTS.forEach(achievement => {
  CANONICAL_BY_ID.set(achievement.id, achievement);
  
  // Add synonyms (case-insensitive)
  achievement.synonyms.forEach(synonym => {
    SYNONYM_TO_CANONICAL.set(synonym.toLowerCase(), achievement.id);
  });
});

/**
 * Convert any achievement string to its canonical ID
 */
export function getCanonicalId(achievementString: string): string | null {
  return SYNONYM_TO_CANONICAL.get(achievementString.toLowerCase()) || null;
}

/**
 * Get canonical achievement data by ID
 */
export function getCanonicalAchievement(id: string): CanonicalAchievement | null {
  return CANONICAL_BY_ID.get(id) || null;
}

/**
 * Get display label for canonical ID
 */
export function getDisplayLabel(id: string): string {
  const achievement = CANONICAL_BY_ID.get(id);
  return achievement?.displayLabel || id;
}

/**
 * Get all canonical achievements for a sport
 */
export function getAchievementsForSport(sport: string): CanonicalAchievement[] {
  return CANONICAL_ACHIEVEMENTS.filter(a => a.sport.includes(sport));
}

/**
 * Check if an achievement ID is season-aligned (requires team/season matching)
 */
export function isSeasonAligned(canonicalId: string): boolean {
  // Awards and leaders are season-aligned, career/draft/misc are not
  const achievement = CANONICAL_BY_ID.get(canonicalId);
  return achievement?.category === 'award' || achievement?.category === 'leader';
}