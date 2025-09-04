import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CatTeam, CellState, Team } from '@/types/bbgm';
import { PlayerFace } from '@/components/PlayerFace';
import { RarityChip } from '@/components/RarityChip';
import { ResponsiveText } from '@/components/ResponsiveText';
import { TeamLogo } from '@/components/TeamLogo';
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

interface GridSectionProps {
  rows: CatTeam[];
  cols: CatTeam[];
  cells: Record<string, CellState>;
  onCellClick: (rowKey: string, colKey: string) => void;
  onGenerateNewGrid: () => void;
  onGiveUp: () => void;
  onRetryGrid: () => void;
  isGenerating: boolean;
  teams: Team[]; // Add teams for jersey styling
  sport?: string;
  attemptCount: number;
  getOrdinalLabel: (count: number) => string;
}

// Calculate total score from correct guesses
function calculateScore(cells: Record<string, CellState>): number {
  return Object.values(cells).reduce((total, cell) => {
    return total + (cell.points || 0);
  }, 0);
}

export function GridSection({
  rows,
  cols,
  cells,
  onCellClick,
  onGenerateNewGrid,
  onGiveUp,
  onRetryGrid,
  isGenerating,
  teams,
  sport,
  attemptCount,
  getOrdinalLabel,
}: GridSectionProps) {
  const totalScore = calculateScore(cells);
  const getCellKey = (rowKey: string, colKey: string) => `${rowKey}|${colKey}`;

  const getCellContent = (rowKey: string, colKey: string) => {
    const key = getCellKey(rowKey, colKey);
    const cellState = cells[key];
    
    if (!cellState?.name) {
      return {
        content: '',
        className: 'bg-muted dark:bg-slate-800 text-muted-foreground hover:bg-accent/30 dark:hover:bg-accent/20 hover:border-accent/40 dark:hover:border-accent/30 border border-transparent transition-all duration-100 motion-reduce:transition-none cursor-pointer focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:focus:ring-blue-400',
        disabled: false,
        showFace: false,
      };
    }
    
    // Handle auto-filled (revealed) cells
    if (cellState.autoFilled) {
      return {
        content: cellState.name,
        className: 'revealed-answer bg-red-500/20 dark:bg-red-600/30 text-red-900 dark:text-red-100 font-medium hover:bg-red-500/30 dark:hover:bg-red-600/40 hover:border-red-300/50 dark:hover:border-red-400/40 border border-transparent transition-all duration-100 motion-reduce:transition-none cursor-pointer focus:ring-2 focus:ring-inset focus:ring-red-400',
        disabled: false, // Allow clicks for read-only modal
        showFace: true,
        player: cellState.player,
      };
    }
    
    if (cellState.correct === true) {
      return {
        content: cellState.name,
        className: 'correct-answer dark:bg-green-600 text-white font-medium hover:bg-green-400/90 dark:hover:bg-green-500/90 hover:border-green-300/50 dark:hover:border-green-400/40 border border-transparent transition-all duration-100 motion-reduce:transition-none cursor-pointer focus:ring-2 focus:ring-inset focus:ring-green-400',
        disabled: false, // Allow clicks for modal
        showFace: true,
        player: cellState.player,
      };
    }
    
    if (cellState.correct === false) {
      return {
        content: cellState.name,
        className: 'incorrect-answer dark:bg-red-600 text-white font-medium hover:bg-red-400/90 dark:hover:bg-red-500/90 hover:border-red-300/50 dark:hover:border-red-400/40 border border-transparent transition-all duration-100 motion-reduce:transition-none cursor-pointer focus:ring-2 focus:ring-inset focus:ring-red-400',
        disabled: false, // Allow clicks for modal
        showFace: true,
        player: cellState.player,
      };
    }
    
    return {
      content: cellState.name,
      className: 'bg-muted dark:bg-slate-800 text-muted-foreground',
      disabled: false, // Allow clicks for modal
      showFace: true,
      player: cellState.player,
    };
  };

  const correctGuesses = Object.values(cells).filter(cell => cell.correct).length;
  const totalCells = 9;
  
  // Check if all cells are filled (either guessed or auto-filled)
  const allCellKeys = rows.flatMap(row => cols.map(col => getCellKey(row.key, col.key)));
  const filledCells = allCellKeys.filter(key => cells[key]?.name).length;
  const isGridComplete = filledCells === totalCells;
  
  // Check if there are any empty cells that can be revealed
  const hasEmptyCells = allCellKeys.some(key => !cells[key]?.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {/* Left button: Give Up or Retry This Grid */}
        {isGridComplete ? (
          <Button
            onClick={onRetryGrid}
            variant="default"
            className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-lg focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            data-testid="button-retry-grid"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry This Grid
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                disabled={isGenerating || !hasEmptyCells}
                className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-lg"
                data-testid="button-give-up"
              >
                <Flag className="mr-2 h-4 w-4" />
                Give Up
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
          className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white transition-all duration-150 active:scale-95 active:shadow-inner hover:shadow-lg"
          data-testid="button-generate-grid"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate New Grid
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardContent className="p-3 md:p-6">
          {/* Grid Container with expanded max-width */}
          <div className="max-w-4xl mx-auto">
            {/* Complete 4x4 Grid - Board with Thin Separators */}
            <div className="bg-border/60 dark:bg-slate-600/90 rounded-2xl p-[2px] md:p-[3px] overflow-hidden">
              <div className="grid grid-cols-4 gap-[2px] md:gap-[3px] w-full">
              {/* Score in top-left corner */}
              <div className="aspect-square flex flex-col items-center justify-center bg-secondary dark:bg-slate-700 rounded-tl-2xl overflow-hidden">
                <div className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground dark:text-gray-400">
                  {isGridComplete ? 'Final Score:' : 'Score:'}
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold leading-none text-foreground dark:text-white">
                  {totalScore}
                </div>
                {attemptCount >= 2 && (
                  <div className="text-xs text-muted-foreground dark:text-gray-500 mt-1">
                    ({getOrdinalLabel(attemptCount)} try)
                  </div>
                )}
              </div>
              
              {/* Column Headers */}
              {cols.map((col, colIndex) => {
                // Corner radius for column headers
                const isTopRightHeader = colIndex === cols.length - 1;
                const headerRadius = isTopRightHeader ? 'rounded-tr-2xl' : '';
                
                // Find the corresponding team for logo display
                const teamForHeader = col.type === 'team' ? teams.find(t => t.tid === col.tid) : null;
                
                return (
                  <div 
                    key={col.key} 
                    className={cn(
                      "aspect-square bg-secondary dark:bg-slate-700 p-2 md:p-3 overflow-hidden",
                      headerRadius
                    )}
                    data-testid={`header-col-${col.key}`}
                    title={teamForHeader ? `${teamForHeader.region || ''} ${teamForHeader.name}`.trim() : col.label}
                  >
                    {teamForHeader ? (
                      <TeamLogo team={teamForHeader} />
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
                    
                    return (
                      <div 
                        key={`${row.key}-header`}
                        className={cn(
                          "aspect-square bg-secondary dark:bg-slate-700 p-2 md:p-3 overflow-hidden",
                          rowIndex === rows.length - 1 ? 'rounded-bl-2xl' : ''
                        )}
                        data-testid={`header-row-${row.key}`}
                        title={teamForHeader ? `${teamForHeader.region || ''} ${teamForHeader.name}`.trim() : row.label}
                      >
                        {teamForHeader ? (
                          <TeamLogo team={teamForHeader} />
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
                    const cellContent = getCellContent(row.key, col.key);
                    
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
                        key={`${row.key}-${col.key}`}
                        className={cn(
                          'aspect-square w-full flex items-center justify-center text-center relative overflow-hidden transition-all duration-200 hover:brightness-110 hover:contrast-110 hover:shadow-md',
                          cornerRadius,
                          cellContent.className
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onCellClick(row.key, col.key);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onCellClick(row.key, col.key);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onCellClick(row.key, col.key);
                          }
                        }}
                        disabled={cellContent.disabled}
                        aria-disabled={cellContent.disabled}
                        tabIndex={0}
                        role="button"
                        style={{ 
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                          userSelect: 'none'
                        }}
                        data-testid={`cell-${row.key}-${col.key}`}
                      >
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
                                const cellKey = getCellKey(row.key, col.key);
                                const cellState = cells[cellKey];
                                return cellState?.correct && cellState?.rarity && (
                                  <div className="absolute top-1 left-1 z-10">
                                    <RarityChip value={cellState.rarity} />
                                  </div>
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

      

      
    </div>
  );
}
