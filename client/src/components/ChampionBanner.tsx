import { useMemo } from 'react';

interface ChampionBannerProps {
  season: number;
  teamAbbrev: string;
  teamColors?: string[]; // [primary, secondary, tertiary]
  teamLogo?: string;
  className?: string;
  onClick?: () => void;
  inModal?: boolean; // If true, use extra padding for modal display
}

// Helper to check contrast and adjust text color
function getContrastColor(hexColor: string): 'white' | 'black' {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'black' : 'white';
}

// Helper to darken a color by a percentage
function darkenColor(hexColor: string, percent: number): string {
  const hex = hexColor.replace('#', '');
  const r = Math.max(0, parseInt(hex.substring(0, 2), 16) * (1 - percent / 100));
  const g = Math.max(0, parseInt(hex.substring(2, 4), 16) * (1 - percent / 100));
  const b = Math.max(0, parseInt(hex.substring(4, 6), 16) * (1 - percent / 100));
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

export function ChampionBanner({
  season,
  teamAbbrev,
  teamColors = ['#1d4ed8', '#3b82f6'],
  teamLogo,
  className = '',
  onClick,
  inModal = false
}: ChampionBannerProps) {
  // Extract colors with fallbacks
  const [primaryColor, secondaryColor] = useMemo(() => {
    if (!teamColors || teamColors.length === 0) {
      return ['#1d4ed8', '#3b82f6'];
    }
    if (teamColors.length === 1) {
      return [teamColors[0], teamColors[0]];
    }
    return [teamColors[0], teamColors[1]];
  }, [teamColors]);

  // Determine if we need to darken the primary color for better contrast
  const bgColor = useMemo(() => {
    const luminance = getContrastColor(primaryColor);
    // If the primary is very light, darken it by 10%
    if (luminance === 'black') {
      return darkenColor(primaryColor, 10);
    }
    return primaryColor;
  }, [primaryColor]);

  const textColor = useMemo(() => getContrastColor(bgColor), [bgColor]);

  return (
    <div
      className={`relative flex flex-col items-center ${className} ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
      aria-label={`${season} Champions`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Pennant SVG */}
      <svg
        viewBox="0 0 320 460"
        className="w-full h-auto drop-shadow-lg"
        style={{
          filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
        }}
      >
        {/* Pennant shape with pointed bottom */}
        <defs>
          <clipPath id={`pennant-clip-${season}`}>
            <path d="M 10 10 L 310 10 L 310 400 L 160 450 L 10 400 Z" />
          </clipPath>
        </defs>

        {/* Main pennant background */}
        <path
          d="M 10 10 L 310 10 L 310 400 L 160 450 L 10 400 Z"
          fill={bgColor}
          stroke={secondaryColor}
          strokeWidth="3"
        />

        {/* Top stripe (secondary color) */}
        <rect
          x="10"
          y="10"
          width="300"
          height="20"
          fill={secondaryColor}
          opacity="0.3"
        />

        {/* Decorative stitching on sides */}
        <line
          x1="15"
          y1="15"
          x2="15"
          y2="395"
          stroke={secondaryColor}
          strokeWidth="1"
          strokeDasharray="5,5"
          opacity="0.5"
        />
        <line
          x1="305"
          y1="15"
          x2="305"
          y2="395"
          stroke={secondaryColor}
          strokeWidth="1"
          strokeDasharray="5,5"
          opacity="0.5"
        />
      </svg>

      {/* Content overlay - positioned absolutely over the SVG */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-start pt-1 ${inModal ? 'sm:pt-4' : ''}`}
      >
        {/* Team Logo or Monogram - Proportionally Sized */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-0 mt-0.5">
          {teamLogo ? (
            <img
              src={teamLogo}
              alt={`${teamAbbrev} logo`}
              className="w-full h-full object-contain"
            />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-xl sm:text-2xl font-black"
              style={{
                backgroundColor: secondaryColor,
                color: getContrastColor(secondaryColor) === 'white' ? '#ffffff' : '#000000'
              }}
            >
              {teamAbbrev}
            </div>
          )}
        </div>

        {/* Decorative stars */}
        <div className="flex items-center gap-0.5 mb-0 -mt-1" style={{ color: secondaryColor }}>
          <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>

          {/* Season Year */}
          <div className="text-sm sm:text-base font-black tracking-tight">
            {season}
          </div>

          <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>

        {/* CHAMPIONS text */}
        <div
          className="text-[0.5rem] sm:text-xs font-black tracking-wider mt-0"
          style={{
            color: secondaryColor,
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
          }}
        >
          CHAMPIONS
        </div>
      </div>
    </div>
  );
}
