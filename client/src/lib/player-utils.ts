import type { Player } from '@/types/bbgm';

export function getPlayerFranchiseCount(player: Player): number {
  if (!player.stats) return 0;
  const franchiseIds = new Set<number>();
  for (const stat of player.stats) {
    if (stat.tid !== undefined && stat.tid !== -1 && !stat.playoffs && (stat.gp || 0) > 0) {
      franchiseIds.add(stat.tid);
    }
  }
  return franchiseIds.size;
}
