import type { ScoreSummaryData } from '@/components/ScoreSummaryModal';

const HISTORY_KEY = 'team-trivia-history';
const MAX_HISTORY_ENTRIES = 100; // Limit to prevent localStorage overflow

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
 * @returns true if saved successfully, false otherwise
 */
export function saveGameToHistory(entry: Omit<HistoryEntry, 'id' | 'date'>): boolean {
  try {
    const history = loadGameHistory();

    // Create new entry with ID and date
    const newEntry: HistoryEntry = {
      ...entry,
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
