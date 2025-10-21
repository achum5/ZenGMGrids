// Mobile detection utility
export function isMobileDevice(): boolean {
  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  
  // Check if any mobile keyword is in user agent
  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  // Check for touch capability and small screen (more reliable)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  
  // Mobile if either UA indicates mobile OR (touch + small screen)
  return isMobileUA || (isTouchDevice && isSmallScreen);
}

export type ParsingMethod = 'auto' | 'traditional' | 'streaming' | 'mobile-idb';

// 100MB threshold for compressed files (decompresses to ~1.3GB typically)
const LARGE_FILE_THRESHOLD_BYTES = 100 * 1024 * 1024; // 100MB

export function getRecommendedMethod(fileSize?: number): 'traditional' | 'streaming' | 'mobile-idb' {
  // If file size is provided and exceeds threshold, use mobile-idb (IndexedDB streaming)
  // This works on both mobile and desktop and handles any file size
  if (fileSize !== undefined && fileSize > LARGE_FILE_THRESHOLD_BYTES) {
    return 'mobile-idb';
  }

  // For smaller files, use traditional method (faster but less reliable for large files)
  return 'traditional';
}

// Get stored preference or return 'auto' as default
export function getStoredParsingMethod(): ParsingMethod {
  try {
    const stored = localStorage.getItem('parsingMethod');
    if (stored === 'auto' || stored === 'traditional' || stored === 'streaming' || stored === 'mobile-idb') {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return 'auto';
}

// Store user's parsing method preference
export function storeParsingMethod(method: ParsingMethod): void {
  try {
    localStorage.setItem('parsingMethod', method);
  } catch {
    // localStorage not available, fail silently
  }
}
