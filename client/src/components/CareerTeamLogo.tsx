import { useState, useEffect, useMemo } from 'react';
import type { Team } from '@/types/bbgm';

// BBGM asset base URL for default logos
const BBGM_ASSET_BASE = "https://play.basketball-gm.com";

// Check if a logo path is a BBGM default logo
function isBBGMDefaultLogo(logoURL: string | null | undefined): boolean {
  if (!logoURL) return false;
  return logoURL.startsWith('/img/logos-') || logoURL.startsWith('img/logos-');
}

// Build candidate logo URLs for a team (small logos first)
function buildSmallLogoCandidates(team: Team): string[] {
  const candidates: string[] = [];
  
  // 1. Try small logo first if it's an explicit absolute URL
  if (team.imgURLSmall && !isBBGMDefaultLogo(team.imgURLSmall)) {
    candidates.push(team.imgURLSmall);
  }
  
  // 2. Try primary logo if it's an explicit absolute URL
  if (team.imgURL && !isBBGMDefaultLogo(team.imgURL)) {
    candidates.push(team.imgURL);
  }
  
  // 3. Build BBGM default URLs if we have an abbreviation
  if (team.abbrev) {
    const abbrev = team.abbrev.toUpperCase();
    candidates.push(
      `${BBGM_ASSET_BASE}/img/logos-primary/${abbrev}.svg`,
      `${BBGM_ASSET_BASE}/img/logos-secondary/${abbrev}.svg`
    );
  }
  
  // 4. If explicit BBGM default paths are provided, try converting them to absolute
  if (team.imgURLSmall && isBBGMDefaultLogo(team.imgURLSmall)) {
    const cleanPath = team.imgURLSmall.startsWith('/') ? team.imgURLSmall.substring(1) : team.imgURLSmall;
    candidates.push(`${BBGM_ASSET_BASE}/${cleanPath}`);
  }
  
  if (team.imgURL && isBBGMDefaultLogo(team.imgURL)) {
    const cleanPath = team.imgURL.startsWith('/') ? team.imgURL.substring(1) : team.imgURL;
    candidates.push(`${BBGM_ASSET_BASE}/${cleanPath}`);
  }
  
  return candidates;
}

interface CareerTeamLogoProps {
  team: Team;
  yearRange: string;
  className?: string;
}

export function CareerTeamLogo({ team, yearRange, className = '' }: CareerTeamLogoProps) {
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);
  const [logoLoaded, setLogoLoaded] = useState(false);
  
  const fullTeamName = team.region ? `${team.region} ${team.name}` : team.name;
  
  // Build list of logo URL candidates to try
  const logoCandidates = useMemo(() => buildSmallLogoCandidates(team), [team.imgURL, team.imgURLSmall, team.abbrev]);
  
  const currentLogoURL = logoCandidates[currentCandidateIndex];
  const hasLogoCandidates = logoCandidates.length > 0 && currentCandidateIndex < logoCandidates.length;
  
  const handleLogoError = () => {
    if (currentCandidateIndex < logoCandidates.length - 1) {
      // Try next candidate
      setCurrentCandidateIndex(prev => prev + 1);
      setLogoLoaded(false);
    }
  };
  
  const handleLogoLoad = () => {
    setLogoLoaded(true);
  };

  // Reset state when team changes
  useEffect(() => {
    setCurrentCandidateIndex(0);
    setLogoLoaded(false);
  }, [team.tid, logoCandidates]);

  return (
    <div className={`flex items-center gap-2 font-medium ${className}`}>
      {hasLogoCandidates ? (
        <>
          <img
            src={currentLogoURL}
            alt={`${fullTeamName} logo`}
            className="w-4 h-4 md:w-5 md:h-5 object-contain flex-shrink-0"
            style={{
              filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.2)) drop-shadow(0 0 1px rgba(255,255,255,0.3))',
            }}
            onLoad={handleLogoLoad}
            onError={handleLogoError}
            title={`${fullTeamName}, ${yearRange}`}
          />
          <span>{yearRange}</span>
        </>
      ) : (
        <span>{fullTeamName} {yearRange}</span>
      )}
    </div>
  );
}

// Helper function to check if all teams in a list have working logos
export function checkAllTeamsHaveLogos(teams: Team[]): boolean {
  for (const team of teams) {
    // With our new system, teams with abbreviations can get BBGM default logos
    if (team.abbrev) {
      return true; // Has abbreviation, can use BBGM defaults
    }
    
    // Check if explicit URLs are provided
    const hasExplicitLogo = (team.imgURL && !isBBGMDefaultLogo(team.imgURL)) || 
                           (team.imgURLSmall && !isBBGMDefaultLogo(team.imgURLSmall));
    if (hasExplicitLogo) {
      return true;
    }
    
    // No logo options available
    return false;
  }
  return true;
}