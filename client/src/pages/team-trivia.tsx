import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlayerFace } from '@/components/PlayerFace';
import { useToast } from '@/lib/hooks/use-toast';
import { Shuffle, Flag, Home as HomeIcon, ArrowLeft, ChevronDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import confetti from 'canvas-confetti';
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

export default function TeamTrivia({ leagueData, onBackToModeSelect, onGoHome }: TeamTriviaProps) {
  const { toast } = useToast();
  const [guess, setGuess] = useState('');
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [foundCount, setFoundCount] = useState(0);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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
          gamesPlayed: seasonStats.gp,
          stats: { ppg, rpg, apg },
          advancedStats: { fgp, tpp, ftp, ts, per },
          position,
          jerseyNumber,
          teamColors,
        });
      }
    });

    // Sort by games played, then alphabetically
    rosterPlayers.sort((a, b) => {
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
      return { name: '', logo: null };
    }
    
    const seasonInfo = selectedTeam.seasons?.find(s => s.season === selectedSeason);
    const name = seasonInfo?.region && seasonInfo?.name
      ? `${seasonInfo.region} ${seasonInfo.name}`
      : selectedTeam.region && selectedTeam.name
      ? `${selectedTeam.region} ${selectedTeam.name}`
      : selectedTeam.abbrev || 'Unknown Team';
    
    const logo = seasonInfo?.imgURL || selectedTeam.imgURL;
    
    return { name, logo };
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

  // Trigger confetti for a specific player tile
  const triggerConfetti = useCallback((pid: number) => {
    const tileElement = tileRefs.current.get(pid);
    if (!tileElement) return;

    const rect = tileElement.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x, y },
      colors: ['#00ff00', '#00ffff', '#ff00ff', '#ffff00', '#ff0000'],
      ticks: 200,
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

      // Trigger confetti
      setTimeout(() => {
        triggerConfetti(player.pid);
      }, 50);
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
  }, [roster, triggerConfetti, toast, selectedSeason, teamDisplayInfo.name]);

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
    
    let matchedPlayer: RosterPlayer | null = null;
    const lastNameMatches: RosterPlayer[] = [];

    unrevealedPlayers.forEach(rp => {
      const playerFullName = normalizeName(rp.player.name);
      const playerLastName = normalizeName(rp.player.name.split(' ').pop() || '');

      if (playerFullName === normalizedGuess) {
        matchedPlayer = rp;
      }
      
      if (playerLastName === normalizedGuess) {
        lastNameMatches.push(rp);
      }
    });

    if (matchedPlayer) {
      handleSelectPlayer(matchedPlayer);
      return;
    }

    if (lastNameMatches.length === 1) {
      handleSelectPlayer(lastNameMatches[0]);
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

  // Give up
  const handleGiveUp = useCallback(() => {
    setRoster(prev => prev.map(rp => ({ ...rp, revealed: true })));
    setFoundCount(roster.length);
  }, [roster.length]);

  // New game
  const handleNew = useCallback(() => {
    pickRandomTeamAndSeason();
  }, [pickRandomTeamAndSeason]);

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
        className="bg-card border-border shrink-0"
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
        style={{ position: 'relative' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="relative flex items-center justify-start md:justify-center">
            <div className="flex items-center space-x-3">
              <img 
                src={sportIcon}
                alt={`${leagueData.sport} icon`} 
                className="w-10 h-10 object-contain header-logo"
              />
              <h1 className="text-base sm:text-lg md:text-2xl header-title">
                {sportTitle} Team Trivia
              </h1>
            </div>
            <div className="absolute right-0 flex items-center space-x-1">
              <div>
                <RulesModal sport={leagueData.sport} />
              </div>
              {hasProgress ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="button-back">
                      <ArrowLeft className="h-[1.2rem] w-[1.2rem]" />
                      <span className="sr-only">Go back</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Go back to game selection?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You have found {foundCount} players. Going back will lose your current progress. Are you sure?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onBackToModeSelect}>Go Back</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button variant="ghost" size="sm" onClick={onBackToModeSelect} data-testid="button-back">
                  <ArrowLeft className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Go back</span>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onGoHome} data-testid="button-home">
                <HomeIcon className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Go home</span>
              </Button>
            </div>
          </div>
        </div>
        <AccentLine isHovered={isHeaderHovered} />
      </header>

      {/* Game Info Header with Dropdowns */}
      <div className="bg-card/50 border-b neon-border-subtle shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left side: Year and Team */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Year Dropdown */}
              <Popover open={yearDropdownOpen} onOpenChange={setYearDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={yearDropdownOpen}
                    className="text-2xl sm:text-3xl font-bold neon-text px-4 py-6"
                    data-testid="button-year-dropdown"
                  >
                    <ChevronDown className="mr-2 h-5 w-5" />
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
                    className="flex items-center gap-3 hover:bg-accent/50 px-4 py-6"
                    data-testid="button-team-dropdown"
                  >
                    {teamDisplayInfo.logo ? (
                      <img
                        src={teamDisplayInfo.logo}
                        alt={teamDisplayInfo.name}
                        className="h-12 w-12 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className={`text-2xl sm:text-3xl font-bold neon-text ${teamDisplayInfo.logo ? 'hidden' : ''}`}>
                      {teamDisplayInfo.name}
                    </span>
                    <ChevronDown className="h-5 w-5 ml-2" />
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
                              }}
                              className="flex items-center gap-2"
                              data-testid={`option-team-${team.tid}`}
                            >
                              {team.imgURLSmall && (
                                <img
                                  src={team.imgURLSmall}
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

            {/* Right side: Counter */}
            <div className="text-base sm:text-lg font-semibold text-muted-foreground" data-testid="text-found-counter">
              {foundCount} / {roster.length}
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-background border-b shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="relative">
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
                className="absolute z-50 w-full mt-2 bg-card border neon-border rounded-lg shadow-lg max-h-[400px] overflow-y-auto"
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
                            season={selectedSeason || undefined}
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
                          className="shrink-0"
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
        </div>
      </div>

      {/* Roster Grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
          <TooltipProvider>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
              {roster.map((rp, index) => (
                <Tooltip key={rp.player.pid} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <div
                      ref={(el) => {
                        if (el) tileRefs.current.set(rp.player.pid, el);
                      }}
                      className={`relative flex flex-col items-center gap-1 p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg transition-all cursor-help ${
                        rp.revealed
                          ? 'neon-glow-success shadow-lg shadow-green-500/50'
                          : ''
                      }`}
                      style={{
                        backgroundColor: rp.teamColors?.[1] || 'hsl(var(--card))',
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        borderColor: rp.teamColors?.[0] || 'hsl(var(--border))',
                      }}
                      data-testid={`card-player-${index}`}
                    >
                      {/* Position Badge - Always visible */}
                      <div className="absolute top-1 left-1 bg-primary/90 text-primary-foreground text-[0.6rem] sm:text-xs font-bold px-1 sm:px-1.5 py-0.5 rounded z-10">
                        {rp.position}
                      </div>

                      {/* Jersey Number Badge - Always visible, ZenGM style */}
                      {rp.jerseyNumber && rp.teamColors && (
                        <div
                          className="absolute top-1 right-1 text-[0.75rem] sm:text-[0.95rem] font-extrabold px-1.5 sm:px-2 py-0.5 sm:py-1 z-10 min-w-[1.75rem] sm:min-w-[2rem] aspect-square flex items-center justify-center"
                          style={{
                            backgroundColor: rp.teamColors[0] || '#000000',
                            color: rp.teamColors[1] || '#ffffff',
                            border: `2px solid ${rp.teamColors[2] || rp.teamColors[0] || '#cccccc'}`,
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          {rp.jerseyNumber}
                        </div>
                      )}

                      {/* Headshot - Takes up most of the tile */}
                      <div className="w-full aspect-square mb-1">
                        <PlayerFace
                          pid={rp.player.pid}
                          name={rp.player.name}
                          imgURL={rp.player.imgURL ?? undefined}
                          face={rp.player.face}
                          size={96}
                          hideName={true}
                          player={rp.player}
                          teams={leagueData.teams}
                          sport={leagueData.sport}
                          season={selectedSeason || undefined}
                        />
                      </div>

                      {/* Name - Compact */}
                      <div className="w-full text-center min-h-[1.5rem] sm:min-h-[2rem] flex items-center justify-center px-0.5">
                        {rp.revealed ? (
                          <p className="text-[0.65rem] sm:text-xs md:text-sm font-bold line-clamp-2 neon-text-subtle leading-tight">
                            {rp.player.name}
                          </p>
                        ) : (
                          <div className="w-full h-2 sm:h-3 bg-muted rounded animate-pulse" />
                        )}
                      </div>

                      {/* Stats - Compact and only on larger screens */}
                      {rp.revealed && (
                        <div className="hidden sm:block w-full text-center text-[0.6rem] md:text-xs space-y-1 mt-1">
                          {/* Basic Stats - Condensed */}
                          <div className="space-y-0.5 pb-1 border-b border-border/30">
                            <div className="flex justify-between px-1">
                              <span className="text-muted-foreground">PPG</span>
                              <span className="font-semibold">{rp.stats.ppg.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between px-1">
                              <span className="text-muted-foreground">RPG</span>
                              <span className="font-semibold">{rp.stats.rpg.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between px-1">
                              <span className="text-muted-foreground">APG</span>
                              <span className="font-semibold">{rp.stats.apg.toFixed(1)}</span>
                            </div>
                          </div>

                          {/* Advanced Stats - Ultra compact, only on md+ */}
                          <div className="hidden md:block space-y-0.5">
                            <div className="flex justify-between px-1">
                              <span className="text-muted-foreground">FG%</span>
                              <span className="font-semibold">{rp.advancedStats.fgp > 0 ? rp.advancedStats.fgp.toFixed(1) : '-'}</span>
                            </div>
                            <div className="flex justify-between px-1">
                              <span className="text-muted-foreground">3PT%</span>
                              <span className="font-semibold">{rp.advancedStats.tpp > 0 ? rp.advancedStats.tpp.toFixed(1) : '-'}</span>
                            </div>
                            <div className="flex justify-between px-1">
                              <span className="text-muted-foreground">FT%</span>
                              <span className="font-semibold">{rp.advancedStats.ftp > 0 ? rp.advancedStats.ftp.toFixed(1) : '-'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{rp.position}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t neon-border-subtle">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleNew}
              className="neon-button"
              data-testid="button-new-trivia"
            >
              <Shuffle className="h-5 w-5 mr-2" />
              New Team
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={handleGiveUp}
              disabled={foundCount === roster.length}
              data-testid="button-give-up"
            >
              <Flag className="h-5 w-5 mr-2" />
              Give Up
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
