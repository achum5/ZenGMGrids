import pako from 'pako';
import { JSONParser } from '@streamparser/json-whatwg';
import { normalizeLeague, type Sport } from './league-normalizer';
import type { LeagueData } from '@/types/bbgm';

// File size threshold for automatic method selection (50MB compressed)
// Only used when method is 'auto'
const STREAMING_THRESHOLD = 50 * 1024 * 1024;

export type ParsingMethod = 'traditional' | 'streaming' | 'mobile-streaming';

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
        const inflator = new pako.Inflate({ chunkSize: 128 * 1024 });
        
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
      },
      
      transform(chunk, controller) {
        try {
          const inflator = (controller as any).inflator;
          
          // Decompress this chunk - onData will enqueue result
          inflator.push(chunk, false);
          
          // Update progress (throttle updates)
          (controller as any).bytesProcessed += chunk.length;
          const progress = 10 + (((controller as any).bytesProcessed / (controller as any).fileSize) * 35);
          const progressInt = Math.floor(progress);
          
          if (progressInt > (controller as any).lastProgressUpdate && progressInt % 5 === 0) {
            (controller as any).lastProgressUpdate = progressInt;
            postProgress(`Decompressing... ${Math.round(progress - 10)}%`, progress, 100);
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
  
  // Use SAME paths as desktop streaming - file.stream() already prevents memory crashes
  // The [*] syntax doesn't work with this JSON parser library
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
  
  // Build result object incrementally - assemble arrays item-by-item
  const result: any = {};
  let itemCount = 0;
  let currentSection = '';
  
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
            // Track what section we're processing
            if (currentSection !== topLevelKey) {
              currentSection = topLevelKey;
              const progressPercent = 50 + (itemCount / 10000) * 45;
              postProgress(`Processing ${topLevelKey}...`, progressPercent, 100);
              console.log(`[WORKER] Started processing ${topLevelKey} at item ${itemCount}`);
            }
            
            // Store the value at the appropriate key (same as desktop streaming)
            result[topLevelKey] = value.value;
            itemCount++;
            
            // Yield control periodically on mobile to prevent UI freezing
            if (itemCount % 500 === 0) {
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
      } else {
        // streaming method
        postProgress('Streaming file...', 0, file.size);
        rawData = await parseFileStreaming(file);
      }
      
      if (!rawData) {
        throw new Error('File content is empty after reading/decompression.');
      }

      const leagueData = normalizeLeague(rawData, (message) => {
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

      const leagueData = normalizeLeague(rawData, (message) => {
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
