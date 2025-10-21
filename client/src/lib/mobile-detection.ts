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

// Thresholds for file parsing (files below these sizes use traditional, above use streaming)
const DESKTOP_GZ_THRESHOLD_MB = 30;
const DESKTOP_JSON_THRESHOLD_MB = 210;
const MOBILE_GZ_THRESHOLD_MB = 10;
const MOBILE_JSON_THRESHOLD_MB = 70;

export function getRecommendedMethod(fileSize?: number, fileName?: string, isUrl: boolean = false): 'traditional' | 'streaming' | 'mobile-idb' {
  // If no file size provided and it's a URL, default to streaming (safer for unknown sizes)
  if (fileSize === undefined && isUrl) {
    return 'streaming';
  }

  // If no file size provided and it's a file upload, default to traditional
  if (fileSize === undefined) {
    return 'traditional';
  }

  const isMobile = isMobileDevice();
  const isGzipped = fileName?.endsWith('.gz') || false;

  // Convert fileSize to MB
  const fileSizeMB = fileSize / (1024 * 1024);

  if (isMobile) {
    // Mobile thresholds
    const threshold = isGzipped ? MOBILE_GZ_THRESHOLD_MB : MOBILE_JSON_THRESHOLD_MB;
    if (fileSizeMB < threshold) {
      return 'traditional';
    }
    return 'streaming';
  } else {
    // Desktop thresholds
    const threshold = isGzipped ? DESKTOP_GZ_THRESHOLD_MB : DESKTOP_JSON_THRESHOLD_MB;
    if (fileSizeMB < threshold) {
      return 'traditional';
    }
    return 'streaming';
  }
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
