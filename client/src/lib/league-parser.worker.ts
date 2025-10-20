import pako from 'pako';
import { JSONParser } from '@streamparser/json-whatwg';
import { normalizeLeague, type Sport } from './league-normalizer';
import type { LeagueData } from '@/types/bbgm';

// File size threshold for automatic method selection (50MB compressed)
// Only used when method is 'auto'
const STREAMING_THRESHOLD = 50 * 1024 * 1024;

export type ParsingMethod = 'traditional' | 'streaming' | 'mobile-streaming' | 'mobile-idb';

// Helper to post progress messages
const postProgress = (message: string, loaded?: number, total?: number) => {
  self.postMessage({ type: 'progress', message, loaded, total });
};

// Old non-streaming method for small files
async function parseFileTraditional(file: File): Promise<any> {
  const arrayBuffer = await file.arrayBuffer();
  let content: string;

  if (file.name.endsWith('.gz')) {
    postProgress('Decompressing file...', 50, 100);
    const compressed = new Uint8Array(arrayBuffer);
    content = pako.inflate(compressed, { to: 'string' });
  } else {
    content = new TextDecoder('utf-8').decode(arrayBuffer);
  }

  postProgress('Parsing JSON data...', 75, 100);
  return JSON.parse(content);
}

// TRUE streaming method - process data incrementally like ZenGM
// Parse specific paths and build object piece-by-piece without creating full object in memory
async function parseFileStreaming(file: File): Promise<any> {
  const isCompressed = file.name.endsWith('.gz');
  
  // Get the stream (compressed or not)
  let dataStream = file.stream();
  
  if (isCompressed) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error(
        'DecompressionStream not supported. Please use Chrome 80+, Firefox 113+, or Safari 16.4+'
      );
    }
    postProgress('Starting streaming decompression...', 5, 100);
    dataStream = dataStream.pipeThrough(new DecompressionStream('gzip'));
  }
  
  postProgress('Streaming JSON parse...', 10, 100);
  
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
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        postProgress('Streaming parse complete', 95, 100);
        return result;
      }
      
      // Process each emitted value from the parser
      if (value && value.value !== undefined) {
        const keyString = typeof value.key === 'string' ? value.key : String(value.key);
        const pathArray = keyString ? keyString.split('.').filter(Boolean) : [];
        const topLevelKey = pathArray[0];
        
        if (topLevelKey) {
          // Track what section we're processing
          if (currentSection !== topLevelKey) {
            currentSection = topLevelKey;
            postProgress(`Processing ${topLevelKey}...`, 10 + (itemCount / 10000) * 85, 100);
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

// Mobile-optimized streaming: Use file.stream() directly - NO arrayBuffer() calls!
// This avoids "I/O read operation failed" errors on mobile
async function parseFileMobileStreaming(file: File): Promise<any> {
  const isCompressed = file.name.endsWith('.gz');
  
  postProgress('Starting mobile-optimized processing...', 5, 100);
  
  // Get the native file stream - works on ALL browsers including mobile
  let dataStream = file.stream();
  
  if (isCompressed) {
    postProgress('Setting up streaming decompression...', 10, 100);
    
    // Create a TransformStream that decompresses using pako
    const decompressionTransform = new TransformStream({
      start(controller) {
        // ULTRA-AGGRESSIVE MOBILE FIX: Use ULTRA-TINY chunk size (8KB) for extreme mobile memory constraints
        const inflator = new pako.Inflate({ chunkSize: 8 * 1024 });
        
        // Critical: Override onData BEFORE any push() calls
        // This ensures decompressed chunks flow immediately to the next stage
        inflator.onData = function(chunk: Uint8Array) {
          controller.enqueue(chunk);
        };
        
        // Handle errors
        inflator.onEnd = function(status: number) {
          if (status !== 0) {
            const errorMsg = inflator.msg || 'Unknown decompression error';
            controller.error(new Error(`Decompression failed: ${errorMsg}`));
          }
        };
        
        // Store for use in transform() and flush()
        (controller as any).inflator = inflator;
        (controller as any).bytesProcessed = 0;
        (controller as any).fileSize = file.size;
        (controller as any).lastProgressUpdate = 0;
        (controller as any).chunkCount = 0;
      },
      
      async transform(chunk, controller) {
        try {
          const inflator = (controller as any).inflator;
          
          // Decompress this chunk - onData will enqueue result
          inflator.push(chunk, false);
          
          // Update progress
          (controller as any).bytesProcessed += chunk.length;
          (controller as any).chunkCount++;
          const progress = 10 + (((controller as any).bytesProcessed / (controller as any).fileSize) * 35);
          const progressInt = Math.floor(progress);
          
          // Update progress MORE frequently on mobile so user knows it's working
          if (progressInt > (controller as any).lastProgressUpdate) {
            (controller as any).lastProgressUpdate = progressInt;
            postProgress(`Decompressing... ${progressInt}% (slow but safe)`, 10 + progressInt, 100);
          }
          
          // NUCLEAR MOBILE FIX: Add REAL TIME DELAYS to allow garbage collection
          // Every 3 chunks = yield immediately
          // Every 10 chunks = add 20ms delay for GC
          // Every 50 chunks = add 50ms delay for deep GC
          if ((controller as any).chunkCount % 50 === 0) {
            // Long pause for garbage collection every 50 chunks
            await new Promise(resolve => setTimeout(resolve, 50));
          } else if ((controller as any).chunkCount % 10 === 0) {
            // Medium pause every 10 chunks
            await new Promise(resolve => setTimeout(resolve, 20));
          } else if ((controller as any).chunkCount % 3 === 0) {
            // Quick yield every 3 chunks
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('[WORKER] Decompression transform error:', errorMsg);
          controller.error(new Error(`Decompression failed: ${errorMsg}`));
        }
      },
      
      flush(controller) {
        try {
          const inflator = (controller as any).inflator;
          // Finalize decompression
          inflator.push(new Uint8Array(0), true);
          postProgress('Decompression complete', 45, 100);
        } catch (err) {
          controller.error(err);
        }
      }
    });
    
    // Pipe file stream through decompression
    dataStream = dataStream.pipeThrough(decompressionTransform);
  } else {
    postProgress('Streaming file...', 20, 100);
  }
  
  postProgress('Parsing JSON stream...', 50, 100);
  
  // MOBILE OPTIMIZATION: Parse arrays element-by-element using wildcard syntax
  // Skip gameAttributes entirely - it's a large object that crashes mobile
  // The normalizer has fallbacks for any needed values
  const jsonParser = new JSONParser({ 
    paths: [
      '$.version',
      '$.startingSeason', 
      // SKIP gameAttributes - too large for mobile, not essential for grid game
      '$.players.*',    // Wildcard: emit each player individually
      '$.teams.*',      // Wildcard: emit each team individually
      '$.meta'
    ],
    keepStack: false 
  });
  
  const jsonStream = dataStream.pipeThrough(jsonParser);
  const reader = jsonStream.getReader();
  
  // Build result object incrementally - assemble arrays item-by-item
  const result: any = {};
  let itemCount = 0;
  let currentSection = '';
  let currentArraySection: 'players' | 'teams' | null = null;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        postProgress('Mobile streaming parse complete', 95, 100);
        
        // Debug: Log what we actually parsed
        console.log('[WORKER] Parse complete. Keys found:', Object.keys(result));
        console.log('[WORKER] Players array length:', result.players?.length || 0);
        console.log('[WORKER] Teams array length:', result.teams?.length || 0);
        console.log('[WORKER] First player sample:', result.players?.[0] ? 'exists' : 'missing');
        
        return result;
      }
      
      // Process each emitted value from the parser
      if (value && value.value !== undefined) {
        try {
          const keyString = typeof value.key === 'string' ? value.key : String(value.key);
          const pathArray = keyString ? keyString.split('.').filter(Boolean) : [];
          const topLevelKey = pathArray[0];
          
          // Debug: Log first few keys to understand structure
          if (itemCount < 5) {
            console.log(`[WORKER] Item ${itemCount} - Key:`, keyString, 'PathArray:', pathArray);
          }
          
          if (topLevelKey) {
            // Wildcard paths emit just numbers - determine which array based on order
            const isArrayIndex = /^\d+$/.test(topLevelKey);
            
            if (isArrayIndex) {
              // First time we see "0", determine which array section this is
              if (topLevelKey === '0') {
                if (!currentArraySection) {
                  // First array is players
                  currentArraySection = 'players';
                  currentSection = 'players';
                  postProgress('Processing players...', 55, 100);
                  console.log(`[WORKER] Started processing players at item ${itemCount}`);
                } else if (currentArraySection === 'players') {
                  // Seeing "0" again means we moved to teams
                  currentArraySection = 'teams';
                  currentSection = 'teams';
                  postProgress('Processing teams...', 75, 100);
                  console.log(`[WORKER] Started processing teams at item ${itemCount}`);
                }
              }
              
              // Add to current array section
              if (currentArraySection) {
                if (!result[currentArraySection]) {
                  result[currentArraySection] = [];
                }
                result[currentArraySection].push(value.value);
              }
            } else {
              // Non-array value (version, gameAttributes, meta, etc.)
              if (currentSection !== topLevelKey) {
                currentSection = topLevelKey;
                const progressPercent = 50 + (itemCount / 10000) * 45;
                postProgress(`Processing ${topLevelKey}...`, progressPercent, 100);
                console.log(`[WORKER] Started processing ${topLevelKey} at item ${itemCount}`);
              }
              
              result[topLevelKey] = value.value;
              currentArraySection = null; // Reset when we hit non-array data
            }
            
            itemCount++;
            
            // Yield control VERY frequently on mobile to prevent freezing
            if (itemCount % 100 === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          throw new Error(`Error processing ${currentSection || 'unknown section'}: ${errorMsg}`);
        }
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Mobile streaming parse failed: ${errorMsg}`);
  } finally {
    reader.releaseLock();
  }
}

// Use EXACT same streaming approach as files - just with response.body as source
async function parseUrlStreaming(url: string): Promise<any> {
  postProgress('Fetching URL...', 5, 100);
  
  // Try CORS fetch first
  const response = await fetch(url, { mode: 'cors' });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  if (!response.body) {
    throw new Error('Response body not available');
  }
  
  postProgress('Downloading...', 10, 100);
  
  // Get the stream from response
  let dataStream = response.body;
  
  // Check if compressed by URL
  const isCompressed = url.includes('.gz') || url.includes('.json.gz');
  
  if (isCompressed) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream not supported. Please use Chrome 80+, Firefox 113+, or Safari 16.4+');
    }
    postProgress('Decompressing...', 15, 100);
    dataStream = dataStream.pipeThrough(new DecompressionStream('gzip'));
  }
  
  postProgress('Streaming JSON parse...', 20, 100);
  
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
        postProgress('Streaming parse complete', 95, 100);
        return result;
      }
      
      // Process each emitted value from the parser
      if (value && value.value !== undefined) {
        const keyString = typeof value.key === 'string' ? value.key : String(value.key);
        const pathArray = keyString ? keyString.split('.').filter(Boolean) : [];
        const topLevelKey = pathArray[0];
        
        if (topLevelKey) {
          // Track what section we're processing
          if (currentSection !== topLevelKey) {
            currentSection = topLevelKey;
            postProgress(`Processing ${topLevelKey}...`, 20 + (itemCount / 10000) * 75, 100);
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
  postProgress('Fetching URL...', 10, 100);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  
  if (arrayBuffer.byteLength === 0) {
    throw new Error('Empty response from server');
  }
  
  let content: string;
  const isCompressed = url.includes('.gz') || url.includes('.json.gz');
  
  if (isCompressed) {
    postProgress('Decompressing...', 50, 100);
    const compressed = new Uint8Array(arrayBuffer);
    content = pako.inflate(compressed, { to: 'string' });
  } else {
    content = new TextDecoder('utf-8').decode(arrayBuffer);
  }
  
  postProgress('Parsing JSON...', 75, 100);
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
      postProgress('Starting file processing...', 0, file.size);
      
      // Choose parsing method based on parameter
      if (method === 'traditional') {
        postProgress('Reading file (traditional method)...', 0, file.size);
        rawData = await parseFileTraditional(file);
      } else if (method === 'mobile-streaming') {
        postProgress('Mobile streaming file...', 0, file.size);
        rawData = await parseFileMobileStreaming(file);
      } else if (method === 'mobile-idb') {
        // NEW: IndexedDB streaming method - no normalization here!
        postProgress('Starting IndexedDB streaming...', 0, file.size);
        await parseFileMobileIDB(file);
        // Signal main thread that data is in IDB
        self.postMessage({ type: 'complete-idb' });
        return; // Exit early - no leagueData to send
      } else {
        // streaming method
        postProgress('Streaming file...', 0, file.size);
        rawData = await parseFileStreaming(file);
      }
      
      if (!rawData) {
        throw new Error('File content is empty after reading/decompression.');
      }

      const leagueData = await normalizeLeague(rawData, (message) => {
        postProgress(message, file.size * 0.95, file.size);
      });

      postProgress('Processing complete.', file.size, file.size);
      self.postMessage({ type: 'complete', leagueData });
      
    } else if (url) {
      // URL fetch path - use specified method
      postProgress('Starting URL processing...', 0, 100);
      
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

      const leagueData = await normalizeLeague(rawData, (message) => {
        postProgress(message, 95, 100);
      });

      postProgress('Processing complete.', 100, 100);
      self.postMessage({ type: 'complete', leagueData });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred in the worker.';
    console.error('[WORKER] Error processing:', error);
    self.postMessage({ type: 'error', error: errorMessage });
  }
};
