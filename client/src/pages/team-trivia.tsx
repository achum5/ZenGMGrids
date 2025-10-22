import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlayerFace } from '@/components/PlayerFace';
import { useToast } from '@/lib/hooks/use-toast';
import { Shuffle, Home as HomeIcon, ArrowLeft, ChevronDown, ArrowRight, Info } from 'lucide-react';


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
import { RulesModal } from '@/components/RulesModal';
import { AccentLine } from '@/components/AccentLine';
import { CompactScoreCard } from '@/components/CompactScoreCard';
import { TeamInfoModal } from '@/components/TeamInfoModal';
import { ScoreSummaryModal, type ScoreSummaryData } from '@/components/ScoreSummaryModal';
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
  stats: any; // Flexible stats object for different sports/positions
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
}

interface RoundScore {
  round: string;
  roundLabel: string;
  guesses: number;
  points: number;
  details: string;
}

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
  'guess': 'Guess the players on this team',
  'hint': 'Hints revealed! Keep guessing',
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
  'guess': 'Guess the players on this team',
  'hint': 'Hints revealed! Keep guessing',
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
  'guess': 'Guess the players on this team',
  'hint': 'Hints revealed! Keep guessing',
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
  'guess': 'Guess the players on this team',
  'hint': 'Hints revealed! Keep guessing',
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

  // Count seasons with this team up to and including the selected season
  const seasonsWithTeam = player.stats.filter(stat =>
    stat.tid === tid && stat.season <= season
  );

  return seasonsWithTeam.length;
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
function getTeamPlayoffResult(
  leagueData: LeagueData,
  tid: number,
  season: number
): { label: string; value: number; seriesScore: string | null } {
  let finishLabel = 'Missed Playoffs';
  let finishValue = -1;
  let seriesScore: string | null = null;

  const seasonPlayoffs = leagueData.playoffSeries?.find(ps => ps.season === season);

  if (seasonPlayoffs?.series) {
    const rounds = seasonPlayoffs.series;
    const numRounds = rounds.length;

    for (let r = 0; r < numRounds; r++) {
      const matchup = rounds[r]?.find(
        m => m?.home?.tid === tid || m?.away?.tid === tid
      );

      if (!matchup) {
        continue;
      }

      const isHome = matchup.home?.tid === tid;
      const teamSide = isHome ? matchup.home : matchup.away;
      const oppSide = isHome ? matchup.away : matchup.home;
      const teamWins = teamSide?.won ?? 0;
      const oppWins = oppSide?.won ?? 0;

      seriesScore = `${teamWins}–${oppWins}`;

      if (r === numRounds - 1 && teamWins > oppWins) {
        finishLabel = 'Won Championship';
        finishValue = 4;
        break;
      }

      if (teamWins < oppWins) {
        finishValue = r;

        if (numRounds === 4) {
          finishLabel =
            r === 0
              ? 'Lost First Round'
              : r === 1
              ? 'Lost Second Round'
              : r === 2
              ? 'Lost Conference Finals'
              : 'Lost Finals';
        } else if (numRounds === 3) {
          finishLabel =
            r === 0
              ? 'Lost First Round'
              : r === 1
              ? 'Lost Second Round'
              : 'Lost Finals';
        } else if (numRounds === 2) {
          finishLabel = r === 0 ? 'Lost First Round' : 'Lost Finals';
        } else {
          finishLabel = r === numRounds - 1 ? 'Lost Finals' : `Lost Round ${r + 1}`;
        }
        break;
      }
    }
  }

  return { label: finishLabel, value: finishValue, seriesScore };
}

function calculateTeamStats(
  leagueData: LeagueData,
  tid: number,
  season: number,
  roster: any[]
): { wins: number; losses: number; teamRating: number; avgAge: number; playoffResult: string } | undefined {
  // Get team season record
  const teamSeason = leagueData.teamSeasons?.find(
    ts => ts.tid === tid && ts.season === season && !ts.playoffs
  );

  if (!teamSeason) return undefined;

  const wins = teamSeason.won || 0;
  const losses = teamSeason.lost || 0;

  // Calculate average age weighted by minutes played
  let totalWeightedAge = 0;
  let totalMinutes = 0;

  roster.forEach(rp => {
    if (rp.age && rp.stats?.mpg) {
      const minutesPlayed = rp.stats.mpg * rp.gamesPlayed;
      totalWeightedAge += rp.age * minutesPlayed;
      totalMinutes += minutesPlayed;
    }
  });

  const avgAge = totalMinutes > 0 ? totalWeightedAge / totalMinutes : 0;

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

  const playoffResult = getTeamPlayoffResult(leagueData, tid, season).label;

  return {
    wins,
    losses,
    teamRating,
    avgAge,
    playoffResult,
  };
}

export default function TeamTrivia({ leagueData, onBackToModeSelect, onGoHome }: TeamTriviaProps) {
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
  
  // Debug: Log leagueData on mount
  useEffect(() => {
    console.log('[TeamTrivia] Component mounted with leagueData:', {
      sport: leagueData.sport,
      players: leagueData.players?.length,
      teams: leagueData.teams?.length,
      teamSeasons: leagueData.teamSeasons?.length,
      sampleTeamSeason: leagueData.teamSeasons?.[0]
    });
  }, []);
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
  const [showBreakdownModal, setShowBreakdownModal] = useState(false); // Show breakdown dialog
  const [showTeamInfo, setShowTeamInfo] = useState(false); // Show team info modal
  const [opponentTeamInfo, setOpponentTeamInfo] = useState<{ tid: number; season: number } | null>(null); // Opponent team modal state

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

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Get sport-specific round order
  const ROUND_ORDER = leagueData.sport === 'football' 
    ? FOOTBALL_ROUND_ORDER 
    : leagueData.sport === 'baseball'
    ? BASEBALL_ROUND_ORDER
    : leagueData.sport === 'hockey'
    ? HOCKEY_ROUND_ORDER
    : BASKETBALL_ROUND_ORDER;

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
    leagueData.players.forEach(player => {
      player.seasons?.forEach(season => {
        if (!season.playoffs) {
          seasons.add(season.season);
        }
      });
    });
    return Array.from(seasons).sort((a, b) => b - a); // Most recent first
  }, [leagueData.players]);

  // Get all teams (sorted alphabetically)
  const allTeams = useMemo(() => {
    return leagueData.teams
      .filter(team => !team.disabled)
      .sort((a, b) => {
        const nameA = a.region && a.name ? `${a.region} ${a.name}` : a.abbrev;
        const nameB = b.region && b.name ? `${b.region} ${b.name}` : b.abbrev;
        return nameA.localeCompare(nameB);
      });
  }, [leagueData.teams]);

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

    return allTeams.filter(team => teamsWithPlayers.has(team.tid));
  }, [selectedSeason, allTeams, leagueData.players]);

  // Calculate wins guess data (G, A, W)
  const winsGuessData = useMemo(() => {
    console.log('[WinsGuess] Computing winsGuessData...', {
      selectedSeason,
      selectedTeam: selectedTeam?.tid,
      hasTeamSeasons: !!leagueData.teamSeasons,
      teamSeasonsCount: leagueData.teamSeasons?.length
    });

    if (!selectedSeason || !selectedTeam || !leagueData.teamSeasons) {
      console.warn('[WinsGuess] Missing required data:', {
        selectedSeason: !!selectedSeason,
        selectedTeam: !!selectedTeam,
        teamSeasons: !!leagueData.teamSeasons
      });
      return null;
    }

    // Find the team's regular season record for this season
    const teamSeasonRecord = leagueData.teamSeasons.find(
      ts => ts.tid === selectedTeam.tid && ts.season === selectedSeason && !ts.playoffs
    );

    console.log('[WinsGuess] Looking for record:', {
      tid: selectedTeam.tid,
      season: selectedSeason,
      found: !!teamSeasonRecord,
      record: teamSeasonRecord
    });

    if (!teamSeasonRecord) {
      console.warn('[WinsGuess] No team season record found for tid:', selectedTeam.tid, 'season:', selectedSeason);
      console.log('[WinsGuess] Available teamSeasons sample:', leagueData.teamSeasons.slice(0, 5));
      return null;
    }

    // Extract W, L, T, OTL from the record
    const W = teamSeasonRecord.won || 0;
    const L = teamSeasonRecord.lost || 0;
    const T = teamSeasonRecord.tied || 0;
    const OTL = teamSeasonRecord.otl || 0;

    // Calculate G (total games) based on sport
    let G: number;
    if (leagueData.sport === 'football') {
      G = W + L + T; // Football includes ties
    } else if (leagueData.sport === 'hockey') {
      G = W + L + OTL; // Hockey includes overtime losses
    } else {
      G = W + L; // Baseball and Basketball
    }

    // If gp is present and looks reasonable, use it
    if (teamSeasonRecord.gp && teamSeasonRecord.gp > 0) {
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

    console.log('[WinsGuess] Computed data:', result);
    return result;
  }, [selectedSeason, selectedTeam, leagueData.teamSeasons, leagueData.sport]);

  // Calculate playoff finish data
  const playoffFinishData = useMemo(() => {
    console.log('[PlayoffFinish] Computing playoffFinishData...', {
      selectedSeason,
      selectedTeam: selectedTeam?.tid,
      hasPlayoffSeries: !!leagueData.playoffSeries
    });

    if (!selectedSeason || !selectedTeam) {
      console.warn('[PlayoffFinish] Missing required data');
      return null;
    }

    const { label: finishLabel, value: finishValue, seriesScore } = getTeamPlayoffResult(
      leagueData,
      selectedTeam.tid,
      selectedSeason
    );

    const result = {
      finishLabel,
      finishValue,
      seriesScore,
      options: [
        { label: 'Missed Playoffs', value: -1 },
        { label: 'Lost First Round', value: 0 },
        { label: 'Lost Second Round', value: 1 },
        { label: 'Lost Conference Finals', value: 2 },
        { label: 'Lost Finals', value: 3 },
        { label: 'Won Championship', value: 4 }
      ]
    };

    console.log('[PlayoffFinish] Computed data:', result);
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
      // Basketball stat leaders
      const pointsLeader = roster.reduce((leader, rp) =>
        rp.stats.ppg > leader.stats.ppg ? rp : leader
      );

      const reboundsLeader = roster.reduce((leader, rp) =>
        rp.stats.rpg > leader.stats.rpg ? rp : leader
      );

      const assistsLeader = roster.reduce((leader, rp) =>
        rp.stats.apg > leader.stats.apg ? rp : leader
      );

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
    const av = Math.round(seasonStats.av || 0);
    
    // Helper for safe division
    const safeDivide = (num: number, denom: number, decimals: number = 1) => {
      return denom > 0 ? (num / denom).toFixed(decimals) : null;
    };

    switch (position) {
      case 'QB': {
        const pssYds = seasonStats.pssYds || 0;
        const pssTD = seasonStats.pssTD || 0;
        const pssInt = seasonStats.pssInt || 0;
        const compPct = safeDivide(seasonStats.pssCmp || 0, seasonStats.pss || 0, 1);
        const ypa = safeDivide(pssYds, seasonStats.pss || 0, 1);
        
        return {
          line1: `${pssYds}/${pssTD}/${pssInt}`,
          line2: compPct && ypa ? `${compPct}% / ${ypa}` : compPct ? `${compPct}%` : ypa ? ypa : null,
          line3: `AV: ${av}`
        };
      }
      
      case 'RB': {
        const rusYds = seasonStats.rusYds || 0;
        const rusTD = seasonStats.rusTD || 0;
        const rus = seasonStats.rus || 0;
        const catchPct = safeDivide(seasonStats.rec || 0, seasonStats.tgt || 0, 1);
        const ypc = safeDivide(rusYds, rus, 1);
        
        return {
          line1: `${rusYds}/${rusTD}/${rus}`,
          line2: catchPct && ypc ? `${catchPct}% / ${ypc}` : catchPct ? `${catchPct}%` : ypc ? ypc : null,
          line3: `AV: ${av}`
        };
      }
      
      case 'WR':
      case 'TE': {
        const rec = seasonStats.rec || 0;
        const recYds = seasonStats.recYds || 0;
        const recTD = seasonStats.recTD || 0;
        const catchPct = safeDivide(rec, seasonStats.tgt || 0, 1);
        const ydsPerTarget = safeDivide(recYds, seasonStats.tgt || 0, 1);
        
        return {
          line1: `${rec}/${recYds}/${recTD}`,
          line2: catchPct && ydsPerTarget ? `${catchPct}% / ${ydsPerTarget}` : catchPct ? `${catchPct}%` : ydsPerTarget ? ydsPerTarget : null,
          line3: `AV: ${av}`
        };
      }
      
      case 'OL': {
        return {
          line1: null,
          line2: null,
          line3: `AV: ${av}`
        };
      }
      
      case 'DL': {
        const tackles = (seasonStats.defTckSolo || 0) + (seasonStats.defTckAst || 0);
        const sacks = seasonStats.defSk || 0;
        const ff = seasonStats.defFmbFrc || 0;
        const tfl = seasonStats.defTckLoss || 0;
        const pd = seasonStats.defPssDef || 0;
        
        return {
          line1: `${tackles}/${sacks}/${ff}`,
          line2: `${tfl} / ${pd}`,
          line3: `AV: ${av}`
        };
      }
      
      case 'LB': {
        const tackles = (seasonStats.defTckSolo || 0) + (seasonStats.defTckAst || 0);
        const sacks = seasonStats.defSk || 0;
        const ints = seasonStats.defInt || 0;
        const tfl = seasonStats.defTckLoss || 0;
        const pd = seasonStats.defPssDef || 0;
        
        return {
          line1: `${tackles}/${sacks}/${ints}`,
          line2: `${tfl} / ${pd}`,
          line3: `AV: ${av}`
        };
      }
      
      case 'CB':
      case 'S': {
        const tackles = (seasonStats.defTckSolo || 0) + (seasonStats.defTckAst || 0);
        const ints = seasonStats.defInt || 0;
        const pd = seasonStats.defPssDef || 0;
        const intYds = seasonStats.defIntYds || 0;
        const intTD = seasonStats.defIntTD || 0;
        
        return {
          line1: `${tackles}/${ints}/${pd}`,
          line2: `${intYds}/${intTD}`,
          line3: `AV: ${av}`
        };
      }
      
      case 'K': {
        const fgm = (seasonStats.fg0 || 0) + (seasonStats.fg20 || 0) + (seasonStats.fg30 || 0) + (seasonStats.fg40 || 0) + (seasonStats.fg50 || 0);
        const fga = (seasonStats.fga0 || 0) + (seasonStats.fga20 || 0) + (seasonStats.fga30 || 0) + (seasonStats.fga40 || 0) + (seasonStats.fga50 || 0);
        const xpm = seasonStats.xp || 0;
        const fgPct = safeDivide(fgm, fga, 1);
        const fgLng = seasonStats.fgLng || 0;
        
        return {
          line1: `${fgm}/${fga}/${xpm}`,
          line2: fgPct ? `${fgPct}% / ${fgLng}` : `${fgLng}`,
          line3: `AV: ${av}`
        };
      }
      
      case 'P': {
        const punts = seasonStats.pnt || 0;
        const pntYds = seasonStats.pntYds || 0;
        const pntAvg = safeDivide(pntYds, punts, 1);
        const in20 = seasonStats.pntIn20 || 0;
        const tb = seasonStats.pntTB || 0;
        const blk = seasonStats.pntBlk || 0;
        
        return {
          line1: pntAvg ? `${punts}/${pntYds}/${pntAvg}` : `${punts}/${pntYds}`,
          line2: `${in20}/${tb}/${blk}`,
          line3: `AV: ${av}`
        };
      }
      
      default:
        return {
          line1: null,
          line2: null,
          line3: `AV: ${av}`
        };
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

    if (isPitcher) {
      // Pitcher stats
      const war = seasonStats.war !== undefined ? seasonStats.war.toFixed(1) : '0.0';
      const w = seasonStats.w || 0;
      const l = seasonStats.l || 0;
      const outs = seasonStats.outs || 0;
      const er = seasonStats.er || 0;
      const era = outs > 0 ? removeLeadingZero((27 * er / outs).toFixed(2)) : null;
      
      const gp = seasonStats.gpPit !== undefined ? seasonStats.gpPit : seasonStats.gp || 0;
      const gs = seasonStats.gsPit !== undefined ? seasonStats.gsPit : seasonStats.gs || 0;
      const sv = seasonStats.sv || 0;

      // IP conversion: outs to baseball notation (X.Y where Y = outs % 3)
      const ipWhole = Math.floor(outs / 3);
      const ipRemainder = outs % 3;
      const ip = `${ipWhole}.${ipRemainder}`;

      const so = seasonStats.soPit || 0;
      const bbPit = seasonStats.bbPit || 0;
      const hPit = seasonStats.hPit || 0;
      const whip = outs > 0 ? removeLeadingZero((3 * (bbPit + hPit) / outs).toFixed(2)) : null;

      return {
        line1: era ? `${war}/${w}/${l}/${era}` : `${war}/${w}/${l}`,
        line2: `${gp}/${gs}/${sv}`,
        line3: whip ? `${ip}/${so}/${whip}` : `${ip}/${so}`
      };
    } else {
      // Hitter stats
      const war = seasonStats.war !== undefined ? seasonStats.war.toFixed(1) : '0.0';
      const pa = seasonStats.pa || 0;
      const h = seasonStats.h || 0;
      const hr = seasonStats.hr || 0;
      const r = seasonStats.r || 0;
      const rbi = seasonStats.rbi || 0;
      const sb = seasonStats.sb || 0;

      // Calculate AB
      const bb = seasonStats.bb || 0;
      const hbp = seasonStats.hbp || 0;
      const sf = seasonStats.sf || 0;
      const sh = seasonStats.sh || 0;
      const ab = pa - bb - hbp - sf - sh;

      // BA, OBP, SLG, OPS
      const ba = ab > 0 ? removeLeadingZero((h / ab).toFixed(3)) : null;

      const obpDenom = ab + bb + hbp + sf;
      const obp = obpDenom > 0 ? removeLeadingZero(((h + bb + hbp) / obpDenom).toFixed(3)) : null;

      const doubles = seasonStats['2b'] || 0;
      const triples = seasonStats['3b'] || 0;
      const singles = h - doubles - triples - hr;
      const tb = singles + 2 * doubles + 3 * triples + 4 * hr;
      const slg = ab > 0 ? removeLeadingZero((tb / ab).toFixed(3)) : null;

      const ops = (obp && slg) ? removeLeadingZero((parseFloat('0' + obp) + parseFloat('0' + slg)).toFixed(3)) : null;

      return {
        line1: ba ? `${war}/${pa}/${h}/${hr}/${ba}` : `${war}/${pa}/${h}/${hr}`,
        line2: `${r}/${rbi}/${sb}`,
        line3: ops ? `${obp}/${slg}/${ops}` : (obp && slg) ? `${obp}/${slg}` : obp ? obp : slg ? slg : null
      };
    }
  };

  // Helper function to calculate hockey stats by position
  const calculateHockeyStats = (seasonStats: any, position: string) => {
    // Helper for safe division
    const safeDivide = (num: number, denom: number, decimals: number = 1) => {
      return denom > 0 ? (num / denom).toFixed(decimals) : null;
    };

    // Helper to format minutes as MM:SS
    const formatMinutes = (totalMinutes: number) => {
      const mins = Math.floor(totalMinutes);
      const secs = Math.round((totalMinutes - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (position === 'G') {
      // Goalie stats
      const gW = seasonStats.gW || 0;
      const gL = seasonStats.gL || 0;
      const so = seasonStats.so || 0;
      const sv = seasonStats.sv || 0;
      const ga = seasonStats.ga || 0;
      const gMin = seasonStats.gMin || seasonStats.min || 0;

      const svPct = safeDivide(sv, sv + ga, 3);
      const gaa = safeDivide(60 * ga, gMin, 2);

      return {
        line1: `${gW}/${gL}/${so}`,
        line2: svPct ? `${(parseFloat(svPct) * 100).toFixed(1)}%` : null,
        line3: gaa || null
      };
    } else {
      // Skater stats (C, W, D)
      const evG = seasonStats.evG || 0;
      const ppG = seasonStats.ppG || 0;
      const shG = seasonStats.shG || 0;
      const goals = evG + ppG + shG;

      const evA = seasonStats.evA || 0;
      const ppA = seasonStats.ppA || 0;
      const shA = seasonStats.shA || 0;
      const assists = evA + ppA + shA;

      const points = goals + assists;
      const plusMinus = seasonStats.pm || 0;
      const min = seasonStats.min || 0;
      const gp = seasonStats.gp || 0;

      const toiAvg = gp > 0 ? formatMinutes(min / gp) : null;

      return {
        line1: `${goals}/${assists}/${points}`,
        line2: `${plusMinus >= 0 ? '+' : ''}${plusMinus}`,
        line3: toiAvg || null
      };
    }
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

        rosterPlayers.push({
          player,
          revealed: false,
          hintShown: false,
          gamesPlayed: seasonStats.gp,
          stats,
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
    setOpponentTeamInfo({ tid: opponentTid, season });
  }, []);

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

    const randomSeason = allSeasons[Math.floor(Math.random() * allSeasons.length)];
    
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
    const validTeams = allTeams.filter(team => 
      teamsInSeason.has(team.tid) && teamsWithWinsData.has(team.tid)
    );
    
    if (validTeams.length === 0) {
      toast({
        title: 'Error',
        description: 'No teams found for the selected season.',
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
  }, [allSeasons, allTeams, buildRoster, leagueData.players, leagueData.teamSeasons, toast]);

  // Initialize on mount
  useEffect(() => {
    pickRandomTeamAndSeason();
  }, [pickRandomTeamAndSeason]);

  // When season or team changes, rebuild roster
  useEffect(() => {
    if (selectedSeason !== null && selectedTeam) {
      buildRoster(selectedSeason, selectedTeam);
      setGuess('');
    }
  }, [selectedSeason, selectedTeam, buildRoster]);

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
      setFoundCount(prev => prev + 1);

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
  }, [roster, toast, selectedSeason, teamDisplayInfo.name, currentRound, addToScoreBreakdown]);

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
        handleSelectPlayer(autocompleteSuggestions[activeIndex]);
      } else if (autocompleteSuggestions.length === 1) {
        handleSelectPlayer(autocompleteSuggestions[0]);
      } else {
        handleManualGuess();
      }
    } else if (e.key === 'Escape') {
      setAutocompleteOpen(false);
      setActiveIndex(-1);
    }
  }, [autocompleteOpen, activeIndex, autocompleteSuggestions, handleSelectPlayer]);

  // Handle manual guess
  const handleManualGuess = useCallback(() => {
    if (!guess.trim()) return;

    const normalizedGuess = normalizeName(guess);
    const unrevealedPlayers = roster.filter(rp => !rp.revealed);
    
    // Find exact full name match
    const matchedPlayer = unrevealedPlayers.find(rp => 
      normalizeName(rp.player.name) === normalizedGuess
    );

    // Find all last name matches
    const lastNameMatches = unrevealedPlayers.filter(rp => {
      const playerLastName = normalizeName(rp.player.name.split(' ').pop() || '');
      return playerLastName === normalizedGuess;
    });

    if (matchedPlayer) {
      handleSelectPlayer(matchedPlayer.player);
      return;
    }

    if (lastNameMatches.length === 1) {
      handleSelectPlayer(lastNameMatches[0].player);
      return;
    }

    if (lastNameMatches.length > 1) {
      toast({
        description: 'Multiple players with that last name — type the full name.',
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
      console.log('[WinsGuess] Entering wins-guess phase. winsGuessData:', winsGuessData);
      setWinsGuessPosition(0); // Start at left edge
      setWinsGuessSubmitted(false);

      // If wins guess data is not available, skip to next round
      if (!winsGuessData) {
        console.warn('[WinsGuess] No data available, skipping to next round');
        toast({
          description: 'Win data not available for this team/season. Skipping to completion.',
        });
        setTimeout(() => {
          // Progress to next round (which should be 'complete')
          const currentIndex = ROUND_ORDER.indexOf(currentRound as any);
          if (currentIndex < ROUND_ORDER.length - 1) {
            const nextRound = ROUND_ORDER[currentIndex + 1];
            console.log('[WinsGuess] Advancing to:', nextRound);
            setCurrentRound(nextRound);
          }
        }, 1500);
      } else {
        console.log('[WinsGuess] Data is available, rendering phase');
      }
    }
  }, [currentRound, winsGuessData, toast, ROUND_ORDER]);

  // Reset playoff finish state when entering playoff-finish round
  useEffect(() => {
    if (currentRound === 'playoff-finish') {
      console.log('[PlayoffFinish] Entering playoff-finish phase. playoffFinishData:', playoffFinishData);
      setPlayoffFinishGuess(null);
      setPlayoffFinishSubmitted(false);

      // If playoff finish data is not available, skip to next round
      if (!playoffFinishData) {
        console.warn('[PlayoffFinish] No data available, skipping to next round');
        toast({
          description: 'Playoff data not available for this team/season. Skipping to completion.',
        });
        setTimeout(() => {
          const currentIndex = ROUND_ORDER.indexOf(currentRound as any);
          if (currentIndex < ROUND_ORDER.length - 1) {
            const nextRound = ROUND_ORDER[currentIndex + 1];
            console.log('[PlayoffFinish] Advancing to:', nextRound);
            setCurrentRound(nextRound);
          }
        }, 1500);
      } else {
        console.log('[PlayoffFinish] Data is available, rendering phase');
      }
    }
  }, [currentRound, playoffFinishData, toast, ROUND_ORDER]);

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

  // Reset leader guess lock when round changes
  useEffect(() => {
    setLeaderGuessLocked(false);
  }, [currentRound]);

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
          statValue = stats?.passYards ? `${Math.round(stats.passYards)} Yards` : 'N/A';
          break;
        case 'rushing-yards-leader':
          statValue = stats?.rushYards ? `${Math.round(stats.rushYards)} Yards` : 'N/A';
          break;
        case 'receiving-yards-leader':
          statValue = stats?.recYards ? `${Math.round(stats.recYards)} Yards` : 'N/A';
          break;
        case 'tackles-leader':
          statValue = stats?.tackles ? `${Math.round(stats.tackles)} Tackles` : 'N/A';
          break;
        case 'sacks-leader':
          statValue = stats?.sacks ? `${stats.sacks.toFixed(1)} Sacks` : 'N/A';
          break;
        case 'interceptions-leader':
          statValue = stats?.interceptions ? `${stats.interceptions} INT` : 'N/A';
          break;
        // Baseball rounds
        case 'hits-leader':
          statValue = stats?.hits ? `${stats.hits} H` : 'N/A';
          break;
        case 'home-runs-leader':
          statValue = stats?.homeRuns ? `${stats.homeRuns} HR` : 'N/A';
          break;
        case 'rbis-leader':
          statValue = stats?.rbis ? `${stats.rbis} RBI` : 'N/A';
          break;
        case 'stolen-bases-leader':
          statValue = stats?.stolenBases ? `${stats.stolenBases} SB` : 'N/A';
          break;
        case 'strikeouts-leader':
          statValue = stats?.strikeouts ? `${stats.strikeouts} K` : 'N/A';
          break;
        case 'wins-leader':
          statValue = stats?.wins ? `${stats.wins} W` : 'N/A';
          break;
        // Hockey rounds
        case 'goals-leader':
          statValue = stats?.goals ? `${stats.goals} G` : 'N/A';
          break;
        case 'goalie-wins-leader':
          statValue = stats?.wins ? `${stats.wins} W` : 'N/A';
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
        setDetailedGameData(prev => ({
          ...prev,
          leaderResults: [...prev.leaderResults, {
            round: currentRound,
            label: formatStatLabel(getRoundInstruction(currentRound)),
            statLabel: formatStatLabel(getRoundInstruction(currentRound)),
            statValue: 0, // Will be populated later with actual stat value
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
        setDetailedGameData(prev => ({
          ...prev,
          leaderResults: [...prev.leaderResults, {
            round: currentRound,
            label: formatStatLabel(getRoundInstruction(currentRound)),
            statLabel: formatStatLabel(getRoundInstruction(currentRound)),
            statValue: 0, // Will be populated later with actual stat value
            correctPlayer: correctRosterPlayer.player,
            userCorrect: false,
            userSelectedPlayer,
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

    const validTeams = allTeams.filter(team => teamsInSeason.has(team.tid) && team.tid !== selectedTeam?.tid);
    if (validTeams.length === 0) {
      toast({
        title: 'No other teams available',
        description: 'No other teams found for this season.',
        variant: 'destructive',
      });
      return;
    }

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
  }, [selectedSeason, selectedTeam, allTeams, leagueData.players, buildRoster, toast]);

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

    const validSeasons = allSeasons.filter(season => seasonsForTeam.has(season) && season !== selectedSeason);
    if (validSeasons.length === 0) {
      toast({
        title: 'No other seasons available',
        description: 'No other seasons found for this team.',
        variant: 'destructive',
      });
      return;
    }

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
  }, [selectedSeason, selectedTeam, allSeasons, leagueData.players, buildRoster, toast]);

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
      })),
      winsGuess: detailedGameData.winsGuessData,
    };
  }, [selectedTeam, selectedSeason, teamDisplayInfo, leagueData.sport, score, scoreBreakdown, detailedGameData]);

    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        {/* Main Header */}
              <header
                className="border-border shrink-0"
                onMouseEnter={() => setIsHeaderHovered(true)}
                onMouseLeave={() => setIsHeaderHovered(false)}
                style={{ position: 'relative', backgroundColor: teamDisplayInfo.colors[0] || 'hsl(var(--card))' }}
              >
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="grid grid-cols-3 items-center gap-4">
              {/* Left: Back button */}
              <div className="flex items-center justify-start">
                {hasProgress ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid="button-back" style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))' }} className="animate-on-click">
                        <ArrowLeft className="h-[1.2rem] w-[1.2rem]" />
                        <span className="sr-only">Go back</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Go back to game selection?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Going back will lose your current progress. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onBackToModeSelect} className="animate-on-click">Go Back</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button variant="ghost" size="sm" onClick={onBackToModeSelect} data-testid="button-back" style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))' }} className="animate-on-click">
                    <ArrowLeft className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Go back</span>
                  </Button>
                )}
              </div>

              {/* Center: Logo + Title */}
              <div className="flex items-center justify-center space-x-3 min-w-0">
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 shrink-0"
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
                  className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold whitespace-nowrap"
                  style={{
                    color: teamDisplayInfo.colors[1] || 'hsl(var(--primary))',
                    letterSpacing: '-0.02em'
                  }}
                >
                  {sportTitle} Trivia
                </h1>
              </div>

              {/* Right: Home button */}
              <div className="flex items-center justify-end space-x-1">
                {hasProgress ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid="button-home" style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))' }} className="animate-on-click">
                        <HomeIcon className="h-[1.2rem] w-[1.2rem]" />
                        <span className="sr-only">Go home</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Go home?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Going home will lose your current progress. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onGoHome} className="animate-on-click">Go Home</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button variant="ghost" size="sm" onClick={onGoHome} data-testid="button-home" style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))' }} className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 animate-on-click text-[16px]">
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
                      <CommandInput placeholder="Search year..." />
                      <CommandList>
                        <CommandEmpty>No year found.</CommandEmpty>
                        <CommandGroup>
                          {allSeasons.map((season) => (
                            <CommandItem
                              key={season}
                              value={season.toString()}
                              onSelect={() => {
                                setSelectedSeason(season);
                                setYearDropdownOpen(false);
                                setCurrentRound('guess');
                                setFoundCount(0);
                                setScore(0);
                                setSelectedLeader(null);
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
                      {teamDisplayInfo.logo && (
                        <img
                          src={getTeamLogoUrl(teamDisplayInfo.logo, leagueData.sport)}
                          alt={teamDisplayInfo.name}
                          className="h-8 w-8 sm:h-12 sm:w-12 md:h-14 md:w-14 object-contain shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      {!teamDisplayInfo.logo && (
                        <span className="text-lg sm:text-2xl md:text-3xl font-bold neon-text">
                          {teamDisplayInfo.name}
                        </span>
                      )}
                      <ChevronDown className="h-3 w-3 sm:h-5 sm:w-5 ml-1 sm:ml-2 shrink-0" />
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
                    onClick={() => isLeaderRound && handleTileClick(rp.player.pid)}
                    className={`relative flex flex-col items-center gap-0.5 p-1 sm:p-2 md:p-3 rounded sm:rounded-md md:rounded-lg transition-all hover:scale-[1.02] ${
                      isLeaderRound ? 'cursor-pointer' : ''
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
                  <div className="w-full aspect-square">
                    <PlayerFace
                      pid={rp.player.pid}
                      name={rp.player.name}
                      imgURL={rp.player.imgURL ?? undefined}
                      face={rp.player.face}
                      size={104}
                      hideName={true}
                      player={rp.player}
                      teams={leagueData.teams}
                      sport={leagueData.sport}
                      season={selectedSeason || undefined}
                      scale={1.1}
                    />
                  </div>
  
                  {/* Name - Compact */}
                  <div className="w-full text-center min-h-[1rem] sm:min-h-[2rem] flex items-center justify-center px-0.5">
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
                          const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  
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

                  {/* Player Stats - Show when round is complete, wins-guess, or playoff-finish */}
                  {(currentRound === 'complete' || currentRound === 'wins-guess' || currentRound === 'playoff-finish') && (
                    <div className="w-full text-center text-[0.45rem] sm:text-[0.6rem] md:text-[0.7rem] leading-tight mt-1"
                      style={{ color: rp.teamColors?.[0] || 'hsl(var(--foreground))' }}>
                      {/* Age - All sports */}
                      {rp.age && <p>Age: {rp.age}</p>}
                      
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

        {/* Bottom Actions */}
        <div className="shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t neon-border-subtle relative z-[1000]">
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
                    placeholder="Type a player's name..."
                    className="text-lg py-6 neon-input"
                    autoFocus
                    autoComplete="off"
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
                        {playoffFinishData.options.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => !playoffFinishSubmitted && setPlayoffFinishGuess(option.value)}
                            disabled={playoffFinishSubmitted}
                            className={`
                              p-3 rounded-lg border-2 text-center font-semibold transition-all text-sm
                              ${playoffFinishGuess === option.value
                                ? 'border-primary bg-primary/20 text-white'
                                : 'border-muted bg-muted/10 text-muted-foreground hover:border-primary/50 hover:bg-primary/10'
                              }
                              ${playoffFinishSubmitted && playoffFinishGuess !== null && option.value === playoffFinishGuess && option.value === playoffFinishData.finishValue
                                ? 'border-green-500 bg-green-500/20 text-green-400'
                                : ''
                              }
                              ${playoffFinishSubmitted && playoffFinishGuess !== null && option.value === playoffFinishGuess && option.value !== playoffFinishData.finishValue
                                ? 'border-red-500 bg-red-500/20 text-red-400'
                                : ''
                              }
                              ${playoffFinishSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'}
                            `}
                            data-testid={`playoff-option-${option.value}`}
                          >
                            {option.label}
                          </button>
                        ))}
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
                              : `Incorrect. The team ${playoffFinishData.finishLabel.toLowerCase()}.`
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
                    onClick={() => setShowBreakdownModal(true)}
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

              {/* Right: Next Round button (use ml-auto to push it right) */}
              {currentRound !== 'complete' && currentRound !== 'wins-guess' && currentRound !== 'playoff-finish' && (
                <Button
                  variant="default"
                  size="lg"
                  onClick={handleNextRound}
                  className="neon-button animate-on-click ml-auto"
                  data-testid="button-next-round"
                  disabled={currentRound.endsWith('-leader')}
                >
                  <span className="hidden sm:inline">Next Round</span>
                  <ArrowRight className="h-5 w-5 sm:ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Score Summary Modal - Shown when breakdown modal is open */}
        {scoreSummaryData && (
          <ScoreSummaryModal
            open={showBreakdownModal}
            onOpenChange={setShowBreakdownModal}
            data={scoreSummaryData}
            onPlayAgain={() => {
              setShowBreakdownModal(false);
              handleNewYearSameTeam();
            }}
            onNewSeason={() => {
              setShowBreakdownModal(false);
              handleNew();
            }}
            onShowTeamInfo={() => setShowTeamInfo(true)}
          />
        )}

        {/* Team Info Modal */}
        {showTeamInfo && (
          <TeamInfoModal
            open={showTeamInfo}
            onClose={() => setShowTeamInfo(false)}
            season={selectedSeason}
            teamName={teamDisplayInfo.name}
            teamAbbrev={selectedTeam.abbrev}
            teamLogo={teamDisplayInfo.logo ? getTeamLogoUrl(teamDisplayInfo.logo, leagueData.sport) : undefined}
            teamColors={teamDisplayInfo.colors}
            players={roster.map(rp => ({
              player: rp.player,
              position: rp.position,
              age: rp.age,
              gamesPlayed: rp.gamesPlayed,
              stats: rp.stats,
              yearsWithTeam: calculateYearsWithTeam(rp.player, selectedTeam.tid, selectedSeason),
              ovr: getPlayerRating(rp.player, selectedSeason, 'ovr'),
              pot: getPlayerRating(rp.player, selectedSeason, 'pot'),
              contract: formatContract(rp.player, selectedSeason),
            }))}
            sport={leagueData.sport}
            teams={leagueData.teams}
            teamStats={calculateTeamStats(leagueData, selectedTeam.tid, selectedSeason, roster)}
            playoffSeriesData={leagueData.playoffSeries?.find(ps => ps.season === selectedSeason)}
            teamTid={selectedTeam.tid}
            onOpenOpponentTeam={handleOpenOpponentTeam}
          />
        )}

        {/* Opponent Team Info Modal */}
        {opponentTeamInfo && (() => {
          const opponentTeam = leagueData.teams.find(t => t.tid === opponentTeamInfo.tid);
          if (!opponentTeam) return null;

          // Build opponent roster
          const opponentRoster: any[] = [];
          leagueData.players.forEach(player => {
            const seasonStats = player.stats?.find(
              s => !s.playoffs && s.season === opponentTeamInfo.season && s.tid === opponentTeamInfo.tid
            );

            if (seasonStats && seasonStats.gp && seasonStats.gp > 0) {
              const rating = player.ratings?.find(r => r.season === opponentTeamInfo.season);
              const position = rating?.pos || player.pos || 'F';
              const age = player.born?.year ? opponentTeamInfo.season - player.born.year : undefined;

              let stats: any;
              if (leagueData.sport === 'basketball') {
                const gp = seasonStats.gp;
                const mpg = seasonStats.min ? seasonStats.min / gp : 0;
                const ppg = seasonStats.pts ? seasonStats.pts / gp : 0;
                const totalReb = seasonStats.trb || ((seasonStats.orb || 0) + (seasonStats.drb || 0));
                const rpg = totalReb / gp;
                const apg = seasonStats.ast ? seasonStats.ast / gp : 0;
                const per = seasonStats.per || 0;
                stats = { mpg, ppg, rpg, apg, per };
              } else {
                stats = {};
              }

              opponentRoster.push({
                player,
                position,
                age,
                gamesPlayed: seasonStats.gp,
                stats,
                yearsWithTeam: calculateYearsWithTeam(player, opponentTeamInfo.tid, opponentTeamInfo.season),
                ovr: getPlayerRating(player, opponentTeamInfo.season, 'ovr'),
                pot: getPlayerRating(player, opponentTeamInfo.season, 'pot'),
              });
            }
          });

          const seasonInfo = opponentTeam.seasons?.find(s => s.season === opponentTeamInfo.season);
          const opponentLogo = seasonInfo?.imgURL || opponentTeam.imgURL;
          const opponentColors = seasonInfo?.colors || opponentTeam.colors || ['#000000', '#ffffff'];
          const opponentName = seasonInfo?.name || opponentTeam.name || `Team ${opponentTeam.tid}`;

          return (
            <TeamInfoModal
              open={true}
              onClose={() => setOpponentTeamInfo(null)}
              season={opponentTeamInfo.season}
              teamName={opponentName}
              teamAbbrev={seasonInfo?.abbrev || opponentTeam.abbrev || ''}
              teamLogo={opponentLogo ? getTeamLogoUrl(opponentLogo, leagueData.sport) : undefined}
              teamColors={opponentColors}
              players={opponentRoster}
              sport={leagueData.sport}
              teams={leagueData.teams}
              teamStats={calculateTeamStats(leagueData, opponentTeamInfo.tid, opponentTeamInfo.season, opponentRoster)}
              playoffSeriesData={leagueData.playoffSeries?.find(ps => ps.season === opponentTeamInfo.season)}
              teamTid={opponentTeamInfo.tid}
              onOpenOpponentTeam={handleOpenOpponentTeam}
            />
          );
        })()}
      </div>
    );
  }
  
