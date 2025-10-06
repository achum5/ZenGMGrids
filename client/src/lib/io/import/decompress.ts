// client/src/lib/io/import/decompress.ts

/**
 * Conditionally gunzips a stream if it's gzipped.
 * Prefers native DecompressionStream, falls back to a web worker with fflate.
 */
export function maybeGunzip(
  stream: ReadableStream<Uint8Array>,
  isGzip: boolean,
): ReadableStream<Uint8Array> {
  if (!isGzip) {
    return stream;
  }

  // Prefer native browser API if available
  if ('DecompressionStream' in window) {
    try {
      return stream.pipeThrough(new DecompressionStream('gzip'));
    } catch (e) {
      console.error('DecompressionStream failed, falling back to worker.', e);
      // Fall through to worker implementation
    }
  }

  // Fallback to web worker
  const worker = new Worker(new URL('../../../workers/gzip.worker.ts', import.meta.url), {
    type: 'module',
  });

  worker.postMessage({ type: 'init' });

  const reader = stream.getReader();

  return new ReadableStream({
    async start(controller) {
      worker.onmessage = ({ data }) => {
        if (data.type === 'data') {
          controller.enqueue(data.chunk);
        } else if (data.type === 'end') {
          controller.close();
          worker.terminate();
        } else if (data.type === 'error') {
          controller.error(new Error('Gzip worker failed'));
          worker.terminate();
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            worker.postMessage({ type: 'end' });
            break;
          }
          worker.postMessage({ type: 'chunk', chunk: value }, [value.buffer]);
        }
      } catch (error) {
        controller.error(error);
        worker.terminate();
      }
    },
    cancel(reason) {
      stream.cancel(reason);
      worker.terminate();
    },
  });
}
