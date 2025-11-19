import { useState, useEffect } from 'react';
import { X, History, Trophy, Filter, Trash2, Check, ChevronDown, ChevronUp, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import type { ScoreSummaryData } from '@/components/ScoreSummaryModal';
import type { Player } from '@/types/bbgm';
import { loadLeagueFilterThreshold, saveLeagueFilterThreshold, exportGameHistory, importGameHistory } from '@/lib/game-history-idb';

export interface HistoryEntry {
  id: string; // Unique ID (timestamp)
  date: string; // ISO date string
  season: number;
  teamName: string;
  teamAbbrev: string;
  teamLogo?: string;
  teamColors?: string[];
  sport: string;
  score: number;
  summaryData: ScoreSummaryData; // Full breakdown data
}

interface HistoryModalProps {
  open: boolean;
  onClose?: () => void; // Deprecated: use onCloseTop and onCloseAll instead
  onCloseTop?: () => void; // Close only this modal (X button)
  onCloseAll?: () => void; // Close all modals (backdrop)
  stackIndex?: number; // Position in modal stack for z-index layering
  history: HistoryEntry[];
  onGameClick?: (entry: HistoryEntry) => void; // Callback when a game is selected
  onPlayerClick?: (player: Player) => void;
  onTeamInfoClick?: (season: number, sport: string) => void;
  onDeleteHistory?: () => void; // Callback to delete all history for current league
  onDeleteBelowThreshold?: (threshold: number) => void; // Callback to delete history below score threshold
  onImportComplete?: () => void; // Callback after successful import to reload history
  leagueFingerprintId?: string; // League fingerprint ID for saving filter settings per league
}

// Helper to get contrast color
function getContrastColor(hexColor: string): 'white' | 'black' {
  if (!hexColor || hexColor.length < 6) return 'white';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'black' : 'white';
}

export function HistoryModal({
  open,
  onClose,
  onCloseTop,
  onCloseAll,
  stackIndex = 0,
  history,
  onGameClick,
  onPlayerClick,
  onTeamInfoClick,
  onDeleteHistory,
  onDeleteBelowThreshold,
  onImportComplete,
  leagueFingerprintId
}: HistoryModalProps) {
  const [scoreThreshold, setScoreThreshold] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExpandedDelete, setShowExpandedDelete] = useState(false);
  const [deleteThreshold, setDeleteThreshold] = useState(50);
  const [showThresholdDeleteConfirm, setShowThresholdDeleteConfirm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportCode, setExportCode] = useState('');

  // Load saved filter threshold for this league on mount
  useEffect(() => {
    let mounted = true;

    async function loadThreshold() {
      if (leagueFingerprintId) {
        const savedThreshold = await loadLeagueFilterThreshold(leagueFingerprintId);
        if (mounted) {
          setScoreThreshold(savedThreshold);
        }
      }
    }

    loadThreshold();

    return () => {
      mounted = false;
    };
  }, [leagueFingerprintId]);

  // Save filter threshold when it changes
  useEffect(() => {
    if (leagueFingerprintId) {
      saveLeagueFilterThreshold(leagueFingerprintId, scoreThreshold);
    }
  }, [scoreThreshold, leagueFingerprintId]);

  // Handle backward compatibility
  const handleCloseTop = onCloseTop || onClose || (() => {});
  const handleCloseAll = onCloseAll || onClose || (() => {});

  // Export handler
  const handleExport = async () => {
    try {
      const code = await exportGameHistory(leagueFingerprintId);

      // Try clipboard first
      try {
        await navigator.clipboard.writeText(code);
        setImportMessage({ type: 'success', text: 'Export code copied to clipboard!' });
        setTimeout(() => setImportMessage(null), 3000);
      } catch (clipboardError) {
        // Clipboard failed - show dialog with code instead
        console.warn('Clipboard API failed, showing export dialog:', clipboardError);
        setExportCode(code);
        setShowExportDialog(true);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setImportMessage({ type: 'error', text: 'Failed to export history' });
      setTimeout(() => setImportMessage(null), 3000);
    }
  };

  // Import handler
  const handleImport = async () => {
    if (!importCode.trim()) {
      setImportMessage({ type: 'error', text: 'Please enter an import code' });
      return;
    }

    const result = await importGameHistory(importCode);
    if (result.success) {
      setImportMessage({
        type: 'success',
        text: `Imported ${result.imported} game${result.imported !== 1 ? 's' : ''}${result.skipped > 0 ? ` (${result.skipped} skipped as duplicates)` : ''}`
      });
      setImportCode('');
      setTimeout(() => {
        setShowImportDialog(false);
        setImportMessage(null);
        // Notify parent to reload history
        if (onImportComplete) {
          onImportComplete();
        }
      }, 2000);
    } else {
      setImportMessage({ type: 'error', text: result.error || 'Failed to import history' });
    }
  };

  if (!open) return null;

  // Sort history by date (most recent first) and filter by score threshold
  const sortedHistory = [...history]
    .filter(entry => entry.score >= scoreThreshold)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
        className="relative w-full max-w-2xl bg-card rounded-lg shadow-xl flex flex-col overflow-hidden"
        style={{ height: '80vh', maxHeight: '700px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Game History</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Export Button */}
            <button
              onClick={handleExport}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              aria-label="Export history"
              title="Export history to code"
            >
              <Download className="h-5 w-5" />
            </button>

            {/* Import Button */}
            <button
              onClick={() => setShowImportDialog(true)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              aria-label="Import history"
              title="Import history from code"
            >
              <Upload className="h-5 w-5" />
            </button>

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
                  <p className="text-lg text-muted-foreground">No games played yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Complete a game to see it here!
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg text-muted-foreground">No games match filter</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try lowering the score threshold
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedHistory.map((entry) => {
                const primaryColor = entry.teamColors?.[0] || '#1d4ed8';
                const secondaryColor = entry.teamColors?.[1] || '#3b82f6';
                const textColor = getContrastColor(primaryColor);
                // Extract nickname (last word of team name)
                const teamNickname = entry.teamName.split(' ').pop() || entry.teamName;

                return (
                  <button
                    key={entry.id}
                    onClick={() => onGameClick?.(entry)}
                    className="w-full text-left rounded-xl border-2 p-4 transition-all hover:scale-[1.02] hover:shadow-lg"
                    style={{
                      backgroundColor: primaryColor,
                      borderColor: secondaryColor,
                      color: secondaryColor,
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {entry.teamLogo && (
                          <img
                            src={entry.teamLogo}
                            alt={entry.teamAbbrev}
                            className="h-10 w-10 object-contain shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-lg" style={{ color: secondaryColor }}>
                              {entry.season}
                            </span>
                            <span className="font-bold text-lg" style={{ color: secondaryColor }}>
                              {teamNickname}
                            </span>
                          </div>
                          <p
                            className="text-sm"
                            style={{
                              color: secondaryColor,
                              opacity: 0.7
                            }}
                          >
                            {new Date(entry.date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className="text-2xl font-bold"
                          style={{ color: secondaryColor }}
                        >
                          {entry.score}
                        </div>
                        <div
                          className="text-xs"
                          style={{
                            color: secondaryColor,
                            opacity: 0.7
                          }}
                        >
                          points
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Success/Error Message */}
        {importMessage && (
          <div
            className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg ${
              importMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
            style={{ zIndex: 100000 + (stackIndex * 10) + 100 }}
          >
            {importMessage.text}
          </div>
        )}
      </div>

      {/* Import Dialog */}
      {showExportDialog && (
        <div
          className="absolute inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 100000 + (stackIndex * 10) + 50 }}
          onClick={() => setShowExportDialog(false)}
        >
          <div
            className="bg-card rounded-lg shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Export Code</h3>
              <button
                onClick={() => setShowExportDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Copy this code to import your history on another device. Click the text area and press Ctrl+A (Cmd+A on Mac) to select all, then Ctrl+C (Cmd+C) to copy.
            </p>
            <Textarea
              value={exportCode}
              readOnly
              className="mb-4 min-h-[120px] font-mono text-xs"
              onClick={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.select();
              }}
            />
            <Button
              onClick={() => setShowExportDialog(false)}
              className="w-full"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {showImportDialog && (
        <div
          className="absolute inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 100000 + (stackIndex * 10) + 50 }}
          onClick={() => setShowImportDialog(false)}
        >
          <div
            className="bg-card rounded-lg shadow-xl p-6 w-full max-w-md"
            style={{ border: '3px solid #3b82f6' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Import History</h3>
              <button
                onClick={() => setShowImportDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Paste the export code from another device to import game history.
            </p>
            <Textarea
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              placeholder="Paste export code here..."
              className="mb-4 min-h-[120px] font-mono text-xs"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => setShowImportDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                className="flex-1"
              >
                Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
