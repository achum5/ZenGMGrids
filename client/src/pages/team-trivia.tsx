import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlayerFace } from '@/components/PlayerFace';
import { useToast } from '@/lib/hooks/use-toast';
import { Shuffle, Home as HomeIcon, ArrowLeft, ChevronDown, ArrowRight } from 'lucide-react';


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
import type { LeagueData, Player, Team } from '@/types/bbgm';
import basketballIcon from '@/assets/zengm-grids-logo-basketball.png';
import footballIcon from '@/assets/zengm-grids-logo-football.png';
import hockeyIcon from '@/assets/zengm-grids-logo-hockey.png';
import baseballIcon from '@/assets/zengm-grids-logo-baseball.png';

interface RosterPlayer {
  player: Player;
  revealed: boolean;
  hintShown: boolean;
  gamesPlayed: number;
  stats: {
    ppg: number;
    rpg: number;
    apg: number;
  };
  advancedStats: {
    fgp: number;
    tpp: number;
    ftp: number;
    ts: number;
    per: number;
  };
  position: string;
  jerseyNumber?: string;
  teamColors?: string[];
}

interface TeamTriviaProps {
  leagueData: LeagueData;
  onBackToModeSelect: () => void;
  onGoHome: () => void;
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

// Basketball rounds
type BasketballRoundType = 'guess' | 'hint' | 'points-leader' | 'rebounds-leader' | 'assists-leader' | 'steals-leader' | 'blocks-leader' | 'complete';

// Football rounds
type FootballRoundType = 'guess' | 'hint' | 'passing-yards-leader' | 'rushing-yards-leader' | 'receiving-yards-leader' | 'tackles-leader' | 'sacks-leader' | 'interceptions-leader' | 'complete';

// Baseball rounds
type BaseballRoundType = 'guess' | 'hint' | 'hits-leader' | 'home-runs-leader' | 'rbis-leader' | 'stolen-bases-leader' | 'strikeouts-leader' | 'wins-leader' | 'complete';

// Union type for all possible rounds
type RoundType = BasketballRoundType | FootballRoundType | BaseballRoundType;

// Sport-specific round orders
const BASKETBALL_ROUND_ORDER: BasketballRoundType[] = [
  'guess',
  'hint',
  'points-leader',
  'rebounds-leader',
  'assists-leader',
  'steals-leader',
  'blocks-leader',
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
  'complete': 'Round complete!'
};

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
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [newTeamDropdownOpen, setNewTeamDropdownOpen] = useState(false);
  const [triggerBounceAnimation, setTriggerBounceAnimation] = useState(false); // New state for animation
  const [tileAnimations, setTileAnimations] = useState<Record<number, string>>({}); // New state for tile animations
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Get sport-specific round order
  const ROUND_ORDER = leagueData.sport === 'football' 
    ? FOOTBALL_ROUND_ORDER 
    : leagueData.sport === 'baseball'
    ? BASEBALL_ROUND_ORDER
    : BASKETBALL_ROUND_ORDER;

  // Get sport-specific instructions
  const getRoundInstruction = (round: RoundType): string => {
    if (leagueData.sport === 'football') {
      return FOOTBALL_ROUND_INSTRUCTIONS[round as FootballRoundType] || '';
    } else if (leagueData.sport === 'baseball') {
      return BASEBALL_ROUND_INSTRUCTIONS[round as BaseballRoundType] || '';
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
        const leaderTackles = (leaderStats as any)?.defTck || 0;
        const rpTackles = (rpStats as any)?.defTck || 0;
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

  // Build roster for selected season/team
  const buildRoster = useCallback((season: number, team: Team) => {
    const rosterPlayers: RosterPlayer[] = [];

    leagueData.players.forEach(player => {
      const seasonStats = player.stats?.find(
        s => !s.playoffs && s.season === season && s.tid === team.tid
      );
      
      if (seasonStats && seasonStats.gp && seasonStats.gp > 0) {
        // Calculate per-game stats
        const gp = seasonStats.gp;
        const ppg = seasonStats.pts ? seasonStats.pts / gp : 0;
        // Use trb if available, otherwise sum orb and drb, fallback to 0
        const totalReb = seasonStats.trb || ((seasonStats.orb || 0) + (seasonStats.drb || 0));
        const rpg = totalReb / gp;
        const apg = seasonStats.ast ? seasonStats.ast / gp : 0;

        // Calculate advanced stats
        const fg = seasonStats.fg || 0;
        const fga = seasonStats.fga || 0;
        const fgp = fga > 0 ? (fg / fga) * 100 : 0;

        const tp = seasonStats.tpm || seasonStats.tp || 0;
        const tpa = seasonStats.tpa || 0;
        const tpp = tpa > 0 ? (tp / tpa) * 100 : 0;

        const ft = seasonStats.ft || 0;
        const fta = seasonStats.fta || 0;
        const ftp = fta > 0 ? (ft / fta) * 100 : 0;

        // True Shooting % = PTS / (2 * (FGA + 0.44 * FTA))
        const tsDenominator = 2 * (fga + 0.44 * fta);
        const ts = tsDenominator > 0 ? ((seasonStats.pts || 0) / tsDenominator) * 100 : 0;

        // Simplified PER calculation (actual PER is very complex)
        // Using a basic approximation: (PTS + REB + AST + STL + BLK - Missed FG - Missed FT - TO) / GP
        const stl = seasonStats.stl || 0;
        const blk = seasonStats.blk || 0;
        const missedFG = fga - fg;
        const missedFT = fta - ft;
        // Note: turnover data might not be in stats, so we'll use a simplified version
        const per = ((seasonStats.pts || 0) + totalReb + (seasonStats.ast || 0) + stl + blk - missedFG - missedFT) / gp;

        // Get position for this season
        const rating = player.ratings?.find(r => r.season === season);
        const position = rating?.pos || player.pos || 'F';

        // Get jersey number from season stats
        const jerseyNumber = seasonStats.jerseyNumber;

        // Get team colors for this season (season-specific or default)
        const seasonInfo = team.seasons?.find(s => s.season === season);
        const teamColors = seasonInfo?.colors || team.colors || ['#000000', '#ffffff', '#cccccc'];

        rosterPlayers.push({
          player,
          revealed: false,
          hintShown: false,
          gamesPlayed: seasonStats.gp,
          stats: { ppg, rpg, apg },
          advancedStats: { fgp, tpp, ftp, ts, per },
          position,
          jerseyNumber,
          teamColors,
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

    const positionOrder = sportPositionOrder[leagueData.sport] || [];

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

    const validTeams = allTeams.filter(team => teamsInSeason.has(team.tid));
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
  }, [allSeasons, allTeams, buildRoster, leagueData.players, toast]);

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
      return { name: '', logo: null, colors: ['#000000', '#ffffff', '#cccccc'] };
    }

    const seasonInfo = selectedTeam.seasons?.find(s => s.season === selectedSeason);
    const name = seasonInfo?.region && seasonInfo?.name
      ? `${seasonInfo.region} ${seasonInfo.name}`
      : selectedTeam.region && selectedTeam.name
      ? `${selectedTeam.region} ${selectedTeam.name}`
      : selectedTeam.abbrev || 'Unknown Team';

    const logo = seasonInfo?.imgURL || selectedTeam.imgURL;
    const colors = seasonInfo?.colors || selectedTeam.colors || ['#000000', '#ffffff', '#cccccc'];

    return { name, logo, colors };
  }, [selectedTeam, selectedSeason]);

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

      // Award points based on round
      if (currentRound === 'guess') {
        setScore(prev => prev + 10);
      } else if (currentRound === 'hint') {
        setScore(prev => prev + 8);
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
    }

    setGuess('');
    setAutocompleteOpen(false);
    setActiveIndex(-1);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [roster, toast, selectedSeason, teamDisplayInfo.name]);

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

  // Progress to next round
  const handleNextRound = useCallback(() => {
    const currentIndex = ROUND_ORDER.indexOf(currentRound);
    if (currentIndex < ROUND_ORDER.length - 1) {
      const nextRound = ROUND_ORDER[currentIndex + 1];
      setCurrentRound(nextRound);
      setSelectedLeader(null);

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
      if (nextRound === 'points-leader' || nextRound === 'passing-yards-leader') {
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


  // Handle tile click during leader selection rounds
  const handleTileClick = useCallback((pid: number) => {
    const isLeaderRound = currentRound.endsWith('-leader');
    if (!isLeaderRound) return;

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
    }

    if (correctLeaderPid === null) return;

    // Check if the clicked player is correct
    if (pid === correctLeaderPid) {
      // Correct! Show success feedback and move to next round
      toast({
        description: 'Correct! Moving to next round...',
      });
      setScore(prev => prev + 5); // Award 5 points for correct leader

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
  }, [currentRound, statLeaders, toast, handleNextRound]);

  // New game - randomize both
  const handleNew = useCallback(() => {
    pickRandomTeamAndSeason();
    setCurrentRound('guess');
    setSelectedLeader(null);
    setScore(0); // Reset score for new game
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
    setScore(0);
    setGuess('');
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
    setScore(0);
    setGuess('');
  }, [selectedSeason, selectedTeam, allSeasons, leagueData.players, buildRoster, toast]);

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

    return (
      <div className="h-screen flex flex-col bg-background overflow-hidden">
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

              {/* Right: Help + Home buttons */}
              <div className="flex items-center justify-end space-x-1">
                <RulesModal sport={leagueData.sport} color={teamDisplayInfo.colors[1]} />
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
                  <Button variant="ghost" size="sm" onClick={onGoHome} data-testid="button-home" style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))' }} className="animate-on-click">
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
                          color: teamDisplayInfo.colors[1] || 'hsl(var(--primary-foreground))',
                          borderColor: teamDisplayInfo.colors[1] || 'hsl(var(--border))'
                        }}
                        data-testid="button-new-trivia-dropdown"
                      >
                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
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
                          src={teamDisplayInfo.logo}
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
                                    src={team.imgURLSmall || team.imgURL}
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
                <span style={{ color: teamDisplayInfo.colors[1] || 'hsl(var(--primary))' }}>Score: {score}</span>
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

                  {/* Player Stats - Show only when round is complete */}
                  {currentRound === 'complete' && (
                    <div className="w-full text-center text-[0.45rem] sm:text-[0.6rem] md:text-[0.7rem] leading-tight mt-1"
                      style={{ color: rp.teamColors?.[0] || 'hsl(var(--foreground))' }}>
                      {(() => {
                        const playerRating = rp.player.ratings?.find(r => r.season === selectedSeason);
                        const playerBornYear = rp.player.born?.year;
                        if (playerBornYear && selectedSeason) {
                          return <p>Age: {selectedSeason - playerBornYear}</p>;
                        }
                        return null;
                      })()}
                      {(() => {
                        const playerRating = rp.player.ratings?.find(r => r.season === selectedSeason);
                        if (playerRating) {
                          return <p>Ovr/Pot: {playerRating.ovr}/{playerRating.pot}</p>;
                        }
                        return null;
                      })()}
                      <p>P/R/A:</p>
                      <p>{rp.stats.ppg.toFixed(1)}/{rp.stats.rpg.toFixed(1)}/{rp.stats.apg.toFixed(1)}</p>
                      <p>Splits: {rp.advancedStats.fgp.toFixed(1)}%/{rp.advancedStats.tpp.toFixed(1)}%/{rp.advancedStats.ftp.toFixed(1)}%</p>
                      <p>PER: {rp.advancedStats.per.toFixed(1)}</p>
                      <p>TS%: {rp.advancedStats.ts.toFixed(1)}%</p>
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
                                  season={player.stats?.some(s => !s.playoffs && s.season === selectedSeason && s.tid === selectedTeam?.tid) ? selectedSeason : null}
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
                  </p>
                </div>
              ) : null}

              {/* Right: Next Round button (use ml-auto to push it right) */}
              {currentRound !== 'complete' && (
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
      </div>
    );
  }
  
