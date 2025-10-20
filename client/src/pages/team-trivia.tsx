import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlayerFace } from '@/components/PlayerFace';
import { useToast } from '@/lib/hooks/use-toast';
import { Shuffle, Flag } from 'lucide-react';
import type { LeagueData, Player, Team } from '@/types/bbgm';

interface RosterPlayer {
  player: Player;
  revealed: boolean;
  gamesPlayed: number;
}

interface TeamTriviaProps {
  leagueData: LeagueData;
  onBackToModeSelect: () => void;
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

export default function TeamTrivia({ leagueData, onBackToModeSelect }: TeamTriviaProps) {
  const { toast } = useToast();
  const [guess, setGuess] = useState('');
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [foundCount, setFoundCount] = useState(0);

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

  // Handle guess submission
  const handleGuess = useCallback(() => {
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

  // Give up - reveal all
  const handleGiveUp = useCallback(() => {
    setRoster(prev => prev.map(rp => ({ ...rp, revealed: true })));
    setFoundCount(roster.length);
  }, [roster.length]);

  // Handle new game
  const handleNew = useCallback(() => {
    pickRandomTeamAndSeason();
  }, [pickRandomTeamAndSeason]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with team/season info */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {selectedSeason} {teamDisplayName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Name every player on this roster
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToModeSelect}
              data-testid="button-back-to-modes"
            >
              Back
            </Button>
          </div>

          {/* Search bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGuess();
            }}
            className="flex gap-2"
          >
            <Input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Type a player's name..."
              className="flex-1"
              autoFocus
              data-testid="input-player-guess"
            />
          </form>
        </div>
      </div>

      {/* Roster list */}
      <div className="flex-1 container max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-2">
          {roster.map((rp, index) => (
            <div
              key={rp.player.pid}
              className="flex items-center gap-4 p-3 rounded-lg bg-card border hover:bg-accent/50 transition-colors"
              data-testid={`row-player-${index}`}
            >
              {/* Headshot */}
              <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20">
                <PlayerFace
                  pid={rp.player.pid}
                  name={rp.player.name}
                  imgURL={rp.player.imgURL ?? undefined}
                  face={rp.player.face}
                  size={80}
                  hideName={true}
                  player={rp.player}
                  teams={leagueData.teams}
                  sport={leagueData.sport}
                />
              </div>

              {/* Name area */}
              <div className="flex-1 min-w-0">
                {rp.revealed ? (
                  <p className="text-lg font-medium truncate">
                    {rp.player.name}
                  </p>
                ) : (
                  <div className="h-6 bg-muted rounded animate-pulse" style={{ width: '70%' }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Counter */}
            <div className="text-lg font-semibold" data-testid="text-found-counter">
              Found {foundCount} / {roster.length}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleNew}
                data-testid="button-new-trivia"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                New
              </Button>
              <Button
                variant="destructive"
                onClick={handleGiveUp}
                disabled={foundCount === roster.length}
                data-testid="button-give-up"
              >
                <Flag className="h-4 w-4 mr-2" />
                Give Up
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
