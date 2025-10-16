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

// Streaming method using DecompressionStream + JSONParser (like ZenGM)
// This avoids creating giant strings by streaming decompression -> JSON parsing
async function parseFileStreaming(file: File): Promise<any> {
  postProgress('Processing large file...', 10, 100);
  
  const isCompressed = file.name.endsWith('.gz');
  
  if (isCompressed) {
    // Use native DecompressionStream + streaming JSON parser
    // This is the key: we NEVER create the full decompressed string
    if (typeof DecompressionStream !== 'undefined') {
      try {
        postProgress('Streaming decompression and parsing...', 20, 100);
        
        const stream = file.stream();
        // Decompress in chunks
        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
        // Parse JSON incrementally from decompressed chunks (no string created!)
        const jsonStream = decompressedStream.pipeThrough(new JSONParser());
        
        const reader = jsonStream.getReader();
        let parsedData: any = null;
        let chunkCount = 0;
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            if (parsedData === null) {
              throw new Error('No JSON data found in file');
            }
            postProgress('Complete', 100, 100);
            return parsedData;
          }
          
          // The parser emits the complete parsed object when done
          parsedData = value.value;
          chunkCount++;
          
          // Update progress periodically
          if (chunkCount % 1000 === 0) {
            const progress = Math.min(20 + (chunkCount / 500), 95);
            postProgress('Processing large file...', progress, 100);
          }
        }
      } catch (error) {
        console.warn('Streaming approach failed:', error);
        throw new Error(
          `Failed to process large file: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          `Your browser may not support DecompressionStream, or the file may be corrupted.`
        );
      }
    } else {
      throw new Error(
        'Your browser does not support DecompressionStream, which is required for large gzipped files. ' +
        'Please use Chrome/Edge 80+, Firefox 113+, or Safari 16.4+'
      );
    }
  } else {
    // For large uncompressed files, use streaming JSON parser
    postProgress('Streaming JSON parsing...', 20, 100);
    const jsonStream = file.stream().pipeThrough(new JSONParser());
    const reader = jsonStream.getReader();
    let parsedData: any = null;
    let chunkCount = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (parsedData === null) {
          throw new Error('No JSON data found in file');
        }
        postProgress('Complete', 100, 100);
        return parsedData;
      }
      
      parsedData = value.value;
      chunkCount++;
      
      if (chunkCount % 1000 === 0) {
        const progress = Math.min(20 + (chunkCount / 500), 95);
        postProgress('Processing large file...', progress, 100);
      }
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
