import { openDB, type IDBPDatabase } from 'idb';
import type { ScoreSummaryData } from '@/components/ScoreSummaryModal';

const DB_NAME = 'team-trivia-history';
const DB_VERSION = 1;
const HISTORY_STORE = 'games';
const THRESHOLDS_STORE = 'thresholds';
const MAX_HISTORY_ENTRIES = 1000; // Much higher limit than localStorage since IndexedDB has more space

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
  summaryData: ScoreSummaryData; // Full breakdown data
  leagueFingerprintId?: string; // Stable league fingerprint ID for matching across uploads
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
 * @returns true if saved successfully, false otherwise
 */
export async function saveGameToHistory(entry: Omit<HistoryEntry, 'id' | 'date'>): Promise<boolean> {
  try {
    const db = await openHistoryDB();
    try {
      // Create new entry with ID and date
      const newEntry: HistoryEntry = {
        ...entry,
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
