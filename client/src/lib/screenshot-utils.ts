import { toPng } from 'html-to-image';

export interface ScreenshotOptions {
  quality?: number; // 0-1, default 0.95
  pixelRatio?: number; // default 2 for high DPI
  backgroundColor?: string; // default transparent
}

/**
 * Captures a DOM element as a PNG image blob
 * @param element - The DOM element to screenshot
 * @param options - Screenshot options
 * @returns Promise that resolves to a Blob of the image
 */
export async function captureElementAsBlob(
  element: HTMLElement,
  options: ScreenshotOptions = {}
): Promise<Blob> {
  const {
    quality = 0.95,
    pixelRatio = 2,
    backgroundColor = 'transparent',
  } = options;

  try {
    // Generate the image as a data URL
    const dataUrl = await toPng(element, {
      quality,
      pixelRatio,
      backgroundColor,
      cacheBust: true,
      style: {
        // Ensure all content is visible
        transform: 'none',
        opacity: '1',
      },
    });

    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    return blob;
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    throw new Error('Failed to capture screenshot');
  }
}

/**
 * Captures a DOM element and returns it as a data URL
 * @param element - The DOM element to screenshot
 * @param options - Screenshot options
 * @returns Promise that resolves to a data URL string
 */
export async function captureElementAsDataUrl(
  element: HTMLElement,
  options: ScreenshotOptions = {}
): Promise<string> {
  const {
    quality = 0.95,
    pixelRatio = 2,
    backgroundColor = 'transparent',
  } = options;

  try {
    return await toPng(element, {
      quality,
      pixelRatio,
      backgroundColor,
      cacheBust: true,
    });
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    throw new Error('Failed to capture screenshot');
  }
}
