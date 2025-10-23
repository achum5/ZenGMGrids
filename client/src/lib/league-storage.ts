import { openDB, type IDBPDatabase } from 'idb';
import type { LeagueData } from '@/types/bbgm';

const DB_NAME = 'ZenGMGridsLeagues';
const DB_VERSION = 1;
const STORE_NAME = 'leagues';

export interface StoredLeague {
  id: string;
  name: string;
  sport: 'basketball' | 'football' | 'hockey' | 'baseball';
  savedAt: number;
  leagueData: LeagueData;
  fileSize?: number;
  numPlayers?: number;
  numTeams?: number;
  seasons?: { min: number; max: number };
  isMetadataOnly?: boolean; // Flag for lightweight saves that reference separate IDB
  idbName?: string; // Name of the IndexedDB database storing the actual data (for metadata-only saves)
  starred?: boolean; // Flag for favorited/starred leagues
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function saveLeague(
  name: string,
  leagueData: LeagueData,
  sport: 'basketball' | 'football' | 'hockey' | 'baseball',
  fileSize?: number
): Promise<string> {
  const db = await getDB();
  
  // Generate unique ID based on timestamp
  const id = `league_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Calculate metadata
  const numPlayers = leagueData.players?.length || 0;
  const numTeams = leagueData.teams?.length || 0;
  
  // Find season range
  let seasons: { min: number; max: number } | undefined;
  if (leagueData.players && leagueData.players.length > 0) {
    const allSeasons = new Set<number>();
    leagueData.players.forEach(p => {
      if (p.stats && Array.isArray(p.stats)) {
        p.stats.forEach(s => {
          if (s.season) allSeasons.add(s.season);
        });
      }
    });
    if (allSeasons.size > 0) {
      const seasonArr = Array.from(allSeasons).sort((a, b) => a - b);
      seasons = { min: seasonArr[0], max: seasonArr[seasonArr.length - 1] };
    }
  }
  
  const storedLeague: StoredLeague = {
    id,
    name,
    sport,
    savedAt: Date.now(),
    leagueData,
    fileSize,
    numPlayers,
    numTeams,
    seasons,
  };
  
  await db.put(STORE_NAME, storedLeague);
  return id;
}

/**
 * Save league metadata only (for large files on mobile)
 * The actual league data stays in a league-specific IDB database
 */
export async function saveLeagueMetadata(
  name: string,
  sport: 'basketball' | 'football' | 'hockey' | 'baseball',
  numPlayers: number,
  numTeams: number,
  idbName: string, // The unique IDB database name for this league
  fileSize?: number,
  seasons?: { min: number; max: number }
): Promise<string> {
  const db = await getDB();
  
  // Generate unique ID based on timestamp
  const id = `league_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store only metadata - the actual data is in a league-specific IDB
  const storedLeague: StoredLeague = {
    id,
    name,
    sport,
    savedAt: Date.now(),
    leagueData: {} as LeagueData, // Empty placeholder
    fileSize,
    numPlayers,
    numTeams,
    seasons,
    isMetadataOnly: true, // Flag indicating this references separate IDB
    idbName, // The database name where the actual data is stored
  };
  
  await db.put(STORE_NAME, storedLeague);
  return id;
}

export async function getAllLeagues(): Promise<StoredLeague[]> {
  const db = await getDB();
  const leagues = await db.getAll(STORE_NAME);
  
  // Sort by savedAt descending (most recent first)
  return leagues.sort((a, b) => b.savedAt - a.savedAt);
}

export async function getLeague(id: string): Promise<StoredLeague | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function deleteLeague(id: string): Promise<void> {
  const db = await getDB();
  
  // Get the league to check if it has an associated IDB database
  const league = await db.get(STORE_NAME, id);
  
  // Delete the metadata entry
  await db.delete(STORE_NAME, id);
  
  // If this was a metadata-only save with a dedicated IDB, delete that database too
  if (league?.isMetadataOnly && league.idbName) {
    try {
      await deleteLeagueIDB(league.idbName);
      console.log(`[Storage] Deleted league-specific database: ${league.idbName}`);
    } catch (error) {
      console.error(`[Storage] Failed to delete league database ${league.idbName}:`, error);
    }
  }
}

/**
 * Delete a league-specific IndexedDB database
 */
export async function deleteLeagueIDB(dbName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn(`[Storage] Delete blocked for ${dbName} - database may be in use`);
      // Still resolve since we tried our best
      resolve();
    };
  });
}

export async function updateLeagueName(id: string, newName: string): Promise<void> {
  const db = await getDB();
  const league = await db.get(STORE_NAME, id);
  if (league) {
    league.name = newName;
    await db.put(STORE_NAME, league);
  }
}

export function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return 'Unknown size';
  
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Toggle the starred status of a league
 */
export async function toggleLeagueStarred(id: string): Promise<void> {
  const db = await getDB();
  const league = await db.get(STORE_NAME, id);
  if (league) {
    league.starred = !league.starred;
    await db.put(STORE_NAME, league);
  }
}

/**
 * Bulk delete leagues by IDs
 */
export async function bulkDeleteLeagues(ids: string[]): Promise<number> {
  const db = await getDB();
  let deletedCount = 0;

  for (const id of ids) {
    try {
      // Get the league to check if it has an associated IDB database
      const league = await db.get(STORE_NAME, id);

      // Delete the metadata entry
      await db.delete(STORE_NAME, id);
      deletedCount++;

      // If this was a metadata-only save with a dedicated IDB, delete that database too
      if (league?.isMetadataOnly && league.idbName) {
        try {
          await deleteLeagueIDB(league.idbName);
          console.log(`[Storage] Deleted league-specific database: ${league.idbName}`);
        } catch (error) {
          console.error(`[Storage] Failed to delete league database ${league.idbName}:`, error);
        }
      }
    } catch (error) {
      console.error(`[Storage] Failed to delete league ${id}:`, error);
    }
  }

  return deletedCount;
}
