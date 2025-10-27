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
  season?: number; // Add season to PlayerLite
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

export async function getPlayerImage(p: PlayerLite, context?: string): Promise<{type: "url" | "svg" | "none"; data: string}> {
  console.log(`[GET PLAYER IMAGE START] ${p.name} [${context || 'unknown'}]:`, {
    hasFace: !!p.face,
    hasJerseyInfo: !!p.jerseyInfo,
    originalFaceJerseyId: p.face?.jersey?.id,
    jerseyInfoJersey: p.jerseyInfo?.jersey
  });
  // Prefer a real photo URL if present
  if (p.imgURL && p.imgURL.trim()) {
    const u = p.imgURL.trim();
    urlCache.set(p.pid, u);
    return { type: "url", data: u };
  }

  // Always clear cache if jersey info is provided to force re-render with new colors
  if (p.jerseyInfo) {
    const hadSvgCache = svgCache.has(p.pid);
    const hadUrlCache = urlCache.has(p.pid);
    svgCache.delete(p.pid);
    urlCache.delete(p.pid);
    console.log(`[CACHE CLEAR] ${p.name} [${context}]: Cleared SVG=${hadSvgCache}, URL=${hadUrlCache}`);
  }

  // Check cache only if no jersey info was provided
  if (!p.jerseyInfo && svgCache.has(p.pid)) {
    console.log(`[CACHE HIT] ${p.name} [${context}]: Using cached SVG (no jerseyInfo)`);
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

        // Always use the team's jersey style from jerseyInfo for season-alignment
        // This ensures players wear the correct team jersey for the specific season
        let jerseyToUse = p.jerseyInfo.jersey
          ? { id: p.jerseyInfo.jersey }
          : (p.face.jersey || { id: "modern" });

        console.log(`[FACE RENDERER BEFORE] ${p.name}:`, {
          jerseyInfoProvided: p.jerseyInfo.jersey,
          originalFaceJersey: JSON.stringify(p.face.jersey),
          jerseyToUseObject: JSON.stringify(jerseyToUse),
          originalFaceBody: p.face.body,
          entireFaceKeys: Object.keys(p.face)
        });

        // Simple approach: spread the original face and only override what we need
        faceToRender = {
          ...p.face,
          teamColors: teamColorsToApply,
          jersey: jerseyToUse,
          // CRITICAL: Also update accessories if it exists, since faces.js might read jersey from there
          accessories: p.face.accessories ? {
            ...p.face.accessories,
            jersey: jerseyToUse
          } : undefined
          // Keep body and all other properties as-is
        };

        console.log(`[FACE RENDERER AFTER] ${p.name} applied jersey:`, JSON.stringify(faceToRender.jersey), 'body.jersey:', JSON.stringify(faceToRender.body?.jersey), 'faceToRenderKeys:', Object.keys(faceToRender));
      }

      // Render the face with jersey colors
      console.log(`[FACE RENDERER DISPLAY] ${p.name} calling display() with jersey:`, JSON.stringify(faceToRender.jersey));

      // Log EVERY property that mentions jersey to find the culprit
      const allJerseyProps: any = {};
      const checkObject = (obj: any, path: string) => {
        if (!obj || typeof obj !== 'object') return;
        for (const key in obj) {
          const fullPath = path ? `${path}.${key}` : key;
          if (key.toLowerCase().includes('jersey')) {
            allJerseyProps[fullPath] = JSON.stringify(obj[key]);
          }
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            checkObject(obj[key], fullPath);
          }
        }
      };
      checkObject(faceToRender, '');
      console.log(`[FACE RENDERER ALL JERSEY PROPS] ${p.name}:`, allJerseyProps);

      display(tempContainer, faceToRender);

      // Wait for next frame to ensure rendering is complete (important for mobile)
      await new Promise(resolve => requestAnimationFrame(resolve));

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

        // Log what jersey is in the actual generated SVG
        const svgHash = svg.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
        console.log(`[CACHE SAVE] ${p.name} [${context}]: SVG Hash=${svgHash}, Length=${svg.length}`);

        // Store for comparison
        if (!window.svgDebug) window.svgDebug = {};
        window.svgDebug[`${p.name}_${context}`] = svg;

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
