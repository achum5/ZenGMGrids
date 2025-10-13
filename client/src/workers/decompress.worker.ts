import { inflate } from 'pako';

self.onmessage = (event: MessageEvent) => {
  const { fileBuffer } = event.data;

  try {
    // Decompress to Uint8Array (binary) to avoid Invalid string length error
    const decompressed = inflate(fileBuffer);
    // Transfer the ArrayBuffer back to the main thread
    self.postMessage({ success: true, decompressedBuffer: decompressed.buffer }, [decompressed.buffer]);
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message });
  }
};