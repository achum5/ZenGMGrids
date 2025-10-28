import { openDB, type IDBPDatabase } from 'idb';
import type { LeagueData, Player, Team, TeamOverlapData } from '@/types/bbgm';
import { calculatePlayerAchievements, clearSeasonLengthCache, calculateLeagueLeadership, calculateTeamSeasonsAndAchievementSeasons, setCachedSportDetection } from '@/lib/achievements';
import { getCachedSeasonIndex } from './season-index-cache';
import type { SeasonIndex } from './season-achievements';
import type { Sport } from './league-normalizer';
import { analyzeTeamOverlaps } from './league-normalizer';

const DB_VERSION = 5; // Bumped for new intersections store

export interface IDBLeagueMeta {
  sport: Sport;
  playerCount: number;
  teamCount: number;
  teamSeasonCount?: number;
  version?: any;
  startingSeason?: any;
  gameAttributes?: any;
  meta?: any;
}

/**
 * Open the league database
 */
export async function openLeagueDB(dbName: string = 'grids-league'): Promise<IDBPDatabase> {
  return openDB(dbName, DB_VERSION);
}

/**
 * Get metadata from IDB
 */
export async function getLeagueMeta(dbName?: string): Promise<IDBLeagueMeta | null> {
  const db = await openLeagueDB(dbName);
  try {
    const meta = await db.get('meta', 'importMeta');
    return meta || null;
  } finally {
    db.close();
  }
}

/**
 * Detect if we're on a mobile device for memory-aware processing
 */
function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  return mobileKeywords.some(keyword => userAgent.includes(keyword)) || 
         (('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth <= 768);
}

/**
 * Read all players from IDB in small batches using cursor for memory efficiency
 * This prevents loading all players at once which can crash mobile browsers
 */
export async function readAndNormalizePlayers(
  onProgress?: (message: string) => void,
  dbName?: string
): Promise<{ players: Player[]; sport: Sport; gameAttributes: any; minSeason: number; maxSeason: number }> {
  const db = await openLeagueDB(dbName);
  const mobile = isMobile();
  
  try {
    onProgress?.('Reading metadata...');
    const meta = await db.get('meta', 'importMeta') as IDBLeagueMeta | undefined;
    
    if (!meta) {
      throw new Error('No league data found in database');
    }
    
    const gameAttributes = meta.gameAttributes || {};
    const totalPlayers = meta.playerCount || 0;
    
    onProgress?.('Loading players...');
    
    // MOBILE FIX: Use cursor instead of getAll() to avoid loading all players into memory at once
    // First, read a small sample for sport detection only
    const samplePlayers: any[] = [];
    let tx = db.transaction('players', 'readonly');
    let store = tx.objectStore('players');
    let cursor = await store.openCursor();
    let sampleCount = 0;
    
    while (cursor && sampleCount < 10) {
      samplePlayers.push(cursor.value);
      cursor = await cursor.continue();
      sampleCount++;
    }
    await tx.done;
    
    // Detect sport using the robust detection function
    onProgress?.('Detecting sport type...');
    const { detectSport } = await import('./league-normalizer');
    const sport = detectSport({ players: samplePlayers });
    setCachedSportDetection(sport);
    
    onProgress?.('Reading player data from database...');
    
    // CRITICAL FIX: Read ALL data from cursor first WITHOUT yielding
    // Yielding during cursor iteration causes transaction timeout
    const rawPlayers: any[] = [];
    tx = db.transaction('players', 'readonly');
    store = tx.objectStore('players');
    cursor = await store.openCursor();
    
    while (cursor) {
      rawPlayers.push(cursor.value);
      cursor = await cursor.continue();
    }
    await tx.done;
    
    onProgress?.('Processing player data...');
    
    // Transform raw players into normalized Player objects
    const players: Player[] = [];
    let currentSeason = gameAttributes?.season || 2023;
    let minSeason = currentSeason;
    let maxSeason = currentSeason;
    
    // MOBILE FIX: Process in smaller batches with more aggressive memory management
    const BATCH_SIZE = mobile ? 200 : 500; // Smaller batches on mobile
    const YIELD_INTERVAL = mobile ? 100 : 500; // Yield more frequently on mobile
    
    let processedCount = 0;
    
    // Now process in batches WITH yields (transaction is already done)
    for (let batchStart = 0; batchStart < rawPlayers.length; batchStart += BATCH_SIZE) {
      const batch = rawPlayers.slice(batchStart, batchStart + BATCH_SIZE);
      
      // Find min/max seasons from this batch
      for (const rawPlayer of batch) {
        if (rawPlayer.stats) {
          for (const stat of rawPlayer.stats) {
            if (!stat.playoffs && stat.season) {
              if (stat.season < minSeason) minSeason = stat.season;
              if (stat.season > maxSeason) maxSeason = stat.season;
            }
          }
        }
      }
      
      // Process batch into normalized players
      for (const rawPlayer of batch) {
        const regularSeasonStats = rawPlayer.stats?.filter((stat: any) => !stat.playoffs) || [];
        const playoffStats = rawPlayer.stats?.filter((stat: any) => stat.playoffs) || [];
        
        const seasons = [
          ...regularSeasonStats.map((stat: any) => ({ 
            season: stat.season, 
            tid: stat.tid, 
            gp: stat.gp || 0, 
            playoffs: false 
          })),
          ...playoffStats.map((stat: any) => ({ 
            season: stat.season, 
            tid: stat.tid, 
            gp: stat.gp || 0, 
            playoffs: true 
          }))
        ];
        
        const teamsPlayed = new Set<number>();
        regularSeasonStats.forEach((stat: any) => {
          if ((stat.gp || 0) > 0) teamsPlayed.add(stat.tid);
        });
        
        if (teamsPlayed.size > 0) {
          let firstSeason = 0, lastSeason = 0;
          if (seasons.length > 0) {
            firstSeason = seasons.reduce((min, s) => Math.min(min, s.season), seasons[0].season);
            lastSeason = seasons.reduce((max, s) => Math.max(max, s.season), seasons[0].season);
          }
          
          const decadesPlayed = new Set<number>();
          seasons.forEach(s => {
            if (s.season > 0) decadesPlayed.add(Math.floor(s.season / 10) * 10);
          });
          
          players.push({
            pid: rawPlayer.pid,
            name: `${rawPlayer.firstName || ''} ${rawPlayer.lastName || ''}`.trim() || 'Unknown Player',
            seasons,
            teamsPlayed,
            imgURL: rawPlayer.imgURL || null,
            face: rawPlayer.face || null,
            firstName: rawPlayer.firstName,
            lastName: rawPlayer.lastName,
            pos: rawPlayer.pos,
            born: rawPlayer.born,
            draft: rawPlayer.draft,
            weight: rawPlayer.weight,
            hgt: rawPlayer.hgt,
            tid: rawPlayer.tid ?? -1,
            awards: rawPlayer.awards || [],
            stats: rawPlayer.stats || [],
            ratings: rawPlayer.ratings || [],
            retiredYear: rawPlayer.retiredYear,
            contract: rawPlayer.contract,
            college: rawPlayer.college,
            injury: rawPlayer.injury,
            jerseyNumber: rawPlayer.jerseyNumber,
            firstSeason: firstSeason > 0 ? firstSeason : undefined,
            lastSeason: lastSeason > 0 ? lastSeason : undefined,
            debutDecade: firstSeason > 0 ? Math.floor(firstSeason / 10) * 10 : undefined,
            retiredDecade: lastSeason > 0 ? Math.floor(lastSeason / 10) * 10 : undefined,
            decadesPlayed: decadesPlayed.size > 0 ? decadesPlayed : undefined,
          });
        }
        
        processedCount++;
        
        // Yield more frequently on mobile
        if (processedCount % YIELD_INTERVAL === 0) {
          if (totalPlayers > 0) {
            const percentage = Math.floor((processedCount / totalPlayers) * 100);
            onProgress?.(`Processing ${processedCount.toLocaleString()} of ${totalPlayers.toLocaleString()} players (${percentage}%)...`);
          }
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }
    
    return { players, sport, gameAttributes, minSeason, maxSeason };
    
  } finally {
    db.close();
  }
}

/**
 * Read all teams from IDB
 */
export async function readTeams(dbName?: string): Promise<Team[]> {
  const db = await openLeagueDB(dbName);
  
  try {
    const tx = db.transaction('teams', 'readonly');
    const store = tx.objectStore('teams');
    const rawTeams = await store.getAll();
    await tx.done;
    
    return rawTeams.map((team: any) => ({
      tid: team.tid,
      abbrev: team.abbrev || team.region || 'UNK',
      name: team.name || 'Unknown',
      region: team.region,
      colors: team.colors || [],
      jersey: team.jersey || 'modern',
      imgURL: team.imgURL || null,
      imgURLSmall: team.imgURLSmall || team.smallImgURL || null,
      seasons: team.seasons || [],
      disabled: team.disabled || false,
    }));
  } finally {
    db.close();
  }
}

/**
 * Read all teamSeasons from IDB
 */
export async function readTeamSeasons(dbName?: string): Promise<any[]> {
  const db = await openLeagueDB(dbName);

  try {
    const tx = db.transaction('teamSeasons', 'readonly');
    const store = tx.objectStore('teamSeasons');
    const teamSeasons = await store.getAll();
    await tx.done;

    // Deduplicate teamSeasons (worker may have added duplicates from both raw.teamSeasons and team.seasons)
    const seen = new Map<string, any>();
    for (const ts of teamSeasons) {
      const key = `${ts.tid}-${ts.season}-${ts.playoffs || false}`;
      if (!seen.has(key)) {
        seen.set(key, ts);
      }
    }

    return Array.from(seen.values());
  } catch (error) {
    // teamSeasons store may not exist in older database versions
    console.warn('[IDB Reader] Could not read teamSeasons (may not exist):', error);
    return [];
  } finally {
    db.close();
  }
}

/**
 * Process the league data from IDB - calculates achievements and overlaps
 */
export async function processLeagueFromIDB(
  onProgress?: (message: string) => void,
  dbName?: string
): Promise<LeagueData & { sport: Sport } & { isFullyProcessed?: boolean; byName?: any; byPid?: any; searchablePlayers?: any; teamsByTid?: any }> {
  try {
    onProgress?.('Reading from database...');
    
    // Read players, teams, and teamSeasons in parallel
    const [{ players, sport, gameAttributes, minSeason, maxSeason }, teams, teamSeasons] = await Promise.all([
      readAndNormalizePlayers(onProgress, dbName),
      readTeams(dbName),
      readTeamSeasons(dbName)
    ]);
    
    
    // Set sport detection cache
    setCachedSportDetection(sport);
    
    // League years already calculated during reading
    const leagueYears = { minSeason, maxSeason };
    
    onProgress?.('Calculating player achievements...');
    clearSeasonLengthCache();
    const leadershipMap = calculateLeagueLeadership(players, gameAttributes);
    const playerFeats: any[] = []; // We don't store feats in IDB yet
    
    const mobile = isMobile();
    
    // MOBILE FIX: Process achievements in smaller chunks with more frequent yields
    const CHUNK_SIZE = mobile ? 100 : 500; // Much smaller on mobile
    for (let i = 0; i < players.length; i += CHUNK_SIZE) {
      const chunk = players.slice(i, i + CHUNK_SIZE);
      
      for (const player of chunk) {
        player.achievements = calculatePlayerAchievements(player, players, leadershipMap, playerFeats, leagueYears);
        calculateTeamSeasonsAndAchievementSeasons(player, leadershipMap, gameAttributes);
      }
      
      if (i % 1000 === 0 && i > 0) {
        onProgress?.(`Processing achievements (${i.toLocaleString()} of ${players.length.toLocaleString()} players)...`);
      }
      
      // Yield to prevent UI freeze - more frequently on mobile
      await new Promise(resolve => setTimeout(resolve, mobile ? 5 : 0));
    }
    
    onProgress?.('Building team overlaps...');
    const teamOverlaps = await analyzeTeamOverlaps(players, teams, mobile);
    
    // Build season index if applicable
    let seasonIndex: SeasonIndex | undefined;
    const uniqueSeasons = new Set(players.flatMap(p => p.stats?.filter(s => !s.playoffs).map(s => s.season) || []));
    const seasonCount = uniqueSeasons.size;
    
    if (['basketball', 'football', 'hockey', 'baseball'].includes(sport) && seasonCount >= 20) {
      onProgress?.('Finalizing season data...');
      seasonIndex = getCachedSeasonIndex(players, sport);
    }
    
    // MOBILE FIX: Build search index here to avoid redundant processing later
    onProgress?.('Building search index...');
    const { buildSearchIndex } = await import('./bbgm-parser');
    const { byName, byPid, searchablePlayers, teamsByTid } = await buildSearchIndex(players, teams);
    
    onProgress?.('Complete!');
    
    // Try to read playoff series if available (may not exist in older databases)
    let playoffSeries: any[] | undefined = undefined;
    try {
      const db2 = await openLeagueDB(dbName);
      const tx = db2.transaction('meta', 'readonly');
      const store = tx.objectStore('meta');
      const meta = await store.get('importMeta');
      await tx.done;
      db2.close();
      
      // Check if meta has playoffSeries stored
      if (meta?.playoffSeries) {
        const rawPlayoffSeries = meta.playoffSeries;

        // Normalize to array format - it might be an object keyed by season or an array
        if (Array.isArray(rawPlayoffSeries)) {
          playoffSeries = rawPlayoffSeries;
        } else if (typeof rawPlayoffSeries === 'object' && rawPlayoffSeries !== null) {
          // Convert object to array of season objects
          playoffSeries = Object.keys(rawPlayoffSeries).map(season => ({
            season: parseInt(season),
            ...rawPlayoffSeries[season]
          }));
        }
      } else {
      }
    } catch (error) {
      console.error('[IDB Reader] Error reading playoff series:', error);
    }
    
    return { 
      players, 
      teams, 
      teamSeasons, 
      sport, 
      teamOverlaps, 
      seasonIndex, 
      leagueYears,
      playoffSeries,
      // Include search indices to avoid rebuilding
      byName,
      byPid,
      searchablePlayers,
      teamsByTid,
      // Flag to indicate this data is already fully processed
      isFullyProcessed: true
    };
    
  } catch (error) {
    console.error('Error processing league from IDB:', error);
    throw error;
  }
}

/**
 * Check if there's data in IDB
 */
export async function hasLeagueData(): Promise<boolean> {
  try {
    const meta = await getLeagueMeta();
    return meta !== null && (meta.playerCount || 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Clear all league data from IDB
 */
export async function clearLeagueData(): Promise<void> {
  const db = await openLeagueDB();
  try {
    await Promise.all([
      db.clear('players'),
      db.clear('teams'),
      db.clear('teamSeasons'),
      db.clear('meta')
    ]);
  } finally {
    db.close();
  }
}
