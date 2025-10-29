import { openDB, type IDBPDatabase } from 'idb';
import type { LeagueData } from '@/types/bbgm';

const DB_NAME = 'ZenGMGridsLeagues';
const DB_VERSION = 2; // Incremented for metadata/data separation
const METADATA_STORE = 'metadata';
const LEAGUE_DATA_STORE = 'leagueData';

// Metadata only - lightweight for UI operations
export interface LeagueMetadata {
  id: string;
  name: string;
  sport: 'basketball' | 'football' | 'hockey' | 'baseball';
  savedAt: number;
  lastPlayed?: number;
  fileSize?: number;
  numPlayers?: number;
  numTeams?: number;
  seasons?: { min: number; max: number };
  isMetadataOnly?: boolean; // Flag for lightweight saves that reference separate IDB
  idbName?: string; // Name of the IndexedDB database storing the actual data (for metadata-only saves)
  starred?: boolean;
  yearRange?: [number, number];
}

// For backward compatibility - includes league data when loaded
export interface StoredLeague extends LeagueMetadata {
  leagueData?: LeagueData;
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Create new stores if they don't exist
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(LEAGUE_DATA_STORE)) {
        db.createObjectStore(LEAGUE_DATA_STORE, { keyPath: 'id' });
      }

      // Migrate from v1 to v2: split leagues store into metadata + leagueData
      if (oldVersion < 2 && db.objectStoreNames.contains('leagues')) {
        // Migration happens in a separate async function after upgrade
        console.log('[Storage] Will migrate from v1 to v2 after database opens');
      }
    },
  });
}

// Perform migration after database is ready
async function migrateV1ToV2() {
  try {
    // Open with old version to check if migration needed
    const checkDb = await openDB(DB_NAME);
    if (!checkDb.objectStoreNames.contains('leagues')) {
      checkDb.close();
      return; // Already migrated
    }
    checkDb.close();

    // Perform migration
    const db = await getDB();
    const tx = db.transaction(['leagues', METADATA_STORE, LEAGUE_DATA_STORE], 'readwrite');
    const oldStore = tx.objectStore('leagues');
    const metadataStore = tx.objectStore(METADATA_STORE);
    const leagueDataStore = tx.objectStore(LEAGUE_DATA_STORE);

    const allLeagues = await oldStore.getAll();

    for (const league of allLeagues) {
      // Split into metadata and league data
      const metadata: LeagueMetadata = {
        id: league.id,
        name: league.name,
        sport: league.sport,
        savedAt: league.savedAt,
        lastPlayed: league.lastPlayed,
        fileSize: league.fileSize,
        numPlayers: league.numPlayers,
        numTeams: league.numTeams,
        seasons: league.seasons,
        isMetadataOnly: league.isMetadataOnly,
        idbName: league.idbName,
        starred: league.starred,
        yearRange: league.yearRange,
      };

      await metadataStore.put(metadata);

      // Only store league data if not metadata-only
      if (!league.isMetadataOnly && league.leagueData) {
        await leagueDataStore.put({ id: league.id, leagueData: league.leagueData });
      }
    }

    await tx.done;

    // Delete old store
    const deleteDb = await openDB(DB_NAME, 3, {
      upgrade(db) {
        if (db.objectStoreNames.contains('leagues')) {
          db.deleteObjectStore('leagues');
        }
      },
    });
    deleteDb.close();

    console.log(`[Storage] Migrated ${allLeagues.length} leagues from v1 to v2`);
  } catch (error) {
    console.error('[Storage] Migration failed:', error);
  }
}

// Call migration on module load
migrateV1ToV2();

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

  // Save metadata
  const metadata: LeagueMetadata = {
    id,
    name,
    sport,
    savedAt: Date.now(),
    fileSize,
    numPlayers,
    numTeams,
    seasons,
  };

  const tx = db.transaction([METADATA_STORE, LEAGUE_DATA_STORE], 'readwrite');
  await tx.objectStore(METADATA_STORE).put(metadata);
  await tx.objectStore(LEAGUE_DATA_STORE).put({ id, leagueData });
  await tx.done;

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
  const metadata: LeagueMetadata = {
    id,
    name,
    sport,
    savedAt: Date.now(),
    fileSize,
    numPlayers,
    numTeams,
    seasons,
    isMetadataOnly: true, // Flag indicating this references separate IDB
    idbName, // The database name where the actual data is stored
  };

  await db.put(METADATA_STORE, metadata);
  return id;
}

export async function getAllLeagues(): Promise<StoredLeague[]> {
  const db = await getDB();
  const metadata = await db.getAll(METADATA_STORE);

  // Sort by lastPlayed descending (most recently played first), fallback to savedAt
  return metadata.sort((a, b) => {
    const aTime = a.lastPlayed || a.savedAt;
    const bTime = b.lastPlayed || b.savedAt;
    return bTime - aTime;
  });
}

export async function getLeague(id: string): Promise<StoredLeague | undefined> {
  const db = await getDB();

  // Get metadata
  const metadata = await db.get(METADATA_STORE, id);
  if (!metadata) return undefined;

  // If metadata-only (league data in separate IDB), return just metadata
  if (metadata.isMetadataOnly) {
    return metadata;
  }

  // Get league data
  const dataEntry = await db.get(LEAGUE_DATA_STORE, id);
  return {
    ...metadata,
    leagueData: dataEntry?.leagueData,
  };
}

export async function deleteLeague(id: string): Promise<void> {
  const db = await getDB();

  // Get metadata to check if it has an associated IDB database
  const metadata = await db.get(METADATA_STORE, id);

  const tx = db.transaction([METADATA_STORE, LEAGUE_DATA_STORE], 'readwrite');
  await tx.objectStore(METADATA_STORE).delete(id);
  await tx.objectStore(LEAGUE_DATA_STORE).delete(id);
  await tx.done;

  // If this was a metadata-only save with a dedicated IDB, delete that database too
  if (metadata?.isMetadataOnly && metadata.idbName) {
    try {
      await deleteLeagueIDB(metadata.idbName);
    } catch (error) {
      console.error(`[Storage] Failed to delete league database ${metadata.idbName}:`, error);
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
  const metadata = await db.get(METADATA_STORE, id);
  if (metadata) {
    metadata.name = newName;
    await db.put(METADATA_STORE, metadata);
  }
}

export async function updateLastPlayed(id: string): Promise<void> {
  const db = await getDB();
  const metadata = await db.get(METADATA_STORE, id);
  if (metadata) {
    metadata.lastPlayed = Date.now();
    await db.put(METADATA_STORE, metadata);
  }
}

export async function updateYearRange(id: string, yearRange: [number, number]): Promise<void> {
  const db = await getDB();
  const metadata = await db.get(METADATA_STORE, id);
  if (metadata) {
    metadata.yearRange = yearRange;
    await db.put(METADATA_STORE, metadata);
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
  const metadata = await db.get(METADATA_STORE, id);
  if (metadata) {
    metadata.starred = !metadata.starred;
    await db.put(METADATA_STORE, metadata);
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
      // Get metadata to check if it has an associated IDB database
      const metadata = await db.get(METADATA_STORE, id);

      // Delete from both stores
      const tx = db.transaction([METADATA_STORE, LEAGUE_DATA_STORE], 'readwrite');
      await tx.objectStore(METADATA_STORE).delete(id);
      await tx.objectStore(LEAGUE_DATA_STORE).delete(id);
      await tx.done;

      deletedCount++;

      // If this was a metadata-only save with a dedicated IDB, delete that database too
      if (metadata?.isMetadataOnly && metadata.idbName) {
        try {
          await deleteLeagueIDB(metadata.idbName);
        } catch (error) {
          console.error(`[Storage] Failed to delete league database ${metadata.idbName}:`, error);
        }
      }
    } catch (error) {
      console.error(`[Storage] Failed to delete league ${id}:`, error);
    }
  }

  return deletedCount;
}
