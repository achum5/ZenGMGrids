// client/src/lib/io/import/byteSources.ts

interface StreamSource {
  stream: ReadableStream<Uint8Array>;
  totalBytes?: number;
}

/**
 * Creates a ReadableStream from a local File object.
 * Uses file.stream() where available, with a fallback for other browsers.
 */
export function fromLocalFile(file: File): StreamSource {
  if ('stream' in file && typeof file.stream === 'function') {
    return {
      stream: file.stream() as ReadableStream<Uint8Array>,
      totalBytes: file.size,
    };
  }

  // Fallback for browsers that don't support file.stream() (e.g., older Safari)
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const chunkSize = 1024 * 1024; // 1MB chunks
      let offset = 0;

      while (offset < file.size) {
        const chunk = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(reader.error);
          const blob = file.slice(offset, offset + chunkSize);
          reader.readAsArrayBuffer(blob);
        });

        controller.enqueue(new Uint8Array(chunk));
        offset += chunk.byteLength;
      }
      controller.close();
    },
  });

  return { stream, totalBytes: file.size };
}

/**
 * Creates a ReadableStream from a URL.
 * Uses fetch and response.body.
 */
export async function fromURL(url: string, signal: AbortSignal): Promise<StreamSource> {
  const response = await fetch(url, { signal, mode: 'cors' });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error('Response has no body to read.');
  }

  const contentLength = response.headers.get('Content-Length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : undefined;

  return {
    stream: response.body,
    totalBytes,
  };
}
