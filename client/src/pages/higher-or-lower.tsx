import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LeagueData, Player } from '@/types/bbgm';
import { Button } from '@/components/ui/button';
import { PlayerFace } from '@/components/PlayerFace';
import { useToast } from '@/lib/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import {
  getAvailableScopes,
  getScopedCategories,
  getPlayerStatValue,
  getEligiblePlayers,
  pickRandomPlayer,
  formatStatValue,
  getHighScore,
  setHighScore,
  scopeLabels,
  type StatCategory,
  type StatScope,
  type SeasonRange,
} from '@/lib/higher-or-lower-utils';

interface HigherOrLowerProps {
  leagueData: LeagueData;
  onBackToModeSelect: () => void;
  onGoHome: () => void;
}

type Phase = 'pick-category' | 'playing' | 'game-over';
type Side = 'left' | 'right';

export default function HigherOrLower({ leagueData, onBackToModeSelect, onGoHome }: HigherOrLowerProps) {
  const { toast } = useToast();
  const availableScopes = getAvailableScopes(leagueData.sport);
  const leagueMin = leagueData.leagueYears?.minSeason ?? 1950;
  const leagueMax = leagueData.leagueYears?.maxSeason ?? 2025;

  // Filter state
  const [selectedScope, setSelectedScope] = useState<StatScope>('career-totals');
  const [seasonRange, setSeasonRange] = useState<SeasonRange>({ min: leagueMin, max: leagueMax });
  const [seasonFilterEnabled, setSeasonFilterEnabled] = useState(false);

  const filteredCategories = getScopedCategories(leagueData.sport, selectedScope);
  const activeSeasonRange = seasonFilterEnabled ? seasonRange : undefined;

  const [phase, setPhase] = useState<Phase>('pick-category');
  const [category, setCategory] = useState<StatCategory | null>(null);
  const [leftPlayer, setLeftPlayer] = useState<Player | null>(null);
  const [rightPlayer, setRightPlayer] = useState<Player | null>(null);
  const [leftValue, setLeftValue] = useState(0);
  const [rightValue, setRightValue] = useState(0);
  const [knownSide, setKnownSide] = useState<Side | null>(null); // null = first round, both hidden
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScoreState] = useState(0);
  const [usedPids, setUsedPids] = useState<Set<number>>(new Set());
  const [revealing, setRevealing] = useState(false);
  const [tickerValue, setTickerValue] = useState(0);
  const [guessResult, setGuessResult] = useState<'correct' | 'wrong' | null>(null);
  const [gameOverValues, setGameOverValues] = useState<{ left: number; right: number } | null>(null);
  // Run stats
  const [closestCall, setClosestCall] = useState<{ diff: number; p1: string; v1: number; p2: string; v2: number } | null>(null);
  const [biggestGap, setBiggestGap] = useState<{ diff: number; p1: string; v1: number; p2: string; v2: number } | null>(null);
  const [highestValue, setHighestValue] = useState<{ name: string; value: number } | null>(null);
  const [roundHistory, setRoundHistory] = useState<Array<{ known: string; knownVal: number; unknown: string; unknownVal: number; correct: boolean }>>([]);
  // Slot reel: an array of players to scroll through, with the final one being the real next player
  const [reelPlayers, setReelPlayers] = useState<Player[]>([]);
  const [reelIndex, setReelIndex] = useState(0); // which card is currently showing (CSS translateY target)
  const [reelSide, setReelSide] = useState<Side | null>(null);
  const [reelAnimating, setReelAnimating] = useState(false);
  const eligibleRef = useRef<Player[]>([]);
  const slotTimerRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const gameSeasonRangeRef = useRef<SeasonRange | undefined>(undefined);

  const startGame = useCallback((cat: StatCategory) => {
    const range = seasonFilterEnabled ? seasonRange : undefined;
    gameSeasonRangeRef.current = range;
    const eligible = getEligiblePlayers(leagueData.players, cat, range);
    if (eligible.length < 2) {
      toast({ title: 'Not enough players', description: 'This category needs at least 2 eligible players.', variant: 'destructive' });
      return;
    }
    eligibleRef.current = eligible;
    const pids = new Set<number>();

    const p1 = pickRandomPlayer(eligible, pids);
    if (!p1) return;
    pids.add(p1.pid);

    const p2 = pickRandomPlayer(eligible, pids);
    if (!p2) return;
    pids.add(p2.pid);

    setCategory(cat);
    setLeftPlayer(p1);
    setRightPlayer(p2);
    setLeftValue(getPlayerStatValue(p1, cat, range));
    setRightValue(getPlayerStatValue(p2, cat, range));
    setKnownSide(null);
    setStreak(0);
    setHighScoreState(getHighScore(cat.key));
    setUsedPids(pids);
    setRevealing(false);
    setGuessResult(null);
    setGameOverValues(null);
    setClosestCall(null);
    setBiggestGap(null);
    setHighestValue(null);
    setRoundHistory([]);
    setReelPlayers([]);
    setReelIndex(0);
    setReelSide(null);
    setReelAnimating(false);
    setPhase('playing');
  }, [leagueData.players, toast, seasonFilterEnabled, seasonRange]);

  const animateTicker = useCallback((target: number, onDone: () => void) => {
    const duration = 800;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setTickerValue(Math.round(eased * target));
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setTickerValue(target);
        onDone();
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (slotTimerRef.current) clearTimeout(slotTimerRef.current);
    };
  }, []);

  // User clicks a player tile = "I think THIS player has the higher stat"
  const handlePickSide = useCallback((pickedSide: Side) => {
    if (!category || revealing || reelSide) return;
    console.log(`[HOL] Pick: ${pickedSide} | Left: ${leftPlayer?.name} (${leftValue}) | Right: ${rightPlayer?.name} (${rightValue}) | knownSide: ${knownSide}`);

    const pickedVal = pickedSide === 'left' ? leftValue : rightValue;
    const otherSide: Side = pickedSide === 'left' ? 'right' : 'left';
    const otherVal = otherSide === 'left' ? leftValue : rightValue;
    const pickedPlayer = pickedSide === 'left' ? leftPlayer : rightPlayer;
    const otherPlayer = otherSide === 'left' ? leftPlayer : rightPlayer;

    if (!pickedPlayer || !otherPlayer) return;

    // For first round (knownSide === null), both are hidden — just check who's higher
    // For subsequent rounds, the picked side is the unknown one
    const correct = category.lowerIsBetter ? pickedVal <= otherVal : pickedVal >= otherVal;

    setRevealing(true);
    setTickerValue(0);

    // Track stats
    const diff = Math.abs(pickedVal - otherVal);
    setRoundHistory(prev => [...prev, {
      known: otherPlayer.name, knownVal: otherVal,
      unknown: pickedPlayer.name, unknownVal: pickedVal,
      correct,
    }]);

    if (correct) {
      if (!closestCall || diff < closestCall.diff) {
        setClosestCall({ diff, p1: otherPlayer.name, v1: otherVal, p2: pickedPlayer.name, v2: pickedVal });
      }
      if (!biggestGap || diff > biggestGap.diff) {
        setBiggestGap({ diff, p1: otherPlayer.name, v1: otherVal, p2: pickedPlayer.name, v2: pickedVal });
      }
    }

    const maxVal = Math.max(pickedVal, otherVal);
    const maxName = pickedVal >= otherVal ? pickedPlayer.name : otherPlayer.name;
    if (!highestValue || maxVal > highestValue.value) {
      setHighestValue({ name: maxName, value: maxVal });
    }

    // Reveal both values (ticker animates the larger one for drama)
    const revealTarget = Math.max(pickedVal, otherVal);
    animateTicker(revealTarget, () => {
      if (correct) {
        setGuessResult('correct');
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > highScore) {
          setHighScoreState(newStreak);
          setHighScore(category.key, newStreak);
        }

        setTimeout(() => {
          // The picked (known) side gets replaced; the other side becomes the new known
          const loserSide = pickedSide;
          const newPids = new Set(usedPids);
          const next = pickRandomPlayer(eligibleRef.current, newPids);
          if (!next) {
            setGameOverValues({ left: leftValue, right: rightValue });
            setPhase('game-over');
            return;
          }
          newPids.add(next.pid);
          const nextVal = getPlayerStatValue(next, category, gameSeasonRangeRef.current);

          // Reel spins on the loser side
          const eligible = eligibleRef.current;
          const loserPlayer = loserSide === 'left' ? leftPlayer! : rightPlayer!;
          const decoys: Player[] = [];
          for (let i = 0; i < 8; i++) {
            decoys.push(eligible[Math.floor(Math.random() * eligible.length)]);
          }
          const reel = [loserPlayer, ...decoys, next];

          setReelPlayers(reel);
          setReelIndex(0);
          setReelSide(loserSide);
          setReelAnimating(false);

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setReelIndex(reel.length - 1);
              setReelAnimating(true);
            });
          });

          slotTimerRef.current = window.setTimeout(() => {
            if (loserSide === 'left') {
              setLeftPlayer(next);
              setLeftValue(nextVal);
            } else {
              setRightPlayer(next);
              setRightValue(nextVal);
            }
            setKnownSide(otherSide); // the previously-unknown side becomes the known one
            setUsedPids(newPids);
            setRevealing(false);
            setGuessResult(null);
            console.log(`[HOL] After swap: replacedSide=${loserSide} | New player: ${next.name} (${nextVal}) | knownSide will be: ${otherSide}`);
          }, 200);
        }, 1000);
      } else {
        setGuessResult('wrong');
        setGameOverValues({ left: leftValue, right: rightValue });
        setTimeout(() => {
          setPhase('game-over');
        }, 1500);
      }
    });
  }, [category, leftPlayer, rightPlayer, leftValue, rightValue, knownSide, revealing, reelSide, streak, highScore, usedPids, animateTicker, closestCall, biggestGap, highestValue]);

  const handleReelTransitionEnd = useCallback(() => {
    if (!reelSide || reelPlayers.length === 0) return;
    setReelPlayers([]);
    setReelIndex(0);
    setReelSide(null);
    setReelAnimating(false);
  }, [reelSide, reelPlayers]);

  // ─── Category Selection ───
  if (phase === 'pick-category') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={onBackToModeSelect} className="text-gray-400 hover:text-white mb-6">
            ← Back
          </Button>
          <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-2">Higher or Lower</h1>
          <p className="text-gray-400 text-center mb-8">Pick a stat category and guess which player has more</p>

          {/* Filters */}
          <div className="space-y-4 mb-6">
            {/* Stat Type */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400 w-20 shrink-0">Stat Type</label>
              <select
                value={selectedScope}
                onChange={e => setSelectedScope(e.target.value as StatScope)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
              >
                {availableScopes.map(scope => (
                  <option key={scope} value={scope}>{scopeLabels[scope]}</option>
                ))}
              </select>
            </div>

            {/* Season Range */}
            <div className="flex items-start gap-3">
              <label className="text-sm text-gray-400 w-20 shrink-0 pt-2">Seasons</label>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setSeasonFilterEnabled(!seasonFilterEnabled)}
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                      seasonFilterEnabled ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      seasonFilterEnabled ? 'translate-x-4' : ''
                    }`} />
                  </button>
                  <span className="text-sm text-gray-500">
                    {seasonFilterEnabled
                      ? `${seasonRange.min} – ${seasonRange.max} (${seasonRange.max - seasonRange.min + 1} seasons)`
                      : 'All seasons'}
                  </span>
                </div>
                {seasonFilterEnabled && (
                  <Slider
                    min={leagueMin}
                    max={leagueMax}
                    step={1}
                    value={[seasonRange.min, seasonRange.max]}
                    onValueChange={([min, max]) => setSeasonRange({ min, max })}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Stat list */}
          <div className="border border-gray-700/60 rounded-lg overflow-hidden divide-y divide-gray-700/40">
            {filteredCategories.map(cat => {
              const hs = getHighScore(cat.key);
              const eligible = getEligiblePlayers(leagueData.players, cat, activeSeasonRange);
              const tooFew = eligible.length < 2;
              return (
                <button
                  key={cat.key}
                  onClick={() => !tooFew && startGame(cat)}
                  disabled={tooFew}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                    tooFew
                      ? 'opacity-35 cursor-not-allowed'
                      : 'hover:bg-gray-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-white text-sm font-medium">{cat.label}</span>
                    {cat.lowerIsBetter && (
                      <span className="text-[10px] text-gray-600 border border-gray-700 rounded px-1.5 py-0.5 shrink-0">lower = better</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-gray-500 tabular-nums">{eligible.length.toLocaleString()} players</span>
                    {hs > 0 && (
                      <span className="text-xs text-amber-400/80 tabular-nums">🔥 {hs}</span>
                    )}
                    <span className="text-gray-600 text-sm">›</span>
                  </div>
                </button>
              );
            })}
          </div>
          {filteredCategories.length === 0 && (
            <div className="text-center text-gray-500 py-8 text-sm">
              No stats available for this category with your league data
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!category || !leftPlayer || !rightPlayer) return null;

  // ─── Player Card ───
  const renderPlayerCard = (player: Player, value: number, side: Side) => {
    // A side is "known" if knownSide matches it (after first round)
    const isKnown = knownSide === side;
    const isHidden = !isKnown; // hidden if it's the unknown side OR if first round (knownSide === null)
    const isGlowing = guessResult && revealing;
    const borderClass = isGlowing
      ? guessResult === 'correct'
        ? 'ring-4 ring-green-500/60 shadow-[0_0_40px_rgba(34,197,94,0.3)]'
        : 'ring-4 ring-red-500/60 shadow-[0_0_40px_rgba(239,68,68,0.3)]'
      : '';

    const canClick = !revealing && !reelSide;
    const formatted = formatStatValue(value, category);

    // Determine what to show for the stat value
    let statDisplay: React.ReactNode;
    if (revealing) {
      // During reveal, show the ticker-scaled value for hidden sides
      // For the known side, just show its value. For hidden sides, animate.
      const showTicker = isHidden;
      // Scale ticker proportionally: tickerValue / revealTarget * thisValue
      const revealTarget = Math.max(leftValue, rightValue);
      const scaledVal = revealTarget > 0 ? Math.round((tickerValue / revealTarget) * value) : 0;
      const displayVal = showTicker ? scaledVal : value;
      const colorClass = guessResult === 'correct' ? 'text-green-400' : guessResult === 'wrong' ? 'text-red-400' : 'text-white';
      statDisplay = (
        <div className={`text-2xl sm:text-4xl font-black tabular-nums transition-colors duration-300 ${colorClass}`}>
          {category.statField === '_draftPick'
            ? (displayVal >= 9999 ? 'Undrafted' : `#${displayVal}`)
            : displayVal.toLocaleString()}
        </div>
      );
    } else if (isHidden) {
      statDisplay = <div className="text-3xl sm:text-5xl font-black text-gray-500">?</div>;
    } else {
      statDisplay = <div className="text-2xl sm:text-4xl font-black text-white tabular-nums">{formatted}</div>;
    }

    return (
      <div
        className={`bg-gray-800/90 rounded-xl border border-gray-700 flex flex-col items-center justify-center h-full transition-all duration-500 overflow-hidden ${borderClass} ${
          canClick ? 'cursor-pointer hover:bg-gray-700/90 hover:border-blue-500/40 active:scale-[0.98]' : ''
        }`}
        onClick={canClick ? () => handlePickSide(side) : undefined}
      >
        {/* Face */}
        <div className="flex-1 flex items-center justify-center w-full min-h-0 pt-3 sm:pt-4">
          <PlayerFace
            pid={player.pid}
            name={player.name}
            imgURL={player.imgURL}
            face={player.face}
            size={typeof window !== 'undefined' && window.innerWidth < 640 ? 90 : 140}
            hideName
            player={player}
            teams={leagueData.teams}
            sport={leagueData.sport}
          />
        </div>
        {/* Name + Stat */}
        <div className="w-full text-center px-3 pb-3 sm:pb-4 shrink-0">
          <div className="text-white font-bold text-sm sm:text-lg truncate mb-1">
            {player.name}
          </div>
          {statDisplay}
          <div className="text-gray-500 text-[10px] sm:text-xs mt-1">{category.label}</div>
        </div>
      </div>
    );
  };

  // ─── Reel Card (no rounded corners, solid bg, no gaps) ───
  const renderReelCard = (player: Player) => (
    <div className="bg-gray-800 flex flex-col items-center justify-center h-full overflow-hidden">
      <div className="flex-1 flex items-center justify-center w-full min-h-0 pt-3 sm:pt-4">
        <PlayerFace
          pid={player.pid}
          name={player.name}
          imgURL={player.imgURL}
          face={player.face}
          size={typeof window !== 'undefined' && window.innerWidth < 640 ? 90 : 140}
          hideName
          player={player}
          teams={leagueData.teams}
          sport={leagueData.sport}
        />
      </div>
      <div className="w-full text-center px-3 pb-3 sm:pb-4 shrink-0">
        <div className="text-white font-bold text-sm sm:text-lg truncate mb-1">{player.name}</div>
        <div className="text-3xl sm:text-5xl font-black text-gray-500">?</div>
        <div className="text-gray-500 text-[10px] sm:text-xs mt-1">{category.label}</div>
      </div>
    </div>
  );

  // ─── Game Over ───
  if (phase === 'game-over') {
    const isNewBest = streak > 0 && streak >= highScore;
    const totalRounds = roundHistory.length;
    const correctRounds = roundHistory.filter(r => r.correct).length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-8 flex flex-col items-center justify-center">
        <div className="max-w-xl w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-1">Game Over</h2>
            <div className="text-gray-500 text-sm">{category.label}</div>
          </div>

          {/* Streak hero */}
          <div className="text-center mb-6">
            <div className="text-7xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 leading-none">
              {streak}
            </div>
            <div className="text-gray-400 text-sm mt-1">
              {streak === 1 ? 'correct in a row' : 'correct in a row'}
            </div>
            {isNewBest && (
              <div className="inline-block mt-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm font-bold">
                New Personal Best!
              </div>
            )}
          </div>

          {/* Final matchup that ended the run */}
          {gameOverValues && leftPlayer && rightPlayer && (
            <div className="mb-6">
              <div className="text-gray-500 text-xs uppercase tracking-wider text-center mb-2">The one that got you</div>
              <div className="flex items-center gap-3 justify-center">
                <div className="bg-gray-800/80 rounded-lg px-4 py-3 border border-gray-700 text-center flex-1 max-w-[200px]">
                  <div className="text-white font-semibold text-sm truncate">{leftPlayer.name}</div>
                  <div className="text-xl font-bold text-white">{formatStatValue(gameOverValues.left, category)}</div>
                </div>
                <div className="text-gray-600 text-sm font-bold">vs</div>
                <div className="bg-gray-800/80 rounded-lg px-4 py-3 border border-red-500/30 text-center flex-1 max-w-[200px]">
                  <div className="text-white font-semibold text-sm truncate">{rightPlayer.name}</div>
                  <div className="text-xl font-bold text-red-400">{formatStatValue(gameOverValues.right, category)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Run Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {closestCall && (
              <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
                <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Closest Call</div>
                <div className="text-white font-bold text-lg">{formatStatValue(closestCall.diff, category)}</div>
                <div className="text-gray-400 text-xs truncate">{closestCall.p1} vs {closestCall.p2}</div>
              </div>
            )}
            {biggestGap && (
              <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
                <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Biggest Gap</div>
                <div className="text-white font-bold text-lg">{formatStatValue(biggestGap.diff, category)}</div>
                <div className="text-gray-400 text-xs truncate">{biggestGap.p1} vs {biggestGap.p2}</div>
              </div>
            )}
            {highestValue && (
              <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
                <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Highest Seen</div>
                <div className="text-white font-bold text-lg">{formatStatValue(highestValue.value, category)}</div>
                <div className="text-gray-400 text-xs truncate">{highestValue.name}</div>
              </div>
            )}
            <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
              <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Players Seen</div>
              <div className="text-white font-bold text-lg">{usedPids.size}</div>
              <div className="text-gray-400 text-xs">of {eligibleRef.current.length} eligible</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => startGame(category)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 font-bold">
              Play Again
            </Button>
            <Button variant="outline" onClick={() => { setPhase('pick-category'); setGuessResult(null); setRevealing(false); }} className="border-gray-600 text-gray-300 hover:text-white">
              Change Category
            </Button>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:text-white"
              onClick={() => {
                const lines = [
                  `Higher or Lower: ${category.label}`,
                  `🔥 Streak: ${streak}`,
                ];
                if (closestCall) lines.push(`😰 Closest: ${formatStatValue(closestCall.diff, category)} apart`);
                if (highestValue) lines.push(`👑 Highest: ${highestValue.name} (${formatStatValue(highestValue.value, category)})`);
                const text = lines.join('\n');
                navigator.clipboard.writeText(text).then(() => {
                  toast({ title: 'Copied to clipboard!' });
                }).catch(() => {
                  toast({ title: 'Could not copy', variant: 'destructive' });
                });
              }}
            >
              Share
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Playing ───
  return (
    <div className="h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-3 sm:p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 sm:mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBackToModeSelect} className="text-gray-400 hover:text-white">
            ← Back
          </Button>
          <div className="text-white">
            <span className="text-sm text-gray-400 mr-1">Streak:</span>
            <span className="text-xl font-bold text-orange-400">{streak}</span>
          </div>
        </div>
        <div className="text-white">
          <span className="text-sm text-gray-400 mr-1">Best:</span>
          <span className="text-xl font-bold text-amber-400">{highScore}</span>
        </div>
      </div>

      {/* Cards + Buttons — fill remaining space */}
      <div className="flex-1 flex flex-col sm:flex-row items-stretch justify-center gap-2 sm:gap-6 min-h-0 relative">
        {/* Left */}
        <div className="flex-1 min-h-0 relative overflow-hidden rounded-xl">
          <div className="absolute inset-0">
            {renderPlayerCard(leftPlayer, leftValue, 'left')}
          </div>
          {reelSide === 'left' && reelPlayers.length > 0 && (
            <div
              className="absolute inset-0 z-10 overflow-hidden"
            >
              <div
                className="w-full"
                style={{
                  height: `${reelPlayers.length * 100}%`,
                  transform: `translateY(-${(reelIndex / reelPlayers.length) * 100}%)`,
                  transition: reelAnimating
                    ? 'transform 1200ms cubic-bezier(0.2, 0.8, 0.3, 1)'
                    : 'none',
                }}
                onTransitionEnd={handleReelTransitionEnd}
              >
                {reelPlayers.map((p, i) => (
                  <div key={`${p.pid}-${i}`} style={{ height: `${100 / reelPlayers.length}%` }}>
                    {renderReelCard(p)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* OR badge */}
        <div className="sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-10 flex items-center justify-center shrink-0 py-1 sm:py-0">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center text-white font-black text-xs sm:text-base shadow-lg">
            OR
          </div>
        </div>

        {/* Right */}
        <div className="flex-1 min-h-0 relative overflow-hidden rounded-xl">
          <div className="absolute inset-0">
            {renderPlayerCard(rightPlayer, rightValue, 'right')}
          </div>
          {reelSide === 'right' && reelPlayers.length > 0 && (
            <div
              className="absolute inset-0 z-10 overflow-hidden"
            >
              <div
                className="w-full"
                style={{
                  height: `${reelPlayers.length * 100}%`,
                  transform: `translateY(-${(reelIndex / reelPlayers.length) * 100}%)`,
                  transition: reelAnimating
                    ? 'transform 1200ms cubic-bezier(0.2, 0.8, 0.3, 1)'
                    : 'none',
                }}
                onTransitionEnd={handleReelTransitionEnd}
              >
                {reelPlayers.map((p, i) => (
                  <div key={`${p.pid}-${i}`} style={{ height: `${100 / reelPlayers.length}%` }}>
                    {renderReelCard(p)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prompt */}
      <div className="text-center shrink-0 pt-2 sm:pt-4 h-[40px]">
        {!revealing && !reelSide && (
          <p className="text-gray-400 text-sm">
            {knownSide === null ? 'Tap the player you think has more' : 'Tap the player with the higher stat'}
          </p>
        )}
      </div>
    </div>
  );
}
