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

// Mobile-optimized streaming: TRUE chunked decompression with pako.Inflate
// Processes compressed data incrementally without holding full decompressed data in memory
async function parseFileMobileStreaming(file: File): Promise<any> {
  const isCompressed = file.name.endsWith('.gz');
  const READ_CHUNK_SIZE = 1 * 1024 * 1024; // Read 1MB at a time (smaller = less memory)
  const STREAM_CHUNK_SIZE = 256 * 1024; // Stream 256KB chunks (smaller = more frequent cleanup)
  
  postProgress('Starting mobile-optimized processing...', 5, 100);
  
  // Step 1: Create a stream that decompresses data incrementally
  let dataStream: ReadableStream<Uint8Array>;
  
  if (isCompressed) {
    // ULTRA-AGGRESSIVE STREAMING DECOMPRESSION for mobile
    // Key: minimize memory footprint at every step
    postProgress('Setting up streaming decompression...', 10, 100);
    
    dataStream = new ReadableStream({
      async start(controller) {
        // Create pako inflator for streaming decompression
        const inflator = new pako.Inflate({ chunkSize: 256 * 1024 }); // Small internal chunks
        
        try {
          // Read file in very small chunks
          const fileSize = file.size;
          let offset = 0;
          let chunkCount = 0;
          
          while (offset < fileSize) {
            // Read a small chunk from the compressed file
            const chunkSize = Math.min(READ_CHUNK_SIZE, fileSize - offset);
            const blob = file.slice(offset, offset + chunkSize);
            const arrayBuffer = await blob.arrayBuffer();
            const chunk = new Uint8Array(arrayBuffer);
            
            // Push chunk to inflator - false means "not final chunk"
            const isFinal = offset + chunkSize >= fileSize;
            inflator.push(chunk, isFinal);
            
            // IMMEDIATELY extract and stream decompressed data
            if (inflator.result && inflator.result.length > 0) {
              // Get the decompressed data
              let decompressed: Uint8Array;
              if (inflator.result instanceof Uint8Array) {
                decompressed = inflator.result;
              } else if (typeof inflator.result === 'string') {
                decompressed = new TextEncoder().encode(inflator.result);
              } else {
                throw new Error('Unexpected inflator result type');
              }
              
              // Stream it in tiny chunks and clear ASAP
              for (let i = 0; i < decompressed.length; i += STREAM_CHUNK_SIZE) {
                const streamChunk = decompressed.slice(i, Math.min(i + STREAM_CHUNK_SIZE, decompressed.length));
                controller.enqueue(streamChunk);
                
                // Yield control VERY frequently on mobile (every chunk)
                await new Promise(resolve => setTimeout(resolve, 0));
              }
              
              // CRITICAL: Clear the inflator's result buffer immediately
              inflator.result = new Uint8Array(0);
              
              // Null out local reference to help GC
              decompressed = null as any;
            }
            
            offset += chunkSize;
            chunkCount++;
            
            // Update progress
            const progress = 10 + ((offset / fileSize) * 35);
            if (chunkCount % 5 === 0) { // Update every 5 chunks to avoid UI spam
              postProgress(`Decompressing... ${Math.round(progress - 10)}%`, progress, 100);
            }
            
            // Extra yield every few chunks to let browser breathe
            if (chunkCount % 3 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1));
            }
          }
          
          // Check for errors
          if (inflator.err) {
            throw new Error(`Decompression failed: ${inflator.msg || 'Unknown error'}`);
          }
          
          postProgress('Decompression complete', 45, 100);
          controller.close();
          
        } catch (err) {
          controller.error(err);
          throw new Error(`Decompression failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    });
    
  } else {
    // For uncompressed JSON files, stream directly from file
    postProgress('Streaming file...', 20, 100);
    
    dataStream = new ReadableStream({
      async start(controller) {
        const fileSize = file.size;
        let offset = 0;
        
        while (offset < fileSize) {
          const chunkSize = Math.min(STREAM_CHUNK_SIZE, fileSize - offset);
          const blob = file.slice(offset, offset + chunkSize);
          const arrayBuffer = await blob.arrayBuffer();
          const chunk = new Uint8Array(arrayBuffer);
          
          controller.enqueue(chunk);
          offset += chunkSize;
          
          // Yield control periodically
          if (offset % (STREAM_CHUNK_SIZE * 10) === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        controller.close();
      }
    });
  }
  
  postProgress('Parsing JSON stream...', 50, 100);
  
  // Use streaming JSON parser to avoid loading entire object at once
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
        postProgress('Mobile streaming parse complete', 95, 100);
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
            postProgress(`Processing ${topLevelKey}...`, 50 + (itemCount / 10000) * 45, 100);
          }
          
          // Store the value at the appropriate key
          result[topLevelKey] = value.value;
          itemCount++;
          
          // Yield control periodically to prevent UI freeze on mobile
          if (itemCount % 1000 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }
    }
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
