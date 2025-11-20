import type { ScoreSummaryData } from '@/components/ScoreSummaryModal';
import type { Player } from '@/types/bbgm';

const HISTORY_KEY = 'team-trivia-history';
const MAX_HISTORY_ENTRIES = 100; // Limit to prevent localStorage overflow

// Compact storage format - stores PIDs instead of full Player objects
interface CompactPlayerGuess {
  pid: number;
  correct: boolean;
  round?: 'guess' | 'hint';
}

interface CompactLeaderRound {
  label: string;
  statLabel: string;
  statValue: string | number;
  correctPlayerPid: number;
  userCorrect: boolean;
  userSelectedPlayerPid?: number;
  userStatValue?: string | number;
  showTotalsNote?: boolean;
}

interface CompactScoreSummaryData {
  season: number;
  teamName: string;
  teamAbbrev: string;
  teamLogo?: string;
  teamColors?: string[];
  sport: string;
  finalScore: number;
  categories: { name: string; points: number }[];
  playoffFinish?: {
    userGuess: string;
    correctOutcome: string;
    correct: boolean;
    seriesScore?: string;
    pointsAwarded: number;
    pointsPerCorrect: number;
  };
  playerGuesses: CompactPlayerGuess[];
  leaders: CompactLeaderRound[];
  winsGuess?: {
    G: number;
    L: number;
    R: number;
    A: number;
    awarded: boolean;
  };
  timeElapsed?: number;
}

export interface HistoryEntry {
  id: string; // Unique ID (timestamp)
  date: string; // ISO date string
  season: number;
  teamName: string;
  teamAbbrev: string;
  teamLogo?: string;
  teamColors?: string[];
  sport: string;
  score: number;
  summaryData: CompactScoreSummaryData; // Compact breakdown data (PIDs only)
  leagueFingerprintId?: string; // Stable league fingerprint ID for matching across uploads
}

/**
 * Convert full ScoreSummaryData to compact format (PIDs only)
 */
function toCompactSummaryData(data: ScoreSummaryData): CompactScoreSummaryData {
  // Validate and convert player guesses
  const playerGuesses = data.playerGuesses.map(pg => {
    if (!pg.player || typeof pg.player.pid !== 'number') {
      console.error('[History] Invalid player in playerGuesses:', pg);
      throw new Error('Cannot save history: player missing PID');
    }
    return {
      pid: pg.player.pid,
      correct: pg.correct,
      round: pg.round,
    };
  });

  // Validate and convert leaders
  const leaders = data.leaders.map(lr => {
    if (!lr.correctPlayer || typeof lr.correctPlayer.pid !== 'number') {
      console.error('[History] Invalid correctPlayer in leaders:', lr);
      throw new Error('Cannot save history: leader player missing PID');
    }

    const userSelectedPlayerPid = lr.userSelectedPlayer
      ? (typeof lr.userSelectedPlayer.pid === 'number' ? lr.userSelectedPlayer.pid : undefined)
      : undefined;

    return {
      label: lr.label,
      statLabel: lr.statLabel,
      statValue: lr.statValue,
      correctPlayerPid: lr.correctPlayer.pid,
      userCorrect: lr.userCorrect,
      userSelectedPlayerPid,
      userStatValue: lr.userStatValue,
      showTotalsNote: lr.showTotalsNote,
    };
  });

  return {
    season: data.season,
    teamName: data.teamName,
    teamAbbrev: data.teamAbbrev,
    teamLogo: data.teamLogo,
    teamColors: data.teamColors,
    sport: data.sport,
    finalScore: data.finalScore,
    categories: data.categories,
    playoffFinish: data.playoffFinish,
    playerGuesses,
    leaders,
    winsGuess: data.winsGuess,
    timeElapsed: data.timeElapsed,
  };
}

/**
 * Hydrate compact summary data back to full format using current league players
 * Returns full ScoreSummaryData if league matches, or null if players can't be found
 */
export function hydrateCompactSummaryData(
  compact: CompactScoreSummaryData,
  playersByPid: Map<number, Player>
): ScoreSummaryData | null {
  // Check if we can find all required players
  const missingPids: (number | undefined)[] = [];

  // Check player guesses
  for (const pg of compact.playerGuesses) {
    if (typeof pg.pid !== 'number') {
      console.error('[History] Invalid PID in playerGuesses:', pg);
      missingPids.push(pg.pid);
    } else if (!playersByPid.has(pg.pid)) {
      missingPids.push(pg.pid);
    }
  }

  // Check leaders
  for (const lr of compact.leaders) {
    if (typeof lr.correctPlayerPid !== 'number') {
      console.error('[History] Invalid correctPlayerPid in leaders:', lr);
      missingPids.push(lr.correctPlayerPid);
    } else if (!playersByPid.has(lr.correctPlayerPid)) {
      missingPids.push(lr.correctPlayerPid);
    }

    if (lr.userSelectedPlayerPid !== undefined) {
      if (typeof lr.userSelectedPlayerPid !== 'number') {
        console.error('[History] Invalid userSelectedPlayerPid in leaders:', lr);
        missingPids.push(lr.userSelectedPlayerPid);
      } else if (!playersByPid.has(lr.userSelectedPlayerPid)) {
        missingPids.push(lr.userSelectedPlayerPid);
      }
    }
  }

  // If any players are missing, we can't hydrate
  if (missingPids.length > 0) {
    const validPids = missingPids.filter(pid => typeof pid === 'number');
    const invalidCount = missingPids.length - validPids.length;

    if (invalidCount > 0) {
      console.warn(`[History] Cannot hydrate: ${invalidCount} invalid PIDs (undefined/null), ${validPids.length} missing PIDs: ${validPids.join(', ')}`);
    } else {
      console.warn(`[History] Cannot hydrate: missing players with PIDs: ${validPids.join(', ')}`);
    }
    return null;
  }

  // Hydrate to full format
  return {
    season: compact.season,
    teamName: compact.teamName,
    teamAbbrev: compact.teamAbbrev,
    teamLogo: compact.teamLogo,
    teamColors: compact.teamColors,
    sport: compact.sport,
    finalScore: compact.finalScore,
    categories: compact.categories,
    playoffFinish: compact.playoffFinish,
    playerGuesses: compact.playerGuesses.map(pg => ({
      player: playersByPid.get(pg.pid)!,
      correct: pg.correct,
      round: pg.round,
    })),
    leaders: compact.leaders.map(lr => ({
      label: lr.label,
      statLabel: lr.statLabel,
      statValue: lr.statValue,
      correctPlayer: playersByPid.get(lr.correctPlayerPid)!,
      userCorrect: lr.userCorrect,
      userSelectedPlayer: lr.userSelectedPlayerPid ? playersByPid.get(lr.userSelectedPlayerPid) : undefined,
      userStatValue: lr.userStatValue,
      showTotalsNote: lr.showTotalsNote,
    })),
    winsGuess: compact.winsGuess,
    timeElapsed: compact.timeElapsed,
  };
}

/**
 * Load game history from localStorage
 */
export function loadGameHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];

    const history = JSON.parse(stored) as HistoryEntry[];
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('Failed to load game history:', error);
    return [];
  }
}

/**
 * Save a completed game to history
 * @param entry Entry with full ScoreSummaryData
 * @param fullSummaryData The original full ScoreSummaryData (before compact conversion)
 * @returns true if saved successfully, false otherwise
 */
export function saveGameToHistory(
  entry: Omit<HistoryEntry, 'id' | 'date' | 'summaryData'>,
  fullSummaryData: ScoreSummaryData
): boolean {
  try {
    const history = loadGameHistory();

    // Convert full summary data to compact format (PIDs only)
    const compactSummaryData = toCompactSummaryData(fullSummaryData);

    // Create new entry with ID and date
    const newEntry: HistoryEntry = {
      ...entry,
      summaryData: compactSummaryData,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };

    // Add to beginning (most recent first)
    history.unshift(newEntry);

    // Limit history size
    const trimmedHistory = history.slice(0, MAX_HISTORY_ENTRIES);

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
      return true;
    } catch (quotaError) {
      // Handle quota exceeded error
      if (quotaError instanceof DOMException && quotaError.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, attempting cleanup...');

        // Try progressively smaller history sizes
        const sizes = [50, 25, 10, 5];
        for (const size of sizes) {
          try {
            const reducedHistory = trimmedHistory.slice(0, size);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(reducedHistory));
            console.log(`History saved with ${size} entries after cleanup`);
            return true;
          } catch (retryError) {
            continue;
          }
        }

        // If all else fails, clear history and save just this one entry
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify([newEntry]));
          console.warn('Cleared old history, saved only current game');
          return true;
        } catch (finalError) {
          console.error('Cannot save to localStorage even after cleanup');
          return false;
        }
      }
      throw quotaError;
    }
  } catch (error) {
    console.error('Failed to save game to history:', error);
    return false;
  }
}

/**
 * Clear all game history
 */
export function clearGameHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear game history:', error);
  }
}

/**
 * Delete a specific game from history
 */
export function deleteGameFromHistory(id: string): void {
  try {
    const history = loadGameHistory();
    const filtered = history.filter(entry => entry.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete game from history:', error);
  }
}

/**
 * Delete all games from a specific league
 */
export function deleteLeagueHistory(leagueFingerprintId: string): void {
  try {
    const history = loadGameHistory();
    const filtered = history.filter(entry => entry.leagueFingerprintId !== leagueFingerprintId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete league history:', error);
  }
}

/**
 * Delete games from a specific league below a score threshold
 */
export function deleteLeagueHistoryBelowThreshold(leagueFingerprintId: string, threshold: number): void {
  try {
    const history = loadGameHistory();
    const filtered = history.filter(entry => {
      // Keep entries that are either from a different league OR meet the score threshold
      return entry.leagueFingerprintId !== leagueFingerprintId || entry.score >= threshold;
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete league history below threshold:', error);
  }
}

/**
 * Load filter threshold for a specific league
 */
export function loadLeagueFilterThreshold(leagueFingerprintId: string): number {
  try {
    const key = `history-filter-${leagueFingerprintId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return 0;

    const threshold = parseInt(stored, 10);
    return isNaN(threshold) ? 0 : Math.max(0, threshold);
  } catch (error) {
    console.error('Failed to load filter threshold:', error);
    return 0;
  }
}

/**
 * Save filter threshold for a specific league
 */
export function saveLeagueFilterThreshold(leagueFingerprintId: string, threshold: number): void {
  try {
    const key = `history-filter-${leagueFingerprintId}`;
    localStorage.setItem(key, threshold.toString());
  } catch (error) {
    console.error('Failed to save filter threshold:', error);
  }
}

/**
 * Export game history to a base64-encoded string
 * @param leagueFingerprintId Optional - export only history for specific league
 * @returns Base64-encoded history string
 */
export function exportGameHistory(leagueFingerprintId?: string): string {
  try {
    const history = loadGameHistory();
    const exportData = leagueFingerprintId
      ? history.filter(entry => entry.leagueFingerprintId === leagueFingerprintId)
      : history;

    const jsonString = JSON.stringify(exportData);
    const base64 = btoa(jsonString);
    return base64;
  } catch (error) {
    console.error('Failed to export game history:', error);
    throw new Error('Failed to export game history');
  }
}

/**
 * Import game history from a base64-encoded string
 * Merges with existing history, avoiding duplicates by ID
 * @param base64Code Base64-encoded history string
 * @returns Object with success status and counts
 */
export function importGameHistory(base64Code: string): {
  success: boolean;
  imported: number;
  skipped: number;
  error?: string;
} {
  try {
    // Decode base64
    const jsonString = atob(base64Code.trim());
    const importedEntries = JSON.parse(jsonString) as HistoryEntry[];

    // Validate that it's an array
    if (!Array.isArray(importedEntries)) {
      return { success: false, imported: 0, skipped: 0, error: 'Invalid format: expected array' };
    }

    // Validate entries have required fields
    for (const entry of importedEntries) {
      if (!entry.id || !entry.date || !entry.season || !entry.teamName || entry.score === undefined) {
        return { success: false, imported: 0, skipped: 0, error: 'Invalid entry format' };
      }
    }

    // Load existing history
    const existingHistory = loadGameHistory();
    const existingIds = new Set(existingHistory.map(e => e.id));

    // Filter out duplicates
    const newEntries = importedEntries.filter(entry => !existingIds.has(entry.id));
    const skippedCount = importedEntries.length - newEntries.length;

    // Merge and sort by date (most recent first)
    const mergedHistory = [...existingHistory, ...newEntries].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Limit to max entries
    const trimmedHistory = mergedHistory.slice(0, MAX_HISTORY_ENTRIES);

    // Save to localStorage
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));

    return {
      success: true,
      imported: newEntries.length,
      skipped: skippedCount
    };
  } catch (error) {
    console.error('Failed to import game history:', error);
    return {
      success: false,
      imported: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : 'Invalid import code'
    };
  }
}
