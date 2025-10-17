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

export type ParsingMethod = 'auto' | 'traditional' | 'streaming';

export function getRecommendedMethod(): 'traditional' | 'streaming' {
  return isMobileDevice() ? 'traditional' : 'streaming';
}

// Get stored preference or return 'auto' as default
export function getStoredParsingMethod(): ParsingMethod {
  try {
    const stored = localStorage.getItem('parsingMethod');
    if (stored === 'auto' || stored === 'traditional' || stored === 'streaming') {
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
