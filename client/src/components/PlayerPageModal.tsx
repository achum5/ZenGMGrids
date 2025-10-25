import { useEffect, useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { getPlayerImage } from '@/lib/faceRenderer';
import { getPlayerJerseyInfo } from '@/lib/jersey-utils';
import type { Player, Team } from '@/types/bbgm';

interface PlayerPageModalProps {
  player: Player | null;
  sport: 'basketball' | 'football' | 'hockey' | 'baseball';
  teams?: Team[];
  season?: number;
  onClose: () => void;
  onTeamClick?: (tid: number, season: number) => void;
  onSeasonClick?: (season: number) => void;
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

export function PlayerPageModal({ player, sport, teams = [], season: initialSeason, onClose, onTeamClick, onSeasonClick }: PlayerPageModalProps) {
  const [imageKind, setImageKind] = useState<"url" | "svg" | "none">("none");
  const [imageData, setImageData] = useState("");

  // Internal state for the selected season in the player modal (independent from game state)
  const [modalSeason, setModalSeason] = useState<number | undefined>(initialSeason);

  // Update modal season when player changes
  useEffect(() => {
    setModalSeason(initialSeason);
  }, [player?.pid, initialSeason]);

  // Use modalSeason for all internal rendering
  const season = modalSeason;

  // Helper function to get season-aligned team name
  const getTeamNameForSeason = (team: Team | undefined, seasonYear: number): { region: string; name: string; abbrev: string } => {
    if (!team) return { region: '', name: '', abbrev: '' };

    // Check if team has season-specific data
    if (team.seasons && team.seasons.length > 0) {
      const seasonData = team.seasons.find(s => s.season === seasonYear);
      if (seasonData) {
        const region = seasonData.region || team.region || '';
        const name = seasonData.name || team.name;
        const abbrev = seasonData.abbrev || team.abbrev;
        return { region, name, abbrev };
      }
    }

    // Fallback to current team data
    return {
      region: team.region || '',
      name: team.name,
      abbrev: team.abbrev
    };
  };

  // Get team colors for the player's current team
  const { primaryColor, secondaryColor, textColor } = useMemo(() => {
    if (!player || !season || teams.length === 0) {
      return {
        primaryColor: '#1f2937',
        secondaryColor: '#ffffff',
        textColor: 'white' as const
      };
    }

    // Check if this is a draft prospect year (first year in ratings)
    const firstRatingYear = player.ratings && player.ratings.length > 0
      ? Math.min(...player.ratings.map(r => r.season))
      : null;
    const isDraftProspect = firstRatingYear !== null && season === firstRatingYear;

    const seasonStats = player.stats?.find(s => s.season === season && !s.playoffs);
    const team = seasonStats ? teams.find(t => t.tid === seasonStats.tid) : null;

    if (team) {
      const seasonInfo = team.seasons?.find(s => s.season === season);
      const colors = seasonInfo?.colors || team.colors || ['#1f2937', '#ffffff'];
      const primary = colors[0] || '#1f2937';
      const secondary = colors[1] || '#ffffff';

      return {
        primaryColor: primary,
        secondaryColor: secondary,
        textColor: getContrastColor(primary)
      };
    }

    // If no team for this season, check if player is retired
    const isRetired = player.tid === -2 || player.tid === -3 || (player.retiredYear && player.retiredYear > 0);

    // For draft prospects who are active, use their current team colors
    if (isDraftProspect && player.tid >= 0) {
      const currentTeam = teams.find(t => t.tid === player.tid);
      if (currentTeam) {
        const colors = currentTeam.colors || ['#1f2937', '#ffffff'];
        const primary = colors[0] || '#1f2937';
        const secondary = colors[1] || '#ffffff';

        return {
          primaryColor: primary,
          secondaryColor: secondary,
          textColor: getContrastColor(primary)
        };
      }
    }

    if (isRetired && player.stats && player.stats.length > 0) {
      // For retired players, use the team they spent the most seasons with
      const teamSeasonCounts = new Map<number, number>();

      for (const stat of player.stats) {
        if (!stat.playoffs && stat.gp && stat.gp > 0) {
          const count = teamSeasonCounts.get(stat.tid) || 0;
          teamSeasonCounts.set(stat.tid, count + 1);
        }
      }

      // Find team with most seasons
      let mostSeasonsTeamId = -1;
      let maxSeasons = 0;

      for (const [teamId, seasonCount] of teamSeasonCounts.entries()) {
        if (seasonCount > maxSeasons) {
          maxSeasons = seasonCount;
          mostSeasonsTeamId = teamId;
        }
      }

      if (mostSeasonsTeamId >= 0) {
        const mostSeasonsTeam = teams.find(t => t.tid === mostSeasonsTeamId);
        if (mostSeasonsTeam) {
          // Get the latest season they played for this team
          let latestSeasonWithTeam = -1;
          for (const stat of player.stats) {
            if (!stat.playoffs && stat.gp && stat.gp > 0 && stat.tid === mostSeasonsTeamId && stat.season > latestSeasonWithTeam) {
              latestSeasonWithTeam = stat.season;
            }
          }

          // Use season-aligned team data from their latest season with the team
          const teamInfo = getTeamNameForSeason(mostSeasonsTeam, latestSeasonWithTeam);
          const teamSeasonInfo = mostSeasonsTeam.seasons?.find(s => s.season === latestSeasonWithTeam);
          const colors = teamSeasonInfo?.colors || mostSeasonsTeam.colors || ['#1f2937', '#ffffff'];
          const primary = colors[0] || '#1f2937';
          const secondary = colors[1] || '#ffffff';

          return {
            primaryColor: primary,
            secondaryColor: secondary,
            textColor: getContrastColor(primary)
          };
        }
      }
    }

    // Free agent colors (gray, white, black)
    return {
      primaryColor: '#4b5563', // gray-600
      secondaryColor: '#ffffff',
      textColor: 'white' as const
    };
  }, [player, season, teams]);

  useEffect(() => {
    if (!player) return;

    let ok = true;
    (async () => {
      // Get jersey info if player and teams are provided
      let jerseyInfo = undefined;
      if (player && teams.length > 0) {
        jerseyInfo = getPlayerJerseyInfo(player, teams, sport, season);
      }

      const res = await getPlayerImage({
        pid: player.pid,
        name: player.name,
        imgURL: player.imgURL,
        face: player.face,
        jerseyInfo
      });

      if (ok) {
        setImageKind(res.type);
        setImageData(res.data);
      }
    })();
    return () => { ok = false; };
  }, [player, teams, season, sport]);

  if (!player) return null;

  const statTextColor = textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)';

  return (
      <div
        id="player-page-modal-overlay-unique"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 80000,
          backdropFilter: 'blur(10px) brightness(0.8)',
          WebkitBackdropFilter: 'blur(10px) brightness(0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          pointerEvents: 'auto'
        }}
        onClick={onClose}
      >
      {/* Player Info Card */}
      <div
        className="relative w-full max-w-6xl max-h-[75vh] sm:max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          background: `linear-gradient(180deg, ${primaryColor} 0%, ${primaryColor} 100%)`,
          border: `2px solid ${secondaryColor}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 rounded-full p-2 transition-all hover:scale-110 hover:rotate-90"
          style={{
            backgroundColor: `${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
            color: textColor === 'white' ? '#ffffff' : '#000000',
          }}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="relative z-10 p-6 border-b" style={{ borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}` }}>
          <div className="flex items-center gap-1 sm:gap-3">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>
              {player.name}
            </h2>
            {player.ratings && player.ratings.length > 0 && (() => {
              // Get all unique seasons from ratings
              const uniqueSeasons = player.ratings
                ? Array.from(new Set(player.ratings.map(r => r.season))).sort((a, b) => b - a)
                : [];

              // Get current league year (max season from teams or player data)
              let currentYear = 0;
              if (teams && teams.length > 0) {
                currentYear = Math.max(
                  ...teams.map(t =>
                    t.seasons && t.seasons.length > 0
                      ? Math.max(...t.seasons.map(s => s.season))
                      : 0
                  )
                );
              }

              if (currentYear === 0) {
                const latestRating = uniqueSeasons.length > 0 ? uniqueSeasons[0] : 0;
                const latestStat = player.stats && player.stats.length > 0
                  ? Math.max(...player.stats.map(s => s.season))
                  : 0;
                currentYear = Math.max(latestRating, latestStat);
              }

              const hasCurrentYearRatings = uniqueSeasons.includes(currentYear);

              let statusLabel = '';
              if (!hasCurrentYearRatings && currentYear > 0) {
                if (player.tid === -2 || (player.retiredYear && player.retiredYear <= currentYear)) {
                  statusLabel = 'Retired';
                } else if (player.tid === -1) {
                  statusLabel = 'Free Agent';
                } else {
                  statusLabel = 'Current';
                }
              }

              // Calculate selected text for width
              let selectedText = '';
              if (season) {
                if (!hasCurrentYearRatings && season === currentYear && statusLabel) {
                  selectedText = `${season} (${statusLabel})`;
                } else {
                  selectedText = `${season}`;
                }
              }

              return (
                <>
                  <span className="text-2xl font-bold" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>|</span>
                  {/* Hidden span to measure text width */}
                  <span
                    className="text-lg font-semibold invisible absolute pointer-events-none whitespace-nowrap"
                    style={{ font: 'inherit' }}
                    ref={(el) => {
                      if (el) {
                        const selectEl = el.nextElementSibling as HTMLSelectElement;
                        if (selectEl) {
                          selectEl.style.width = `${el.offsetWidth + 60}px`;
                        }
                      }
                    }}
                  >
                    {selectedText}
                  </span>
                  <select
                    value={season || ''}
                    onChange={(e) => {
                      const selectedSeason = parseInt(e.target.value);
                      if (!isNaN(selectedSeason)) {
                        setModalSeason(selectedSeason);
                      }
                    }}
                    className="text-lg font-semibold rounded px-2 py-1 cursor-pointer [&>option]:text-black [&>option]:bg-white"
                    style={{
                      backgroundColor: textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: textColor === 'white' ? '#ffffff' : '#000000',
                      border: `1px solid ${textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}`,
                    }}

                  >
                  {(() => {
                    const options = [];

                    // Add current year option if player doesn't have ratings for it
                    if (!hasCurrentYearRatings && currentYear > 0 && statusLabel) {
                      options.push(
                        <option key={`current-${currentYear}`} value={currentYear}>
                          {currentYear} ({statusLabel})
                        </option>
                      );
                    }

                    // Add all other seasons
                    options.push(...uniqueSeasons.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    )));

                    return options;
                  })()}
                </select>
                </>
              );
            })()}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:px-8 sm:pb-8 sm:pt-4" style={{ color: statTextColor }}>

        {/* Player Header Section */}
        <div className="flex flex-col sm:flex-row items-start gap-6 pt-0 sm:pt-0">
          {/* Left Side: Image + Details */}
          <div className="flex items-start gap-3 sm:gap-6 w-full sm:flex-1 sm:min-w-0">
            {/* Player Image */}
            <div className="flex-shrink-0 sm:mt-3">
              <div className="w-24 h-24 sm:w-40 sm:h-40">
                {imageKind === "url" && (
                  <img
                    src={imageData}
                    alt={player.name}
                    className="block w-full h-full object-contain"
                    draggable={false}
                  />
                )}

                {imageKind === "svg" && (
                  <div className="w-full h-full flex items-center justify-center overflow-visible">
                    <div
                      className="w-full h-full flex items-center justify-center [&>svg]:w-[130%] [&>svg]:h-[130%] translate-x-[-15%] translate-y-[-12%] sm:translate-x-[-25%] sm:translate-y-[-15%]"
                      dangerouslySetInnerHTML={{ __html: imageData }}
                    />
                  </div>
                )}

                {imageKind === "none" && (
                  <div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
            </div>

            {/* Player Details */}
            <div className="flex-1 min-w-0 space-y-2 overflow-hidden">
            <div className="space-y-1 w-full" style={{ fontSize: 'clamp(8px, 2.8vw, 14px)', color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
              {/* Position, Team/Status, and Jersey Number */}
              {season && (() => {
                const seasonRating = player.ratings?.find(r => r.season === season);
                const seasonStats = player.stats?.find(s => s.season === season && !s.playoffs);
                const position = seasonRating?.pos || player.pos;
                const team = seasonStats ? teams.find(t => t.tid === seasonStats.tid) : null;
                const jerseyNumber = seasonStats?.jerseyNumber || player.jerseyNumber;

                // Check if this is a draft prospect year
                const firstRatingYear = player.ratings && player.ratings.length > 0
                  ? Math.min(...player.ratings.map(r => r.season))
                  : null;
                const isDraftProspect = firstRatingYear !== null && season === firstRatingYear;

                // Determine player status if no team
                let status = '';
                if (isDraftProspect) {
                  status = 'Draft Prospect';
                } else if (!team) {
                  // Get current league year
                  let currentYear = 0;
                  if (teams && teams.length > 0) {
                    currentYear = Math.max(
                      ...teams.map(t =>
                        t.seasons && t.seasons.length > 0
                          ? Math.max(...t.seasons.map(s => s.season))
                          : 0
                      )
                    );
                  }

                  // Only show status for current year or later
                  if (season >= currentYear) {
                    if (player.tid === -2 || (player.retiredYear && player.retiredYear <= season)) {
                      status = 'Retired';
                    } else if (player.tid === -1) {
                      status = 'Free Agent';
                    } else if (player.tid === -3) {
                      status = 'Deceased';
                    }
                  }
                }

                if (!position && !team && !jerseyNumber && !status) return null;

                // Get season-aligned team name
                const teamInfo = team ? getTeamNameForSeason(team, season) : null;

                return (
                  <div className="flex items-center flex-wrap">
                    <span className="font-semibold" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>
                      {position}
                      {position && (team || status || jerseyNumber) && ', '}
                    </span>
                    {team && teamInfo && (
                      <button
                        type="button"
                        className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-transparent border-0 p-0 font-inherit"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (onTeamClick && season) {
                            onTeamClick(team.tid, season);
                          }
                        }}
                      >
                         {teamInfo.region} {teamInfo.name}
                      </button>
                    )}
                    {!team && status && (
                      <span className="whitespace-nowrap">{status}</span>
                    )}
                    {jerseyNumber && (
                      <>
                        <span className="whitespace-nowrap">
                          {(position || team || status) && ', '}#{jerseyNumber}
                        </span>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Height and Weight */}
              {(player.hgt || player.weight) && (
                <div className="whitespace-nowrap">
                  {player.hgt && (
                    <span>{Math.floor(player.hgt / 12)}'{player.hgt % 12}"</span>
                  )}
                  {player.hgt && player.weight && <span> • </span>}
                  {player.weight && <span>{player.weight} lbs</span>}
                </div>
              )}

              {/* Born */}
              {player.born && (
                <div className="whitespace-nowrap">
                  <span className="font-semibold" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Born:</span> {player.born.year || 'Unknown'}
                  {player.born.loc && <span> - {player.born.loc}</span>}
                </div>
              )}

              {/* Age (as of latest season) or Death information */}
              {(() => {
                const isDeceased = player.tid === -3 || player.diedYear || player.died;
                const deathYear = player.diedYear || player.died?.year;

                if (isDeceased && deathYear && player.born?.year) {
                  const ageAtDeath = deathYear - player.born.year;
                  return (
                    <div className="whitespace-nowrap">
                      <span className="font-semibold" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Died:</span> {deathYear} ({ageAtDeath} years old)
                    </div>
                  );
                } else if (player.born?.year && season) {
                  return (
                    <div className="whitespace-nowrap">
                      <span className="font-semibold" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Age:</span> {season - player.born.year}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Draft */}
              {(() => {
                if (!player.draft || player.draft.tid == null || player.draft.tid < 0) {
                  return (
                    <div className="whitespace-nowrap">
                      <span className="font-semibold" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Draft:</span> Undrafted
                    </div>
                  );
                }

                const draftTeam = teams?.find(t => t.tid === player.draft?.tid);
                const draftTeamInfo = draftTeam && player.draft.year
                  ? getTeamNameForSeason(draftTeam, player.draft.year)
                  : null;

                return (
                  <div className="whitespace-nowrap">
                    <span className="font-semibold" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Draft:</span>{' '}
                    {player.draft.year && <span>{player.draft.year}</span>}
                    {(player.draft.round || player.draft.pick) && (
                      <>
                        {player.draft.year && <span> - </span>}
                        {player.draft.round && <span>Round {player.draft.round}</span>}
                        {player.draft.pick && <span> (Pick {player.draft.pick})</span>}
                      </>
                    )}
                    {draftTeamInfo && <span> by {draftTeamInfo.abbrev}</span>}
                  </div>
                );
              })()}

              {/* Relatives */}
              {player.relatives && player.relatives.length > 0 && (
                <div>
                  {player.relatives.map((relative, idx) => (
                    <div key={idx}>
                      <span className="font-semibold capitalize" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>{relative.type}:</span>{' '}
                      {relative.name}
                    </div>
                  ))}
                </div>
              )}

              {/* College */}
              <div>
                <span className="font-semibold" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>College:</span>{' '}
                {player.college || 'None'}
              </div>

              {/* Experience (years in league) */}
              {player.stats && player.stats.length > 0 && (
                <div>
                  <span className="font-semibold" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Experience:</span>{' '}
                  {(() => {
                    // Get unique seasons played up to selected season
                    const seasonsPlayed = new Set(
                      player.stats
                        .filter(s => !s.playoffs && s.gp && s.gp > 0 && (!season || s.season <= season))
                        .map(s => s.season)
                    );
                    const years = seasonsPlayed.size;
                    return `${years} ${years === 1 ? 'year' : 'years'}`;
                  })()}
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Right Side: Ratings */}
          {season && player.ratings && (() => {
            const seasonRating = player.ratings.find(r => r.season === season);
            const prevSeasonRating = player.ratings.find(r => r.season === season - 1);

            if (!seasonRating) return null;

            const getRatingChange = (current?: number, previous?: number) => {
              if (current == null || previous == null) return null;
              const diff = current - previous;
              if (diff === 0) return null;
              const sign = diff > 0 ? '+' : '';
              const colorClass = diff > 0 ? 'text-green-600' : 'text-red-600';
              return { text: `(${sign}${diff})`, colorClass };
            };

            // Label abbreviations - BBGM style
            const getAbbreviatedLabel = (label: string): string => {
              const abbreviations: Record<string, string> = {
                // Basketball
                'Height': 'Hgt',
                'Strength': 'Str',
                'Speed': 'Spd',
                'Jumping': 'Jmp',
                'Endurance': 'End',
                'Inside': 'Ins',
                'Dunks/Layups': 'Dnk',
                'Free Throws': 'Ft',
                'Mid Range': '2Pt',
                'Three Pointers': '3Pt',
                'Offensive IQ': 'oIQ',
                'Defensive IQ': 'dIQ',
                'Dribbling': 'Drb',
                'Passing': 'Pss',
                'Rebounding': 'Reb',
                // Football
                'Run Blocking': 'Run Blk',
                'Pass Blocking': 'Pass Blk',
                'Pass Coverage': 'Pass Cov',
                'Route Running': 'Route Run',
                'Ball Security': 'Ball Sec',
                'Kick Power': 'K Pwr',
                'Kick Accuracy': 'K Acc',
                'Punt Power': 'P Pwr',
                'Punt Accuracy': 'P Acc',
                'Pass Rushing': 'Pass Rush',
                'Run Stopping': 'Run Stop',
              };
              return abbreviations[label] || label;
            };

            // Stat row component with 3-cell grid: [label] [value] [Δ]
            const StatRow = ({ label, value, delta }: { label: string; value?: number; delta: ReturnType<typeof getRatingChange> }) => (
              <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto] gap-1 items-center h-[18px] sm:h-[22px] leading-[1.2]">
                <span className="text-[clamp(10px,2.8vw,12px)] sm:text-[13px] whitespace-nowrap">
                  {getAbbreviatedLabel(label)}:
                </span>
                <span className="text-[clamp(10px,2.8vw,12px)] sm:text-[13px] text-right min-w-[24px] sm:min-w-[36px]">{value ?? 'N/A'}</span>
                <span className={`text-[85%] ml-1 whitespace-nowrap min-w-[32px] sm:min-w-[40px] ${delta ? delta.colorClass : ''}`}>
                  {delta ? delta.text : ''}
                </span>
              </div>
            );

            return (
              <div className="p-[4px] mx-auto sm:ml-0 sm:mr-24 sm:p-2 sm:mt-[-14px] sm:mb-[-44px] font-['system-ui'] tabular-nums w-full sm:w-auto sm:max-w-[400px]">
                {/* Header Row: Overall and Potential */}
                <div className="flex justify-between mb-1.5 sm:mb-3 gap-3 sm:gap-3">
                  <div className="font-semibold text-[clamp(16px,3.6vw,18px)]">
                    <span className="sm:hidden">Ovr: </span>
                    <span className="hidden sm:inline">Overall: </span>
                    <span className="inline-block w-10 text-right text-[clamp(18px,4vw,22px)]">{seasonRating.ovr ?? 'N/A'}</span>
                    {(() => {
                      const delta = getRatingChange(seasonRating.ovr, prevSeasonRating?.ovr);
                      return delta ? (
                        <span className={`ml-1 text-[85%] align-[2px] ${delta.colorClass}`}>
                          {delta.text}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="font-semibold text-[clamp(16px,3.6vw,18px)]">
                    <span className="sm:hidden">Pot: </span>
                    <span className="hidden sm:inline">Potential: </span>
                    <span className="inline-block w-10 text-right text-[clamp(18px,4vw,22px)]">{seasonRating.pot ?? 'N/A'}</span>
                    {(() => {
                      const delta = getRatingChange(seasonRating.pot, prevSeasonRating?.pot);
                      return delta ? (
                        <span className={`ml-1 text-[85%] align-[2px] ${delta.colorClass}`}>
                          {delta.text}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* Basketball: Three Column Ratings - Physical left, Shooting center, Skill right */}
                {sport === 'basketball' && (
                <div className="flex justify-between gap-0 sm:gap-1">
                  {/* Physical */}
                  <div className="flex-shrink-0">
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2">Physical</div>
                    <div className="space-y-[2px] sm:space-y-[6px]">
                      {seasonRating.hgt != null && (
                        <StatRow
                          label="Height"
                          value={seasonRating.hgt}
                          delta={getRatingChange(seasonRating.hgt, prevSeasonRating?.hgt)}
                        />
                      )}
                      {seasonRating.stre != null && (
                        <StatRow
                          label="Strength"
                          value={seasonRating.stre}
                          delta={getRatingChange(seasonRating.stre, prevSeasonRating?.stre)}
                        />
                      )}
                      {seasonRating.spd != null && (
                        <StatRow
                          label="Speed"
                          value={seasonRating.spd}
                          delta={getRatingChange(seasonRating.spd, prevSeasonRating?.spd)}
                        />
                      )}
                      {seasonRating.jmp != null && (
                        <StatRow
                          label="Jumping"
                          value={seasonRating.jmp}
                          delta={getRatingChange(seasonRating.jmp, prevSeasonRating?.jmp)}
                        />
                      )}
                      {seasonRating.endu != null && (
                        <StatRow
                          label="Endurance"
                          value={seasonRating.endu}
                          delta={getRatingChange(seasonRating.endu, prevSeasonRating?.endu)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Shooting */}
                  <div className="flex-shrink-0">
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2">Shooting</div>
                    <div className="space-y-[2px] sm:space-y-[6px]">
                      {seasonRating.ins != null && (
                        <StatRow
                          label="Inside"
                          value={seasonRating.ins}
                          delta={getRatingChange(seasonRating.ins, prevSeasonRating?.ins)}
                        />
                      )}
                      {seasonRating.dnk != null && (
                        <StatRow
                          label="Dunks/Layups"
                          value={seasonRating.dnk}
                          delta={getRatingChange(seasonRating.dnk, prevSeasonRating?.dnk)}
                        />
                      )}
                      {seasonRating.ft != null && (
                        <StatRow
                          label="Free Throws"
                          value={seasonRating.ft}
                          delta={getRatingChange(seasonRating.ft, prevSeasonRating?.ft)}
                        />
                      )}
                      {seasonRating.fg != null && (
                        <StatRow
                          label="Mid Range"
                          value={seasonRating.fg}
                          delta={getRatingChange(seasonRating.fg, prevSeasonRating?.fg)}
                        />
                      )}
                      {seasonRating.tp != null && (
                        <StatRow
                          label="Three Pointers"
                          value={seasonRating.tp}
                          delta={getRatingChange(seasonRating.tp, prevSeasonRating?.tp)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Skill */}
                  <div className="flex-shrink-0">
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2">Skill</div>
                    <div className="space-y-[2px] sm:space-y-[6px]">
                      {seasonRating.oiq != null && (
                        <StatRow
                          label="Offensive IQ"
                          value={seasonRating.oiq}
                          delta={getRatingChange(seasonRating.oiq, prevSeasonRating?.oiq)}
                        />
                      )}
                      {seasonRating.diq != null && (
                        <StatRow
                          label="Defensive IQ"
                          value={seasonRating.diq}
                          delta={getRatingChange(seasonRating.diq, prevSeasonRating?.diq)}
                        />
                      )}
                      {seasonRating.drb != null && (
                        <StatRow
                          label="Dribbling"
                          value={seasonRating.drb}
                          delta={getRatingChange(seasonRating.drb, prevSeasonRating?.drb)}
                        />
                      )}
                      {seasonRating.pss != null && (
                        <StatRow
                          label="Passing"
                          value={seasonRating.pss}
                          delta={getRatingChange(seasonRating.pss, prevSeasonRating?.pss)}
                        />
                      )}
                      {seasonRating.reb != null && (
                        <StatRow
                          label="Rebounding"
                          value={seasonRating.reb}
                          delta={getRatingChange(seasonRating.reb, prevSeasonRating?.reb)}
                        />
                      )}
                    </div>
                  </div>
                </div>
                )}

                {/* Football: Three Column Ratings - Physical/Blocking, Passing/Defense, Rush-Rec/Kicking */}
                {sport === 'football' && (
                <div className="flex justify-between gap-0 sm:gap-6">
                  {/* Column 1: Physical & Blocking */}
                  <div className="flex-1">
                    {/* Physical Section */}
                    <div className="mb-3 sm:mb-4">
                      <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Physical</div>
                      <div className="space-y-[2px] sm:space-y-[6px] mt-2">
                        {seasonRating.hgt != null && <StatRow label="Height" value={seasonRating.hgt} delta={getRatingChange(seasonRating.hgt, prevSeasonRating?.hgt)} />}
                        {seasonRating.stre != null && <StatRow label="Strength" value={seasonRating.stre} delta={getRatingChange(seasonRating.stre, prevSeasonRating?.stre)} />}
                        {seasonRating.spd != null && <StatRow label="Speed" value={seasonRating.spd} delta={getRatingChange(seasonRating.spd, prevSeasonRating?.spd)} />}
                        {seasonRating.endu != null && <StatRow label="Endurance" value={seasonRating.endu} delta={getRatingChange(seasonRating.endu, prevSeasonRating?.endu)} />}
                      </div>
                    </div>

                    {/* Blocking Section */}
                    <div>
                      <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Blocking</div>
                      <div className="space-y-[2px] sm:space-y-[6px] mt-2">
                        {seasonRating.rbk != null && <StatRow label="Run Blocking" value={seasonRating.rbk} delta={getRatingChange(seasonRating.rbk, prevSeasonRating?.rbk)} />}
                        {seasonRating.pbk != null && <StatRow label="Pass Blocking" value={seasonRating.pbk} delta={getRatingChange(seasonRating.pbk, prevSeasonRating?.pbk)} />}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Passing & Defense */}
                  <div className="flex-1">
                    {/* Passing Section */}
                    <div className="mb-3 sm:mb-4">
                      <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Passing</div>
                      <div className="space-y-[2px] sm:space-y-[6px] mt-2">
                        {seasonRating.thv != null && <StatRow label="Vision" value={seasonRating.thv} delta={getRatingChange(seasonRating.thv, prevSeasonRating?.thv)} />}
                        {seasonRating.thp != null && <StatRow label="Power" value={seasonRating.thp} delta={getRatingChange(seasonRating.thp, prevSeasonRating?.thp)} />}
                        {seasonRating.tha != null && <StatRow label="Accuracy" value={seasonRating.tha} delta={getRatingChange(seasonRating.tha, prevSeasonRating?.tha)} />}
                      </div>
                    </div>

                    {/* Defense Section */}
                    <div>
                      <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Defense</div>
                      <div className="space-y-[2px] sm:space-y-[6px] mt-2">
                        {seasonRating.pcv != null && <StatRow label="Pass Coverage" value={seasonRating.pcv} delta={getRatingChange(seasonRating.pcv, prevSeasonRating?.pcv)} />}
                        {seasonRating.tck != null && <StatRow label="Tackling" value={seasonRating.tck} delta={getRatingChange(seasonRating.tck, prevSeasonRating?.tck)} />}
                        {seasonRating.prs != null && <StatRow label="Pass Rushing" value={seasonRating.prs} delta={getRatingChange(seasonRating.prs, prevSeasonRating?.prs)} />}
                        {seasonRating.rns != null && <StatRow label="Run Stopping" value={seasonRating.rns} delta={getRatingChange(seasonRating.rns, prevSeasonRating?.rns)} />}
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Rush/Rec & Kicking */}
                  <div className="flex-1">
                    {/* Rush/Rec Section */}
                    <div className="mb-3 sm:mb-4">
                      <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Rush & Rec</div>
                      <div className="space-y-[2px] sm:space-y-[6px] mt-2">
                        {seasonRating.elu != null && <StatRow label="Elusiveness" value={seasonRating.elu} delta={getRatingChange(seasonRating.elu, prevSeasonRating?.elu)} />}
                        {seasonRating.rtr != null && <StatRow label="Route Running" value={seasonRating.rtr} delta={getRatingChange(seasonRating.rtr, prevSeasonRating?.rtr)} />}
                        {seasonRating.hnd != null && <StatRow label="Hands" value={seasonRating.hnd} delta={getRatingChange(seasonRating.hnd, prevSeasonRating?.hnd)} />}
                        {seasonRating.bsc != null && <StatRow label="Ball Security" value={seasonRating.bsc} delta={getRatingChange(seasonRating.bsc, prevSeasonRating?.bsc)} />}
                      </div>
                    </div>

                    {/* Kicking Section */}
                    <div>
                      <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Kicking</div>
                      <div className="space-y-[2px] sm:space-y-[6px] mt-2">
                        {seasonRating.kpw != null && <StatRow label="Kick Power" value={seasonRating.kpw} delta={getRatingChange(seasonRating.kpw, prevSeasonRating?.kpw)} />}
                        {seasonRating.kac != null && <StatRow label="Kick Accuracy" value={seasonRating.kac} delta={getRatingChange(seasonRating.kac, prevSeasonRating?.kac)} />}
                        {seasonRating.ppw != null && <StatRow label="Punt Power" value={seasonRating.ppw} delta={getRatingChange(seasonRating.ppw, prevSeasonRating?.ppw)} />}
                        {seasonRating.pac != null && <StatRow label="Punt Accuracy" value={seasonRating.pac} delta={getRatingChange(seasonRating.pac, prevSeasonRating?.pac)} />}
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Hockey: Three Column Ratings - Physical, Offense, Defense */}
                {sport === 'hockey' && (
                <div className="flex justify-between gap-0 sm:gap-6">
                  {/* Physical */}
                  <div className="flex-shrink-0">
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2">Physical</div>
                    <div className="space-y-[2px] sm:space-y-[6px]">
                      {seasonRating.hgt != null && (
                        <StatRow
                          label="Height"
                          value={seasonRating.hgt}
                          delta={getRatingChange(seasonRating.hgt, prevSeasonRating?.hgt)}
                        />
                      )}
                      {seasonRating.stre != null && (
                        <StatRow
                          label="Strength"
                          value={seasonRating.stre}
                          delta={getRatingChange(seasonRating.stre, prevSeasonRating?.stre)}
                        />
                      )}
                      {seasonRating.spd != null && (
                        <StatRow
                          label="Speed"
                          value={seasonRating.spd}
                          delta={getRatingChange(seasonRating.spd, prevSeasonRating?.spd)}
                        />
                      )}
                      {seasonRating.endu != null && (
                        <StatRow
                          label="Endurance"
                          value={seasonRating.endu}
                          delta={getRatingChange(seasonRating.endu, prevSeasonRating?.endu)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Offense */}
                  <div className="flex-shrink-0">
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2">Offense</div>
                    <div className="space-y-[2px] sm:space-y-[6px]">
                      {seasonRating.oiq != null && (
                        <StatRow
                          label="Offensive IQ"
                          value={seasonRating.oiq}
                          delta={getRatingChange(seasonRating.oiq, prevSeasonRating?.oiq)}
                        />
                      )}
                      {seasonRating.pss != null && (
                        <StatRow
                          label="Passing"
                          value={seasonRating.pss}
                          delta={getRatingChange(seasonRating.pss, prevSeasonRating?.pss)}
                        />
                      )}
                      {seasonRating.wst != null && (
                        <StatRow
                          label="Wristshot"
                          value={seasonRating.wst}
                          delta={getRatingChange(seasonRating.wst, prevSeasonRating?.wst)}
                        />
                      )}
                      {seasonRating.sst != null && (
                        <StatRow
                          label="Slapshot"
                          value={seasonRating.sst}
                          delta={getRatingChange(seasonRating.sst, prevSeasonRating?.sst)}
                        />
                      )}
                      {seasonRating.stk != null && (
                        <StatRow
                          label="Stickhandling"
                          value={seasonRating.stk}
                          delta={getRatingChange(seasonRating.stk, prevSeasonRating?.stk)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Defense */}
                  <div className="flex-shrink-0">
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2">Defense</div>
                    <div className="space-y-[2px] sm:space-y-[6px]">
                      {seasonRating.diq != null && (
                        <StatRow
                          label="Defensive IQ"
                          value={seasonRating.diq}
                          delta={getRatingChange(seasonRating.diq, prevSeasonRating?.diq)}
                        />
                      )}
                      {seasonRating.chk != null && (
                        <StatRow
                          label="Checking"
                          value={seasonRating.chk}
                          delta={getRatingChange(seasonRating.chk, prevSeasonRating?.chk)}
                        />
                      )}
                      {seasonRating.blk != null && (
                        <StatRow
                          label="Shot Blocking"
                          value={seasonRating.blk}
                          delta={getRatingChange(seasonRating.blk, prevSeasonRating?.blk)}
                        />
                      )}
                      {seasonRating.fcf != null && (
                        <StatRow
                          label="Faceoffs"
                          value={seasonRating.fcf}
                          delta={getRatingChange(seasonRating.fcf, prevSeasonRating?.fcf)}
                        />
                      )}
                      {seasonRating.glk != null && (
                        <StatRow
                          label="Goalkeeping"
                          value={seasonRating.glk}
                          delta={getRatingChange(seasonRating.glk, prevSeasonRating?.glk)}
                        />
                      )}
                    </div>
                  </div>
                </div>
                )}

                {/* Baseball: Three Column Ratings - Physical, Defense, Pitching */}
                {sport === 'baseball' && (
                <div className="flex justify-between gap-0 sm:gap-6">
                  {/* Physical & Hitting */}
                  <div className="flex-shrink-0">
                    {/* Physical Section */}
                    <div className="mb-3 sm:mb-4">
                      <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2">Physical</div>
                      <div className="space-y-[2px] sm:space-y-[6px]">
                        {seasonRating.hgt != null && (
                          <StatRow
                            label="Height"
                            value={seasonRating.hgt}
                            delta={getRatingChange(seasonRating.hgt, prevSeasonRating?.hgt)}
                          />
                        )}
                        {seasonRating.spd != null && (
                          <StatRow
                            label="Speed"
                            value={seasonRating.spd}
                            delta={getRatingChange(seasonRating.spd, prevSeasonRating?.spd)}
                          />
                        )}
                      </div>
                    </div>

                    {/* Hitting Section */}
                    <div>
                      <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2">Hitting</div>
                      <div className="space-y-[2px] sm:space-y-[6px]">
                        {seasonRating.hpw != null && (
                          <StatRow
                            label="Power"
                            value={seasonRating.hpw}
                            delta={getRatingChange(seasonRating.hpw, prevSeasonRating?.hpw)}
                          />
                        )}
                        {seasonRating.con != null && (
                          <StatRow
                            label="Contact"
                            value={seasonRating.con}
                            delta={getRatingChange(seasonRating.con, prevSeasonRating?.con)}
                          />
                        )}
                        {seasonRating.eye != null && (
                          <StatRow
                            label="Eye"
                            value={seasonRating.eye}
                            delta={getRatingChange(seasonRating.eye, prevSeasonRating?.eye)}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Defense */}
                  <div className="flex-shrink-0">
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2">Defense</div>
                    <div className="space-y-[2px] sm:space-y-[6px]">
                      {seasonRating.gnd != null && (
                        <StatRow
                          label="Ground Balls"
                          value={seasonRating.gnd}
                          delta={getRatingChange(seasonRating.gnd, prevSeasonRating?.gnd)}
                        />
                      )}
                      {seasonRating.fly != null && (
                        <StatRow
                          label="Fly Balls"
                          value={seasonRating.fly}
                          delta={getRatingChange(seasonRating.fly, prevSeasonRating?.fly)}
                        />
                      )}
                      {seasonRating.thr != null && (
                        <StatRow
                          label="Throwing"
                          value={seasonRating.thr}
                          delta={getRatingChange(seasonRating.thr, prevSeasonRating?.thr)}
                        />
                      )}
                      {seasonRating.cat != null && (
                        <StatRow
                          label="Catcher"
                          value={seasonRating.cat}
                          delta={getRatingChange(seasonRating.cat, prevSeasonRating?.cat)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Pitching */}
                  <div className="flex-shrink-0">
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2">Pitching</div>
                    <div className="space-y-[2px] sm:space-y-[6px]">
                      {seasonRating.ppw != null && (
                        <StatRow
                          label="Power"
                          value={seasonRating.ppw}
                          delta={getRatingChange(seasonRating.ppw, prevSeasonRating?.ppw)}
                        />
                      )}
                      {seasonRating.ctl != null && (
                        <StatRow
                          label="Control"
                          value={seasonRating.ctl}
                          delta={getRatingChange(seasonRating.ctl, prevSeasonRating?.ctl)}
                        />
                      )}
                      {seasonRating.mov != null && (
                        <StatRow
                          label="Movement"
                          value={seasonRating.mov}
                          delta={getRatingChange(seasonRating.mov, prevSeasonRating?.mov)}
                        />
                      )}
                      {seasonRating.endu != null && (
                        <StatRow
                          label="Endurance"
                          value={seasonRating.endu}
                          delta={getRatingChange(seasonRating.endu, prevSeasonRating?.endu)}
                        />
                      )}
                    </div>
                  </div>
                </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Career Stats Table */}
        {player.stats && player.stats.length > 0 && sport === 'basketball' && (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Career Stats</h3>
            <div className="overflow-auto">
              <table style={{ width: 'max-content', minWidth: '100%' }}>
                <thead
                  className="sticky top-0 z-20"
                  style={{
                    backgroundColor: primaryColor,
                    borderBottom: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                  }}
                >
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-0 z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>Season</th>
                    <th className="text-left py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-[68px] z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>Team</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Age</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>G</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>GS</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>MP</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>PTS</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>TRB</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>AST</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>FG</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>FGA</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>FG%</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>3P</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>3PA</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>3P%</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>2P</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>2PA</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>2P%</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>eFG%</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>FT</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>FTA</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>FT%</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>ORB</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>DRB</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>TOV</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>STL</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>BLK</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>BA</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>PF</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredStats = player.stats
                    .filter(s => !s.playoffs && s.gp && s.gp > 0 && (!season || s.season <= season)) // Regular season only with games played, up to selected season
                    .sort((a, b) => b.season - a.season); // Descending by year

                  return filteredStats.map((stat, idx) => {
                    const team = teams.find(t => t.tid === stat.tid);
                    const teamInfo = team ? getTeamNameForSeason(team, stat.season) : null;
                    const age = player.born?.year ? stat.season - player.born.year : null;

                    // Check if there's a year gap between this row and the next row
                    const hasYearGap = idx < filteredStats.length - 1 &&
                                      stat.season - filteredStats[idx + 1].season > 1;

                    // Calculate per-game stats
                    const gp = stat.gp || 0;
                    const perGame = (val?: number) => gp > 0 && val != null ? (val / gp).toFixed(1) : '-';
                    const pct = (made?: number, attempted?: number) => {
                      if (attempted != null && attempted > 0 && made != null) {
                        return ((made / attempted) * 100).toFixed(1);
                      }
                      return '-';
                    };

                    // Calculate total rebounds (trb may not exist, so calculate from orb + drb)
                    const totalReb = stat.trb || ((stat.orb || 0) + (stat.drb || 0));

                    // Calculate 2P stats
                    const fg = stat.fg || 0;
                    const fga = stat.fga || 0;
                    const tpm = stat.tpm || stat.tp || 0;
                    const tpa = stat.tpa || 0;
                    const twoPM = fg - tpm;
                    const twoPA = fga - tpa;

                    // Calculate eFG%
                    const efgPct = fga > 0 ? (((fg + 0.5 * tpm) / fga) * 100).toFixed(1) : '-';

                    return (
                      <tr
                        key={`${stat.season}-${stat.tid}-${idx}`}
                        className="border-b hover:bg-white/5 transition-colors"
                        style={{
                          borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          borderBottomWidth: hasYearGap ? '3px' : '1px',
                          borderBottomStyle: hasYearGap ? 'solid' : 'solid',
                        }}
                      >
                        <td className="py-3 px-4 text-sm whitespace-nowrap sticky left-0 z-20" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>
                          <button
                            onClick={() => setModalSeason(stat.season)}
                            className="hover:underline cursor-pointer"
                            style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                          >
                            {stat.season}
                          </button>
                        </td>
                        <td className="py-3 px-2 text-sm whitespace-nowrap sticky left-[68px] z-20" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', backgroundColor: primaryColor }}>
                          {onTeamClick ? (
                            <button
                              onClick={() => onTeamClick(stat.tid, stat.season)}
                              className="hover:underline cursor-pointer"
                              style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                            >
                              {teamInfo?.abbrev || 'UNK'}
                            </button>
                          ) : (
                            <span>{teamInfo?.abbrev || 'UNK'}</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{age ?? '-'}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{gp}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).gs ?? '-'}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(stat.min)}</td>
                        <td className="text-center py-3 px-2 text-sm font-medium" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>{perGame(stat.pts)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(totalReb)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(stat.ast)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(stat.fg)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(stat.fga)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{pct(stat.fg, stat.fga)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(tpm)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(stat.tpa)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{pct(tpm, stat.tpa)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{gp > 0 ? (twoPM / gp).toFixed(1) : '-'}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{gp > 0 ? (twoPA / gp).toFixed(1) : '-'}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{pct(twoPM, twoPA)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{efgPct}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(stat.ft)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(stat.fta)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{pct(stat.ft, stat.fta)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(stat.orb)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(stat.drb)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame((stat as any).tov)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(stat.stl)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(stat.blk)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame((stat as any).ba)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame((stat as any).pf)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Advanced Stats Table */}
        {player.stats && player.stats.length > 0 && sport === 'basketball' && (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Advanced Stats</h3>
            <div className="overflow-auto">
              <table style={{ width: 'max-content', minWidth: '100%' }}>
                <thead
                  className="sticky top-0 z-20"
                  style={{
                    backgroundColor: primaryColor,
                    borderBottom: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                  }}
                >
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-0 z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>Year</th>
                    <th className="text-left py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-[68px] z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>Team</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Age</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>G</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>GS</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>MP</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>PER</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>VORP</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>BPM</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>OBPM</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>DBPM</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>WS</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>OWS</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>DWS</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>WS/48</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>EWA</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>TS%</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>3PA/FGA</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>FT/FGA</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>+/-</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>ORtg</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>DRtg</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredStats = player.stats
                      .filter(s => !s.playoffs && s.gp && s.gp > 0 && (!season || s.season <= season))
                      .sort((a, b) => b.season - a.season);

                    return filteredStats.map((stat, idx) => {
                      const team = teams.find(t => t.tid === stat.tid);
                      const teamInfo = team ? getTeamNameForSeason(team, stat.season) : null;
                      const age = player.born?.year ? stat.season - player.born.year : null;
                      const hasYearGap = idx < filteredStats.length - 1 &&
                                        stat.season - filteredStats[idx + 1].season > 1;

                      const gp = stat.gp || 0;
                      const perGame = (val?: number) => gp > 0 && val != null ? (val / gp).toFixed(1) : '-';
                      const format = (val?: number, decimals = 1) => val != null ? val.toFixed(decimals) : '-';
                      const formatPct = (val?: number) => val != null ? (val * 100).toFixed(1) : '-';

                      // Calculate ratios
                      const fga = stat.fga || 0;
                      const tpa = stat.tpa || 0;
                      const ft = stat.ft || 0;
                      const fta = stat.fta || 0;
                      const pts = stat.pts || 0;
                      const min = stat.min || 0;
                      const tpaPerFga = fga > 0 ? (tpa / fga).toFixed(3) : '-';
                      const ftPerFga = fga > 0 ? (ft / fga).toFixed(3) : '-';

                      // Advanced stat calculations
                      const obpm = stat.obpm ?? 0;
                      const dbpm = stat.dbpm ?? 0;
                      const bpm = stat.bpm ?? (obpm + dbpm);

                      const ows = stat.ows ?? 0;
                      const dws = stat.dws ?? 0;
                      const ws = stat.ws ?? (ows + dws);

                      // WS/48 = (WS * 48 * 60) / minutes
                      const ws48 = min > 0 ? (ws * 48 * 60) / min : null;

                      // TS% = PTS / (2 * (FGA + 0.44 * FTA))
                      const tsDenom = 2 * (fga + 0.44 * fta);
                      const tsPct = tsDenom > 0 ? pts / tsDenom : null;

                      return (
                        <tr
                          key={`${stat.season}-${stat.tid}-${idx}`}
                          className="border-b hover:bg-white/5 transition-colors"
                          style={{
                            borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                            borderBottomWidth: hasYearGap ? '3px' : '1px',
                            borderBottomStyle: hasYearGap ? 'solid' : 'solid',
                          }}
                        >
                          <td className="py-3 px-4 text-sm whitespace-nowrap sticky left-0 z-20" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>
                            <button
                              onClick={() => setModalSeason(stat.season)}
                              className="hover:underline cursor-pointer"
                              style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                            >
                              {stat.season}
                            </button>
                          </td>
                          <td className="py-3 px-2 text-sm whitespace-nowrap sticky left-[68px] z-20" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', backgroundColor: primaryColor }}>
                            {onTeamClick ? (
                              <button
                                onClick={() => onTeamClick(stat.tid, stat.season)}
                                className="hover:underline cursor-pointer"
                                style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                              >
                                {teamInfo?.abbrev || 'UNK'}
                              </button>
                            ) : (
                              <span>{teamInfo?.abbrev || 'UNK'}</span>
                            )}
                          </td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{age ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{gp}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{stat.gs ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{perGame(stat.min)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{format(stat.per)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{format(stat.vorp)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{bpm !== 0 ? format(bpm) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{obpm !== 0 ? format(obpm) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{dbpm !== 0 ? format(dbpm) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{ws !== 0 ? format(ws) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{ows !== 0 ? format(ows) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{dws !== 0 ? format(dws) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{ws48 !== null ? format(ws48, 3) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{format(stat.ewa)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{tsPct !== null ? (tsPct * 100).toFixed(1) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{tpaPerFga}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{ftPerFga}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{stat.pm != null ? format(stat.pm) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{stat.ortg != null ? format(stat.ortg) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{stat.drtg != null ? format(stat.drtg) : '-'}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ratings Table */}
        {player.ratings && player.ratings.length > 0 && sport === 'basketball' && (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Ratings</h3>
            <div className="overflow-auto">
              <table style={{ width: 'max-content', minWidth: '100%' }}>
                <thead
                  className="sticky top-0 z-20"
                  style={{
                    backgroundColor: primaryColor,
                    borderBottom: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                  }}
                >
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-0 z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>Year</th>
                    <th className="text-left py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-[68px] z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>Team</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Age</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Pos</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Ovr</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Pot</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Hgt</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Str</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Spd</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Jmp</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>End</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Ins</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Dnk</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>FT</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>2Pt</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>3Pt</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>oIQ</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>dIQ</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Drb</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Pss</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Reb</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredRatings = player.ratings
                      .filter(r => !season || r.season <= season)
                      .sort((a, b) => b.season - a.season);

                    return filteredRatings.map((rating, idx) => {
                      // Find the team from stats for this season
                      const statForSeason = player.stats?.find(s => s.season === rating.season && !s.playoffs);
                      const team = statForSeason ? teams.find(t => t.tid === statForSeason.tid) : null;
                      const teamInfo = team ? getTeamNameForSeason(team, rating.season) : null;
                      const age = player.born?.year ? rating.season - player.born.year : null;
                      const hasYearGap = idx < filteredRatings.length - 1 &&
                                        rating.season - filteredRatings[idx + 1].season > 1;

                      // Check if this is a draft prospect year (first year in ratings)
                      const firstRatingYear = player.ratings && player.ratings.length > 0
                        ? Math.min(...player.ratings.map(r => r.season))
                        : null;
                      const isDraftProspect = firstRatingYear !== null && rating.season === firstRatingYear;

                      return (
                        <tr
                          key={`${rating.season}-${idx}`}
                          className="border-b hover:bg-white/5 transition-colors"
                          style={{
                            borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                            borderBottomWidth: hasYearGap ? '3px' : '1px',
                            borderBottomStyle: hasYearGap ? 'solid' : 'solid',
                          }}
                        >
                          <td className="py-3 px-4 text-sm whitespace-nowrap sticky left-0 z-20" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>
                            <button
                              onClick={() => setModalSeason(rating.season)}
                              className="hover:underline cursor-pointer"
                              style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                            >
                              {rating.season}
                            </button>
                          </td>
                          <td className="py-3 px-2 text-sm whitespace-nowrap sticky left-[68px] z-20" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', backgroundColor: primaryColor }}>
                            {onTeamClick && statForSeason ? (
                              <button
                                onClick={() => onTeamClick(statForSeason.tid, rating.season)}
                                className="hover:underline cursor-pointer"
                                style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                              >
                                {teamInfo?.abbrev || (isDraftProspect ? 'DP' : 'FA')}
                              </button>
                            ) : (
                              <span>{teamInfo?.abbrev || (isDraftProspect ? 'DP' : 'FA')}</span>
                            )}
                          </td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{age ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.pos || '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.ovr ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.pot ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.hgt ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.stre ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.spd ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.jmp ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.endu ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.ins ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.dnk ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.ft ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.fg ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.tp ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.oiq ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.diq ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.drb ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.pss ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{rating.reb ?? '-'}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Football Stats Table */}
        {player.stats && player.stats.length > 0 && sport === 'football' && (() => {
          // Determine position group from most recent rating
          const latestRating = player.ratings && player.ratings.length > 0
            ? player.ratings.reduce((latest, r) => r.season > latest.season ? r : latest)
            : null;
          const position = latestRating?.pos || '';

          // Helper to get position group
          const getPositionGroup = (pos: string): string => {
            if (pos === 'QB') return 'QB';
            if (['RB', 'WR', 'TE'].includes(pos)) return 'Skill';
            if (['DL', 'LB', 'CB', 'S'].includes(pos)) return 'Defense';
            if (['K', 'P'].includes(pos)) return 'Kicker';
            return 'Other';
          };

          const positionGroup = getPositionGroup(position);
          if (positionGroup === 'Other') return null; // Don't show stats for OL

          return (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Stats</h3>
              <div className="overflow-auto">
                <table style={{ width: 'max-content', minWidth: '100%' }}>
                  <thead
                    className="sticky top-0 z-20"
                    style={{
                      backgroundColor: primaryColor,
                      borderBottom: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                    }}
                  >
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-0 z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>Season</th>
                      <th className="text-left py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-[68px] z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>Team</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Age</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>G</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>GS</th>

                      {positionGroup === 'QB' && (
                        <>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Cmp</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Att</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Pct</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Yds</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>TD</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>INT</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Y/A</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Sk</th>
                        </>
                      )}

                      {positionGroup === 'Skill' && (
                        <>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Rush</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Rush Yds</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Rush TD</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Y/A</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Tgt</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Rec</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Rec Yds</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Rec TD</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Y/R</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Fmb</th>
                        </>
                      )}

                      {positionGroup === 'Defense' && (
                        <>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Tackles</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Solo</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Ast</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>TFL</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Sk</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>INT</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>PD</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>FF</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>FR</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>TD</th>
                        </>
                      )}

                      {positionGroup === 'Kicker' && (
                        <>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>FGM/FGA</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>FG%</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>FG Lng</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>XPM/XPA</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>XP%</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Punts</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Punt Avg</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Punt Lng</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Blk</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredStats = player.stats
                        .filter(s => !s.playoffs && s.gp && s.gp > 0 && (!season || s.season <= season))
                        .sort((a, b) => b.season - a.season);

                      return filteredStats.map((stat, idx) => {
                        const team = teams.find(t => t.tid === stat.tid);
                        const teamInfo = team ? getTeamNameForSeason(team, stat.season) : null;
                        const age = player.born?.year ? stat.season - player.born.year : null;

                        const hasYearGap = idx < filteredStats.length - 1 &&
                                          stat.season - filteredStats[idx + 1].season > 1;

                        const gp = stat.gp || 0;

                        return (
                          <tr
                            key={`${stat.season}-${stat.tid}-${idx}`}
                            className="border-b hover:bg-white/5 transition-colors"
                            style={{
                              borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                              borderBottomWidth: hasYearGap ? '3px' : '1px',
                            }}
                          >
                            <td className="py-3 px-4 text-sm whitespace-nowrap sticky left-0 z-20" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>
                              <button
                                onClick={() => setModalSeason(stat.season)}
                                className="hover:underline cursor-pointer"
                                style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                              >
                                {stat.season}
                              </button>
                            </td>
                            <td className="py-3 px-2 text-sm whitespace-nowrap sticky left-[68px] z-20" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', backgroundColor: primaryColor }}>
                              {onTeamClick ? (
                                <button
                                  onClick={() => onTeamClick(stat.tid, stat.season)}
                                  className="hover:underline cursor-pointer"
                                  style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                                >
                                  {teamInfo?.abbrev || 'UNK'}
                                </button>
                              ) : (
                                <span>{teamInfo?.abbrev || 'UNK'}</span>
                              )}
                            </td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{age ?? '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{gp}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).gs ?? '-'}</td>

                            {positionGroup === 'QB' && (
                              <>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).pssCmp ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).pss ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                  {(stat as any).pss > 0 ? (((stat as any).pssCmp / (stat as any).pss) * 100).toFixed(1) : '-'}
                                </td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).pssYds ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).pssTD ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).pssInt ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                  {(stat as any).pss > 0 ? ((stat as any).pssYds / (stat as any).pss).toFixed(1) : '-'}
                                </td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).sk ?? (stat as any).pssSk ?? (stat as any).qbRSk ?? '-'}</td>
                              </>
                            )}

                            {positionGroup === 'Skill' && (
                              <>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).rus ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).rusYds ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).rusTD ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                  {(stat as any).rus > 0 ? ((stat as any).rusYds / (stat as any).rus).toFixed(1) : '-'}
                                </td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).tgt ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).rec ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).recYds ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).recTD ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                  {(stat as any).rec > 0 ? ((stat as any).recYds / (stat as any).rec).toFixed(1) : '-'}
                                </td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).fmb ?? '-'}</td>
                              </>
                            )}

                            {positionGroup === 'Defense' && (
                              <>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                  {(stat as any).defTck ?? (stat as any).tck ?? (((stat as any).defTckSolo ?? 0) + ((stat as any).defTckAst ?? 0) || '-')}
                                </td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).defTckSolo ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).defTckAst ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).defTckLoss ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                  {(stat as any).defSk ?? (stat as any).sks ?? (stat as any).sk ?? '-'}
                                </td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).defInt ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).defPssDef ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).defFmbFrc ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).defFmbRec ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                  {((stat as any).defIntTD ?? 0) + ((stat as any).defFmbTD ?? 0) || '-'}
                                </td>
                              </>
                            )}

                            {positionGroup === 'Kicker' && (
                              <>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                  {(() => {
                                    const fg = ((stat as any).fg0 ?? 0) + ((stat as any).fg20 ?? 0) + ((stat as any).fg30 ?? 0) + ((stat as any).fg40 ?? 0) + ((stat as any).fg50 ?? 0);
                                    const fga = ((stat as any).fga0 ?? 0) + ((stat as any).fga20 ?? 0) + ((stat as any).fga30 ?? 0) + ((stat as any).fga40 ?? 0) + ((stat as any).fga50 ?? 0);
                                    return fga > 0 ? `${fg}/${fga}` : '-';
                                  })()}
                                </td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                  {(() => {
                                    const fg = ((stat as any).fg0 ?? 0) + ((stat as any).fg20 ?? 0) + ((stat as any).fg30 ?? 0) + ((stat as any).fg40 ?? 0) + ((stat as any).fg50 ?? 0);
                                    const fga = ((stat as any).fga0 ?? 0) + ((stat as any).fga20 ?? 0) + ((stat as any).fga30 ?? 0) + ((stat as any).fga40 ?? 0) + ((stat as any).fga50 ?? 0);
                                    return fga > 0 ? ((fg / fga) * 100).toFixed(1) : '-';
                                  })()}
                                </td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).fgLng ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                  {(stat as any).xpa > 0 ? `${(stat as any).xp ?? 0}/${(stat as any).xpa}` : '-'}
                                </td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                  {(stat as any).xpa > 0 ? (((stat as any).xp / (stat as any).xpa) * 100).toFixed(1) : '-'}
                                </td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).pnt ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                  {(stat as any).pnt > 0 ? ((stat as any).pntYds / (stat as any).pnt).toFixed(1) : '-'}
                                </td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).pntLng ?? '-'}</td>
                                <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).pntBlk ?? '-'}</td>
                              </>
                            )}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Hockey Stats */}
        {sport === 'hockey' && player.stats && player.stats.length > 0 && (() => {
          const filteredStats = player.stats
            .filter(s => !s.playoffs && s.gp && s.gp > 0 && (!season || s.season <= season))
            .sort((a, b) => b.season - a.season);

          if (filteredStats.length === 0) return null;

          // Determine if player is a goalie based on latest rating
          const latestRating = player.ratings?.find(r => (!season || r.season <= season));
          const isGoalie = latestRating?.pos === 'G';

          return (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Stats</h3>
              <div className="overflow-auto">
                <table style={{ width: 'max-content', minWidth: '100%' }}>
                  <thead
                    className="sticky top-0 z-20"
                    style={{
                      backgroundColor: primaryColor,
                      borderBottom: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                    }}
                  >
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-0 z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>Year</th>
                      <th className="text-left py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-[68px] z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>Team</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Age</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>GP</th>
                      {isGoalie ? (
                        <>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Rec</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>GAA</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>SV%</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>SO</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>SA</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>SV</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>TOI</th>
                        </>
                      ) : (
                        <>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>G</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>A</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>PTS</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>+/-</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>PIM</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>S</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>S%</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>TOI</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>HIT</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>BLK</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStats.map((stat, idx) => {
                      const team = teams.find(t => t.tid === stat.tid);
                      const teamInfo = team ? getTeamNameForSeason(team, stat.season) : null;
                      const age = player.born?.year ? stat.season - player.born.year : null;

                      // Check if there's a year gap between this row and the next row
                      const hasYearGap = idx < filteredStats.length - 1 &&
                                        stat.season - filteredStats[idx + 1].season > 1;

                      return (
                        <tr
                          key={`${stat.season}-${stat.tid}-${idx}`}
                          className="border-b hover:bg-white/5 transition-colors"
                          style={{
                            borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                            borderBottomWidth: hasYearGap ? '3px' : '1px',
                            borderBottomStyle: hasYearGap ? 'solid' : 'solid',
                          }}
                        >
                          <td className="py-3 px-4 text-sm whitespace-nowrap sticky left-0 z-20" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>
                            <button
                              onClick={() => setModalSeason(stat.season)}
                              className="hover:underline cursor-pointer"
                              style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                            >
                              {stat.season}
                            </button>
                          </td>
                          <td className="py-3 px-2 text-sm whitespace-nowrap sticky left-[68px] z-20" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', backgroundColor: primaryColor }}>
                            {onTeamClick ? (
                              <button
                                onClick={() => onTeamClick(stat.tid, stat.season)}
                                className="hover:underline cursor-pointer"
                                style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                              >
                                {teamInfo?.abbrev || 'UNK'}
                              </button>
                            ) : (
                              <span>{teamInfo?.abbrev || 'UNK'}</span>
                            )}
                          </td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{age ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{stat.gp ?? '-'}</td>
                          {isGoalie ? (
                            <>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                {(() => {
                                  const w = (stat as any).gW ?? 0;
                                  const l = (stat as any).gL ?? 0;
                                  const otl = (stat as any).gOTL ?? 0;
                                  if (w === 0 && l === 0 && otl === 0) return '-';
                                  return otl > 0 ? `${w}-${l}-${otl}` : `${w}-${l}`;
                                })()}
                              </td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                {(() => {
                                  const ga = (stat as any).ga ?? 0;
                                  const min = (stat as any).gMin ?? 0;
                                  return min > 0 ? ((ga * 60) / min).toFixed(2) : '-';
                                })()}
                              </td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                {(() => {
                                  const sv = (stat as any).sv ?? 0;
                                  const sa = (stat as any).sa ?? 0;
                                  return sa > 0 ? (sv / sa).toFixed(3) : '-';
                                })()}
                              </td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).so ?? '-'}</td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).sa ?? '-'}</td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).sv ?? '-'}</td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{((stat as any).min ?? (stat as any).gMin)?.toFixed(0) ?? '-'}</td>
                            </>
                          ) : (
                            <>
                              <td className="text-center py-3 px-2 text-sm font-medium" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>{((stat as any).g ?? 0).toFixed(0)}</td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{((stat as any).a ?? (stat as any).asts ?? 0).toFixed(0)}</td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{((stat as any).pts ?? 0).toFixed(0)}</td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                {(stat as any).pm != null ? ((stat as any).pm >= 0 ? `+${(stat as any).pm}` : `${(stat as any).pm}`) : '-'}
                              </td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{((stat as any).pim ?? 0).toFixed(0)}</td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{((stat as any).s ?? 0).toFixed(0)}</td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                {(() => {
                                  const g = (stat as any).g ?? 0;
                                  const s = (stat as any).s ?? 0;
                                  return s > 0 ? ((g / s) * 100).toFixed(1) : '-';
                                })()}
                              </td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{((stat as any).min ?? 0).toFixed(0)}</td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{((stat as any).hit ?? 0).toFixed(0)}</td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{((stat as any).blk ?? 0).toFixed(0)}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
        </div>
      </div>
    </div>
  );
}
