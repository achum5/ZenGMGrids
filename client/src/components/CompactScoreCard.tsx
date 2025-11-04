import { useMemo, useRef, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Home, Shuffle, X, Camera, Loader2, Check, AlertCircle } from 'lucide-react';
import type { ScoreSummaryData } from '@/components/ScoreSummaryModal';
import { captureElementAsBlob } from '@/lib/screenshot-utils';
import { uploadToImgur, copyToClipboard } from '@/lib/imgur-upload';

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [screenshotStatus, setScreenshotStatus] = useState<'idle' | 'capturing' | 'uploading' | 'success' | 'error'>('idle');
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

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
      .join(' · ');
  }, [data.leaders, leaderTokens]);

  const winsPoints = data.winsGuess ? (data.winsGuess.awarded ? 10 : 0) : 0;
  const playoffPoints = data.playoffFinish?.pointsAwarded ?? 0;

  // Darken background on mobile for better contrast
  const cardBackground = `linear-gradient(180deg, ${primaryColor}f0 0%, ${primaryColor}e8 100%)`;

  const handleScreenshot = async () => {
    if (!cardRef.current || screenshotStatus === 'capturing' || screenshotStatus === 'uploading') {
      return;
    }

    try {
      setScreenshotStatus('capturing');
      setErrorMessage('');
      setScreenshotUrl('');

      // Wait a tiny bit to ensure the UI updates (button state changes)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the screenshot
      const blob = await captureElementAsBlob(cardRef.current, {
        pixelRatio: 2,
        quality: 0.95,
      });

      setScreenshotStatus('uploading');

      // Upload to Imgur
      const result = await uploadToImgur(
        blob,
        `${data.season} ${data.teamName} - Score: ${data.finalScore}`,
        `Team Trivia score card for ${data.season} ${data.teamName}`
      );

      if (result.success && result.data) {
        setScreenshotUrl(result.data.link);
        setScreenshotStatus('success');

        // Copy to clipboard
        const copied = await copyToClipboard(result.data.link);
        if (!copied) {
          console.warn('Failed to copy link to clipboard');
        }

        // Reset to idle after 5 seconds
        setTimeout(() => {
          setScreenshotStatus('idle');
        }, 5000);
      } else {
        setErrorMessage(result.error || 'Failed to upload screenshot');
        setScreenshotStatus('error');

        // Reset to idle after 5 seconds
        setTimeout(() => {
          setScreenshotStatus('idle');
        }, 5000);
      }
    } catch (error) {
      console.error('Screenshot error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to capture screenshot');
      setScreenshotStatus('error');

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setScreenshotStatus('idle');
      }, 5000);
    }
  };

  const card = (
    <div
      ref={cardRef}
      className="relative w-full max-w-[560px] rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden"
      style={{
        background: cardBackground,
        border: `2px solid ${secondaryColor}`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {variant === 'standalone' && onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 rounded-full p-2 transition-all hover:scale-110 hover:rotate-90"
          style={{
            backgroundColor: `${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
            color: textColor === 'white' ? '#ffffff' : '#000000',
          }}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {/* Watermark - reduced opacity on mobile */}
      {data.teamLogo && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] sm:opacity-[0.06] pointer-events-none">
          <img src={data.teamLogo} alt="" className="w-[80%] h-[80%] object-contain" />
        </div>
      )}

      {/* Screenshot button - only show in embedded variant and when not in capturing/uploading state */}
      {variant === 'embedded' && (
        <button
          onClick={handleScreenshot}
          disabled={screenshotStatus === 'capturing' || screenshotStatus === 'uploading'}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 rounded-full p-2 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: `${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
            color: textColor === 'white' ? '#ffffff' : '#000000',
            display: screenshotStatus === 'capturing' || screenshotStatus === 'uploading' ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Screenshot and upload to Imgur"
          title="Screenshot and upload to Imgur"
        >
          {screenshotStatus === 'idle' && <Camera className="h-5 w-5" />}
          {screenshotStatus === 'capturing' && <Loader2 className="h-5 w-5 animate-spin" />}
          {screenshotStatus === 'uploading' && <Loader2 className="h-5 w-5 animate-spin" />}
          {screenshotStatus === 'success' && <Check className="h-5 w-5 text-green-500" />}
          {screenshotStatus === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
        </button>
      )}

      {/* Status message overlay */}
      {variant === 'embedded' && screenshotStatus !== 'idle' && (
        <div
          className="absolute bottom-3 left-3 right-3 z-20 rounded-lg p-3 text-sm font-medium text-center transition-all"
          style={{
            backgroundColor: `${textColor === 'white' ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}`,
            color: textColor === 'white' ? '#000000' : '#ffffff',
          }}
        >
          {screenshotStatus === 'capturing' && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Capturing screenshot...</span>
            </div>
          )}
          {screenshotStatus === 'uploading' && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading to Imgur...</span>
            </div>
          )}
          {screenshotStatus === 'success' && (
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Check className="h-4 w-4 text-green-500" />
                <span>Link copied to clipboard!</span>
              </div>
              {screenshotUrl && (
                <a
                  href={screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline hover:no-underline break-all"
                  style={{ color: secondaryColor }}
                >
                  {screenshotUrl}
                </a>
              )}
            </div>
          )}
          {screenshotStatus === 'error' && (
            <div className="flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span>{errorMessage || 'Failed to upload screenshot'}</span>
            </div>
          )}
        </div>
      )}

      <div className="relative z-10 p-3 sm:p-6 space-y-2 sm:space-y-3">
        {/* Header - single instance, centered */}
        <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
          {data.teamLogo && (
            <img
              src={data.teamLogo}
              alt={data.teamName}
              className="h-7 w-7 sm:h-8 sm:w-8 object-contain flex-shrink-0"
            />
          )}
          <h2
            className="text-lg sm:text-xl font-bold tracking-tight leading-tight"
            style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
          >
            {data.season} {data.teamName}
          </h2>
        </div>

        {/* Score Rows */}
        <div className="space-y-0">
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

          <ScoreRow
            label="WINS"
            detail={data.winsGuess ? (data.winsGuess.awarded ? 'Correct' : 'Incorrect') : 'Not attempted'}
            points={winsPoints}
            textColor={textColor}
            secondaryColor={secondaryColor}
            icon="🎯"
          />

          <ScoreRow
            label="PLAYOFF"
            detail={data.playoffFinish ? (data.playoffFinish.correct ? 'Correct' : 'Incorrect') : 'Not attempted'}
            points={playoffPoints}
            textColor={textColor}
            secondaryColor={secondaryColor}
            icon="🏆"
          />
        </div>

        {/* Total Section */}
        <div
          className="flex flex-col items-center gap-1 py-3 px-3 rounded-lg mt-3 sm:mt-4"
          style={{ borderTop: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}` }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-lg sm:text-xl font-bold uppercase tracking-wide"
              style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
            >
              TOTAL {data.finalScore}
            </span>
            {data.timeElapsed && (
              <span
                className="text-xs px-2 py-1 rounded"
                style={{
                  backgroundColor: `${textColor === 'white' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
                  color: textColor === 'white' ? '#ffffff' : '#000000',
                }}
              >
                {formatTime(data.timeElapsed)}
              </span>
            )}
          </div>
          {/* Math breakdown - tiny on mobile */}
          <span
            className="text-[10px] sm:text-xs font-mono opacity-60 hidden sm:block"
            style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
          >
            {data.categories.map(c => c.points).join(' + ')} = {data.finalScore}
          </span>
        </div>
      </div>

      {variant === 'standalone' && (
        <div className="flex gap-3 p-3 sm:p-4">
          <Button onClick={onPlayAgain} size="lg" className="gap-2 flex-1">
            <Shuffle className="h-4 w-4" />
            <span className="hidden sm:inline">Play Again</span>
            <span className="sm:hidden">Again</span>
          </Button>
          <Button onClick={onNewSeason} variant="outline" size="lg" className="gap-2 flex-1">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">New Season</span>
            <span className="sm:hidden">New</span>
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
      className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 backdrop-blur-sm bg-black/20"
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
      className="flex items-start min-h-[44px] py-2 px-2 sm:px-3 border-b"
      style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}
    >
      {/* Left section: Icon + Label + Detail (grows) */}
      <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
        <span
          className="text-base sm:text-lg flex-shrink-0 leading-none mt-0.5"
          style={iconStyle}
        >
          {icon}
        </span>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span
            className="text-sm sm:text-sm font-bold uppercase tracking-wide leading-tight"
            style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
          >
            {label}
          </span>
          {renderDetailAsNode ? (
            detail
          ) : (
            <span
              className={`text-xs sm:text-sm leading-tight break-words ${monoDetail ? 'font-mono' : ''}`}
              style={{
                color: textColor === 'white' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)',
              }}
            >
              {detail}
            </span>
          )}
        </div>
      </div>

      {/* Right section: Points pill (fixed width) */}
      <span
        className="text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-1 rounded-full flex-shrink-0 min-w-[56px] sm:min-w-[64px] text-center"
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
