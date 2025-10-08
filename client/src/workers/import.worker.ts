// This file will be the entry point for our web worker.
// It will listen for messages from the main thread and kick off the import process.

import { importLeagueStream } from '@/lib/streamingImport';

self.onmessage = async (event) => {
  const { file, url } = event.data;

  try {
    const onProgress = (percent: number) => {
      self.postMessage({ type: 'progress', payload: percent });
    };

    const leagueData = await importLeagueStream({ file, url }, onProgress);

    self.postMessage({ type: 'complete', payload: leagueData });
  } catch (error) {
    self.postMessage({ type: 'error', payload: (error as Error).message });
  }
};
