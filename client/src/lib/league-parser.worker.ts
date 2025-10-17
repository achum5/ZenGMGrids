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

self.onmessage = async (event: MessageEvent<{ file: File }>) => {
  const { file } = event.data;

  if (!file) {
    self.postMessage({ type: 'error', error: 'No file provided to worker.' });
    return;
  }

  try {
    postProgress('Starting file processing...', 0, file.size);
    
    // Choose parsing strategy based on file size
    let rawData: any;
    
    if (file.size < STREAMING_THRESHOLD) {
      // Use traditional method for small files (faster, simpler)
      postProgress('Reading file...', 0, file.size);
      rawData = await parseFileTraditional(file);
    } else {
      // Use streaming method for large files (memory efficient)
      postProgress('Streaming file...', 0, file.size);
      rawData = await parseFileStreaming(file);
    }

    if (!rawData) {
      throw new Error('File content is empty after reading/decompression.');
    }

    // Pass the progress callback to the normalizer
    const leagueData = normalizeLeague(rawData, (message) => {
      postProgress(message, file.size * 0.95, file.size);
    });

    postProgress('Processing complete.', file.size, file.size);
    self.postMessage({ type: 'complete', leagueData });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred in the worker.';
    console.error('[WORKER] Error processing file:', error);
    self.postMessage({ type: 'error', error: errorMessage });
  }
};
