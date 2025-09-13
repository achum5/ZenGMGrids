import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
    if (eligiblePlayerIds.length === 0) {
      toast({
        title: 'No eligible players for this square.',
        variant: 'destructive',
      });
      onClose();
      return;
    }

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
  const handlePlayerSelect = (option: HintOption) => {
    if (option.isIncorrect) {
      return; // Don't allow re-clicking incorrect options
    }

    // For both correct and incorrect choices - submit the guess and close modal
    onSelectPlayer(option.player);
    onClose();
  };

  // Handle reshuffle
  const handleReshuffle = () => {
    onReshuffle(cellKey);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  // Render constraint header
  const renderConstraintHeader = (constraint: CatTeam) => {
    if (constraint.type === 'team') {
      const team = teams.find(t => t.tid === constraint.tid);
      return (
        <div className="flex items-center gap-2" data-testid={`constraint-team-${constraint.tid}`}>
          <TeamLogo team={team} className="w-6 h-6" />
          <span className="text-sm font-medium">{constraint.label}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2" data-testid={`constraint-achievement-${constraint.achievementId}`}>
          <Badge variant="secondary" className="text-xs">
            {constraint.label}
          </Badge>
        </div>
      );
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] flex flex-col p-0"
        onKeyDown={handleKeyDown}
        data-testid="modal-hint"
      >
        <DialogHeader className="border-b border-border p-6 pb-4">
          <DialogTitle className="text-xl font-semibold">Hint mode</DialogTitle>
          
          {/* Category headers */}
          <div className="flex flex-col gap-3 mt-4">
            <div className="text-sm text-muted-foreground">Categories for this square:</div>
            <div className="flex flex-wrap items-center gap-4">
              {renderConstraintHeader(rowConstraint)}
              <span className="text-muted-foreground">×</span>
              {renderConstraintHeader(colConstraint)}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 overflow-y-auto">
          {isGenerating ? (
            // Loading state
            <div className="space-y-4" data-testid="loading-hints">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg space-y-3">
                    <Skeleton className="w-16 h-16 rounded-full mx-auto" />
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          ) : hintResult ? (
            // Player options grid
            <div className="space-y-4">
              {hintResult.hasLimitedOptions && (
                <div className="text-sm text-amber-600 dark:text-amber-400 text-center" data-testid="text-limited-options">
                  Limited options available for this square.
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-hint-options">
                {hintResult.options.map((option, index) => (
                  <Button
                    key={option.player.pid}
                    variant="outline"
                    className={cn(
                      "h-auto p-4 flex flex-col items-center gap-3 transition-all duration-200",
                      option.isIncorrect
                        ? "border-red-500 bg-red-50 dark:bg-red-950/30 cursor-not-allowed opacity-75"
                        : "hover:border-primary hover:bg-accent/50 hover:scale-105 focus:ring-2 focus:ring-primary"
                    )}
                    onClick={() => handlePlayerSelect(option)}
                    disabled={option.isIncorrect}
                    data-testid={`button-hint-player-${option.player.pid}`}
                  >
                    <div className="w-16 h-16 flex-shrink-0">
                      <PlayerFace 
                        player={option.player} 
                        className="w-full h-full rounded-full"
                      />
                    </div>
                    
                    <div className="text-center min-h-[2.5rem] flex items-center">
                      <span className="text-sm font-medium leading-tight">
                        {option.player.name}
                      </span>
                    </div>
                    
                    {option.isIncorrect && (
                      <div className="text-xs text-red-600 dark:text-red-400 text-center" data-testid={`text-incorrect-${option.player.pid}`}>
                        Not a match for this square
                      </div>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <Separator />

        {/* Footer */}
        <div className="p-6 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Choose the correct player for this square.
            </div>
            
            <div className="flex items-center gap-3">
              {hintResult?.canReshuffle && reshuffleCount < 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReshuffle}
                  disabled={isGenerating}
                  className="text-primary hover:text-primary-foreground"
                  data-testid="button-reshuffle"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  New options
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                data-testid="button-close-hint"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}