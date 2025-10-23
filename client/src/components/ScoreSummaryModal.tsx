import { useState, useEffect, useMemo } from 'react';
import { Users as UsersIcon, TrendingUp, Target, Flag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlayerFace } from '@/components/PlayerFace';
import {
  Dialog,
  DialogContent,
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
  onPlayerClick?: (player: Player) => void;
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
  const baseClasses = 'rounded-full font-semibold inline-flex items-center justify-center text-center';

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
  onPlayerClick,
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

  const renderPlayerList = (players: PlayerGuess[], emptyMessage: string, pointsPerPlayer: number) => (
    <div className="space-y-3">
      {players.length === 0 ? (
        <p className="text-sm" style={{ color: `${getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000'}aa` }}>{emptyMessage}</p>
      ) : (
        players.map((pg, idx) => (
          <div
            key={`${pg.player.pid}-${idx}`}
            onClick={() => onPlayerClick?.(pg.player)}
            className="flex items-center justify-between gap-3 rounded-lg border p-2 cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              borderColor: `${secondaryColor}40`,
              backgroundColor: `${secondaryColor}10`,
            }}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12">
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
              <p className="text-sm font-medium" style={{ color: getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000' }}>{pg.player.name}</p>
            </div>
            <PointsPill points={pointsPerPlayer} teamColor={secondaryColor} />
          </div>
        ))
      )}
    </div>
  );

  const renderLeaderEntry = (leader: LeaderRound, index: number) => {
    const guessedPlayer = leader.userSelectedPlayer;
    const correctPlayer = leader.correctPlayer;
    const textColor = getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000';
    return (
      <div
        key={`${leader.label}-${index}`}
        className="rounded-xl border p-4 space-y-3"
        style={{
          borderColor: `${secondaryColor}40`,
          backgroundColor: `${secondaryColor}10`,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: textColor }}>{leader.label}</span>
          <span className={`text-xs font-semibold ${leader.userCorrect ? 'text-green-500' : 'text-red-400'}`}>
            {leader.userCorrect ? 'Correct' : 'Missed'}
          </span>
        </div>
        {leader.userCorrect ? (
          <div
            onClick={() => onPlayerClick?.(correctPlayer)}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12">
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
              <p className="text-sm font-medium" style={{ color: textColor }}>{correctPlayer.name}</p>
              {leader.statValue ? <p className="text-xs" style={{ color: `${textColor}aa` }}>{leader.statValue}</p> : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              onClick={() => guessedPlayer && onPlayerClick?.(guessedPlayer)}
              className={`flex items-center gap-3 ${guessedPlayer ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            >
              <div className="w-12 h-12">
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
                  <div className="flex h-full w-full items-center justify-center text-xs" style={{ color: `${textColor}aa` }}>—</div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: `${textColor}aa` }}>Your guess</p>
                <p className="text-sm font-medium" style={{ color: textColor }}>{guessedPlayer ? guessedPlayer.name : 'No selection'}</p>
              </div>
            </div>
            <div
              onClick={() => onPlayerClick?.(correctPlayer)}
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12">
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
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: `${textColor}aa` }}>Correct</p>
                <p className="text-sm font-medium" style={{ color: textColor }}>{correctPlayer.name}</p>
                {leader.statValue ? <p className="text-xs" style={{ color: `${textColor}aa` }}>{leader.statValue}</p> : null}
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
        className={`border rounded-xl p-6 shadow-sm transition-all duration-300 ${
          cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{
          borderColor: `${secondaryColor}60`,
          backgroundColor: `${secondaryColor}15`,
        }}
      >
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-sm font-medium mb-2" style={{ color: secondaryColor }}>Final Score</h3>
            <div className="text-6xl font-bold tabular-nums" style={{ color: secondaryColor }}>{animatedScore}</div>
            {data.timeElapsed && (
              <p className="text-xs mt-2" style={{ color: `${secondaryColor}aa` }}>Time: {formatTime(data.timeElapsed)}</p>
            )}
          </div>
          <div
            className="rounded-lg p-4 min-w-[220px]"
            style={{
              backgroundColor: `${secondaryColor}25`,
              border: `1px solid ${secondaryColor}50`,
            }}
          >
            <h4 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: `${secondaryColor}dd` }}>Breakdown</h4>
            <div className="space-y-2 text-sm" style={{ color: getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000' }}>
              <div className="flex justify-between">
                <span>Round 1</span>
                <span className="font-semibold tabular-nums" style={{ color: secondaryColor }}>+{guessRoundPoints}</span>
              </div>
              <div className="flex justify-between">
                <span>Round 2</span>
                <span className="font-semibold tabular-nums" style={{ color: secondaryColor }}>+{hintRoundPoints}</span>
              </div>
              <div className="flex justify-between">
                <span>Leaders</span>
                <span className="font-semibold tabular-nums" style={{ color: secondaryColor }}>+{categoryTotals['Leaders'] || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Wins Guess</span>
                <span className="font-semibold tabular-nums" style={{ color: secondaryColor }}>+{winsGuessPoints}</span>
              </div>
              <div className="flex justify-between">
                <span>Playoff</span>
                <span className="font-semibold tabular-nums" style={{ color: secondaryColor }}>+{playoffPoints}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div
          className={`border rounded-xl p-6 shadow-sm transition-opacity duration-300 ${cardsVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundColor: `${secondaryColor}15`,
            borderColor: `${secondaryColor}60`,
          }}
        >
          <div className="flex items-start mb-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" style={{ color: secondaryColor }} aria-hidden="true" />
              <h3 className="font-semibold" style={{ color: getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000' }}>Round 1 — Player Guesses</h3>
            </div>
          </div>
          <p className="text-xs mb-4" style={{ color: `${getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000'}aa` }}>15 points per correct answer.</p>
          {renderPlayerList(guessRoundPlayers, 'No correct players found in this round.', 15)}
        </div>

        <div
          className={`border rounded-xl p-6 shadow-sm transition-opacity duration-300 ${cardsVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundColor: `${secondaryColor}15`,
            borderColor: `${secondaryColor}60`,
          }}
        >
          <div className="flex items-start mb-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" style={{ color: secondaryColor }} aria-hidden="true" />
              <h3 className="font-semibold" style={{ color: getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000' }}>Round 2 — Hints Enabled</h3>
            </div>
          </div>
          <p className="text-xs mb-4" style={{ color: `${getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000'}aa` }}>10 points per correct answer.</p>
          {renderPlayerList(hintRoundPlayers, 'No correct players found with hints.', 10)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div
          className={`border rounded-xl p-6 shadow-sm transition-opacity duration-300 ${cardsVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundColor: `${secondaryColor}15`,
            borderColor: `${secondaryColor}60`,
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" style={{ color: secondaryColor }} aria-hidden="true" />
              <h3 className="font-semibold" style={{ color: getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000' }}>Stat Leaders</h3>
            </div>
            <PointsPill points={categoryTotals['Leaders'] || 0} teamColor={secondaryColor} />
          </div>
          <div className="space-y-3">
            {data.leaders.length === 0 ? (
              <p className="text-sm" style={{ color: `${getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000'}aa` }}>No leader rounds were played.</p>
            ) : (
              data.leaders.map((leader, idx) => renderLeaderEntry(leader, idx))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div
            className={`border rounded-xl p-6 shadow-sm transition-opacity duration-300 ${cardsVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{
              backgroundColor: `${secondaryColor}15`,
              borderColor: `${secondaryColor}60`,
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" style={{ color: secondaryColor }} aria-hidden="true" />
                <h3 className="font-semibold" style={{ color: getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000' }}>Wins Guess</h3>
              </div>
              <PointsPill points={winsGuessPoints} teamColor={secondaryColor} />
            </div>
            {data.winsGuess ? (
              <div className="space-y-2 text-sm" style={{ color: `${getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000'}aa` }}>
                <p><span className="font-semibold" style={{ color: getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000' }}>Guessed:</span> {data.winsGuess.L}–{data.winsGuess.R}</p>
                <p><span className="font-semibold" style={{ color: getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000' }}>Actual:</span> {data.winsGuess.A}</p>
                <p className={`text-xs font-semibold uppercase tracking-wide ${data.winsGuess.awarded ? 'text-green-500' : 'text-red-400'}`}>
                  {data.winsGuess.awarded ? 'Correct' : 'Incorrect'}
                </p>
              </div>
            ) : (
              <p className="text-sm" style={{ color: `${getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000'}aa` }}>This round was skipped.</p>
            )}
          </div>

          <div
            className={`border rounded-xl p-6 shadow-sm transition-opacity duration-300 ${cardsVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{
              backgroundColor: `${secondaryColor}15`,
              borderColor: `${secondaryColor}60`,
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5" style={{ color: secondaryColor }} aria-hidden="true" />
                <h3 className="font-semibold" style={{ color: getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000' }}>Playoff Finish</h3>
              </div>
              <PointsPill points={playoffPoints} teamColor={secondaryColor} />
            </div>
            {data.playoffFinish ? (
              <div className="space-y-2 text-sm" style={{ color: `${getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000'}aa` }}>
                {data.playoffFinish.correct ? (
                  <p><span className="font-semibold" style={{ color: getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000' }}>Outcome:</span> {data.playoffFinish.correctOutcome}</p>
                ) : (
                  <>
                    <p><span className="font-semibold" style={{ color: getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000' }}>Your guess:</span> {data.playoffFinish.userGuess}</p>
                    <p><span className="font-semibold" style={{ color: getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000' }}>Actual:</span> {data.playoffFinish.correctOutcome}</p>
                  </>
                )}
                {data.playoffFinish.seriesScore && (
                  <p className="text-xs" style={{ color: `${getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000'}aa` }}>Series: {data.playoffFinish.seriesScore}</p>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: `${getContrastColor(primaryColor) === 'white' ? '#ffffff' : '#000000'}aa` }}>No playoff question this session.</p>
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
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <style>{`
        [data-state="open"] .rainbow-border {
          background: ${secondaryColor} !important;
          padding: 2px !important;
        }
        /* Force primary color background on all modal inner elements */
        [data-state="open"] .rainbow-border > div {
          background: ${primaryColor} !important;
        }
        /* Hide default close button */
        [data-radix-dialog-content] button[data-radix-dialog-close] {
          display: none !important;
        }
        /* Force modal overlay and content above footer */
        [data-radix-dialog-overlay] {
          z-index: 50000 !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          background-color: rgba(0, 0, 0, 0.6) !important;
          position: fixed !important;
          inset: 0 !important;
        }
        [data-radix-dialog-content] {
          z-index: 50001 !important;
        }
      `}</style>
      <DialogContent
        className="max-w-5xl max-h-[calc(100vh-8rem)] w-[calc(100vw-2rem)] p-0 !z-[50001]"
        aria-describedby="score-summary-description"
        style={{
          backgroundColor: primaryColor,
        }}
      >
        {/* Custom Close Button - Fixed */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-[10001] rounded-lg p-2.5 transition-all duration-200 hover:scale-110 hover:rotate-90 shadow-lg bg-background ml-[43px] mr-[43px]"
          style={{
            backgroundColor: `${secondaryColor}40`,
            color: secondaryColor,
            border: `2px solid ${secondaryColor}`,
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${secondaryColor}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = `${secondaryColor}40`;
          }}
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Scrollable content area */}
        <div
          className="overflow-y-auto overflow-x-hidden"
          style={{
            maxHeight: 'calc(100vh - 8rem)',
            minHeight: 'calc(100vh - 8rem)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Fixed buttons at top */}
          <div className="px-6 pt-6 flex flex-wrap items-center justify-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('detailed')}
              className="px-4 transition-all duration-150"
              style={viewMode === 'detailed' ? {
                backgroundColor: primaryColor,
                color: secondaryColor,
                borderColor: secondaryColor,
                border: `2px solid ${secondaryColor}`,
                transform: 'translateY(2px)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
              } : {
                backgroundColor: primaryColor,
                color: secondaryColor,
                borderColor: secondaryColor,
                border: `2px solid ${secondaryColor}`,
                transform: 'translateY(0)',
                boxShadow: `0 4px 0 ${secondaryColor}`,
              }}
            >
              Detailed Breakdown
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('spoilerFree')}
              className="px-4 transition-all duration-150"
              style={viewMode === 'spoilerFree' ? {
                backgroundColor: primaryColor,
                color: secondaryColor,
                borderColor: secondaryColor,
                border: `2px solid ${secondaryColor}`,
                transform: 'translateY(2px)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
              } : {
                backgroundColor: primaryColor,
                color: secondaryColor,
                borderColor: secondaryColor,
                border: `2px solid ${secondaryColor}`,
                transform: 'translateY(0)',
                boxShadow: `0 4px 0 ${secondaryColor}`,
              }}
            >
              Spoiler-Free Card
            </Button>
          </div>

          {/* Centered content area */}
          <div className="px-6 pb-6 flex-1 flex flex-col justify-center space-y-6">
            {/* Season and Team Logo - Only show in detailed view */}
            {viewMode === 'detailed' && (
              <div className="flex items-center justify-center gap-4 mt-8 pl-8 sm:pl-0">
                {data.teamLogo && (
                  <img
                    src={data.teamLogo}
                    alt={data.teamName}
                    className="h-12 w-12 object-contain mt-[8px] mb-[8px]"
                  />
                )}
                <h2
                  className="text-2xl font-bold"
                  style={{
                    color: secondaryColor
                  }}
                >
                  {data.season} {data.teamName}
                </h2>
              </div>
            )}

            {viewMode === 'detailed' ? detailedContent : spoilerContent}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
