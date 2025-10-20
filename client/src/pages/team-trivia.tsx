import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlayerFace } from '@/components/PlayerFace';
import { useToast } from '@/lib/hooks/use-toast';
import { Shuffle, Flag, Home as HomeIcon, ArrowLeft } from 'lucide-react';
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
    // Remove suffixes
    .replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, '')
    // Remove punctuation and spaces
    .replace(/['\-\s\.]/g, '')
    // Normalize diacritics (simple approach)
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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Pick a random season and team
  const pickRandomTeamAndSeason = useCallback(() => {
    if (!leagueData.players.length || !leagueData.teams.length) {
      toast({
        title: 'Error',
        description: 'No valid teams or players found in this league.',
        variant: 'destructive',
      });
      return;
    }

    // Get all unique seasons from player data
    const allSeasons = new Set<number>();
    leagueData.players.forEach(player => {
      player.seasons?.forEach(season => {
        if (!season.playoffs) {
          allSeasons.add(season.season);
        }
      });
    });

    const seasons = Array.from(allSeasons).sort((a, b) => a - b);
    if (seasons.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid seasons found in this league.',
        variant: 'destructive',
      });
      return;
    }

    // Pick a random season
    const randomSeason = seasons[Math.floor(Math.random() * seasons.length)];
    
    // Find teams that had players in this season
    const teamsInSeason = new Set<number>();
    leagueData.players.forEach(player => {
      player.seasons?.forEach(season => {
        if (!season.playoffs && season.season === randomSeason && season.gp > 0) {
          teamsInSeason.add(season.tid);
        }
      });
    });

    const validTeams = leagueData.teams.filter(team => teamsInSeason.has(team.tid));
    if (validTeams.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid teams found for the selected season.',
        variant: 'destructive',
      });
      return;
    }

    // Pick a random team
    const randomTeam = validTeams[Math.floor(Math.random() * validTeams.length)];

    // Build roster for this team and season
    const rosterPlayers: RosterPlayer[] = [];
    leagueData.players.forEach(player => {
      const seasonStats = player.seasons?.find(
        s => !s.playoffs && s.season === randomSeason && s.tid === randomTeam.tid
      );
      
      if (seasonStats && seasonStats.gp > 0) {
        rosterPlayers.push({
          player,
          revealed: false,
          gamesPlayed: seasonStats.gp,
        });
      }
    });

    // Sort roster: by games played, then alphabetically
    rosterPlayers.sort((a, b) => {
      if (b.gamesPlayed !== a.gamesPlayed) {
        return b.gamesPlayed - a.gamesPlayed;
      }
      return a.player.name.localeCompare(b.player.name);
    });

    setSelectedSeason(randomSeason);
    setSelectedTeam(randomTeam);
    setRoster(rosterPlayers);
    setFoundCount(0);
    setGuess('');
  }, [leagueData, toast]);

  // Initialize on mount
  useEffect(() => {
    pickRandomTeamAndSeason();
  }, [pickRandomTeamAndSeason]);

  // Team name for display
  const teamDisplayName = useMemo(() => {
    if (!selectedTeam || selectedSeason === null) return '';
    
    // Find season-specific name if available
    const seasonInfo = selectedTeam.seasons?.find(s => s.season === selectedSeason);
    if (seasonInfo && seasonInfo.region && seasonInfo.name) {
      return `${seasonInfo.region} ${seasonInfo.name}`;
    }
    
    // Fallback to current name
    return selectedTeam.region && selectedTeam.name
      ? `${selectedTeam.region} ${selectedTeam.name}`
      : selectedTeam.abbrev || 'Unknown Team';
  }, [selectedTeam, selectedSeason]);

  // Filter unrevealed players matching current guess from ALL league players
  const autocompleteSuggestions = useMemo(() => {
    if (!guess.trim()) {
      return [];
    }

    const normalizedGuess = normalizeName(guess);
    const revealedPlayerPids = new Set(roster.filter(rp => rp.revealed).map(rp => rp.player.pid));

    return leagueData.players
      .filter(player => {
        // Exclude players already revealed on the current roster
        if (revealedPlayerPids.has(player.pid)) {
          return false;
        }
        const normalizedName = normalizeName(player.name);
        return normalizedName.includes(normalizedGuess);
      })
      .slice(0, 6); // Show up to 6 suggestions
  }, [guess, roster, leagueData.players]);

  // Open/close autocomplete based on suggestions
  useEffect(() => {
    setAutocompleteOpen(autocompleteSuggestions.length > 0 && guess.trim().length > 0);
    setActiveIndex(-1);
  }, [autocompleteSuggestions, guess]);

  // Handle selecting a player from autocomplete
  const handleSelectPlayer = useCallback((selectedPlayer: Player) => {
    setRoster(prev => prev.map(rp =>
      rp.player.pid === selectedPlayer.pid
        ? { ...rp, revealed: true }
        : rp
    ));
    setFoundCount(prev => prev + 1);
    setGuess('');
    setAutocompleteOpen(false);
    setActiveIndex(-1);
    
    // Refocus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, []);

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
        // Select the highlighted suggestion
        handleSelectPlayer(autocompleteSuggestions[activeIndex]);
      } else if (autocompleteSuggestions.length === 1) {
        // If only one suggestion, select it
        handleSelectPlayer(autocompleteSuggestions[0]);
      } else {
        // Try to match the typed guess
        handleManualGuess();
      }
    } else if (e.key === 'Escape') {
      setAutocompleteOpen(false);
      setActiveIndex(-1);
    }
  }, [autocompleteOpen, activeIndex, autocompleteSuggestions, handleSelectPlayer]);

  // Handle manual guess submission (when user types and presses enter without selecting)
  const handleManualGuess = useCallback(() => {
    if (!guess.trim()) return;

    const normalizedGuess = normalizeName(guess);
    
    // Find unrevealed players
    const unrevealedPlayers = roster.filter(rp => !rp.revealed);
    
    // Try to match full name or unique last name
    let matchedPlayer: RosterPlayer | null = null;
    const lastNameMatches: RosterPlayer[] = [];

    unrevealedPlayers.forEach(rp => {
      const playerFullName = normalizeName(rp.player.name);
      const playerLastName = normalizeName(rp.player.name.split(' ').pop() || '');

      // Check full name match
      if (playerFullName === normalizedGuess) {
        matchedPlayer = rp;
      }
      
      // Check last name match
      if (playerLastName === normalizedGuess) {
        lastNameMatches.push(rp);
      }
    });

    // If full name matched, reveal it
    if (matchedPlayer) {
      setRoster(prev => prev.map(rp =>
        rp.player.pid === matchedPlayer!.player.pid
          ? { ...rp, revealed: true }
          : rp
      ));
      setFoundCount(prev => prev + 1);
      setGuess('');
      return;
    }

    // If unique last name match, reveal it
    if (lastNameMatches.length === 1) {
      setRoster(prev => prev.map(rp =>
        rp.player.pid === lastNameMatches[0].player.pid
          ? { ...rp, revealed: true }
          : rp
      ));
      setFoundCount(prev => prev + 1);
      setGuess('');
      return;
    }

    // If multiple last name matches, show message
    if (lastNameMatches.length > 1) {
      toast({
        description: 'Multiple players with that last name — type the full name.',
      });
      return;
    }

    // Check if it's a valid player in the league but not on this roster
    const isValidLeaguePlayer = leagueData.players.some(p => 
      normalizeName(p.name) === normalizedGuess
    );

    if (isValidLeaguePlayer) {
      toast({
        description: `Not on ${selectedSeason} ${teamDisplayName}.`,
      });
    } else {
      toast({
        description: 'No match found. Try again!',
      });
    }
  }, [guess, roster, leagueData.players, selectedSeason, teamDisplayName, toast]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && autocompleteRef.current) {
      const activeElement = autocompleteRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  // Give up - reveal all
  const handleGiveUp = useCallback(() => {
    setRoster(prev => prev.map(rp => ({ ...rp, revealed: true })));
    setFoundCount(roster.length);
  }, [roster.length]);

  // Handle new game
  const handleNew = useCallback(() => {
    pickRandomTeamAndSeason();
  }, [pickRandomTeamAndSeason]);

  // Check if user has made progress
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
    <div className="min-h-screen flex flex-col bg-background">
      <div className="sticky top-0 z-10"> {/* New sticky container */}
        {/* Main Header */}
        <header 
          className="bg-card border-border"
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

        {/* Game Info Header */}
        <div className="bg-card/50 border-b neon-border-subtle">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <h2 className="text-3xl sm:text-4xl font-bold neon-text mb-2">
              {selectedSeason} {teamDisplayName}
            </h2>

          </div>
        </div>

      {/* Roster Grid */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {roster.map((rp, index) => (
              <div
                key={rp.player.pid}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                  rp.revealed 
                    ? 'bg-card neon-border-success' 
                    : 'bg-card/50 border-border'
                }`}
                data-testid={`card-player-${index}`}
              >
                {/* Headshot */}
                <div className="w-32 h-32 sm:w-40 sm:h-40"> {/* Increased size */}
                  <PlayerFace
                    pid={rp.player.pid}
                    name={rp.player.name}
                    imgURL={rp.player.imgURL ?? undefined}
                    face={rp.player.face}
                    size={128} // Increased size
                    hideName={true}
                    player={rp.player}
                    teams={leagueData.teams}
                    sport={leagueData.sport}
                    season={selectedSeason}
                  />
                </div>

                {/* Name */}
                <div className="w-full text-center min-h-[2.5rem] flex items-center justify-center">
                  {rp.revealed ? (
                    <p className="text-sm font-medium line-clamp-2">
                      {rp.player.name}
                    </p>
                  ) : (
                    <div className="w-full h-4 bg-muted rounded animate-pulse" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t neon-border-subtle">
        <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col gap-4"> {/* Added flex-col and gap */}
          {/* Search Section - Moved to bottom */}
          <div className="bg-background">
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
                  className="absolute z-50 w-full mb-2 bottom-full bg-card border neon-border rounded-lg shadow-lg overflow-hidden" {/* Changed mt-2 to mb-2 and added bottom-full */}
                  data-testid="autocomplete-dropdown"
                >
                  <ScrollArea className="max-h-[400px]">
                    <div className="py-2">
                      {autocompleteSuggestions.map((player, index) => (
                        <div
                          key={player.pid}
                          data-index={index}
                          className={`flex items-center gap-4 px-4 py-2 cursor-pointer transition-all hover:bg-accent/50 ${
                            index === activeIndex ? 'bg-accent neon-glow' : ''
                          }`}
                          onClick={() => handleSelectPlayer(player)} // Pass player directly
                          data-testid={`autocomplete-option-${index}`}
                        >
                          {/* Player Face */}
                          <div className="shrink-0 w-16 h-16">
                            <PlayerFace
                              pid={player.pid}
                              name={player.name}
                              imgURL={player.imgURL ?? undefined}
                              face={player.face}
                              size={64}
                              hideName={true}
                              // Removed player, teams, and season props to ensure generic jersey rendering
                            />
                          </div>

                          {/* Player Name */}
                          <div className="flex-1 min-w-0">
                            <p className="text-lg font-medium truncate">
                              {player.name}
                            </p>
                          </div>

                          {/* Select Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPlayer(player); // Pass player directly
                            }}
                            data-testid={`button-select-${index}`}
                          >
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center gap-3"> {/* Rearranged buttons */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
