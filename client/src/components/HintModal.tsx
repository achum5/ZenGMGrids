import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X } from 'lucide-react';
import { PlayerFace } from '@/components/PlayerFace';
import { TeamLogo } from '@/components/TeamLogo';
import { cn } from '@/lib/utils';
import type { Player, CatTeam, Team, LeagueData } from '@/types/bbgm';
import type { SeasonIndex } from '@/lib/season-achievements';
import { generateHintOptions, type HintOption, type HintGenerationResult } from '@/lib/hint-generation';
import { playerMeetsAchievement } from '@/lib/achievements';
import { useToast } from '@/hooks/use-toast';

// Helper function to create test functions for constraints if missing
function createTestFunction(constraint: CatTeam, seasonIndex?: SeasonIndex): (player: Player) => boolean {
  if (constraint.type === 'team') {
    return (player: Player) => player.teamsPlayed.has(constraint.tid!);
  } else {
    const achievementId = constraint.achievementId!;
    
    // Handle season statistical achievements that need special logic
    if (achievementId.startsWith('Season') && achievementId !== 'Season250ThreePM') {
      return (player: Player) => {
        // Check if player has any seasons that meet the criteria
        for (const seasonStats of player.stats || []) {
          if (seasonStats.playoffs) continue; // Only regular season
          
          const gp = seasonStats.gp || 0;
          const pts = seasonStats.pts || 0;
          const trb = seasonStats.trb || 0;
          const ast = seasonStats.ast || 0;
          const stl = seasonStats.stl || 0;
          const blk = seasonStats.blk || 0;
          const tp = seasonStats.tp || 0;
          const min = seasonStats.min || 0;
          
          switch (achievementId) {
            case 'Season30PPG':
              if (gp >= 50 && (pts / gp) >= 30.0) return true;
              break;
            case 'Season70Games':
              if (gp >= 70) return true;
              break;
            case 'Season1_1_1':
              if (gp >= 50 && (stl / gp) >= 1 && (blk / gp) >= 1 && (tp / gp) >= 1) return true;
              break;
            // Add more season achievements as needed
          }
        }
        return false;
      };
    }
    
    // For other achievements, use the standard test
    return (player: Player) => playerMeetsAchievement(player, achievementId, seasonIndex);
  }
}

interface HintModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPlayer: (player: Player, isFromHintModal: boolean) => void;
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
  onHintGenerated?: (cellKey: string, suggestedPlayerPid: number) => void;
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
  onReshuffle,
  onHintGenerated
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
      
      
      // Step 1: Get the most common correct answer from top 10th percentile
      let eligiblePlayers = eligiblePlayerIds.map(pid => byPid[pid]).filter(Boolean);
      
      // If cache is empty, calculate eligible players directly (fallback for broken cache cases)
      if (eligiblePlayers.length === 0 && leagueData?.players) {
        console.log(`🔧 Cache empty for ${cellKey}, calculating directly...`);
        
        // Use the exact same playerMeetsAchievement function that works in intersections
        eligiblePlayers = leagueData.players.filter(player => {
          let rowPasses = false;
          let colPasses = false;
          
          // Check row constraint
          if (rowConstraint.type === 'team') {
            rowPasses = player.teamsPlayed.has(rowConstraint.tid!);
          } else {
            rowPasses = playerMeetsAchievement(player, rowConstraint.achievementId!, leagueData.seasonIndex);
          }
          
          // Check column constraint  
          if (colConstraint.type === 'team') {
            colPasses = player.teamsPlayed.has(colConstraint.tid!);
          } else {
            colPasses = playerMeetsAchievement(player, colConstraint.achievementId!, leagueData.seasonIndex);
          }
          
          return rowPasses && colPasses;
        });
        console.log(`   Direct calculation found ${eligiblePlayers.length} players`);
      }
      
      if (eligiblePlayers.length === 0) {
        setHintResult({
          options: [],
          hasLimitedOptions: true
        });
        setIsGenerating(false);
        return;
      }
      
      // Sort by commonality (total career games played as a proxy for how "common" they are)
      const sortedByCommonality = eligiblePlayers.sort((a, b) => {
        const aGames = (a.stats || []).reduce((total, season) => total + (season.gp || 0), 0);
        const bGames = (b.stats || []).reduce((total, season) => total + (season.gp || 0), 0);
        return bGames - aGames; // Descending order
      });
      
      // Pick from top 10th percentile (minimum 1 player)
      const topPercentileCount = Math.max(1, Math.floor(sortedByCommonality.length * 0.1));
      const topPercentilePlayers = sortedByCommonality.slice(0, topPercentileCount);
      const correctPlayer = topPercentilePlayers[Math.floor(Math.random() * topPercentilePlayers.length)];
      
      
      // Step 2: Generate 5 distractors
      const distractors: Player[] = [];
      const allPlayersList = allPlayers.filter(p => !usedPids.has(p.pid) && p.pid !== correctPlayer.pid);
      
      // Try to find players with partial matches first
      const partialMatches = allPlayersList.filter(player => {
        const rowTest = rowConstraint.test || createTestFunction(rowConstraint, leagueData?.seasonIndex);
        const colTest = colConstraint.test || createTestFunction(colConstraint, leagueData?.seasonIndex);
        
        const hasRow = rowTest(player);
        const hasCol = colTest(player);
        
        // Want players with exactly one match (partial match)
        return (hasRow && !hasCol) || (!hasRow && hasCol);
      });
      
      // Add up to 3 partial matches
      const shuffledPartials = partialMatches.sort(() => Math.random() - 0.5);
      distractors.push(...shuffledPartials.slice(0, 3));
      
      // Fill remaining slots with players from similar time period
      if (distractors.length < 5) {
        const correctPlayerSeasons = correctPlayer.stats?.map(s => s.season) || [];
        const minSeason = Math.min(...correctPlayerSeasons);
        const maxSeason = Math.max(...correctPlayerSeasons);
        
        const contemporaries = allPlayersList
          .filter(player => {
            const playerSeasons = player.stats?.map(s => s.season) || [];
            const playerMinSeason = Math.min(...playerSeasons);
            const playerMaxSeason = Math.max(...playerSeasons);
            
            // Overlapping careers (±10 years buffer)
            return (playerMaxSeason >= minSeason - 10 && playerMinSeason <= maxSeason + 10);
          })
          .filter(player => !distractors.some(d => d.pid === player.pid))
          .sort(() => Math.random() - 0.5);
        
        const needed = 5 - distractors.length;
        distractors.push(...contemporaries.slice(0, needed));
      }
      
      // If still need more, add any random players
      if (distractors.length < 5) {
        const remainingPlayers = allPlayersList
          .filter(player => !distractors.some(d => d.pid === player.pid))
          .sort(() => Math.random() - 0.5);
        
        const needed = 5 - distractors.length;
        distractors.push(...remainingPlayers.slice(0, needed));
      }
      
      // Create hint options (1 correct + up to 5 distractors)
      const allOptions = [correctPlayer, ...distractors.slice(0, 5)];
      const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
      
      const result: HintGenerationResult = {
        options: shuffledOptions.map((player) => ({
          player: player,
          isCorrect: player.pid === correctPlayer.pid
        })),
        hasLimitedOptions: eligiblePlayers.length < 10
      };
      
      setHintResult(result);
      
      // Notify parent of the suggested player (the correct answer)
      const correctOption = result.options.find(option => option.isCorrect);
      if (correctOption && onHintGenerated) {
        onHintGenerated(cellKey, correctOption.player.pid);
      }
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

  // Handle player selection - mark as coming from hint modal
  const handlePlayerSelect = (player: Player) => {
    console.log('Player selected from hint modal:', player.name);
    onSelectPlayer(player, true);
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