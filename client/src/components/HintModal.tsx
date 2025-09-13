import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X } from 'lucide-react';
import { PlayerFace } from '@/components/PlayerFace';
import { TeamLogo } from '@/components/TeamLogo';
import { cn } from '@/lib/utils';
import type { Player, CatTeam, Team, LeagueData } from '@/types/bbgm';
import { generateHintOptions, type HintOption, type HintGenerationResult } from '@/lib/hint-generation';
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
    setIsGenerating(true);
    
    try {
      // Small delay for UX
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

  // Handle player selection - simple and direct
  const handlePlayerSelect = (player: Player) => {
    console.log('Player selected:', player.name);
    onSelectPlayer(player);
    // Let parent component handle closing
  };

  // Handle reshuffle
  const handleReshuffle = () => {
    onReshuffle(cellKey);
  };

  // Render constraint (team or achievement)
  const renderConstraint = (constraint: CatTeam) => {
    if (!constraint) return null;
    
    if (constraint.type === 'team') {
      const team = teams.find(t => t.tid === constraint.tid);
      return (
        <div className="flex flex-col items-center gap-3">
          {team?.imgURL ? (
            <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0">
              <TeamLogo team={team} className="w-full h-full" />
            </div>
          ) : (
            <div className="text-center">
              <div className="text-lg md:text-xl font-bold text-foreground">{team?.region} {team?.name}</div>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="text-center max-w-64">
            <div className="text-lg md:text-xl font-bold text-foreground leading-tight">{constraint.label}</div>
          </div>
        </div>
      );
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent 
        className="max-w-4xl w-full h-[80vh] flex flex-col p-0 gap-0 bg-card [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Hint Mode</DialogTitle>
        <DialogDescription className="sr-only">Select a player that matches both constraints</DialogDescription>
        {/* Header */}
        <div className="flex-none p-4 border-b border-border/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold text-foreground text-center w-full">Hint Mode</h2>
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
          
          {/* Constraints side by side - compact but prominent */}
          <div className="grid grid-cols-2 gap-6 md:gap-8 items-center py-4 md:py-6">
            <div className="flex justify-center">
              {renderConstraint(rowConstraint)}
            </div>
            <div className="flex justify-center">
              {renderConstraint(colConstraint)}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-y-auto bg-background">
          {isGenerating ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-card rounded-xl">
                  <Skeleton className="w-full h-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : hintResult ? (
            <div>
              <div className="grid grid-cols-3 gap-3" data-testid="grid-hint-options">
              {hintResult.options.slice(0, 6).map((option) => (
                <div
                  key={option.player.pid}
                  className={cn(
                    "aspect-square bg-muted dark:bg-slate-800 rounded-lg overflow-hidden transition-all duration-200",
                    "hover:brightness-110 hover:shadow-lg hover:shadow-accent/10 hover:scale-[1.02] cursor-pointer", 
                    "border border-transparent hover:border-accent/40 hover:bg-accent/5",
                    "active:scale-[0.98] active:brightness-125 active:shadow-accent/20",
                    "flex items-center justify-center text-center relative"
                  )}
                  onClick={() => handlePlayerSelect(option.player)}
                  data-testid={`button-hint-player-${option.player.pid}`}
                >
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <PlayerFace
                      pid={option.player.pid}
                      name={option.player.name}
                      imgURL={option.player.imgURL}
                      face={option.player.face}
                      size={80}
                      player={option.player}
                      teams={teams}
                      sport={leagueData?.sport}
                    />
                  </div>
                </div>
              ))}
              </div>
              {/* Bottom instruction text */}
              <div className="text-center mt-6">
                <div className="text-lg font-medium text-foreground">Choose the correct player</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">No hint options available</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}