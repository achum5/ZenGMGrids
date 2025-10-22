import { useState, useEffect, useMemo } from 'react';
import { Trophy, Medal, Flag, Target, Users as UsersIcon, TrendingUp, Share2, Home, Shuffle, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlayerFace } from '@/components/PlayerFace';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Player } from '@/types/bbgm';

// Types
interface ScoreCategory {
  name: string;
  points: number;
}

interface PlayerGuess {
  player: Player;
  correct: boolean;
  round?: 'guess' | 'hint';
  headshot?: string;
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
  G: number; // Total games
  L: number; // Left edge of user's guess range
  R: number; // Right edge of user's guess range
  A: number; // Actual wins
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
  // Meta
  season: number;
  teamName: string;
  teamAbbrev: string;
  teamLogo?: string;
  sport: string;

  // Totals
  finalScore: number;
  categories: ScoreCategory[];

  // Playoff finish
  playoffFinish?: PlayoffFinishData;

  // Player guesses
  playerGuesses: PlayerGuess[];

  // Leaders
  leaders: LeaderRound[];

  // Wins guess
  winsGuess?: WinsGuessData;

  // Time elapsed (optional)
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

// Helper component: Points Pill
function PointsPill({
  points,
  variant = 'default',
  size = 'default'
}: {
  points: number;
  variant?: 'default' | 'large' | 'muted';
  size?: 'default' | 'large';
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

  return (
    <span
      className={`${baseClasses} ${variantClasses} ${sizeClasses}`}
      aria-label={ariaLabel}
    >
      {points > 0 ? '+' : ''}{points} {size === 'large' ? 'points' : 'pts'}
    </span>
  );
}

// Helper component: Badge
function Badge({
  children,
  variant = 'default'
}: {
  children: React.ReactNode;
  variant?: 'gold' | 'silver' | 'neutral' | 'default';
}) {
  const variantClasses = {
    gold: 'bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-400 border-yellow-500/30',
    silver: 'bg-slate-400/20 text-slate-700 dark:bg-slate-400/30 dark:text-slate-300 border-slate-400/30',
    neutral: 'bg-muted text-muted-foreground border-border',
    default: 'bg-primary/10 text-primary border-primary/20',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}

// Helper component: Chip
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
      {children}
    </span>
  );
}

// Helper: Count-up animation hook
function useCountUp(end: number, duration: number = 600, shouldStart: boolean = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Ease-out quad
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

export function ScoreSummaryModal({
  open,
  onOpenChange,
  data,
  onPlayAgain,
  onNewSeason,
  onShare,
}: ScoreSummaryModalProps) {
  const [showMissedPlayers, setShowMissedPlayers] = useState(false);
  const [showAllPlayoffOutcomes, setShowAllPlayoffOutcomes] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);

  // Trigger animations when modal opens
  useEffect(() => {
    if (open) {
      setCardsVisible(false);
      const timer = setTimeout(() => setCardsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setCardsVisible(false);
    }
  }, [open]);

  // Count-up animation for score
  const animatedScore = useCountUp(data.finalScore, 600, cardsVisible);
  const progress = data.finalScore > 0 ? (animatedScore / data.finalScore) * 100 : 0;

  // Separate player guesses
  const correctPlayers = useMemo(
    () => data.playerGuesses.filter(p => p.correct),
    [data.playerGuesses]
  );
  const missedPlayers = useMemo(
    () => data.playerGuesses.filter(p => !p.correct),
    [data.playerGuesses]
  );

  // Calculate category totals
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
  const totalPlayerGuessPoints = guessRoundPoints + hintRoundPoints;

  const hasPlayerGuessCategory =
    categoryTotals['Player Guesses'] !== undefined ||
    categoryTotals['Player Guesses (with hints)'] !== undefined ||
    data.playerGuesses.length > 0;

  // Get playoff badge variant
  const getPlayoffBadgeVariant = (outcome: string): 'gold' | 'silver' | 'neutral' => {
    if (outcome.toLowerCase().includes('won championship') || outcome.toLowerCase().includes('champion')) {
      return 'gold';
    }
    if (outcome.toLowerCase().includes('lost finals')) {
      return 'silver';
    }
    return 'neutral';
  };

  // Format time elapsed
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-y-auto p-0"
        aria-describedby="score-summary-description"
      >
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-primary" aria-hidden="true" />
              <DialogTitle>Score Breakdown</DialogTitle>
            </div>

            {/* Subheader: Season + Team Logo */}
            <div id="score-summary-description" className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{data.season}</span>
              {data.teamLogo && (
                <img
                  src={data.teamLogo}
                  alt={`${data.teamName} logo`}
                  className="h-12 w-12 object-contain"
                />
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Body: Card Grid */}
        <div className="px-6 py-6 space-y-6">

          {/* 1. Final Result Card */}
          <div
            className={`bg-card border rounded-xl p-6 shadow-sm transition-all duration-300 ${
              cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Left: Big Score */}
              <div className="flex-1">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Final Score</h3>
                <div className="text-6xl font-bold text-primary tabular-nums">
                  {animatedScore}
                </div>
                {data.timeElapsed && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Time: {formatTime(data.timeElapsed)}
                  </p>
                )}

                {/* Progress Bar */}
                <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Right: Receipt */}
              <div className="bg-muted/30 rounded-lg p-4 min-w-[200px]">
                <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Breakdown
                </h4>
                <div className="space-y-2 text-sm">
                  {categoryTotals['Playoff Finish'] !== undefined && (
                    <div className="flex justify-between items-center">
                      <span>Playoff Finish</span>
                      <span className="font-semibold tabular-nums">+{categoryTotals['Playoff Finish']}</span>
                    </div>
                  )}
                  {hasPlayerGuessCategory && (
                    <div className="flex justify-between items-center">
                      <span>Player Guesses</span>
                      <span className="font-semibold tabular-nums">+{totalPlayerGuessPoints}</span>
                    </div>
                  )}
                  {categoryTotals['Leaders'] !== undefined && (
                    <div className="flex justify-between items-center">
                      <span>Leaders</span>
                      <span className="font-semibold tabular-nums">+{categoryTotals['Leaders']}</span>
                    </div>
                  )}
                  {categoryTotals['Wins Guess'] !== undefined && (
                    <div className="flex justify-between items-center">
                      <span>Wins Guess</span>
                      <span className="font-semibold tabular-nums">+{categoryTotals['Wins Guess']}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Responsive Grid for remaining cards */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* 2. Playoff Finish Card */}
            {data.playoffFinish && (
              <div
                className={`bg-card border rounded-xl p-6 shadow-sm transition-all duration-300 ${
                  cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '50ms' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <h3 className="font-semibold">Playoff Finish</h3>
                  </div>
                  <PointsPill points={data.playoffFinish.pointsAwarded} />
                </div>

                <div className="space-y-3">
                  <Badge variant={getPlayoffBadgeVariant(data.playoffFinish.correctOutcome)}>
                    {data.playoffFinish.correctOutcome}
                  </Badge>

                  {data.playoffFinish.seriesScore && (
                    <p className="text-sm text-muted-foreground">
                      Series: {data.playoffFinish.seriesScore}
                    </p>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Your guess: <Chip>{data.playoffFinish.userGuess}</Chip></p>
                    <p>Points per correct: {data.playoffFinish.pointsPerCorrect}</p>
                  </div>

                  {/* Show all outcomes toggle */}
                  <button
                    onClick={() => setShowAllPlayoffOutcomes(!showAllPlayoffOutcomes)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                  >
                    {showAllPlayoffOutcomes ? 'Hide' : 'Show all outcomes'}
                    <ChevronDown className={`h-3 w-3 transition-transform ${showAllPlayoffOutcomes ? 'rotate-180' : ''}`} />
                  </button>

                  {showAllPlayoffOutcomes && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Chip>Missed Playoffs</Chip>
                      <Chip>Lost First Round</Chip>
                      <Chip>Lost Second Round</Chip>
                      <Chip>Lost Conference Finals</Chip>
                      <Chip>Lost Finals</Chip>
                      <Chip>Won Championship</Chip>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Player Guesses Card */}
            <div
              className={`bg-card border rounded-xl p-6 shadow-sm transition-all duration-300 ${
                cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: data.playoffFinish ? '100ms' : '50ms' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <h3 className="font-semibold">Player Guesses</h3>
                </div>
                <PointsPill points={totalPlayerGuessPoints} />
              </div>

              <div className="text-sm text-muted-foreground mb-4 space-y-1">
                <p>
                  Round 1: {guessRoundCorrect} correct × 15 = +{guessRoundPoints}
                </p>
                <p>
                  Round 2: {hintRoundCorrect} correct × 10 = +{hintRoundPoints}
                </p>
              </div>

              {/* Correct Players Grid */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {correctPlayers.slice(0, 8).map((pg, idx) => (
                  <div key={idx} className="text-center">
                    <div className="relative mb-1">
                      <PlayerFace
                        face={pg.player.face}
                        className="w-12 h-12 rounded-full mx-auto"
                      />
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                    <p className="text-xs truncate" title={pg.player.name}>
                      {pg.player.name.split(' ').pop()}
                    </p>
                  </div>
                ))}
              </div>

              {correctPlayers.length > 8 && (
                <p className="text-xs text-muted-foreground text-center mb-3">
                  +{correctPlayers.length - 8} more
                </p>
              )}

              {/* Show Missed Toggle */}
              {missedPlayers.length > 0 && (
                <>
                  <button
                    onClick={() => setShowMissedPlayers(!showMissedPlayers)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                  >
                    {showMissedPlayers ? 'Hide' : 'Show'} missed ({missedPlayers.length})
                    <ChevronDown className={`h-3 w-3 transition-transform ${showMissedPlayers ? 'rotate-180' : ''}`} />
                  </button>

                  {showMissedPlayers && (
                    <div className="grid grid-cols-4 gap-3 mt-3 opacity-60">
                      {missedPlayers.map((pg, idx) => (
                        <div key={idx} className="text-center">
                          <div className="relative mb-1">
                            <PlayerFace
                              face={pg.player.face}
                              className="w-12 h-12 rounded-full mx-auto grayscale"
                            />
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✕</span>
                            </div>
                          </div>
                          <p className="text-xs truncate" title={pg.player.name}>
                            {pg.player.name.split(' ').pop()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 4. Leaders Card */}
            {data.leaders.length > 0 && (
              <div
                className={`bg-card border rounded-xl p-6 shadow-sm md:col-span-2 transition-all duration-300 ${
                  cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '150ms' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <h3 className="font-semibold">Stat Leaders</h3>
                  </div>
                  <PointsPill points={categoryTotals['Leaders'] || 0} />
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.leaders.map((leader, idx) => (
                    <div
                      key={idx}
                      className="bg-muted/30 rounded-lg p-3 hover:shadow-md hover:scale-[1.02] transition-all group"
                      title={`${leader.statLabel}: ${leader.statValue}`}
                    >
                      <div className="flex items-center gap-3">
                        <PlayerFace
                          face={leader.correctPlayer.face}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {leader.correctPlayer.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {leader.label}
                          </p>
                        </div>
                        <PointsPill points={leader.userCorrect ? 5 : 0} />
                      </div>

                      {!leader.userCorrect && leader.userSelectedPlayer && (
                        <p className="text-xs text-muted-foreground mt-2">
                          You picked: {leader.userSelectedPlayer.name}
                        </p>
                      )}

                      {/* Tooltip on hover */}
                      <div className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {leader.statLabel}: {leader.statValue}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Wins Guess Card */}
            {data.winsGuess && (
              <div
                className={`bg-card border rounded-xl p-6 shadow-sm md:col-span-2 transition-all duration-300 ${
                  cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '200ms' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <h3 className="font-semibold">Wins Guess</h3>
                  </div>
                  <PointsPill points={data.winsGuess.awarded ? 10 : 0} />
                </div>

                {/* Slider Snapshot */}
                <div className="relative py-8">
                  {/* Track */}
                  <div className="relative h-2 bg-muted rounded-full">
                    {/* User's range band */}
                    <div
                      className="absolute h-full bg-primary/30 rounded-full transition-all duration-300"
                      style={{
                        left: `${(data.winsGuess.L / data.winsGuess.G) * 100}%`,
                        width: `${((data.winsGuess.R - data.winsGuess.L) / data.winsGuess.G) * 100}%`,
                      }}
                    />

                    {/* Actual wins marker */}
                    <div
                      className="absolute -top-1 w-1 h-4 bg-primary rounded-full transition-all duration-300 delay-300"
                      style={{
                        left: `${(data.winsGuess.A / data.winsGuess.G) * 100}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap">
                        A: {data.winsGuess.A}
                      </div>
                    </div>
                  </div>

                  {/* Track labels */}
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>0</span>
                    <span>{Math.round(data.winsGuess.G * 0.25)}</span>
                    <span>{Math.round(data.winsGuess.G * 0.5)}</span>
                    <span>{Math.round(data.winsGuess.G * 0.75)}</span>
                    <span>{data.winsGuess.G}</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Guessed {data.winsGuess.L}–{data.winsGuess.R} • Actual {data.winsGuess.A}
                </p>
              </div>
            )}
          </div>

          {/* Math Footer */}
          <div className="text-right text-sm font-mono text-muted-foreground border-t pt-4">
            Total = {data.categories.map(c => c.points).join(' + ')} = {data.finalScore}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-background border-t px-6 py-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={onPlayAgain} size="lg">
              <Shuffle className="h-4 w-4 mr-2" />
              Play Again
            </Button>
            <Button onClick={onNewSeason} variant="outline" size="lg">
              <Home className="h-4 w-4 mr-2" />
              New Season
            </Button>
            <Button
              onClick={onShare}
              variant="outline"
              size="lg"
              disabled={!onShare}
              title={onShare ? 'Share result' : 'Coming soon'}
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
