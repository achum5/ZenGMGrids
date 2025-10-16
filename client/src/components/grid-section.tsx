import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, Flag, Share2, Grid3x3, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cellKey } from '@/lib/grid-generator';
import type { CatTeam, CellState, Team } from '@/types/bbgm';
import { PlayerFace } from '@/components/PlayerFace';
import { RarityChip } from '@/components/RarityChip';
import { ResponsiveText } from '@/components/ResponsiveText';
import { TeamLogo } from '@/components/TeamLogo';
import { ScorePopup } from './ScorePopup';
import { CellCelebration } from './CellCelebration';
import './score-popup.css';
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

// Helper to determine rarity tier based on playerCount
const getRarityTier = (count: number) => {
  if (count >= 90) return 'mythic';
  if (count >= 75) return 'legendary';
  if (count >= 60) return 'epic';
  if (count >= 40) return 'rare';
  if (count >= 20) return 'uncommon';
  if (count >= 10) return 'common';
  return 'none'; // For playerCount < 10 or 0
};

// Define color and gradient for each rarity tier
const rarityStyles: Record<string, { bgColor: string; gradient: string; textColor: string; borderColor: string; animationClass?: string }> = {
  common: {
    bgColor: '#3DB2FF',
    gradient: 'linear-gradient(135deg, #69C8FF 0%, #2A8AE0 100%)',
    textColor: 'white',
    borderColor: '#2A8AE0',
    animationClass: 'shine-effect-common',
  },
  uncommon: {
    bgColor: '#00D68F',
    gradient: 'linear-gradient(135deg, #3EF1B3 0%, #00A070 100%)',
    textColor: 'white',
    borderColor: '#00A070',
    animationClass: 'shine-effect-uncommon',
  },
  rare: {
    bgColor: '#FFD93D',
    gradient: 'linear-gradient(135deg, #FFE875 0%, #E3B900 100%)',
    textColor: 'black',
    borderColor: '#E3B900',
    animationClass: 'shine-effect-rare',
  },
  epic: {
    bgColor: '#FF7A00',
    gradient: 'linear-gradient(135deg, #FF9C40 0%, #E66000 100%)',
    textColor: 'white',
    borderColor: '#E66000',
    animationClass: 'shine-effect-epic',
  },
  legendary: {
    bgColor: '#FF3D68',
    gradient: 'linear-gradient(135deg, #FF6D8C 0%, #D82A4F 100%)',
    textColor: 'white',
    borderColor: '#D82A4F',
    animationClass: 'shine-effect-legendary',
  },
  mythic: {
    bgColor: '#B537F2',
    gradient: 'linear-gradient(135deg, #D178FF 0%, #8B1BD1 100%)',
    textColor: 'white',
    borderColor: '#8B1BD1',
    animationClass: 'shine-effect-mythic',
  },
  none: { // For playerCount < 10 or 0
    bgColor: 'transparent',
    gradient: 'none',
    textColor: 'white',
    borderColor: '#ef4444', // Default red for invalid
  }
};

interface GridSectionProps {
  rows: CatTeam[];
  cols: CatTeam[];
  cells: Record<string, CellState>;
  onCellClick: (positionalKey: string) => void;
  onGenerateNewGrid: () => void;
  onGiveUp: () => void;
  onRetryGrid: () => void;
  onShareGrid?: () => void;
  onCreateCustomGrid?: () => void;
  isGenerating: boolean;
  teams: Team[]; // Add teams for jersey styling
  sport?: string;
  attemptCount: number;
  getOrdinalLabel: (count: number) => string;
  giveUpPressed?: boolean; // Track if Give Up has been pressed
  hintMode: boolean; // Hint mode state
  onHintModeChange: (enabled: boolean) => void; // Hint mode toggle handler
}

// Calculate total score from correct guesses
function calculateScore(cells: Record<string, CellState>): number {
  return Object.values(cells).reduce((total, cell) => {
    return total + (cell.points || 0);
  }, 0);
}

type ScorePopupInfo = {
  id: number;
  amount: number;
};

export function GridSection({
  rows,
  cols,
  cells,
  onCellClick,
  onGenerateNewGrid,
  onGiveUp,
  onRetryGrid,
  onShareGrid,
  onCreateCustomGrid,
  isGenerating,
  teams,
  sport,
  attemptCount,
  getOrdinalLabel,
  giveUpPressed = false,
  hintMode,
  onHintModeChange,
}: GridSectionProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [isFlaring, setIsFlaring] = useState(false);
  const totalScore = calculateScore(cells);
  const prevTotalScoreRef = useRef(totalScore);

  const [scorePopups, setScorePopups] = useState<ScorePopupInfo[]>([]);
  const [liveRegionMessage, setLiveRegionMessage] = useState('');
  
  const scoreBatchQueue = useRef<number[]>([]);
  const scoreDisplayQueue = useRef<ScorePopupInfo[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [celebratingCells, setCelebratingCells] = useState<Set<string>>(new Set());
  const celebrationQueue = useRef<string[]>([]);

  const processCelebrationQueue = useCallback(() => {
    if (celebratingCells.size >= 2 || celebrationQueue.current.length === 0) {
      return;
    }

    const cellToCelebrate = celebrationQueue.current.shift();
    if (cellToCelebrate) {
      setCelebratingCells(prev => new Set(prev).add(cellToCelebrate));
      setTimeout(() => {
        setCelebratingCells(prev => {
          const newSet = new Set(prev);
          newSet.delete(cellToCelebrate);
          return newSet;
        });
      }, 1100); // Animation duration
    }
  }, [celebratingCells.size]);

  useEffect(() => {
    processCelebrationQueue();
  }, [celebratingCells.size, processCelebrationQueue]);

  const processScoreQueue = useCallback(() => {
    if (scorePopups.length >= 2 || scoreDisplayQueue.current.length === 0) {
      return;
    }

    const event = scoreDisplayQueue.current.shift()!;
    const delay = scorePopups.length * 80; // Stagger animation start

    setTimeout(() => {
      setScorePopups(prev => [...prev, event]);
      setTimeout(() => {
        setScorePopups(prev => prev.filter(p => p.id !== event.id));
      }, 1200); // Animation duration
    }, delay);
  }, [scorePopups]);

  useEffect(() => {
    processScoreQueue();
  }, [scorePopups, processScoreQueue]);

  useEffect(() => {
    const scoreDifference = totalScore - prevTotalScoreRef.current;

    if (scoreDifference > 0) {
      scoreBatchQueue.current.push(scoreDifference);

      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }

      batchTimerRef.current = setTimeout(() => {
        const combinedScore = scoreBatchQueue.current.reduce((a, b) => a + b, 0);
        scoreBatchQueue.current = [];

        if (combinedScore > 0) {
          setIsFlaring(true);
          setTimeout(() => setIsFlaring(false), 900);

          setLiveRegionMessage(`Score increased by ${combinedScore}, total ${totalScore}.`);
          
          scoreDisplayQueue.current.push({ amount: combinedScore, id: Date.now() });
          processScoreQueue();
        }
      }, 300); // 300ms aggregation window
    }

    prevTotalScoreRef.current = totalScore;
  }, [totalScore, processScoreQueue]);
  
  const prevCellsRef = React.useRef(cells);
  useEffect(() => {
    const prevCells = prevCellsRef.current;
    if (prevCells !== cells) {
      Object.keys(cells).forEach(key => {
        const cell = cells[key];
        const prevCell = prevCells[key];
        if (cell.correct && !prevCell?.correct) {
          celebrationQueue.current.push(key);
          setLiveRegionMessage('Correct. Cell completed.');
        }
      });
      processCelebrationQueue();
    }
    prevCellsRef.current = cells;
  }, [cells, processCelebrationQueue]);

  // Helper function for generating unique React keys
  const getReactKey = (type: 'header-row' | 'header-col' | 'cell', rowIndex?: number, colIndex?: number, rowKey?: string, colKey?: string) => {
    // Explicit duplicate detection
    const hasDupRows = rows.map(r => r.key).some((k, i, a) => a.indexOf(k) !== i);
    const hasDupCols = cols.map(c => c.key).some((k, i, a) => a.indexOf(k) !== i);
    const hasDuplicates = hasDupRows || hasDupCols;
    
    if (hasDuplicates) {
      if (type === 'header-row') return `header-row-${rowIndex}`;
      if (type === 'header-col') return `header-col-${colIndex}`;
      if (type === 'cell') return `cell-${rowIndex}-${colIndex}`;
    }
    if (type === 'header-row') return `${rowKey}-header`;
    if (type === 'header-col') return `${colKey}-header`;
    if (type === 'cell') return `${rowKey}-${colKey}`;
    return 'unknown';
  };

  const getCellContent = (rowIndex: number, colIndex: number) => {
    const key = `${rowIndex}-${colIndex}`;
    const cellState = cells[key];
    
    // Default styles for empty/unrevealed cells
    let background = 'var(--muted)';
    let color = 'var(--muted-foreground)';
    let borderColor = 'var(--border)';
    let borderWidth = '1px';
    let borderStyle = 'solid';
    let className = 'hover:bg-accent/30 dark:hover:bg-accent/20 hover:border-accent/40 dark:hover:border-accent/30 transition-all duration-100 motion-reduce:transition-none cursor-pointer focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:focus:ring-blue-400';
    let disabled = false;
    let showFace = false;
    let player = undefined;

    if (!cellState?.name) {
      return {
        content: '',
        className,
        disabled,
        showFace,
        player,
        background,
        color,
        borderColor,
        borderWidth,
        borderStyle,
        correct: false,
        rarity: 0,
      };
    }

    // If a player is selected (cellState.name exists)
    showFace = true;
    player = cellState.player;
    disabled = false; // Allow clicks for read-only modal

    if (cellState.correct === true) {
      const rarityTier = getRarityTier(cellState.rarity || 0);
      const styles = rarityStyles[rarityTier];
      background = styles.gradient !== 'none' ? styles.gradient : styles.bgColor;
      color = styles.textColor;
      borderColor = styles.borderColor;
      className = 'correct-answer font-medium transition-all duration-100 motion-reduce:transition-none cursor-pointer hover:brightness-110 hover:contrast-110 hover:shadow-md focus:ring-2 focus:ring-inset focus:ring-green-400';
    } else if (cellState.correct === false) {
      background = '#EF4444'; // Red for incorrect
      color = 'white';
      borderColor = '#B91C1C';
      className = 'incorrect-answer font-medium transition-all duration-100 motion-reduce:transition-none cursor-pointer hover:brightness-110 hover:contrast-110 hover:shadow-md focus:ring-2 focus:ring-inset focus:ring-red-400';
    } else if (cellState.autoFilled) {
      background = '#FCD34D'; // Yellow for auto-filled
      color = '#92400E';
      borderColor = '#D97706';
      className = 'revealed-answer font-medium transition-all duration-100 motion-reduce:transition-none cursor-pointer hover:brightness-110 hover:contrast-110 hover:shadow-md focus:ring-2 focus:ring-inset focus:ring-yellow-400';
    }

    return {
      content: cellState.name,
      className,
      disabled,
      showFace,
      player,
      background,
      color,
      borderColor,
      borderWidth,
      borderStyle,
      correct: cellState.correct,
      rarity: cellState.rarity,
    };
  };

  const correctGuesses = Object.values(cells).filter(cell => cell.correct).length;
  const totalCells = 9;
  
  // Check if all cells are filled (either guessed or auto-filled)
  const allCellKeys = rows.flatMap((row, rowIndex) => 
    cols.map((col, colIndex) => `${rowIndex}-${colIndex}`)
  );
  const filledCells = allCellKeys.filter(key => cells[key]?.name).length;
  const isGridComplete = filledCells === totalCells;
  
  // Check if there are any empty cells that can be revealed
  const hasEmptyCells = allCellKeys.some(key => !cells[key]?.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {/* Left button: Give Up or Retry This Grid */}
        {isGridComplete || giveUpPressed ? (
          <Button
            onClick={onRetryGrid}
            variant="default"
            className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-lg focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-xs sm:text-sm h-8 px-2 sm:h-10 sm:px-4"
            data-testid="button-retry-grid"
          >
            <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Retry This Grid</span>
            <span className="xs:hidden">Retry</span>
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                disabled={isGenerating || !hasEmptyCells}
                className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-lg text-xs sm:text-sm h-8 px-2 sm:h-10 sm:px-4"
                data-testid="button-give-up"
              >
                <Flag className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Give Up</span>
                <span className="xs:hidden">Give Up</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reveal remaining answers?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your score won't change.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onGiveUp}>Reveal</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Generate New Grid button on the right */}
        <Button
          onClick={onGenerateNewGrid}
          disabled={isGenerating}
          variant="secondary"
          className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-lg text-xs sm:text-sm h-8 px-2 sm:h-10 sm:px-4"
          data-testid="button-generate-grid"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              <span className="hidden xs:inline">Generating...</span>
              <span className="xs:hidden">...</span>
            </>
          ) : (
            <>
              <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Generate New Grid</span>
              <span className="xs:hidden">New</span>
            </>
          )}
        </Button>
      </div>
      <Card>
        <CardContent className="p-3 md:p-6">
          {/* Grid Container with expanded max-width */}
          <div className="max-w-4xl mx-auto">
            {/* Complete 4x4 Grid - Board with Thin Separators */}
            <div className="rainbow-border rounded-2xl p-[2px] md:p-[3px] overflow-hidden grid-container-glow grid-divider">
              <div className="grid grid-cols-4 gap-[2px] md:gap-[3px] w-full relative z-10">
              {/* Score in top-left corner */}
              <div className={cn("relative aspect-square flex flex-col items-center justify-center bg-secondary dark:bg-slate-700 rounded-tl-2xl overflow-hidden score-tile", isFlaring && "score-tile-flare")}>
                <div className="score-tile-ring"></div>
                <div className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground dark:text-gray-400">
                  {isGridComplete ? 'Final Score:' : 'Score:'}
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold leading-none text-foreground dark:text-white relative">
                  {totalScore}
                  {scorePopups.map((popup, index) => (
                    <ScorePopup
                      key={popup.id}
                      amount={popup.amount}
                      style={{
                        fontSize: '65%',
                        top: `${-6 - index * 6}px`,
                        right: `-8px`,
                      }}
                    />
                  ))}
                </div>
                {attemptCount >= 2 && (
                  <div className="text-xs text-muted-foreground dark:text-gray-500 mt-1">
                    ({getOrdinalLabel(attemptCount)} try)
                  </div>
                )}
                {/* Accessibility: Screen reader announcement */}
                <div className="sr-only" aria-live="polite" role="status">
                  {liveRegionMessage}
                </div>
              </div>
              
              {/* Column Headers */}
              {cols.map((col, colIndex) => {
                // Corner radius for column headers
                const isTopRightHeader = colIndex === cols.length - 1;
                const headerRadius = isTopRightHeader ? 'rounded-tr-2xl' : '';
                
                // Find the corresponding team for logo display
                const teamForHeader = col.type === 'team' ? teams.find(t => t.tid === col.tid) : null;
                const isHovered = hoveredCell?.col === colIndex;

                return (
                  <div 
                    key={getReactKey('header-col', undefined, colIndex, undefined, col.key)} 
                    className={cn(
                      "aspect-square bg-secondary dark:bg-slate-700 p-2 md:p-3 overflow-hidden",
                      headerRadius,
                      teamForHeader ? 'header-logo-glow' : 'header-text-glow',
                      isHovered && 'header-hover'
                    )}
                    data-testid={`header-col-${col.key}`}
                    title={teamForHeader ? `${teamForHeader.region || ''} ${teamForHeader.name}`.trim() : col.label}
                  >
                    {teamForHeader ? (
                      <TeamLogo team={teamForHeader} sport={sport} />
                    ) : (
                      <ResponsiveText
                        text={col.label}
                        className="text-[10px] xs:text-xs md:text-sm font-bold text-secondary-foreground dark:text-white"
                      />
                    )}
                  </div>
                );
              })}

              {/* Grid Rows */}
              {rows.map((row, rowIndex) => {
                const [abbrev, ...nameParts] = row.label.split(' ');
                const name = nameParts.join(' ');
                
                const fullName = `${abbrev} ${name}`;
                
                return [
                  // Row Header
                  (() => {
                    const teamForHeader = row.type === 'team' ? teams.find(t => t.tid === row.tid) : null;
                    const isHovered = hoveredCell?.row === rowIndex;

                    return (
                      <div 
                        key={getReactKey('header-row', rowIndex, undefined, row.key)}
                        className={cn(
                          "aspect-square bg-secondary dark:bg-slate-700 p-2 md:p-3 overflow-hidden",
                          rowIndex === rows.length - 1 ? 'rounded-bl-2xl' : '',
                          teamForHeader ? 'header-logo-glow' : 'header-text-glow',
                          isHovered && 'header-hover'
                        )}
                        data-testid={`header-row-${row.key}`}
                        title={teamForHeader ? `${teamForHeader.region || ''} ${teamForHeader.name}`.trim() : row.label}
                      >
                        {teamForHeader ? (
                          <TeamLogo team={teamForHeader} sport={sport} />
                        ) : (
                          <ResponsiveText
                            text={fullName}
                            className="text-[10px] xs:text-xs md:text-sm font-bold text-secondary-foreground dark:text-white"
                          />
                        )}
                      </div>
                    );
                  })(),
                  
                  // Grid Cells for this row
                  ...cols.map((col, colIndex) => {
                    const positionalKey = `${rowIndex}-${colIndex}`;
                    const cellContent = getCellContent(rowIndex, colIndex);
                    const isCelebrating = celebratingCells.has(positionalKey);
                    
                    // Determine corner radius based on position in the game grid (3x3 within the 4x4 layout)
                    const isTopLeft = rowIndex === 0 && colIndex === 0;
                    const isTopRight = rowIndex === 0 && colIndex === cols.length - 1;
                    const isBottomLeft = rowIndex === rows.length - 1 && colIndex === 0;
                    const isBottomRight = rowIndex === rows.length - 1 && colIndex === cols.length - 1;
                    
                    let cornerRadius = '';
                    if (isTopLeft) cornerRadius = 'rounded-tl-2xl';
                    else if (isTopRight) cornerRadius = 'rounded-tr-2xl';
                    else if (isBottomLeft) cornerRadius = 'rounded-bl-2xl';
                    else if (isBottomRight) cornerRadius = 'rounded-br-2xl';
                    
                    return (
                      <button
                        key={`cell-${rowIndex}-${colIndex}`}
                        className={cn(
                          'aspect-square w-full flex items-center justify-center text-center relative overflow-hidden transition-all duration-200 hover:brightness-110 hover:contrast-110 hover:shadow-md cell-reveal-animation grid-cell-neon',
                          cornerRadius,
                          cellContent.className,
                          isCelebrating && 'cell-celebrating'
                        )}
                        onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onCellClick(positionalKey);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onCellClick(positionalKey);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onCellClick(positionalKey);
                          }
                        }}
                        disabled={cellContent.disabled}
                        aria-disabled={cellContent.disabled}
                        tabIndex={0}
                        role="button"
                        style={{ 
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                          userSelect: 'none',
                          background: cellContent.background,
                          color: cellContent.color,
                          borderColor: cellContent.borderColor,
                          borderWidth: cellContent.borderWidth,
                          borderStyle: cellContent.borderStyle,
                        }}
                        data-testid={`cell-${row.key}-${col.key}`}
                      >
                        {isCelebrating && <CellCelebration />}
                        {/* Global Pop-in Scale (applied via cell-reveal-animation) */}

                        {/* Shine Effect Overlay (Common, Uncommon, Rare, Epic, Legendary, Mythic) */}
                        {cellContent.player && cellContent.correct && cellContent.rarity && cellContent.rarity >= 10 && (
                          <div className={cn("shine-overlay", rarityStyles[getRarityTier(cellContent.rarity)].animationClass)} />
                        )}

                        {/* Tier-Specific Enhancements */}
                        {cellContent.player && cellContent.correct && cellContent.rarity && (
                          <>
                            {/* Common: 2 sparks */}
                            {getRarityTier(cellContent.rarity) === 'common' && (
                              <>
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '40%', left: '30%', animationDelay: '0.1s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '60%', left: '70%', animationDelay: '0.2s' }} />
                              </>
                            )}

                            {/* Uncommon: 4 sparks, 1 mini ring pulse */}
                            {getRarityTier(cellContent.rarity) === 'uncommon' && (
                              <>
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '25%', left: '25%', animationDelay: '0s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '75%', left: '75%', animationDelay: '0.1s' }} />
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '50%', left: '15%', animationDelay: '0.2s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '15%', left: '85%', animationDelay: '0.3s' }} />
                                <div className="ring-pulse-effect" style={{ '--ring-end-scale': 1.0, '--ring-opacity': 0.24, '--ring-duration': '0.6s' } as React.CSSProperties} />
                              </>
                            )}

                            {/* Rare: 6 sparks, 1 ring pulse, glow bloom */}
                            {getRarityTier(cellContent.rarity) === 'rare' && (
                              <>
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '20%', left: '20%', animationDelay: '0s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '80%', left: '80%', animationDelay: '0.1s' }} />
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '50%', left: '10%', animationDelay: '0.2s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '10%', left: '90%', animationDelay: '0.3s' }} />
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '70%', left: '30%', animationDelay: '0.4s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '30%', left: '70%', animationDelay: '0.5s' }} />
                                <div className="ring-pulse-effect" style={{ '--ring-end-scale': 1.2, '--ring-opacity': 0.26, '--ring-duration': '0.7s' } as React.CSSProperties} />
                                <div className="glow-effect" style={{ '--glow-radius': '24px', '--glow-duration': '0.6s' } as React.CSSProperties} />
                              </>
                            )}

                            {/* Epic: 8 sparks (2 arc), 2 ring pulses, shimmer lines, glow bloom */}
                            {getRarityTier(cellContent.rarity) === 'epic' && (
                              <>
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '15%', left: '15%', animationDelay: '0s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '85%', left: '85%', animationDelay: '0.1s' }} />
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '50%', left: '5%', animationDelay: '0.2s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '5%', left: '95%', animationDelay: '0.3s' }} />
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '75%', left: '25%', animationDelay: '0.4s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '25%', left: '75%', animationDelay: '0.5s' }} />
                                <div className="sparkle-dot" style={{ width: '5px', height: '5px', top: '40%', left: '40%', animationDelay: '0.6s', animationName: 'sparkle-arc' }} />
                                <div className="sparkle-dot" style={{ width: '5px', height: '5px', top: '60%', left: '60%', animationDelay: '0.7s', animationName: 'sparkle-arc-reverse' }} />
                                <div className="ring-pulse-effect" style={{ '--ring-end-scale': 1.3, '--ring-opacity': 0.30, '--ring-duration': '0.7s' } as React.CSSProperties} />
                                <div className="ring-pulse-effect" style={{ '--ring-end-scale': 1.1, '--ring-opacity': 0.20, '--ring-duration': '0.7s', animationDelay: '0.1s' } as React.CSSProperties} />
                                <div className="shimmer-effect" style={{ '--shimmer-duration': '0.7s' } as React.CSSProperties} />
                                <div className="glow-effect" style={{ '--glow-radius': '26px', '--glow-duration': '0.7s' } as React.CSSProperties} />
                              </>
                            )}

                            {/* Legendary: 12 sparks (1 star), 2 ring pulses (larger), 3 shimmer lines, spark burst, corner glint, glow bloom */}
                            {getRarityTier(cellContent.rarity) === 'legendary' && (
                              <>
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '10%', left: '10%', animationDelay: '0s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '90%', left: '90%', animationDelay: '0.1s' }} />
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '50%', left: '0%', animationDelay: '0.2s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '0%', left: '100%', animationDelay: '0.3s' }} />
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '80%', left: '20%', animationDelay: '0.4s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '20%', left: '80%', animationDelay: '0.5s' }} />
                                <div className="sparkle-dot" style={{ width: '5px', height: '5px', top: '45%', left: '45%', animationDelay: '0.6s', animationName: 'sparkle-arc' }} />
                                <div className="sparkle-dot" style={{ width: '5px', height: '5px', top: '55%', left: '55%', animationDelay: '0.7s', animationName: 'sparkle-arc-reverse' }} />
                                <div className="sparkle-dot star-sparkle" style={{ top: '50%', left: '50%', animationDelay: '0.8s' }} />
                                <div className="ring-pulse-effect" style={{ '--ring-end-scale': 1.4, '--ring-opacity': 0.32, '--ring-duration': '0.8s' } as React.CSSProperties} />
                                <div className="ring-pulse-effect" style={{ '--ring-end-scale': 1.2, '--ring-opacity': 0.22, '--ring-duration': '0.8s', animationDelay: '0.1s' } as React.CSSProperties} />
                                <div className="shimmer-effect" style={{ '--shimmer-duration': '0.9s' } as React.CSSProperties} />
                                <div className="spark-burst-effect" />
                                <div className="corner-glint-effect" />
                                <div className="glow-effect" style={{ '--glow-radius': '28px', '--glow-duration': '0.8s' } as React.CSSProperties} />
                              </>
                            )}

                            {/* Mythic: 16 sparks (3 star), 3 ring pulses (larger), continuous shimmer, aura, border pulse, glow bloom */}
                            {getRarityTier(cellContent.rarity) === 'mythic' && (
                              <>
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '5%', left: '5%', animationDelay: '0s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '95%', left: '95%', animationDelay: '0.1s' }} />
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '50%', left: '0%', animationDelay: '0.2s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '0%', left: '100%', animationDelay: '0.3s' }} />
                                <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '85%', left: '15%', animationDelay: '0.4s' }} />
                                <div className="sparkle-dot" style={{ width: '4px', height: '4px', top: '15%', left: '85%', animationDelay: '0.5s' }} />
                                <div className="sparkle-dot" style={{ width: '5px', height: '5px', top: '40%', left: '40%', animationDelay: '0.6s', animationName: 'sparkle-arc' }} />
                                <div className="sparkle-dot" style={{ width: '5px', height: '5px', top: '60%', left: '60%', animationDelay: '0.7s', animationName: 'sparkle-arc-reverse' }} />
                                <div className="sparkle-dot star-sparkle" style={{ top: '20%', left: '70%', animationDelay: '0.8s' }} />
                                <div className="sparkle-dot star-sparkle" style={{ top: '80%', left: '30%', animationDelay: '0.9s' }} />
                                <div className="sparkle-dot star-sparkle" style={{ top: '50%', left: '50%', animationDelay: '1s' }} />
                                <div className="ring-pulse-effect" style={{ '--ring-end-scale': 1.5, '--ring-opacity': 0.32, '--ring-duration': '0.9s' } as React.CSSProperties} />
                                <div className="ring-pulse-effect" style={{ '--ring-end-scale': 1.3, '--ring-opacity': 0.25, '--ring-duration': '0.9s', animationDelay: '0.1s' } as React.CSSProperties} />
                                <div className="ring-pulse-effect" style={{ '--ring-end-scale': 1.1, '--ring-opacity': 0.18, '--ring-duration': '0.9s', animationDelay: '0.2s' } as React.CSSProperties} />
                                <div className="continuous-shimmer-effect" />
                                <div className="aura-effect" />
                                <div className="border-pulse-effect" />
                                <div className="glow-effect" style={{ '--glow-radius': '30px', '--glow-duration': '0.9s' } as React.CSSProperties} />
                              </>
                            )}
                          </>
                        )}

                        <div className="text-xs md:text-sm px-1 md:px-2 text-center w-full h-full flex items-center justify-center relative overflow-hidden">
                          {cellContent.showFace && cellContent.player ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                              <PlayerFace
                                pid={cellContent.player.pid}
                                name={cellContent.player.name}
                                imgURL={cellContent.player.imgURL}
                                face={cellContent.player.face}
                                size={Math.min(80, typeof window !== 'undefined' ? Math.min(window.innerWidth / 10, window.innerHeight / 12) : 80)}
                                player={cellContent.player}
                                teams={teams}
                                sport={sport}
                              />
                              {(() => {
                                // Use positional key format like home.tsx uses
                                const positionalKey = `${rowIndex}-${colIndex}`;
                                const cellState = cells[positionalKey];
                                const rarityTier = getRarityTier(cellState?.rarity || 0);

                                return (
                                  <>
                                    {/* Rarity Chip (Scoring Badge) */}
                                    {cellState?.correct && cellState?.rarity && (
                                      <div className="absolute top-1 left-1 z-10">
                                        <RarityChip value={cellState.rarity} />
                                      </div>
                                    )}
                                    {cellState?.usedHint && (
                                      <div className="absolute top-1 right-1 z-10 text-sm" data-testid={`hint-indicator-${rowIndex}-${colIndex}`}>
                                        💡
                                      </div>
                                    )}

                                    {/* Tier-Specific Enhancements */}
                                    {cellState?.correct && cellState?.rarity && (
                                      <>
                                        {/* Uncommon: Sparkle dots */}
                                        {rarityTier === 'uncommon' && (
                                          <>
                                            <div className="sparkle-dot" style={{ width: '2px', height: '2px', top: '20%', left: '30%', animationDelay: '0s' }} />
                                            <div className="sparkle-dot" style={{ width: '3px', height: '3px', top: '70%', left: '60%', animationDelay: '0.1s' }} />
                                            <div className="sparkle-dot" style={{ width: '2px', height: '2px', top: '40%', left: '80%', animationDelay: '0.2s' }} />
                                          </>
                                        )}

                                        {/* Rare: Soft circular glow pulse */}
                                        {rarityTier === 'rare' && (
                                          <div className="glow-effect" />
                                        )}

                                        {/* Epic: Animated shimmer lines */}
                                        {rarityTier === 'epic' && (
                                          <div className="shimmer-effect" />
                                        )}

                                        {/* Legendary: Spark burst + ring pulse */}
                                        {rarityTier === 'legendary' && (
                                          <>
                                            <div className="spark-burst-effect" />
                                            <div className="ring-pulse-effect" />
                                          </>
                                        )}

                                        {/* Mythic: Continuous slow shimmer loop + aura rotation */}
                                        {rarityTier === 'mythic' && (
                                          <>
                                            <div className="continuous-shimmer-effect" />
                                            <div className="aura-effect" />
                                          </>
                                        )}
                                      </>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          ) : (
                            <span className="leading-tight break-words">{cellContent.content}</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                ];
              })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Three-column layout: Share - Hint Mode - Custom */}
      <div className="grid grid-cols-3 items-center mt-4">
        {/* Share/Import Grid button (left) */}
        <div className="flex justify-start">
          {onShareGrid && rows.length > 0 && cols.length > 0 ? (
            <Button
              onClick={onShareGrid}
              variant="outline"
              className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-lg text-xs sm:text-sm h-8 px-2 sm:h-10 sm:px-4"
              data-testid="button-share-import-grid"
            >
              <Share2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Share/Import Grid</span>
              <span className="xs:hidden">Share Grid</span>
            </Button>
          ) : (
            (<div />) // Empty div to maintain grid structure
          )}
        </div>

        {/* Hint mode toggle (center) */}
        <div className="flex items-center justify-center gap-2" data-testid="hint-mode-toggle" style={{ marginLeft: '-1px' }}>
          <Switch
            id="hint-mode"
            checked={hintMode}
            onCheckedChange={onHintModeChange}
            data-testid="switch-hint-mode"
          />
          <Label 
            htmlFor="hint-mode" 
            className="text-sm font-medium cursor-pointer"
            data-testid="label-hint-mode"
          > Hint Mode💡</Label>
        </div>

        {/* Create Custom Grid button (right) */}
        <div className="flex justify-end">
          {onCreateCustomGrid ? (
            <Button
              onClick={onCreateCustomGrid}
              variant="outline"
              className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-lg text-xs sm:text-sm h-8 px-2 sm:h-10 sm:px-4"
              data-testid="button-create-custom-grid"
            >
              <Grid3x3 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Create Custom Grid</span>
              <span className="xs:hidden">Custom</span>
            </Button>
          ) : (
            (<div />) // Empty div to maintain grid structure
          )}
        </div>
      </div>
    </div>
  );
}
