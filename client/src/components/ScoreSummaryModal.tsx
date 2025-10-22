import { useState, useEffect, useMemo } from 'react';
import { Trophy, Users as UsersIcon, TrendingUp, Target, Flag, Shuffle, Home, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlayerFace } from '@/components/PlayerFace';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CompactScoreCard } from '@/components/CompactScoreCard';
import type { Player } from '@/types/bbgm';

interface ScoreCategory {
  name: string;
  points: number;
}

interface PlayerGuess {
  player: Player;
  correct: boolean;
  round?: 'guess' | 'hint';
}

interface LeaderRound {
  label: string;
  statLabel: string;
  statValue: string | number;
  correctPlayer: Player;
  userCorrect: boolean;
  userSelectedPlayer?: Player;
}

interface WinsGuessData {
  G: number;
  L: number;
  R: number;
  A: number;
  awarded: boolean;
}

interface PlayoffFinishData {
  userGuess: string;
  correctOutcome: string;
  correct: boolean;
  seriesScore?: string;
  pointsAwarded: number;
  pointsPerCorrect: number;
}

export interface ScoreSummaryData {
  season: number;
  teamName: string;
  teamAbbrev: string;
  teamLogo?: string;
  teamColors?: string[];
  sport: string;
  finalScore: number;
  categories: ScoreCategory[];
  playoffFinish?: PlayoffFinishData;
  playerGuesses: PlayerGuess[];
  leaders: LeaderRound[];
  winsGuess?: WinsGuessData;
  timeElapsed?: number;
}

interface ScoreSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ScoreSummaryData;
  onPlayAgain: () => void;
  onNewSeason: () => void;
  onShare?: () => void;
}

function PointsPill({
  points,
  variant = 'default',
  size = 'default',
  teamColor,
  textColor,
}: {
  points: number;
  variant?: 'default' | 'large' | 'muted';
  size?: 'default' | 'large';
  teamColor?: string;
  textColor?: string;
}) {
  const isAwarded = points > 0;
  const baseClasses = 'rounded-full font-semibold inline-flex items-center justify-center';

  const variantClasses = variant === 'large'
    ? 'bg-primary text-primary-foreground'
    : variant === 'muted' || !isAwarded
    ? 'bg-muted text-muted-foreground'
    : 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';

  const sizeClasses = size === 'large'
    ? 'px-4 py-2 text-lg'
    : 'px-3 py-1 text-sm';

  const ariaLabel = isAwarded
    ? `${points} points awarded`
    : `0 points awarded`;

  const customStyle = teamColor && isAwarded ? {
    backgroundColor: `${teamColor}25`,
    color: teamColor,
    border: `1.5px solid ${teamColor}`,
  } : undefined;

  return (
    <span
      className={`${baseClasses} ${variantClasses} ${sizeClasses}`}
      aria-label={ariaLabel}
      style={customStyle}
    >
      {points > 0 ? '+' : ''}{points} {size === 'large' ? 'points' : 'pts'}
    </span>
  );
}

function useCountUp(end: number, duration: number = 600, shouldStart: boolean = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [end, duration, shouldStart]);

  return count;
}

function getContrastColor(hexColor: string): 'white' | 'black' {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'black' : 'white';
}

export function ScoreSummaryModal({
  open,
  onOpenChange,
  data,
  onPlayAgain,
  onNewSeason,
  onShare,
}: ScoreSummaryModalProps) {
  const [viewMode, setViewMode] = useState<'detailed' | 'spoilerFree'>('detailed');
  const [cardsVisible, setCardsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setCardsVisible(false);
      const timer = setTimeout(() => setCardsVisible(true), 100);
      return () => clearTimeout(timer);
    }
    setCardsVisible(false);
  }, [open]);

  const animatedScore = useCountUp(data.finalScore, 600, cardsVisible);
  const progress = data.finalScore > 0 ? (animatedScore / data.finalScore) * 100 : 0;

  // Team colors
  const teamColors = useMemo(() => {
    if (data.teamColors && data.teamColors.length > 0) {
      return data.teamColors;
    }
    return ['#1d4ed8', '#3b82f6', '#60a5fa'];
  }, [data.teamColors]);

  const [primaryColor, secondaryColor, accentColor] = useMemo(() => {
    if (teamColors.length === 1) {
      return [teamColors[0], teamColors[0], teamColors[0]];
    }
    if (teamColors.length === 2) {
      return [teamColors[0], teamColors[1], teamColors[1]];
    }
    return [teamColors[0], teamColors[1], teamColors[2] || teamColors[1]];
  }, [teamColors]);

  const headerTextColor = useMemo(() => getContrastColor(primaryColor), [primaryColor]);

  const correctPlayers = useMemo(
    () => data.playerGuesses.filter(p => p.correct),
    [data.playerGuesses]
  );

  const guessRoundPlayers = useMemo(
    () => data.playerGuesses.filter(p => p.correct && (p.round ?? 'guess') === 'guess'),
    [data.playerGuesses]
  );

  const hintRoundPlayers = useMemo(
    () => data.playerGuesses.filter(p => p.correct && (p.round ?? 'hint') === 'hint'),
    [data.playerGuesses]
  );

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    data.categories.forEach(cat => {
      totals[cat.name] = (totals[cat.name] || 0) + cat.points;
    });
    return totals;
  }, [data.categories]);

  const recordedGuessPoints = categoryTotals['Player Guesses'] ?? 0;
  const recordedHintPoints = categoryTotals['Player Guesses (with hints)'] ?? 0;
  const guessRoundCorrect = recordedGuessPoints > 0
    ? Math.round(recordedGuessPoints / 15)
    : correctPlayers.filter(p => (p.round ?? 'guess') === 'guess').length;
  const hintRoundCorrect = recordedHintPoints > 0
    ? Math.round(recordedHintPoints / 10)
    : correctPlayers.filter(p => (p.round ?? 'hint') === 'hint').length;
  const guessRoundPoints = recordedGuessPoints || guessRoundCorrect * 15;
  const hintRoundPoints = recordedHintPoints || hintRoundCorrect * 10;
  const winsGuessPoints = data.winsGuess ? (data.winsGuess.awarded ? 10 : 0) : 0;
  const playoffPoints = data.playoffFinish?.pointsAwarded ?? 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderPlayerList = (players: PlayerGuess[], emptyMessage: string) => (
    <div className="space-y-3">
      {players.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        players.map((pg, idx) => (
          <div key={`${pg.player.pid}-${idx}`} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-2">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-background/60">
              <PlayerFace
                pid={pg.player.pid}
                name={pg.player.name}
                imgURL={pg.player.imgURL ?? undefined}
                face={pg.player.face}
                hideName
                player={pg.player}
                sport={data.sport}
                season={data.season}
              />
            </div>
            <p className="text-sm font-medium text-foreground">{pg.player.name}</p>
          </div>
        ))
      )}
    </div>
  );

  const renderLeaderEntry = (leader: LeaderRound, index: number) => {
    const guessedPlayer = leader.userSelectedPlayer;
    const correctPlayer = leader.correctPlayer;
    return (
      <div key={`${leader.label}-${index}`} className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{leader.label}</span>
          <span className={`text-xs font-semibold ${leader.userCorrect ? 'text-green-500' : 'text-red-400'}`}>
            {leader.userCorrect ? 'Correct' : 'Missed'}
          </span>
        </div>
        {leader.userCorrect ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-background/60">
              <PlayerFace
                pid={correctPlayer.pid}
                name={correctPlayer.name}
                imgURL={correctPlayer.imgURL ?? undefined}
                face={correctPlayer.face}
                hideName
                player={correctPlayer}
                sport={data.sport}
                season={data.season}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{correctPlayer.name}</p>
              {leader.statValue ? <p className="text-xs text-muted-foreground">{leader.statValue}</p> : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-background/60">
                {guessedPlayer ? (
                  <PlayerFace
                    pid={guessedPlayer.pid}
                    name={guessedPlayer.name}
                    imgURL={guessedPlayer.imgURL ?? undefined}
                    face={guessedPlayer.face}
                    hideName
                    player={guessedPlayer}
                    sport={data.sport}
                    season={data.season}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">—</div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your guess</p>
                <p className="text-sm font-medium text-foreground">{guessedPlayer ? guessedPlayer.name : 'No selection'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-background/60">
                <PlayerFace
                  pid={correctPlayer.pid}
                  name={correctPlayer.name}
                  imgURL={correctPlayer.imgURL ?? undefined}
                  face={correctPlayer.face}
                  hideName
                  player={correctPlayer}
                  sport={data.sport}
                  season={data.season}
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correct</p>
                <p className="text-sm font-medium text-foreground">{correctPlayer.name}</p>
                {leader.statValue ? <p className="text-xs text-muted-foreground">{leader.statValue}</p> : null}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const detailedContent = (
    <div className="space-y-6">
      <div
        className={`bg-card border rounded-xl p-6 shadow-sm transition-all duration-300 ${
          cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{
          borderColor: `${primaryColor}40`,
          background: `linear-gradient(to bottom right, ${primaryColor}08, transparent)`,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Final Score</h3>
            <div className="text-6xl font-bold tabular-nums" style={{ color: primaryColor }}>{animatedScore}</div>
            {data.timeElapsed && (
              <p className="text-xs text-muted-foreground mt-2">Time: {formatTime(data.timeElapsed)}</p>
            )}
            <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
                }}
              />
            </div>
          </div>
          <div
            className="rounded-lg p-4 min-w-[220px]"
            style={{
              backgroundColor: `${primaryColor}15`,
              border: `1px solid ${primaryColor}30`,
            }}
          >
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Round 1</span>
                <span className="font-semibold tabular-nums" style={{ color: primaryColor }}>+{guessRoundPoints}</span>
              </div>
              <div className="flex justify-between">
                <span>Round 2</span>
                <span className="font-semibold tabular-nums" style={{ color: primaryColor }}>+{hintRoundPoints}</span>
              </div>
              <div className="flex justify-between">
                <span>Leaders</span>
                <span className="font-semibold tabular-nums" style={{ color: primaryColor }}>+{categoryTotals['Leaders'] || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Wins Guess</span>
                <span className="font-semibold tabular-nums" style={{ color: primaryColor }}>+{winsGuessPoints}</span>
              </div>
              <div className="flex justify-between">
                <span>Playoff</span>
                <span className="font-semibold tabular-nums" style={{ color: primaryColor }}>+{playoffPoints}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={`bg-card border rounded-xl p-6 shadow-sm transition-opacity duration-300 ${cardsVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <h3 className="font-semibold">Round 1 — Player Guesses</h3>
            </div>
            <PointsPill points={guessRoundPoints} teamColor={primaryColor} />
          </div>
          <p className="text-xs text-muted-foreground mb-4">15 points per correct answer.</p>
          {renderPlayerList(guessRoundPlayers, 'No correct players found in this round.')}
        </div>

        <div className={`bg-card border rounded-xl p-6 shadow-sm transition-opacity duration-300 ${cardsVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <h3 className="font-semibold">Round 2 — Hints Enabled</h3>
            </div>
            <PointsPill points={hintRoundPoints} teamColor={primaryColor} />
          </div>
          <p className="text-xs text-muted-foreground mb-4">10 points per correct answer.</p>
          {renderPlayerList(hintRoundPlayers, 'No correct players found with hints.')}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={`bg-card border rounded-xl p-6 shadow-sm transition-opacity duration-300 ${cardsVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <h3 className="font-semibold">Stat Leaders</h3>
            </div>
            <PointsPill points={categoryTotals['Leaders'] || 0} teamColor={primaryColor} />
          </div>
          <div className="space-y-3">
            {data.leaders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leader rounds were played.</p>
            ) : (
              data.leaders.map((leader, idx) => renderLeaderEntry(leader, idx))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className={`bg-card border rounded-xl p-6 shadow-sm transition-opacity duration-300 ${cardsVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h3 className="font-semibold">Wins Guess</h3>
              </div>
              <PointsPill points={winsGuessPoints} teamColor={primaryColor} />
            </div>
            {data.winsGuess ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-semibold text-foreground">Guessed:</span> {data.winsGuess.L}–{data.winsGuess.R}</p>
                <p><span className="font-semibold text-foreground">Actual:</span> {data.winsGuess.A}</p>
                <p className={`text-xs font-semibold uppercase tracking-wide ${data.winsGuess.awarded ? 'text-green-500' : 'text-red-400'}`}>
                  {data.winsGuess.awarded ? 'Correct' : 'Incorrect'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This round was skipped.</p>
            )}
          </div>

          <div className={`bg-card border rounded-xl p-6 shadow-sm transition-opacity duration-300 ${cardsVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h3 className="font-semibold">Playoff Finish</h3>
              </div>
              <PointsPill points={playoffPoints} teamColor={primaryColor} />
            </div>
            {data.playoffFinish ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                {data.playoffFinish.correct ? (
                  <p><span className="font-semibold text-foreground">Outcome:</span> {data.playoffFinish.correctOutcome}</p>
                ) : (
                  <>
                    <p><span className="font-semibold text-foreground">Your guess:</span> {data.playoffFinish.userGuess}</p>
                    <p><span className="font-semibold text-foreground">Actual:</span> {data.playoffFinish.correctOutcome}</p>
                  </>
                )}
                {data.playoffFinish.seriesScore && (
                  <p className="text-xs text-muted-foreground">Series: {data.playoffFinish.seriesScore}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No playoff question this session.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const spoilerContent = (
    <div className="flex justify-center">
      <CompactScoreCard
        data={data}
        teamColors={data.teamColors}
        onPlayAgain={onPlayAgain}
        onNewSeason={onNewSeason}
        variant="embedded"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-y-auto p-0"
        aria-describedby="score-summary-description"
        style={{
          background: `linear-gradient(to bottom, ${primaryColor}15, transparent 200px)`,
        }}
      >
        <DialogHeader
          className="sticky top-0 z-10 border-b px-6 py-4"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            borderColor: accentColor,
          }}
        >
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex items-center gap-3">
              <Trophy
                className="h-6 w-6"
                aria-hidden="true"
                style={{ color: headerTextColor === 'white' ? '#ffffff' : '#000000' }}
              />
              <DialogTitle style={{ color: headerTextColor === 'white' ? '#ffffff' : '#000000' }}>
                Score Breakdown
              </DialogTitle>
            </div>
            <div id="score-summary-description" className="flex items-center gap-3">
              <span
                className="text-sm font-medium"
                style={{ color: headerTextColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
              >
                {data.season} {data.teamName}
              </span>
              {data.teamLogo && (
                <img
                  src={data.teamLogo}
                  alt={`${data.teamName} logo`}
                  className="h-12 w-12 object-contain"
                  style={{
                    filter: headerTextColor === 'white' ? 'brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.3))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                  }}
                />
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-6 space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant={viewMode === 'detailed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('detailed')}
              className="px-4"
              style={viewMode === 'detailed' ? {
                backgroundColor: primaryColor,
                color: headerTextColor === 'white' ? '#ffffff' : '#000000',
                borderColor: primaryColor,
              } : {
                borderColor: primaryColor,
                color: primaryColor,
              }}
            >
              Detailed Breakdown
            </Button>
            <Button
              variant={viewMode === 'spoilerFree' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('spoilerFree')}
              className="px-4"
              style={viewMode === 'spoilerFree' ? {
                backgroundColor: primaryColor,
                color: headerTextColor === 'white' ? '#ffffff' : '#000000',
                borderColor: primaryColor,
              } : {
                borderColor: primaryColor,
                color: primaryColor,
              }}
            >
              Spoiler-Free Card
            </Button>
          </div>

          {viewMode === 'detailed' ? detailedContent : spoilerContent}

          <div className="text-right text-sm font-mono text-muted-foreground border-t pt-4">
            Total = {data.categories.map(c => c.points).join(' + ')} = {data.finalScore}
          </div>
        </div>

        <div
          className="sticky bottom-0 border-t px-6 py-4"
          style={{
            background: `linear-gradient(to top, ${primaryColor}20, transparent)`,
            borderColor: accentColor,
          }}
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={onPlayAgain}
              size="lg"
              style={{
                backgroundColor: primaryColor,
                color: headerTextColor === 'white' ? '#ffffff' : '#000000',
                borderColor: primaryColor,
              }}
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Play Again
            </Button>
            <Button
              onClick={onNewSeason}
              variant="outline"
              size="lg"
              style={{
                borderColor: primaryColor,
                color: primaryColor,
              }}
            >
              <Home className="h-4 w-4 mr-2" />
              New Season
            </Button>
            <Button
              onClick={onShare}
              variant="outline"
              size="lg"
              disabled={!onShare}
              title={onShare ? 'Share result' : 'Coming soon'}
              style={{
                borderColor: primaryColor,
                color: primaryColor,
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
