/**
 * Imgur API integration for anonymous image uploads
 *
 * To use this, you need to:
 * 1. Register an app at https://api.imgur.com/oauth2/addclient
 * 2. Choose "OAuth 2 authorization without a callback URL"
 * 3. Get your Client ID
 * 4. Set the VITE_IMGUR_CLIENT_ID environment variable
 */

const IMGUR_UPLOAD_URL = 'https://api.imgur.com/3/image';

export interface ImgurUploadResponse {
  success: boolean;
  data?: {
    id: string;
    link: string;
    deletehash: string;
    type: string;
    width: number;
    height: number;
    size: number;
  };
  error?: string;
}

/**
 * Uploads an image blob to Imgur anonymously
 * @param imageBlob - The image blob to upload
 * @param title - Optional title for the image
 * @param description - Optional description for the image
 * @returns Promise that resolves to the Imgur response
 */
export async function uploadToImgur(
  imageBlob: Blob,
  title?: string,
  description?: string
): Promise<ImgurUploadResponse> {
  // Get the client ID from environment variable
  const clientId = import.meta.env.VITE_IMGUR_CLIENT_ID;

  if (!clientId) {
    console.error('Imgur Client ID not configured. Please set VITE_IMGUR_CLIENT_ID in your .env file');
    return {
      success: false,
      error: 'Imgur Client ID not configured. Please contact the site administrator.',
    };
  }

  try {
    // Create form data
    const formData = new FormData();
    formData.append('image', imageBlob);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);

    // Make the request
    const response = await fetch(IMGUR_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Client-ID ${clientId}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        data: data.data,
      };
    } else {
      console.error('Imgur upload failed:', data);
      return {
        success: false,
        error: data.data?.error || 'Failed to upload image to Imgur',
      };
    }
  } catch (error) {
    console.error('Error uploading to Imgur:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Copies text to clipboard
 * @param text - The text to copy
 * @returns Promise that resolves to true if successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // Use modern clipboard API
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
