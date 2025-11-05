import pako from 'pako';
import { JSONParser } from '@streamparser/json-whatwg';
import { normalizeLeague, type Sport } from './league-normalizer';
import type { LeagueData } from '@/types/bbgm';
import { openDB } from 'idb';

// File size threshold for automatic method selection (50MB compressed)
// Only used when method is 'auto'
const STREAMING_THRESHOLD = 100 * 1024 * 1024;

export type ParsingMethod = 'traditional' | 'streaming' | 'mobile-idb';

// Helper to post progress messages
const postProgress = (message: string, loaded?: number, total?: number) => {
  self.postMessage({ type: 'progress', message, loaded, total });
};

// Old non-streaming method for small files
async function parseFileTraditional(file: File): Promise<any> {
  postProgress('Reading file...', 5, 100);
  const arrayBuffer = await file.arrayBuffer();
  let content: string;

  if (file.name.endsWith('.gz')) {
    postProgress('Decompressing file...', 15, 100);
    const compressed = new Uint8Array(arrayBuffer);
    content = pako.inflate(compressed, { to: 'string' });
    postProgress('Decompression complete', 35, 100);
  } else {
    postProgress('File loaded', 20, 100);
    content = new TextDecoder('utf-8').decode(arrayBuffer);
  }

  postProgress('Parsing league data...', 40, 100);
  return JSON.parse(content);
}

// Traditional URL fetch for small files
async function parseUrlTraditional(url: string): Promise<any> {
  postProgress('Connecting to URL...', 5, 100);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  postProgress('Downloading file...', 15, 100);
  const arrayBuffer = await response.arrayBuffer();
  
  if (arrayBuffer.byteLength === 0) {
    throw new Error('Empty response from server');
  }
  
  let content: string;
  const isCompressed = url.includes('.gz') || url.includes('.json.gz');
  
  if (isCompressed) {
    postProgress('Decompressing file...', 25, 100);
    const compressed = new Uint8Array(arrayBuffer);
    content = pako.inflate(compressed, { to: 'string' });
    postProgress('Decompression complete', 35, 100);
  } else {
    postProgress('File downloaded', 30, 100);
    content = new TextDecoder('utf-8').decode(arrayBuffer);
  }
  
  postProgress('Parsing league data...', 40, 100);
  return JSON.parse(content);
}

// Streaming: Stream directly to IndexedDB, never materialize giant arrays
async function parseFileStreaming(file: File, dbName: string = 'grids-league'): Promise<'idb-stored'> {
  // Using static import from top of file instead of dynamic import
  
  postProgress('Setting up database...', 5, 100);
  
  // Open/create IndexedDB with the specified database name
  const db = await openDB(dbName, 5, {
    upgrade(db, oldVersion) {
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains('players')) {
        const playerStore = db.createObjectStore('players', { keyPath: 'pid' });
        playerStore.createIndex('tid', 'tid', { multiEntry: true });
      }
      if (!db.objectStoreNames.contains('teams')) {
        db.createObjectStore('teams', { keyPath: 'tid' });
      }
      if (!db.objectStoreNames.contains('teamSeasons')) {
        const teamSeasonStore = db.createObjectStore('teamSeasons', { autoIncrement: true });
        teamSeasonStore.createIndex('season_tid', ['season', 'tid'], { unique: false });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
      if (!db.objectStoreNames.contains('intersections')) {
        db.createObjectStore('intersections', { keyPath: 'key' });
      }
    }
  });
  
  // Clear old data
  postProgress('Clearing previous data...', 10, 100);
  await db.clear('players');
  await db.clear('teams');
  await db.clear('teamSeasons');
  await db.clear('meta');
  
  const isCompressed = file.name.endsWith('.gz');
  let dataStream = file.stream();
  
  if (isCompressed) {
    postProgress('Setting up decompression...', 15, 100);
    // Use pako for mobile compatibility
    const decompressionTransform = new TransformStream({
      start(controller) {
        const inflator = new pako.Inflate({ chunkSize: 16 * 1024 });
        inflator.onData = (chunk: Uint8Array) => controller.enqueue(chunk);
        inflator.onEnd = (status: number) => {
          if (status !== 0) {
            controller.error(new Error(`Decompression failed: ${inflator.msg || 'Unknown error'}`));
          }
        };
        (controller as any).inflator = inflator;
      },
      transform(chunk, controller) {
        (controller as any).inflator.push(chunk, false);
      },
      flush(controller) {
        (controller as any).inflator.push(new Uint8Array(0), true);
      }
    });
    dataStream = dataStream.pipeThrough(decompressionTransform);
  }
  
  postProgress('Streaming to database...', 20, 100);
  
  // Parse with wildcard paths to get individual items
  const jsonParser = new JSONParser({ 
    paths: [
      '$.version',
      '$.startingSeason',
      '$.gameAttributes',
      '$.players.*',
      '$.teams.*',
      '$.teams[*].seasons[*]',  // Capture nested team seasons
      '$.teamSeasons.*',
      '$.teamStats.*',          // Alternative name for team seasons
      '$.meta',
      '$.playoffSeries'       // Capture entire playoffSeries object/array
    ],
    keepStack: false 
  });
  
  const jsonStream = dataStream.pipeThrough(jsonParser);
  const reader = jsonStream.getReader();
  
  // Buffers for batching
  const playerQueue: any[] = [];
  const teamQueue: any[] = [];
  const teamSeasonQueue: any[] = [];
  const BATCH_SIZE = 200;
  const MAX_QUEUE = 400;
  
  let itemCount = 0;
  let playerCount = 0;
  let teamCount = 0;
  let teamSeasonCount = 0;
  let sport: string | null = null;
  let meta: any = null;
  let version: any = null;
  let startingSeason: any = null;
  let gameAttributes: any = null;
  let playoffSeries: any = null;  // Changed to single value instead of array
  let currentArraySection: 'players' | 'teams' | 'teamSeasons' | null = null;

  // Track unique team-season combinations to avoid duplicates
  const teamSeasonKeys = new Set<string>();

  // Helper to detect sport from player
  const detectSportFromPlayer = (player: any) => {
    if (sport) return;
    const stats = player.stats?.[0] || {};
    if ('fga' in stats || 'trb' in stats) sport = 'basketball';
    else if ('rushYds' in stats || 'passTD' in stats) sport = 'football';
    else if ('ab' in stats || 'hr' in stats) sport = 'baseball';
    else if (('g' in stats && 'a' in stats) || 'sv' in stats) sport = 'hockey';
  };
  
  // Helper to flush buffers to IDB
  const flushBuffers = async (force = false) => {
    const shouldFlush = force || playerQueue.length >= BATCH_SIZE || teamQueue.length >= BATCH_SIZE || teamSeasonQueue.length >= BATCH_SIZE;
    if (!shouldFlush) return;
    
    if (playerQueue.length > 0) {
      const tx = db.transaction('players', 'readwrite');
      const store = tx.objectStore('players');
      const batch = playerQueue.splice(0, Math.min(BATCH_SIZE, playerQueue.length));
      for (const player of batch) {
        if (!player || typeof player.pid === 'undefined') {
          console.error('[Streaming] Invalid player object (missing pid):', player);
          continue;
        }
        await store.put(player);
      }
      await tx.done;
    }
    
    if (teamQueue.length > 0) {
      const tx = db.transaction('teams', 'readwrite');
      const store = tx.objectStore('teams');
      const batch = teamQueue.splice(0, Math.min(BATCH_SIZE, teamQueue.length));
      for (const team of batch) {
        if (!team || typeof team.tid === 'undefined') {
          console.error('[Streaming] Invalid team object (missing tid):', team);
          continue;
        }
        await store.put(team);
      }
      await tx.done;
    }
    
    if (teamSeasonQueue.length > 0) {
      const tx = db.transaction('teamSeasons', 'readwrite');
      const store = tx.objectStore('teamSeasons');
      const batch = teamSeasonQueue.splice(0, Math.min(BATCH_SIZE, teamSeasonQueue.length));
      for (const teamSeason of batch) {
        await store.add(teamSeason);
      }
      await tx.done;
    }
  };
  
  try {
    while (true) {
      // Backpressure: pause if queue too large
      while (playerQueue.length + teamQueue.length + teamSeasonQueue.length > MAX_QUEUE) {
        await flushBuffers(true);
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      const { done, value } = await reader.read();
      if (done) break;
      
      if (value && value.value !== undefined) {
        const keyString = typeof value.key === 'string' ? value.key : String(value.key);
        const pathArray = keyString ? keyString.split('.').filter(Boolean) : [];
        const topLevelKey = pathArray[0];
        
        if (!topLevelKey) continue;
        
        const isArrayIndex = /^\d+$/.test(topLevelKey);
        
        // Debug logging for playoff series
        if (keyString.includes('playoff')) {
        }
        
        if (isArrayIndex) {
          // Determine which array based on order
          if (topLevelKey === '0') {
            if (!currentArraySection) {
              currentArraySection = 'players';
              postProgress('Processing players...', 25, 100);
            } else if (currentArraySection === 'players') {
              currentArraySection = 'teams';
              postProgress('Processing teams...', 70, 100);
            } else if (currentArraySection === 'teams') {
              currentArraySection = 'teamSeasons';
              postProgress('Processing team seasons...', 85, 100);
            }
          }
          
          if (currentArraySection === 'players') {
            detectSportFromPlayer(value.value);
            playerQueue.push(value.value);
            playerCount++;
            
            // Progress update every 1000 players
            if (playerCount % 1000 === 0) {
              const pct = Math.min(65, 25 + (playerCount / 1000) * 2);
              postProgress(`Processed ${playerCount.toLocaleString()} players...`, pct, 100);
              self.postMessage({ type: 'meta', sport, counts: { players: playerCount, teams: teamCount, teamSeasons: teamSeasonCount } });
            }
          } else if (currentArraySection === 'teams') {
            const team = value.value as any;
            teamQueue.push(team);
            teamCount++;

            // Extract nested seasons from this team, checking for duplicates
            if (team && typeof team === 'object' && team.seasons && Array.isArray(team.seasons)) {
              for (const season of team.seasons) {
                const key = `${team.tid}-${season.season}-${season.playoffs || false}`;
                if (!teamSeasonKeys.has(key)) {
                  teamSeasonKeys.add(key);
                  teamSeasonQueue.push({
                    tid: team.tid,
                    season: season.season,
                    won: season.won,
                    lost: season.lost,
                    tied: season.tied,
                    otl: season.otl,
                    playoffs: season.playoffs || false,
                    gp: season.gp,
                    pts: season.pts,
                    oppPts: season.oppPts
                  });
                  teamSeasonCount++;
                }
              }
            }
          } else if (currentArraySection === 'teamSeasons') {
            const teamSeason = value.value as any;
            if (teamSeason && typeof teamSeason === 'object') {
              const key = `${teamSeason.tid}-${teamSeason.season}-${teamSeason.playoffs || false}`;
              if (!teamSeasonKeys.has(key)) {
                teamSeasonKeys.add(key);
                teamSeasonQueue.push(teamSeason);
                teamSeasonCount++;
              }
            }
            
            // Progress update every 100 team seasons
            if (teamSeasonCount % 100 === 0) {
              const pct = Math.min(95, 85 + (teamSeasonCount / 100) * 0.1);
              postProgress(`Processed ${teamSeasonCount} team seasons...`, pct, 100);
            }
          }
        } else {
          // Non-array values
          if (topLevelKey === 'version') version = value.value;
          else if (topLevelKey === 'startingSeason') startingSeason = value.value;
          else if (topLevelKey === 'gameAttributes') {
            gameAttributes = value.value;
            if (gameAttributes?.sport) sport = gameAttributes.sport;
          }
          else if (topLevelKey === 'meta') meta = value.value;
          else if (topLevelKey === 'playoffSeries') {
            // Capture entire playoffSeries object/array
            playoffSeries = value.value;
            const seriesCount = Array.isArray(playoffSeries) ? playoffSeries.length : Object.keys(playoffSeries || {}).length;
          }
          currentArraySection = null;
        }
        
        itemCount++;
        
        // Yield frequently for GC
        if (itemCount % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        // Periodic flush
        if (itemCount % 500 === 0) {
          await flushBuffers(false);
        }
      }
    }
    
    // Final flush - keep flushing until all queues are empty
    postProgress('Finalizing database...', 90, 100);
    while (playerQueue.length > 0 || teamQueue.length > 0 || teamSeasonQueue.length > 0) {
      await flushBuffers(true);
    }


    // Store metadata (include playoffSeries if we found any)
    const metaData: any = { sport, playerCount, teamCount, teamSeasonCount, version, startingSeason, gameAttributes, meta };
    if (playoffSeries) {
      metaData.playoffSeries = playoffSeries;
    }
    await db.put('meta', metaData, 'importMeta');

    postProgress('Import complete', 100, 100);
    db.close();
    
    return 'idb-stored';
    
  } catch (err) {
    db.close();
    throw err;
  } finally {
    reader.releaseLock();
  }
}

// Streaming for URLs: Same as file version but fetches from URL
async function parseUrlStreaming(url: string, dbName: string = 'grids-league'): Promise<'idb-stored'> {
  postProgress('Connecting to URL...', 5, 100);
  
  // Fetch the URL
  const response = await fetch(url, { mode: 'cors' });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  if (!response.body) {
    throw new Error('Response body not available');
  }
  
  postProgress('Setting up database...', 8, 100);
  
  // Open/create IndexedDB with the specified database name
  const db = await openDB(dbName, 5, {
    upgrade(db, oldVersion) {
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains('players')) {
        const playerStore = db.createObjectStore('players', { keyPath: 'pid' });
        playerStore.createIndex('tid', 'tid', { multiEntry: true });
      }
      if (!db.objectStoreNames.contains('teams')) {
        db.createObjectStore('teams', { keyPath: 'tid' });
      }
      if (!db.objectStoreNames.contains('teamSeasons')) {
        const teamSeasonStore = db.createObjectStore('teamSeasons', { autoIncrement: true });
        teamSeasonStore.createIndex('season_tid', ['season', 'tid'], { unique: false });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
      if (!db.objectStoreNames.contains('intersections')) {
        db.createObjectStore('intersections', { keyPath: 'key' });
      }
    }
  });
  
  // Clear old data
  postProgress('Clearing previous data...', 10, 100);
  await db.clear('players');
  await db.clear('teams');
  await db.clear('teamSeasons');
  await db.clear('meta');
  
  const isCompressed = url.includes('.gz') || url.includes('.json.gz');
  let dataStream = response.body;
  
  if (isCompressed) {
    postProgress('Setting up decompression...', 15, 100);
    // Use pako for mobile compatibility
    const decompressionTransform = new TransformStream({
      start(controller) {
        const inflator = new pako.Inflate({ chunkSize: 16 * 1024 });
        inflator.onData = (chunk: Uint8Array) => controller.enqueue(chunk);
        inflator.onEnd = (status: number) => {
          if (status !== 0) {
            controller.error(new Error(`Decompression failed: ${inflator.msg || 'Unknown error'}`));
          }
        };
        (controller as any).inflator = inflator;
      },
      transform(chunk, controller) {
        (controller as any).inflator.push(chunk, false);
      },
      flush(controller) {
        (controller as any).inflator.push(new Uint8Array(0), true);
      }
    });
    dataStream = dataStream.pipeThrough(decompressionTransform);
  }
  
  postProgress('Streaming to database...', 20, 100);
  
  // Parse with wildcard paths to get individual items
  const jsonParser = new JSONParser({ 
    paths: [
      '$.version',
      '$.startingSeason',
      '$.gameAttributes',
      '$.players.*',
      '$.teams.*',
      '$.teams[*].seasons[*]',  // Capture nested team seasons
      '$.teamSeasons.*',
      '$.teamStats.*',          // Alternative name for team seasons
      '$.meta',
      '$.playoffSeries'       // Capture entire playoffSeries object/array
    ],
    keepStack: false 
  });
  
  const jsonStream = dataStream.pipeThrough(jsonParser);
  const reader = jsonStream.getReader();
  
  // Buffers for batching
  const playerQueue: any[] = [];
  const teamQueue: any[] = [];
  const teamSeasonQueue: any[] = [];
  const BATCH_SIZE = 200;
  const MAX_QUEUE = 400;
  
  let itemCount = 0;
  let playerCount = 0;
  let teamCount = 0;
  let teamSeasonCount = 0;
  let sport: string | null = null;
  let meta: any = null;
  let version: any = null;
  let startingSeason: any = null;
  let gameAttributes: any = null;
  let playoffSeries: any = null;  // Changed to single value instead of array
  let currentArraySection: 'players' | 'teams' | 'teamSeasons' | null = null;

  // Track unique team-season combinations to avoid duplicates
  const teamSeasonKeys = new Set<string>();

  // Helper to detect sport from player
  const detectSportFromPlayer = (player: any) => {
    if (sport) return;
    const stats = player.stats?.[0] || {};
    if ('fga' in stats || 'trb' in stats) sport = 'basketball';
    else if ('rushYds' in stats || 'passTD' in stats) sport = 'football';
    else if ('ab' in stats || 'hr' in stats) sport = 'baseball';
    else if (('g' in stats && 'a' in stats) || 'sv' in stats) sport = 'hockey';
  };
  
  // Flush buffers to IDB
  const flushBuffers = async (force: boolean) => {
    if (!force && playerQueue.length < BATCH_SIZE && teamQueue.length < BATCH_SIZE && teamSeasonQueue.length < BATCH_SIZE) {
      return;
    }
    
    if (playerQueue.length > 0) {
      const tx = db.transaction('players', 'readwrite');
      const store = tx.objectStore('players');
      const batch = playerQueue.splice(0, Math.min(BATCH_SIZE, playerQueue.length));
      for (const player of batch) {
        if (!player || typeof player.pid === 'undefined') {
          console.error('[Streaming] Invalid player object (missing pid):', player);
          continue;
        }
        await store.put(player);
      }
      await tx.done;
    }
    
    if (teamQueue.length > 0) {
      const tx = db.transaction('teams', 'readwrite');
      const store = tx.objectStore('teams');
      const batch = teamQueue.splice(0, Math.min(BATCH_SIZE, teamQueue.length));
      for (const team of batch) {
        if (!team || typeof team.tid === 'undefined') {
          console.error('[Streaming] Invalid team object (missing tid):', team);
          continue;
        }
        await store.put(team);
      }
      await tx.done;
    }
    
    if (teamSeasonQueue.length > 0) {
      const tx = db.transaction('teamSeasons', 'readwrite');
      const store = tx.objectStore('teamSeasons');
      const batch = teamSeasonQueue.splice(0, Math.min(BATCH_SIZE, teamSeasonQueue.length));
      for (const teamSeason of batch) {
        await store.add(teamSeason);
      }
      await tx.done;
    }
  };
  
  try {
    while (true) {
      // Backpressure: pause if queue too large
      while (playerQueue.length + teamQueue.length + teamSeasonQueue.length > MAX_QUEUE) {
        await flushBuffers(true);
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      const { done, value } = await reader.read();
      if (done) break;
      
      if (value && value.value !== undefined) {
        const keyString = typeof value.key === 'string' ? value.key : String(value.key);
        const pathArray = keyString ? keyString.split('.').filter(Boolean) : [];
        const topLevelKey = pathArray[0];
        
        if (!topLevelKey) continue;
        
        const isArrayIndex = /^\d+$/.test(topLevelKey);
        
        // Debug logging for playoff series
        if (keyString.includes('playoff')) {
        }
        
        if (isArrayIndex) {
          // Determine which array based on order
          if (topLevelKey === '0') {
            if (!currentArraySection) {
              currentArraySection = 'players';
              postProgress('Processing players...', 25, 100);
            } else if (currentArraySection === 'players') {
              currentArraySection = 'teams';
              postProgress('Processing teams...', 70, 100);
            } else if (currentArraySection === 'teams') {
              currentArraySection = 'teamSeasons';
              postProgress('Processing team seasons...', 85, 100);
            }
          }
          
          if (currentArraySection === 'players') {
            detectSportFromPlayer(value.value);
            playerQueue.push(value.value);
            playerCount++;
            
            // Progress update every 1000 players
            if (playerCount % 1000 === 0) {
              const pct = Math.min(65, 25 + (playerCount / 1000) * 2);
              postProgress(`Processed ${playerCount.toLocaleString()} players...`, pct, 100);
              self.postMessage({ type: 'meta', sport, counts: { players: playerCount, teams: teamCount, teamSeasons: teamSeasonCount } });
            }
          } else if (currentArraySection === 'teams') {
            const team = value.value as any;
            teamQueue.push(team);
            teamCount++;

            // Extract nested seasons from this team, checking for duplicates
            if (team && typeof team === 'object' && team.seasons && Array.isArray(team.seasons)) {
              for (const season of team.seasons) {
                const key = `${team.tid}-${season.season}-${season.playoffs || false}`;
                if (!teamSeasonKeys.has(key)) {
                  teamSeasonKeys.add(key);
                  teamSeasonQueue.push({
                    tid: team.tid,
                    season: season.season,
                    won: season.won,
                    lost: season.lost,
                    tied: season.tied,
                    otl: season.otl,
                    playoffs: season.playoffs || false,
                    gp: season.gp,
                    pts: season.pts,
                    oppPts: season.oppPts
                  });
                  teamSeasonCount++;
                }
              }
            }
          } else if (currentArraySection === 'teamSeasons') {
            const teamSeason = value.value as any;
            if (teamSeason && typeof teamSeason === 'object') {
              const key = `${teamSeason.tid}-${teamSeason.season}-${teamSeason.playoffs || false}`;
              if (!teamSeasonKeys.has(key)) {
                teamSeasonKeys.add(key);
                teamSeasonQueue.push(teamSeason);
                teamSeasonCount++;
              }
            }
            
            // Progress update every 100 team seasons
            if (teamSeasonCount % 100 === 0) {
              const pct = Math.min(95, 85 + (teamSeasonCount / 100) * 0.1);
              postProgress(`Processed ${teamSeasonCount} team seasons...`, pct, 100);
            }
          }
        } else {
          // Non-array values
          if (topLevelKey === 'version') version = value.value;
          else if (topLevelKey === 'startingSeason') startingSeason = value.value;
          else if (topLevelKey === 'gameAttributes') {
            gameAttributes = value.value;
            if (gameAttributes?.sport) sport = gameAttributes.sport;
          }
          else if (topLevelKey === 'meta') meta = value.value;
          else if (topLevelKey === 'playoffSeries') {
            // Capture entire playoffSeries object/array
            playoffSeries = value.value;
            const seriesCount = Array.isArray(playoffSeries) ? playoffSeries.length : Object.keys(playoffSeries || {}).length;
          }
          currentArraySection = null;
        }
        
        itemCount++;
        
        // Yield frequently for GC
        if (itemCount % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        // Periodic flush
        if (itemCount % 500 === 0) {
          await flushBuffers(false);
        }
      }
    }
    
    // Final flush - keep flushing until all queues are empty
    postProgress('Finalizing database...', 90, 100);
    while (playerQueue.length > 0 || teamQueue.length > 0 || teamSeasonQueue.length > 0) {
      await flushBuffers(true);
    }

    // Verify what was actually written to IDB
    const verifyTx = db.transaction('teamSeasons', 'readonly');
    const actualCount = await verifyTx.store.count();
    await verifyTx.done;

    // Store metadata (include playoffSeries if we found any)
    const metaData: any = { sport, playerCount, teamCount, teamSeasonCount, version, startingSeason, gameAttributes, meta };
    if (playoffSeries) {
      metaData.playoffSeries = playoffSeries;
    }
    await db.put('meta', metaData, 'importMeta');

    postProgress('Import complete', 100, 100);
    db.close();
    
    return 'idb-stored';
    
  } catch (err) {
    db.close();
    throw err;
  } finally {
    reader.releaseLock();
  }
}

self.onmessage = async (event: MessageEvent<{ file?: File; url?: string; method?: ParsingMethod; dbName?: string }>) => {
  const { file, url, method = 'streaming', dbName = 'grids-league' } = event.data; // Default to streaming if not specified

  if (!file && !url) {
    self.postMessage({ type: 'error', error: 'No file or URL provided to worker.' });
    return;
  }

  try {
    let rawData: any;
    
    if (file) {
      // File upload path - use specified method
      postProgress('Starting...', 0, 100);
      
      // Choose parsing method based on parameter
      if (method === 'traditional') {
        // Traditional: loads entire file to memory, normalizes in worker
        rawData = await parseFileTraditional(file);
        
        if (!rawData) {
          throw new Error('File content is empty after reading/decompression.');
        }

        // Normalize league data (50-95%)
        let lastProgress = 50;
        const leagueData = await normalizeLeague(rawData, (message) => {
          lastProgress = Math.min(95, lastProgress + 5);
          postProgress(message, lastProgress, 100);
        });

        postProgress('Complete!', 100, 100);
        self.postMessage({ type: 'complete', leagueData });
      } else {
        // Streaming: streams to IndexedDB, no normalization in worker
        await parseFileStreaming(file, dbName);
        // Signal main thread that data is in IDB
        self.postMessage({ type: 'complete-idb', dbName }); // Include dbName in response
      }
      
    } else if (url) {
      // URL fetch path - use specified method
      postProgress('Starting...', 0, 100);
      
      // Choose parsing method based on parameter
      if (method === 'traditional') {
        // Traditional: loads entire response to memory, normalizes in worker
        rawData = await parseUrlTraditional(url);
        
        if (!rawData) {
          throw new Error('URL content is empty after fetching.');
        }

        // Normalize league data (50-95%)
        let lastProgress = 50;
        const leagueData = await normalizeLeague(rawData, (message) => {
          lastProgress = Math.min(95, lastProgress + 5);
          postProgress(message, lastProgress, 100);
        });

        postProgress('Complete!', 100, 100);
        self.postMessage({ type: 'complete', leagueData });
      } else {
        // Streaming: streams to IndexedDB, no normalization in worker
        await parseUrlStreaming(url, dbName);
        // Signal main thread that data is in IDB
        self.postMessage({ type: 'complete-idb', dbName }); // Include dbName in response
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred in the worker.';
    console.error('[WORKER] Error processing:', error);
    self.postMessage({ type: 'error', error: errorMessage });
  }
};
