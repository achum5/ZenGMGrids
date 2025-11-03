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
 * Generate a stable fingerprint for a league by sampling player data
 * from early seasons (which won't change as league progresses)
 */
export function generateLeagueFingerprint(league: LeagueData): LeagueFingerprint {
  // Get players from the earliest seasons (these are stable)
  const allSeasons = [...new Set(league.players.flatMap((p: Player) =>
    p.stats?.map(s => s.season) || []
  ))].sort((a: number, b: number) => a - b);

  const startSeason: number = allSeasons[0] || 2000;
  const earlySeasons = allSeasons.slice(0, Math.min(3, allSeasons.length)); // First 3 seasons

  // Get players who played in early seasons, sorted by total minutes/games for consistency
  const earlyPlayers = league.players
    .filter((p: Player) => {
      const playedInEarlySeasons = p.stats?.some(s => earlySeasons.includes(s.season));
      return playedInEarlySeasons;
    })
    .map((p: Player) => {
      const earlyStats = p.stats?.filter(s => earlySeasons.includes(s.season)) || [];
      const totalMinutes = earlyStats.reduce((sum: number, s) => sum + (s.min || s.gp || 0), 0);
      return { player: p, totalMinutes };
    })
    .sort((a: { player: Player; totalMinutes: number }, b: { player: Player; totalMinutes: number }) => b.totalMinutes - a.totalMinutes);

  // Take top 20 players (or all if less than 20) for fingerprint
  const sampleSize = Math.min(20, earlyPlayers.length);
  const sampledPlayers = earlyPlayers.slice(0, sampleSize);

  // Create stable samples (these attributes won't change as league progresses)
  const samples: PlayerSample[] = sampledPlayers.map(({ player }: { player: Player; totalMinutes: number }) => ({
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
 * Returns a confidence score (0-1) where 1 = definitely the same league
 */
export function compareFingerprints(fp1: LeagueFingerprint, fp2: LeagueFingerprint): number {
  // Different sports = different leagues
  if (fp1.sport !== fp2.sport) return 0;

  // Different start seasons = likely different leagues
  if (fp1.startSeason !== fp2.startSeason) return 0;

  // Compare player samples
  const matchingPlayers = fp1.samples.filter(s1 => {
    return fp2.samples.some(s2 =>
      s1.pid === s2.pid &&
      s1.name === s2.name &&
      s1.bornYear === s2.bornYear &&
      s1.draftYear === s2.draftYear
    );
  });

  // If we have at least 10 samples and 80%+ match, it's the same league
  const matchRate = matchingPlayers.length / Math.max(fp1.samples.length, fp2.samples.length);

  // Require high match rate to avoid false positives
  return matchRate;
}

/**
 * Check if a fingerprint matches the league
 * Returns true if this is likely an updated version of the same league
 */
export function isMatchingLeague(newFingerprint: LeagueFingerprint, existingFingerprint: LeagueFingerprint): boolean {
  const confidence = compareFingerprints(newFingerprint, existingFingerprint);

  // Require 80% match confidence to consider it the same league
  return confidence >= 0.8;
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
