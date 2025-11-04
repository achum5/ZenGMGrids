import type { LeagueData, Player } from '@/types/bbgm';

/**
 * A fingerprint that uniquely identifies a league based on stable player data
 */
export interface LeagueFingerprint {
  id: string; // SHA-256 hash of the sample data
  samples: PlayerSample[]; // Sample of players used for fingerprint
  sport: string;
  startSeason: number; // Earliest season in the league
}

interface PlayerSample {
  pid: number;
  name: string;
  bornYear?: number;
  draftYear?: number;
  college?: string | null;
}

/**
 * Generate a stable fingerprint for a league by sampling 100 random player PIDs.
 *
 * This approach:
 * 1. Picks 100 random PIDs from the ENTIRE league (all players, all seasons)
 * 2. Stores those specific PIDs with stable player data (name, bornYear, draftYear, college)
 * 3. When comparing leagues, searches for those exact PIDs
 * 4. If 90+ out of 100 PIDs match → Same league!
 *
 * Why this works:
 * - Real player leagues share real NBA PIDs (LeBron = PID 5)
 * - But generated players have UNIQUE PIDs per league simulation
 * - Different leagues = Different generated PIDs (even with same starting roster)
 * - Same league progressed (2050 → 2080) = Same PIDs still exist
 * - Persists even if league deleted and re-uploaded years later
 */
export function generateLeagueFingerprint(league: LeagueData): LeagueFingerprint {
  if (!league.players || league.players.length === 0) {
    // Fallback for empty league
    return {
      id: generateSimpleHash(JSON.stringify({ sport: league.sport, startSeason: 2000 })),
      samples: [],
      sport: league.sport || 'basketball',
      startSeason: 2000,
    };
  }

  // Get start season
  const allSeasons = [...new Set(league.players.flatMap((p: Player) =>
    p.stats?.map(s => s.season) || []
  ))].sort((a: number, b: number) => a - b);
  const startSeason: number = allSeasons[0] || 2000;

  // Sort all players by PID and take the first 100
  // This is DETERMINISTIC and STABLE - the same 100 PIDs regardless of league size
  // Even if league progresses from 5000 to 6000 players, first 100 by PID stay the same
  const sortedPlayers = [...league.players].sort((a, b) => a.pid - b.pid);

  // Take first 100 players (or all if less than 100)
  const sampleSize = Math.min(100, sortedPlayers.length);
  const sampledPlayers = sortedPlayers.slice(0, sampleSize);

  // Create stable samples (these attributes won't change as league progresses)
  const samples: PlayerSample[] = sampledPlayers.map((player: Player) => ({
    pid: player.pid,
    name: player.name,
    bornYear: player.born?.year,
    draftYear: player.draft?.year,
    college: player.college,
  }));

  // Generate a hash from the sample data
  const fingerprintData = JSON.stringify({
    samples: samples.sort((a, b) => a.pid - b.pid), // Sort by pid for consistency
    sport: league.sport,
    startSeason,
  });

  const id = generateSimpleHash(fingerprintData);

  return {
    id,
    samples,
    sport: league.sport || 'basketball',
    startSeason,
  };
}

/**
 * Compare two fingerprints to determine if they're from the same league
 * Searches for specific PIDs from the existing fingerprint in the new fingerprint
 * Returns a confidence score (0-1) where 1 = definitely the same league
 */
export function compareFingerprints(existingFp: LeagueFingerprint, newFp: LeagueFingerprint): number {
  // Different sports = different leagues
  if (existingFp.sport !== newFp.sport) return 0;

  // Different start seasons = likely different leagues
  if (existingFp.startSeason !== newFp.startSeason) return 0;

  // Search for each PID from existing fingerprint in the new fingerprint
  // This allows matching even if the league has progressed many years
  const matchingPlayers = existingFp.samples.filter(existingSample => {
    return newFp.samples.some(newSample =>
      existingSample.pid === newSample.pid &&
      existingSample.name === newSample.name &&
      existingSample.bornYear === newSample.bornYear &&
      existingSample.draftYear === newSample.draftYear
    );
  });

  // Calculate match rate based on existing fingerprint size
  // We expect to find most of the PIDs from the existing fingerprint in the new upload
  const matchRate = matchingPlayers.length / existingFp.samples.length;

  return matchRate;
}

/**
 * Check if a fingerprint matches the league
 * Returns true if this is likely an updated version of the same league
 */
export function isMatchingLeague(newFingerprint: LeagueFingerprint, existingFingerprint: LeagueFingerprint): boolean {
  // Search for PIDs from existing fingerprint in the new fingerprint
  const confidence = compareFingerprints(existingFingerprint, newFingerprint);

  // Require 90% match confidence to avoid false positives with real player leagues
  // By 20 seasons, even leagues with same starting rosters have diverged significantly
  // due to injuries, trades, draft variations, and player development differences
  return confidence >= 0.9;
}

/**
 * Simple hash function for generating fingerprint IDs
 * (Not cryptographically secure, but sufficient for our use case)
 */
function generateSimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Find a matching league from a list of fingerprints
 * Returns the fingerprint ID if a match is found, null otherwise
 */
export function findMatchingLeague(
  newFingerprint: LeagueFingerprint,
  existingFingerprints: Map<string, LeagueFingerprint>
): string | null {
  for (const [leagueId, existingFingerprint] of existingFingerprints) {
    if (isMatchingLeague(newFingerprint, existingFingerprint)) {
      return leagueId;
    }
  }
  return null;
}
