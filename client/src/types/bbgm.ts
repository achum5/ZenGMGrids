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
    jerseyNumber?: string;
  }>;
  achievements?: Record<string, boolean | any>;
  // New: Season-specific data for same-season alignment
  teamSeasonsPaired?: Set<string>; // Set of "season|tid" strings
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
}
