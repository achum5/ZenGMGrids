export interface Team {
  tid: number;
  abbrev: string;
  name: string;
  region?: string;
  colors?: string[]; // Array of hex color codes
  jersey?: string;   // Jersey style (e.g., "modern", "classic", "sleeved")
  imgURL?: string | null; // Team logo URL
  imgURLSmall?: string | null; // Small team logo URL for Career Summary
  disabled?: boolean; // Whether team is currently inactive/disabled
  seasons?: Array<{
    season: number;
    tid: number;
    region?: string;
    name?: string;
    abbrev?: string;
  }>;
}

export interface SeasonLine {
  season: number;
  tid: number;
  gp: number;
  playoffs?: boolean;
}

export interface Player {
  pid: number;
  name: string;
  seasons: SeasonLine[];
  teamsPlayed: Set<number>;
  imgURL?: string | null;
  face?: any | null;
  // Additional BBGM fields for rarity and modal
  firstName?: string;
  lastName?: string;
  pos?: string;
  born?: { year?: number; loc?: string | null };
  draft?: { round?: number; pick?: number; year?: number };
  weight?: number | null;
  hgt?: number | null;
  tid: number; // current team
  awards?: Array<{ type: string; season: number }>;
  stats?: Array<{
    season: number;
    tid: number;
    playoffs?: boolean;
    gp?: number;
    min?: number;
    pts?: number;
    trb?: number; // rebounds
    ast?: number; // assists
    stl?: number; // steals
    blk?: number; // blocks
    tpm?: number; // made threes (preferred)
    tp?: number; // made threes (fallback)
    tpa?: number; // three-point attempts
    fg?: number; // field goals made
    fga?: number; // field goal attempts
    ft?: number; // free throws made
    fta?: number; // free throw attempts
    ppg?: number; // points per game (sometimes present)
    rpg?: number; // rebounds per game
    apg?: number; // assists per game
    spg?: number; // steals per game
    bpg?: number; // blocks per game
    fgp?: number; // field goal percentage (0-1 or 0-100)
    tpp?: number; // three-point percentage (0-1 or 0-100)
    ftp?: number; // free throw percentage (0-1 or 0-100)
    ws?: number; // Win shares for determining career team
    jerseyNumber?: string;
    // Game highs for feat detection
    ptsMax?: number; // highest points in a game this season
    trbMax?: number; // highest rebounds in a game this season
    astMax?: number; // highest assists in a game this season
    tpMax?: number; // highest made threes in a game this season
  }>;
  achievements?: {
    // Basketball career achievements
    career20kPoints: boolean;
    career10kRebounds: boolean;
    career5kAssists: boolean;
    career2kSteals: boolean;
    career1500Blocks: boolean;
    career2kThrees: boolean;
    // Football career achievements
    career5kPassYds?: boolean;
    career40kPassYds?: boolean;
    career300PassTDs?: boolean;
    career3kRushYds?: boolean;
    career12kRushYds?: boolean;
    career100RushTDs?: boolean;
    career2kRecYds?: boolean;
    career12kRecYds?: boolean;
    career100RecTDs?: boolean;
    career100Sacks?: boolean;
    career20Ints?: boolean;
    // Baseball career achievements
    career3000Hits?: boolean;
    career500HRs?: boolean;
    career1500RBIs?: boolean;
    career400SBs?: boolean;
    career1800Runs?: boolean;
    career300Wins?: boolean;
    career3000Ks?: boolean;
    career300Saves?: boolean;
    // Hockey career achievements
    career500Goals?: boolean;
    career1000Points?: boolean;
    career500Assists?: boolean;
    career200Wins?: boolean;
    career50Shutouts?: boolean;
    // Basketball single-season achievements
    season30ppg: boolean;
    season10apg: boolean;
    season15rpg: boolean;
    season3bpg: boolean;
    season25spg: boolean;
    season504090: boolean;
    // Football single-season achievements
    season4kPassYds?: boolean;
    season4500PassYds?: boolean;
    season35PassTDs?: boolean;
    season1kRushYds?: boolean;
    season1800RushYds?: boolean;
    season20RushTDs?: boolean;
    season1kRecYds?: boolean;
    season1400RecYds?: boolean;
    season15RecTDs?: boolean;
    season15Sacks?: boolean;
    season8Ints?: boolean;
    // Baseball single-season achievements
    season50HRs?: boolean;
    season130RBIs?: boolean;
    season200Hits?: boolean;
    season50SBs?: boolean;
    season20Wins?: boolean;
    season40Saves?: boolean;
    season300Ks?: boolean;
    season200ERA?: boolean;
    // Hockey single-season achievements
    season50Goals?: boolean;
    season100Points?: boolean;
    season60Assists?: boolean;
    season35Wins?: boolean;
    season10Shutouts?: boolean;
    season925SavePct?: boolean;
    // Awards (shared)
    hasMVP?: boolean;
    hasROY?: boolean;
    hasDPOY?: boolean;
    hasAllStar?: boolean;
    hasAllLeague?: boolean;
    hasAllDefense?: boolean;
    hasAllPro?: boolean;
    hasProBowl?: boolean;
    // Additional award properties
    wonMVP?: boolean;
    wonDPOY?: boolean;
    wonROY?: boolean;
    wonSixMOY?: boolean;
    wonFinalsMVP?: boolean;
    madeAllStar?: boolean;
    wonChampionship?: boolean;
    wonOPOY?: boolean;
    wonDefensiveForward?: boolean;
    wonGoalieOfYear?: boolean;
    wonPlayoffsMVP?: boolean;
    // League leadership achievements
    ledScoringAny: boolean;
    ledRebAny: boolean;
    ledAstAny: boolean;
    ledStlAny: boolean;
    ledBlkAny: boolean;
    ledPoints?: boolean;
    ledRebounds?: boolean;
    ledAssists?: boolean;
    ledSteals?: boolean;
    ledBlocks?: boolean;
    ledThrees?: boolean;
    // Career length & draft achievements
    played15PlusSeasons: boolean;
    played10PlusSeasons?: boolean;
    isPick1Overall: boolean;
    isFirstRoundPick: boolean;
    isSecondRoundPick: boolean;
    isUndrafted: boolean;
    draftedTeen: boolean;
    // Special categories achievements
    allStar35Plus: boolean;
    oneTeamOnly: boolean;
    isHallOfFamer: boolean;
  };
  // New: Season-specific data for same-season alignment
  teamSeasonsPaired?: Set<string>; // Set of "season|tid" strings
  achievementSeasons?: {
    // Single-season achievements
    season30ppg: Set<number>;
    season10apg: Set<number>;
    season15rpg: Set<number>;
    season3bpg: Set<number>;
    season25spg: Set<number>;
    season504090: Set<number>;
    // League leadership
    ledScoringAny: Set<number>;
    ledRebAny: Set<number>;
    ledAstAny: Set<number>;
    ledStlAny: Set<number>;
    ledBlkAny: Set<number>;
    // Major awards
    mvpWinner: Set<number>;
    dpoyWinner: Set<number>;
    royWinner: Set<number>;
    smoyWinner: Set<number>;
    mipWinner: Set<number>;
    fmvpWinner: Set<number>;
    // Team honors  
    allLeagueTeam: Set<number>;
    allDefensiveTeam: Set<number>;
    allStarSelection: Set<number>;
    champion: Set<number>;
    // Draft achievements 
    isFirstRoundPick: Set<number>;
    isSecondRoundPick: Set<number>;
    isUndrafted: Set<number>;
    draftedTeen: Set<number>;
    // Special
    allStar35Plus: Set<number>;
    oneTeamOnly: Set<number>;
    isHallOfFamer: Set<number>;
  };
  ratings?: Array<{ season: number; pos?: string; ovr?: number }>;
  retiredYear?: number | null;
  contract?: { amount?: number; exp?: number };
  college?: string | null;
  injury?: { type?: string; gamesRemaining?: number };
  jerseyNumber?: string | number | null;
}

// Team overlap analysis types
export interface TeamOverlapData {
  viableTeamPairs: Array<{teamA: number, teamB: number, playerCount: number}>;
  teamPlayerCounts: Record<number, number>;
  mostConnectedTeams: number[];
  // Track which teams have players for each achievement
  teamAchievementMatrix: Record<string, Set<number>>; // achievementId -> Set of team IDs
  achievementTeamCounts: Record<string, number>; // achievementId -> number of teams with players
}

export interface LeagueData {
  players: Player[];
  teams: Team[];
  teamOverlaps?: TeamOverlapData; // Pre-analyzed team combination data
  sport?: 'basketball' | 'football' | 'hockey' | 'baseball';
  // Season index for season-specific achievements (basketball only)
  seasonIndex?: any; // SeasonIndex from season-achievements
}

export interface CatTeam {
  key: string;
  label: string;
  tid?: number; // Optional for achievement constraints
  achievementId?: string; // Optional for achievement constraints
  type: 'team' | 'achievement';
  test(p: Player): boolean;
}

export interface CellState {
  name?: string;
  correct?: boolean;
  locked?: boolean;
  guessed?: boolean;
  autoFilled?: boolean; // true when revealed via Give Up
  player?: Player;
  rarity?: number; // 1-100
  points?: number; // same as rarity
}

export interface SearchablePlayer {
  pid: number;
  name: string;
  nameLower: string;
  nameFolded: string;
  firstLower: string;
  firstFolded: string;
  lastLower: string;
  lastFolded: string;
  teamAbbrevs: string[];
  careerYears: string; // Pre-calculated career year range
}
