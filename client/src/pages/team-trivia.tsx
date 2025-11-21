import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { PlayerFace } from '@/components/PlayerFace';
import { PlayerFaceTile } from '@/components/PlayerFaceTile';
import { useToast } from '@/lib/hooks/use-toast';
import { Shuffle, Home as HomeIcon, ArrowLeft, ChevronDown, ArrowRight, Info, Settings, Save, HelpCircle, History } from 'lucide-react';
import { updateYearRange, updateTeamFilter } from '@/lib/league-storage';


import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RulesModal } from '@/components/RulesModal';
import { AccentLine } from '@/components/AccentLine';
import { CompactScoreCard } from '@/components/CompactScoreCard';
import { TeamInfoModal } from '@/components/TeamInfoModal';
import { ScoreSummaryModal, type ScoreSummaryData } from '@/components/ScoreSummaryModal';
import { PlayerPageModal } from '@/components/PlayerPageModal';
import { HistoryModal } from '@/components/HistoryModal';
import { loadGameHistory, saveGameToHistory, deleteGameFromHistory, deleteLeagueHistory, deleteLeagueHistoryBelowThreshold, migrateFromLocalStorage, hydrateCompactSummaryData, type HistoryEntry } from '@/lib/game-history-idb';
import type { LeagueData, Player, Team } from '@/types/bbgm';

// Type for ScoreCategory
interface ScoreCategory {
  name: string;
  points: number;
}
import basketballIcon from '@/assets/zengm-grids-logo-basketball.png';
import footballIcon from '@/assets/zengm-grids-logo-football.png';
import hockeyIcon from '@/assets/zengm-grids-logo-hockey.png';
import baseballIcon from '@/assets/zengm-grids-logo-baseball.png';
import { getAssetBaseUrl } from '@/components/TeamLogo';

interface RosterPlayer {
  player: Player;
  revealed: boolean;
  hintShown: boolean;
  gamesPlayed: number;
  stats: any; // Calculated per-game stats for tile display (ppg, rpg, line1, line2, etc.)
  rawSeasonStats?: any; // Raw season totals for TeamInfoModal (pts, ast, trb, etc.)
  advancedStats?: any; // Optional advanced stats
  position: string;
  jerseyNumber?: string;
  teamColors?: string[];
  age?: number; // Age during the season
}

interface TeamTriviaProps {
  leagueData: LeagueData;
  onBackToModeSelect: () => void;
  onGoHome: () => void;
  leagueId: string | null;
  leagueFingerprintId?: string | null;
  initialYearRange?: [number, number] | null;
  initialTeamFilter?: number | null;
}

interface RoundScore {
  round: string;
  roundLabel: string;
  guesses: number;
  points: number;
  details: string;
}

// Modal stack types for player, team, breakdown, and history modals
type ModalStackItem =
  | { type: 'player'; player: Player; season?: number; teamId?: number }
  | { type: 'team'; tid: number; season: number }
  | { type: 'breakdown'; historyEntry?: HistoryEntry }
  | { type: 'history' };

// Normalize name for matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, '')
    .replace(/['\-\s\.]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Format stat leader label for display
function formatStatLabel(roundInstruction: string): string {
  // Extract the stat name from the instruction (e.g., "Click on the team points leader" -> "points")
  const statName = roundInstruction
    .replace('Click on the team ', '')
    .replace(' leader', '')
    .trim();

  // Split by space or hyphen and capitalize each word
  return statName
    .split(/[\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Transform team logo URL to handle relative paths
function getTeamLogoUrl(logoUrl: string | null | undefined, sport: string = 'basketball'): string | undefined {
  if (!logoUrl) return undefined;
  
  // If it's a default relative path (starts with /img/logos-), transform it
  if (logoUrl.startsWith('/img/logos-')) {
    const assetBase = getAssetBaseUrl(sport);
    const cleanPath = logoUrl.startsWith('/') ? logoUrl.substring(1) : logoUrl;
    return `${assetBase}/${cleanPath}`;
  }
  
  // Otherwise, use it as-is (external URL or custom path)
  return logoUrl;
}

// Basketball rounds
type BasketballRoundType = 'guess' | 'hint' | 'points-leader' | 'rebounds-leader' | 'assists-leader' | 'steals-leader' | 'blocks-leader' | 'wins-guess' | 'playoff-finish' | 'complete';

// Football rounds
type FootballRoundType = 'guess' | 'hint' | 'passing-yards-leader' | 'rushing-yards-leader' | 'receiving-yards-leader' | 'tackles-leader' | 'sacks-leader' | 'interceptions-leader' | 'wins-guess' | 'playoff-finish' | 'complete';

// Baseball rounds
type BaseballRoundType = 'guess' | 'hint' | 'hits-leader' | 'home-runs-leader' | 'rbis-leader' | 'stolen-bases-leader' | 'strikeouts-leader' | 'wins-leader' | 'wins-guess' | 'playoff-finish' | 'complete';

// Hockey rounds
type HockeyRoundType = 'guess' | 'hint' | 'points-leader' | 'goals-leader' | 'assists-leader' | 'goalie-wins-leader' | 'wins-guess' | 'playoff-finish' | 'complete';

// Union type for all possible rounds
type RoundType = BasketballRoundType | FootballRoundType | BaseballRoundType | HockeyRoundType;

// Sport-specific round orders
const BASKETBALL_ROUND_ORDER: BasketballRoundType[] = [
  'guess',
  'hint',
  'points-leader',
  'rebounds-leader',
  'assists-leader',
  'steals-leader',
  'blocks-leader',
  'wins-guess',
  'playoff-finish',
  'complete'
];

const FOOTBALL_ROUND_ORDER: FootballRoundType[] = [
  'guess',
  'hint',
  'passing-yards-leader',
  'rushing-yards-leader',
  'receiving-yards-leader',
  'tackles-leader',
  'sacks-leader',
  'interceptions-leader',
  'wins-guess',
  'playoff-finish',
  'complete'
];

const BASEBALL_ROUND_ORDER: BaseballRoundType[] = [
  'guess',
  'hint',
  'hits-leader',
  'home-runs-leader',
  'rbis-leader',
  'stolen-bases-leader',
  'strikeouts-leader',
  'wins-leader',
  'wins-guess',
  'playoff-finish',
  'complete'
];

const HOCKEY_ROUND_ORDER: HockeyRoundType[] = [
  'guess',
  'hint',
  'points-leader',
  'goals-leader',
  'assists-leader',
  'goalie-wins-leader',
  'wins-guess',
  'playoff-finish',
  'complete'
];

// Sport-specific round instructions
const BASKETBALL_ROUND_INSTRUCTIONS: Record<BasketballRoundType, string> = {
  'guess': 'Guess a player correctly for 15 points...',
  'hint': 'Guess a player correctly for 10 points...',
  'points-leader': 'Click on the team points leader',
  'rebounds-leader': 'Click on the team rebounds leader',
  'assists-leader': 'Click on the team assists leader',
  'steals-leader': 'Click on the team steals leader',
  'blocks-leader': 'Click on the team blocks leader',
  'wins-guess': 'Guess how many wins this team had',
  'playoff-finish': 'How far did this team go in the playoffs?',
  'complete': 'Round complete!'
};

const FOOTBALL_ROUND_INSTRUCTIONS: Record<FootballRoundType, string> = {
  'guess': 'Guess a player correctly for 15 points...',
  'hint': 'Guess a player correctly for 10 points...',
  'passing-yards-leader': 'Click on the team passing yards leader',
  'rushing-yards-leader': 'Click on the team rushing yards leader',
  'receiving-yards-leader': 'Click on the team receiving yards leader',
  'tackles-leader': 'Click on the team tackles leader',
  'sacks-leader': 'Click on the team sacks leader',
  'interceptions-leader': 'Click on the team interceptions leader',
  'wins-guess': 'Guess how many wins this team had',
  'playoff-finish': 'How far did this team go in the playoffs?',
  'complete': 'Round complete!'
};

const BASEBALL_ROUND_INSTRUCTIONS: Record<BaseballRoundType, string> = {
  'guess': 'Guess a player correctly for 15 points...',
  'hint': 'Guess a player correctly for 10 points...',
  'hits-leader': 'Click on the team hits leader',
  'home-runs-leader': 'Click on the team home runs leader',
  'rbis-leader': 'Click on the team RBIs leader',
  'stolen-bases-leader': 'Click on the team stolen bases leader',
  'strikeouts-leader': 'Click on the team strikeouts leader',
  'wins-leader': 'Click on the team wins leader',
  'wins-guess': 'Guess how many wins this team had',
  'playoff-finish': 'How far did this team go in the playoffs?',
  'complete': 'Round complete!'
};

const HOCKEY_ROUND_INSTRUCTIONS: Record<HockeyRoundType, string> = {
  'guess': 'Guess a player correctly for 15 points...',
  'hint': 'Guess a player correctly for 10 points...',
  'points-leader': 'Click on the team points leader',
  'goals-leader': 'Click on the team goals leader',
  'assists-leader': 'Click on the team assists leader',
  'goalie-wins-leader': 'Click on the team goalie wins leader',
  'wins-guess': 'Guess how many wins this team had',
  'playoff-finish': 'How far did this team go in the playoffs?',
  'complete': 'Round complete!'
};

// Helper function to calculate years with team
function calculateYearsWithTeam(player: Player, tid: number, season: number): number {
  if (!player.stats || player.stats.length === 0) return 0;

  // Find all seasons with this team up to and including the selected season
  const seasonsWithTeam = player.stats
    .filter(stat => stat.tid === tid && stat.season <= season)
    .map(stat => stat.season)
    .sort((a, b) => a - b);

  if (seasonsWithTeam.length === 0) return 0;

  // Calculate years as: current_season - first_season_with_team + 1
  // +1 because if they joined in 2010 and it's 2010, that's their 1st year, not 0th
  const firstSeason = seasonsWithTeam[0];
  return season - firstSeason + 1;
}

// Helper function to get player rating for a specific season
function getPlayerRating(player: Player, season: number, type: 'ovr' | 'pot'): number | undefined {
  if (!player.ratings || player.ratings.length === 0) return undefined;

  // Find rating for the specific season
  const seasonRating = player.ratings.find(r => r.season === season);
  if (seasonRating) {
    return type === 'ovr' ? seasonRating.ovr : seasonRating.pot;
  }

  // Fallback to closest season if exact match not found
  const closestRating = player.ratings.reduce((closest, current) => {
    const currentDiff = Math.abs(current.season - season);
    const closestDiff = Math.abs(closest.season - season);
    return currentDiff < closestDiff ? current : closest;
  });

  return type === 'ovr' ? closestRating.ovr : closestRating.pot;
}

// Helper function to format contract information
function formatContract(player: Player, season: number): string | undefined {
  if (!player.salaries || player.salaries.length === 0) return undefined;

  // Find salary for the specific season
  const seasonSalary = player.salaries.find(s => s.season === season);
  if (!seasonSalary) return undefined;

  // Format as $X.XXM
  const salaryInMillions = seasonSalary.amount / 1000;
  return `$${salaryInMillions.toFixed(2)}M`;
}

// Helper function to get team MOV (Margin of Victory)
function getTeamMOV(
  leagueData: LeagueData,
  season: number,
  tid: number
): { mov: number; diff: number; gp: number } | null {
  // Try to find teamStats first (preferred)
  const teamStats = (leagueData as any).teamStats?.find(
    (ts: any) => ts.season === season && ts.tid === tid && !ts.playoffs
  );

  if (teamStats) {
    // Determine field names by checking what's available
    const forKeys = ['pts', 'pf', 'gf', 'r'];
    const againstKeys = ['oppPts', 'pa', 'ga', 'ra', 'oppR'];

    let pf: number | undefined;
    let pa: number | undefined;

    // Find first matching pair
    for (const forKey of forKeys) {
      if (teamStats[forKey] !== undefined) {
        pf = teamStats[forKey];
        break;
      }
    }

    for (const againstKey of againstKeys) {
      if (teamStats[againstKey] !== undefined) {
        pa = teamStats[againstKey];
        break;
      }
    }

    const gp = teamStats.gp || 0;

    if (pf !== undefined && pa !== undefined && gp > 0) {
      const diff = pf - pa;
      const mov = diff / gp;
      return { mov, diff, gp };
    }
  }

  // Fallback to teamSeasons
  const teamSeason = leagueData.teamSeasons?.find(
    ts => ts.tid === tid && ts.season === season && !ts.playoffs
  );

  if (teamSeason) {
    const forKeys = ['pts', 'pf', 'gf', 'r'];
    const againstKeys = ['oppPts', 'pa', 'ga', 'ra', 'oppR'];

    let pf: number | undefined;
    let pa: number | undefined;

    // Find first matching pair
    for (const forKey of forKeys) {
      if ((teamSeason as any)[forKey] !== undefined) {
        pf = (teamSeason as any)[forKey];
        break;
      }
    }

    for (const againstKey of againstKeys) {
      if ((teamSeason as any)[againstKey] !== undefined) {
        pa = (teamSeason as any)[againstKey];
        break;
      }
    }

    // Calculate gp
    let gp = teamSeason.gp || 0;
    if (gp === 0) {
      gp = (teamSeason.won || 0) + (teamSeason.lost || 0) + (teamSeason.tied || 0) + (teamSeason.otl || 0);
    }

    if (pf !== undefined && pa !== undefined && gp > 0) {
      const diff = pf - pa;
      const mov = diff / gp;
      return { mov, diff, gp };
    }
  }

  // TODO: Fallback to games reconstruction if needed
  // This would require access to leagueData.games which may not be available

  return null;
}

// Helper function to calculate team stats
// Helper function to generate playoff finish options based on number of rounds
function generatePlayoffOptions(numRounds: number): Array<{ label: string; value: number }> {
  const options: Array<{ label: string; value: number }> = [
    { label: 'Missed Playoffs', value: -1 }
  ];

  // Generate round labels based on number of rounds
  for (let i = 0; i < numRounds; i++) {
    let label: string;

    if (numRounds === 4) {
      // Traditional 4-round playoffs (16 teams)
      if (i === 0) label = 'Lost First Round';
      else if (i === 1) label = 'Lost Second Round';
      else if (i === 2) label = 'Lost Conference Finals';
      else label = 'Lost Finals';
    } else if (numRounds === 3) {
      // 3-round playoffs (8 teams)
      if (i === 0) label = 'Lost First Round';
      else if (i === 1) label = 'Lost Semi-Finals';
      else label = 'Lost Finals';
    } else if (numRounds === 2) {
      // 2-round playoffs (4 teams)
      if (i === 0) label = 'Lost Semi-Finals';
      else label = 'Lost Finals';
    } else if (numRounds === 1) {
      // Single championship game (2 teams)
      label = 'Lost Finals';
    } else {
      // Generic for any other number of rounds
      if (i === numRounds - 1) {
        label = 'Lost Finals';
      } else if (i === numRounds - 2) {
        label = 'Lost Semi-Finals';
      } else {
        label = `Lost Round ${i + 1}`;
      }
    }

    options.push({ label, value: i });
  }

  // Add championship option
  options.push({ label: 'Won Championship', value: numRounds });

  return options;
}

function getTeamPlayoffResult(
  leagueData: LeagueData,
  tid: number,
  season: number
): { label: string; value: number; seriesScore: string | null; numRounds: number } | null {
  // Check if any playoff data exists in the league at all
  if (!leagueData.playoffSeries || leagueData.playoffSeries.length === 0) {
    return null;
  }

  let finishLabel = 'Missed Playoffs';
  let finishValue = -1;
  let seriesScore: string | null = null;
  let numRounds = 4; // Default to 4 rounds (traditional playoffs)

  const seasonPlayoffs = leagueData.playoffSeries?.find(ps => ps.season === season);

  // If no playoff data exists for this specific season, return null to skip the round
  if (!seasonPlayoffs?.series || seasonPlayoffs.series.length === 0) {
    return null;
  }

  const rounds = seasonPlayoffs.series;
  numRounds = rounds.length;

  let lastRoundFound = -1;
  let lastMatchup: any = null;

  // Find the last round this team appeared in
  for (let r = 0; r < numRounds; r++) {
    const matchup = rounds[r]?.find(
      m => m?.home?.tid === tid || m?.away?.tid === tid
    );

    if (matchup) {
      lastRoundFound = r;
      lastMatchup = matchup;
    }
  }

  if (lastRoundFound >= 0 && lastMatchup) {
    const isHome = lastMatchup.home?.tid === tid;
    const teamSide = isHome ? lastMatchup.home : lastMatchup.away;
    const oppSide = isHome ? lastMatchup.away : lastMatchup.home;
    const teamWins = teamSide?.won ?? 0;
    const oppWins = oppSide?.won ?? 0;

    // For single-game series, try to show the actual game score instead of 1-0
    if (teamWins + oppWins === 1) {
      // Check if we have game scores in the matchup
      // BBGM sometimes stores scores as pts arrays in home/away
      const teamPts = isHome ? lastMatchup.home?.pts : lastMatchup.away?.pts;
      const oppPts = isHome ? lastMatchup.away?.pts : lastMatchup.home?.pts;

      if (Array.isArray(teamPts) && Array.isArray(oppPts) && teamPts.length > 0 && oppPts.length > 0) {
        // Use the first (and only) game's score
        seriesScore = `${teamPts[0]}–${oppPts[0]}`;
      } else {
        // Fallback to series record
        seriesScore = `${teamWins}–${oppWins}`;
      }
    } else {
      seriesScore = `${teamWins}–${oppWins}`;
    }

    // If they won the championship round
    if (lastRoundFound === numRounds - 1 && teamWins > oppWins) {
      finishLabel = 'Won Championship';
      finishValue = numRounds;
    } else if (teamWins < oppWins) {
      // They lost in this round
      finishValue = lastRoundFound;

      if (numRounds === 4) {
        finishLabel =
          lastRoundFound === 0
            ? 'Lost First Round'
            : lastRoundFound === 1
            ? 'Lost Second Round'
            : lastRoundFound === 2
            ? 'Lost Conference Finals'
            : 'Lost Finals';
      } else if (numRounds === 3) {
        finishLabel =
          lastRoundFound === 0
            ? 'Lost First Round'
            : lastRoundFound === 1
            ? 'Lost Second Round'
            : 'Lost Finals';
      } else if (numRounds === 2) {
        finishLabel = lastRoundFound === 0 ? 'Lost First Round' : 'Lost Finals';
      } else {
        finishLabel = lastRoundFound === numRounds - 1 ? 'Lost Finals' : `Lost Round ${lastRoundFound + 1}`;
      }
    }
  }

  return { label: finishLabel, value: finishValue, seriesScore, numRounds };
}

function calculateTeamStats(
  leagueData: LeagueData,
  tid: number,
  season: number,
  roster: any[]
): { wins: number; losses: number; teamRating: number; avgAge: number; playoffResult?: string } | undefined {
  // Get team season record
  const teamSeason = leagueData.teamSeasons?.find(
    ts => ts.tid === tid && ts.season === season && !ts.playoffs
  );

  if (!teamSeason) return undefined;

  const wins = teamSeason.won || 0;
  const losses = teamSeason.lost || 0;

  // Calculate average age weighted by minutes played (or games played for sports without minutes)
  let totalWeightedAge = 0;
  let totalWeight = 0;

  roster.forEach(rp => {
    if (rp.age != null) {
      // Use minutes played if available (basketball, football, hockey)
      // Otherwise use games played as the weight (baseball, or fallback)
      let weight = 0;

      // Check rawSeasonStats first (main roster), then stats (opponent roster)
      const seasonStats = rp.rawSeasonStats || rp.stats;

      if (seasonStats?.min != null && seasonStats.min > 0) {
        // Basketball, hockey use 'min' for total minutes/time on ice
        weight = seasonStats.min;
      } else if (rp.gamesPlayed != null && rp.gamesPlayed > 0) {
        // Fallback to games played for sports without minutes tracking
        weight = rp.gamesPlayed;
      }

      if (weight > 0) {
        totalWeightedAge += rp.age * weight;
        totalWeight += weight;
      }
    }
  });

  const avgAge = totalWeight > 0 ? totalWeightedAge / totalWeight : 0;

  // Calculate team rating (average ovr)
  const team = leagueData.teams.find(t => t.tid === tid);
  let teamRating = 0;
  if (team) {
    // Get all player ratings for this season and team
    const playerRatings: number[] = [];
    leagueData.players.forEach(player => {
      const seasonStats = player.stats?.find(
        s => !s.playoffs && s.season === season && s.tid === tid
      );
      if (seasonStats && seasonStats.gp && seasonStats.gp > 0) {
        const rating = player.ratings?.find(r => r.season === season);
        if (rating?.ovr) {
          playerRatings.push(rating.ovr);
        }
      }
    });
    if (playerRatings.length > 0) {
      teamRating = Math.round(playerRatings.reduce((sum, r) => sum + r, 0) / playerRatings.length);
    }
  }

  const playoffData = getTeamPlayoffResult(leagueData, tid, season);
  const playoffResult = playoffData?.label;

  return {
    wins,
    losses,
    teamRating,
    avgAge,
    ...(playoffResult ? { playoffResult } : {}),
  };
}

export default function TeamTrivia({ leagueData, onBackToModeSelect, onGoHome, leagueId, leagueFingerprintId, initialYearRange, initialTeamFilter }: TeamTriviaProps) {
  const { toast } = useToast();
  const [guess, setGuess] = useState('');
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [foundCount, setFoundCount] = useState(0);
  const [score, setScore] = useState(0);
  const [currentRound, setCurrentRound] = useState<RoundType>('guess');
  const [selectedLeader, setSelectedLeader] = useState<number | null>(null); // PID of selected leader
  const [clickedLeaderInfo, setClickedLeaderInfo] = useState<{ name: string; position: string; statValue: string } | null>(null); // Info shown after clicking
  const [leaderGuessLocked, setLeaderGuessLocked] = useState(false); // Prevent multiple guesses per round
  
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [newTeamDropdownOpen, setNewTeamDropdownOpen] = useState(false);
  const [triggerBounceAnimation, setTriggerBounceAnimation] = useState(false); // New state for animation
  const [tileAnimations, setTileAnimations] = useState<Record<number, string>>({}); // New state for tile animations
  const [winsGuessPosition, setWinsGuessPosition] = useState(0); // Left edge L of the slider window
  const [winsGuessSubmitted, setWinsGuessSubmitted] = useState(false); // Whether user has submitted their guess
  const [playoffFinishGuess, setPlayoffFinishGuess] = useState<number | null>(null); // Selected playoff finish option
  const [playoffFinishSubmitted, setPlayoffFinishSubmitted] = useState(false); // Whether user has submitted playoff finish guess
  const [scoreBreakdown, setScoreBreakdown] = useState<RoundScore[]>([]); // Track score per round
  const [modalStack, setModalStack] = useState<ModalStackItem[]>([]); // Stack of open modals (player/team/breakdown)
  const [logoError, setLogoError] = useState(false); // Track if team logo failed to load
  const [yearRangeOpen, setYearRangeOpen] = useState(false); // Year range settings popover
  const [yearRange, setYearRange] = useState<[number, number] | null>(null); // Year range for randomizer [from, to]
  const [yearFromInput, setYearFromInput] = useState<string>(''); // Local state for "From" input
  const [yearToInput, setYearToInput] = useState<string>(''); // Local state for "To" input
  const [isSavingYearRange, setIsSavingYearRange] = useState(false); // Loading state for saving year range
  const [lastSavedYearRange, setLastSavedYearRange] = useState<[number, number] | null>(null); // Track last saved year range
  const [teamFilter, setTeamFilter] = useState<number | null>(null); // Team filter for randomizer (tid), null = all teams
  const [lastSavedTeamFilter, setLastSavedTeamFilter] = useState<number | null>(null); // Track last saved team filter
  const [showHelpModal, setShowHelpModal] = useState(false); // Help modal state
  const [gameHistory, setGameHistory] = useState<HistoryEntry[]>([]); // Game history

  // Detailed game tracking for new summary modal
  const [detailedGameData, setDetailedGameData] = useState<{
    playerGuesses: Array<{ player: Player; correct: boolean; round: 'guess' | 'hint' }>;
    leaderResults: Array<{
      round: RoundType;
      label: string;
      statLabel: string;
      statValue: string | number;
      correctPlayer: Player;
      userCorrect: boolean;
      userSelectedPlayer?: Player;
      userStatValue?: string | number;
      showTotalsNote?: boolean; // Show note that leader is determined by totals, not per-game
    }>;
    winsGuessData?: {
      G: number;
      L: number;
      R: number;
      A: number;
      awarded: boolean;
    };
    playoffFinishData?: {
      userGuess: string;
      correctOutcome: string;
      correct: boolean;
      seriesScore?: string;
      pointsAwarded: number;
    };
  }>({
    playerGuesses: [],
    leaderResults: [],
  });

  // Track whether current game has been saved to prevent duplicate/missed saves
  // Stores unique game ID (season-tid-score-rounds) to prevent duplicate saves
  const hasBeenSavedRef = useRef<string | null>(null);

  // Modal stack management functions
  const pushModal = useCallback((modal: ModalStackItem) => {
    setModalStack(prev => [...prev, modal]);
  }, []);

  const popModal = useCallback(() => {
    setModalStack(prev => prev.slice(0, -1));
  }, []);

  const clearModals = useCallback(() => {
    setModalStack([]);
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const hasInitialized = useRef(false);

  // Get sport-specific round order
  const baseRoundOrder = leagueData.sport === 'football'
    ? FOOTBALL_ROUND_ORDER
    : leagueData.sport === 'baseball'
    ? BASEBALL_ROUND_ORDER
    : leagueData.sport === 'hockey'
    ? HOCKEY_ROUND_ORDER
    : BASKETBALL_ROUND_ORDER;

  // Filter out playoff-finish round if no playoffs exist in the league
  const hasPlayoffs = leagueData.playoffSeries && leagueData.playoffSeries.length > 0;
  const ROUND_ORDER = hasPlayoffs
    ? baseRoundOrder
    : baseRoundOrder.filter(round => round !== 'playoff-finish');

  // Get sport-specific instructions
  const getRoundInstruction = (round: RoundType): string => {
    if (leagueData.sport === 'football') {
      return FOOTBALL_ROUND_INSTRUCTIONS[round as FootballRoundType] || '';
    } else if (leagueData.sport === 'baseball') {
      return BASEBALL_ROUND_INSTRUCTIONS[round as BaseballRoundType] || '';
    } else if (leagueData.sport === 'hockey') {
      return HOCKEY_ROUND_INSTRUCTIONS[round as HockeyRoundType] || '';
    }
    return BASKETBALL_ROUND_INSTRUCTIONS[round as BasketballRoundType] || '';
  };

  // Get all unique seasons
  const allSeasons = useMemo(() => {
    const seasons = new Set<number>();

    // Collect from player seasons
    leagueData.players.forEach(player => {
      player.seasons?.forEach(season => {
        if (!season.playoffs && typeof season.season === 'number') {
          seasons.add(season.season);
        }
      });
    });

    // Also collect from team seasons to ensure completeness
    leagueData.teamSeasons?.forEach(ts => {
      if (!ts.playoffs && typeof ts.season === 'number') {
        seasons.add(ts.season);
      }
    });

    // Convert to array, ensure uniqueness again, and sort
    const uniqueSeasons = [...new Set(Array.from(seasons))];
    return uniqueSeasons.sort((a, b) => b - a); // Most recent first
  }, [leagueData.players, leagueData.teamSeasons]);

  // Get all teams (sorted alphabetically)
  const allTeams = useMemo(() => {
    const teams = leagueData.teams
      .filter(team => !team.disabled)
      .sort((a, b) => {
        const nameA = a.region && a.name ? `${a.region} ${a.name}` : a.abbrev;
        const nameB = b.region && b.name ? `${b.region} ${b.name}` : b.abbrev;
        return nameA.localeCompare(nameB);
      });

    return teams;
  }, [leagueData.teams]);

  // Create playersByPid map for hydrating history entries
  const playersByPid = useMemo(() => {
    const map = new Map<number, Player>();
    leagueData.players.forEach(player => {
      map.set(player.pid, player);
    });
    return map;
  }, [leagueData.players]);

  // Get teams that have players in the selected season (sorted alphabetically)
  const teamsInSelectedSeason = useMemo(() => {
    if (selectedSeason === null) return allTeams;

    const teamsWithPlayers = new Set<number>();
    leagueData.players.forEach(player => {
      player.stats?.forEach(stat => {
        if (!stat.playoffs && stat.season === selectedSeason && stat.gp && stat.gp > 0) {
          teamsWithPlayers.add(stat.tid);
        }
      });
    });

    // Also ensure team has wins data in teamSeasons
    const teamsWithWinsData = new Set<number>();
    if (leagueData.teamSeasons) {
      leagueData.teamSeasons.forEach(ts => {
        if (ts.season === selectedSeason && !ts.playoffs) {
          teamsWithWinsData.add(ts.tid);
        }
      });
    }

    // Filter to teams that:
    // 1. Have player stats for this season
    // 2. Have wins data for this season
    // 3. OR have this season in their seasons array (for newly added teams)
    const filteredTeams = allTeams.filter(team => {
      const hasPlayers = teamsWithPlayers.has(team.tid);
      const hasWins = teamsWithWinsData.has(team.tid);
      const existsInSeason = team.seasons?.some(s => s.season === selectedSeason);

      // Team should be included if:
      // - Has both players and wins data (ideal case)
      // - OR has players and exists in that season (even without wins data - data may be incomplete)
      return (hasWins && hasPlayers) || (hasPlayers && existsInSeason);
    });

    return filteredTeams;
  }, [selectedSeason, allTeams, leagueData.players, leagueData.teamSeasons]);

  // Calculate wins guess data (G, A, W)
  const winsGuessData = useMemo(() => {
    if (!selectedSeason || !selectedTeam || !leagueData.teamSeasons) {
      return null;
    }

    // Find the team's regular season record for this season
    const teamSeasonRecord = leagueData.teamSeasons.find(
      ts => ts.tid === selectedTeam.tid && ts.season === selectedSeason && !ts.playoffs
    );

    if (!teamSeasonRecord) {
      return null;
    }

    // Extract W, L, T, OTL from the record
    const W = teamSeasonRecord.won || 0;
    const L = teamSeasonRecord.lost || 0;
    const T = teamSeasonRecord.tied || 0;
    const OTL = teamSeasonRecord.otl || 0;

    // Calculate G (total games) based on sport
    // Always calculate from W/L/T/OTL to ensure we only count regular season games
    let G: number;
    if (leagueData.sport === 'football') {
      G = W + L + T; // Football includes ties
    } else if (leagueData.sport === 'hockey') {
      G = W + L + OTL; // Hockey includes overtime losses
    } else {
      G = W + L; // Baseball and Basketball
    }

    // Only use gp as a fallback if calculated G is 0 or invalid
    // This ensures we prefer the W+L calculation which is definitely regular season only
    if (G === 0 && teamSeasonRecord.gp && teamSeasonRecord.gp > 0) {
      G = teamSeasonRecord.gp;
    }

    // Calculate window width: W_width = max(1, round(G × 0.125))
    const p = 0.125; // 12.5% tolerance
    const windowWidth = Math.max(1, Math.round(G * p));

    const result = {
      totalGames: G,
      actualWins: W,
      windowWidth: windowWidth,
    };

    return result;
  }, [selectedSeason, selectedTeam, leagueData.teamSeasons, leagueData.sport]);

  // Calculate playoff finish data
  const playoffFinishData = useMemo(() => {
    if (!selectedSeason || !selectedTeam) {
      return null;
    }

    const playoffResult = getTeamPlayoffResult(
      leagueData,
      selectedTeam.tid,
      selectedSeason
    );

    // If no playoffs exist in the league, return null
    if (!playoffResult) {
      return null;
    }

    const { label: finishLabel, value: finishValue, seriesScore, numRounds } = playoffResult;

    const result = {
      finishLabel,
      finishValue,
      seriesScore,
      options: generatePlayoffOptions(numRounds)
    };

    return result;
  }, [selectedSeason, selectedTeam, leagueData.playoffSeries]);

  // Calculate stat leaders from roster
  const statLeaders = useMemo(() => {
    if (roster.length === 0) {
      if (leagueData.sport === 'football') {
        return {
          passingYards: null,
          rushingYards: null,
          receivingYards: null,
          tackles: null,
          sacks: null,
          interceptions: null,
        };
      } else if (leagueData.sport === 'baseball') {
        return {
          hits: null,
          homeRuns: null,
          rbis: null,
          stolenBases: null,
          strikeouts: null,
          wins: null,
        };
      } else if (leagueData.sport === 'hockey') {
        return {
          points: null,
          goals: null,
          assists: null,
          goalieWins: null,
        };
      } else {
        return {
          points: null,
          rebounds: null,
          assists: null,
          steals: null,
          blocks: null,
        };
      }
    }

    if (leagueData.sport === 'football') {
      // Football stat leaders
      const passingYardsLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const leaderYards = (leaderStats as any)?.pssYds || 0;
        const rpYards = (rpStats as any)?.pssYds || 0;
        return rpYards > leaderYards ? rp : leader;
      });

      const rushingYardsLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const leaderYards = (leaderStats as any)?.rusYds || 0;
        const rpYards = (rpStats as any)?.rusYds || 0;
        return rpYards > leaderYards ? rp : leader;
      });

      const receivingYardsLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const leaderYards = (leaderStats as any)?.recYds || 0;
        const rpYards = (rpStats as any)?.recYds || 0;
        return rpYards > leaderYards ? rp : leader;
      });

      const tacklesLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const leaderTackles = ((leaderStats as any)?.defTckSolo || 0) + ((leaderStats as any)?.defTckAst || 0);
        const rpTackles = ((rpStats as any)?.defTckSolo || 0) + ((rpStats as any)?.defTckAst || 0);
        return rpTackles > leaderTackles ? rp : leader;
      });

      const sacksLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const leaderSacks = (leaderStats as any)?.defSk || (leaderStats as any)?.sks || 0;
        const rpSacks = (rpStats as any)?.defSk || (rpStats as any)?.sks || 0;
        return rpSacks > leaderSacks ? rp : leader;
      });

      const interceptionsLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const leaderInts = (leaderStats as any)?.defInt || 0;
        const rpInts = (rpStats as any)?.defInt || 0;
        return rpInts > leaderInts ? rp : leader;
      });

      return {
        passingYards: passingYardsLeader.player.pid,
        rushingYards: rushingYardsLeader.player.pid,
        receivingYards: receivingYardsLeader.player.pid,
        tackles: tacklesLeader.player.pid,
        sacks: sacksLeader.player.pid,
        interceptions: interceptionsLeader.player.pid,
      };
    } else if (leagueData.sport === 'baseball') {
      // Baseball stat leaders
      const hitsLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const leaderHits = (leaderStats as any)?.h || 0;
        const rpHits = (rpStats as any)?.h || 0;
        return rpHits > leaderHits ? rp : leader;
      });

      const homeRunsLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const leaderHR = (leaderStats as any)?.hr || 0;
        const rpHR = (rpStats as any)?.hr || 0;
        return rpHR > leaderHR ? rp : leader;
      });

      const rbisLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const leaderRBI = (leaderStats as any)?.rbi || 0;
        const rpRBI = (rpStats as any)?.rbi || 0;
        return rpRBI > leaderRBI ? rp : leader;
      });

      const stolenBasesLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const leaderSB = (leaderStats as any)?.sb || 0;
        const rpSB = (rpStats as any)?.sb || 0;
        return rpSB > leaderSB ? rp : leader;
      });

      const strikeoutsLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const leaderSO = (leaderStats as any)?.so || (leaderStats as any)?.k || 0;
        const rpSO = (rpStats as any)?.so || (rpStats as any)?.k || 0;
        return rpSO > leaderSO ? rp : leader;
      });

      const winsLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const leaderW = (leaderStats as any)?.w || 0;
        const rpW = (rpStats as any)?.w || 0;
        return rpW > leaderW ? rp : leader;
      });

      return {
        hits: hitsLeader.player.pid,
        homeRuns: homeRunsLeader.player.pid,
        rbis: rbisLeader.player.pid,
        stolenBases: stolenBasesLeader.player.pid,
        strikeouts: strikeoutsLeader.player.pid,
        wins: winsLeader.player.pid,
      };
    } else if (leagueData.sport === 'hockey') {
      // Hockey stat leaders
      const pointsLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        // Calculate points as goals + assists
        const leaderGoals = ((leaderStats as any)?.evG || 0) + ((leaderStats as any)?.ppG || 0) + ((leaderStats as any)?.shG || 0);
        const leaderAssists = ((leaderStats as any)?.evA || 0) + ((leaderStats as any)?.ppA || 0) + ((leaderStats as any)?.shA || 0);
        const leaderPts = leaderGoals + leaderAssists;
        
        const rpGoals = ((rpStats as any)?.evG || 0) + ((rpStats as any)?.ppG || 0) + ((rpStats as any)?.shG || 0);
        const rpAssists = ((rpStats as any)?.evA || 0) + ((rpStats as any)?.ppA || 0) + ((rpStats as any)?.shA || 0);
        const rpPts = rpGoals + rpAssists;
        
        return rpPts > leaderPts ? rp : leader;
      });

      const goalsLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        // Calculate goals as evG + ppG + shG
        const leaderG = ((leaderStats as any)?.evG || 0) + ((leaderStats as any)?.ppG || 0) + ((leaderStats as any)?.shG || 0);
        const rpG = ((rpStats as any)?.evG || 0) + ((rpStats as any)?.ppG || 0) + ((rpStats as any)?.shG || 0);
        return rpG > leaderG ? rp : leader;
      });

      const assistsLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        // Calculate assists as evA + ppA + shA
        const leaderA = ((leaderStats as any)?.evA || 0) + ((leaderStats as any)?.ppA || 0) + ((leaderStats as any)?.shA || 0);
        const rpA = ((rpStats as any)?.evA || 0) + ((rpStats as any)?.ppA || 0) + ((rpStats as any)?.shA || 0);
        return rpA > leaderA ? rp : leader;
      });

      const goalieWinsLeader = roster.reduce((leader, rp) => {
        const leaderStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        // Use gW for goalie wins
        const leaderW = (leaderStats as any)?.gW || 0;
        const rpW = (rpStats as any)?.gW || 0;
        return rpW > leaderW ? rp : leader;
      });

      return {
        points: pointsLeader.player.pid,
        goals: goalsLeader.player.pid,
        assists: assistsLeader.player.pid,
        goalieWins: goalieWinsLeader.player.pid,
      };
    } else {
      // Basketball stat leaders - use totals for consistency with other sports
      const pointsLeader = roster.reduce((leader, rp) => {
        const leaderSeasonStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpSeasonStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );

        const leaderPts = leaderSeasonStats?.pts || 0;
        const rpPts = rpSeasonStats?.pts || 0;

        return rpPts > leaderPts ? rp : leader;
      });

      const reboundsLeader = roster.reduce((leader, rp) => {
        const leaderSeasonStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpSeasonStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );

        const leaderTrb = leaderSeasonStats?.trb || ((leaderSeasonStats?.orb || 0) + (leaderSeasonStats?.drb || 0));
        const rpTrb = rpSeasonStats?.trb || ((rpSeasonStats?.orb || 0) + (rpSeasonStats?.drb || 0));

        return rpTrb > leaderTrb ? rp : leader;
      });

      const assistsLeader = roster.reduce((leader, rp) => {
        const leaderSeasonStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpSeasonStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );

        const leaderAst = leaderSeasonStats?.ast || 0;
        const rpAst = rpSeasonStats?.ast || 0;

        return rpAst > leaderAst ? rp : leader;
      });

      const stealsLeader = roster.reduce((leader, rp) => {
        const leaderSeasonStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpSeasonStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );

        const leaderStl = leaderSeasonStats?.stl || 0;
        const rpStl = rpSeasonStats?.stl || 0;

        return rpStl > leaderStl ? rp : leader;
      });

      const blocksLeader = roster.reduce((leader, rp) => {
        const leaderSeasonStats = leader.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );
        const rpSeasonStats = rp.player.stats?.find(
          s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
        );

        const leaderBlk = leaderSeasonStats?.blk || 0;
        const rpBlk = rpSeasonStats?.blk || 0;

        return rpBlk > leaderBlk ? rp : leader;
      });

      return {
        points: pointsLeader.player.pid,
        rebounds: reboundsLeader.player.pid,
        assists: assistsLeader.player.pid,
        steals: stealsLeader.player.pid,
        blocks: blocksLeader.player.pid,
      };
    }
  }, [roster, selectedSeason, selectedTeam, leagueData.sport]);

  // Helper function to calculate football stats by position
  const calculateFootballStats = (seasonStats: any, position: string) => {
    const avValue = Math.round(seasonStats.av ?? 0);

    const safeDivide = (num: number | undefined, denom: number | undefined): number | undefined => {
      if (num === undefined || denom === undefined || denom === 0) return undefined;
      return num / denom;
    };

    const passAttempts = seasonStats.pss !== undefined ? seasonStats.pss : undefined;
    const passCompletions = seasonStats.pssCmp !== undefined ? seasonStats.pssCmp : undefined;
    const passYds = seasonStats.pssYds !== undefined ? seasonStats.pssYds : undefined;
    const passTD = seasonStats.pssTD !== undefined ? seasonStats.pssTD : undefined;
    const passInt = seasonStats.pssInt !== undefined ? seasonStats.pssInt : undefined;
    const compPctRaw = safeDivide(passCompletions, passAttempts);
    const passYardsPerAttemptRaw = safeDivide(passYds, passAttempts);

    const rushAttempts = seasonStats.rus !== undefined ? seasonStats.rus : undefined;
    const rushYds = seasonStats.rusYds !== undefined ? seasonStats.rusYds : undefined;
    const rushTD = seasonStats.rusTD !== undefined ? seasonStats.rusTD : undefined;
    const rushYardsPerAttemptRaw = safeDivide(rushYds, rushAttempts);

    const targets = seasonStats.tgt !== undefined ? seasonStats.tgt : undefined;
    const receptions = seasonStats.rec !== undefined ? seasonStats.rec : undefined;
    const recYds = seasonStats.recYds !== undefined ? seasonStats.recYds : undefined;
    const recTD = seasonStats.recTD !== undefined ? seasonStats.recTD : undefined;
    const catchPctRaw = safeDivide(receptions, targets);
    const yardsPerTargetRaw = safeDivide(recYds, targets);

    const soloTackles = seasonStats.defTckSolo !== undefined ? seasonStats.defTckSolo : undefined;
    const assistTackles = seasonStats.defTckAst !== undefined ? seasonStats.defTckAst : undefined;
    const tackles = soloTackles !== undefined || assistTackles !== undefined
      ? (soloTackles ?? 0) + (assistTackles ?? 0)
      : undefined;

    const sacks = seasonStats.defSk ?? seasonStats.sks;
    const tacklesForLoss = seasonStats.defTckLoss;
    const forcedFumbles = seasonStats.defFmbFrc ?? seasonStats.ff;
    const passesDefended = seasonStats.defPssDef;
    const interceptions = seasonStats.defInt;
    const interceptionYds = seasonStats.defIntYds;
    const interceptionTD = seasonStats.defIntTD;

    const kickReturnYds = seasonStats.krYds;
    const puntReturnYds = seasonStats.prYds;
    const allPurposeYds = (rushYds ?? 0) + (recYds ?? 0) + (kickReturnYds ?? 0) + (puntReturnYds ?? 0);

    const fgMade =
      (seasonStats.fg0 ?? 0) +
      (seasonStats.fg20 ?? 0) +
      (seasonStats.fg30 ?? 0) +
      (seasonStats.fg40 ?? 0) +
      (seasonStats.fg50 ?? 0);
    const fgAtt =
      (seasonStats.fga0 ?? 0) +
      (seasonStats.fga20 ?? 0) +
      (seasonStats.fga30 ?? 0) +
      (seasonStats.fga40 ?? 0) +
      (seasonStats.fga50 ?? 0);
    const fgPctRaw = fgAtt > 0 ? fgMade / fgAtt : undefined;
    const fgLng = seasonStats.fgLng;
    const extraPoints = seasonStats.xp;

    const punts = seasonStats.pnt;
    const puntYds = seasonStats.pntYds;
    const puntAvgRaw = safeDivide(puntYds, punts);
    const puntsInside20 = seasonStats.pntIn20;
    const puntTouchbacks = seasonStats.pntTB;
    const puntsBlocked = seasonStats.pntBlk;

    const stats: any = {
      line1: null,
      line2: null,
      line3: `AV: ${avValue}`,
      approxValue: avValue,
      passCmp: passCompletions,
      passAtt: passAttempts,
      passYds,
      passTD,
      passInt,
      passCompPct: compPctRaw !== undefined ? parseFloat((compPctRaw * 100).toFixed(1)) : undefined,
      passYardsPerAtt: passYardsPerAttemptRaw !== undefined ? parseFloat(passYardsPerAttemptRaw.toFixed(1)) : undefined,
      rushAtt: rushAttempts,
      rushYds,
      rushTD,
      rushYardsPerAtt: rushYardsPerAttemptRaw !== undefined ? parseFloat(rushYardsPerAttemptRaw.toFixed(1)) : undefined,
      targets,
      receptions,
      recYds,
      recTD,
      catchPct: catchPctRaw !== undefined ? parseFloat((catchPctRaw * 100).toFixed(1)) : undefined,
      yardsPerTarget: yardsPerTargetRaw !== undefined ? parseFloat(yardsPerTargetRaw.toFixed(1)) : undefined,
      tackles,
      soloTackles,
      assistTackles,
      sacks: sacks !== undefined ? parseFloat(sacks.toFixed(1)) : undefined,
      tacklesForLoss,
      forcedFumbles,
      passesDefended,
      interceptions,
      interceptionYds,
      interceptionTD,
      kickReturnYds,
      puntReturnYds,
      allPurposeYds,
      fieldGoalsMade: fgMade || fgAtt ? fgMade : undefined,
      fieldGoalsAtt: fgMade || fgAtt ? fgAtt : undefined,
      fieldGoalPct: fgPctRaw !== undefined ? parseFloat((fgPctRaw * 100).toFixed(1)) : undefined,
      fieldGoalLong: fgLng,
      extraPointsMade: extraPoints,
      punts,
      puntYds,
      puntAvg: puntAvgRaw !== undefined ? parseFloat(puntAvgRaw.toFixed(1)) : undefined,
      puntsInside20,
      puntTouchbacks,
      puntsBlocked,
    };

    switch (position) {
      case 'QB': {
        const displayCompPct = stats.passCompPct !== undefined ? `${stats.passCompPct}%` : null;
        const displayYpa = stats.passYardsPerAtt !== undefined ? stats.passYardsPerAtt.toFixed(1) : null;
        stats.line1 = `${passYds ?? 0}/${passTD ?? 0}/${passInt ?? 0}`;
        stats.line2 =
          displayCompPct && displayYpa
            ? `${displayCompPct} / ${displayYpa}`
            : displayCompPct ?? displayYpa;
        return stats;
      }

      case 'RB': {
        const displayCatchPct = stats.catchPct !== undefined ? `${stats.catchPct}%` : null;
        const displayYpc = stats.rushYardsPerAtt !== undefined ? stats.rushYardsPerAtt.toFixed(1) : null;
        stats.line1 = `${rushYds ?? 0}/${rushTD ?? 0}/${rushAttempts ?? 0}`;
        stats.line2 =
          displayCatchPct && displayYpc
            ? `${displayCatchPct} / ${displayYpc}`
            : displayCatchPct ?? displayYpc;
        return stats;
      }

      case 'WR':
      case 'TE': {
        const displayCatchPct = stats.catchPct !== undefined ? `${stats.catchPct}%` : null;
        const displayYpt = stats.yardsPerTarget !== undefined ? stats.yardsPerTarget.toFixed(1) : null;
        stats.line1 = `${receptions ?? 0}/${recYds ?? 0}/${recTD ?? 0}`;
        stats.line2 =
          displayCatchPct && displayYpt
            ? `${displayCatchPct} / ${displayYpt}`
            : displayCatchPct ?? displayYpt;
        return stats;
      }

      case 'DL': {
        stats.line1 = `${tackles ?? 0}/${stats.sacks ?? 0}/${forcedFumbles ?? 0}`;
        stats.line2 = `${tacklesForLoss ?? 0} / ${passesDefended ?? 0}`;
        return stats;
      }

      case 'LB': {
        stats.line1 = `${tackles ?? 0}/${stats.sacks ?? 0}/${interceptions ?? 0}`;
        stats.line2 = `${tacklesForLoss ?? 0} / ${passesDefended ?? 0}`;
        return stats;
      }

      case 'CB':
      case 'S': {
        stats.line1 = `${tackles ?? 0}/${interceptions ?? 0}/${passesDefended ?? 0}`;
        stats.line2 = `${interceptionYds ?? 0}/${interceptionTD ?? 0}`;
        return stats;
      }

      case 'K': {
        const displayFgPct = stats.fieldGoalPct !== undefined ? `${stats.fieldGoalPct}%` : null;
        stats.line1 = `${stats.fieldGoalsMade ?? 0}/${stats.fieldGoalsAtt ?? 0}/${extraPoints ?? 0}`;
        stats.line2 = displayFgPct
          ? `${displayFgPct} / ${fgLng ?? 0}`
          : `${fgLng ?? 0}`;
        return stats;
      }

      case 'P': {
        stats.line1 =
          stats.puntAvg !== undefined
            ? `${punts ?? 0}/${puntYds ?? 0}/${stats.puntAvg}`
            : `${punts ?? 0}/${puntYds ?? 0}`;
        stats.line2 = `${puntsInside20 ?? 0}/${puntTouchbacks ?? 0}/${puntsBlocked ?? 0}`;
        return stats;
      }

      default:
        return stats;
    }
  };

  // Helper function to remove leading zero from decimal stats
  const removeLeadingZero = (value: string): string => {
    if (value.startsWith('0.')) {
      return value.substring(1);
    }
    return value;
  };

  // Helper function to calculate baseball stats by position
  const calculateBaseballStats = (seasonStats: any, position: string) => {
    const isPitcher = position === 'SP' || position === 'RP';

    const stats: any = {
      line1: null,
      line2: null,
      line3: null,
    };

    if (isPitcher) {
      const warRaw = seasonStats.war;
      const war = warRaw !== undefined ? parseFloat(warRaw.toFixed(1)) : undefined;
      const wins = seasonStats.w;
      const losses = seasonStats.l;
      const outs = seasonStats.outs ?? 0;
      const earnedRuns = seasonStats.er ?? 0;
      const eraRaw = outs > 0 ? (27 * earnedRuns) / outs : undefined;

      const games = seasonStats.gpPit !== undefined ? seasonStats.gpPit : seasonStats.gp;
      const gamesStarted = seasonStats.gsPit !== undefined ? seasonStats.gsPit : seasonStats.gs;
      const saves = seasonStats.sv;

      const ipWhole = Math.floor(outs / 3);
      const ipRemainder = outs % 3;
      const ipDisplay = `${ipWhole}.${ipRemainder}`;

      const strikeouts = seasonStats.soPit;
      const walks = seasonStats.bbPit;
      const hitsAllowed = seasonStats.hPit;
      const whipRaw = outs > 0 ? (3 * ((walks ?? 0) + (hitsAllowed ?? 0))) / outs : undefined;
      const soPerNineRaw = outs > 0 ? (strikeouts ?? 0) * 27 / outs : undefined;
      const bbPerNineRaw = outs > 0 ? (walks ?? 0) * 27 / outs : undefined;

      stats.line1 = eraRaw !== undefined
        ? `${war !== undefined ? war.toFixed(1) : '0.0'}/${wins ?? 0}/${losses ?? 0}/${removeLeadingZero(eraRaw.toFixed(2))}`
        : `${war !== undefined ? war.toFixed(1) : '0.0'}/${wins ?? 0}/${losses ?? 0}`;
      stats.line2 = `${games ?? 0}/${gamesStarted ?? 0}/${saves ?? 0}`;
      stats.line3 = whipRaw !== undefined
        ? `${ipDisplay}/${strikeouts ?? 0}/${removeLeadingZero(whipRaw.toFixed(2))}`
        : `${ipDisplay}/${strikeouts ?? 0}`;

      stats.war = war;
      stats.games = games;
      stats.gamesStarted = gamesStarted;
      stats.wins = wins;
      stats.losses = losses;
      stats.saves = saves;
      stats.ip = ipDisplay;
      stats.era = eraRaw !== undefined ? parseFloat(eraRaw.toFixed(2)) : undefined;
      stats.whip = whipRaw !== undefined ? parseFloat(whipRaw.toFixed(2)) : undefined;
      stats.strikeouts = strikeouts;
      stats.walks = walks;
      stats.hitsAllowed = hitsAllowed;
      stats.soPerNine = soPerNineRaw !== undefined ? parseFloat(soPerNineRaw.toFixed(1)) : undefined;
      stats.bbPerNine = bbPerNineRaw !== undefined ? parseFloat(bbPerNineRaw.toFixed(1)) : undefined;
      stats.outsRecorded = outs;

      return stats;
    }

    const warRaw = seasonStats.war;
    const war = warRaw !== undefined ? parseFloat(warRaw.toFixed(1)) : undefined;
    const pa = seasonStats.pa ?? 0;
    const bb = seasonStats.bb ?? 0;
    const hbp = seasonStats.hbp ?? 0;
    const sf = seasonStats.sf ?? 0;
    const sh = seasonStats.sh ?? 0;
    const atBats = pa - bb - hbp - sf - sh;
    const hits = seasonStats.h ?? 0;
    const doubles = seasonStats['2b'] ?? 0;
    const triples = seasonStats['3b'] ?? 0;
    const homeRuns = seasonStats.hr ?? 0;
    const runs = seasonStats.r ?? 0;
    const rbi = seasonStats.rbi ?? 0;
    const stolenBases = seasonStats.sb ?? 0;
    const walks = bb;
    const strikeouts = seasonStats.so ?? undefined;

    const singles = hits - doubles - triples - homeRuns;
    const totalBases = singles + 2 * doubles + 3 * triples + 4 * homeRuns;

    const battingAverageRaw = atBats > 0 ? hits / atBats : undefined;
    const obpDenom = atBats + bb + hbp + sf;
    const obpRaw = obpDenom > 0 ? (hits + bb + hbp) / obpDenom : undefined;
    const sluggingRaw = atBats > 0 ? totalBases / atBats : undefined;
    const opsRaw = obpRaw !== undefined && sluggingRaw !== undefined ? obpRaw + sluggingRaw : undefined;

    stats.line1 = battingAverageRaw !== undefined
      ? `${war !== undefined ? war.toFixed(1) : '0.0'}/${pa}/${hits}/${homeRuns}/${removeLeadingZero(battingAverageRaw.toFixed(3))}`
      : `${war !== undefined ? war.toFixed(1) : '0.0'}/${pa}/${hits}/${homeRuns}`;
    stats.line2 = `${runs}/${rbi}/${stolenBases}`;
    stats.line3 = opsRaw !== undefined
      ? `${removeLeadingZero((obpRaw ?? 0).toFixed(3))}/${removeLeadingZero((sluggingRaw ?? 0).toFixed(3))}/${removeLeadingZero(opsRaw.toFixed(3))}`
      : obpRaw !== undefined && sluggingRaw !== undefined
        ? `${removeLeadingZero(obpRaw.toFixed(3))}/${removeLeadingZero(sluggingRaw.toFixed(3))}`
        : obpRaw !== undefined
          ? removeLeadingZero(obpRaw.toFixed(3))
          : sluggingRaw !== undefined
            ? removeLeadingZero(sluggingRaw.toFixed(3))
            : null;

    stats.war = war;
    stats.plateAppearances = pa;
    stats.atBats = atBats;
    stats.hits = hits;
    stats.doubles = doubles;
    stats.triples = triples;
    stats.homeRuns = homeRuns;
    stats.runs = runs;
    stats.rbi = rbi;
    stats.stolenBases = stolenBases;
    stats.walks = walks;
    stats.strikeouts = strikeouts;
    stats.battingAverage = battingAverageRaw !== undefined ? parseFloat(battingAverageRaw.toFixed(3)) : undefined;
    stats.onBasePct = obpRaw !== undefined ? parseFloat(obpRaw.toFixed(3)) : undefined;
    stats.sluggingPct = sluggingRaw !== undefined ? parseFloat(sluggingRaw.toFixed(3)) : undefined;
    stats.ops = opsRaw !== undefined ? parseFloat(opsRaw.toFixed(3)) : undefined;
    stats.hitByPitch = hbp;
    stats.sacFly = sf;
    stats.sacBunt = sh;

    return stats;
  };

  // Helper function to calculate hockey stats by position
  const calculateHockeyStats = (seasonStats: any, position: string) => {
    const safeDivide = (num: number | undefined, denom: number | undefined): number | undefined => {
      if (num === undefined || denom === undefined || denom === 0) return undefined;
      return num / denom;
    };

    const formatMinutes = (totalMinutes: number) => {
      const mins = Math.floor(totalMinutes);
      const secs = Math.round((totalMinutes - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const stats: any = {
      line1: null,
      line2: null,
      line3: null,
    };

    if (position === 'G') {
      const wins = seasonStats.gW ?? 0;
      const losses = seasonStats.gL ?? 0;
      const otl = seasonStats.gOTL;
      const shutouts = seasonStats.shutouts ?? 0;
      const saves = seasonStats.sv ?? 0;
      const goalsAgainst = seasonStats.ga ?? 0;
      const minutesRaw = seasonStats.gMin ?? seasonStats.min ?? 0;
      const shotsAgainst = seasonStats.sa;
      const games = seasonStats.gpGoalie ?? seasonStats.gp ?? undefined;
      const starts = seasonStats.gs ?? undefined;

      const svPctRaw = safeDivide(saves, (saves ?? 0) + (goalsAgainst ?? 0));
      const gaaRaw = safeDivide(60 * goalsAgainst, minutesRaw);

      stats.line1 = `${wins}/${losses}/${shutouts}`;
      stats.line2 = svPctRaw !== undefined ? `${(svPctRaw * 100).toFixed(1)}%` : null;
      stats.line3 = gaaRaw !== undefined ? gaaRaw.toFixed(2) : null;

      stats.wins = wins;
      stats.losses = losses;
      stats.overtimeLosses = otl;
      stats.shutouts = shutouts;
      stats.saves = saves;
      stats.goalsAgainst = goalsAgainst;
      stats.minutes = minutesRaw ? formatMinutes(minutesRaw) : undefined;
      stats.rawMinutes = minutesRaw;
      stats.savePct = svPctRaw !== undefined ? parseFloat((svPctRaw * 100).toFixed(1)) : undefined;
      stats.gaa = gaaRaw !== undefined ? parseFloat(gaaRaw.toFixed(2)) : undefined;
      stats.shotsAgainst = shotsAgainst;
      stats.games = games;
      stats.starts = starts;

      return stats;
    }

    const evG = seasonStats.evG ?? 0;
    const ppG = seasonStats.ppG ?? 0;
    const shG = seasonStats.shG ?? 0;
    const evA = seasonStats.evA ?? 0;
    const ppA = seasonStats.ppA ?? 0;
    const shA = seasonStats.shA ?? 0;
    const plusMinus = seasonStats.pm;
    const pim = seasonStats.pim;
    const minutesRaw = seasonStats.min ?? 0;
    const gp = seasonStats.gp ?? 0;
    const fow = seasonStats.fow;
    const fol = seasonStats.fol;
    const faceoffPctRaw = safeDivide(fow, (fow ?? 0) + (fol ?? 0));

    const goals = evG + ppG + shG;
    const assists = evA + ppA + shA;
    const points = goals + assists;
    const toiAvg = gp > 0 ? formatMinutes(minutesRaw / gp) : null;

    stats.line1 = `${goals}/${assists}/${points}`;
    stats.line2 = plusMinus !== undefined ? `${plusMinus >= 0 ? '+' : ''}${plusMinus}` : null;
    stats.line3 = toiAvg;

    stats.goals = goals;
    stats.assists = assists;
    stats.points = points;
    stats.plusMinus = plusMinus;
    stats.penaltyMinutes = pim;
    stats.evenStrengthGoals = evG;
    stats.powerPlayGoals = ppG;
    stats.shortHandedGoals = shG;
    stats.evenStrengthAssists = evA;
    stats.powerPlayAssists = ppA;
    stats.shortHandedAssists = shA;
    stats.faceoffsWon = fow;
    stats.faceoffsLost = fol;
    stats.faceoffPct = faceoffPctRaw !== undefined ? parseFloat((faceoffPctRaw * 100).toFixed(1)) : undefined;
    stats.timeOnIce = minutesRaw ? formatMinutes(minutesRaw) : undefined;
    stats.avgTimeOnIce = toiAvg;
    stats.games = gp;

    return stats;
  };

  // Build roster for selected season/team
  const buildRoster = useCallback((season: number, team: Team) => {
    const rosterPlayers: RosterPlayer[] = [];

    leagueData.players.forEach(player => {
      const seasonStats = player.stats?.find(
        s => !s.playoffs && s.season === season && s.tid === team.tid
      );
      
      if (seasonStats && seasonStats.gp && seasonStats.gp > 0) {
        // Get position for this season
        const rating = player.ratings?.find(r => r.season === season);
        const position = rating?.pos || player.pos || 'F';

        // Get jersey number from season stats
        const jerseyNumber = seasonStats.jerseyNumber;

        // Get team colors for this season (season-specific or default)
        const seasonInfo = team.seasons?.find(s => s.season === season);
        const teamColors = seasonInfo?.colors || team.colors || ['#000000', '#ffffff', '#cccccc'];

        // Calculate age
        const age = player.born?.year ? season - player.born.year : undefined;

        let stats: any;
        let advancedStats: any = undefined;

        if (leagueData.sport === 'football') {
          // Football stats
          stats = calculateFootballStats(seasonStats, position);
        } else if (leagueData.sport === 'hockey') {
          // Hockey stats
          stats = calculateHockeyStats(seasonStats, position);
        } else if (leagueData.sport === 'baseball') {
          // Baseball stats
          stats = calculateBaseballStats(seasonStats, position);
        } else if (leagueData.sport === 'basketball') {
          // Basketball stats
          const gp = seasonStats.gp;
          const mpg = seasonStats.min ? seasonStats.min / gp : 0;
          const ppg = seasonStats.pts ? seasonStats.pts / gp : 0;
          const totalReb = seasonStats.trb || ((seasonStats.orb || 0) + (seasonStats.drb || 0));
          const rpg = totalReb / gp;
          const apg = seasonStats.ast ? seasonStats.ast / gp : 0;
          const stl = seasonStats.stl || 0;
          const blk = seasonStats.blk || 0;
          const spg = stl / gp;
          const bpg = blk / gp;

          const fg = seasonStats.fg || 0;
          const fga = seasonStats.fga || 0;
          const fgp = fga > 0 ? (fg / fga) * 100 : 0;

          const tp = seasonStats.tpm || seasonStats.tp || 0;
          const tpa = seasonStats.tpa || 0;
          const tpp = tpa > 0 ? (tp / tpa) * 100 : 0;

          const ft = seasonStats.ft || 0;
          const fta = seasonStats.fta || 0;
          const ftp = fta > 0 ? (ft / fta) * 100 : 0;

          const tsDenominator = 2 * (fga + 0.44 * fta);
          const ts = tsDenominator > 0 ? ((seasonStats.pts || 0) / tsDenominator) * 100 : 0;

          const missedFG = fga - fg;
          const missedFT = fta - ft;
          const per = ((seasonStats.pts || 0) + totalReb + (seasonStats.ast || 0) + stl + blk - missedFG - missedFT) / gp;

          stats = { mpg, ppg, rpg, apg, spg, bpg, per };
          advancedStats = { fgp, tpp, ftp, ts, per };
        } else {
          // Default/placeholder for other sports
          stats = {};
        }

        // For hockey and baseball, augment raw season stats with computed totals for TeamInfoModal
        let augmentedSeasonStats = seasonStats;
        if (leagueData.sport === 'hockey') {
          if (position === 'G') {
            // Goalie stats - already have the right keys
            augmentedSeasonStats = { ...seasonStats };
          } else {
            // Skater stats - compute totals from even strength, power play, and short-handed
            const evG = seasonStats.evG ?? 0;
            const ppG = seasonStats.ppG ?? 0;
            const shG = seasonStats.shG ?? 0;
            const evA = seasonStats.evA ?? 0;
            const ppA = seasonStats.ppA ?? 0;
            const shA = seasonStats.shA ?? 0;
            const goals = evG + ppG + shG;
            const assists = evA + ppA + shA;
            const points = goals + assists;

            augmentedSeasonStats = {
              ...seasonStats,
              g: goals,
              a: assists,
              pts: points,
            };
          }
        } else if (leagueData.sport === 'baseball') {
          const isPitcher = position === 'SP' || position === 'RP' || position === 'P';

          // Check if this is a pitching row by looking for outs or ip
          const hasOuts = seasonStats.outs != null && seasonStats.outs > 0;
          const hasIp = seasonStats.ip != null && seasonStats.ip > 0;

          if (isPitcher && (hasOuts || hasIp)) {
            // Pitcher stats - convert outs to IP if needed, and normalize field names
            let ip: number;
            if (hasOuts) {
              const outs = seasonStats.outs ?? 0;
              const ipWhole = Math.floor(outs / 3);
              const ipRemainder = outs % 3;
              ip = ipWhole + (ipRemainder / 10); // Convert to decimal (e.g., 125.1)
            } else {
              ip = seasonStats.ip ?? 0; // IP already provided
            }

            // Baseball GM stores both batting and pitching stats in same object
            // For pitchers, use the "Pit" suffix versions (hPit, bbPit, soPit, hrPit)
            const h = seasonStats.hPit ?? seasonStats.h;
            const bb = seasonStats.bbPit ?? seasonStats.bb;
            const so = seasonStats.soPit ?? seasonStats.so;
            const hr = seasonStats.hrPit ?? seasonStats.hr;

            augmentedSeasonStats = {
              ...seasonStats,
              ip: ip,
              h: h ?? 0,
              bb: bb ?? 0,
              so: so ?? 0,
              hr: hr ?? 0,
            };
          } else {
            // Hitter stats - already have the right keys
            augmentedSeasonStats = { ...seasonStats };
          }
        }

        rosterPlayers.push({
          player,
          revealed: false,
          hintShown: false,
          gamesPlayed: seasonStats.gp,
          stats, // Calculated per-game stats for tile display
          rawSeasonStats: augmentedSeasonStats, // Raw season totals for TeamInfoModal
          advancedStats,
          position,
          jerseyNumber,
          teamColors,
          age,
        });
      }
    });

    // Define the desired position order for each sport
    const sportPositionOrder: Record<string, string[]> = {
      basketball: ['PG', 'G', 'SG', 'GF', 'SF', 'F', 'PF', 'FC', 'C'],
      football: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'],
      hockey: ['C', 'W', 'D', 'G'],
      baseball: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'],
      // Add other sports here if needed
    };

    const positionOrder = sportPositionOrder[leagueData.sport || 'basketball'] || [];

    // Sort by position, then games played, then alphabetically
    rosterPlayers.sort((a, b) => {
      const posA = positionOrder.indexOf(a.position);
      const posB = positionOrder.indexOf(b.position);

      // Handle positions not found in the defined order (e.g., -1), placing them at the end
      if (posA === -1 && posB !== -1) return 1;
      if (posB === -1 && posA !== -1) return -1;
      if (posA !== posB) {
        return posA - posB;
      }
      if (b.gamesPlayed !== a.gamesPlayed) {
        return b.gamesPlayed - a.gamesPlayed;
      }
      return a.player.name.localeCompare(b.player.name);
    });

    setRoster(rosterPlayers);
    setFoundCount(0);
  }, [leagueData.players]);

  // Handler for opening opponent team modal
  const handleOpenOpponentTeam = useCallback((opponentTid: number, season: number) => {
    pushModal({ type: 'team', tid: opponentTid, season });
  }, [pushModal]);

  // Helper function to build team roster data for modals
  const buildTeamRosterForModal = useCallback((tid: number, season: number) => {
    const rosterData: any[] = [];
    leagueData.players.forEach(player => {
      const seasonStats = player.stats?.find(
        s => !s.playoffs && s.season === season && s.tid === tid
      );

      if (seasonStats && seasonStats.gp && seasonStats.gp > 0) {
        const rating = player.ratings?.find(r => r.season === season);
        const position = rating?.pos || player.pos || 'F';
        const age = player.born?.year ? season - player.born.year : undefined;

        // For hockey, augment raw season stats with computed totals for TeamInfoModal
        let augmentedSeasonStats = seasonStats;
        if (leagueData.sport === 'hockey') {
          if (position === 'G') {
            augmentedSeasonStats = { ...seasonStats };
          } else {
            const evG = seasonStats.evG ?? 0;
            const ppG = seasonStats.ppG ?? 0;
            const shG = seasonStats.shG ?? 0;
            const evA = seasonStats.evA ?? 0;
            const ppA = seasonStats.ppA ?? 0;
            const shA = seasonStats.shA ?? 0;
            const goals = evG + ppG + shG;
            const assists = evA + ppA + shA;
            const points = goals + assists;

            augmentedSeasonStats = {
              ...seasonStats,
              g: goals,
              a: assists,
              pts: points,
            };
          }
        }

        rosterData.push({
          player,
          position,
          age,
          gamesPlayed: seasonStats.gp,
          stats: augmentedSeasonStats,
          yearsWithTeam: calculateYearsWithTeam(player, tid, season),
          ovr: getPlayerRating(player, season, 'ovr'),
          pot: getPlayerRating(player, season, 'pot'),
          contract: formatContract(player, season),
        });
      }
    });
    return rosterData;
  }, [leagueData.players, leagueData.sport]);

  // Pick random season and team
  const pickRandomTeamAndSeason = useCallback(() => {
    if (allSeasons.length === 0 || allTeams.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid teams or seasons found.',
        variant: 'destructive',
      });
      return;
    }

    // Filter seasons by year range if set
    const filteredSeasons = yearRange
      ? allSeasons.filter(season => season >= yearRange[0] && season <= yearRange[1])
      : allSeasons;

    if (filteredSeasons.length === 0) {
      toast({
        title: 'Error',
        description: 'No seasons found in the selected year range.',
        variant: 'destructive',
      });
      return;
    }

    const randomSeason = filteredSeasons[Math.floor(Math.random() * filteredSeasons.length)];
    
    // Find teams with players in this season
    const teamsInSeason = new Set<number>();
    leagueData.players.forEach(player => {
      player.stats?.forEach(stat => {
        if (!stat.playoffs && stat.season === randomSeason && stat.gp && stat.gp > 0) {
          teamsInSeason.add(stat.tid);
        }
      });
    });

    // Also ensure team has wins data in teamSeasons
    const teamsWithWinsData = new Set<number>();
    if (leagueData.teamSeasons) {
      leagueData.teamSeasons.forEach(ts => {
        if (ts.season === randomSeason && !ts.playoffs) {
          teamsWithWinsData.add(ts.tid);
        }
      });
    }

    // Filter to teams that have BOTH player stats AND wins data
    let validTeams = allTeams.filter(team =>
      teamsInSeason.has(team.tid) && teamsWithWinsData.has(team.tid)
    );

    // Apply team filter if set
    if (teamFilter !== null) {
      validTeams = validTeams.filter(team => team.tid === teamFilter);
    }

    if (validTeams.length === 0) {
      toast({
        title: 'Error',
        description: teamFilter !== null
          ? 'No valid seasons found for the selected team in the year range.'
          : 'No teams found for the selected season.',
        variant: 'destructive',
      });
      return;
    }

    const randomTeam = validTeams[Math.floor(Math.random() * validTeams.length)];

    setSelectedSeason(randomSeason);
    setSelectedTeam(randomTeam);
    buildRoster(randomSeason, randomTeam);
    setGuess('');
    setScore(0); // Reset score for new game
  }, [allSeasons, allTeams, buildRoster, leagueData.players, leagueData.teamSeasons, toast, yearRange, teamFilter]);

  // One-time migration from localStorage to IndexedDB
  useEffect(() => {
    let mounted = true;

    async function runMigration() {
      try {
        const result = await migrateFromLocalStorage();
        if (mounted && result.migrated > 0) {
          console.log(`[History] Migrated ${result.migrated} entries from localStorage to IndexedDB`);
        }
      } catch (error) {
        console.error('[History] Migration failed:', error);
      }
    }

    runMigration();

    return () => {
      mounted = false;
    };
  }, []); // Run once on mount

  // Load game history on mount and filter by current league
  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      try {
        const allHistory = await loadGameHistory();
        // Filter to only show games from the current league
        const filteredHistory = leagueFingerprintId
          ? allHistory.filter(entry => entry.leagueFingerprintId === leagueFingerprintId)
          : allHistory;

        if (mounted) {
          setGameHistory(filteredHistory);
        }
      } catch (error) {
        console.error('[History] Failed to load history:', error);
      }
    }

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [leagueFingerprintId]);

  // Initialize on mount - wait for yearRange to be set first
  useEffect(() => {
    if (yearRange !== null && !hasInitialized.current) {
      hasInitialized.current = true;
      pickRandomTeamAndSeason();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearRange]);

  // Auto-show help modal on first visit
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem('team-trivia-help-seen');
    if (!hasSeenHelp) {
      setShowHelpModal(true);
      localStorage.setItem('team-trivia-help-seen', 'true');
    }
  }, []);

  // When season or team changes, rebuild roster
  useEffect(() => {
    if (selectedSeason !== null && selectedTeam) {
      buildRoster(selectedSeason, selectedTeam);
      setGuess('');
      setLogoError(false); // Reset logo error state when team/season changes
    }
  }, [selectedSeason, selectedTeam, buildRoster]);

  // Initialize year range when allSeasons is available
  useEffect(() => {
    if (allSeasons.length > 0 && yearRange === null) {
      // Use initialYearRange if provided, otherwise default to full range
      if (initialYearRange) {
        setYearRange(initialYearRange);
        setLastSavedYearRange(initialYearRange);
      } else {
        const minYear = Math.min(...allSeasons);
        const maxYear = Math.max(...allSeasons);
        const defaultRange: [number, number] = [minYear, maxYear];
        setYearRange(defaultRange);
        setLastSavedYearRange(defaultRange);
      }
    }
  }, [allSeasons, yearRange, initialYearRange]);

  // Initialize team filter from saved value
  useEffect(() => {
    if (initialTeamFilter !== undefined && teamFilter === null && lastSavedTeamFilter === null) {
      setTeamFilter(initialTeamFilter);
      setLastSavedTeamFilter(initialTeamFilter);
    }
  }, [initialTeamFilter, teamFilter, lastSavedTeamFilter]);

  // Sync input states with yearRange when it changes or popover opens
  useEffect(() => {
    if (yearRange && yearRangeOpen) {
      setYearFromInput(yearRange[0].toString());
      setYearToInput(yearRange[1].toString());
    }
  }, [yearRange, yearRangeOpen]);

  // Apply year range from input
  const applyYearFromInput = useCallback(() => {
    if (!yearRange || allSeasons.length === 0) return;
    const val = parseInt(yearFromInput);
    if (!isNaN(val)) {
      const minYear = Math.min(...allSeasons);
      const maxYear = Math.max(...allSeasons);
      const clampedVal = Math.max(minYear, Math.min(val, yearRange[1]));
      setYearRange([clampedVal, yearRange[1]]);
      setYearFromInput(clampedVal.toString());
    } else {
      // Reset to current value if invalid
      setYearFromInput(yearRange[0].toString());
    }
  }, [yearFromInput, yearRange, allSeasons]);

  const applyYearToInput = useCallback(() => {
    if (!yearRange || allSeasons.length === 0) return;
    const val = parseInt(yearToInput);
    if (!isNaN(val)) {
      const minYear = Math.min(...allSeasons);
      const maxYear = Math.max(...allSeasons);
      const clampedVal = Math.min(maxYear, Math.max(val, yearRange[0]));
      setYearRange([yearRange[0], clampedVal]);
      setYearToInput(clampedVal.toString());
    } else {
      // Reset to current value if invalid
      setYearToInput(yearRange[1].toString());
    }
  }, [yearToInput, yearRange, allSeasons]);

  // Save year range and team filter to storage when popover closes
  const handleYearRangePopoverChange = useCallback(async (open: boolean) => {
    // If closing, check if year range or team filter changed before saving
    if (!open && leagueId) {
      const yearRangeChanged = yearRange && (!lastSavedYearRange ||
        yearRange[0] !== lastSavedYearRange[0] ||
        yearRange[1] !== lastSavedYearRange[1]);

      const teamFilterChanged = teamFilter !== lastSavedTeamFilter;

      if (yearRangeChanged || teamFilterChanged) {
        setIsSavingYearRange(true);
        try {
          if (yearRangeChanged && yearRange) {
            await updateYearRange(leagueId, yearRange);
            setLastSavedYearRange(yearRange);
          }
          if (teamFilterChanged) {
            await updateTeamFilter(leagueId, teamFilter);
            setLastSavedTeamFilter(teamFilter);
          }
        } catch (err) {
          console.error('Failed to save settings:', err);
        } finally {
          setIsSavingYearRange(false);
          setYearRangeOpen(open);
        }
      } else {
        // No change, just close
        setYearRangeOpen(open);
      }
    } else {
      setYearRangeOpen(open);
    }
  }, [yearRange, leagueId, lastSavedYearRange, teamFilter, lastSavedTeamFilter]);

  // Team display info (season-aligned)
  const teamDisplayInfo = useMemo(() => {
    if (!selectedTeam || selectedSeason === null) {
      return { name: '', abbrev: '', logo: null, logoUrl: undefined, colors: ['#000000', '#ffffff', '#cccccc'] };
    }

    const seasonInfo = selectedTeam.seasons?.find(s => s.season === selectedSeason);
    const name = seasonInfo?.region && seasonInfo?.name
      ? `${seasonInfo.region} ${seasonInfo.name}`
      : selectedTeam.region && selectedTeam.name
      ? `${selectedTeam.region} ${selectedTeam.name}`
      : selectedTeam.abbrev || 'Unknown Team';

    const abbrev = seasonInfo?.abbrev || selectedTeam.abbrev || '';
    const logo = seasonInfo?.imgURL || selectedTeam.imgURL;
    const logoUrl = getTeamLogoUrl(logo, leagueData.sport);
    const colors = seasonInfo?.colors || selectedTeam.colors || ['#000000', '#ffffff', '#cccccc'];

    return { name, abbrev, logo, logoUrl, colors };
  }, [selectedTeam, selectedSeason, leagueData.sport]);

  // Filter ALL players in league matching current guess
  const autocompleteSuggestions = useMemo(() => {
    if (!guess.trim()) {
      return [];
    }

    const normalizedGuess = normalizeName(guess);
    const revealedPids = new Set(roster.filter(rp => rp.revealed).map(rp => rp.player.pid));

    // Search through ALL league players
    return leagueData.players
      .filter(player => {
        // Exclude already-revealed players from current roster
        if (revealedPids.has(player.pid)) return false;

        const normalizedName = normalizeName(player.name);
        return normalizedName.includes(normalizedGuess);
      })
      .slice(0, 8);
  }, [guess, roster, leagueData.players]);

  // Open/close autocomplete
  useEffect(() => {
    setAutocompleteOpen(autocompleteSuggestions.length > 0 && guess.trim().length > 0);
    setActiveIndex(-1);
  }, [autocompleteSuggestions, guess]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteOpen &&
        autocompleteRef.current &&
        inputRef.current &&
        !autocompleteRef.current.contains(event.target as Node) &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setAutocompleteOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [autocompleteOpen]);

  // Helper function to add score to breakdown
  const addToScoreBreakdown = useCallback((round: string, roundLabel: string, points: number, details: string) => {
    setScoreBreakdown(prev => {
      const existing = prev.find(r => r.round === round);
      if (existing) {
        // Update existing round
        return prev.map(r =>
          r.round === round
            ? { ...r, guesses: r.guesses + 1, points: r.points + points, details: r.details + ', ' + details }
            : r
        );
      } else {
        // Add new round
        return [...prev, { round, roundLabel, guesses: 1, points, details }];
      }
    });
  }, []);

  // Progress to next round
  const handleNextRound = useCallback(() => {
    const currentIndex = ROUND_ORDER.indexOf(currentRound as any);
    if (currentIndex < ROUND_ORDER.length - 1) {
      const nextRound = ROUND_ORDER[currentIndex + 1];
      setCurrentRound(nextRound);
      setSelectedLeader(null);
      setClickedLeaderInfo(null); // Clear the clicked leader info when moving to next round

      // Show hints when moving from 'guess' to 'hint' round
      if (currentRound === 'guess' && nextRound === 'hint') {
        setRoster(prev => prev.map(rp => {
          if (!rp.revealed && !rp.hintShown) {
            return { ...rp, hintShown: true };
          }
          return rp;
        }));
      }

      // Auto-reveal all players when entering the first leader round
      if (nextRound === 'points-leader' || nextRound === 'passing-yards-leader' || nextRound === 'hits-leader') {
        setRoster(prev => prev.map(rp => ({ ...rp, revealed: true })));
        setFoundCount(roster.length);
      }

      // Trigger bounce animation for leader rounds
      if (nextRound.endsWith('-leader')) {
        setTriggerBounceAnimation(true);
        setTimeout(() => setTriggerBounceAnimation(false), 1000); // Reset after animation
      }
    }
  }, [currentRound, roster.length]);

  // Handle selecting a player (from autocomplete)
  const handleSelectPlayer = useCallback((player: Player) => {
    // Check if player is on the current roster
    const rosterPlayer = roster.find(rp => rp.player.pid === player.pid);

    if (rosterPlayer && !rosterPlayer.revealed) {
      // Player is on roster - reveal them
      setRoster(prev => prev.map(rp =>
        rp.player.pid === player.pid
          ? { ...rp, revealed: true }
          : rp
      ));
      const newFoundCount = foundCount + 1;
      setFoundCount(newFoundCount);

      // Track correct guess for detailed game data
      setDetailedGameData(prev => ({
        ...prev,
        playerGuesses: [
          ...prev.playerGuesses,
          { player, correct: true, round: currentRound === 'hint' ? 'hint' : 'guess' },
        ],
      }));

      // Award points based on round
      if (currentRound === 'guess') {
        setScore(prev => prev + 15);
        addToScoreBreakdown('guess', 'Player Guesses', 15, player.name);
      } else if (currentRound === 'hint') {
        setScore(prev => prev + 10);
        addToScoreBreakdown('hint', 'Player Guesses (with hints)', 10, player.name);
      }

      // Trigger success animation for correct guess
      setTileAnimations(prev => ({ ...prev, [player.pid]: 'animate-tile-success' }));
      setTimeout(() => {
        setTileAnimations(prev => ({ ...prev, [player.pid]: '' })); // Clear animation class
      }, 600); // Match animation duration

      // Auto-advance to first leader round if all players found
      if (newFoundCount === roster.length && (currentRound === 'guess' || currentRound === 'hint')) {
        setTimeout(() => {
          // Skip directly to the first leader round
          const firstLeaderRound = ROUND_ORDER.find(r => r.endsWith('-leader'));
          if (firstLeaderRound) {
            setCurrentRound(firstLeaderRound);
            setSelectedLeader(null);
            setClickedLeaderInfo(null);
            // Trigger bounce animation for leader round
            setTriggerBounceAnimation(true);
            setTimeout(() => setTriggerBounceAnimation(false), 1000);
          }
        }, 800); // Delay to show the last player's success animation
      }
    } else if (!rosterPlayer) {
      // Player is not on roster - show feedback
      toast({
        description: `Not on ${selectedSeason} ${teamDisplayInfo.name}.`,
      });

      // Track incorrect guess for detailed game data
      setDetailedGameData(prev => ({
        ...prev,
        playerGuesses: [
          ...prev.playerGuesses,
          { player, correct: false, round: currentRound === 'hint' ? 'hint' : 'guess' },
        ],
      }));
    }

    setGuess('');
    setAutocompleteOpen(false);
    setActiveIndex(-1);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [roster, toast, selectedSeason, teamDisplayInfo.name, currentRound, addToScoreBreakdown, foundCount, ROUND_ORDER]);

  // Handle manual guess
  const handleManualGuess = useCallback(() => {
    if (!guess.trim()) return;

    const normalizedGuess = normalizeName(guess);
    const unrevealedPlayers = roster.filter(rp => !rp.revealed);

    // Find exact full name match
    const matchedPlayer = unrevealedPlayers.find(rp =>
      normalizeName(rp.player.name) === normalizedGuess
    );

    if (matchedPlayer) {
      handleSelectPlayer(matchedPlayer.player);
      return;
    }

    // Find all last name matches
    const lastNameMatches = unrevealedPlayers.filter(rp => {
      const playerLastName = normalizeName(rp.player.name.split(' ').pop() || '');
      return playerLastName === normalizedGuess;
    });

    if (lastNameMatches.length >= 1) {
      // Reveal all players with matching last name
      lastNameMatches.forEach(match => {
        handleSelectPlayer(match.player);
      });
      return;
    }

    // Find all first name matches
    const firstNameMatches = unrevealedPlayers.filter(rp => {
      const playerFirstName = normalizeName(rp.player.name.split(' ')[0] || '');
      return playerFirstName === normalizedGuess;
    });

    if (firstNameMatches.length >= 1) {
      // Reveal all players with matching first name
      firstNameMatches.forEach(match => {
        handleSelectPlayer(match.player);
      });
      return;
    }

    const isValidLeaguePlayer = leagueData.players.some(p =>
      normalizeName(p.name) === normalizedGuess
    );

    if (isValidLeaguePlayer) {
      toast({
        description: `Not on ${selectedSeason} ${teamDisplayInfo.name}.`,
      });
    } else {
      toast({
        description: 'No match found. Try again!',
      });
    }
  }, [guess, roster, leagueData.players, selectedSeason, teamDisplayInfo.name, toast, handleSelectPlayer]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!autocompleteOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev =>
        prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();

      if (activeIndex >= 0 && autocompleteSuggestions[activeIndex]) {
        // User has navigated to a specific suggestion with arrow keys
        handleSelectPlayer(autocompleteSuggestions[activeIndex]);
      } else if (autocompleteSuggestions.length > 0) {
        // Check if any autocomplete suggestion is on the roster
        const rosterMatch = autocompleteSuggestions.find(suggestion =>
          roster.some(rp => rp.player.pid === suggestion.pid && !rp.revealed)
        );

        if (rosterMatch) {
          // Use the first roster player found in suggestions
          handleSelectPlayer(rosterMatch);
        } else {
          // No roster match in suggestions - try exact name matching
          handleManualGuess();
        }
      } else {
        // No suggestions - try exact name matching
        handleManualGuess();
      }
    } else if (e.key === 'Escape') {
      setAutocompleteOpen(false);
      setActiveIndex(-1);
    }
  }, [autocompleteOpen, activeIndex, autocompleteSuggestions, roster, handleSelectPlayer, handleManualGuess]);

  // Scroll active item
  useEffect(() => {
    if (activeIndex >= 0 && autocompleteRef.current) {
      const activeElement = autocompleteRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  // Reset wins guess state when entering wins-guess round
  useEffect(() => {
    if (currentRound === 'wins-guess') {
      setWinsGuessPosition(0); // Start at left edge
      setWinsGuessSubmitted(false);

      // If wins guess data is not available, skip to next round
      if (!winsGuessData) {
        toast({
          description: 'Win data not available for this team/season. Skipping to completion.',
        });
        setTimeout(() => {
          // Progress to next round (which should be 'complete')
          const currentIndex = ROUND_ORDER.indexOf(currentRound as any);
          if (currentIndex < ROUND_ORDER.length - 1) {
            const nextRound = ROUND_ORDER[currentIndex + 1];
            setCurrentRound(nextRound);
          }
        }, 1500);
      } else {
      }
    }
  }, [currentRound, winsGuessData, toast, ROUND_ORDER]);

  // Reset playoff finish state when entering playoff-finish round
  useEffect(() => {
    if (currentRound === 'playoff-finish') {
      setPlayoffFinishGuess(null);
      setPlayoffFinishSubmitted(false);

      // If playoff finish data is not available, skip to next round
      if (!playoffFinishData) {
        toast({
          description: 'Playoff data not available for this team/season. Skipping to completion.',
        });
        setTimeout(() => {
          const currentIndex = ROUND_ORDER.indexOf(currentRound as any);
          if (currentIndex < ROUND_ORDER.length - 1) {
            const nextRound = ROUND_ORDER[currentIndex + 1];
            setCurrentRound(nextRound);
          }
        }, 1500);
      } else {
      }
    }
  }, [currentRound, playoffFinishData, toast, ROUND_ORDER]);

  // Reset leader guess lock when round changes
  useEffect(() => {
    setLeaderGuessLocked(false);
  }, [currentRound]);

  // Helper function to get stat value for a player based on current round
  const getPlayerStatValue = useCallback((player: Player, round: RoundType): string => {
    const rosterPlayer = roster.find(rp => rp.player.pid === player.pid);
    if (!rosterPlayer) return 'N/A';

    const seasonStats = player.stats?.find(
      s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
    );

    const stats = rosterPlayer.stats;

    switch (round) {
      // Basketball rounds - display per game stats (prettier), but leader is determined by totals
      case 'points-leader':
        return stats?.ppg ? `${stats.ppg.toFixed(1)} PPG` : 'N/A';
      case 'rebounds-leader':
        return stats?.rpg ? `${stats.rpg.toFixed(1)} RPG` : 'N/A';
      case 'assists-leader':
        return stats?.apg ? `${stats.apg.toFixed(1)} APG` : 'N/A';
      case 'steals-leader':
        return stats?.spg ? `${stats.spg.toFixed(1)} SPG` : 'N/A';
      case 'blocks-leader':
        return stats?.bpg ? `${stats.bpg.toFixed(1)} BPG` : 'N/A';
      // Football rounds
      case 'passing-yards-leader':
        return seasonStats?.pssYds ? `${Math.round(seasonStats.pssYds)} Yards` : 'N/A';
      case 'rushing-yards-leader':
        return seasonStats?.rusYds ? `${Math.round(seasonStats.rusYds)} Yards` : 'N/A';
      case 'receiving-yards-leader':
        return seasonStats?.recYds ? `${Math.round(seasonStats.recYds)} Yards` : 'N/A';
      case 'tackles-leader':
        const tackles = ((seasonStats as any)?.defTckSolo || 0) + ((seasonStats as any)?.defTckAst || 0);
        return tackles > 0 ? `${tackles} Tackles` : 'N/A';
      case 'sacks-leader':
        const sacks = (seasonStats as any)?.defSk || (seasonStats as any)?.sks || 0;
        return sacks > 0 ? `${sacks.toFixed(1)} Sacks` : 'N/A';
      case 'interceptions-leader':
        const ints = (seasonStats as any)?.defInt || 0;
        return ints > 0 ? `${ints} INT` : 'N/A';
      // Baseball rounds
      case 'hits-leader':
        return seasonStats?.h ? `${seasonStats.h} H` : 'N/A';
      case 'home-runs-leader':
        return seasonStats?.hr ? `${seasonStats.hr} HR` : 'N/A';
      case 'rbis-leader':
        return seasonStats?.rbi ? `${seasonStats.rbi} RBI` : 'N/A';
      case 'stolen-bases-leader':
        return seasonStats?.sb ? `${seasonStats.sb} SB` : 'N/A';
      case 'strikeouts-leader':
        const strikeouts = (seasonStats as any)?.so || (seasonStats as any)?.k || 0;
        return strikeouts > 0 ? `${strikeouts} K` : 'N/A';
      case 'wins-leader':
        return seasonStats?.w ? `${seasonStats.w} W` : 'N/A';
      // Hockey rounds
      case 'points-leader':
        const points = ((seasonStats as any)?.evG || 0) + ((seasonStats as any)?.ppG || 0) + ((seasonStats as any)?.shG || 0) + ((seasonStats as any)?.evA || 0) + ((seasonStats as any)?.ppA || 0) + ((seasonStats as any)?.shA || 0);
        return points > 0 ? `${points} PTS` : 'N/A';
      case 'goals-leader':
        const goals = ((seasonStats as any)?.evG || 0) + ((seasonStats as any)?.ppG || 0) + ((seasonStats as any)?.shG || 0);
        return goals > 0 ? `${goals} G` : 'N/A';
      case 'assists-leader':
        const assists = ((seasonStats as any)?.evA || 0) + ((seasonStats as any)?.ppA || 0) + ((seasonStats as any)?.shA || 0);
        return assists > 0 ? `${assists} A` : 'N/A';
      case 'goalie-wins-leader':
        return (seasonStats as any)?.gW ? `${(seasonStats as any).gW} W` : 'N/A';
      default:
        return 'N/A';
    }
  }, [roster, selectedSeason, selectedTeam]);

  // Helper function to check if user's player had better per-game stat than correct player (for basketball)
  const shouldShowTotalsNote = useCallback((userPlayer: Player, correctPlayer: Player, round: RoundType): boolean => {
    // Only for basketball rounds
    const basketballRounds = ['points-leader', 'rebounds-leader', 'assists-leader', 'steals-leader', 'blocks-leader'];
    if (!basketballRounds.includes(round)) return false;

    const userRosterPlayer = roster.find(rp => rp.player.pid === userPlayer.pid);
    const correctRosterPlayer = roster.find(rp => rp.player.pid === correctPlayer.pid);
    if (!userRosterPlayer || !correctRosterPlayer) return false;

    const userStats = userRosterPlayer.stats;
    const correctStats = correctRosterPlayer.stats;

    switch (round) {
      case 'points-leader':
        return (userStats?.ppg || 0) > (correctStats?.ppg || 0);
      case 'rebounds-leader':
        return (userStats?.rpg || 0) > (correctStats?.rpg || 0);
      case 'assists-leader':
        return (userStats?.apg || 0) > (correctStats?.apg || 0);
      case 'steals-leader':
        return (userStats?.spg || 0) > (correctStats?.spg || 0);
      case 'blocks-leader':
        return (userStats?.bpg || 0) > (correctStats?.bpg || 0);
      default:
        return false;
    }
  }, [roster]);

  // Handle tile click during leader selection rounds
  const handleTileClick = useCallback((pid: number) => {
    const isLeaderRound = currentRound.endsWith('-leader');
    if (!isLeaderRound) return;
    if (leaderGuessLocked) return; // Prevent multiple guesses per round

    // Lock further guesses
    setLeaderGuessLocked(true);

    // Determine which leader we're looking for
    let correctLeaderPid: number | null = null;
    switch (currentRound) {
      // Basketball rounds
      case 'points-leader':
        correctLeaderPid = (statLeaders as any).points;
        break;
      case 'rebounds-leader':
        correctLeaderPid = (statLeaders as any).rebounds;
        break;
      case 'assists-leader':
        correctLeaderPid = (statLeaders as any).assists;
        break;
      case 'steals-leader':
        correctLeaderPid = (statLeaders as any).steals;
        break;
      case 'blocks-leader':
        correctLeaderPid = (statLeaders as any).blocks;
        break;
      // Football rounds
      case 'passing-yards-leader':
        correctLeaderPid = (statLeaders as any).passingYards;
        break;
      case 'rushing-yards-leader':
        correctLeaderPid = (statLeaders as any).rushingYards;
        break;
      case 'receiving-yards-leader':
        correctLeaderPid = (statLeaders as any).receivingYards;
        break;
      case 'tackles-leader':
        correctLeaderPid = (statLeaders as any).tackles;
        break;
      case 'sacks-leader':
        correctLeaderPid = (statLeaders as any).sacks;
        break;
      case 'interceptions-leader':
        correctLeaderPid = (statLeaders as any).interceptions;
        break;
      // Baseball rounds
      case 'hits-leader':
        correctLeaderPid = (statLeaders as any).hits;
        break;
      case 'home-runs-leader':
        correctLeaderPid = (statLeaders as any).homeRuns;
        break;
      case 'rbis-leader':
        correctLeaderPid = (statLeaders as any).rbis;
        break;
      case 'stolen-bases-leader':
        correctLeaderPid = (statLeaders as any).stolenBases;
        break;
      case 'strikeouts-leader':
        correctLeaderPid = (statLeaders as any).strikeouts;
        break;
      case 'wins-leader':
        correctLeaderPid = (statLeaders as any).wins;
        break;
      // Hockey rounds
      case 'goals-leader':
        correctLeaderPid = (statLeaders as any).goals;
        break;
      case 'goalie-wins-leader':
        correctLeaderPid = (statLeaders as any).goalieWins;
        break;
    }

    if (correctLeaderPid === null) return;

    // Get the correct leader's player info for display
    const correctRosterPlayer = roster.find(rp => rp.player.pid === correctLeaderPid);
    if (correctRosterPlayer) {
      const rating = correctRosterPlayer.player.ratings?.find(r => r.season === selectedSeason);
      const pos = rating?.pos || correctRosterPlayer.player.ratings?.[0]?.pos || 'Unknown';

      // Get the raw season stats from the player
      const seasonStats = correctRosterPlayer.player.stats?.find(
        s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid
      );

      // Get the stat value based on the current round
      let statValue = '';
      const stats = correctRosterPlayer.stats;
      switch (currentRound) {
        // Basketball rounds
        case 'points-leader':
          statValue = stats?.ppg ? `${stats.ppg.toFixed(1)} PPG` : 'N/A';
          break;
        case 'rebounds-leader':
          statValue = stats?.rpg ? `${stats.rpg.toFixed(1)} RPG` : 'N/A';
          break;
        case 'assists-leader':
          statValue = stats?.apg ? `${stats.apg.toFixed(1)} APG` : 'N/A';
          break;
        case 'steals-leader':
          statValue = stats?.spg ? `${stats.spg.toFixed(1)} SPG` : 'N/A';
          break;
        case 'blocks-leader':
          statValue = stats?.bpg ? `${stats.bpg.toFixed(1)} BPG` : 'N/A';
          break;
        // Football rounds
        case 'passing-yards-leader':
          statValue = seasonStats?.pssYds ? `${Math.round(seasonStats.pssYds)} Yards` : 'N/A';
          break;
        case 'rushing-yards-leader':
          statValue = seasonStats?.rusYds ? `${Math.round(seasonStats.rusYds)} Yards` : 'N/A';
          break;
        case 'receiving-yards-leader':
          statValue = seasonStats?.recYds ? `${Math.round(seasonStats.recYds)} Yards` : 'N/A';
          break;
        case 'tackles-leader':
          const tackles = ((seasonStats as any)?.defTckSolo || 0) + ((seasonStats as any)?.defTckAst || 0);
          statValue = tackles > 0 ? `${tackles} Tackles` : 'N/A';
          break;
        case 'sacks-leader':
          const sacks = (seasonStats as any)?.defSk || (seasonStats as any)?.sks || 0;
          statValue = sacks > 0 ? `${sacks.toFixed(1)} Sacks` : 'N/A';
          break;
        case 'interceptions-leader':
          const ints = (seasonStats as any)?.defInt || 0;
          statValue = ints > 0 ? `${ints} INT` : 'N/A';
          break;
        // Baseball rounds
        case 'hits-leader':
          statValue = seasonStats?.h ? `${seasonStats.h} H` : 'N/A';
          break;
        case 'home-runs-leader':
          statValue = seasonStats?.hr ? `${seasonStats.hr} HR` : 'N/A';
          break;
        case 'rbis-leader':
          statValue = seasonStats?.rbi ? `${seasonStats.rbi} RBI` : 'N/A';
          break;
        case 'stolen-bases-leader':
          statValue = seasonStats?.sb ? `${seasonStats.sb} SB` : 'N/A';
          break;
        case 'strikeouts-leader':
          const strikeouts = (seasonStats as any)?.so || (seasonStats as any)?.k || 0;
          statValue = strikeouts > 0 ? `${strikeouts} K` : 'N/A';
          break;
        case 'wins-leader':
          statValue = seasonStats?.w ? `${seasonStats.w} W` : 'N/A';
          break;
        // Hockey rounds
        case 'goals-leader':
          const goals = ((seasonStats as any)?.evG || 0) + ((seasonStats as any)?.ppG || 0) + ((seasonStats as any)?.shG || 0);
          statValue = goals > 0 ? `${goals} G` : 'N/A';
          break;
        case 'goalie-wins-leader':
          statValue = (seasonStats as any)?.gW ? `${(seasonStats as any).gW} W` : 'N/A';
          break;
      }

      setClickedLeaderInfo({
        name: correctRosterPlayer.player.name,
        position: pos,
        statValue: statValue
      });
    }

    // Get user selected player
    const userSelectedPlayer = roster.find(rp => rp.player.pid === pid)?.player;

    // Check if the clicked player is correct
    if (pid === correctLeaderPid) {
      // Correct! Show success feedback and move to next round
      toast({
        description: 'Correct! Moving to next round...',
      });
      setScore(prev => prev + 10); // Award 10 points for correct leader
      addToScoreBreakdown(currentRound, getRoundInstruction(currentRound), 10, correctRosterPlayer?.player.name || 'Stat leader');

      // Track leader result for detailed game data
      if (correctRosterPlayer) {
        const statValue = getPlayerStatValue(correctRosterPlayer.player, currentRound);
        setDetailedGameData(prev => ({
          ...prev,
          leaderResults: [...prev.leaderResults, {
            round: currentRound,
            label: formatStatLabel(getRoundInstruction(currentRound)),
            statLabel: formatStatLabel(getRoundInstruction(currentRound)),
            statValue,
            correctPlayer: correctRosterPlayer.player,
            userCorrect: true,
          }]
        }));
      }

      // Apply success animation
      setTileAnimations(prev => ({ ...prev, [pid]: 'animate-tile-success' }));
      setTimeout(() => {
        setTileAnimations(prev => ({ ...prev, [pid]: '' })); // Clear animation class
        handleNextRound();
      }, 1000); // Wait for animation to finish before advancing
    } else {
      // Incorrect - show feedback and shake animation
      toast({
        description: 'Incorrect. Try again!',
        variant: 'destructive',
      });

      // Track leader result for detailed game data
      if (correctRosterPlayer && userSelectedPlayer) {
        const correctStatValue = getPlayerStatValue(correctRosterPlayer.player, currentRound);
        const userStatValue = getPlayerStatValue(userSelectedPlayer, currentRound);
        const showTotalsNote = shouldShowTotalsNote(userSelectedPlayer, correctRosterPlayer.player, currentRound);
        setDetailedGameData(prev => ({
          ...prev,
          leaderResults: [...prev.leaderResults, {
            round: currentRound,
            label: formatStatLabel(getRoundInstruction(currentRound)),
            statLabel: formatStatLabel(getRoundInstruction(currentRound)),
            statValue: correctStatValue,
            correctPlayer: correctRosterPlayer.player,
            userCorrect: false,
            userSelectedPlayer,
            userStatValue,
            showTotalsNote,
          }]
        }));
      }

      // Apply shake animation
      setTileAnimations(prev => ({ ...prev, [pid]: 'animate-tile-shake' }));
      setTimeout(() => {
        setTileAnimations(prev => ({ ...prev, [pid]: '' })); // Clear shake animation class
        // Highlight the correct answer
        if (correctLeaderPid !== null) {
          setTileAnimations(prev => ({ ...prev, [correctLeaderPid]: 'animate-tile-correct-highlight' }));
          setTimeout(() => {
            setTileAnimations(prev => ({ ...prev, [correctLeaderPid]: '' })); // Clear highlight animation
            handleNextRound(); // Advance round after animations
          }, 800); // Highlight animation duration
        } else {
          handleNextRound(); // Advance round if no correct leader found (shouldn't happen)
        }
      }, 500); // Shake animation duration
    }
  }, [currentRound, statLeaders, toast, handleNextRound, roster, selectedSeason, selectedTeam, getRoundInstruction, leaderGuessLocked]);

  // New game - randomize both
  const handleNew = useCallback(() => {
    // Reset save tracking for new game
    hasBeenSavedRef.current = null;

    pickRandomTeamAndSeason();
    setCurrentRound('guess');
    setSelectedLeader(null);
    setClickedLeaderInfo(null);
    setScore(0); // Reset score for new game
    setScoreBreakdown([]); // Reset score breakdown
    setDetailedGameData({ playerGuesses: [], leaderResults: [] }); // Reset detailed game data
  }, [pickRandomTeamAndSeason]);

  // Same Year, New Team
  const handleSameYearNewTeam = useCallback(() => {
    if (!selectedSeason || allTeams.length === 0) return;

    // Find teams with players in current season
    const teamsInSeason = new Set<number>();
    leagueData.players.forEach(player => {
      player.stats?.forEach(stat => {
        if (!stat.playoffs && stat.season === selectedSeason && stat.gp && stat.gp > 0) {
          teamsInSeason.add(stat.tid);
        }
      });
    });

    // Also ensure team has wins data in teamSeasons
    const teamsWithWinsData = new Set<number>();
    if (leagueData.teamSeasons) {
      leagueData.teamSeasons.forEach(ts => {
        if (ts.season === selectedSeason && !ts.playoffs) {
          teamsWithWinsData.add(ts.tid);
        }
      });
    }

    // Filter to teams that have BOTH player stats AND wins data
    const validTeams = allTeams.filter(team => 
      teamsInSeason.has(team.tid) && 
      teamsWithWinsData.has(team.tid) && 
      team.tid !== selectedTeam?.tid
    );
    if (validTeams.length === 0) {
      toast({
        title: 'No other teams available',
        description: 'No other teams found for this season.',
        variant: 'destructive',
      });
      return;
    }

    // Reset save tracking for new game
    hasBeenSavedRef.current = null;

    const randomTeam = validTeams[Math.floor(Math.random() * validTeams.length)];
    setSelectedTeam(randomTeam);
    buildRoster(selectedSeason, randomTeam);
    setCurrentRound('guess');
    setSelectedLeader(null);
    setClickedLeaderInfo(null);
    setScore(0);
    setGuess('');
    setScoreBreakdown([]); // Reset score breakdown
    setDetailedGameData({ playerGuesses: [], leaderResults: [] }); // Reset detailed game data
  }, [selectedSeason, selectedTeam, allTeams, leagueData.players, leagueData.teamSeasons, buildRoster, toast, leagueData.sport]);

  // New Year, Same Team
  const handleNewYearSameTeam = useCallback(() => {
    if (!selectedTeam || allSeasons.length === 0) return;

    // Find seasons where this team has players
    const seasonsForTeam = new Set<number>();
    leagueData.players.forEach(player => {
      player.stats?.forEach(stat => {
        if (!stat.playoffs && stat.tid === selectedTeam.tid && stat.gp && stat.gp > 0) {
          seasonsForTeam.add(stat.season);
        }
      });
    });

    // Also ensure team has wins data in teamSeasons for these seasons
    const seasonsWithWinsData = new Set<number>();
    if (leagueData.teamSeasons) {
      leagueData.teamSeasons.forEach(ts => {
        if (ts.tid === selectedTeam.tid && !ts.playoffs) {
          seasonsWithWinsData.add(ts.season);
        }
      });
    }

    // Filter to seasons that have player stats (wins data preferred but not required)
    // Include season if it has players AND (has wins data OR team exists in that season)
    // Also filter by year range if set
    const validSeasons = allSeasons.filter(season => {
      const hasPlayers = seasonsForTeam.has(season);
      const hasWins = seasonsWithWinsData.has(season);
      const teamExistsInSeason = selectedTeam.seasons?.some(s => s.season === season);
      const inYearRange = yearRange ? (season >= yearRange[0] && season <= yearRange[1]) : true;

      return hasPlayers && (hasWins || teamExistsInSeason) && season !== selectedSeason && inYearRange;
    });
    if (validSeasons.length === 0) {
      toast({
        title: 'No other seasons available',
        description: 'No other seasons found for this team.',
        variant: 'destructive',
      });
      return;
    }

    // Reset save tracking for new game
    hasBeenSavedRef.current = null;

    const randomSeason = validSeasons[Math.floor(Math.random() * validSeasons.length)];
    setSelectedSeason(randomSeason);
    buildRoster(randomSeason, selectedTeam);
    setCurrentRound('guess');
    setSelectedLeader(null);
    setClickedLeaderInfo(null);
    setScore(0);
    setGuess('');
    setScoreBreakdown([]); // Reset score breakdown
    setDetailedGameData({ playerGuesses: [], leaderResults: [] }); // Reset detailed game data
  }, [selectedSeason, selectedTeam, allSeasons, leagueData.players, leagueData.teamSeasons, buildRoster, toast, yearRange, leagueData.sport]);

  // Give Up - skip to complete with current score
  const handleGiveUp = useCallback(() => {
    // Reveal all players without adding points
    const updatedRoster = roster.map(rp => ({
      ...rp,
      revealed: true,
    }));
    setRoster(updatedRoster);
    setFoundCount(roster.length);

    // Move to complete phase without changing score
    setCurrentRound('complete');

    toast({
      title: 'Game Ended',
      description: `Final Score: ${score} points`,
    });
  }, [score, toast, roster]);

  // Wins Guess: Move slider
  const handleWinsGuessSliderMove = useCallback((newPosition: number) => {
    if (!winsGuessData || winsGuessSubmitted) return;
    
    // Clamp position: L must be in [0, G - W + 1] so the upper bound (L + W - 1) can reach G
    const maxPosition = winsGuessData.totalGames - winsGuessData.windowWidth + 1;
    const clampedPosition = Math.max(0, Math.min(newPosition, maxPosition));
    setWinsGuessPosition(clampedPosition);
  }, [winsGuessData, winsGuessSubmitted]);

  // Wins Guess: Submit guess
  const handleWinsGuessSubmit = useCallback(() => {
    if (!winsGuessData || winsGuessSubmitted) return;

    const L = winsGuessPosition;
    const R = L + winsGuessData.windowWidth - 1;
    const A = winsGuessData.actualWins;

    // Check if A ∈ [L, R]
    const isCorrect = A >= L && A <= R;

    setWinsGuessSubmitted(true);

    // Track wins guess data
    setDetailedGameData(prev => ({
      ...prev,
      winsGuessData: {
        G: winsGuessData.totalGames,
        L,
        R,
        A,
        awarded: isCorrect,
      }
    }));

    if (isCorrect) {
      toast({
        description: `Correct! The team had ${A} wins. +10 points`,
      });
      setScore(prev => prev + 10);
      addToScoreBreakdown('wins-guess', 'Wins Guess', 10, `Guessed ${L}-${R}, actual ${A}`);
    } else {
      toast({
        description: `Incorrect. The team had ${A} wins.`,
        variant: 'destructive',
      });
      addToScoreBreakdown('wins-guess', 'Wins Guess', 0, `Guessed ${L}-${R}, actual ${A}`);
    }

    // Move to next round after a brief delay
    setTimeout(() => {
      handleNextRound();
    }, 2000);
  }, [winsGuessData, winsGuessPosition, winsGuessSubmitted, toast, handleNextRound, addToScoreBreakdown]);

  // Wins Guess: Keyboard controls
  const handleWinsGuessKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!winsGuessData || winsGuessSubmitted) return;

    let delta = 0;
    if (e.key === 'ArrowLeft') {
      delta = -1;
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      delta = 1;
      e.preventDefault();
    } else if (e.key === 'PageDown') {
      delta = 5;
      e.preventDefault();
    } else if (e.key === 'PageUp') {
      delta = -5;
      e.preventDefault();
    } else if (e.key === 'Enter') {
      handleWinsGuessSubmit();
      e.preventDefault();
      return;
    }

    if (delta !== 0) {
      handleWinsGuessSliderMove(winsGuessPosition + delta);
    }
  }, [winsGuessData, winsGuessPosition, winsGuessSubmitted, handleWinsGuessSliderMove, handleWinsGuessSubmit]);

  // Playoff Finish: Submit guess
  const handlePlayoffFinishSubmit = useCallback(() => {
    if (!playoffFinishData || playoffFinishSubmitted || playoffFinishGuess === null) return;

    const isCorrect = playoffFinishGuess === playoffFinishData.finishValue;
    const userGuessLabel = playoffFinishData.options.find(opt => opt.value === playoffFinishGuess)?.label || 'Unknown';

    setPlayoffFinishSubmitted(true);

    // Track playoff finish data
    setDetailedGameData(prev => ({
      ...prev,
      playoffFinishData: {
        userGuess: userGuessLabel,
        correctOutcome: playoffFinishData.finishLabel,
        correct: isCorrect,
        seriesScore: playoffFinishData.seriesScore || undefined,
        pointsAwarded: isCorrect ? 10 : 0,
      }
    }));

    if (isCorrect) {
      toast({
        description: `Correct! ${playoffFinishData.finishLabel}. +10 points`,
      });
      setScore(prev => prev + 10);
      addToScoreBreakdown('playoff-finish', 'Playoff Finish', 10, playoffFinishData.finishLabel);
    } else {
      toast({
        description: `Incorrect. ${playoffFinishData.finishLabel}.`,
        variant: 'destructive',
      });
      addToScoreBreakdown('playoff-finish', 'Playoff Finish', 0, playoffFinishData.finishLabel);
    }

    // Auto-progress to next round after a delay
    setTimeout(() => {
      handleNextRound();
    }, 2000);
  }, [playoffFinishData, playoffFinishGuess, playoffFinishSubmitted, toast, handleNextRound, addToScoreBreakdown]);

  const hasProgress = foundCount > 0;

  const sportTitle =
    leagueData.sport === 'basketball' ? 'Basketball GM' :
    leagueData.sport === 'football' ? 'Football GM' :
    leagueData.sport === 'hockey' ? 'ZenGM Hockey' :
    leagueData.sport === 'baseball' ? 'ZenGM Baseball' :
    'ZenGM';

  const sportTitleAbbr =
    leagueData.sport === 'basketball' ? 'BBGM' :
    leagueData.sport === 'football' ? 'FBGM' :
    leagueData.sport === 'hockey' ? 'ZGMH' :
    leagueData.sport === 'baseball' ? 'ZGMB' :
    'ZenGM';

  const sportIcon =
    leagueData.sport === 'basketball' ? basketballIcon :
    leagueData.sport === 'football' ? footballIcon :
    leagueData.sport === 'hockey' ? hockeyIcon :
    leagueData.sport === 'baseball' ? baseballIcon :
    basketballIcon;

  // Transform detailed game data into ScoreSummaryData format
  const scoreSummaryData: ScoreSummaryData | null = useMemo(() => {
    if (!selectedTeam || !selectedSeason) return null;

    // Calculate category totals from scoreBreakdown
    const categories: ScoreCategory[] = [];
    const categoryMap: Record<string, number> = {};

    scoreBreakdown.forEach(round => {
      const categoryName =
        round.round === 'guess' ? 'Player Guesses' :
        round.round === 'hint' ? 'Player Guesses (with hints)' :
        round.round === 'wins-guess' ? 'Wins Guess' :
        round.round === 'playoff-finish' ? 'Playoff Finish' :
        'Leaders';

      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + round.points;
    });

    Object.entries(categoryMap).forEach(([name, points]) => {
      categories.push({ name, points });
    });

    return {
      season: selectedSeason,
      teamName: teamDisplayInfo.name,
      teamAbbrev: teamDisplayInfo.abbrev,
      teamLogo: teamDisplayInfo.logoUrl,
      teamColors: teamDisplayInfo.colors,
      sport: leagueData.sport || 'basketball',
      finalScore: score,
      categories,
      playoffFinish: detailedGameData.playoffFinishData ? {
        ...detailedGameData.playoffFinishData,
        pointsPerCorrect: 10,
      } : undefined,
      playerGuesses: detailedGameData.playerGuesses,
      leaders: detailedGameData.leaderResults.map(lr => ({
        label: lr.label,
        statLabel: lr.statLabel,
        statValue: lr.statValue,
        correctPlayer: lr.correctPlayer,
        userCorrect: lr.userCorrect,
        userSelectedPlayer: lr.userSelectedPlayer,
        userStatValue: lr.userStatValue,
        showTotalsNote: lr.showTotalsNote,
      })),
      winsGuess: detailedGameData.winsGuessData,
    };
  }, [selectedTeam, selectedSeason, teamDisplayInfo, leagueData.sport, score, scoreBreakdown, detailedGameData]);

  // Save game to history when it completes
  useEffect(() => {
    // Only trigger when currentRound becomes 'complete'
    if (currentRound !== 'complete') return;

    // Ensure we have the necessary data
    if (!selectedTeam || !selectedSeason) {
      console.error('[History] Cannot save: missing selectedTeam or selectedSeason');
      return;
    }

    // Only save if the user made meaningful progress
    const hasCompletedRounds = scoreBreakdown.length > 0;
    const shouldSave = score > 0 || hasCompletedRounds;

    if (!shouldSave) {
      console.log('[History] Not saving: no progress made');
      return;
    }

    // Create unique identifier for this specific game completion
    const gameId = `${selectedSeason}-${selectedTeam.tid}-${score}-${scoreBreakdown.length}`;

    // Skip if we just saved this exact game (prevents duplicate saves from effect re-runs)
    if (hasBeenSavedRef.current === gameId) {
      console.log('[History] Already saved this exact game state, skipping');
      return;
    }

    // Build summary data inline to ensure it's fresh
    const categories: ScoreCategory[] = [];
    const categoryMap: Record<string, number> = {};
    scoreBreakdown.forEach(round => {
      const categoryName =
        round.round === 'guess' ? 'Player Guesses' :
        round.round === 'hint' ? 'Player Guesses (with hints)' :
        round.round === 'wins-guess' ? 'Wins Guess' :
        round.round === 'playoff-finish' ? 'Playoff Finish' :
        'Leaders';
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + round.points;
    });
    Object.entries(categoryMap).forEach(([name, points]) => {
      categories.push({ name, points });
    });

    const summaryData: ScoreSummaryData = {
      season: selectedSeason,
      teamName: teamDisplayInfo.name,
      teamAbbrev: teamDisplayInfo.abbrev,
      teamLogo: teamDisplayInfo.logoUrl,
      teamColors: teamDisplayInfo.colors,
      sport: leagueData.sport || 'basketball',
      finalScore: score,
      categories,
      playoffFinish: detailedGameData.playoffFinishData ? {
        ...detailedGameData.playoffFinishData,
        pointsPerCorrect: 10,
      } : undefined,
      // Convert full Player objects to lightweight versions to save space
      playerGuesses: detailedGameData.playerGuesses.map(pg => ({
        player: pg.player,
        correct: pg.correct,
        round: pg.round,
      })),
      leaders: detailedGameData.leaderResults.map(lr => ({
        label: lr.label,
        statLabel: lr.statLabel,
        statValue: lr.statValue,
        correctPlayer: lr.correctPlayer,
        userCorrect: lr.userCorrect,
        userSelectedPlayer: lr.userSelectedPlayer,
        userStatValue: lr.userStatValue,
        showTotalsNote: lr.showTotalsNote,
      })),
      winsGuess: detailedGameData.winsGuessData,
    };

    // Get small logo for history card
    const seasonInfo = selectedTeam.seasons?.find(s => s.season === selectedSeason);
    const smallLogo = seasonInfo?.imgURLSmall || seasonInfo?.imgURL || selectedTeam.imgURLSmall || selectedTeam.imgURL;
    const smallLogoUrl = getTeamLogoUrl(smallLogo, leagueData.sport);

    console.log('[History] Saving game:', { season: selectedSeason, team: teamDisplayInfo.name, score });

    // Save to history (async)
    (async () => {
      try {
        const saved = await saveGameToHistory({
          season: selectedSeason,
          teamName: teamDisplayInfo.name,
          teamAbbrev: teamDisplayInfo.abbrev,
          teamLogo: smallLogoUrl,
          teamColors: teamDisplayInfo.colors,
          sport: leagueData.sport || 'basketball',
          score,
          leagueFingerprintId: leagueFingerprintId || undefined,
        }, summaryData);

        if (saved) {
          // Reload history after saving
          const allHistory = await loadGameHistory();
          const filteredHistory = leagueFingerprintId
            ? allHistory.filter(entry => entry.leagueFingerprintId === leagueFingerprintId)
            : allHistory;
          setGameHistory(filteredHistory);

          // Mark as saved with the unique game ID
          hasBeenSavedRef.current = gameId;
          console.log('[History] Game saved successfully');
        } else {
          console.error('[History] Failed to save game - IndexedDB may be full');
        }
      } catch (error) {
        console.error('[History] Error saving game:', error);
      }
    })();
  }, [currentRound, selectedTeam, selectedSeason, teamDisplayInfo, leagueData.sport, score, leagueFingerprintId, scoreBreakdown, detailedGameData]);

    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
          <>
            {/* Main Header */}
            <header
                className="border-border shrink-0"
                onMouseEnter={() => setIsHeaderHovered(true)}
                onMouseLeave={() => setIsHeaderHovered(false)}
                style={{ position: 'relative', backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--card))' }}
              >
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="relative sm:grid sm:grid-cols-3 items-center gap-2 sm:gap-4 flex justify-between">
              {/* Left: Back button & Give Up button */}
              <div className="flex items-center justify-start space-x-1 shrink-0 min-w-0 z-10">
                {hasProgress ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid="button-back" style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))' }} className="animate-on-click">
                        <ArrowLeft className="h-[1.2rem] w-[1.2rem]" />
                        <span className="sr-only">Go back</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent style={{ backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--background))', borderColor: teamDisplayInfo.colors[1] || 'hsl(var(--border))' }}>
                      <AlertDialogHeader>
                        <AlertDialogTitle style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--foreground))' }}>Go back to game selection?</AlertDialogTitle>
                        <AlertDialogDescription style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--muted-foreground))' }}>
                          Going back will lose your current progress. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel style={{ backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--background))', color: teamDisplayInfo.colors[1] || 'hsl(var(--foreground))', borderColor: teamDisplayInfo.colors[1] || 'hsl(var(--border))' }}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onBackToModeSelect} className="animate-on-click" style={{ backgroundColor: teamDisplayInfo.colors[1] || 'hsl(var(--primary))', color: teamDisplayInfo.colors[0] || 'hsl(var(--primary-foreground))' }}>Go Back</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button variant="ghost" size="sm" onClick={onBackToModeSelect} data-testid="button-back" style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))' }} className="animate-on-click">
                    <ArrowLeft className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Go back</span>
                  </Button>
                )}

                {/* Give Up button - only show before game is complete */}
                {currentRound !== 'complete' && (
                  hasProgress ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          style={{
                            backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--primary))',
                            color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))',
                            borderColor: teamDisplayInfo.colors[1] || 'hsl(var(--border))'
                          }}
                          className="animate-on-click text-xs px-1 sm:px-3 h-auto py-1 flex flex-col sm:flex-row leading-tight sm:gap-1"
                        >
                          <span className="text-[10px] sm:text-xs">Give</span>
                          <span className="text-[10px] sm:text-xs">Up</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent style={{ backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--background))', borderColor: teamDisplayInfo.colors[1] || 'hsl(var(--border))' }}>
                        <AlertDialogHeader>
                          <AlertDialogTitle style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--foreground))' }}>Give up this game?</AlertDialogTitle>
                          <AlertDialogDescription style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--muted-foreground))' }}>
                            This will end the game and reveal all answers. Your current score will be saved.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel style={{ backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--background))', color: teamDisplayInfo.colors[1] || 'hsl(var(--foreground))', borderColor: teamDisplayInfo.colors[1] || 'hsl(var(--border))' }}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleGiveUp} className="animate-on-click" style={{ backgroundColor: teamDisplayInfo.colors[1] || 'hsl(var(--primary))', color: teamDisplayInfo.colors[0] || 'hsl(var(--primary-foreground))' }}>Give Up</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGiveUp}
                      style={{
                        backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--primary))',
                        color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))',
                        borderColor: teamDisplayInfo.colors[1] || 'hsl(var(--border))'
                      }}
                      className="animate-on-click text-xs px-1 sm:px-3 h-auto py-1 flex flex-col sm:flex-row leading-tight sm:gap-1"
                    >
                      <span className="text-[10px] sm:text-xs">Give</span>
                      <span className="text-[10px] sm:text-xs">Up</span>
                    </Button>
                  )
                )}
              </div>

              {/* Center: Logo + Title */}
              <div className="absolute left-1/2 -translate-x-1/2 sm:relative sm:left-auto sm:translate-x-0 flex items-center justify-center space-x-1 sm:space-x-2 md:space-x-3 min-w-0">
                <div
                  className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 shrink-0"
                  style={{
                    backgroundColor: teamDisplayInfo.colors[1] || 'hsl(var(--primary))',
                    maskImage: `url(${sportIcon})`,
                    WebkitMaskImage: `url(${sportIcon})`,
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center'
                  }}
                />
                <h1
                  className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-2xl font-bold whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
                  style={{
                    color: teamDisplayInfo.colors[1] || 'hsl(var(--primary))',
                    letterSpacing: '-0.02em'
                  }}
                >
                  <span className="sm:hidden">{sportTitleAbbr} Trivia</span>
                  <span className="hidden sm:inline">{sportTitle} Trivia</span>
                </h1>
              </div>

              {/* Right: History, Help & Home buttons */}
              <div className="flex items-center justify-end space-x-1 shrink-0 min-w-0 z-10">
                {/* History button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => pushModal({ type: 'history' })}
                  style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))' }}
                  className="animate-on-click"
                  data-testid="button-history"
                >
                  <History className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">History</span>
                </Button>

                {/* Help button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHelpModal(true)}
                  style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))' }}
                  className="animate-on-click"
                  data-testid="button-help"
                >
                  <HelpCircle className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Help</span>
                </Button>
                
                {hasProgress ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid="button-home" style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))' }} className="animate-on-click">
                        <HomeIcon className="h-[1.2rem] w-[1.2rem]" />
                        <span className="sr-only">Go home</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent style={{ backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--background))', borderColor: teamDisplayInfo.colors[1] || 'hsl(var(--border))' }}>
                      <AlertDialogHeader>
                        <AlertDialogTitle style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--foreground))' }}>Go home?</AlertDialogTitle>
                        <AlertDialogDescription style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--muted-foreground))' }}>
                          Going home will lose your current progress. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel style={{ backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--background))', color: teamDisplayInfo.colors[1] || 'hsl(var(--foreground))', borderColor: teamDisplayInfo.colors[1] || 'hsl(var(--border))' }}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onGoHome} className="animate-on-click" style={{ backgroundColor: teamDisplayInfo.colors[1] || 'hsl(var(--primary))', color: teamDisplayInfo.colors[0] || 'hsl(var(--primary-foreground))' }}>Go Home</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button variant="ghost" size="sm" onClick={onGoHome} data-testid="button-home" style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))' }} className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 animate-on-click text-[16px] pl-[12.1px] pr-[12.1px]">
                    <HomeIcon className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Go home</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
          <AccentLine isHovered={isHeaderHovered} color={teamDisplayInfo.colors[1]} />
        </header>
  
        {/* Game Info Header with Dropdowns */}
        <div className="border-b neon-border-subtle shrink-0" style={{ backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--card))' }}>
          <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* Left side: New Team button with dropdown */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Year Range Settings */}
                <Popover open={yearRangeOpen} onOpenChange={handleYearRangePopoverChange}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="animate-on-click text-xs sm:text-sm px-2 h-8 sm:h-10"
                      style={{
                        color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))'
                      }}
                    >
                      <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Year Range</h4>
                        <p className="text-xs text-muted-foreground">
                          Set the year range for random team/year generation
                        </p>
                      </div>

                      {yearRange && allSeasons.length > 0 && (
                        <>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              {isSavingYearRange && (
                                <Save className="h-4 w-4 animate-pulse text-muted-foreground flex-shrink-0" />
                              )}
                              <Slider
                                min={Math.min(...allSeasons)}
                                max={Math.max(...allSeasons)}
                                step={1}
                                value={yearRange}
                                onValueChange={(value) => setYearRange(value as [number, number])}
                                className="flex-1"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground">From</label>
                                <Input
                                  type="text"
                                  value={yearFromInput}
                                  onChange={(e) => setYearFromInput(e.target.value)}
                                  onBlur={applyYearFromInput}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      applyYearFromInput();
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>

                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground">To</label>
                                <Input
                                  type="text"
                                  value={yearToInput}
                                  onChange={(e) => setYearToInput(e.target.value)}
                                  onBlur={applyYearToInput}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      applyYearToInput();
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Team Filter */}
                          <div className="space-y-2 pt-4 border-t">
                            <h4 className="font-medium text-sm">Team Filter</h4>
                            <p className="text-xs text-muted-foreground">
                              Randomize from a specific team only
                            </p>
                            <Select
                              value={teamFilter?.toString() || 'all'}
                              onValueChange={(value) => {
                                setTeamFilter(value === 'all' ? null : parseInt(value));
                              }}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="All teams" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px] overflow-y-auto">
                                <SelectItem value="all">All teams</SelectItem>
                                {allTeams
                                  .sort((a, b) => {
                                    const aRegion = a.region || '';
                                    const aName = a.name || '';
                                    const bRegion = b.region || '';
                                    const bName = b.name || '';
                                    return `${aRegion} ${aName}`.localeCompare(`${bRegion} ${bName}`);
                                  })
                                  .map((team) => (
                                    <SelectItem key={team.tid} value={team.tid.toString()}>
                                      <div className="flex items-center gap-2">
                                        {(team.imgURLSmall || team.imgURL) && (
                                          <img
                                            src={team.imgURLSmall || team.imgURL || ''}
                                            alt={`${team.region} ${team.name}`}
                                            className="w-4 h-4 object-contain"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        )}
                                        <span>{team.region} {team.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* New Team Button Group with Dropdown */}
                <div className="flex">
                  {/* Main button - 75% */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNew}
                    className="neon-button animate-on-click rounded-r-none border-r-0 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10"
                    style={{ 
                      backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--primary))',
                      color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))',
                      borderColor: teamDisplayInfo.colors[1] || 'hsl(var(--border))'
                    }}
                    data-testid="button-new-trivia"
                  >
                    <Shuffle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">New</span>
                  </Button>

                  {/* Dropdown trigger - 25% */}
                  <DropdownMenu open={newTeamDropdownOpen} onOpenChange={setNewTeamDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="neon-button animate-on-click rounded-l-none px-1 sm:px-2 h-8 sm:h-10"
                        style={{ 
                          backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--primary))',
                          color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))',
                          borderColor: teamDisplayInfo.colors[1] || 'hsl(var(--border))'
                        }}
                        data-testid="button-new-trivia-dropdown"
                      >
                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="start"
                      style={{ backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--popover))' }}
                    >
                      <DropdownMenuItem 
                        onClick={handleSameYearNewTeam} 
                        data-testid="option-same-year-new-team"
                        style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--foreground))' }}
                      >
                        Random Team
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={handleNewYearSameTeam} 
                        data-testid="option-new-year-same-team"
                        style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--foreground))' }}
                      >
                        Random Year
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Center: Year and Team */}
              <div className="flex items-center gap-2 sm:gap-4 justify-center flex-1 min-w-0">

                {/* Year Dropdown */}
                <Popover open={yearDropdownOpen} onOpenChange={setYearDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      role="combobox"
                      aria-expanded={yearDropdownOpen}
                      className="text-lg sm:text-2xl md:text-3xl font-bold px-2 sm:px-4 py-1 sm:py-2 h-8 sm:h-auto animate-on-click shrink-0 hover:bg-accent/50"
                      style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary))' }}
                      data-testid="button-year-dropdown"
                    >
                      <ChevronDown className="mr-1 sm:mr-2 h-3 w-3 sm:h-5 sm:w-5" />
                      {selectedSeason}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search year..."
                      />
                      <CommandList>
                        <CommandEmpty>No year found.</CommandEmpty>
                        <CommandGroup>
                          {allSeasons.map((season, index) => (
                            <CommandItem
                              key={`season-${season}-${index}`}
                              value={season.toString()}
                              onSelect={() => {
                                // Validate that current team has teamSeasons data for this season
                                if (selectedTeam) {
                                  const hasTeamSeasonData = leagueData.teamSeasons?.some(
                                    ts => ts.tid === selectedTeam.tid && ts.season === season && !ts.playoffs
                                  );
                                  if (!hasTeamSeasonData) {
                                    toast({
                                      title: 'Invalid Season',
                                      description: 'This team does not have complete data for the selected season.',
                                      variant: 'destructive',
                                    });
                                    setYearDropdownOpen(false);
                                    return;
                                  }
                                }
                                setSelectedSeason(season);
                                setYearDropdownOpen(false);
                                setCurrentRound('guess');
                                setFoundCount(0);
                                setScore(0);
                                setSelectedLeader(null);
                                setScoreBreakdown([]); // Reset score breakdown
                                setDetailedGameData({ playerGuesses: [], leaderResults: [] }); // Reset detailed game data
                              }}
                              data-testid={`option-year-${season}`}
                            >
                              {season}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
  
                {/* Team Logo/Name with Dropdown */}
                <Popover open={teamDropdownOpen} onOpenChange={setTeamDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      role="combobox"
                      aria-expanded={teamDropdownOpen}
                      className="flex items-center gap-1 sm:gap-2 hover:bg-accent/50 px-2 sm:px-4 py-1 sm:py-2 h-8 sm:h-auto animate-on-click shrink-0"
                      data-testid="button-team-dropdown"
                    >
                      {teamDisplayInfo.logo && !logoError ? (
                        <img
                          src={getTeamLogoUrl(teamDisplayInfo.logo, leagueData.sport)}
                          alt={teamDisplayInfo.name}
                          className="h-8 w-8 sm:h-12 sm:w-12 md:h-14 md:w-14 object-contain shrink-0"
                          onError={() => {
                            setLogoError(true);
                          }}
                        />
                      ) : (
                        <span className="text-lg sm:text-2xl md:text-3xl font-bold neon-text" style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary))' }}>
                          {teamDisplayInfo.name}
                        </span>
                      )}
                      <ChevronDown className="h-3 w-3 sm:h-5 sm:w-5 ml-1 sm:ml-2 shrink-0" style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary))' }} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="center">
                    <Command>
                      <CommandInput placeholder="Search team..." />
                      <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty>No team found.</CommandEmpty>
                        <CommandGroup>
                          {teamsInSelectedSeason.map((team) => {
                            const teamName = team.region && team.name
                              ? `${team.region} ${team.name}`
                              : team.abbrev;
  
                            return (
                              <CommandItem
                                key={team.tid}
                                value={`${teamName} ${team.abbrev}`}
                                onSelect={() => {
                                  setSelectedTeam(team);
                                  setTeamDropdownOpen(false);
                                  setCurrentRound('guess');
                                  setFoundCount(0);
                                  setScore(0);
                                  setSelectedLeader(null);
                                  setScoreBreakdown([]); // Reset score breakdown
                                  setDetailedGameData({ playerGuesses: [], leaderResults: [] }); // Reset detailed game data
                                }}
                                className="flex items-center gap-2"
                                data-testid={`option-team-${team.tid}`}
                              >
                                {(team.imgURLSmall || team.imgURL) && (
                                  <img
                                    src={getTeamLogoUrl(team.imgURLSmall || team.imgURL, leagueData.sport)}
                                    alt={teamName}
                                    className="h-6 w-6 object-contain"
                                  />
                                )}
                                <span>{teamName}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

              </div>

              {/* Right side: Score Counter */}
              <div className="text-sm sm:text-xl md:text-2xl font-bold shrink-0" data-testid="text-score-counter">
                <span style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary))' }}>
                  {currentRound === 'complete' ? 'Final Score' : 'Score'}: {score}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Info Sub-Header - Only shown when game is complete */}
        {currentRound === 'complete' && (
          <div className="border-b shrink-0" style={{ backgroundColor: `${teamDisplayInfo.colors[0]}dd` || 'hsl(var(--card))' }}>
            <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3">
              <div className="flex items-center justify-center gap-3">
                {teamDisplayInfo.logo && (
                  <img
                    src={getTeamLogoUrl(teamDisplayInfo.logo, leagueData.sport)}
                    alt={teamDisplayInfo.name}
                    className="h-8 w-8 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <h2
                  className="text-lg sm:text-xl font-bold"
                  style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary))' }}
                >
                  {selectedSeason} {teamDisplayInfo.name}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectedTeam && selectedSeason && pushModal({ type: 'team', tid: selectedTeam.tid, season: selectedSeason })}
                  className="animate-on-click"
                  style={{
                    color: teamDisplayInfo.colors[1] || 'hsl(var(--primary))'
                  }}
                >
                  <Info className="h-5 w-5" />
                  <span className="ml-1 hidden sm:inline">Team Info</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Roster Grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-6xl mx-auto px-1 sm:px-4 md:px-6 py-2 sm:py-4 md:py-6">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1 sm:gap-3 md:gap-4">
              {roster.map((rp, index) => {
                const isLeaderRound = currentRound.endsWith('-leader');
  
                return (
                  <div
                    key={rp.player.pid}
                    ref={(el) => {
                      if (el) tileRefs.current.set(rp.player.pid, el);
                    }}
                    onClick={() => {
                      if (isLeaderRound) {
                        handleTileClick(rp.player.pid);
                      } else if (rp.revealed && currentRound === 'complete') {
                        pushModal({ type: 'player', player: rp.player, season: selectedSeason || undefined, teamId: selectedTeam?.tid });
                      }
                    }}
                    className={`relative flex flex-col items-center gap-0.5 p-1 sm:p-2 md:p-3 rounded sm:rounded-md md:rounded-lg transition-all hover:scale-[1.02] ${
                      isLeaderRound || (rp.revealed && currentRound === 'complete') ? 'cursor-pointer' : ''
                    } ${
                      rp.revealed
                        ? 'neon-glow-success shadow-lg shadow-green-500/50'
                        : ''
                    } ${tileAnimations[rp.player.pid] || ''}`}
                    style={{
                      backgroundColor: rp.teamColors?.[1] || 'hsl(var(--card))',
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderColor: rp.teamColors?.[0] || 'hsl(var(--border))',
                    }}
                    data-testid={`card-player-${index}`}
                  >
                  <div className="absolute top-0.5 left-0.5 text-[0.5rem] sm:text-xs font-bold px-0.5 sm:px-1.5 py-0.5 rounded z-10"
                    style={{ backgroundColor: rp.teamColors?.[0] || 'hsl(var(--primary))', color: rp.teamColors?.[1] || 'hsl(var(--primary-foreground))' }}>
                    {rp.position}
                  </div>
  
                  {/* Jersey Number Badge - Always visible, ZenGM style */}
                  {rp.jerseyNumber && rp.teamColors && (
                    <div
                      className="absolute top-0.5 right-0.5 text-[0.7rem] sm:text-[1.1rem] font-extrabold px-0.5 sm:px-1 py-0.5 z-10 min-w-[1.1rem] sm:min-w-[1.75rem] aspect-square flex items-center justify-center"
                      style={{
                        backgroundColor: rp.teamColors[0] || '#000000',
                        color: rp.teamColors[1] || '#ffffff',
                        border: `2px solid ${rp.teamColors[2] || rp.teamColors[0] || '#cccccc'} `,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      {rp.jerseyNumber}
                    </div>
                  )}
  
                  {/* Headshot - Takes up most of the tile */}
                  <div className="w-full aspect-square flex-shrink-0">
                    <PlayerFaceTile
                      player={rp.player}
                      teams={leagueData.teams}
                      sport={leagueData.sport}
                      season={selectedSeason ?? undefined}
                      teamId={selectedTeam?.tid}
                    />
                  </div>
  
                  {/* Name - Compact */}
                  <div className="w-full text-center h-[2rem] sm:h-[3rem] flex items-center justify-center px-0.5 flex-shrink-0">
                    {rp.revealed ? (
                      <p
                        className="text-[0.5rem] sm:text-xs md:text-sm font-bold line-clamp-2 leading-tight"
                        style={{ color: rp.teamColors?.[0] || 'hsl(var(--foreground))' }}
                      >
                        {rp.player.name}
                      </p>
                    ) : rp.hintShown ? (
                      <p
                        className="text-[0.5rem] sm:text-xs md:text-sm font-bold leading-tight"
                        style={{ color: rp.teamColors?.[0] || 'hsl(var(--foreground))' }}
                      >
                        {(() => {
                          const nameParts = rp.player.name.trim().split(' ');
                          const firstName = nameParts[0] || '';

                          // Check if the last part is a suffix (Jr., Sr., II, III, IV, etc.)
                          const suffixPattern = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;
                          let lastName = '';

                          if (nameParts.length > 1) {
                            const lastPart = nameParts[nameParts.length - 1];
                            // If last part is a suffix and there are at least 3 parts, use second-to-last
                            if (suffixPattern.test(lastPart) && nameParts.length > 2) {
                              lastName = nameParts[nameParts.length - 2];
                            } else if (!suffixPattern.test(lastPart)) {
                              lastName = lastPart;
                            } else {
                              // Edge case: "John Jr." - use the suffix
                              lastName = lastPart;
                            }
                          }

                          if (nameParts.length === 1) {
                            return (
                              <>
                                <span style={{ filter: 'none' }}>{firstName.charAt(0)}</span>
                                <span style={{ filter: 'blur(5px)' }}>{firstName.substring(1)}</span>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <span style={{ filter: 'none' }}>{firstName.charAt(0)}</span>
                                <span style={{ filter: 'blur(5px)' }}>{firstName.substring(1)}</span>
                                <span> </span>
                                <span style={{ filter: 'none' }}>{lastName.charAt(0)}</span>
                                <span style={{ filter: 'blur(5px)' }}>{lastName.substring(1)}</span>
                              </>
                            );
                          }
                        })()}
                      </p>
                    ) : (
                      <p
                        className="text-[0.5rem] sm:text-xs md:text-sm font-bold line-clamp-2 leading-tight"
                        style={{
                          color: rp.teamColors?.[0] || 'hsl(var(--foreground))',
                          filter: 'blur(5px)' // Apply blur
                        }}
                      >
                        {rp.player.name}
                      </p>
                    )}
                  </div>

                  {/* Age - Visible during leader rounds, wins-guess, playoff-finish, and complete */}
                  {rp.age && currentRound && (currentRound.includes('-leader') || currentRound === 'wins-guess' || currentRound === 'playoff-finish' || currentRound === 'complete') && (
                    <div className="w-full text-center text-[0.45rem] sm:text-[0.6rem] md:text-[0.7rem] leading-tight mt-1"
                      style={{ color: rp.teamColors?.[0] || 'hsl(var(--foreground))' }}>
                      <p className="mt-[-7px] mb-[-7px]">Age: {rp.age}</p>
                    </div>
                  )}

                  {/* Player Stats - Show when round is complete, wins-guess, or playoff-finish */}
                  {(currentRound === 'complete' || currentRound === 'wins-guess' || currentRound === 'playoff-finish') && (
                    <div className="w-full text-center text-[0.45rem] sm:text-[0.6rem] md:text-[0.7rem] leading-tight mt-1"
                      style={{ color: rp.teamColors?.[0] || 'hsl(var(--foreground))' }}>
                      {/* Ovr/Pot - All sports */}
                      {(() => {
                        const playerRating = rp.player.ratings?.find(r => r.season === selectedSeason);
                        if (playerRating && playerRating.ovr) {
                          return <p>Ovr/Pot: {playerRating.ovr}/{playerRating.pot || '?'}</p>;
                        }
                        return null;
                      })()}

                      {/* Basketball stats */}
                      {leagueData.sport === 'basketball' && rp.stats?.ppg !== undefined && (
                        <>
                          <p>P/R/A/S/B:</p>
                          <p>{rp.stats.ppg?.toFixed(1)}/{rp.stats.rpg?.toFixed(1)}/{rp.stats.apg?.toFixed(1)}/{rp.stats.spg?.toFixed(1)}/{rp.stats.bpg?.toFixed(1)}</p>
                          {rp.advancedStats && (
                            <>
                              <p>Splits: {rp.advancedStats.fgp?.toFixed(1)}%/{rp.advancedStats.tpp?.toFixed(1)}%/{rp.advancedStats.ftp?.toFixed(1)}%</p>
                              <p>PER: {rp.advancedStats.per?.toFixed(1)}</p>
                              <p>TS%: {rp.advancedStats.ts?.toFixed(1)}%</p>
                            </>
                          )}
                        </>
                      )}

                      {/* Football stats */}
                      {leagueData.sport === 'football' && rp.stats?.line1 !== undefined && (
                        <>
                          {/* Position-specific labels */}
                          {rp.position === 'QB' && (
                            <>
                              {rp.stats.line1 && <><p>Pass Yds/TD/INT:</p><p>{rp.stats.line1}</p></>}
                              {rp.stats.line2 && <><p>Comp% / Y/A:</p><p>{rp.stats.line2}</p></>}
                              {rp.stats.line3 && <p>{rp.stats.line3}</p>}
                            </>
                          )}
                          {rp.position === 'RB' && (
                            <>
                              {rp.stats.line1 && <><p>Rush Yds/TD/Att:</p><p>{rp.stats.line1}</p></>}
                              {rp.stats.line2 && <><p>Catch% / YPC:</p><p>{rp.stats.line2}</p></>}
                              {rp.stats.line3 && <p>{rp.stats.line3}</p>}
                            </>
                          )}
                          {(rp.position === 'WR' || rp.position === 'TE') && (
                            <>
                              {rp.stats.line1 && <><p>Rec/Yds/TD:</p><p>{rp.stats.line1}</p></>}
                              {rp.stats.line2 && <><p>Catch% / Yds/Target:</p><p>{rp.stats.line2}</p></>}
                              {rp.stats.line3 && <p>{rp.stats.line3}</p>}
                            </>
                          )}
                          {rp.position === 'DL' && (
                            <>
                              {rp.stats.line1 && <><p>Tck/Sacks/FF:</p><p>{rp.stats.line1}</p></>}
                              {rp.stats.line2 && <><p>TFL / PD:</p><p>{rp.stats.line2}</p></>}
                              {rp.stats.line3 && <p>{rp.stats.line3}</p>}
                            </>
                          )}
                          {rp.position === 'LB' && (
                            <>
                              {rp.stats.line1 && <><p>Tck/Sacks/INT:</p><p>{rp.stats.line1}</p></>}
                              {rp.stats.line2 && <><p>TFL / PD:</p><p>{rp.stats.line2}</p></>}
                              {rp.stats.line3 && <p>{rp.stats.line3}</p>}
                            </>
                          )}
                          {(rp.position === 'CB' || rp.position === 'S') && (
                            <>
                              {rp.stats.line1 && <><p>Tck/INT/PD:</p><p>{rp.stats.line1}</p></>}
                              {rp.stats.line2 && <><p>INT Yds/TD:</p><p>{rp.stats.line2}</p></>}
                              {rp.stats.line3 && <p>{rp.stats.line3}</p>}
                            </>
                          )}
                          {rp.position === 'K' && (
                            <>
                              {rp.stats.line1 && <><p>FGM/FGA/XPM:</p><p>{rp.stats.line1}</p></>}
                              {rp.stats.line2 && <><p>FG% / Long:</p><p>{rp.stats.line2}</p></>}
                              {rp.stats.line3 && <p>{rp.stats.line3}</p>}
                            </>
                          )}
                          {rp.position === 'P' && (
                            <>
                              {rp.stats.line1 && <><p>Punts/Yds/Avg:</p><p>{rp.stats.line1}</p></>}
                              {rp.stats.line2 && <><p>In20/TB/Blk:</p><p>{rp.stats.line2}</p></>}
                              {rp.stats.line3 && <p>{rp.stats.line3}</p>}
                            </>
                          )}
                          {rp.position === 'OL' && (
                            <>
                              {rp.stats.line3 && <p>{rp.stats.line3}</p>}
                            </>
                          )}
                        </>
                      )}

                      {/* Hockey stats */}
                      {leagueData.sport === 'hockey' && rp.stats?.line1 !== undefined && (
                        <>
                          {/* Goalies */}
                          {rp.position === 'G' && (
                            <>
                              {rp.stats.line1 && <><p>W/L/SO:</p><p>{rp.stats.line1}</p></>}
                              {rp.stats.line2 && <><p>SV%:</p><p>{rp.stats.line2}</p></>}
                              {rp.stats.line3 && <><p>GAA:</p><p>{rp.stats.line3}</p></>}
                            </>
                          )}
                          {/* Skaters (C, W, D) */}
                          {(rp.position === 'C' || rp.position === 'W' || rp.position === 'D') && (
                            <>
                              {rp.stats.line1 && <><p>G/A/Pts:</p><p>{rp.stats.line1}</p></>}
                              {rp.stats.line2 && <><p>+/-:</p><p>{rp.stats.line2}</p></>}
                              {rp.stats.line3 && <><p>TOI (avg):</p><p>{rp.stats.line3}</p></>}
                            </>
                          )}
                        </>
                      )}

                      {/* Baseball stats */}
                      {leagueData.sport === 'baseball' && rp.stats?.line1 !== undefined && (
                        <>
                          {/* Pitchers (SP, RP) */}
                          {(rp.position === 'SP' || rp.position === 'RP') && (
                            <>
                              {rp.stats.line1 && <><p>WAR/W/L/ERA:</p><p>{rp.stats.line1}</p></>}
                              {rp.stats.line2 && <><p>GP/GS/SV:</p><p>{rp.stats.line2}</p></>}
                              {rp.stats.line3 && <><p>IP/SO/WHIP:</p><p>{rp.stats.line3}</p></>}
                            </>
                          )}
                          {/* Hitters (C, 1B, 2B, 3B, SS, LF, CF, RF) */}
                          {(rp.position === 'C' || rp.position === '1B' || rp.position === '2B' ||
                            rp.position === '3B' || rp.position === 'SS' || rp.position === 'LF' ||
                            rp.position === 'CF' || rp.position === 'RF') && (
                            <>
                              {rp.stats.line1 && <><p>WAR/PA/H/HR/BA:</p><p>{rp.stats.line1}</p></>}
                              {rp.stats.line2 && <><p>R/RBI/SB:</p><p>{rp.stats.line2}</p></>}
                              {rp.stats.line3 && <><p>OBP/SLG/OPS:</p><p>{rp.stats.line3}</p></>}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Actions - Hide when breakdown modal is open */}
        {!modalStack.some(m => m.type === 'breakdown') && (
          <div className="shrink-0 bg-background/95 border-t neon-border-subtle relative z-[100]">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              {/* Center: Search input (guess/hint rounds) OR Leader prompt (leader rounds) */}
              {(currentRound === 'guess' || currentRound === 'hint') ? (
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    type="text"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={currentRound === 'guess' ? "Guess a player correctly for 15 points..." : "Guess a player correctly for 10 points..."}
                    className="text-sm sm:text-lg py-6 neon-input placeholder:text-xs sm:placeholder:text-sm"
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-testid="input-player-guess"
                  />

                  {/* Autocomplete Dropdown */}
                  {autocompleteOpen && (
                    <div
                      ref={autocompleteRef}
                      className="absolute z-[9999] w-full bottom-full mb-2 bg-card border neon-border rounded-lg shadow-lg max-h-[400px] overflow-y-auto"
                      data-testid="autocomplete-dropdown"
                    >
                      <div className="py-2">
                        {autocompleteSuggestions.map((player, index) => {
                          // Get player's position - check if they have season-specific position first
                          const rating = player.ratings?.find(r => r.season === selectedSeason);
                          const position = rating?.pos || player.pos || 'F';

                          return (
                            <div
                              key={player.pid}
                              data-index={index}
                              className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-all hover:bg-accent/50 ${
                                index === activeIndex ? 'bg-accent neon-glow' : ''
                              }`}
                              onClick={() => handleSelectPlayer(player)}
                              data-testid={`autocomplete-option-${index}`}
                            >
                              <div className="shrink-0 w-16 h-16">
                                <PlayerFace
                                  pid={player.pid}
                                  name={player.name}
                                  imgURL={player.imgURL ?? undefined}
                                  face={player.face}
                                  size={64}
                                  hideName={true}
                                  player={player}
                                  teams={leagueData.teams}
                                  sport={leagueData.sport}
                                  season={player.stats?.some(s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid) ? (selectedSeason ?? undefined) : undefined}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-lg font-medium truncate">
                                  {player.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {position}
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                className="shrink-0 animate-on-click"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectPlayer(player);
                                }}
                                data-testid={`button-select-${index}`}
                              >
                                Select
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : currentRound === 'wins-guess' ? (
                /* Wins Guess Phase */
                winsGuessData ? (
                  <div className="flex-1" onKeyDown={handleWinsGuessKeyDown} tabIndex={0} data-testid="wins-guess-container">
                    <div className="space-y-4">
                      {/* Title */}
                      <div className="text-center">
                        <p className="text-xl sm:text-2xl font-bold text-white">
                          How many wins did {teamDisplayInfo.name} have in {selectedSeason}?
                        </p>
                      </div>

                      {/* Slider Track */}
                      <div className="px-4">
                        <div className="relative h-16">
                          {/* Track background */}
                          <div className="absolute top-6 left-0 right-0 h-2 bg-muted rounded-full"></div>

                          {/* Tick marks */}
                          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                            const tickPos = Math.round(winsGuessData.totalGames * pct);
                            const leftPct = (tickPos / winsGuessData.totalGames) * 100;
                            return (
                              <div key={pct} className="absolute" style={{ left: `${leftPct}%`, top: '0' }}>
                                <div className="relative" style={{ transform: 'translateX(-50%)' }}>
                                  <div className="w-px h-4 bg-muted-foreground/50"></div>
                                  <div className="text-xs text-muted-foreground mt-1">{tickPos}</div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Draggable Window */}
                          <div
                            className="absolute top-5 h-4 bg-primary/80 rounded cursor-grab active:cursor-grabbing border-2 border-primary"
                            style={{
                              left: `${(winsGuessPosition / winsGuessData.totalGames) * 100}%`,
                              width: `${(winsGuessData.windowWidth / winsGuessData.totalGames) * 100}%`,
                            }}
                            onMouseDown={(e) => {
                              if (winsGuessSubmitted) return;
                              const startX = e.clientX;
                              const startPos = winsGuessPosition;

                              // Capture track width before event completes (e.currentTarget becomes null later)
                              const trackWidth = e.currentTarget.parentElement?.clientWidth || 0;
                              if (!trackWidth) return;

                              const handleMouseMove = (moveE: MouseEvent) => {
                                const deltaX = moveE.clientX - startX;
                                const deltaWins = Math.round((deltaX / trackWidth) * winsGuessData.totalGames);
                                handleWinsGuessSliderMove(startPos + deltaWins);
                              };

                              const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                              };

                              document.addEventListener('mousemove', handleMouseMove);
                              document.addEventListener('mouseup', handleMouseUp);
                            }}
                            onTouchStart={(e) => {
                              if (winsGuessSubmitted) return;
                              const touch = e.touches[0];
                              const startX = touch.clientX;
                              const startPos = winsGuessPosition;

                              // Capture track width before event completes (e.currentTarget becomes null later)
                              const trackWidth = e.currentTarget.parentElement?.clientWidth || 0;
                              if (!trackWidth) return;

                              const handleTouchMove = (moveE: TouchEvent) => {
                                moveE.preventDefault(); // Prevent scrolling while dragging
                                const touch = moveE.touches[0];
                                const deltaX = touch.clientX - startX;
                                const deltaWins = Math.round((deltaX / trackWidth) * winsGuessData.totalGames);
                                handleWinsGuessSliderMove(startPos + deltaWins);
                              };

                              const handleTouchEnd = () => {
                                document.removeEventListener('touchmove', handleTouchMove as any);
                                document.removeEventListener('touchend', handleTouchEnd);
                              };

                              document.addEventListener('touchmove', handleTouchMove as any, { passive: false });
                              document.addEventListener('touchend', handleTouchEnd);
                            }}
                            data-testid="wins-guess-slider"
                          ></div>

                          {/* Actual wins marker (shown after submit) */}
                          {winsGuessSubmitted && (
                            <div
                              className="absolute top-3 w-1 h-8 bg-green-500"
                              style={{
                                left: `${(winsGuessData.actualWins / winsGuessData.totalGames) * 100}%`,
                                transform: 'translateX(-50%)',
                              }}
                              data-testid="actual-wins-marker"
                            ></div>
                          )}
                        </div>

                        {/* Range Display */}
                        <div className="text-center mt-6">
                          <p className="text-lg text-white">
                            Selected Range: <span className="font-bold">{winsGuessPosition}–{winsGuessPosition + winsGuessData.windowWidth - 1}</span> wins
                          </p>
                          {winsGuessSubmitted && (
                            <p className="text-lg mt-2">
                              <span className={winsGuessData.actualWins >= winsGuessPosition && winsGuessData.actualWins <= winsGuessPosition + winsGuessData.windowWidth - 1 ? 'text-green-400' : 'text-red-400'}>
                                Actual: {winsGuessData.actualWins} wins
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Submit Button */}
                        {!winsGuessSubmitted && (
                          <div className="text-center mt-4">
                            <Button
                              onClick={handleWinsGuessSubmit}
                              className="neon-button animate-on-click px-8"
                              data-testid="button-submit-wins-guess"
                            >
                              Submit Guess
                            </Button>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                ) : null
              ) : currentRound === 'playoff-finish' ? (
                /* Playoff Finish Phase */
                playoffFinishData ? (
                  <div className="flex-1">
                    <div className="space-y-2 sm:space-y-4">
                      {/* Title */}
                      <div className="text-center px-2">
                        <p className="text-base sm:text-xl md:text-2xl font-bold text-white">
                          How far did {teamDisplayInfo.name} go in the playoffs during {selectedSeason}?
                        </p>
                      </div>

                      {/* Mobile: Dropdown Select (shows on small screens) */}
                      <div className="md:hidden px-4">
                        <select
                          value={playoffFinishGuess ?? ''}
                          onChange={(e) => !playoffFinishSubmitted && setPlayoffFinishGuess(Number(e.target.value))}
                          disabled={playoffFinishSubmitted}
                          className={`
                            w-full p-3 rounded-lg border-2 text-center font-semibold transition-all
                            bg-background text-foreground
                            ${playoffFinishGuess !== null
                              ? 'border-primary bg-primary/10'
                              : 'border-muted bg-muted/10'
                            }
                            ${playoffFinishSubmitted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                          `}
                          data-testid="playoff-finish-select"
                        >
                          <option value="" disabled>Select playoff finish...</option>
                          {playoffFinishData.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Desktop/Tablet: Button Grid (hidden on small screens) */}
                      <div className="hidden md:grid grid-cols-2 gap-2 max-w-2xl mx-auto px-4">
                        {playoffFinishData.options.map((option) => {
                          // Only show result colors if: submitted, has guess, and the guess is a valid option in current game
                          const isValidGuess = playoffFinishGuess !== null && playoffFinishData.options.some(opt => opt.value === playoffFinishGuess);
                          const isCorrectGuess = isValidGuess && option.value === playoffFinishGuess && option.value === playoffFinishData.finishValue;
                          const isIncorrectGuess = isValidGuess && option.value === playoffFinishGuess && option.value !== playoffFinishData.finishValue;

                          return (
                            <button
                              key={option.value}
                              onClick={() => !playoffFinishSubmitted && setPlayoffFinishGuess(option.value)}
                              disabled={playoffFinishSubmitted}
                              className={`
                                p-3 rounded-lg border-2 text-center font-semibold transition-all text-sm
                                ${playoffFinishGuess === option.value && !playoffFinishSubmitted
                                  ? 'border-primary bg-primary/20 text-white'
                                  : !playoffFinishSubmitted ? 'border-muted bg-muted/10 text-muted-foreground hover:border-primary/50 hover:bg-primary/10' : ''
                                }
                                ${playoffFinishSubmitted && isCorrectGuess
                                  ? 'border-green-500 bg-green-500/20 text-green-400'
                                  : ''
                                }
                                ${playoffFinishSubmitted && isIncorrectGuess
                                  ? 'border-red-500 bg-red-500/20 text-red-400'
                                  : ''
                                }
                                ${playoffFinishSubmitted && !isCorrectGuess && !isIncorrectGuess
                                  ? 'border-muted bg-muted/10 text-muted-foreground'
                                  : ''
                                }
                                ${playoffFinishSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'}
                              `}
                              data-testid={`playoff-option-${option.value}`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Submit Button */}
                      {!playoffFinishSubmitted && playoffFinishGuess !== null && (
                        <div className="text-center mt-2 sm:mt-4">
                          <Button
                            onClick={handlePlayoffFinishSubmit}
                            className="neon-button animate-on-click px-6 sm:px-8 text-sm sm:text-base"
                            data-testid="button-submit-playoff-finish"
                          >
                            Submit Answer
                          </Button>
                        </div>
                      )}

                      {/* Result Display */}
                      {playoffFinishSubmitted && (
                        <div className="text-center mt-2 sm:mt-4 px-2">
                          <p className={`text-sm sm:text-lg font-semibold ${playoffFinishGuess === playoffFinishData.finishValue ? 'text-green-400' : 'text-red-400'}`}>
                            {playoffFinishGuess === playoffFinishData.finishValue
                              ? `Correct! +10 points`
                              : `Incorrect. ${
                                  playoffFinishData.finishLabel === 'Won Championship'
                                    ? 'They won the championship.'
                                    : playoffFinishData.finishLabel === 'Missed Playoffs'
                                    ? 'They missed the playoffs.'
                                    : playoffFinishData.finishLabel.startsWith('Lost ')
                                    ? `They lost in the ${playoffFinishData.finishLabel.substring(5).toLowerCase()}.`
                                    : playoffFinishData.finishLabel
                                }`
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null
              ) : currentRound === 'complete' ? (
                /* Complete Phase - Show Final Score and Breakdown Button */
                <div className="flex-1 flex items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-white">
                      Final Score: {score}
                    </p>
                  </div>
                  <Button
                    onClick={() => pushModal({ type: 'breakdown' })}
                    className="neon-button animate-on-click"
                    data-testid="button-show-breakdown"
                  >
                    View Breakdown
                  </Button>
                </div>
              ) : currentRound.endsWith('-leader') ? (
                /* Leader round prompt - centered in footer */
                <div className="flex-1 text-center">
                  <p className={`text-lg sm:text-xl md:text-2xl font-bold text-white ${triggerBounceAnimation ? 'animate-bounce-once' : ''}`}>
                    {/* Basketball rounds */}
                    {currentRound === 'points-leader' && 'Click on the Team Points Leader'}
                    {currentRound === 'rebounds-leader' && 'Click on the Team Rebounds Leader'}
                    {currentRound === 'assists-leader' && 'Click on the Team Assists Leader'}
                    {currentRound === 'steals-leader' && 'Click on the Team Steals Leader'}
                    {currentRound === 'blocks-leader' && 'Click on the Team Blocks Leader'}
                    {/* Football rounds */}
                    {currentRound === 'passing-yards-leader' && 'Click on the Team Passing Yards Leader'}
                    {currentRound === 'rushing-yards-leader' && 'Click on the Team Rushing Yards Leader'}
                    {currentRound === 'receiving-yards-leader' && 'Click on the Team Receiving Yards Leader'}
                    {currentRound === 'tackles-leader' && 'Click on the Team Tackles Leader'}
                    {currentRound === 'sacks-leader' && 'Click on the Team Sacks Leader'}
                    {currentRound === 'interceptions-leader' && 'Click on the Team Interceptions Leader'}
                    {/* Baseball rounds */}
                    {currentRound === 'hits-leader' && 'Click on the Team Hits Leader'}
                    {currentRound === 'home-runs-leader' && 'Click on the Team Home Runs Leader'}
                    {currentRound === 'rbis-leader' && 'Click on the Team RBIs Leader'}
                    {currentRound === 'stolen-bases-leader' && 'Click on the Team Stolen Bases Leader'}
                    {currentRound === 'strikeouts-leader' && 'Click on the Team Strikeouts Leader'}
                    {currentRound === 'wins-leader' && 'Click on the Team Wins Leader'}
                    {/* Hockey rounds */}
                    {currentRound === 'goals-leader' && 'Click on the Team Goals Leader'}
                    {currentRound === 'goalie-wins-leader' && 'Click on the Team Goalie Wins Leader'}
                    {/* Show correct answer after click */}
                    {clickedLeaderInfo && (
                      <span className="ml-2 text-green-400">
                        — {clickedLeaderInfo.name} ({clickedLeaderInfo.statValue})
                      </span>
                    )}
                  </p>
                </div>
              ) : null}

              {/* Right: Next Round button (only show in guess and hint rounds) */}
              {(currentRound === 'guess' || currentRound === 'hint') && (
                <Button
                  variant="default"
                  size="lg"
                  onClick={handleNextRound}
                  className="neon-button animate-on-click ml-auto bg-red-600 hover:bg-red-700"
                  data-testid="button-next-round"
                >
                  <span className="hidden sm:inline">
                    {currentRound === 'guess' ? 'Hint Round' : 'Stat Leaders'}
                  </span>
                  <ArrowRight className="h-5 w-5 sm:ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Render modal stack */}
        {modalStack.map((modal, index) => {
          if (modal.type === 'player') {
            return (
              <PlayerPageModal
                key={`player-${index}`}
                player={modal.player}
                sport={leagueData.sport || 'basketball'}
                teams={leagueData.teams}
                season={modal.season}
                teamId={modal.teamId}
                onCloseTop={popModal}
                onCloseAll={clearModals}
                stackIndex={index}
                onTeamClick={handleOpenOpponentTeam}
              />
            );
          } else if (modal.type === 'team') {
            try {
              const team = leagueData.teams.find(t => t.tid === modal.tid);
              if (!team) return null;

              const teamRoster = buildTeamRosterForModal(modal.tid, modal.season);
              const seasonInfo = team.seasons?.find(s => s.season === modal.season);
              const teamLogo = seasonInfo?.imgURL || team.imgURL;
              const teamColors = seasonInfo?.colors || team.colors || ['#000000', '#ffffff'];
              const teamRegion = seasonInfo?.region || team.region || '';
              const teamNickname = seasonInfo?.name || team.name || `Team ${team.tid}`;
              const teamName = teamRegion ? `${teamRegion} ${teamNickname}` : teamNickname;
              const teamAbbrev = seasonInfo?.abbrev || team.abbrev || '';

              const teamStats = calculateTeamStats(leagueData, modal.tid, modal.season, teamRoster);

              return (
                <TeamInfoModal
                  key={`team-${index}`}
                  open={true}
                  onCloseTop={popModal}
                  onCloseAll={clearModals}
                  stackIndex={index}
                  season={modal.season}
                  teamName={teamName}
                  teamAbbrev={teamAbbrev}
                  teamLogo={teamLogo ? getTeamLogoUrl(teamLogo, leagueData.sport || 'basketball') : undefined}
                  teamColors={teamColors}
                  players={teamRoster}
                  sport={leagueData.sport || 'basketball'}
                  teams={leagueData.teams}
                  teamStats={teamStats}
                  playoffSeriesData={leagueData.playoffSeries?.find(ps => ps.season === modal.season)}
                  teamTid={modal.tid}
                  onOpenOpponentTeam={handleOpenOpponentTeam}
                  allPlayoffSeries={leagueData.playoffSeries}
                  onPlayerClick={(player) => pushModal({ type: 'player', player, season: modal.season, teamId: modal.tid })}
                />
              );
            } catch (error) {
              console.error('Error rendering team modal:', error);
              return null;
            }
          } else if (modal.type === 'breakdown') {
            // Use history entry data if available, otherwise use current game data
            let breakdownData: ScoreSummaryData | null = null;

            if (modal.historyEntry?.summaryData) {
              // History entry has compact data - hydrate it
              breakdownData = hydrateCompactSummaryData(modal.historyEntry.summaryData, playersByPid);

              if (!breakdownData) {
                // Couldn't hydrate - league doesn't match
                return (
                  <div
                    key={`breakdown-error-${index}`}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
                    style={{ zIndex: 1000 + index * 10 }}
                    onClick={clearModals}
                  >
                    <div
                      className="bg-card rounded-lg p-6 max-w-md w-full text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="text-lg font-semibold mb-2">League Mismatch</h3>
                      <p className="text-muted-foreground mb-4">
                        This game was played with a different league file. Upload the matching league file to view full details.
                      </p>
                      <Button onClick={clearModals}>Close</Button>
                    </div>
                  </div>
                );
              }
            } else {
              breakdownData = scoreSummaryData;
            }

            const breakdownSeason = modal.historyEntry?.season || selectedSeason;
            const breakdownTeam = modal.historyEntry
              ? leagueData.teams.find(t => t.abbrev === modal.historyEntry!.teamAbbrev)
              : selectedTeam;

            if (!breakdownData) return null;

            return (
              <ScoreSummaryModal
                key={`breakdown-${index}`}
                open={true}
                onCloseTop={popModal}
                onCloseAll={clearModals}
                stackIndex={index}
                data={breakdownData}
                teams={leagueData.teams}
                sport={leagueData.sport || 'basketball'}
                onPlayerClick={(player) => pushModal({ type: 'player', player, season: breakdownSeason || undefined, teamId: breakdownTeam?.tid })}
                onTeamInfoClick={() => breakdownTeam && breakdownSeason && pushModal({ type: 'team', tid: breakdownTeam.tid, season: breakdownSeason })}
                onPlayAgain={() => {
                  clearModals();
                  handleNewYearSameTeam();
                }}
                onNewSeason={() => {
                  clearModals();
                  handleNew();
                }}
              />
            );
          } else if (modal.type === 'history') {
            return (
              <HistoryModal
                key={`history-${index}`}
                open={true}
                onCloseTop={popModal}
                onCloseAll={clearModals}
                stackIndex={index}
                history={gameHistory}
                leagueFingerprintId={leagueFingerprintId ?? undefined}
                onGameClick={(entry) => {
                  pushModal({ type: 'breakdown', historyEntry: entry });
                }}
                onPlayerClick={(player) => {
                  pushModal({ type: 'player', player, season: selectedSeason || undefined, teamId: selectedTeam?.tid });
                }}
                onTeamInfoClick={(season) => {
                  // Find the team by abbrev from the selected history entry
                  const historyEntry = gameHistory.find(h => h.season === season);
                  if (historyEntry) {
                    const team = leagueData.teams.find(t => t.abbrev === historyEntry.teamAbbrev);
                    if (team) {
                      pushModal({ type: 'team', tid: team.tid, season });
                    }
                  }
                }}
                onDeleteGame={async (id) => {
                  await deleteGameFromHistory(id);
                  // Reload history
                  const allHistory = await loadGameHistory();
                  const filteredHistory = leagueFingerprintId
                    ? allHistory.filter(entry => entry.leagueFingerprintId === leagueFingerprintId)
                    : allHistory;
                  setGameHistory(filteredHistory);
                }}
                onDeleteHistory={async () => {
                  if (leagueFingerprintId) {
                    await deleteLeagueHistory(leagueFingerprintId);
                    setGameHistory([]);
                  }
                }}
                onDeleteBelowThreshold={async (threshold) => {
                  if (leagueFingerprintId) {
                    await deleteLeagueHistoryBelowThreshold(leagueFingerprintId, threshold);
                    // Reload and filter history
                    const allHistory = await loadGameHistory();
                    const filteredHistory = allHistory.filter(entry => entry.leagueFingerprintId === leagueFingerprintId);
                    setGameHistory(filteredHistory);
                  }
                }}
                onImportComplete={async () => {
                  // Reload history after import
                  const allHistory = await loadGameHistory();
                  const filteredHistory = leagueFingerprintId
                    ? allHistory.filter(entry => entry.leagueFingerprintId === leagueFingerprintId)
                    : allHistory;
                  setGameHistory(filteredHistory);
                }}
              />
            );
          }
          return null;
        })}
          </>

        {/* Help Modal */}
        <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
          <DialogContent
            className="max-w-2xl max-h-[65vh] sm:max-h-[80vh] !z-[10000] top-[10vh] bottom-[10vh] sm:top-[50%] sm:bottom-auto translate-y-0 sm:translate-y-[-50%] mb-[10vh] sm:mb-0 [&>div]:!p-[2px] [&>div>div]:!p-6"
            style={{ zIndex: 10000 }}
            overlayClassName="!z-[9999]"
            overlayStyle={{
              zIndex: 9999,
              ['--team-color-bg' as string]: teamDisplayInfo.colors[0],
              ['--team-color-border' as string]: teamDisplayInfo.colors[1]
            }}
          >
            <style>{`
              [data-state="open"][role="dialog"] > div {
                background: ${teamDisplayInfo.colors[1]} !important;
              }
              [data-state="open"][role="dialog"] > div > div {
                background: ${teamDisplayInfo.colors[0]} !important;
              }
            `}</style>
            <DialogHeader>
              <DialogDescription className="sr-only">Learn how to play Team Trivia mode</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 text-sm overflow-y-auto max-h-[55vh] sm:max-h-[70vh]" style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--foreground))' }}>
              <section>
                <h3 className="text-lg font-semibold mb-2">Rounds 1–2: Roster Recall</h3>
                <div className="space-y-1">
                  <p><strong>Goal:</strong> type players' names to reveal that season's roster spots.</p>
                  <p><strong>Guesses:</strong> unlimited, no penalty for wrong answers.</p>
                  <p className="mt-2"><strong>Round 1 — No Hints:</strong> +15 per correct.</p>
                  <p><strong>Round 2 — Initials Shown:</strong> first + last name initials appear for unrevealed players. +10 per correct.</p>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Stat Leaders (varies by sport)</h3>
                <div className="space-y-1">
                  <p><strong>Goal:</strong> pick the team's leader in each category. One attempt per category.</p>
                  <p><strong>Scoring:</strong> +10 per correct. Ties count as correct.</p>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Wins Guess</h3>
                <div className="space-y-1">
                  <p><strong>Goal:</strong> guess how many regular-season wins the team had.</p>
                  <p><strong>Attempts:</strong> one.</p>
                  <p><strong>Scoring:</strong> +10 if you guess the total.</p>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Playoff Finish</h3>
                <div className="space-y-1">
                  <p><strong>Goal:</strong> choose how far the team went (e.g., Missed Playoffs, Lost R1…Finals, Champion).</p>
                  <p><strong>Attempts:</strong> one.</p>
                  <p><strong>Scoring:</strong> +10 if correct.</p>
                </div>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
