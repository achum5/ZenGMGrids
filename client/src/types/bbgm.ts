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
    colors?: string[]; // Season-specific colors
    jersey?: string;   // Season-specific jersey style
    imgURL?: string | null; // Season-specific logo
    imgURLSmall?: string | null; // Season-specific small logo
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
    gs?: number; // games started
    min?: number;
    orb?: number; // offensive rebounds
    drb?: number; // defensive rebounds
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
    // Advanced stats
    per?: number; // Player Efficiency Rating
    vorp?: number; // Value Over Replacement Player
    bpm?: number; // Box Plus/Minus
    obpm?: number; // Offensive Box Plus/Minus
    dbpm?: number; // Defensive Box Plus/Minus
    ows?: number; // Offensive Win Shares
    dws?: number; // Defensive Win Shares
    ws48?: number; // Win Shares per 48 minutes
    ewa?: number; // Estimated Wins Added
    tsPct?: number; // True Shooting Percentage
    orbPct?: number; // Offensive Rebound Percentage
    drbPct?: number; // Defensive Rebound Percentage
    trbPct?: number; // Total Rebound Percentage
    astPct?: number; // Assist Percentage
    stlPct?: number; // Steal Percentage
    blkPct?: number; // Block Percentage
    tovPct?: number; // Turnover Percentage
    usgPct?: number; // Usage Percentage
    pm?: number; // Plus/Minus
    onOff?: number; // On-Off differential
    ortg?: number; // Offensive Rating
    drtg?: number; // Defensive Rating
    // Game highs for feat detection
    ptsMax?: number; // highest points in a game this season
    trbMax?: number; // highest rebounds in a game this season
    astMax?: number; // highest assists in a game this season
    tpMax?: number; // highest made threes in a game this season

    // Football-specific stats
    pssYds?: number;
    pssTD?: number;
    pssInt?: number;
    pss?: number; // pass attempts
    pssCmp?: number; // pass completions
    rusYds?: number;
    rusTD?: number;
    rus?: number; // rush attempts
    recYds?: number;
    recTD?: number;
    rec?: number; // receptions
    tgt?: number; // targets
    sks?: number;
    defSk?: number; // defensive sacks
    defTckSolo?: number;
    defTckAst?: number;
    defInt?: number;
    defIntYds?: number;
    defIntTD?: number;
    defTckLoss?: number;
    defPssDef?: number; // passes defended
    defFmbFrc?: number; // forced fumbles
    prYds?: number;
    krYds?: number;
    ff?: number;
    fg0?: number; // FG made 0-19 yards
    fg20?: number; // FG made 20-29 yards
    fg30?: number; // FG made 30-39 yards
    fg40?: number; // FG made 40-49 yards
    fg50?: number; // FG made 50+ yards
    fga0?: number; // FG attempts 0-19 yards
    fga20?: number; // FG attempts 20-29 yards
    fga30?: number; // FG attempts 30-39 yards
    fga40?: number; // FG attempts 40-49 yards
    fga50?: number; // FG attempts 50+ yards
    fgLng?: number; // longest FG
    xp?: number; // extra points made
    pnt?: number; // punts
    pntYds?: number; // punt yards
    pntIn20?: number; // punts inside 20
    pntTB?: number; // punt touchbacks
    pntBlk?: number; // punts blocked
    av?: number; // approximate value

    // Hockey-specific stats
    fow?: number; // Faceoffs won
    fol?: number; // Faceoffs lost
    pim?: number; // Penalty minutes
    pm?: number; // Plus/minus
    ga?: number; // Goals against
    gs?: number; // Goalie starts
    ppG?: number; // Power play goals
    ppA?: number; // Power play assists
    evG?: number; // Even strength goals
    evA?: number; // Even strength assists
    shG?: number; // Short handed goals
    shA?: number; // Short handed assists
    gW?: number; // Goalie wins
    gL?: number; // Goalie losses
    gOTL?: number; // Goalie overtime losses
    gMin?: number; // Goalie minutes
    so?: number; // Shutouts
    sa?: number; // Shots against (for goalies)
    sv?: number; // Saves (for goalies)
    gpGoalie?: number; // Games played as goalie
    gpSkater?: number; // Games played as skater
    g?: number; // Goals (total, alternative field)
    a?: number; // Assists (total, alternative field)
    asts?: number; // Assists (alternative field name)

    // Baseball-specific stats
    h?: number; // Hits
    hr?: number; // Home runs
    rbi?: number; // Runs batted in
    sb?: number; // Stolen bases
    r?: number; // Runs
    w?: number; // Wins (pitcher)
    soPit?: number; // Strikeouts (pitcher)
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
  ratings?: Array<{
    season: number;
    pos?: string;
    ovr?: number;
    pot?: number;
    // Physical ratings
    hgt?: number;
    stre?: number;
    spd?: number;
    jmp?: number;
    endu?: number;
    // Shooting ratings
    ins?: number;
    dnk?: number;
    ft?: number;
    fg?: number;
    tp?: number;
    // Skill ratings
    oiq?: number;
    diq?: number;
    drb?: number;
    pss?: number;
    reb?: number;
    // Allow any other rating fields
    [key: string]: any;
  }>;
  retiredYear?: number | null;
  contract?: { amount?: number; exp?: number };
  college?: string | null;
  injury?: { type?: string; gamesRemaining?: number };
  jerseyNumber?: string | number | null;
  relatives?: Array<{ type: string; pid: number; name: string }>;
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

export interface TeamSeasonRecord {
  tid: number;
  season: number;
  won?: number;
  lost?: number;
  tied?: number;
  otl?: number; // Overtime losses (hockey)
  playoffs?: boolean;
  gp?: number; // Games played (sometimes present directly)
  playoffRoundsWon?: number; // Number of playoff rounds won (-1 = missed playoffs, 0 = lost first round, etc.)
  [key: string]: any; // Allow other fields
}

export interface PlayoffSeriesTeam {
  tid: number;
  seed?: number;
  won: number;
  lost?: number;
}

export interface PlayoffSeriesMatchup {
  home: PlayoffSeriesTeam;
  away: PlayoffSeriesTeam;
}

export interface PlayoffSeasonData {
  season: number;
  series: PlayoffSeriesMatchup[][]; // Array of rounds, each round has array of matchups
  [key: string]: any;
}

export interface LeagueData {
  players: Player[];
  teams: Team[];
  teamSeasons?: TeamSeasonRecord[]; // Team season records with W/L/T/OTL
  teamOverlaps?: TeamOverlapData; // Pre-analyzed team combination data
  sport?: 'basketball' | 'football' | 'hockey' | 'baseball';
  // Season index for season-specific achievements (basketball only)
  seasonIndex?: any; // SeasonIndex from season-achievements
  // League year bounds for dynamic decade achievements
  leagueYears?: { minSeason: number; maxSeason: number };
  gameAttributes?: any; // Add gameAttributes here
  playoffSeries?: PlayoffSeasonData[]; // Playoff bracket data by season
}

import type { Achv } from '@/lib/types';

export interface CatTeam {
  key: string;
  label: string;
  tid?: number; // Optional for achievement constraints
  achievementId?: string; // Optional for achievement constraints
  achv?: Achv; // Full achievement definition for feedback
  type: 'team' | 'achievement';
  test(p: Player): boolean;
  operator?: '≥' | '≤'; // Operator for customizable achievements
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
