import { openDB, type IDBPDatabase } from 'idb';
import type { ScoreSummaryData } from '@/components/ScoreSummaryModal';
import type { Player } from '@/types/bbgm';

const DB_NAME = 'team-trivia-history';
const DB_VERSION = 1;
const HISTORY_STORE = 'games';
const THRESHOLDS_STORE = 'thresholds';
const MAX_HISTORY_ENTRIES = 1000; // Much higher limit than localStorage since IndexedDB has more space

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
 * Open the history database
 */
async function openHistoryDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Create games store if it doesn't exist
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const gamesStore = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        // Create index on date for sorting
        gamesStore.createIndex('date', 'date', { unique: false });
        // Create index on leagueFingerprintId for filtering
        gamesStore.createIndex('leagueFingerprintId', 'leagueFingerprintId', { unique: false });
      }

      // Create thresholds store if it doesn't exist
      if (!db.objectStoreNames.contains(THRESHOLDS_STORE)) {
        db.createObjectStore(THRESHOLDS_STORE, { keyPath: 'leagueFingerprintId' });
      }
    },
  });
}

/**
 * Load game history from IndexedDB
 */
export async function loadGameHistory(): Promise<HistoryEntry[]> {
  try {
    const db = await openHistoryDB();
    try {
      const tx = db.transaction(HISTORY_STORE, 'readonly');
      const store = tx.objectStore(HISTORY_STORE);
      const index = store.index('date');

      // Get all entries sorted by date (descending)
      const entries = await index.getAll();
      await tx.done;

      // Sort by date descending (most recent first)
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return entries;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Failed to load game history:', error);
    return [];
  }
}

/**
 * Save a completed game to history
 * @param entry Entry metadata
 * @param fullSummaryData The original full ScoreSummaryData (before compact conversion)
 * @returns true if saved successfully, false otherwise
 */
export async function saveGameToHistory(
  entry: Omit<HistoryEntry, 'id' | 'date' | 'summaryData'>,
  fullSummaryData: ScoreSummaryData
): Promise<boolean> {
  try {
    const db = await openHistoryDB();
    try {
      // Convert full summary data to compact format (PIDs only)
      const compactSummaryData = toCompactSummaryData(fullSummaryData);

      // Create new entry with ID and date
      const newEntry: HistoryEntry = {
        ...entry,
        summaryData: compactSummaryData,
        id: Date.now().toString(),
        date: new Date().toISOString(),
      };

      // Add to database
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      await store.add(newEntry);
      await tx.done;

      // Cleanup old entries if we exceed the limit
      await cleanupOldEntries(db);

      return true;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Failed to save game to history:', error);
    return false;
  }
}

/**
 * Internal function to cleanup old entries if we exceed MAX_HISTORY_ENTRIES
 */
async function cleanupOldEntries(db: IDBPDatabase): Promise<void> {
  try {
    const tx = db.transaction(HISTORY_STORE, 'readwrite');
    const store = tx.objectStore(HISTORY_STORE);
    const index = store.index('date');

    // Get all entries sorted by date
    const entries = await index.getAll();
    await tx.done;

    // Sort by date descending
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // If we have more than MAX_HISTORY_ENTRIES, delete the oldest ones
    if (entries.length > MAX_HISTORY_ENTRIES) {
      const tx2 = db.transaction(HISTORY_STORE, 'readwrite');
      const store2 = tx2.objectStore(HISTORY_STORE);

      const entriesToDelete = entries.slice(MAX_HISTORY_ENTRIES);
      for (const entry of entriesToDelete) {
        await store2.delete(entry.id);
      }

      await tx2.done;
      console.log(`Cleaned up ${entriesToDelete.length} old history entries`);
    }
  } catch (error) {
    console.error('Failed to cleanup old entries:', error);
  }
}

/**
 * Clear all game history
 */
export async function clearGameHistory(): Promise<void> {
  try {
    const db = await openHistoryDB();
    try {
      await db.clear(HISTORY_STORE);
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Failed to clear game history:', error);
  }
}

/**
 * Delete a specific game from history
 */
export async function deleteGameFromHistory(id: string): Promise<void> {
  try {
    const db = await openHistoryDB();
    try {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      await store.delete(id);
      await tx.done;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Failed to delete game from history:', error);
  }
}

/**
 * Delete all games from a specific league
 */
export async function deleteLeagueHistory(leagueFingerprintId: string): Promise<void> {
  try {
    const db = await openHistoryDB();
    try {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const index = store.index('leagueFingerprintId');

      // Get all entries for this league
      const entries = await index.getAll(leagueFingerprintId);

      // Delete each entry
      for (const entry of entries) {
        await store.delete(entry.id);
      }

      await tx.done;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Failed to delete league history:', error);
  }
}

/**
 * Delete games from a specific league below a score threshold
 */
export async function deleteLeagueHistoryBelowThreshold(leagueFingerprintId: string, threshold: number): Promise<void> {
  try {
    const db = await openHistoryDB();
    try {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const index = store.index('leagueFingerprintId');

      // Get all entries for this league
      const entries = await index.getAll(leagueFingerprintId);

      // Delete entries below threshold
      for (const entry of entries) {
        if (entry.score < threshold) {
          await store.delete(entry.id);
        }
      }

      await tx.done;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Failed to delete league history below threshold:', error);
  }
}

/**
 * Load filter threshold for a specific league
 */
export async function loadLeagueFilterThreshold(leagueFingerprintId: string): Promise<number> {
  try {
    const db = await openHistoryDB();
    try {
      const tx = db.transaction(THRESHOLDS_STORE, 'readonly');
      const store = tx.objectStore(THRESHOLDS_STORE);
      const entry = await store.get(leagueFingerprintId);
      await tx.done;

      if (!entry || typeof entry.threshold !== 'number') return 0;

      return Math.max(0, entry.threshold);
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Failed to load filter threshold:', error);
    return 0;
  }
}

/**
 * Save filter threshold for a specific league
 */
export async function saveLeagueFilterThreshold(leagueFingerprintId: string, threshold: number): Promise<void> {
  try {
    const db = await openHistoryDB();
    try {
      const tx = db.transaction(THRESHOLDS_STORE, 'readwrite');
      const store = tx.objectStore(THRESHOLDS_STORE);
      await store.put({ leagueFingerprintId, threshold });
      await tx.done;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Failed to save filter threshold:', error);
  }
}

/**
 * Export game history to a base64-encoded string
 * @param leagueFingerprintId Optional - export only history for specific league
 * @returns Base64-encoded history string
 */
export async function exportGameHistory(leagueFingerprintId?: string): Promise<string> {
  try {
    const history = await loadGameHistory();
    const exportData = leagueFingerprintId
      ? history.filter(entry => entry.leagueFingerprintId === leagueFingerprintId)
      : history;

    const jsonString = JSON.stringify(exportData);
    // Use Unicode-safe base64 encoding
    const base64 = btoa(unescape(encodeURIComponent(jsonString)));
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
export async function importGameHistory(base64Code: string): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  error?: string;
}> {
  try {
    // Decode base64 (Unicode-safe)
    const jsonString = decodeURIComponent(escape(atob(base64Code.trim())));
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
    const existingHistory = await loadGameHistory();
    const existingIds = new Set(existingHistory.map(e => e.id));

    // Filter out duplicates
    const newEntries = importedEntries.filter(entry => !existingIds.has(entry.id));
    const skippedCount = importedEntries.length - newEntries.length;

    // Save new entries to IndexedDB
    const db = await openHistoryDB();
    try {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);

      for (const entry of newEntries) {
        await store.add(entry);
      }

      await tx.done;

      // Cleanup if needed
      await cleanupOldEntries(db);
    } finally {
      db.close();
    }

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

/**
 * Migrate history from localStorage to IndexedDB
 * This is a one-time migration function
 */
export async function migrateFromLocalStorage(): Promise<{ migrated: number; errors: number }> {
  let migrated = 0;
  let errors = 0;

  try {
    // Try to load from localStorage
    const HISTORY_KEY = 'team-trivia-history';
    const stored = localStorage.getItem(HISTORY_KEY);

    if (!stored) {
      console.log('[Migration] No localStorage history found');
      return { migrated: 0, errors: 0 };
    }

    const entries = JSON.parse(stored) as HistoryEntry[];

    if (!Array.isArray(entries) || entries.length === 0) {
      console.log('[Migration] No valid entries to migrate');
      return { migrated: 0, errors: 0 };
    }

    console.log(`[Migration] Found ${entries.length} entries in localStorage`);

    // Get existing IDB history to avoid duplicates
    const existingHistory = await loadGameHistory();
    const existingIds = new Set(existingHistory.map(e => e.id));

    // Save to IndexedDB
    const db = await openHistoryDB();
    try {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);

      for (const entry of entries) {
        // Skip if already exists
        if (existingIds.has(entry.id)) {
          console.log(`[Migration] Skipping duplicate entry ${entry.id}`);
          continue;
        }

        try {
          await store.add(entry);
          migrated++;
        } catch (error) {
          console.error(`[Migration] Failed to migrate entry ${entry.id}:`, error);
          errors++;
        }
      }

      await tx.done;
    } finally {
      db.close();
    }

    console.log(`[Migration] Migrated ${migrated} entries with ${errors} errors`);

    // After successful migration, clear localStorage to save space
    if (migrated > 0 && errors === 0) {
      localStorage.removeItem(HISTORY_KEY);
      console.log('[Migration] Cleared localStorage history after successful migration');
    }

    return { migrated, errors };
  } catch (error) {
    console.error('[Migration] Failed to migrate from localStorage:', error);
    return { migrated, errors: errors + 1 };
  }
}
