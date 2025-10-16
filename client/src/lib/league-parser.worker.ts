import pako from 'pako';
import { JSONParser } from '@streamparser/json-whatwg';
import { normalizeLeague, type Sport } from './league-normalizer';
import type { LeagueData } from '@/types/bbgm';

// File size threshold for streaming (10MB)
const STREAMING_THRESHOLD = 10 * 1024 * 1024;

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

// New streaming method for large files
async function parseFileStreaming(file: File): Promise<any> {
  const stream = file.stream();
  let bytesRead = 0;
  const totalBytes = file.size;
  
  // Check if file is compressed
  const isCompressed = file.name.endsWith('.gz');
  
  if (isCompressed) {
    // For compressed files, we need to decompress first, then parse
    // Stream decompression with pako
    const inflator = new pako.Inflate({ to: 'string' });
    const reader = stream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        bytesRead += value.byteLength;
        postProgress('Decompressing...', bytesRead, totalBytes);
        
        // Push chunk to inflator
        inflator.push(value, false);
      }
      
      // Finalize decompression
      inflator.push(new Uint8Array(0), true);
      
      if (inflator.err) {
        throw new Error(`Decompression error: ${inflator.msg || 'Unknown error'}`);
      }
      
      const decompressedText = inflator.result as string;
      
      // Parse the decompressed JSON
      postProgress('Parsing JSON...', 90, 100);
      return JSON.parse(decompressedText);
      
    } finally {
      reader.releaseLock();
    }
  } else {
    // For uncompressed files, use streaming JSON parser
    const jsonStream = stream.pipeThrough(new JSONParser());
    const reader = jsonStream.getReader();
    
    try {
      let parsedData: any = null;
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (parsedData === null) {
            throw new Error('No JSON data found in file');
          }
          return parsedData;
        }
        
        // The parser emits parsed JSON chunks
        parsedData = value.value;
        bytesRead += JSON.stringify(value).length; // Approximate
        postProgress('Parsing JSON...', bytesRead, totalBytes);
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
