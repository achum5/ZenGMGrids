import pako from 'pako';
import { normalizeLeague } from './league-normalizer';
import type { LeagueData, Sport } from './league-normalizer';

// Helper to post progress messages
const postProgress = (message: string, loaded?: number, total?: number) => {
  self.postMessage({ type: 'progress', message, loaded, total });
};

self.onmessage = async (event: MessageEvent<{ file: File }>) => {
  const { file } = event.data;

  if (!file) {
    self.postMessage({ type: 'error', error: 'No file provided to worker.' });
    return;
  }

  try {
    postProgress('Reading file...', 0, file.size);
    const arrayBuffer = await file.arrayBuffer();
    let content: string;

    if (file.name.endsWith('.gz')) {
      postProgress('Decompressing file...', 50, 100); // Simulate progress
      const compressed = new Uint8Array(arrayBuffer);
      content = pako.inflate(compressed, { to: 'string' });
    } else {
      content = new TextDecoder('utf-8').decode(arrayBuffer);
    }

    if (!content) {
      throw new Error('File content is empty after reading/decompression.');
    }

    postProgress('Parsing JSON data...', 75, 100); // Simulate progress
    const rawData = JSON.parse(content);

    // Pass the progress callback to the normalizer
    const leagueData = normalizeLeague(rawData, (message) => {
      postProgress(message, 90, 100); // Show detailed progress from normalizer
    });

    postProgress('Processing complete.', 100, 100);
    self.postMessage({ type: 'complete', leagueData });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred in the worker.';
    console.error('[WORKER] Error processing file:', error);
    self.postMessage({ type: 'error', error: errorMessage });
  }
};