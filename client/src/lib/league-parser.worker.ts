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

// ZenGM's approach: stream decompress → arrayBuffer → native JSON.parse
// This is MORE memory-efficient than streaming JSON parser (especially on mobile!)
// because browser's native JSON.parse is highly optimized C++ code
async function parseFileStreaming(file: File): Promise<any> {
  console.log(`[WORKER] Parsing file (ZenGM method):`, file.name);
  
  const isCompressed = file.name.endsWith('.gz') || file.name.endsWith('.json.gz');
  
  let textContent: string;
  
  if (isCompressed) {
    postProgress('Decompressing...', 20, 100);
    
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream not supported. Please use Chrome 80+, Firefox 113+, or Safari 16.4+');
    }
    
    // Use file.stream() for compressed files, then decompress
    const decompressedStream = file.stream().pipeThrough(new DecompressionStream('gzip'));
    const decompressedBuffer = await new Response(decompressedStream).arrayBuffer();
    
    postProgress('Decoding...', 50, 100);
    textContent = new TextDecoder().decode(decompressedBuffer);
    
  } else {
    postProgress('Decoding...', 30, 100);
    const arrayBuffer = await file.arrayBuffer();
    textContent = new TextDecoder().decode(arrayBuffer);
  }
  
  postProgress('Parsing JSON...', 70, 100);
  
  // Use browser's native JSON.parse - highly optimized!
  const leagueData = JSON.parse(textContent);
  
  postProgress('Parse complete', 95, 100);
  return leagueData;
}

// ZenGM's approach for URLs too: fetch → decompress stream → arrayBuffer → JSON.parse
async function parseUrlStreaming(url: string): Promise<any> {
  console.log(`[WORKER] Fetching URL (ZenGM method):`, url);
  
  postProgress('Fetching URL...', 5, 100);
  
  const response = await fetch(url, { mode: 'cors' });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  if (!response.body) {
    throw new Error('Response body not available');
  }
  
  postProgress('Downloading...', 15, 100);
  
  const isCompressed = url.includes('.gz') || url.includes('.json.gz');
  
  let textContent: string;
  
  if (isCompressed) {
    postProgress('Decompressing...', 40, 100);
    
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream not supported. Please use Chrome 80+, Firefox 113+, or Safari 16.4+');
    }
    
    // Use response.body stream for decompression
    const decompressedStream = response.body.pipeThrough(new DecompressionStream('gzip'));
    const decompressedBuffer = await new Response(decompressedStream).arrayBuffer();
    
    postProgress('Decoding...', 60, 100);
    textContent = new TextDecoder().decode(decompressedBuffer);
    
  } else {
    postProgress('Decoding...', 50, 100);
    const arrayBuffer = await response.arrayBuffer();
    textContent = new TextDecoder().decode(arrayBuffer);
  }
  
  postProgress('Parsing JSON...', 80, 100);
  
  // Use browser's native JSON.parse - highly optimized!
  const leagueData = JSON.parse(textContent);
  
  postProgress('Parse complete', 95, 100);
  return leagueData;
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
