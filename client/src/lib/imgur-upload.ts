/**
 * ImgBB API integration for image uploads.
 *
 * ImgBB is a free image hosting service with a simple API.
 * No credit card required, completely free for personal use.
 *
 * Setup Instructions:
 * 1. Go to https://api.imgbb.com/
 * 2. Click "Get API Key" (you'll need to create a free account)
 * 3. Sign up with your email (takes 30 seconds, no payment needed)
 * 4. Copy your API key
 * 5. Add it to your .env file as: VITE_IMGBB_API_KEY=your_api_key_here
 * 6. Restart your dev server
 *
 * Free tier includes:
 * - Unlimited uploads
 * - Permanent image hosting
 * - No expiration
 * - Fast CDN delivery
 */

const IMGBB_API_ENDPOINT = 'https://api.imgbb.com/1/upload';

/**
 * Response structure from ImgBB API
 */
export interface ImgurUploadResponse {
  success: boolean;
  data?: {
    id: string;
    link: string;
    url: string;
    display_url: string;
    delete_url: string;
    width: number;
    height: number;
    size: number;
    time: number;
    expiration: number;
  };
  error?: string;
}

/**
 * Converts a Blob to a base64 string.
 * ImgBB API requires base64 encoded images.
 *
 * @param blob - The image blob to convert
 * @returns Promise resolving to base64 string (without data URI prefix)
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the data URI prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads an image to ImgBB.
 * Requires VITE_IMGBB_API_KEY environment variable to be set.
 *
 * @param imageBlob - The image data as a Blob
 * @param title - Optional title for the image (not used by ImgBB, kept for compatibility)
 * @param description - Optional description (not used by ImgBB, kept for compatibility)
 * @returns Promise resolving to the upload response
 */
export async function uploadToImgur(
  imageBlob: Blob,
  title?: string,
  description?: string
): Promise<ImgurUploadResponse> {
  // Retrieve the ImgBB API key from environment variables
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;

  // Debug logging
  console.log('Environment check:', {
    hasKey: !!apiKey,
    keyLength: apiKey?.length,
    allEnvKeys: Object.keys(import.meta.env),
  });

  // Check if the API key is configured
  if (!apiKey) {
    console.error('ImgBB API key is not configured. Set VITE_IMGBB_API_KEY in your .env file.');
    console.error('Available env vars:', import.meta.env);
    return {
      success: false,
      error: 'Image upload is not configured. Please contact the administrator.',
    };
  }

  try {
    // Convert the blob to base64 as required by ImgBB
    const base64Image = await blobToBase64(imageBlob);

    // Prepare the form data for the upload
    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('image', base64Image);

    // ImgBB supports 'name' parameter for filename
    if (title) {
      formData.append('name', title.replace(/[^a-zA-Z0-9-_]/g, '_'));
    }

    // Send the upload request to ImgBB
    const response = await fetch(IMGBB_API_ENDPOINT, {
      method: 'POST',
      body: formData,
    });

    // Parse the response
    const responseData = await response.json();

    // Check if the upload was successful
    if (response.ok && responseData.success) {
      // Transform ImgBB response to match our interface
      return {
        success: true,
        data: {
          id: responseData.data.id,
          link: responseData.data.url, // Use the direct URL
          url: responseData.data.url,
          display_url: responseData.data.display_url,
          delete_url: responseData.data.delete_url,
          width: responseData.data.width,
          height: responseData.data.height,
          size: responseData.data.size,
          time: responseData.data.time,
          expiration: responseData.data.expiration,
        },
      };
    } else {
      console.error('ImgBB upload failed:', responseData);
      return {
        success: false,
        error: responseData.error?.message || 'Upload failed',
      };
    }
  } catch (error) {
    console.error('Error during ImgBB upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Copies text to the user's clipboard.
 * Uses the modern Clipboard API with fallback for older browsers.
 *
 * @param text - The text to copy
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const successful = document.execCommand('copy');
      textarea.remove();
      return successful;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
