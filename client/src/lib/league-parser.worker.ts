import pako from 'pako';
import { JSONParser } from '@streamparser/json-whatwg';
import { normalizeLeague, type Sport } from './league-normalizer';
import type { LeagueData } from '@/types/bbgm';

// File size threshold for streaming (50MB compressed)
// Files under this use fast traditional method
// Files over this use streaming (slower but handles larger files)
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

// New streaming method for large files
async function parseFileStreaming(file: File): Promise<any> {
  const stream = file.stream();
  let bytesRead = 0;
  const totalBytes = file.size;
  
  // Check if file is compressed
  const isCompressed = file.name.endsWith('.gz');
  
  if (isCompressed) {
    // For large compressed files: stream decompress, accumulate text, parse once
    // This avoids the slow streaming JSON parser while handling memory efficiently
    const reader = stream.getReader();
    const decompressedChunks: string[] = [];
    const inflator = new pako.Inflate();
    
    // Override onData to collect decompressed chunks
    inflator.onData = (chunk: Uint8Array) => {
      const text = new TextDecoder('utf-8').decode(chunk);
      decompressedChunks.push(text);
    };
    
    // Disable automatic result accumulation
    inflator.onEnd = () => {};
    
    try {
      // Read and decompress file in chunks
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        bytesRead += value.byteLength;
        postProgress('Decompressing...', bytesRead, totalBytes);
        
        // Decompress chunk
        inflator.push(value, false);
        
        if (inflator.err) {
          throw new Error(`Decompression error: ${inflator.msg || 'Unknown error'}`);
        }
      }
      
      // Finalize decompression
      inflator.push(new Uint8Array(0), true);
      
      if (inflator.err) {
        throw new Error(`Decompression error: ${inflator.msg || 'Unknown error'}`);
      }
      
      // Join all decompressed chunks and parse JSON once
      postProgress('Parsing JSON...', totalBytes, totalBytes);
      const decompressedText = decompressedChunks.join('');
      return JSON.parse(decompressedText);
      
    } finally {
      reader.releaseLock();
    }
  } else {
    // For large uncompressed files, stream read and accumulate
    const reader = stream.getReader();
    const textChunks: string[] = [];
    const decoder = new TextDecoder('utf-8');
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        bytesRead += value.byteLength;
        postProgress('Reading file...', bytesRead, totalBytes);
        
        const text = decoder.decode(value, { stream: true });
        textChunks.push(text);
      }
      
      // Final decode
      textChunks.push(decoder.decode());
      
      // Parse JSON
      postProgress('Parsing JSON...', totalBytes, totalBytes);
      const fullText = textChunks.join('');
      return JSON.parse(fullText);
      
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
