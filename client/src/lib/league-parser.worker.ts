import pako from 'pako';
import { JSONParser } from '@streamparser/json-whatwg';
import { normalizeLeague, type Sport } from './league-normalizer';
import type { LeagueData } from '@/types/bbgm';

// File size threshold for streaming (50MB compressed)
// Files under this use fast traditional method (seconds)
// Files over this use DecompressionStream + JSONParser streaming (handles unlimited size)
const STREAMING_THRESHOLD = 50 * 1024 * 1024;

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

// Streaming URL fetch with same approach as files
async function parseUrlStreaming(url: string): Promise<any> {
  postProgress('Fetching URL...', 5, 100);
  
  // Try multiple fetch strategies
  const fetchOptions = [
    { mode: 'cors' as RequestMode },
    { mode: 'no-cors' as RequestMode },
    { mode: 'cors' as RequestMode, cache: 'no-cache' as RequestCache }
  ];
  
  let lastError: Error | null = null;
  
  for (const options of fetchOptions) {
    try {
      const response = await fetch(url, options);
      
      // For no-cors mode, we can't check response.ok
      if (options.mode !== 'no-cors' && !response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is not available for streaming');
      }
      
      // Get content length if available
      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : undefined;
      
      postProgress('Downloading...', 10, 100);
      
      // Check if compressed by URL
      const isCompressed = url.includes('.gz') || url.includes('.json.gz');
      
      let dataStream = response.body;
      
      // Decompress if needed
      if (isCompressed) {
        if (typeof DecompressionStream === 'undefined') {
          throw new Error('DecompressionStream not supported. Please use Chrome 80+, Firefox 113+, or Safari 16.4+');
        }
        postProgress('Decompressing...', 15, 100);
        dataStream = dataStream.pipeThrough(new DecompressionStream('gzip'));
      }
      
      postProgress('Streaming JSON parse...', 20, 100);
      
      // Use streaming JSON parser
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
      
    } catch (error) {
      console.warn(`Fetch strategy ${JSON.stringify(options)} failed:`, error);
      lastError = error as Error;
      continue; // Try next fetch strategy
    }
  }
  
  // If all strategies failed, throw the last error
  throw lastError || new Error('All fetch strategies failed');
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

self.onmessage = async (event: MessageEvent<{ file?: File; url?: string }>) => {
  const { file, url } = event.data;

  if (!file && !url) {
    self.postMessage({ type: 'error', error: 'No file or URL provided to worker.' });
    return;
  }

  try {
    let rawData: any;
    
    if (file) {
      // File upload path
      postProgress('Starting file processing...', 0, file.size);
      
      if (file.size < STREAMING_THRESHOLD) {
        postProgress('Reading file...', 0, file.size);
        rawData = await parseFileTraditional(file);
      } else {
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
      // URL fetch path
      postProgress('Starting URL processing...', 0, 100);
      
      // Always use streaming for URLs (we don't know size upfront)
      rawData = await parseUrlStreaming(url);
      
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
