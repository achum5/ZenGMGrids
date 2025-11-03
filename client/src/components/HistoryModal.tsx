import { useState } from 'react';
import { X, History, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScoreSummaryModal, type ScoreSummaryData } from '@/components/ScoreSummaryModal';
import type { Player } from '@/types/bbgm';

interface HistoryEntry {
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
  onClose: () => void;
  history: HistoryEntry[];
  onPlayerClick?: (player: Player) => void;
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

export function HistoryModal({ open, onClose, history, onPlayerClick }: HistoryModalProps) {
  const [selectedGame, setSelectedGame] = useState<HistoryEntry | null>(null);

  if (!open) return null;

  // If a game is selected, show its breakdown
  if (selectedGame) {
    return (
      <ScoreSummaryModal
        open={true}
        onCloseTop={() => setSelectedGame(null)}
        onCloseAll={() => {
          setSelectedGame(null);
          onClose();
        }}
        stackIndex={1}
        data={selectedGame.summaryData}
        onPlayAgain={() => {
          // Not applicable for history
        }}
        onNewSeason={() => {
          // Not applicable for history
        }}
        onShare={() => {
          // Could implement sharing from history
        }}
        onPlayerClick={onPlayerClick}
      />
    );
  }

  // Sort history by date (most recent first)
  const sortedHistory = [...history].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-card rounded-lg shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Game History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close history"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedHistory.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">No games played yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete a game to see it here!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedHistory.map((entry) => {
                const primaryColor = entry.teamColors?.[0] || '#1d4ed8';
                const secondaryColor = entry.teamColors?.[1] || '#3b82f6';
                const textColor = getContrastColor(primaryColor);

                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedGame(entry)}
                    className="w-full text-left rounded-xl border p-4 transition-all hover:scale-[1.02] hover:shadow-lg"
                    style={{
                      backgroundColor: `${primaryColor}15`,
                      borderColor: `${secondaryColor}60`,
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
                            <span className="font-bold text-lg">{entry.season}</span>
                            <span className="font-medium truncate">{entry.teamName}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
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
                        <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                          {entry.score}
                        </div>
                        <div className="text-xs text-muted-foreground">points</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
