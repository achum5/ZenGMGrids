import { openDB, type IDBPDatabase } from 'idb';
import type { Player } from '@/types/bbgm';

const DB_NAME = 'grids-history';
const DB_VERSION = 1;
const HISTORY_STORE = 'grids';
const THRESHOLDS_STORE = 'thresholds';
const MAX_HISTORY_ENTRIES = 1000; // Much higher limit than localStorage

// Compact cell data (PIDs only)
interface CompactCellData {
  pid: number;  // Player ID instead of name
  correct: boolean;
  locked?: boolean;
  autoFilled?: boolean;
  guessed?: boolean;
  points?: number;
  rarity?: number;
  usedHint?: boolean;
}

export interface GridHistoryEntry {
  id: string; // Unique ID (timestamp)
  date: string; // ISO date string
  sport: string;
  score: number;
  correctGuesses: number; // Number of correct cells (out of 9)
  totalCells: number; // Always 9 for standard grids
  attemptCount: number; // Which attempt number (1st try, 2nd try, etc.)
  usedGiveUp: boolean; // Whether player used "Give Up" to reveal answers
  leagueFingerprintId?: string; // Stable league fingerprint ID for matching across uploads
  // Grid configuration for display and restoration
  gridConfig?: {
    rows: Array<{ type: string; label: string; tid?: number; key?: string; achievementId?: string }>;
    cols: Array<{ type: string; label: string; tid?: number; key?: string; achievementId?: string }>;
  };
  // Cell states for restoration (compact - PIDs only)
  cells?: Record<string, CompactCellData>;
}

// Full cell data for display (with player info)
export interface HydratedCellData {
  name: string;
  pid: number;
  correct: boolean;
  locked?: boolean;
  autoFilled?: boolean;
  guessed?: boolean;
  points?: number;
  rarity?: number;
  usedHint?: boolean;
}

/**
 * Convert cell data with player names to compact format (PIDs only)
 */
export function convertCellsToPIDs(
  cells: Record<string, { name: string; [key: string]: any }> | undefined,
  playersByName: Map<string, Player>
): Record<string, CompactCellData> | undefined {
  if (!cells) return undefined;

  const compactCells: Record<string, CompactCellData> = {};

  for (const [key, cell] of Object.entries(cells)) {
    const player = playersByName.get(cell.name);

    if (!player || typeof player.pid !== 'number') {
      console.error(`[Grid History] Cannot find player PID for: ${cell.name}`);
      continue; // Skip cells with missing players
    }

    compactCells[key] = {
      pid: player.pid,
      correct: cell.correct,
      locked: cell.locked,
      autoFilled: cell.autoFilled,
      guessed: cell.guessed,
      points: cell.points,
      rarity: cell.rarity,
      usedHint: cell.usedHint,
    };
  }

  return compactCells;
}

/**
 * Hydrate compact cell data back to full format using current league players
 */
export function hydrateCellData(
  cells: Record<string, CompactCellData> | undefined,
  playersByPid: Map<number, Player>
): Record<string, HydratedCellData> | undefined {
  if (!cells) return undefined;

  const hydratedCells: Record<string, HydratedCellData> = {};

  for (const [key, cell] of Object.entries(cells)) {
    const player = playersByPid.get(cell.pid);

    if (!player) {
      console.warn(`[Grid History] Cannot find player for PID: ${cell.pid}`);
      // Still include the cell but with placeholder name
      hydratedCells[key] = {
        name: `Player #${cell.pid}`,
        pid: cell.pid,
        correct: cell.correct,
        locked: cell.locked,
        autoFilled: cell.autoFilled,
        guessed: cell.guessed,
        points: cell.points,
        rarity: cell.rarity,
        usedHint: cell.usedHint,
      };
      continue;
    }

    hydratedCells[key] = {
      name: player.name,
      pid: player.pid,
      correct: cell.correct,
      locked: cell.locked,
      autoFilled: cell.autoFilled,
      guessed: cell.guessed,
      points: cell.points,
      rarity: cell.rarity,
      usedHint: cell.usedHint,
    };
  }

  return hydratedCells;
}

/**
 * Open the grid history database
 */
async function openGridHistoryDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Create grids store if it doesn't exist
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const gridsStore = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        // Create index on date for sorting
        gridsStore.createIndex('date', 'date', { unique: false });
        // Create index on leagueFingerprintId for filtering
        gridsStore.createIndex('leagueFingerprintId', 'leagueFingerprintId', { unique: false });
      }

      // Create thresholds store if it doesn't exist
      if (!db.objectStoreNames.contains(THRESHOLDS_STORE)) {
        db.createObjectStore(THRESHOLDS_STORE, { keyPath: 'leagueFingerprintId' });
      }
    },
  });
}

/**
 * Load grid history from IndexedDB
 */
export async function loadGridHistory(): Promise<GridHistoryEntry[]> {
  try {
    const db = await openGridHistoryDB();
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
    console.error('Failed to load grid history:', error);
    return [];
  }
}

/**
 * Save a completed grid to history
 */
export async function saveGridToHistory(entry: Omit<GridHistoryEntry, 'id' | 'date'>): Promise<void> {
  try {
    const db = await openGridHistoryDB();
    try {
      // Create new entry with ID and date
      const newEntry: GridHistoryEntry = {
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
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Failed to save grid to history:', error);
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
      console.log(`Cleaned up ${entriesToDelete.length} old grid history entries`);
    }
  } catch (error) {
    console.error('Failed to cleanup old grid entries:', error);
  }
}

/**
 * Clear all grid history
 */
export async function clearGridHistory(): Promise<void> {
  try {
    const db = await openGridHistoryDB();
    try {
      await db.clear(HISTORY_STORE);
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Failed to clear grid history:', error);
  }
}

/**
 * Delete a specific grid from history
 */
export async function deleteGridFromHistory(id: string): Promise<void> {
  try {
    const db = await openGridHistoryDB();
    try {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      await store.delete(id);
      await tx.done;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Failed to delete grid from history:', error);
  }
}

/**
 * Delete all grids from a specific league
 */
export async function deleteLeagueGridHistory(leagueFingerprintId: string): Promise<void> {
  try {
    const db = await openGridHistoryDB();
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
    console.error('Failed to delete league grid history:', error);
  }
}

/**
 * Delete grids from a specific league below a score threshold
 */
export async function deleteLeagueGridHistoryBelowThreshold(leagueFingerprintId: string, threshold: number): Promise<void> {
  try {
    const db = await openGridHistoryDB();
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
    console.error('Failed to delete league grid history below threshold:', error);
  }
}

/**
 * Load filter threshold for a specific league
 */
export async function loadLeagueGridFilterThreshold(leagueFingerprintId: string): Promise<number> {
  try {
    const db = await openGridHistoryDB();
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
    console.error('Failed to load grid filter threshold:', error);
    return 0;
  }
}

/**
 * Save filter threshold for a specific league
 */
export async function saveLeagueGridFilterThreshold(leagueFingerprintId: string, threshold: number): Promise<void> {
  try {
    const db = await openGridHistoryDB();
    try {
      const tx = db.transaction(THRESHOLDS_STORE, 'readwrite');
      const store = tx.objectStore(THRESHOLDS_STORE);
      await store.put({ leagueFingerprintId, threshold });
      await tx.done;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Failed to save grid filter threshold:', error);
  }
}

/**
 * Migrate grid history from localStorage to IndexedDB
 * This is a one-time migration function
 */
export async function migrateGridsFromLocalStorage(): Promise<{ migrated: number; errors: number }> {
  let migrated = 0;
  let errors = 0;

  try {
    // Try to load from localStorage
    const GRID_HISTORY_KEY = 'grids-history';
    const stored = localStorage.getItem(GRID_HISTORY_KEY);

    if (!stored) {
      console.log('[Grid Migration] No localStorage history found');
      return { migrated: 0, errors: 0 };
    }

    const entries = JSON.parse(stored) as GridHistoryEntry[];

    if (!Array.isArray(entries) || entries.length === 0) {
      console.log('[Grid Migration] No valid entries to migrate');
      return { migrated: 0, errors: 0 };
    }

    console.log(`[Grid Migration] Found ${entries.length} entries in localStorage`);

    // Get existing IDB history to avoid duplicates
    const existingHistory = await loadGridHistory();
    const existingIds = new Set(existingHistory.map(e => e.id));

    // Save to IndexedDB
    const db = await openGridHistoryDB();
    try {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);

      for (const entry of entries) {
        // Skip if already exists
        if (existingIds.has(entry.id)) {
          console.log(`[Grid Migration] Skipping duplicate entry ${entry.id}`);
          continue;
        }

        try {
          await store.add(entry);
          migrated++;
        } catch (error) {
          console.error(`[Grid Migration] Failed to migrate entry ${entry.id}:`, error);
          errors++;
        }
      }

      await tx.done;
    } finally {
      db.close();
    }

    console.log(`[Grid Migration] Migrated ${migrated} entries with ${errors} errors`);

    // After successful migration, clear localStorage to save space
    if (migrated > 0 && errors === 0) {
      localStorage.removeItem(GRID_HISTORY_KEY);
      console.log('[Grid Migration] Cleared localStorage history after successful migration');
    }

    return { migrated, errors };
  } catch (error) {
    console.error('[Grid Migration] Failed to migrate from localStorage:', error);
    return { migrated, errors: errors + 1 };
  }
}

/**
 * Export grid history to a base64-encoded string
 * @param leagueFingerprintId Optional - export only history for specific league
 * @returns Base64-encoded history string
 */
export async function exportGridHistory(leagueFingerprintId?: string): Promise<string> {
  try {
    const history = await loadGridHistory();
    const exportData = leagueFingerprintId
      ? history.filter(entry => entry.leagueFingerprintId === leagueFingerprintId)
      : history;

    const jsonString = JSON.stringify(exportData);
    // Use Unicode-safe base64 encoding
    const base64 = btoa(unescape(encodeURIComponent(jsonString)));
    return base64;
  } catch (error) {
    console.error('Failed to export grid history:', error);
    throw new Error('Failed to export grid history');
  }
}

/**
 * Import grid history from a base64-encoded string
 * Merges with existing history, avoiding duplicates by ID
 * @param base64Code Base64-encoded history string
 * @returns Object with success status and counts
 */
export async function importGridHistory(base64Code: string): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  error?: string;
}> {
  try {
    // Decode base64 (Unicode-safe)
    const jsonString = decodeURIComponent(escape(atob(base64Code.trim())));
    const importedEntries = JSON.parse(jsonString) as GridHistoryEntry[];

    // Validate that it's an array
    if (!Array.isArray(importedEntries)) {
      return { success: false, imported: 0, skipped: 0, error: 'Invalid format: expected array' };
    }

    // Validate entries have required fields
    for (const entry of importedEntries) {
      if (!entry.id || !entry.date || entry.score === undefined) {
        return { success: false, imported: 0, skipped: 0, error: 'Invalid entry format' };
      }
    }

    // Load existing history
    const existingHistory = await loadGridHistory();
    const existingIds = new Set(existingHistory.map(e => e.id));

    // Filter out duplicates
    const newEntries = importedEntries.filter(entry => !existingIds.has(entry.id));
    const skippedCount = importedEntries.length - newEntries.length;

    // Save new entries to IndexedDB
    const db = await openGridHistoryDB();
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
    console.error('Failed to import grid history:', error);
    return {
      success: false,
      imported: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : 'Invalid import code'
    };
  }
}
