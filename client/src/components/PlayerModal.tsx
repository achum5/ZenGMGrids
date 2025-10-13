import { useMemo } from 'react';
import type { Player, Team, CatTeam } from '@/types/bbgm';
import { computeRarityForGuess, playerToEligibleLite } from '@/lib/rarity';
import { generateReasonBullets } from '@/lib/reason-bullets';
import { getAllAchievements, getCachedSportDetection, getCachedLeagueYears } from '@/lib/achievements';
import { getCachedSeasonIndex } from '@/lib/season-index-cache';
import { CareerTeamLogo, checkAllTeamsHaveLogos } from '@/components/CareerTeamLogo';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getRarityTier, rarityBadgeStyles } from '@/components/RarityChip';
import { PlayerFace } from '@/components/PlayerFace';
import { ResponsiveText } from '@/components/ResponsiveText';

interface PlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player;
  rowConstraint: CatTeam;
  colConstraint: CatTeam;
  eligiblePlayers: Player[];
  puzzleSeed: string;
  rows: CatTeam[];
  cols: CatTeam[];
  teams: Team[];
  sport?: string;
}

// Helper function to get team name at a specific season
function teamNameAtSeason(teamsByTid: Map<number, Team>, tid: number, season: number): string {
  const team = teamsByTid.get(tid);
  if (!team) {
    return `Team ${tid}`;
  }
  return `${team.region} ${team.name}`;
}

export function PlayerModal({
  open,
  onOpenChange,
  player,
  rowConstraint,
  colConstraint,
  eligiblePlayers,
  puzzleSeed,
  rows,
  cols,
  teams,
  sport,
}: PlayerModalProps) {
  const modalData = useMemo(() => {
    try {
      const currentSport = sport || getCachedSportDetection() || 'basketball';
      const leagueYears = getCachedLeagueYears();
      const seasonIndex = getCachedSeasonIndex(eligiblePlayers as Player[], currentSport as ('basketball' | 'football' | 'hockey' | 'baseball'));

      // Create team lookup map for efficient lookups - defensive check for teams array
      const teamsByTid = new Map(Array.isArray(teams) ? teams.map(t => [t.tid, t]) : []);

      const isCorrectGuess = eligiblePlayers.some(p => p.pid === player.pid);

      const reasonBullets = generateReasonBullets(
        player,
        rowConstraint,
        colConstraint,
        Array.isArray(teams) ? teams : [],
        currentSport
      );

      if (isCorrectGuess) {
        // Calculate rarity for correct guesses
        const eligiblePool = eligiblePlayers.map(p => playerToEligibleLite(p));
        const rarity = computeRarityForGuess(player, rowConstraint, colConstraint, eligiblePool, {
          teams: new Map(Array.isArray(teams) ? teams.map(t => [t.tid, t]) : [])
        });

        return {
          type: 'correct' as const,
          rarity,
          reasonBullets
        };
      } else {
        return {
          type: 'wrong' as const,
          reasonBullets
        };
      }
    } catch (error) {
      console.error('Error in PlayerModal modalData calculation:', error);
      return null;
    }
  }, [player.pid, puzzleSeed, rowConstraint, colConstraint, eligiblePlayers, rows, cols, teams, sport]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[92vw] max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden" data-testid="modal-player-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayerFace
              player={player}
              sport={sport}
              className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
            />
            <ResponsiveText minSize={18} maxSize={28} text={player.name} className="font-bold leading-tight" />
          </DialogTitle>
          <DialogDescription>
            Player details including career statistics, achievements, and team history.
          </DialogDescription>

          {modalData && (
            <div className="mt-2">
              {modalData.type === 'correct' && modalData.rarity !== undefined && (
                (() => {
                  const rarityTier = getRarityTier(modalData.rarity);
                  const styles = rarityStyles[rarityTier];

                  return (
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles.bgColor} ${styles.textColor} ${styles.borderColor}`}>
                      Score: {modalData.rarity}
                    </span>
                  );
                })()
              )}

              {modalData.type === 'wrong' && (
                 <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300 leading-5 font-semibold">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <span>Incorrect Guess</span>
                </div>
              )}

              {modalData.reasonBullets && modalData.reasonBullets.length > 0 && (
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {modalData.reasonBullets.map((bullet, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>{bullet.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="mt-4 flex-1 overflow-y-auto min-h-0 space-y-4">
          {/* Player details content */}
        </div>
      </DialogContent>
    </Dialog>
  );
}