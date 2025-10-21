import { openDB, type IDBPDatabase } from 'idb';
import type { Player, Team } from '@/types/bbgm';
import type { CatTeam } from './grid-generator';

const DB_NAME = 'grids-league';
const DB_VERSION = 5;

/**
 * Pre-compute and store all possible team pair intersections
 * This makes grid generation instant by avoiding iteration through all players
 */
export async function preComputeTeamIntersections(
  players: Player[],
  teams: Team[],
  onProgress?: (message: string) => void
): Promise<void> {
  const db = await openDB(DB_NAME, DB_VERSION);
  
  try {
    onProgress?.('Pre-computing team intersections...');
    
    // Build team test functions (tid-based)
    const teamTests = teams.map(team => ({
      tid: team.tid,
      test: (p: Player) => p.stats?.some(s => s.tid === team.tid) || false
    }));
    
    const tx = db.transaction('intersections', 'readwrite');
    const store = tx.objectStore('intersections');
    
    // Clear existing intersections
    await store.clear();
    
    let computed = 0;
    const total = teamTests.length * teamTests.length;
    
    // Compute intersections for every team pair
    for (let i = 0; i < teamTests.length; i++) {
      for (let j = 0; j < teamTests.length; j++) {
        const team1 = teamTests[i];
        const team2 = teamTests[j];
        const key = `${team1.tid}-${team2.tid}`;
        
        // Find players who played for both teams
        const eligiblePids: number[] = [];
        for (const player of players) {
          if (team1.test(player) && team2.test(player)) {
            eligiblePids.push(player.pid);
          }
        }
        
        // Store the intersection
        await store.put({
          key,
          tid1: team1.tid,
          tid2: team2.tid,
          pids: eligiblePids,
          count: eligiblePids.length
        });
        
        computed++;
        
        // Update progress every 50 computations
        if (computed % 50 === 0) {
          onProgress?.(`Pre-computed ${computed} of ${total} team pairs...`);
        }
      }
    }
    
    await tx.done;
    onProgress?.(`Pre-computed ${computed} team pair intersections!`);
  } finally {
    db.close();
  }
}

/**
 * Get pre-computed intersection for a team pair
 */
export async function getTeamPairIntersection(
  tid1: number,
  tid2: number
): Promise<number[]> {
  const db = await openDB(DB_NAME, DB_VERSION);
  
  try {
    const key = `${tid1}-${tid2}`;
    const result = await db.get('intersections', key);
    return result?.pids || [];
  } finally {
    db.close();
  }
}

/**
 * Get pre-computed intersection for a CatTeam pair (handles both team and achievement categories)
 */
export async function getCatTeamIntersection(
  cat1: CatTeam,
  cat2: CatTeam,
  players: Player[]
): Promise<number[]> {
  // If both are team-based categories, use pre-computed data
  if (cat1.type === 'team' && cat2.type === 'team' && cat1.tid !== undefined && cat2.tid !== undefined) {
    return getTeamPairIntersection(cat1.tid, cat2.tid);
  }
  
  // For achievement-based categories or mixed, we need to test on-demand
  // This is fast because achievements are pre-calculated on each player
  const eligiblePids: number[] = [];
  for (const player of players) {
    if (cat1.test(player) && cat2.test(player)) {
      eligiblePids.push(player.pid);
    }
  }
  
  return eligiblePids;
}
