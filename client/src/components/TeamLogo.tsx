import { useState, useMemo } from 'react';
import { ResponsiveText } from '@/components/ResponsiveText';
import type { Team } from '@/types/bbgm';

// Get asset base URL for the given sport
export function getAssetBaseUrl(sport: string = 'basketball'): string {
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

// Check if a logo path is a default relative path that needs translation
function isDefaultRelativePath(logoURL: string | null | undefined): boolean {
  if (!logoURL) return false;
  return logoURL.startsWith('/img/logos-');
}

// Build candidate logo URLs for a team
function buildLogoCandidates(team: Team, sport: string): string[] {
  const candidates: string[] = [];
  const assetBase = getAssetBaseUrl(sport);

  // Case 1: An explicit imgURL is provided in the team data.
  if (team.imgURL) {
    // If it's a default relative path, translate it to the correct absolute URL.
    if (isDefaultRelativePath(team.imgURL)) {
      const cleanPath = team.imgURL.startsWith('/') ? team.imgURL.substring(1) : team.imgURL;
      candidates.push(`${assetBase}/${cleanPath}`);
    } else {
      // Otherwise, it's a full external URL for a custom logo. Use it directly.
      candidates.push(team.imgURL);
    }
    // When an imgURL is present, we stop here to avoid incorrect fallbacks.
    return candidates;
  }

  // Case 2: No imgURL is provided. Fall back to building URLs from the team abbreviation.
  if (team.abbrev) {
    const abbrev = team.abbrev.toUpperCase();
    // This constructs the full URL to the official sport-specific GM servers.
    candidates.push(
      `${assetBase}/img/logos-primary/${abbrev}.svg`,
      `${assetBase}/img/logos-secondary/${abbrev}.svg`
    );
  }
  
  return candidates;
}

interface TeamLogoProps {
  team: Team;
  className?: string;
  sport?: string;
}

export function TeamLogo({ team, className = '', sport = 'basketball' }: TeamLogoProps) {
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);
  const [logoLoaded, setLogoLoaded] = useState(false);
  
  const fullTeamName = team.region ? `${team.region} ${team.name}` : team.name;
  
  // Build list of logo URL candidates to try
  const logoCandidates = useMemo(() => buildLogoCandidates(team, sport), [team.imgURL, team.abbrev, sport]);
  
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
            className={`max-w-[70%] max-h-[70%] object-contain transition-opacity -translate-y-px ${
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