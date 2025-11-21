import type { JerseyInfo } from './jersey-utils';

let facesLib: any | null = null;
const svgCache = new Map<number, string>();   // pid -> svg
const urlCache = new Map<number, string>();   // pid -> url

// Get asset base URL for the given sport (same as TeamLogo)
function getAssetBaseUrl(sport: string = 'basketball'): string {
  switch (sport) {
    case 'baseball':
      return "https://baseball.zengm.com";
    case 'football':
      return "https://play.football-gm.com";
    case 'hockey':
      return "https://hockey.zengm.com";
    case 'basketball':
    default:
      return "https://play.basketball-gm.com";
  }
}

export type PlayerLite = {
  pid: number;
  name: string;
  imgURL?: string | null;
  face?: any | null;
  jerseyInfo?: JerseyInfo;
  season?: number; // Add season to PlayerLite
  sport?: string; // Add sport to PlayerLite for asset URL resolution
}; 

export function normalizeSvg(svg: string) {
  // Remove any x and y positioning from the SVG tag itself
  let s = svg.replace(/\s(x|y)="[^"]*"/g, "");
  
  // Ensure viewBox is present for proper scaling (critical for mobile)
  if (!/viewBox=/.test(s)) {
    s = s.replace("<svg", '<svg viewBox="0 0 400 600"');
  }
  
  // Add centering attributes for mobile compatibility
  if (!/preserveAspectRatio=/.test(s)) {
    s = s.replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
  }
  
  return s;
}

export async function getPlayerImage(p: PlayerLite): Promise<{type: "url" | "svg" | "none"; data: string}> {
  // Prefer a real photo URL if present
  if (p.imgURL && p.imgURL.trim()) {
    let u = p.imgURL.trim();

    // Check if this is a default BBGM relative path (like /img/blank-face.png)
    if (u.startsWith('/img/')) {
      const sport = p.sport || p.jerseyInfo?.sport || 'basketball';
      const assetBase = getAssetBaseUrl(sport);
      const cleanPath = u.startsWith('/') ? u.substring(1) : u;
      u = `${assetBase}/${cleanPath}`;
    }

    urlCache.set(p.pid, u);
    return { type: "url", data: u };
  }

  // Always clear cache if jersey info is provided to force re-render with new colors
  if (p.jerseyInfo) {
    svgCache.delete(p.pid);
    urlCache.delete(p.pid);
  }

  // Check cache only if no jersey info was provided
  if (!p.jerseyInfo && svgCache.has(p.pid)) {
    return { type: "svg", data: svgCache.get(p.pid)! };
  }
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
      console.error('[FaceRenderer] display function not found in facesjs');
      return { type: "none", data: "" };
    }

    // Create a temporary container element
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '200px';
    tempContainer.style.height = '200px';

    // Ensure document.body exists before appending
    if (!document.body) {
      console.error('[FaceRenderer] document.body not available');
      return { type: "none", data: "" };
    }

    document.body.appendChild(tempContainer);

    try {
      // Prepare face data with jersey info if available
      let faceToRender = p.face;

      if (p.jerseyInfo && p.jerseyInfo.colors && p.jerseyInfo.colors.length > 0) {
        // Create a copy of the face data and apply jersey colors using teamColors array
        // Use team's jersey style if available, otherwise keep player's original

        // Prepare the team colors array
        const teamColorsToApply = p.jerseyInfo.colors.length >= 3
          ? p.jerseyInfo.colors
          : [
              p.jerseyInfo.colors[0] || "#89bfd3", // Primary team color
              p.jerseyInfo.colors[1] || "#7a1319", // Secondary team color
              p.jerseyInfo.colors[2] || p.jerseyInfo.colors[0] || "#07364f" // Third color or fallback
            ];

        // Use the team's jersey style from jerseyInfo for season-alignment
        // BUT: Keep the player's original jersey style if jerseyInfo specifies 'modern'
        // (because 'modern' doesn't render properly in faces.js)
        let jerseyToUse = p.face.jersey || { id: "modern" };

        // Only override jersey ID if jerseyInfo provides a specific non-modern style
        if (p.jerseyInfo.jersey && p.jerseyInfo.jersey !== 'modern') {
          jerseyToUse = { ...(p.face.jersey || {}), id: p.jerseyInfo.jersey };
        }

        // Simple approach: spread the original face and only override what we need
        faceToRender = {
          ...p.face,
          teamColors: teamColorsToApply,
          jersey: jerseyToUse,
          // Preserve accessories as-is (jersey is a separate top-level property in faces.js, not part of accessories)
          ...(p.face.accessories && { accessories: p.face.accessories })
          // Keep body and all other properties as-is
        };
      } else {
        // Fallback: Apply default jersey colors when jerseyInfo is missing/invalid
        // This prevents players from appearing "naked" (without jerseys)
        // Uses draft prospect/free agent colors: black, light grey, white
        const defaultColors = ['#000000', '#CCCCCC', '#ffffff'];
        const defaultJersey = { ...(p.face.jersey || {}), id: p.face.jersey?.id || "modern" };

        faceToRender = {
          ...p.face,
          teamColors: defaultColors,
          jersey: defaultJersey,
          ...(p.face.accessories && { accessories: p.face.accessories })
        };
      }

      // Render the face with jersey colors
      display(tempContainer, faceToRender);

      // Wait for multiple frames to ensure rendering is complete (important for mobile)
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 50)); // Extra delay for mobile browsers

      // Jersey colors should already be applied through the face data

      // Extract the SVG element
      const svgElement = tempContainer.querySelector('svg');
      if (svgElement) {
        // Remove any attributes that could cause positioning issues
        svgElement.removeAttribute('x');
        svgElement.removeAttribute('y');
        
        // Ensure SVG has proper viewBox for scaling (critical for mobile)
        if (!svgElement.hasAttribute('viewBox')) {
          svgElement.setAttribute('viewBox', '0 0 400 600');
        }
        
        // Set preserveAspectRatio for proper centering
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        const raw = svgElement.outerHTML;
        const svg = normalizeSvg(raw);
        svgCache.set(p.pid, svg);
        return { type: "svg", data: svg };
      } else {
        console.error('[FaceRenderer] No SVG element found after rendering for player', p.pid);
      }
    } finally {
      // Clean up the temporary element
      if (tempContainer.parentNode) {
        document.body.removeChild(tempContainer);
      }
    }

  } catch (error) {
    console.error('[FaceRenderer] Error generating face for player', p.pid, error);
  }
  
  return { type: "none", data: "" };
}
