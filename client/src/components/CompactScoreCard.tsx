import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Home, Shuffle, X } from 'lucide-react';
import type { ScoreSummaryData } from '@/components/ScoreSummaryModal';

interface CompactScoreCardProps {
  data: ScoreSummaryData;
  teamColors?: string[]; // [primary, secondary]
  onPlayAgain: () => void;
  onNewSeason: () => void;
  onClose?: () => void;
}

// Helper to get sport-specific leader tokens
function getLeaderTokens(sport: string): { [key: string]: string } {
  switch (sport) {
    case 'basketball':
      return {
        'Points': 'PTS',
        'Rebounds': 'REB',
        'Assists': 'AST',
        'Steals': 'STL',
        'Blocks': 'BLK',
      };
    case 'football':
      return {
        'Passing Yards': 'PASS',
        'Rushing Yards': 'RUSH',
        'Receiving Yards': 'REC',
        'Tackles': 'TACK',
        'Sacks': 'SACK',
        'Interceptions': 'INT',
      };
    case 'baseball':
      return {
        'Hits': 'H',
        'Home Runs': 'HR',
        'RBIs': 'RBI',
        'Stolen Bases': 'SB',
        'Strikeouts': 'K',
        'Wins': 'W',
      };
    case 'hockey':
      return {
        'Points': 'PTS',
        'Goals': 'G',
        'Assists': 'A',
        'Goalie Wins': 'WINS',
      };
    default:
      return {};
  }
}

// Helper to get playoff outcome token
function getPlayoffToken(outcome: string): string {
  const lower = outcome.toLowerCase();
  if (lower.includes('champion') || lower.includes('won championship')) {
    return 'CHAMP';
  }
  if (lower.includes('lost finals')) {
    return 'L-FIN';
  }
  if (lower.includes('lost conference finals') || lower.includes('lost round 3')) {
    return 'L-R3';
  }
  if (lower.includes('lost second round') || lower.includes('lost round 2')) {
    return 'L-R2';
  }
  if (lower.includes('lost first round') || lower.includes('lost round 1')) {
    return 'L-R1';
  }
  if (lower.includes('missed') || lower.includes('did not qualify')) {
    return 'Missed Playoffs';
  }
  return 'N/A';
}

// Helper to check contrast and adjust text color
function getContrastColor(hexColor: string): 'white' | 'black' {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'black' : 'white';
}

// Format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function CompactScoreCard({
  data,
  teamColors = ['#1d4ed8', '#3b82f6'], // Default blue if not provided
  onPlayAgain,
  onNewSeason,
  onClose,
}: CompactScoreCardProps) {
  // Ensure we have valid colors with fallbacks
  const [primaryColor, secondaryColor] = useMemo(() => {
    if (!teamColors || teamColors.length === 0) {
      return ['#1d4ed8', '#3b82f6'];
    }
    if (teamColors.length === 1) {
      return [teamColors[0], teamColors[0]];
    }
    return [teamColors[0], teamColors[1]];
  }, [teamColors]);

  const textColor = useMemo(() => getContrastColor(primaryColor), [primaryColor]);
  const leaderTokens = useMemo(() => getLeaderTokens(data.sport), [data.sport]);

  // Aggregate category totals
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    data.categories.forEach(cat => {
      totals[cat.name] = (totals[cat.name] || 0) + cat.points;
    });
    return totals;
  }, [data.categories]);

  const recordedGuessPoints = categoryTotals['Player Guesses'] ?? 0;
  const recordedHintPoints = categoryTotals['Player Guesses (with hints)'] ?? 0;
  const guessRoundCount = recordedGuessPoints > 0
    ? Math.round(recordedGuessPoints / 15)
    : data.playerGuesses.filter(pg => pg.correct && (pg.round ?? 'guess') === 'guess').length;
  const hintRoundCount = recordedHintPoints > 0
    ? Math.round(recordedHintPoints / 10)
    : data.playerGuesses.filter(pg => pg.correct && (pg.round ?? 'hint') === 'hint').length;
  const guessRoundPoints = recordedGuessPoints || guessRoundCount * 15;
  const hintRoundPoints = recordedHintPoints || hintRoundCount * 10;

  // Build leaders line
  const leadersLine = useMemo(() => {
    if (data.leaders.length === 0) return null;

    const tokens = data.leaders.map(leader => {
      // Match leader label to token
      let token = 'STAT';
      for (const [key, value] of Object.entries(leaderTokens)) {
        if (leader.label.includes(key)) {
          token = value;
          break;
        }
      }
      const mark = leader.userCorrect ? '✓' : '✗';
      return `${token}${mark}`;
    }).join(' ');

    return tokens;
  }, [data.leaders, leaderTokens]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 backdrop-blur-sm bg-black/20"
      onClick={onClose}
    >
      {/* Compact Card */}
      <div
        className="relative w-full max-w-[560px] rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${primaryColor}f5 0%, ${primaryColor}ed 100%)`,
          border: `2px solid ${secondaryColor}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 rounded-full p-2 transition-all hover:scale-110 hover:rotate-90"
            style={{
              backgroundColor: `${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
              color: textColor === 'white' ? '#ffffff' : '#000000',
            }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {/* Team Logo Watermark - Large centered background */}
        {data.teamLogo && (
          <div
            className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none"
          >
            <img
              src={data.teamLogo}
              alt=""
              className="w-[80%] h-[80%] object-contain"
            />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 p-6 space-y-3">
          {/* Header Row */}
          <div className="mb-4">
            <h2
              className="text-xl font-bold tracking-tight"
              style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
            >
              {data.season} {data.teamName}
            </h2>
          </div>

          {/* Lines - Ordered by gameplay sequence */}
          <div className="space-y-2">
            {/* First Round Player Guesses - Green player icon - Always show (Round 1 is always played) */}
            <div
              className="flex items-center justify-between py-2 px-3 rounded-lg border-b"
              style={{
                borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg" style={{ filter: 'grayscale(100%) brightness(0.6) sepia(100%) hue-rotate(70deg) saturate(500%)' }}>👤</span>
                <span
                  className="text-sm font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  ROUND 1
                </span>
                <span
                  className="text-sm"
                  style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                >
                  • {guessRoundCount}×15 = {guessRoundPoints}
                </span>
              </div>
              <span
                className="text-sm font-semibold px-3 py-1 rounded-full"
                style={{
                  backgroundColor: secondaryColor,
                  color: getContrastColor(secondaryColor) === 'white' ? '#ffffff' : '#000000',
                }}
              >
                +{guessRoundPoints}
              </span>
            </div>

            {/* Second Round Player Guesses with Hints - Yellow player icon - Always show (Round 2 is always played) */}
            <div
              className="flex items-center justify-between py-2 px-3 rounded-lg border-b"
              style={{
                borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg" style={{ filter: 'grayscale(100%) brightness(1.2) sepia(100%) hue-rotate(10deg) saturate(600%)' }}>👤</span>
                <span
                  className="text-sm font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  ROUND 2
                </span>
                <span
                  className="text-sm"
                  style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                >
                  • {hintRoundCount}×10 = {hintRoundPoints}
                </span>
              </div>
              <span
                className="text-sm font-semibold px-3 py-1 rounded-full"
                style={{
                  backgroundColor: secondaryColor,
                  color: getContrastColor(secondaryColor) === 'white' ? '#ffffff' : '#000000',
                }}
              >
                +{hintRoundPoints}
              </span>
            </div>

            {/* Leaders Line - Always show (leaders phase is always played) */}
            <div
              className="flex items-center justify-between py-2 px-3 rounded-lg border-b"
              style={{
                borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📊</span>
                <span
                  className="text-sm font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  LEADERS
                </span>
                <span
                  className="text-sm font-mono"
                  style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                >
                  • {leadersLine || 'N/A'}
                </span>
              </div>
              <span
                className="text-sm font-semibold px-3 py-1 rounded-full"
                style={{
                  backgroundColor: secondaryColor,
                  color: getContrastColor(secondaryColor) === 'white' ? '#ffffff' : '#000000',
                }}
              >
                +{categoryTotals['Leaders'] || 0}
              </span>
            </div>

            {/* Wins Guess Line - Third phase */}
            {data.winsGuess && (
              <div
                className="flex items-center justify-between py-2 px-3 rounded-lg border-b"
                style={{
                  borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎯</span>
                  <span
                    className="text-sm font-bold uppercase tracking-wide"
                    style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                  >
                    WINS
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                  >
                    • {data.winsGuess.L}–{data.winsGuess.R} ({data.winsGuess.A}) {data.winsGuess.awarded ? '✓' : '✗'}
                  </span>
                </div>
                <span
                  className="text-sm font-semibold px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: secondaryColor,
                    color: getContrastColor(secondaryColor) === 'white' ? '#ffffff' : '#000000',
                  }}
                >
                  +{data.winsGuess.awarded ? 10 : 0}
                </span>
              </div>
            )}

            {/* Playoff Finish Line - Fourth/final phase */}
            {data.playoffFinish && (
              <div
                className="flex items-center justify-between py-2 px-3 rounded-lg border-b"
                style={{
                  borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🏆</span>
                  <span
                    className="text-sm font-bold uppercase tracking-wide"
                    style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                  >
                    PLAYOFF
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                  >
                    • {getPlayoffToken(data.playoffFinish.correctOutcome)}
                  </span>
                </div>
                <span
                  className="text-sm font-semibold px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: secondaryColor,
                    color: getContrastColor(secondaryColor) === 'white' ? '#ffffff' : '#000000',
                  }}
                >
                  +{data.playoffFinish.pointsAwarded}
                </span>
              </div>
            )}

            {/* Total Row */}
            <div
              className="flex items-center justify-center py-3 px-3 rounded-lg mt-4"
              style={{
                borderTop: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}`,
              }}
            >
              <span
                className="text-xl font-bold uppercase tracking-wide"
                style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
              >
                TOTAL {data.finalScore}
              </span>
              {data.timeElapsed && (
                <span
                  className="text-xs px-2 py-1 rounded ml-4"
                  style={{
                    backgroundColor: `${textColor === 'white' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
                    color: textColor === 'white' ? '#ffffff' : '#000000',
                  }}
                >
                  TIME {formatTime(data.timeElapsed)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <Button onClick={onPlayAgain} size="lg" className="gap-2">
          <Shuffle className="h-4 w-4" />
          Play Again
        </Button>
        <Button onClick={onNewSeason} variant="outline" size="lg" className="gap-2">
          <Home className="h-4 w-4" />
          New Season
        </Button>
      </div>
    </div>
  );
}
