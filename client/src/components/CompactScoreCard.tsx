import { useMemo } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Home, Shuffle, X } from 'lucide-react';
import type { ScoreSummaryData } from '@/components/ScoreSummaryModal';

interface CompactScoreCardProps {
  data: ScoreSummaryData;
  teamColors?: string[];
  onPlayAgain: () => void;
  onNewSeason: () => void;
  onClose?: () => void;
  variant?: 'standalone' | 'embedded';
}

function getLeaderTokens(sport: string): Record<string, string> {
  switch (sport) {
    case 'basketball':
      return { Points: 'PTS', Rebounds: 'REB', Assists: 'AST', Steals: 'STL', Blocks: 'BLK' };
    case 'football':
      return { 'Passing Yards': 'PASS', 'Rushing Yards': 'RUSH', 'Receiving Yards': 'REC', Tackles: 'TACK', Sacks: 'SACK', Interceptions: 'INT' };
    case 'baseball':
      return { Hits: 'H', 'Home Runs': 'HR', RBIs: 'RBI', 'Stolen Bases': 'SB', Strikeouts: 'K', Wins: 'W' };
    case 'hockey':
      return { Points: 'PTS', Goals: 'G', Assists: 'A', 'Goalie Wins': 'WINS' };
    default:
      return {};
  }
}

function getContrastColor(hexColor: string): 'white' | 'black' {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'black' : 'white';
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function CompactScoreCard({
  data,
  teamColors,
  onPlayAgain,
  onNewSeason,
  onClose,
  variant = 'standalone',
}: CompactScoreCardProps) {
  const palette = useMemo(() => {
    if (teamColors && teamColors.length > 0) {
      return teamColors;
    }
    if (data.teamColors && data.teamColors.length > 0) {
      return data.teamColors;
    }
    return ['#1d4ed8', '#3b82f6'];
  }, [teamColors, data.teamColors]);

  const [primaryColor, secondaryColor] = useMemo(() => {
    if (palette.length === 1) {
      return [palette[0], palette[0]];
    }
    return [palette[0], palette[1]];
  }, [palette]);

  const textColor = useMemo(() => getContrastColor(primaryColor), [primaryColor]);
  const leaderTokens = useMemo(() => getLeaderTokens(data.sport), [data.sport]);

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

  const leadersLine = useMemo(() => {
    if (data.leaders.length === 0) return 'N/A';
    return data.leaders
      .map(leader => {
        let token: string | undefined;

        // First, try to match against the sport-specific token mappings using the label
        for (const [key, value] of Object.entries(leaderTokens)) {
          if (leader.label.toLowerCase().includes(key.toLowerCase())) {
            token = value;
            break;
          }
        }

        // If no match, try using statLabel if it's already an abbreviation (all caps)
        if (!token && leader.statLabel) {
          const trimmed = leader.statLabel.trim();
          // Check if it's already an abbreviation (e.g., "PPG", "APG", "PTS")
          if (/^[A-Z0-9%]+$/.test(trimmed) && trimmed.length <= 5) {
            token = trimmed;
          }
        }

        // If still no token, try to create abbreviation from label
        if (!token) {
          // Remove "Leader" from label and try to create abbreviation
          const labelWords = leader.label.replace(/Leader/i, '').trim().split(/\s+/);
          if (labelWords.length > 0) {
            const firstWord = labelWords[0].toLowerCase();
            // Common stat name mappings
            const commonMappings: Record<string, string> = {
              'points': 'PTS',
              'rebounds': 'REB',
              'assists': 'AST',
              'steals': 'STL',
              'blocks': 'BLK',
              'goals': 'G',
              'passing': 'PASS',
              'rushing': 'RUSH',
              'receiving': 'REC',
              'tackles': 'TACK',
              'sacks': 'SACK',
              'interceptions': 'INT',
              'hits': 'H',
              'home': 'HR',
              'runs': 'R',
              'rbis': 'RBI',
              'stolen': 'SB',
              'strikeouts': 'K',
              'wins': 'W',
            };
            token = commonMappings[firstWord] || labelWords[0].substring(0, 3).toUpperCase();
          }
        }

        // Final fallback
        token = token || 'STAT';

        return `${token}${leader.userCorrect ? '✓' : '✗'}`;
      })
      .join(' | ');
  }, [data.leaders, leaderTokens]);

  const winsPoints = data.winsGuess ? (data.winsGuess.awarded ? 10 : 0) : 0;
  const playoffPoints = data.playoffFinish?.pointsAwarded ?? 0;

  const card = (
    <div
      className="relative w-full max-w-[560px] rounded-2xl shadow-2xl overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${primaryColor}f5 0%, ${primaryColor}ed 100%)`,
        border: `2px solid ${secondaryColor}`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {variant === 'standalone' && onClose && (
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

      {data.teamLogo && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
          <img src={data.teamLogo} alt="" className="w-[80%] h-[80%] object-contain" />
        </div>
      )}

      <div className="relative z-10 p-6 space-y-3">
        <div className="mb-4">
          <h2
            className="text-xl font-bold tracking-tight"
            style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
          >
            {data.season} {data.teamName}
          </h2>
        </div>

        <div className="space-y-2">
          <ScoreRow
            label="ROUND 1"
            detail={`${guessRoundCount}×15 = ${guessRoundPoints}`}
            points={guessRoundPoints}
            textColor={textColor}
            secondaryColor={secondaryColor}
            icon="👤"
          />

          <ScoreRow
            label="ROUND 2"
            detail={`${hintRoundCount}×10 = ${hintRoundPoints}`}
            points={hintRoundPoints}
            textColor={textColor}
            secondaryColor={secondaryColor}
            icon="👤"
            iconStyle={{ filter: 'grayscale(100%) brightness(1.2) sepia(100%) hue-rotate(10deg) saturate(600%)' }}
          />

          <ScoreRow
            label="LEADERS"
            detail={leadersLine}
            points={categoryTotals['Leaders'] || 0}
            textColor={textColor}
            secondaryColor={secondaryColor}
            icon="📊"
            monoDetail
          />

          {data.winsGuess && (
            <ScoreRow
              label="WINS"
              detail={data.winsGuess.awarded ? '✓' : '✗'}
              points={winsPoints}
              textColor={textColor}
              secondaryColor={secondaryColor}
              icon="🎯"
            />
          )}

          {data.playoffFinish && (
            <ScoreRow
              label="PLAYOFF"
              detail={data.playoffFinish.correct ? 'Correct' : 'Incorrect'}
              points={playoffPoints}
              textColor={textColor}
              secondaryColor={secondaryColor}
              icon="🏆"
            />
          )}

          <div
            className="flex items-center justify-center py-3 px-3 rounded-lg mt-4"
            style={{ borderTop: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}` }}
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
                {formatTime(data.timeElapsed)}
              </span>
            )}
          </div>
        </div>
      </div>

      {variant === 'standalone' && (
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
      )}
    </div>
  );

  if (variant === 'embedded') {
    return card;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 backdrop-blur-sm bg-black/20"
      onClick={onClose}
    >
      {card}
    </div>
  );
}

interface ScoreRowProps {
  label: string;
  detail: string | ReactNode;
  points: number;
  textColor: 'white' | 'black';
  secondaryColor: string;
  icon: string;
  monoDetail?: boolean;
  iconStyle?: CSSProperties;
  renderDetailAsNode?: boolean;
}

function ScoreRow({
  label,
  detail,
  points,
  textColor,
  secondaryColor,
  icon,
  monoDetail = false,
  iconStyle,
  renderDetailAsNode = false,
}: ScoreRowProps) {
  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-lg border-b"
      style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg" style={iconStyle}>{icon}</span>
        <span
          className="text-sm font-bold uppercase tracking-wide"
          style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
        >
          {label}
        </span>
        {renderDetailAsNode ? (
          detail
        ) : (
          <span
            className={monoDetail ? 'text-sm font-mono' : 'text-sm'}
            style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
          >
            • {detail}
          </span>
        )}
      </div>
      <span
        className="text-sm font-semibold px-3 py-1 rounded-full"
        style={{
          backgroundColor: secondaryColor,
          color: getContrastColor(secondaryColor) === 'white' ? '#ffffff' : '#000000',
        }}
      >
        +{points}
      </span>
    </div>
  );
}
