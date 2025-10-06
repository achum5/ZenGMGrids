// client/src/lib/io/import/progress.ts

export interface ProgressReport {
  processedBytes: number;
  totalBytes?: number;
  percent: number;
  bytesPerSecond: number;
  etaSeconds?: number;
}

type ProgressCallback = (report: ProgressReport) => void;

const SMOOTHING_FACTOR = 0.005; // For exponential moving average of speed

export function createProgressStream(
  totalBytes: number | undefined,
  onProgress: ProgressCallback,
): TransformStream<Uint8Array, Uint8Array> {
  let processedBytes = 0;
  let lastTimestamp = performance.now();
  let bytesPerSecond = 0;
  let lastReportTimestamp = 0;

  return new TransformStream({
    transform(chunk, controller) {
      processedBytes += chunk.byteLength;
      const now = performance.now();
      const elapsedSeconds = (now - lastTimestamp) / 1000;

      if (elapsedSeconds > 0) {
        const currentSpeed = chunk.byteLength / elapsedSeconds;
        bytesPerSecond = bytesPerSecond
          ? SMOOTHING_FACTOR * currentSpeed + (1 - SMOOTHING_FACTOR) * bytesPerSecond
          : currentSpeed;
      }
      lastTimestamp = now;

      // Throttle reports to avoid overwhelming the main thread
      if (now - lastReportTimestamp > 250 || processedBytes === totalBytes) {
        const percent = totalBytes ? (processedBytes / totalBytes) * 100 : 0;
        const etaSeconds =
          totalBytes && bytesPerSecond > 0
            ? (totalBytes - processedBytes) / bytesPerSecond
            : undefined;

        onProgress({
          processedBytes,
          totalBytes,
          percent,
          bytesPerSecond,
          etaSeconds,
        });
        lastReportTimestamp = now;
      }

      controller.enqueue(chunk);
    },
  });
}
