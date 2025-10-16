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
async function parseFileStreaming(file: File): Promise<any> {
  const isCompressed = file.name.endsWith('.gz');
  
  if (isCompressed) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error(
        'DecompressionStream not supported. Please use Chrome 80+, Firefox 113+, or Safari 16.4+'
      );
    }

    postProgress('Starting streaming decompression...', 5, 100);
    
    // Stream: File -> Decompress -> JSON Parser
    const stream = file.stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    
    // Use streaming JSON parser to parse incrementally
    const jsonParser = new JSONParser({ paths: ['$'], keepStack: false });
    const jsonStream = decompressedStream.pipeThrough(jsonParser);
    
    const reader = jsonStream.getReader();
    let result: any = null;
    let chunkCount = 0;
    
    postProgress('Streaming and parsing large file...', 10, 100);
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (!result) {
            throw new Error('No data found in file');
          }
          postProgress('Processing complete', 100, 100);
          return result;
        }
        
        // Store the parsed result (JSONParser emits the complete object when done)
        if (value?.value) {
          result = value.value;
        }
        
        chunkCount++;
        
        // Update progress every 2000 chunks
        if (chunkCount % 2000 === 0) {
          const progress = Math.min(10 + (chunkCount / 1000), 95);
          postProgress('Processing large file...', progress, 100);
        }
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    // For uncompressed large files, use streaming parser
    postProgress('Streaming file...', 10, 100);
    
    const jsonParser = new JSONParser({ paths: ['$'], keepStack: false });
    const jsonStream = file.stream().pipeThrough(jsonParser);
    
    const reader = jsonStream.getReader();
    let result: any = null;
    let chunkCount = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (!result) {
            throw new Error('No data found in file');
          }
          return result;
        }
        
        if (value?.value) {
          result = value.value;
        }
        
        chunkCount++;
        
        if (chunkCount % 2000 === 0) {
          const progress = Math.min(10 + (chunkCount / 1000), 95);
          postProgress('Processing file...', progress, 100);
        }
      }
    } finally {
      reader.releaseLock();
    }
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
