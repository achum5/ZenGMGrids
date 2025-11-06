import { useState, useEffect } from 'react';
import { X, History, Trophy, Filter, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { loadLeagueGridFilterThreshold, saveLeagueGridFilterThreshold, type GridHistoryEntry } from '@/lib/grid-history';

interface GridHistoryModalProps {
  open: boolean;
  onClose?: () => void; // Deprecated: use onCloseTop and onCloseAll instead
  onCloseTop?: () => void; // Close only this modal (X button)
  onCloseAll?: () => void; // Close all modals (backdrop)
  stackIndex?: number; // Position in modal stack for z-index layering
  history: GridHistoryEntry[];
  onGameClick?: (entry: GridHistoryEntry) => void; // Callback when a grid is selected
  onDeleteHistory?: () => void; // Callback to delete all history for current league
  onDeleteBelowThreshold?: (threshold: number) => void; // Callback to delete history below score threshold
  leagueFingerprintId?: string; // League fingerprint ID for saving filter settings per league
}

export function GridHistoryModal({
  open,
  onClose,
  onCloseTop,
  onCloseAll,
  stackIndex = 0,
  history,
  onGameClick,
  onDeleteHistory,
  onDeleteBelowThreshold,
  leagueFingerprintId
}: GridHistoryModalProps) {
  const [scoreThreshold, setScoreThreshold] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExpandedDelete, setShowExpandedDelete] = useState(false);
  const [deleteThreshold, setDeleteThreshold] = useState(50);
  const [showThresholdDeleteConfirm, setShowThresholdDeleteConfirm] = useState(false);

  // Load saved filter threshold for this league on mount
  useEffect(() => {
    if (leagueFingerprintId) {
      const savedThreshold = loadLeagueGridFilterThreshold(leagueFingerprintId);
      setScoreThreshold(savedThreshold);
    }
  }, [leagueFingerprintId]);

  // Save filter threshold when it changes
  useEffect(() => {
    if (leagueFingerprintId) {
      saveLeagueGridFilterThreshold(leagueFingerprintId, scoreThreshold);
    }
  }, [scoreThreshold, leagueFingerprintId]);

  // Handle backward compatibility
  const handleCloseTop = onCloseTop || onClose || (() => {});
  const handleCloseAll = onCloseAll || onClose || (() => {});

  if (!open) return null;

  // Sort history by date (most recent first) and filter by score threshold
  // Also filter out entries where player gave up without making any guesses (creates broken state)
  const sortedHistory = [...history]
    .filter(entry => {
      // Filter by score threshold
      if (entry.score < scoreThreshold) return false;

      // Filter out gave-up grids with no guesses (broken/unclickable)
      if (entry.usedGiveUp && entry.correctGuesses === 0) return false;

      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Helper to get ordinal suffix
  const getOrdinal = (n: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = n % 100;
    return n + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100000 + (stackIndex * 10),
        backdropFilter: 'blur(10px) brightness(0.8)',
        WebkitBackdropFilter: 'blur(10px) brightness(0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={handleCloseAll}
    >
      <div
        className="rainbow-border rounded-lg p-[2px] w-full max-w-2xl"
        style={{ height: '80vh', maxHeight: '700px' }}
      >
        <div
          className="relative w-full h-full bg-card rounded-lg shadow-xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Grid History</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter Button */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <button
                  className="p-2 hover:bg-accent rounded-lg transition-colors relative"
                  aria-label="Filter history"
                >
                  <Filter className="h-5 w-5" />
                  {scoreThreshold > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-[10px] text-primary-foreground font-bold">
                        {scoreThreshold}
                      </span>
                    </div>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80"
                style={{ zIndex: 100000 + (stackIndex * 10) + 50 }}
                align="end"
                side="bottom"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Filter by Score</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        Minimum Score:
                      </span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={scoreThreshold}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setScoreThreshold(Math.max(0, val));
                          }}
                          className="w-24 h-8 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          style={{ MozAppearance: 'textfield' } as React.CSSProperties}
                        />
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => setScoreThreshold(prev => prev + 5)}
                            className="p-0.5 hover:bg-accent rounded transition-colors"
                            aria-label="Increment by 5"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setScoreThreshold(prev => Math.max(0, prev - 5))}
                            className="p-0.5 hover:bg-accent rounded transition-colors"
                            aria-label="Decrement by 5"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {onDeleteHistory && (
                    <div className="pt-2 border-t space-y-2">
                      {!showDeleteConfirm ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex-1"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete All History
                          </Button>
                          {onDeleteBelowThreshold && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setShowExpandedDelete(!showExpandedDelete)}
                              className="px-2"
                            >
                              {showExpandedDelete ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2 text-destructive" />
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              onDeleteHistory();
                              setShowDeleteConfirm(false);
                              setFilterOpen(false);
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Confirm
                          </Button>
                        </div>
                      )}

                      {/* Expanded delete options */}
                      {showExpandedDelete && onDeleteBelowThreshold && (
                        <div className="space-y-2 pt-2 border-t">
                          {!showThresholdDeleteConfirm ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                  Delete below:
                                </span>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={deleteThreshold}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      setDeleteThreshold(Math.max(0, val));
                                    }}
                                    className="w-24 h-8 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    style={{ MozAppearance: 'textfield' } as React.CSSProperties}
                                  />
                                  <div className="flex flex-col gap-0.5">
                                    <button
                                      onClick={() => setDeleteThreshold(prev => prev + 5)}
                                      className="p-0.5 hover:bg-accent rounded transition-colors"
                                      aria-label="Increment by 5"
                                    >
                                      <ChevronUp className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteThreshold(prev => Math.max(0, prev - 5))}
                                      className="p-0.5 hover:bg-accent rounded transition-colors"
                                      aria-label="Decrement by 5"
                                    >
                                      <ChevronDown className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                <span className="text-sm text-muted-foreground">pts</span>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setShowThresholdDeleteConfirm(true)}
                                className="w-full"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Below {deleteThreshold}
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowThresholdDeleteConfirm(false)}
                                className="flex-1"
                              >
                                <X className="h-4 w-4 mr-2 text-destructive" />
                                Cancel
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  onDeleteBelowThreshold(deleteThreshold);
                                  setShowThresholdDeleteConfirm(false);
                                  setShowExpandedDelete(false);
                                  setFilterOpen(false);
                                }}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Confirm
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Close Button */}
            <button
              onClick={handleCloseTop}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              aria-label="Close history"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedHistory.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              {history.length === 0 ? (
                <>
                  <p className="text-lg text-muted-foreground">No grids completed yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Complete a grid to see it here!
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg text-muted-foreground">No grids match filter</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try lowering the score threshold
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedHistory.map((entry) => {
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('History entry clicked:', entry);
                      onGameClick?.(entry);
                    }}
                    className="w-full text-center rounded-xl border-2 p-4 transition-all hover:scale-[1.01] hover:shadow-lg bg-card hover:bg-accent/50 cursor-pointer"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl font-bold text-primary">
                        Score: {entry.score}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
