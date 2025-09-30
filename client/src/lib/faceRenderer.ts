import type { JerseyInfo } from './jersey-utils';

let facesLib: any | null = null;
const svgCache = new Map<number, string>();   // pid -> svg
const urlCache = new Map<number, string>();   // pid -> url

export type PlayerLite = { 
  pid: number; 
  name: string; 
  imgURL?: string | null; 
  face?: any | null;
  jerseyInfo?: JerseyInfo;
}; 

export function normalizeSvg(svg: string) {
  // Remove fixed sizing so it can scale with CSS; keep viewBox
  let s = svg.replace(/\s(width|height)="[^"]*"/g, "");
  
  // Remove any x and y positioning from the SVG tag itself
  s = s.replace(/\s(x|y)="[^"]*"/g, "");
  
  // Add centering attributes
  if (!/preserveAspectRatio=/.test(s)) {
    s = s.replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
  }
  
  return s;
}

export async function getPlayerImage(p: PlayerLite): Promise<{type: "url" | "svg" | "none"; data: string}> {
  // Prefer a real photo URL if present
  if (p.imgURL && p.imgURL.trim()) {
    const u = p.imgURL.trim();
    urlCache.set(p.pid, u);
    return { type: "url", data: u };
  }

  // Clear cache if we have new jersey info to apply different colors
  if (p.jerseyInfo && svgCache.has(p.pid)) {
    svgCache.delete(p.pid);
  }

  // Else try faces.js
  if (svgCache.has(p.pid)) return { type: "svg", data: svgCache.get(p.pid)! };
  if (!p.face) {
    return { type: "none", data: "" };
  }

  try {
    if (!facesLib) {
      facesLib = await import("facesjs");
    }
    
    // Use the browser-compatible display method instead of faceToSvgString
    const { display } = facesLib;
    
    if (!display) {
      console.error('display function not found in facesjs');
      return { type: "none", data: "" };
    }
    
    // Create a temporary container element
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);
    
    try {
      // Prepare face data with jersey info if available
      let faceToRender = p.face;
      
      if (p.jerseyInfo && p.jerseyInfo.colors && p.jerseyInfo.colors.length > 0) {
        // Remove console logs for cleaner output
        
        // Create a copy of the face data and apply jersey colors using teamColors array
        // Use team's jersey style if available, otherwise keep player's original
        faceToRender = {
          ...p.face,
          teamColors: p.jerseyInfo.colors.length >= 3 
            ? p.jerseyInfo.colors 
            : [
                p.jerseyInfo.colors[0] || "#89bfd3", // Primary team color
                p.jerseyInfo.colors[1] || "#7a1319", // Secondary team color  
                p.jerseyInfo.colors[2] || p.jerseyInfo.colors[0] || "#07364f" // Third color or fallback
              ],
          // Always use team's jersey style if provided, fallback to player's original
          jersey: p.jerseyInfo.jersey 
            ? { id: p.jerseyInfo.jersey } 
            : p.face.jersey,
          // Preserve accessories (important for baseball caps)
          accessories: p.face.accessories || { id: "none" }
        };
        
      }
      
      // Render the face with jersey colors
      display(tempContainer, faceToRender);
      
      // Jersey colors should already be applied through the face data
      
      // Extract the SVG element
      const svgElement = tempContainer.querySelector('svg');
      if (svgElement) {
        // Remove any attributes that could cause positioning issues
        svgElement.removeAttribute('x');
        svgElement.removeAttribute('y');
        svgElement.removeAttribute('style');
        
        // Ensure the SVG will center properly
        svgElement.style.display = 'block';
        svgElement.style.margin = '0 auto';
        svgElement.style.transform = 'translateX(25%)';
        
        const raw = svgElement.outerHTML;
        const svg = normalizeSvg(raw);
        svgCache.set(p.pid, svg);
        return { type: "svg", data: svg };
      }
    } finally {
      // Clean up the temporary element
      document.body.removeChild(tempContainer);
    }
    
  } catch (error) {
    // Silently handle face generation errors
  }
  
  return { type: "none", data: "" };
}
