import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, X } from 'lucide-react';
import { PlayerFace } from '@/components/PlayerFace';
import { TeamLogo } from '@/components/TeamLogo';
import { cn } from '@/lib/utils';
import type { Player, CatTeam, Team, LeagueData } from '@/types/bbgm';
import { generateHintOptions, markOptionIncorrect, resetIncorrectMarks, type HintOption, type HintGenerationResult } from '@/lib/hint-generation';
import { useToast } from '@/hooks/use-toast';

interface HintModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPlayer: (player: Player) => void;
  cellKey: string;
  rowConstraint: CatTeam;
  colConstraint: CatTeam;
  eligiblePlayerIds: number[];
  allPlayers: Player[];
  byPid: Record<number, Player>;
  teams: Team[];
  usedPids: Set<number>;
  gridId: string;
  leagueData?: LeagueData;
  reshuffleCount: number;
  onReshuffle: (cellKey: string) => void;
}

export function HintModal({
  open,
  onClose,
  onSelectPlayer,
  cellKey,
  rowConstraint,
  colConstraint,
  eligiblePlayerIds,
  allPlayers,
  byPid,
  teams,
  usedPids,
  gridId,
  leagueData,
  reshuffleCount,
  onReshuffle
}: HintModalProps) {
  const { toast } = useToast();
  const [hintResult, setHintResult] = useState<HintGenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate hints when modal opens or reshuffle is requested
  const generateHints = useCallback(async () => {
    // Note: We always generate hints even with 0 eligible players (will create dummies)

    setIsGenerating(true);
    
    try {
      // Simulate slight delay for UX if generation is very fast
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = generateHintOptions(
        gridId,
        cellKey,
        rowConstraint,
        colConstraint,
        eligiblePlayerIds,
        allPlayers,
        byPid,
        teams,
        usedPids,
        reshuffleCount,
        leagueData
      );

      // Reset incorrect marks for new generation
      result.options = resetIncorrectMarks(result.options);
      
      setHintResult(result);
    } catch (error) {
      console.error('Error generating hints:', error);
      toast({
        title: 'Error generating hint options',
        description: 'Please try again',
        variant: 'destructive',
      });
      onClose();
    } finally {
      setIsGenerating(false);
    }
  }, [gridId, cellKey, rowConstraint, colConstraint, eligiblePlayerIds, allPlayers, byPid, teams, usedPids, reshuffleCount, leagueData, toast, onClose]);

  // Generate hints when modal opens or reshuffle count changes
  useEffect(() => {
    if (open) {
      generateHints();
    }
  }, [open, reshuffleCount, generateHints]);

  // Handle player selection
  const handlePlayerSelect = useCallback((option: HintOption) => {
    if (option.isIncorrect) {
      return; // Don't allow re-clicking incorrect options
    }

    // For both correct and incorrect choices - submit the guess and close modal
    onSelectPlayer(option.player);
    onClose();
  }, [onSelectPlayer, onClose]);


  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  // Render any constraint (team or achievement)
  const renderConstraint = (constraint: CatTeam, side: 'left' | 'right') => {
    if (!constraint) return null;
    
    if (constraint.type === 'team') {
      const team = teams.find(t => t.tid === constraint.tid);
      return (
        <div className="flex flex-col items-center gap-3" data-testid={`constraint-team-${constraint.tid}`}>
          <div className="w-20 h-20 flex-shrink-0">
            <TeamLogo team={team!} className="w-full h-full" />
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col justify-center items-center" data-testid={`constraint-achievement-${constraint.achievementId}`}>
          <div className="w-20 h-20 flex items-center justify-center">
            <div className="text-xl font-bold text-foreground leading-tight text-center">
              {constraint.label}
            </div>
          </div>
        </div>
      );
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-4xl max-w-[95vw] max-h-[90vh] flex flex-col p-0 bg-background border-border [&>button]:hidden"
        onKeyDown={handleKeyDown}
        data-testid="modal-hint"
      >
        {/* Header with both constraints side by side, controls in top */}
        <div className="border-b border-border p-6">
          <DialogHeader className="sr-only">
            <DialogTitle>Hint Mode</DialogTitle>
            <DialogDescription>Choose a player that matches both constraints.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Hint mode</h2>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground hover:bg-muted"
                data-testid="button-close-hint"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Both constraints side by side */}
          <div className="grid grid-cols-2 gap-8 items-center">
            <div className="flex justify-center">
              {renderConstraint(rowConstraint, 'left')}
            </div>
            <div className="flex justify-center">
              {renderConstraint(colConstraint, 'right')}
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 p-6 overflow-y-auto bg-background">
          {isGenerating ? (
            // Loading state
            <div className="space-y-4" data-testid="loading-hints">
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-[4/5] bg-card rounded-xl space-y-3 p-4">
                    <Skeleton className="w-full h-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ) : hintResult ? (
            // Player options grid - always 3x2 layout
            <div className="space-y-6">
              
              <div className="grid grid-cols-3 gap-4" data-testid="grid-hint-options">
                {hintResult.options.slice(0, 6).map((option, index) => (
                  <button
                    key={option.player.pid}
                    className={cn(
                      "aspect-square w-full flex items-center justify-center text-center relative overflow-hidden transition-all duration-200 hover:brightness-110 hover:contrast-110 hover:shadow-md",
                      "bg-muted dark:bg-slate-800 text-muted-foreground hover:bg-accent/30 dark:hover:bg-accent/20 hover:border-accent/40 dark:hover:border-accent/30 border border-transparent",
                      option.isIncorrect
                        ? "opacity-60 cursor-not-allowed"
                        : "focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:focus:ring-blue-400"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePlayerSelect(option);
                    }}
                    disabled={option.isIncorrect}
                    style={{ 
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                      userSelect: 'none'
                    }}
                    data-testid={`button-hint-player-${option.player.pid}`}
                  >
                    <div className="text-xs md:text-sm px-1 md:px-2 text-center w-full h-full flex items-center justify-center relative overflow-hidden">
                      <div className="relative w-full h-full flex items-center justify-center">
                        <PlayerFace
                          pid={option.player.pid}
                          name={option.player.name}
                          imgURL={option.player.imgURL}
                          face={option.player.face}
                          size={Math.min(80, typeof window !== 'undefined' ? Math.min(window.innerWidth / 10, window.innerHeight / 12) : 80)}
                          player={option.player}
                          teams={teams}
                          sport={leagueData?.sport}
                        />
                      </div>
                    </div>
                    
                    {/* Error overlay for incorrect answers */}
                    {option.isIncorrect && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <div className="bg-red-600 text-white text-xs px-2 py-1 rounded font-medium" data-testid={`text-incorrect-${option.player.pid}`}>
                          Not a match
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              {/* Helper text */}
              <div className="text-center text-muted-foreground text-sm mt-6">
                Choose the correct player for this square.
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}