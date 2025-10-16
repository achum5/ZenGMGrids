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
    // For large compressed files: use streaming to avoid memory limits
    // Create decompression transform stream
    let inflator: any;
    
    const decompressStream = new TransformStream({
      start(controller) {
        inflator = new pako.Inflate();
        
        inflator.onData = (chunk: Uint8Array) => {
          const text = new TextDecoder('utf-8').decode(chunk);
          controller.enqueue(text);
        };
        
        inflator.onEnd = () => {};
      },
      
      transform(chunk) {
        inflator.push(chunk, false);
        
        if (inflator.err) {
          throw new Error(`Decompression error: ${inflator.msg || 'Unknown error'}`);
        }
      },
      
      flush(controller) {
        inflator.push(new Uint8Array(0), true);
        
        if (inflator.err) {
          throw new Error(`Decompression error: ${inflator.msg || 'Unknown error'}`);
        }
        
        controller.close();
      }
    });
    
    // Pipe: File stream -> Decompress -> JSON Parser
    const decompressedStream = stream.pipeThrough(decompressStream);
    const jsonStream = decompressedStream.pipeThrough(new JSONParser());
    
    const reader = jsonStream.getReader();
    let parsedData: any = null;
    let lastProgress = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (parsedData === null) {
            throw new Error('No JSON data found in decompressed file');
          }
          postProgress('Complete', 100, 100);
          return parsedData;
        }
        
        // The parser emits parsed JSON chunks
        parsedData = value.value;
        
        // Update progress less frequently to avoid slowdown
        const newProgress = Math.min(lastProgress + 0.1, 99);
        if (newProgress >= lastProgress + 1) {
          postProgress('Processing large file...', newProgress, 100);
          lastProgress = newProgress;
        }
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    // For large uncompressed files, use streaming JSON parser
    const jsonStream = stream.pipeThrough(new JSONParser());
    const reader = jsonStream.getReader();
    let parsedData: any = null;
    let lastProgress = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (parsedData === null) {
            throw new Error('No JSON data found in file');
          }
          postProgress('Complete', 100, 100);
          return parsedData;
        }
        
        // The parser emits parsed JSON chunks
        parsedData = value.value;
        
        // Update progress less frequently to avoid slowdown
        const newProgress = Math.min(lastProgress + 0.1, 99);
        if (newProgress >= lastProgress + 1) {
          postProgress('Processing large file...', newProgress, 100);
          lastProgress = newProgress;
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
