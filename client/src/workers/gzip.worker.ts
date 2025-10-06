// client/src/workers/gzip.worker.ts
import { AsyncGunzip, Gunzip } from 'fflate';

let gunzip: AsyncGunzip;

self.onmessage = ({ data }) => {
  if (data.type === 'init') {
    gunzip = new AsyncGunzip();
    gunzip.on('data', (chunk) => {
      self.postMessage({ type: 'data', chunk }, [chunk.buffer]);
    });
    gunzip.on('end', () => {
      self.postMessage({ type: 'end' });
    });
  } else if (data.type === 'chunk') {
    if (gunzip) {
      gunzip.push(data.chunk);
    }
  } else if (data.type === 'end') {
    if (gunzip) {
      gunzip.push(new Uint8Array(), true); // Finalize
    }
  }
};
