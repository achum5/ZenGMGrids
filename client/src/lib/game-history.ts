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
 */
export function saveGameToHistory(entry: Omit<HistoryEntry, 'id' | 'date'>): void {
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

    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Failed to save game to history:', error);
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
