import { PlayerFaceShared } from '@/components/PlayerFaceShared';
import type { Player, Team } from '@/types/bbgm';

interface PlayerFaceTileProps {
  player: Player;
  teams: Team[];
  sport?: string;
  season?: number;
}

/**
 * Tile-specific wrapper for PlayerFaceShared.
 * Uses the same rendering logic as the modal but with tile-optimized sizing.
 * Name is handled by parent component to allow for reveal/hint logic.
 */
export function PlayerFaceTile({ player, teams, sport, season }: PlayerFaceTileProps) {
  return (
    <PlayerFaceShared
      player={player}
      teams={teams}
      sport={sport}
      season={season}
      className="h-full"
      svgClassName="translate-x-[-20px] scale-90 sm:translate-x-[-24px]"
    />
  );
}
