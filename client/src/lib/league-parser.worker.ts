import pako from 'pako';
import { JSONParser } from '@streamparser/json-whatwg';
import { normalizeLeague, type Sport } from './league-normalizer';
import type { LeagueData } from '@/types/bbgm';

// File size threshold for automatic method selection (50MB compressed)
// Only used when method is 'auto'
const STREAMING_THRESHOLD = 50 * 1024 * 1024;

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

// TRUE streaming method - process data incrementally like ZenGM
// Parse specific paths and build object piece-by-piece without creating full object in memory
async function parseFileStreaming(file: File): Promise<any> {
  const isCompressed = file.name.endsWith('.gz');
  
  postProgress('Starting stream...', 5, 100);
  
  // Get the stream (compressed or not)
  let dataStream = file.stream();
  
  if (isCompressed) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error(
        'DecompressionStream not supported. Please use Chrome 80+, Firefox 113+, or Safari 16.4+'
      );
    }
    postProgress('Decompressing file...', 10, 100);
    dataStream = dataStream.pipeThrough(new DecompressionStream('gzip'));
  }
  
  postProgress('Parsing league data...', 20, 100);
  
  // Parse all major sections incrementally using streaming JSON parser
  // This captures metadata and large arrays at specific paths
  const jsonParser = new JSONParser({ 
    paths: [
      '$.version',
      '$.startingSeason', 
      '$.gameAttributes',
      '$.players',
      '$.teams',
      '$.teamSeasons',
      '$.teamStats',
      '$.games',
      '$.schedule',
      '$.playoffSeries',
      '$.draftPicks',
      '$.draftOrder',
      '$.negotiations',
      '$.messages',
      '$.events',
      '$.playerFeats',
      '$.allStars',
      '$.awards',
      '$.releasedPlayers',
      '$.scheduledEvents',
      '$.trade',
      '$.meta'
    ],
    keepStack: false 
  });
  
  const jsonStream = dataStream.pipeThrough(jsonParser);
  const reader = jsonStream.getReader();
  
  // Build result object incrementally
  const result: any = {};
  let itemCount = 0;
  let currentSection = '';
  let playersProcessed = false;
  let teamsProcessed = false;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        postProgress('File parsing complete', 50, 100);
        return result;
      }
      
      // Process each emitted value from the parser
      if (value && value.value !== undefined) {
        const keyString = typeof value.key === 'string' ? value.key : String(value.key);
        const pathArray = keyString ? keyString.split('.').filter(Boolean) : [];
        const topLevelKey = pathArray[0];
        
        if (topLevelKey) {
          // Track what section we're processing and show user-friendly messages
          if (currentSection !== topLevelKey) {
            currentSection = topLevelKey;
            
            // User-friendly progress messages
            if (topLevelKey === 'players' && !playersProcessed) {
              postProgress('Processing players...', 25, 100);
              playersProcessed = true;
            } else if (topLevelKey === 'teams' && !teamsProcessed) {
              postProgress('Processing teams...', 40, 100);
              teamsProcessed = true;
            } else if (topLevelKey === 'gameAttributes') {
              postProgress('Loading league settings...', 30, 100);
            }
          }
          
          // Store the value at the appropriate key
          result[topLevelKey] = value.value;
          itemCount++;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Use EXACT same streaming approach as files - just with response.body as source
async function parseUrlStreaming(url: string): Promise<any> {
  postProgress('Connecting to URL...', 5, 100);
  
  // Try CORS fetch first
  const response = await fetch(url, { mode: 'cors' });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  if (!response.body) {
    throw new Error('Response body not available');
  }
  
  postProgress('Downloading file...', 10, 100);
  
  // Get the stream from response
  let dataStream = response.body;
  
  // Check if compressed by URL
  const isCompressed = url.includes('.gz') || url.includes('.json.gz');
  
  if (isCompressed) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream not supported. Please use Chrome 80+, Firefox 113+, or Safari 16.4+');
    }
    postProgress('Decompressing file...', 15, 100);
    dataStream = dataStream.pipeThrough(new DecompressionStream('gzip'));
  }
  
  postProgress('Parsing league data...', 20, 100);
  
  // Use EXACT same streaming JSON parser as files
  const jsonParser = new JSONParser({ 
    paths: [
      '$.version',
      '$.startingSeason', 
      '$.gameAttributes',
      '$.players',
      '$.teams',
      '$.teamSeasons',
      '$.teamStats',
      '$.games',
      '$.schedule',
      '$.playoffSeries',
      '$.draftPicks',
      '$.draftOrder',
      '$.negotiations',
      '$.messages',
      '$.events',
      '$.playerFeats',
      '$.allStars',
      '$.awards',
      '$.releasedPlayers',
      '$.scheduledEvents',
      '$.trade',
      '$.meta'
    ],
    keepStack: false 
  });
  
  const jsonStream = dataStream.pipeThrough(jsonParser);
  const reader = jsonStream.getReader();
  
  // Build result object incrementally (same as files)
  const result: any = {};
  let itemCount = 0;
  let currentSection = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        postProgress('File parsing complete', 50, 100);
        return result;
      }
      
      // Process each emitted value from the parser
      if (value && value.value !== undefined) {
        const keyString = typeof value.key === 'string' ? value.key : String(value.key);
        const pathArray = keyString ? keyString.split('.').filter(Boolean) : [];
        const topLevelKey = pathArray[0];
        
        if (topLevelKey) {
          // Track what section we're processing with user-friendly messages
          if (currentSection !== topLevelKey) {
            currentSection = topLevelKey;
            
            // User-friendly progress messages
            if (topLevelKey === 'players') {
              postProgress('Processing players...', 25, 100);
            } else if (topLevelKey === 'teams') {
              postProgress('Processing teams...', 40, 100);
            } else if (topLevelKey === 'gameAttributes') {
              postProgress('Loading league settings...', 30, 100);
            }
          }
          
          // Store the value at the appropriate key
          result[topLevelKey] = value.value;
          itemCount++;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
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

// Mobile-IDB: Stream directly to IndexedDB, never materialize giant arrays
async function parseFileMobileIDB(file: File): Promise<'idb-stored'> {
  const { openDB } = await import('idb');
  
  postProgress('Setting up database...', 5, 100);
  
  // Open/create IndexedDB
  const db = await openDB('grids-league', 3, {
    upgrade(db, oldVersion) {
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains('players')) {
        const playerStore = db.createObjectStore('players', { keyPath: 'pid' });
        playerStore.createIndex('tid', 'tid', { multiEntry: true });
      }
      if (!db.objectStoreNames.contains('teams')) {
        db.createObjectStore('teams', { keyPath: 'tid' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
    }
  });
  
  // Clear old data
  postProgress('Clearing previous data...', 10, 100);
  await db.clear('players');
  await db.clear('teams');
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
      '$.meta'
    ],
    keepStack: false 
  });
  
  const jsonStream = dataStream.pipeThrough(jsonParser);
  const reader = jsonStream.getReader();
  
  // Buffers for batching
  const playerQueue: any[] = [];
  const teamQueue: any[] = [];
  const BATCH_SIZE = 200;
  const MAX_QUEUE = 400;
  
  let itemCount = 0;
  let playerCount = 0;
  let teamCount = 0;
  let sport: string | null = null;
  let meta: any = null;
  let version: any = null;
  let startingSeason: any = null;
  let gameAttributes: any = null;
  let currentArraySection: 'players' | 'teams' | null = null;
  
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
    const shouldFlush = force || playerQueue.length >= BATCH_SIZE || teamQueue.length >= BATCH_SIZE;
    if (!shouldFlush) return;
    
    if (playerQueue.length > 0) {
      const tx = db.transaction('players', 'readwrite');
      const store = tx.objectStore('players');
      const batch = playerQueue.splice(0, Math.min(BATCH_SIZE, playerQueue.length));
      for (const player of batch) {
        await store.put(player);
      }
      await tx.done;
    }
    
    if (teamQueue.length > 0) {
      const tx = db.transaction('teams', 'readwrite');
      const store = tx.objectStore('teams');
      const batch = teamQueue.splice(0, Math.min(BATCH_SIZE, teamQueue.length));
      for (const team of batch) {
        await store.put(team);
      }
      await tx.done;
    }
  };
  
  try {
    while (true) {
      // Backpressure: pause if queue too large
      while (playerQueue.length + teamQueue.length > MAX_QUEUE) {
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
        
        if (isArrayIndex) {
          // Determine which array based on order
          if (topLevelKey === '0') {
            if (!currentArraySection) {
              currentArraySection = 'players';
              postProgress('Processing players...', 25, 100);
            } else if (currentArraySection === 'players') {
              currentArraySection = 'teams';
              postProgress('Processing teams...', 70, 100);
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
              self.postMessage({ type: 'meta', sport, counts: { players: playerCount, teams: teamCount } });
            }
          } else if (currentArraySection === 'teams') {
            teamQueue.push(value.value);
            teamCount++;
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
    
    // Final flush
    postProgress('Finalizing database...', 90, 100);
    await flushBuffers(true);
    
    // Store metadata
    await db.put('meta', { sport, playerCount, teamCount, version, startingSeason, gameAttributes, meta }, 'importMeta');
    
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

self.onmessage = async (event: MessageEvent<{ file?: File; url?: string; method?: ParsingMethod }>) => {
  const { file, url, method = 'streaming' } = event.data; // Default to streaming if not specified

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
        rawData = await parseFileTraditional(file);
      } else if (method === 'mobile-idb') {
        // NEW: IndexedDB streaming method - no normalization here!
        await parseFileMobileIDB(file);
        // Signal main thread that data is in IDB
        self.postMessage({ type: 'complete-idb' });
        return; // Exit early - no leagueData to send
      } else {
        // streaming method
        rawData = await parseFileStreaming(file);
      }
      
      if (!rawData) {
        throw new Error('File content is empty after reading/decompression.');
      }

      // Normalize league data (50-95%)
      let lastProgress = 50;
      const leagueData = await normalizeLeague(rawData, (message) => {
        // Map normalizeLeague messages to 50-95% range
        lastProgress = Math.min(95, lastProgress + 5);
        postProgress(message, lastProgress, 100);
      });

      postProgress('Complete!', 100, 100);
      self.postMessage({ type: 'complete', leagueData });
      
    } else if (url) {
      // URL fetch path - use specified method
      postProgress('Starting...', 0, 100);
      
      // Choose parsing method based on parameter
      if (method === 'traditional') {
        rawData = await parseUrlTraditional(url);
      } else {
        // streaming method
        rawData = await parseUrlStreaming(url);
      }
      
      if (!rawData) {
        throw new Error('URL content is empty after fetching.');
      }

      // Normalize league data (50-95%)
      let lastProgress = 50;
      const leagueData = await normalizeLeague(rawData, (message) => {
        // Map normalizeLeague messages to 50-95% range
        lastProgress = Math.min(95, lastProgress + 5);
        postProgress(message, lastProgress, 100);
      });

      postProgress('Complete!', 100, 100);
      self.postMessage({ type: 'complete', leagueData });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred in the worker.';
    console.error('[WORKER] Error processing:', error);
    self.postMessage({ type: 'error', error: errorMessage });
  }
};
