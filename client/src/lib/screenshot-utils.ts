import { toPng } from 'html-to-image';

/**
 * Configuration options for capturing screenshots
 */
export interface ScreenshotOptions {
  /** Image quality from 0 to 1 (default: 0.95) */
  quality?: number;
  /** Pixel ratio for high DPI displays (default: 2) */
  pixelRatio?: number;
  /** Background color for the image (default: 'transparent') */
  backgroundColor?: string;
}

/**
 * Captures a DOM element as a PNG image and returns it as a Blob.
 * This is useful for uploading the image to a server or downloading it.
 *
 * @param element - The HTML element to capture
 * @param options - Optional configuration for the screenshot
 * @returns A Promise that resolves to a Blob containing the PNG image
 * @throws Error if the screenshot capture fails
 */
export async function captureElementAsBlob(
  element: HTMLElement,
  options: ScreenshotOptions = {}
): Promise<Blob> {
  // Set default values for options
  const quality = options.quality ?? 0.95;
  const pixelRatio = options.pixelRatio ?? 2;
  const backgroundColor = options.backgroundColor ?? 'transparent';

  try {
    // Use html-to-image to convert the element to a PNG data URL
    const dataUrl = await toPng(element, {
      quality,
      pixelRatio,
      backgroundColor,
      cacheBust: true, // Prevent caching issues
      skipFonts: true, // Skip external fonts to avoid CORS errors
      style: {
        // Ensure element renders correctly
        transform: 'none',
        opacity: '1',
      },
    });

    // Convert the data URL to a Blob for uploading
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    return blob;
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    throw new Error('Failed to capture screenshot');
  }
}

/**
 * Captures a DOM element as a PNG image and returns it as a data URL.
 * This is useful for displaying the image directly or saving it locally.
 *
 * @param element - The HTML element to capture
 * @param options - Optional configuration for the screenshot
 * @returns A Promise that resolves to a data URL string
 * @throws Error if the screenshot capture fails
 */
export async function captureElementAsDataUrl(
  element: HTMLElement,
  options: ScreenshotOptions = {}
): Promise<string> {
  const quality = options.quality ?? 0.95;
  const pixelRatio = options.pixelRatio ?? 2;
  const backgroundColor = options.backgroundColor ?? 'transparent';

  try {
    return await toPng(element, {
      quality,
      pixelRatio,
      backgroundColor,
      cacheBust: true,
      skipFonts: true, // Skip external fonts to avoid CORS errors
    });
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    throw new Error('Failed to capture screenshot');
  }
}
