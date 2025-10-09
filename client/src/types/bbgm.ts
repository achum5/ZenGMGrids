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
  statsTids?: number[]; // Unique team IDs player recorded stats with
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
    // Football-specific stats
    pssYds?: number; // Passing yards
    pssAtt?: number; // Passing attempts
    pssTD?: number;  // Passing touchdowns
    rusYds?: number; // Rushing yards
    rusAtt?: number; // Rushing attempts
    rusTD?: number;  // Rushing touchdowns
    recYds?: number; // Receiving yards
    rec?: number;    // Receptions
    recTD?: number;  // Receiving touchdowns
    sks?: number;    // Sacks (for defensive players)
    defSk?: number;  // Defensive sacks (alternative field name)
    defTck?: number; // Total tackles (solo + assisted)
    defTckLoss?: number; // Tackles for loss
    defInt?: number; // Interceptions
    krYds?: number;  // Kick return yards
    prYds?: number;  // Punt return yards
    // Hockey-specific stats
    evG?: number; // Even strength goals
    ppG?: number; // Power play goals
    shG?: number; // Short handed goals
    evA?: number; // Even strength assists
    ppA?: number; // Power play assists
    shA?: number; // Short handed assists
    pm?: number; // Plus/Minus
    s?: number; // Shots
    hit?: number; // Hits
    blk?: number; // Blocks
    tk?: number; // Takeaways
    fow?: number; // Faceoffs won
    fol?: number; // Faceoffs lost
    min?: number; // Minutes played
    pim?: number; // Penalty minutes
    sa?: number; // Shots against (goalie)
    ga?: number; // Goals against (goalie)
    sv?: number; // Saves (goalie)
    so?: number; // Shutouts (goalie)
    gs?: number; // Goalie starts
    gW?: number; // Goalie wins
    // Baseball-specific stats
    h?: number; // Hits
    hr?: number; // Home runs
    rbi?: number; // Runs batted in
    sb?: number; // Stolen bases
    r?: number; // Runs
    ab?: number; // At-bats
    w?: number; // Wins (pitcher)
    soPit?: number; // Strikeouts (pitcher)
    sv?: number; // Saves (pitcher)
    era?: number; // Earned run average (pitcher)
    ip?: number; // Innings pitched (pitcher)
    bb?: number; // Walks (pitcher)
    ha?: number; // Hits allowed (pitcher)
    er?: number; // Earned runs (pitcher)
    hra?: number; // Home runs allowed (pitcher)
    bf?: number; // Batters faced (pitcher)
    whip?: number; // Walks + Hits per Inning Pitched (pitcher)
    k_9?: number; // Strikeouts per 9 innings (pitcher)
    bb_9?: number; // Walks per 9 innings (pitcher)
    hr_9?: number; // Home runs per 9 innings (pitcher)
    babip?: number; // Batting Average on Balls In Play (pitcher)
    fip?: number; // Fielding Independent Pitching (pitcher)
    war?: number; // Wins Above Replacement (pitchpitcher)
    ops?: number; // On-base Plus Slugging (hitter)
    avg?: number; // Batting Average (hitter)
    obp?: number; // On-base Percentage (hitter)
    slg?: number; // Slugging Percentage (hitter)
    iso?: number; // Isolated Power (hitter)
    babipBat?: number; // Batting Average on Balls In Play (hitter)
    wrcPlus?: number; // Weighted Runs Created Plus (hitter)
    woba?: number; // Weighted On-base Average (hitter)
    fld?: number; // Fielding Percentage (hitter)
    def?: number; // Defensive Runs Saved (hitter)
    arm?: number; // Arm Rating (hitter)
    baser?: number; // Baserunning Rating (hitter)
    bbr?: number; // Baserunning Runs (hitter)
    off?: number; // Offensive Runs Above Average (hitter)
    rar?: number; // Runs Above Replacement (hitter)
    dr?: number; // Defensive Rating (hitter)
    // Generic stats that might be used across sports
    ovr?: number; // Overall rating (sometimes in stats)
    pot?: number; // Potential rating (sometimes in stats)
    value?: number; // Player value (sometimes in stats)
    contract?: number; // Contract amount (sometimes in stats)
    salary?: number; // Salary (sometimes in stats)
    draftPick?: number; // Draft pick number (sometimes in stats)
    age?: number; // Player age (sometimes in stats)
    height?: number; // Player height (sometimes in stats)
    weight?: number; // Player weight (sometimes in stats)
    bornYear?: number; // Year born (sometimes in stats)
    bornLoc?: string; // Location born (sometimes in stats)
    college?: string; // College (sometimes in stats)
    jersey?: string; // Jersey number (sometimes in stats)
    team?: string; // Team name (sometimes in stats)
    pos?: string; // Position (sometimes in stats)
    type?: string; // Player type (e.g., 'R' for rookie)
    // For custom grid calculations
    fgPct?: number; // Field goal percentage (calculated)
    tpPct?: number; // Three-point percentage (calculated)
    ftPct?: number; // Free throw percentage (calculated)
    eFG?: number; // Effective Field Goal Percentage (calculated)
    tsPct?: number; // True Shooting Percentage (calculated)
    trbPerGame?: number; // Total rebounds per game (calculated)
    astPerGame?: number; // Assists per game (calculated)
    stlPerGame?: number; // Steals per game (calculated)
    blkPerGame?: number; // Blocks per game (calculated)
    tpmPerGame?: number; // Threes made per game (calculated)
    minPerGame?: number; // Minutes per game (calculated)
    fgaPerGame?: number; // Field goal attempts per game (calculated)
    tpaPerGame?: number; // Three-point attempts per game (calculated)
    ftaPerGame?: number; // Free throw attempts per game (calculated)
    pf?: number; // Personal fouls
    tov?: number; // Turnovers
    plusMinus?: number; // Plus/Minus
    dd?: number; // Double doubles
    td?: number; // Triple doubles
    qd?: number; // Quadruple doubles
    // For football scrimmage and all-purpose yards
    scrimmageYds?: number; // Rushing yards + receiving yards
    allPurposeYds?: number; // Rushing yards + receiving yards + kick return yards + punt return yards
    // For hockey computed stats
    powerPlayPoints?: number; // Power play goals + power play assists
    faceoffPct?: number; // Faceoffs won / (faceoffs won + faceoffs lost)
    toiPerGame?: number; // Time on ice per game (minutes)
    savePct?: number; // Save percentage (goalie)
    gaaRate?: number; // Goals against average (goalie)
    // For baseball computed stats
    eraPlus?: number; // ERA+ (pitcher)
    fipPlus?: number; // FIP+ (pitcher)
    whipPlus?: number; // WHIP+ (pitcher)
    k_bb?: number; // K/BB ratio (pitcher)
    k_hr?: number; // K/HR ratio (pitcher)
    bb_9_plus?: number; // BB/9+ (pitcher)
    hr_9_plus?: number; // HR/9+ (pitcher)
    avgPlus?: number; // AVG+ (hitter)
    obpPlus?: number; // OBP+ (hitter)
    slgPlus?: number; // SLG+ (hitter)
    opsPlus?: number; // OPS+ (hitter)
    isoPlus?: number; // ISO+ (hitter)
    babipBatPlus?: number; // BABIP+ (hitter)
    wrcPlusPlus?: number; // wRC++ (hitter)
    wobaPlus?: number; // wOBA+ (hitter)
    fldPlus?: number; // FLD+ (hitter)
    defPlus?: number; // DEF+ (hitter)
    armPlus?: number; // ARM+ (hitter)
    baserPlus?: number; // BASER+ (hitter)
    bbrPlus?: number; // BBR+ (hitter)
    offPlus?: number; // OFF+ (hitter)
    rarPlus?: number; // RAR+ (hitter)
    drPlus?: number; // DR+ (hitter)
  }>;
  achievements?: Record<string, boolean | any>;
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
    bornOutsideUS50DC: Set<number>;
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
  // Decade metadata for dynamic decade achievements
  firstSeason?: number;
  lastSeason?: number;
  debutDecade?: number; // Start year of debut decade (e.g., 1990 for 1990s)
  retiredDecade?: number; // Start year of retirement decade (e.g., 2000 for 2000s)
  decadesPlayed?: Set<number>; // Set of decade start years (e.g., [1990, 2000, 2010])
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
  // League year bounds for dynamic decade achievements
  leagueYears?: { minSeason: number; maxSeason: number };
}

import type { Achv } from '@/lib/feedback';

export interface CatTeam {
  key: string;
  label: string;
  tid?: number; // Optional for achievement constraints
  achievementId?: string; // Optional for achievement constraints
  achv?: Achv; // Full achievement definition for feedback
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
  hintSuggestedPlayer?: number; // PID of player suggested in hint
  usedHint?: boolean; // whether this cell was solved using the hint
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
