/**
 * Grid game history management
 * Similar to game-history.ts but for Grids mode
 */

const GRID_HISTORY_KEY = 'grids-history';
const MAX_HISTORY_ENTRIES = 100; // Limit to prevent localStorage overflow

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
  // Cell states for restoration
  cells?: Record<string, {
    name: string;
    correct: boolean;
    locked?: boolean;
    autoFilled?: boolean;
    guessed?: boolean;
    points?: number;
    rarity?: number;
    usedHint?: boolean;
  }>;
}

/**
 * Load grid history from localStorage
 */
export function loadGridHistory(): GridHistoryEntry[] {
  try {
    const stored = localStorage.getItem(GRID_HISTORY_KEY);
    if (!stored) return [];

    const history = JSON.parse(stored) as GridHistoryEntry[];
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('Failed to load grid history:', error);
    return [];
  }
}

/**
 * Save a completed grid to history
 */
export function saveGridToHistory(entry: Omit<GridHistoryEntry, 'id' | 'date'>): void {
  try {
    const history = loadGridHistory();

    // Create new entry with ID and date
    const newEntry: GridHistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };

    // Add to beginning (most recent first)
    history.unshift(newEntry);

    // Limit history size
    const trimmedHistory = history.slice(0, MAX_HISTORY_ENTRIES);

    localStorage.setItem(GRID_HISTORY_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Failed to save grid to history:', error);
  }
}

/**
 * Clear all grid history
 */
export function clearGridHistory(): void {
  try {
    localStorage.removeItem(GRID_HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear grid history:', error);
  }
}

/**
 * Delete a specific grid from history
 */
export function deleteGridFromHistory(id: string): void {
  try {
    const history = loadGridHistory();
    const filtered = history.filter(entry => entry.id !== id);
    localStorage.setItem(GRID_HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete grid from history:', error);
  }
}

/**
 * Delete all grids from a specific league
 */
export function deleteLeagueGridHistory(leagueFingerprintId: string): void {
  try {
    const history = loadGridHistory();
    const filtered = history.filter(entry => entry.leagueFingerprintId !== leagueFingerprintId);
    localStorage.setItem(GRID_HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete league grid history:', error);
  }
}

/**
 * Delete grids from a specific league below a score threshold
 */
export function deleteLeagueGridHistoryBelowThreshold(leagueFingerprintId: string, threshold: number): void {
  try {
    const history = loadGridHistory();
    const filtered = history.filter(entry => {
      // Keep entries that are either from a different league OR meet the score threshold
      return entry.leagueFingerprintId !== leagueFingerprintId || entry.score >= threshold;
    });
    localStorage.setItem(GRID_HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete league grid history below threshold:', error);
  }
}

/**
 * Load filter threshold for a specific league
 */
export function loadLeagueGridFilterThreshold(leagueFingerprintId: string): number {
  try {
    const key = `grid-history-filter-${leagueFingerprintId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return 0;

    const threshold = parseInt(stored, 10);
    return isNaN(threshold) ? 0 : Math.max(0, threshold);
  } catch (error) {
    console.error('Failed to load grid filter threshold:', error);
    return 0;
  }
}

/**
 * Save filter threshold for a specific league
 */
export function saveLeagueGridFilterThreshold(leagueFingerprintId: string, threshold: number): void {
  try {
    const key = `grid-history-filter-${leagueFingerprintId}`;
    localStorage.setItem(key, threshold.toString());
  } catch (error) {
    console.error('Failed to save grid filter threshold:', error);
  }
}
