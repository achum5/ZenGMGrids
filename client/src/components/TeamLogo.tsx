import { useState, useMemo } from 'react';
import { ResponsiveText } from '@/components/ResponsiveText';
import type { Team } from '@/types/bbgm';

// BBGM asset base URL for default logos
const BBGM_ASSET_BASE = "https://play.basketball-gm.com";

// Check if a logo path is a BBGM default logo
function isBBGMDefaultLogo(logoURL: string | null | undefined): boolean {
  if (!logoURL) return false;
  return logoURL.startsWith('/img/logos-') || logoURL.startsWith('img/logos-');
}

// Build candidate logo URLs for a team
function buildLogoCandidates(team: Team): string[] {
  const candidates: string[] = [];
  
  // 1. If explicit absolute URL is provided, try it first
  if (team.imgURL && !isBBGMDefaultLogo(team.imgURL)) {
    candidates.push(team.imgURL);
    // For custom logos, don't add BBGM fallbacks to avoid showing wrong team logos
    return candidates;
  }
  
  // 2. If explicit BBGM default path is provided, try converting it to absolute
  if (team.imgURL && isBBGMDefaultLogo(team.imgURL)) {
    const cleanPath = team.imgURL.startsWith('/') ? team.imgURL.substring(1) : team.imgURL;
    candidates.push(`${BBGM_ASSET_BASE}/${cleanPath}`);
  }
  
  // 3. Only build BBGM default URLs if no custom logo is provided
  if (!team.imgURL && team.abbrev) {
    const abbrev = team.abbrev.toUpperCase();
    candidates.push(
      `${BBGM_ASSET_BASE}/img/logos-primary/${abbrev}.svg`,
      `${BBGM_ASSET_BASE}/img/logos-secondary/${abbrev}.svg`
    );
  }
  
  return candidates;
}

interface TeamLogoProps {
  team: Team;
  className?: string;
}

export function TeamLogo({ team, className = '' }: TeamLogoProps) {
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);
  const [logoLoaded, setLogoLoaded] = useState(false);
  
  const fullTeamName = team.region ? `${team.region} ${team.name}` : team.name;
  
  // Build list of logo URL candidates to try
  const logoCandidates = useMemo(() => buildLogoCandidates(team), [team.imgURL, team.abbrev]);
  
  const currentLogoURL = logoCandidates[currentCandidateIndex];
  const hasLogoCandidates = logoCandidates.length > 0 && currentCandidateIndex < logoCandidates.length;
  
  const handleLogoError = () => {
    if (currentCandidateIndex < logoCandidates.length - 1) {
      // Try next candidate
      setCurrentCandidateIndex(prev => prev + 1);
      setLogoLoaded(false);
    }
    // If no more candidates, fall back to text (hasLogoCandidates will be false)
  };
  
  const handleLogoLoad = () => {
    setLogoLoaded(true);
  };
  

  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
      {hasLogoCandidates ? (
        <>
          {/* Logo Image */}
          <img
            src={currentLogoURL}
            alt={`${fullTeamName} logo`}
            className={`w-full h-full max-w-full max-h-full object-contain transition-opacity ${
              logoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.3)) drop-shadow(0 0 2px rgba(255,255,255,0.4))',
            }}
            onLoad={handleLogoLoad}
            onError={handleLogoError}
            title={fullTeamName}
          />
          
          {/* Fallback text while loading */}
          {!logoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ResponsiveText
                text={fullTeamName}
                className="text-[10px] xs:text-xs md:text-sm font-bold text-secondary-foreground dark:text-white"
              />
            </div>
          )}
        </>
      ) : (
        /* Text fallback when no logo candidates work */
        <ResponsiveText
          text={fullTeamName}
          className="text-[10px] xs:text-xs md:text-sm font-bold text-secondary-foreground dark:text-white"
        />
      )}
    </div>
  );
}