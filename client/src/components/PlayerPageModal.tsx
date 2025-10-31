import React, { useEffect, useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { PlayerFaceShared } from '@/components/PlayerFaceShared';
import type { Player, Team } from '@/types/bbgm';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface PlayerPageModalProps {
  player: Player | null;
  sport: 'basketball' | 'football' | 'hockey' | 'baseball';
  teams?: Team[];
  season?: number;
  teamId?: number;
  onClose?: () => void; // Deprecated: use onCloseTop and onCloseAll instead
  onCloseTop?: () => void; // Close only this modal (X button)
  onCloseAll?: () => void; // Close all modals (backdrop)
  stackIndex?: number; // Position in modal stack for z-index layering
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

export function PlayerPageModal({
  player,
  sport,
  teams = [],
  season: initialSeason,
  teamId,
  onClose,
  onCloseTop,
  onCloseAll,
  stackIndex = 0,
  onTeamClick,
  onSeasonClick
}: PlayerPageModalProps) {
  // Support backward compatibility: if onClose is provided but not onCloseTop/onCloseAll, use onClose for both
  const handleCloseTop = onCloseTop ?? onClose ?? (() => {});
  const handleCloseAll = onCloseAll ?? onClose ?? (() => {});
  // Internal state for the selected season in the player modal (independent from game state)
  const [modalSeason, setModalSeason] = useState<number | undefined>(initialSeason);

  // Update modal season when player changes
  useEffect(() => {
    setModalSeason(initialSeason);
  }, [player?.pid, initialSeason]);

  // Use modalSeason for all internal rendering
  const season = modalSeason;

  // Calculate the team ID for the current season (for jersey lookup)
  const currentSeasonTeamId = useMemo(() => {
    if (!player || !season) return undefined;

    // If teamId was passed from parent, check if player played for that team in this season
    if (teamId !== undefined) {
      const teamStats = player.stats?.find(s => s.season === season && !s.playoffs && s.tid === teamId);
      if (teamStats) return teamId;
    }

    // Otherwise, find any team the player played for in this season
    const seasonStats = player.stats?.find(s => s.season === season && !s.playoffs);
    return seasonStats?.tid;
  }, [player, season, teamId]);

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

    // Use currentSeasonTeamId to get the correct team (handles mid-season trades)
    const team = currentSeasonTeamId !== undefined ? teams.find(t => t.tid === currentSeasonTeamId) : null;

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
  }, [player, season, teams, currentSeasonTeamId]);

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
          zIndex: 100000 + (stackIndex * 10),
          backdropFilter: 'blur(10px) brightness(0.8)',
          WebkitBackdropFilter: 'blur(10px) brightness(0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          pointerEvents: 'auto'
        }}
        onClick={handleCloseAll}
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
          onClick={handleCloseTop}
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
          <div className="flex flex-col w-full sm:flex-1 sm:min-w-0">
            <div className="flex items-start gap-3 sm:gap-6">
            {/* Player Image */}
            <div className="flex-shrink-0 sm:mt-3">
              <div className="w-24 h-24 sm:w-40 sm:h-40 overflow-visible">
                <PlayerFaceShared
                  player={player}
                  teams={teams}
                  sport={sport}
                  season={season}
                  teamId={currentSeasonTeamId}
                  className="[&>img]:block [&>img]:w-full [&>img]:h-full [&>img]:object-contain overflow-visible"
                  svgClassName="scale-[1.4] sm:scale-[1.25] translate-x-[-5%] translate-y-[5%] sm:translate-y-[-15%]"
                />
              </div>
            </div>

            {/* Player Details */}
            <div className="flex-1 min-w-0 space-y-2 overflow-hidden">
            <div className="space-y-1 w-full" style={{ fontSize: 'clamp(8px, 2.8vw, 14px)', color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
              {/* Position, Team/Status, and Jersey Number */}
              {season && (() => {
                const seasonRating = player.ratings?.find(r => r.season === season);
                const position = seasonRating?.pos || player.pos;
                // Use currentSeasonTeamId to get the correct team (handles mid-season trades)
                const team = currentSeasonTeamId !== undefined ? teams.find(t => t.tid === currentSeasonTeamId) : null;
                const seasonStats = player.stats?.find(s => s.season === season && !s.playoffs && s.tid === currentSeasonTeamId);
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
                // Detection helper: check all possible death year fields
                const deathYear = (player as any).diedYear ?? (player as any).deathYear ?? (player as any).died?.year;
                const isDeceased = Number.isFinite(deathYear) && deathYear > 0;
                const ageAtDeath = isDeceased && player.born?.year ? deathYear - player.born.year : undefined;

                if (isDeceased && ageAtDeath !== undefined) {
                  return (
                    <div className="whitespace-nowrap">
                      <span className="font-semibold" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Died:</span> {deathYear} ({Math.max(0, ageAtDeath)} years old)
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

          {/* Player Summary Stats Table */}
          {sport === 'basketball' && season && player.stats && (() => {
            // Use the EXACT same filtering as the Career Stats table below
            // IMPORTANT: Exclude tid=-1 rows to avoid double-counting when a player had multiple teams
            const filteredStats = player.stats.filter(s => !s.playoffs && s.gp && s.gp > 0 && (!season || s.season <= season));

            // For season: Use pre-aggregated row (tid=-1) for correct PER value
            // If no pre-aggregated row, aggregate counting stats but PER will be undefined
            let seasonStats = filteredStats.find(s => s.season === season && s.tid === -1);

            if (!seasonStats) {
              // No pre-aggregated row exists, so check individual team stints
              const seasonStatsArray = filteredStats.filter(s => s.season === season && s.tid !== -1);
              if (seasonStatsArray.length > 0) {
                // If only one team, use that team's stats directly (including PER)
                if (seasonStatsArray.length === 1) {
                  const singleTeamStat = seasonStatsArray[0];
                  const tpm = (singleTeamStat as any).tpm || singleTeamStat.tp || 0;
                  const totalReb = singleTeamStat.trb || ((singleTeamStat as any).orb || 0) + ((singleTeamStat as any).drb || 0);
                  // Calculate WS from ows + dws if ws is not directly available
                  const ows = (singleTeamStat as any).ows ?? 0;
                  const dws = (singleTeamStat as any).dws ?? 0;
                  const ws = singleTeamStat.ws ?? (ows + dws);
                  seasonStats = {
                    ...singleTeamStat,
                    season: singleTeamStat.season,
                    tid: -1,
                    gp: singleTeamStat.gp || 0,
                    min: singleTeamStat.min || 0,
                    pts: singleTeamStat.pts || 0,
                    trb: totalReb,
                    ast: singleTeamStat.ast || 0,
                    fg: singleTeamStat.fg || 0,
                    fga: singleTeamStat.fga || 0,
                    tp: tpm,
                    tpa: singleTeamStat.tpa || 0,
                    ft: singleTeamStat.ft || 0,
                    fta: singleTeamStat.fta || 0,
                    ws: ws,
                  };
                } else {
                  // Multiple teams, aggregate counting stats and calculate minutes-weighted PER
                  const aggregated = seasonStatsArray.reduce((acc, stat) => {
                    const tpm = (stat as any).tpm || stat.tp || 0;
                    const totalReb = stat.trb || ((stat as any).orb || 0) + ((stat as any).drb || 0);
                    // Calculate WS from ows + dws if ws is not directly available
                    const ows = (stat as any).ows ?? 0;
                    const dws = (stat as any).dws ?? 0;
                    const statWs = stat.ws ?? (ows + dws);

                    // Track PER * minutes for weighted average
                    const perValue = (stat as any).per;
                    const statMin = stat.min || 0;
                    const weightedPER = (perValue != null && typeof perValue === 'number' && isFinite(perValue) && statMin > 0)
                      ? perValue * statMin
                      : 0;
                    const validMinutes = (perValue != null && typeof perValue === 'number' && isFinite(perValue) && statMin > 0)
                      ? statMin
                      : 0;

                    const accAny = acc as any;
                    return {
                      season: stat.season,
                      tid: -1, // Aggregated stats
                      gp: (acc.gp || 0) + (stat.gp || 0),
                      min: (acc.min || 0) + (stat.min || 0),
                      pts: (acc.pts || 0) + (stat.pts || 0),
                      trb: (acc.trb || 0) + totalReb,
                      ast: (acc.ast || 0) + (stat.ast || 0),
                      fg: (acc.fg || 0) + (stat.fg || 0),
                      fga: (acc.fga || 0) + (stat.fga || 0),
                      tp: (acc.tp || 0) + tpm,
                      tpa: (acc.tpa || 0) + (stat.tpa || 0),
                      ft: (acc.ft || 0) + (stat.ft || 0),
                      fta: (acc.fta || 0) + (stat.fta || 0),
                      ws: (acc.ws || 0) + statWs,
                      weightedPER: (accAny.weightedPER || 0) + weightedPER,
                      validMinutes: (accAny.validMinutes || 0) + validMinutes,
                    };
                  }, { season, tid: -1, gp: 0, min: 0, pts: 0, trb: 0, ast: 0, fg: 0, fga: 0, tp: 0, tpa: 0, ft: 0, fta: 0, ws: 0, weightedPER: 0, validMinutes: 0 });

                  // Calculate final PER as minutes-weighted average
                  const finalPER = (aggregated as any).validMinutes > 0
                    ? (aggregated as any).weightedPER / (aggregated as any).validMinutes
                    : undefined;

                  seasonStats = {
                    ...aggregated,
                    per: finalPER,
                  };
                  // Remove temporary calculation fields
                  delete (seasonStats as any).weightedPER;
                  delete (seasonStats as any).validMinutes;
                }
              }
            }

            // For career: Use pre-aggregated season totals (tid=-1) if they exist, otherwise use team stints
            const hasPreAggregated = filteredStats.some(s => s.tid === -1);
            const careerStatsArray = hasPreAggregated
              ? filteredStats.filter(s => s.tid === -1)  // Use only pre-aggregated rows
              : filteredStats.filter(s => s.tid !== -1);  // Use only team-specific rows

            const careerStats = careerStatsArray.length > 0 ? careerStatsArray.reduce((acc, stat) => {
              const tpm = (stat as any).tpm || stat.tp || 0;
              const totalReb = stat.trb || ((stat as any).orb || 0) + ((stat as any).drb || 0);
              // Calculate WS from ows + dws if ws is not directly available
              const ows = (stat as any).ows ?? 0;
              const dws = (stat as any).dws ?? 0;
              const statWs = stat.ws ?? (ows + dws);
              return {
                gp: (acc.gp || 0) + (stat.gp || 0),
                min: (acc.min || 0) + (stat.min || 0),
                pts: (acc.pts || 0) + (stat.pts || 0),
                trb: (acc.trb || 0) + totalReb,
                ast: (acc.ast || 0) + (stat.ast || 0),
                fg: (acc.fg || 0) + (stat.fg || 0),
                fga: (acc.fga || 0) + (stat.fga || 0),
                tp: (acc.tp || 0) + tpm,
                tpa: (acc.tpa || 0) + (stat.tpa || 0),
                ft: (acc.ft || 0) + (stat.ft || 0),
                fta: (acc.fta || 0) + (stat.fta || 0),
                ws: (acc.ws || 0) + statWs,
              };
            }, { gp: 0, min: 0, pts: 0, trb: 0, ast: 0, fg: 0, fga: 0, tp: 0, tpa: 0, ft: 0, fta: 0, ws: 0 }) : null;

            // Calculate career PER as minutes-weighted average of season PER values
            // For each season, calculate PER (either from pre-aggregated row or from team rows)
            const seasonMap = new Map<number, typeof filteredStats>();
            filteredStats.forEach(s => {
              const seasonStats = seasonMap.get(s.season) || [];
              seasonStats.push(s);
              seasonMap.set(s.season, seasonStats);
            });

            // Build array of season PER values with their minutes
            const seasonPERData: Array<{ per: number; min: number }> = [];

            seasonMap.forEach((stats, seasonNum) => {
              // First, try to find pre-aggregated row (tid=-1) with valid PER
              const preAggregated = stats.find(s => s.tid === -1);
              const preAggPER = preAggregated ? (preAggregated as any).per : null;
              const preAggMin = preAggregated ? (preAggregated.min || 0) : 0;

              if (preAggPER != null && typeof preAggPER === 'number' && isFinite(preAggPER) && preAggMin > 0) {
                // Use pre-aggregated PER
                seasonPERData.push({ per: preAggPER, min: preAggMin });
              } else {
                // No valid pre-aggregated PER, so calculate from individual team rows
                const teamRows = stats.filter(s => s.tid !== -1);

                if (teamRows.length > 0) {
                  // Calculate minutes-weighted PER for this season
                  let totalWeightedPER = 0;
                  let totalMinutes = 0;

                  teamRows.forEach(teamStat => {
                    const perValue = (teamStat as any).per;
                    const minutes = teamStat.min || 0;

                    if (perValue != null && typeof perValue === 'number' && isFinite(perValue) && minutes > 0) {
                      totalWeightedPER += perValue * minutes;
                      totalMinutes += minutes;
                    }
                  });

                  if (totalMinutes > 0) {
                    const seasonPER = totalWeightedPER / totalMinutes;
                    seasonPERData.push({ per: seasonPER, min: totalMinutes });
                  }
                }
              }
            });

            // Calculate final career PER from all seasons
            let careerPER: number | undefined = undefined;
            if (seasonPERData.length > 0) {
              const totalWeightedPER = seasonPERData.reduce((sum, data) =>
                sum + (data.per * data.min), 0
              );
              const totalMinutes = seasonPERData.reduce((sum, data) =>
                sum + data.min, 0
              );
              if (totalMinutes > 0) {
                careerPER = totalWeightedPER / totalMinutes;
              }
            }

            const formatStat = (val: number | undefined | null) => val != null ? val.toFixed(1) : '—';
            const formatPct = (made: number, attempted: number) => attempted > 0 ? (made / attempted * 100).toFixed(1) : '—';
            const formatTS = (pts: number, fga: number, fta: number) => {
              const denominator = 2 * (fga + 0.44 * fta);
              return denominator > 0 ? ((pts / denominator) * 100).toFixed(1) : '—';
            };

            // Season row
            const seasonRow = seasonStats && seasonStats.gp && seasonStats.gp > 0 ? (() => {
              // Calculate WS from ows + dws if ws is not directly available
              const ows = (seasonStats as any).ows ?? 0;
              const dws = (seasonStats as any).dws ?? 0;
              const ws = seasonStats.ws ?? (ows + dws);
              return {
                g: seasonStats.gp,
                mp: formatStat((seasonStats.min || 0) / seasonStats.gp),
                pts: formatStat((seasonStats.pts || 0) / seasonStats.gp),
                trb: formatStat((seasonStats.trb || 0) / seasonStats.gp),
                ast: formatStat((seasonStats.ast || 0) / seasonStats.gp),
                fgPct: formatPct(seasonStats.fg || 0, seasonStats.fga || 0),
                tpPct: formatPct(seasonStats.tp || 0, seasonStats.tpa || 0),
                ftPct: formatPct(seasonStats.ft || 0, seasonStats.fta || 0),
                tsPct: formatTS(seasonStats.pts || 0, seasonStats.fga || 0, seasonStats.fta || 0),
                per: formatStat((seasonStats as any).per),
                ws: formatStat(ws), // WS is a cumulative total, not per-game
              };
            })() : null;

            // Career row
            const careerRow = careerStats && careerStats.gp > 0 ? {
              g: careerStats.gp,
              mp: formatStat(careerStats.min / careerStats.gp),
              pts: formatStat(careerStats.pts / careerStats.gp),
              trb: formatStat(careerStats.trb / careerStats.gp),
              ast: formatStat(careerStats.ast / careerStats.gp),
              fgPct: formatPct(careerStats.fg, careerStats.fga),
              tpPct: formatPct(careerStats.tp, careerStats.tpa),
              ftPct: formatPct(careerStats.ft, careerStats.fta),
              tsPct: formatTS(careerStats.pts, careerStats.fga, careerStats.fta),
              per: formatStat(careerPER), // Minutes-weighted average of season PER values
              ws: formatStat(careerStats.ws), // WS is a cumulative total, not per-game
            } : null;

            // Peak row (for retired players only, and only when viewing their final/retired season)
            const isRetired = player.tid === -2 || player.tid === -3 || (player.retiredYear && player.retiredYear > 0);

            // Determine if we're viewing the player's retirement/final season
            // Use ALL stats (not filtered) to get the actual last season they played
            const allRegularSeasonStats = player.stats.filter(s => !s.playoffs && s.gp && s.gp > 0);
            const lastPlayedSeason = allRegularSeasonStats.length > 0
              ? Math.max(...allRegularSeasonStats.map(s => s.season))
              : 0;
            // Only show peak when viewing AFTER their last played season (their retired years)
            const isViewingRetiredSeason = isRetired && season && season > lastPlayedSeason;

            let peakRow = null;

            if (isViewingRetiredSeason && player.ratings) {
              // Find the season with the highest overall rating
              const ratingsWithOvr = player.ratings.filter(r => r.ovr != null && r.ovr > 0);

              if (ratingsWithOvr.length > 0) {
                const peakRating = ratingsWithOvr.reduce((max, r) =>
                  (r.ovr ?? 0) > (max.ovr ?? 0) ? r : max
                );
                const peakSeason = peakRating.season;

                // Get stats for peak season (same logic as seasonStats)
                let peakSeasonStats = filteredStats.find(s => s.season === peakSeason && s.tid === -1);

                if (!peakSeasonStats) {
                  const peakSeasonStatsArray = filteredStats.filter(s => s.season === peakSeason && s.tid !== -1);
                  if (peakSeasonStatsArray.length > 0) {
                    if (peakSeasonStatsArray.length === 1) {
                      const singleTeamStat = peakSeasonStatsArray[0];
                      const tpm = (singleTeamStat as any).tpm || singleTeamStat.tp || 0;
                      const totalReb = singleTeamStat.trb || ((singleTeamStat as any).orb || 0) + ((singleTeamStat as any).drb || 0);
                      const ows = (singleTeamStat as any).ows ?? 0;
                      const dws = (singleTeamStat as any).dws ?? 0;
                      const ws = singleTeamStat.ws ?? (ows + dws);
                      peakSeasonStats = {
                        ...singleTeamStat,
                        season: singleTeamStat.season,
                        tid: -1,
                        gp: singleTeamStat.gp || 0,
                        min: singleTeamStat.min || 0,
                        pts: singleTeamStat.pts || 0,
                        trb: totalReb,
                        ast: singleTeamStat.ast || 0,
                        fg: singleTeamStat.fg || 0,
                        fga: singleTeamStat.fga || 0,
                        tp: tpm,
                        tpa: singleTeamStat.tpa || 0,
                        ft: singleTeamStat.ft || 0,
                        fta: singleTeamStat.fta || 0,
                        ws: ws,
                      };
                    } else {
                      // Multiple teams - aggregate with PER calculation
                      const aggregated = peakSeasonStatsArray.reduce((acc, stat) => {
                        const tpm = (stat as any).tpm || stat.tp || 0;
                        const totalReb = stat.trb || ((stat as any).orb || 0) + ((stat as any).drb || 0);
                        const ows = (stat as any).ows ?? 0;
                        const dws = (stat as any).dws ?? 0;
                        const statWs = stat.ws ?? (ows + dws);
                        const perValue = (stat as any).per;
                        const statMin = stat.min || 0;
                        const weightedPER = (perValue != null && typeof perValue === 'number' && isFinite(perValue) && statMin > 0) ? perValue * statMin : 0;
                        const validMinutes = (perValue != null && typeof perValue === 'number' && isFinite(perValue) && statMin > 0) ? statMin : 0;

                        const accAny = acc as any;
                        return {
                          season: stat.season,
                          tid: -1,
                          gp: (acc.gp || 0) + (stat.gp || 0),
                          min: (acc.min || 0) + (stat.min || 0),
                          pts: (acc.pts || 0) + (stat.pts || 0),
                          trb: (acc.trb || 0) + totalReb,
                          ast: (acc.ast || 0) + (stat.ast || 0),
                          fg: (acc.fg || 0) + (stat.fg || 0),
                          fga: (acc.fga || 0) + (stat.fga || 0),
                          tp: (acc.tp || 0) + tpm,
                          tpa: (acc.tpa || 0) + (stat.tpa || 0),
                          ft: (acc.ft || 0) + (stat.ft || 0),
                          fta: (acc.fta || 0) + (stat.fta || 0),
                          ws: (acc.ws || 0) + statWs,
                          weightedPER: (accAny.weightedPER || 0) + weightedPER,
                          validMinutes: (accAny.validMinutes || 0) + validMinutes,
                        };
                      }, { season: peakSeason, tid: -1, gp: 0, min: 0, pts: 0, trb: 0, ast: 0, fg: 0, fga: 0, tp: 0, tpa: 0, ft: 0, fta: 0, ws: 0, weightedPER: 0, validMinutes: 0 });

                      const finalPER = (aggregated as any).validMinutes > 0 ? (aggregated as any).weightedPER / (aggregated as any).validMinutes : undefined;
                      peakSeasonStats = { ...aggregated, per: finalPER };
                      delete (peakSeasonStats as any).weightedPER;
                      delete (peakSeasonStats as any).validMinutes;
                    }
                  }
                }

                // Format peak row
                if (peakSeasonStats && peakSeasonStats.gp && peakSeasonStats.gp > 0) {
                  const ows = (peakSeasonStats as any).ows ?? 0;
                  const dws = (peakSeasonStats as any).dws ?? 0;
                  const ws = peakSeasonStats.ws ?? (ows + dws);

                  peakRow = {
                    g: peakSeasonStats.gp,
                    mp: formatStat((peakSeasonStats.min || 0) / peakSeasonStats.gp),
                    pts: formatStat((peakSeasonStats.pts || 0) / peakSeasonStats.gp),
                    trb: formatStat((peakSeasonStats.trb || 0) / peakSeasonStats.gp),
                    ast: formatStat((peakSeasonStats.ast || 0) / peakSeasonStats.gp),
                    fgPct: formatPct(peakSeasonStats.fg || 0, peakSeasonStats.fga || 0),
                    tpPct: formatPct(peakSeasonStats.tp || 0, peakSeasonStats.tpa || 0),
                    ftPct: formatPct(peakSeasonStats.ft || 0, peakSeasonStats.fta || 0),
                    tsPct: formatTS(peakSeasonStats.pts || 0, peakSeasonStats.fga || 0, peakSeasonStats.fta || 0),
                    per: formatStat((peakSeasonStats as any).per),
                    ws: formatStat(ws),
                  };
                }
              }
            }

            if (!seasonRow && !careerRow && !peakRow) return null;

            return (
              <div className="w-full mt-4 overflow-auto">
                <table className="table-auto text-[clamp(8px,2.5vw,10px)] sm:text-[13px]" style={{ width: 'max-content', minWidth: '100%', color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                  <thead>
                    <tr>
                      <th className="text-left pl-1 pr-1 py-0.5 font-semibold border-r-2" style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>Summary</th>
                      <th className="text-right pl-1 pr-0.5 py-0.5">G</th>
                      <th className="text-right px-0.5 py-0.5">MP</th>
                      <th className="text-right px-0.5 py-0.5">PTS</th>
                      <th className="text-right px-0.5 py-0.5">TRB</th>
                      <th className="text-right pl-0.5 pr-2 py-0.5 border-r-2" style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>AST</th>
                      <th className="text-right pl-0.5 pr-0.5 py-0.5">FG%</th>
                      <th className="text-right px-0.5 py-0.5">3P%</th>
                      <th className="text-right px-0.5 py-0.5">FT%</th>
                      <th className="text-right pl-0.5 pr-2 py-0.5 border-r-2" style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>TS%</th>
                      <th className="text-right pl-0.5 pr-0.5 py-0.5">PER</th>
                      <th className="text-right px-0.5 py-0.5">WS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonRow && (
                      <tr>
                        <td className="text-left pl-1 pr-1 py-0.5 font-bold border-r-2" style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>{season}</td>
                        <td className="text-right pl-1 pr-0.5 py-0.5">{(seasonRow.g || 0).toLocaleString()}</td>
                        <td className="text-right px-0.5 py-0.5">{seasonRow.mp}</td>
                        <td className="text-right px-0.5 py-0.5">{seasonRow.pts}</td>
                        <td className="text-right px-0.5 py-0.5">{seasonRow.trb}</td>
                        <td className="text-right pl-0.5 pr-2 py-0.5 border-r-2" style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>{seasonRow.ast}</td>
                        <td className="text-right pl-0.5 pr-0.5 py-0.5">{seasonRow.fgPct}</td>
                        <td className="text-right px-0.5 py-0.5">{seasonRow.tpPct}</td>
                        <td className="text-right px-0.5 py-0.5">{seasonRow.ftPct}</td>
                        <td className="text-right pl-0.5 pr-2 py-0.5 border-r-2" style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>{seasonRow.tsPct}</td>
                        <td className="text-right pl-0.5 pr-0.5 py-0.5">{seasonRow.per}</td>
                        <td className="text-right px-0.5 py-0.5">{seasonRow.ws}</td>
                      </tr>
                    )}
                    {peakRow && (
                      <tr>
                        <td className="text-left pl-1 pr-1 py-0.5 font-bold border-r-2" style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>Peak</td>
                        <td className="text-right pl-1 pr-0.5 py-0.5">{(peakRow.g || 0).toLocaleString()}</td>
                        <td className="text-right px-0.5 py-0.5">{peakRow.mp}</td>
                        <td className="text-right px-0.5 py-0.5">{peakRow.pts}</td>
                        <td className="text-right px-0.5 py-0.5">{peakRow.trb}</td>
                        <td className="text-right pl-0.5 pr-2 py-0.5 border-r-2" style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>{peakRow.ast}</td>
                        <td className="text-right pl-0.5 pr-0.5 py-0.5">{peakRow.fgPct}</td>
                        <td className="text-right px-0.5 py-0.5">{peakRow.tpPct}</td>
                        <td className="text-right px-0.5 py-0.5">{peakRow.ftPct}</td>
                        <td className="text-right pl-0.5 pr-2 py-0.5 border-r-2" style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>{peakRow.tsPct}</td>
                        <td className="text-right pl-0.5 pr-0.5 py-0.5">{peakRow.per}</td>
                        <td className="text-right px-0.5 py-0.5">{peakRow.ws}</td>
                      </tr>
                    )}
                    {careerRow && (
                      <tr>
                        <td className="text-left pl-1 pr-1 py-0.5 font-bold border-r-2" style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>Career</td>
                        <td className="text-right pl-1 pr-0.5 py-0.5">{careerRow.g.toLocaleString()}</td>
                        <td className="text-right px-0.5 py-0.5">{careerRow.mp}</td>
                        <td className="text-right px-0.5 py-0.5">{careerRow.pts}</td>
                        <td className="text-right px-0.5 py-0.5">{careerRow.trb}</td>
                        <td className="text-right pl-0.5 pr-2 py-0.5 border-r-2" style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>{careerRow.ast}</td>
                        <td className="text-right pl-0.5 pr-0.5 py-0.5">{careerRow.fgPct}</td>
                        <td className="text-right px-0.5 py-0.5">{careerRow.tpPct}</td>
                        <td className="text-right px-0.5 py-0.5">{careerRow.ftPct}</td>
                        <td className="text-right pl-0.5 pr-2 py-0.5 border-r-2" style={{ borderColor: textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>{careerRow.tsPct}</td>
                        <td className="text-right pl-0.5 pr-0.5 py-0.5">{careerRow.per}</td>
                        <td className="text-right px-0.5 py-0.5">{careerRow.ws}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}
          </div>

          {/* Right Side: Ratings */}
          <div>
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
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Physical</div>
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
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Shooting</div>
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
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Skill</div>
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
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Physical</div>
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
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Offense</div>
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
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Defense</div>
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
                      <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Physical</div>
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
                      <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Hitting</div>
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
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Defense</div>
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
                    <div className="font-semibold text-[clamp(12px,3.2vw,14px)] mb-0.5 sm:mb-2 pb-0.5 border-b border-current/20">Pitching</div>
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
        </div>

        {/* Awards & Honors */}
        {player.awards && player.awards.length > 0 && (
          <div className="mt-8 sm:max-w-[60%]">
            <TooltipProvider>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  // Filter awards to only show those up to the current season
                  const filteredAwards = player.awards.filter(award => {
                    // If no season is set, show all awards (e.g., viewing current/latest season)
                    if (!season) return true;
                    // If award has no season data, don't show it when viewing historical seasons
                    // (these are likely achievements that shouldn't be retroactively shown)
                    if (!award.season) return false;
                    // Only show awards from current season or earlier
                    return award.season <= season;
                  });

                  // Group awards by type and track years
                  const awardData: Record<string, { count: number; years: number[] }> = {};
                  filteredAwards.forEach(award => {
                    if (!awardData[award.type]) {
                      awardData[award.type] = { count: 0, years: [] };
                    }
                    awardData[award.type].count++;
                    if (award.season) {
                      awardData[award.type].years.push(award.season);
                    }
                  });

                  // Sort years for each award
                  Object.values(awardData).forEach(data => {
                    data.years.sort((a, b) => a - b);
                  });

                  // Create condensed award display
                  const condensedAwards: { text: string; isHallOfFame?: boolean; years: number[] }[] = [];

                Object.entries(awardData).forEach(([type, data]) => {
                  const { count, years } = data;
                  switch (type) {
                    case "Inducted into the Hall of Fame":
                      condensedAwards.push({ text: "Hall of Fame", isHallOfFame: true, years });
                      break;
                    case "Most Valuable Player":
                      condensedAwards.push({ text: count > 1 ? `${count}x MVP` : "MVP", years });
                      break;
                    case "Finals MVP":
                      condensedAwards.push({ text: count > 1 ? `${count}x FMVP` : "FMVP", years });
                      break;
                    case "Won Championship":
                      condensedAwards.push({ text: count > 1 ? `${count}x Champion` : "Champion", years });
                      break;
                    case "Rookie of the Year":
                      condensedAwards.push({ text: "ROY", years });
                      break;
                    case "All-Star MVP":
                      condensedAwards.push({ text: count > 1 ? `${count}x All-Star MVP` : "All-Star MVP", years });
                      break;
                    case "All-Star":
                      condensedAwards.push({ text: count > 1 ? `${count}x All-Star` : "All-Star", years });
                      break;
                    case "First Team All-League":
                    case "Second Team All-League":
                    case "Third Team All-League":
                      // Count all All-League teams together
                      if (!condensedAwards.some(award => award.text.includes("All-League"))) {
                        const allLeagueYears = filteredAwards
                          .filter(a => a.type.includes("All-League"))
                          .map(a => a.season)
                          .filter((s): s is number => s !== undefined)
                          .sort((a, b) => a - b);
                        const allLeagueCount = allLeagueYears.length;
                        condensedAwards.push({ text: allLeagueCount > 1 ? `${allLeagueCount}x All-League` : "All-League", years: allLeagueYears });
                      }
                      break;
                    case "First Team All-Defensive":
                    case "Second Team All-Defensive":
                      // Count all All-Defensive teams together
                      if (!condensedAwards.some(award => award.text.includes("All-Defensive"))) {
                        const allDefensiveYears = filteredAwards
                          .filter(a => a.type.includes("All-Defensive"))
                          .map(a => a.season)
                          .filter((s): s is number => s !== undefined)
                          .sort((a, b) => a - b);
                        const allDefensiveCount = allDefensiveYears.length;
                        condensedAwards.push({ text: allDefensiveCount > 1 ? `${allDefensiveCount}x All-Defensive` : "All-Defensive", years: allDefensiveYears });
                      }
                      break;
                    case "League Scoring Leader":
                      condensedAwards.push({ text: count > 1 ? `${count}x Scoring Leader` : "Scoring Leader", years });
                      break;
                    case "League Rebounding Leader":
                      condensedAwards.push({ text: count > 1 ? `${count}x Rebounding Leader` : "Rebounding Leader", years });
                      break;
                    case "League Assists Leader":
                      condensedAwards.push({ text: count > 1 ? `${count}x Assists Leader` : "Assists Leader", years });
                      break;
                    case "League Steals Leader":
                      condensedAwards.push({ text: count > 1 ? `${count}x Steals Leader` : "Steals Leader", years });
                      break;
                    case "League Blocks Leader":
                      condensedAwards.push({ text: count > 1 ? `${count}x Blocks Leader` : "Blocks Leader", years });
                      break;
                    default:
                      // Handle dynamic decade achievements
                      if (type.includes('playedIn') && type.endsWith('s')) {
                        const decadeMatch = type.match(/playedIn(\d{4})s/);
                        if (decadeMatch) {
                          const decade = decadeMatch[1];
                          condensedAwards.push({ text: `Played in the ${decade}s`, years });
                          break;
                        }
                      }
                      if (type.includes('debutedIn') && type.endsWith('s')) {
                        const decadeMatch = type.match(/debutedIn(\d{4})s/);
                        if (decadeMatch) {
                          const decade = decadeMatch[1];
                          condensedAwards.push({ text: `Debuted in the ${decade}s`, years });
                          break;
                        }
                      }

                      // Handle other achievement types with improved naming
                      let displayText = type;

                      // Handle age-related achievements
                      if (type.includes('playedAt') && type.includes('Plus')) {
                        const ageMatch = type.match(/playedAt(\d+)Plus/);
                        if (ageMatch) {
                          const age = ageMatch[1];
                          displayText = `Played at Age ${age}+`;
                        }
                      }

                      // Default case for unknown types
                      condensedAwards.push({ text: count > 1 ? `${count}x ${displayText}` : displayText, years });
                      break;
                  }
                });

                // Sort to put Hall of Fame first
                const sortedAwards = condensedAwards.sort((a, b) => {
                  if (a.isHallOfFame && !b.isHallOfFame) return -1;
                  if (!a.isHallOfFame && b.isHallOfFame) return 1;
                  return 0;
                });

                return sortedAwards.map((award, idx) => {
                  // Format consecutive years with hyphens (e.g., 2020-2023 instead of 2020, 2021, 2022, 2023)
                  const formatYears = (years: number[]): string => {
                    if (years.length === 0) return 'Achievement unlocked';
                    if (years.length === 1) return years[0].toString();

                    const ranges: string[] = [];
                    let rangeStart = years[0];
                    let rangeEnd = years[0];

                    for (let i = 1; i < years.length; i++) {
                      if (years[i] === rangeEnd + 1) {
                        rangeEnd = years[i];
                      } else {
                        ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
                        rangeStart = years[i];
                        rangeEnd = years[i];
                      }
                    }
                    ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);

                    return ranges.join(', ');
                  };

                  const yearsText = formatYears(award.years);

                  return (
                    <Tooltip key={idx} delayDuration={300}>
                      <TooltipTrigger asChild>
                        <span className="inline-block cursor-help">
                          <Badge
                            variant="secondary"
                            className={award.isHallOfFame
                              ? "text-xs bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 border-yellow-500 font-bold dark:from-yellow-500 dark:to-yellow-700 dark:text-yellow-100"
                              : "text-xs bg-slate-500 text-white dark:bg-slate-600 dark:text-slate-100"
                            }
                          >
                            {award.text}
                          </Badge>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={8}>
                        <p className="text-xs">{yearsText}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                });
              })()}
              </div>
            </TooltipProvider>
          </div>
        )}

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

                  // Group by season to detect multi-team seasons
                  const seasonGroups = new Map<number, typeof filteredStats>();
                  filteredStats.forEach(stat => {
                    const seasonStats = seasonGroups.get(stat.season) || [];
                    seasonStats.push(stat);
                    seasonGroups.set(stat.season, seasonStats);
                  });

                  const rows: JSX.Element[] = [];
                  let globalIdx = 0;

                  filteredStats.forEach((stat, idx) => {
                    const seasonStats = seasonGroups.get(stat.season) || [];
                    const isMultiTeamSeason = seasonStats.length > 1;

                    // Check if this is the first occurrence of this season in the list
                    const isFirstOfSeason = idx === 0 || filteredStats[idx - 1].season !== stat.season;

                    // If multi-team season and first occurrence, add TOT row first
                    if (isMultiTeamSeason && isFirstOfSeason) {
                      // Aggregate stats for TOT row
                      const totStats = seasonStats.reduce((acc, s) => {
                        const tpm = (s as any).tpm || s.tp || 0;
                        const trb = s.trb || ((s as any).orb || 0) + ((s as any).drb || 0);
                        return {
                          season: stat.season,
                          tid: -1,
                          playoffs: false,
                          gp: (acc.gp || 0) + (s.gp || 0),
                          gs: ((acc as any).gs || 0) + ((s as any).gs || 0),
                          min: (acc.min || 0) + (s.min || 0),
                          pts: (acc.pts || 0) + (s.pts || 0),
                          trb: (acc.trb || 0) + trb,
                          ast: (acc.ast || 0) + (s.ast || 0),
                          fg: (acc.fg || 0) + (s.fg || 0),
                          fga: (acc.fga || 0) + (s.fga || 0),
                          tp: (acc.tp || 0) + tpm,
                          tpa: (acc.tpa || 0) + (s.tpa || 0),
                          ft: (acc.ft || 0) + (s.ft || 0),
                          fta: (acc.fta || 0) + (s.fta || 0),
                          orb: ((acc as any).orb || 0) + ((s as any).orb || 0),
                          drb: ((acc as any).drb || 0) + ((s as any).drb || 0),
                          tov: ((acc as any).tov || 0) + ((s as any).tov || 0),
                          stl: (acc.stl || 0) + (s.stl || 0),
                          blk: (acc.blk || 0) + (s.blk || 0),
                          ba: ((acc as any).ba || 0) + ((s as any).ba || 0),
                          pf: ((acc as any).pf || 0) + ((s as any).pf || 0),
                        };
                      }, { gp: 0, gs: 0, min: 0, pts: 0, trb: 0, ast: 0, fg: 0, fga: 0, tp: 0, tpa: 0, ft: 0, fta: 0, orb: 0, drb: 0, tov: 0, stl: 0, blk: 0, ba: 0, pf: 0 });

                      // Render TOT row
                      const totGp = totStats.gp || 0;
                      const totPerGame = (val?: number) => totGp > 0 && val != null ? (val / totGp).toFixed(1) : '-';
                      const totPct = (made?: number, attempted?: number) => {
                        if (attempted != null && attempted > 0 && made != null) {
                          return ((made / attempted) * 100).toFixed(1);
                        }
                        return '-';
                      };
                      const totTotalReb = totStats.trb;
                      const totFg = totStats.fg || 0;
                      const totFga = totStats.fga || 0;
                      const totTpm = totStats.tp || 0;
                      const totTpa = totStats.tpa || 0;
                      const totTwoPM = totFg - totTpm;
                      const totTwoPA = totFga - totTpa;
                      const totEfgPct = totFga > 0 ? (((totFg + 0.5 * totTpm) / totFga) * 100).toFixed(1) : '-';
                      const age = player.born?.year ? stat.season - player.born.year : null;

                      rows.push(
                        <tr
                          key={`${stat.season}-TOT-${globalIdx}`}
                          className="border-b hover:bg-white/5 transition-colors"
                          style={{
                            borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
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
                          <td className="py-3 px-2 text-sm whitespace-nowrap sticky left-[68px] z-20 font-bold" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', backgroundColor: primaryColor }}>
                            TOT
                          </td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{age ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totGp}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totStats.gs ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.min)}</td>
                          <td className="text-center py-3 px-2 text-sm font-medium" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>{totPerGame(totStats.pts)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totTotalReb)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.ast)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.fg)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.fga)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPct(totStats.fg, totStats.fga)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totTpm)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.tpa)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPct(totTpm, totStats.tpa)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totGp > 0 ? (totTwoPM / totGp).toFixed(1) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totGp > 0 ? (totTwoPA / totGp).toFixed(1) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPct(totTwoPM, totTwoPA)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totEfgPct}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.ft)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.fta)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPct(totStats.ft, totStats.fta)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.orb)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.drb)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.tov)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.stl)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.blk)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.ba)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.pf)}</td>
                        </tr>
                      );
                      globalIdx++;
                    }

                    // Now render the actual team row (with greyed text if multi-team season)
                    const greyedOpacity = isMultiTeamSeason ? 0.5 : 0.9;
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

                    rows.push(
                      <tr
                        key={`${stat.season}-${stat.tid}-${globalIdx}`}
                        className="border-b hover:bg-white/5 transition-colors"
                        style={{
                          borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          borderBottomWidth: hasYearGap ? '3px' : '1px',
                          borderBottomStyle: hasYearGap ? 'solid' : 'solid',
                        }}
                      >
                        <td className="py-3 px-4 text-sm whitespace-nowrap sticky left-0 z-20" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})`, backgroundColor: primaryColor }}>
                          <button
                            onClick={() => setModalSeason(stat.season)}
                            className="hover:underline cursor-pointer"
                            style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}
                          >
                            {stat.season}
                          </button>
                        </td>
                        <td className="py-3 px-2 text-sm whitespace-nowrap sticky left-[68px] z-20" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})`, backgroundColor: primaryColor }}>
                          {onTeamClick ? (
                            <button
                              onClick={() => onTeamClick(stat.tid, stat.season)}
                              className="hover:underline cursor-pointer"
                              style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}
                            >
                              {teamInfo?.abbrev || 'UNK'}
                            </button>
                          ) : (
                            <span>{teamInfo?.abbrev || 'UNK'}</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{age ?? '-'}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{gp}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{(stat as any).gs ?? '-'}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(stat.min)}</td>
                        <td className="text-center py-3 px-2 text-sm font-medium" style={{ color: textColor === 'white' ? (isMultiTeamSeason ? `rgba(255,255,255,${greyedOpacity})` : '#ffffff') : (isMultiTeamSeason ? `rgba(0,0,0,${greyedOpacity})` : '#000000') }}>{perGame(stat.pts)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(totalReb)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(stat.ast)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(stat.fg)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(stat.fga)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{pct(stat.fg, stat.fga)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(tpm)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(stat.tpa)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{pct(tpm, stat.tpa)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{gp > 0 ? (twoPM / gp).toFixed(1) : '-'}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{gp > 0 ? (twoPA / gp).toFixed(1) : '-'}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{pct(twoPM, twoPA)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{efgPct}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(stat.ft)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(stat.fta)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{pct(stat.ft, stat.fta)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(stat.orb)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(stat.drb)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame((stat as any).tov)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(stat.stl)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(stat.blk)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame((stat as any).ba)}</td>
                        <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame((stat as any).pf)}</td>
                      </tr>
                    );
                    globalIdx++;
                  });

                  return rows;
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

                    // Group by season to detect multi-team seasons
                    const seasonGroups = new Map<number, typeof filteredStats>();
                    filteredStats.forEach(stat => {
                      const seasonStats = seasonGroups.get(stat.season) || [];
                      seasonStats.push(stat);
                      seasonGroups.set(stat.season, seasonStats);
                    });

                    const rows: JSX.Element[] = [];
                    let globalIdx = 0;

                    filteredStats.forEach((stat, idx) => {
                      const seasonStats = seasonGroups.get(stat.season) || [];
                      const isMultiTeamSeason = seasonStats.length > 1;

                      // Check if this is the first occurrence of this season in the list
                      const isFirstOfSeason = idx === 0 || filteredStats[idx - 1].season !== stat.season;

                      // If multi-team season and first occurrence, add TOT row first
                      if (isMultiTeamSeason && isFirstOfSeason) {
                        // Aggregate stats for TOT row
                        const totStats = seasonStats.reduce((acc, s) => ({
                          gp: (acc.gp || 0) + (s.gp || 0),
                          gs: (acc.gs || 0) + ((s as any).gs || 0),
                          min: (acc.min || 0) + (s.min || 0),
                          ws: (acc.ws || 0) + (s.ws || 0),
                          ows: (acc.ows || 0) + ((s as any).ows || 0),
                          dws: (acc.dws || 0) + ((s as any).dws || 0),
                          ewa: (acc.ewa || 0) + ((s as any).ewa || 0),
                          vorp: (acc.vorp || 0) + ((s as any).vorp || 0),
                          fga: (acc.fga || 0) + (s.fga || 0),
                          tpa: (acc.tpa || 0) + (s.tpa || 0),
                          ft: (acc.ft || 0) + (s.ft || 0),
                          fta: (acc.fta || 0) + (s.fta || 0),
                          pts: (acc.pts || 0) + (s.pts || 0),
                        }), { gp: 0, gs: 0, min: 0, ws: 0, ows: 0, dws: 0, ewa: 0, vorp: 0, fga: 0, tpa: 0, ft: 0, fta: 0, pts: 0 });

                        // Render TOT row
                        const totGp = totStats.gp || 0;
                        const totMin = totStats.min || 0;
                        const totPerGame = (val?: number) => totGp > 0 && val != null ? (val / totGp).toFixed(1) : '-';
                        const totFormat = (val?: number, decimals = 1) => val != null ? val.toFixed(decimals) : '-';

                        // Calculate TOT ratios
                        const totFga = totStats.fga || 0;
                        const totTpa = totStats.tpa || 0;
                        const totFt = totStats.ft || 0;
                        const totFta = totStats.fta || 0;
                        const totPts = totStats.pts || 0;
                        const totTpaPerFga = totFga > 0 ? (totTpa / totFga).toFixed(3) : '-';
                        const totFtPerFga = totFga > 0 ? (totFt / totFga).toFixed(3) : '-';

                        const totWs = totStats.ws || 0;
                        const totOws = totStats.ows || 0;
                        const totDws = totStats.dws || 0;
                        const totWs48 = totMin > 0 ? (totWs * 48 * 60) / totMin : null;

                        // TS% = PTS / (2 * (FGA + 0.44 * FTA))
                        const totTsDenom = 2 * (totFga + 0.44 * totFta);
                        const totTsPct = totTsDenom > 0 ? totPts / totTsDenom : null;

                        const age = player.born?.year ? stat.season - player.born.year : null;

                        rows.push(
                          <tr
                            key={`${stat.season}-TOT-ADV-${globalIdx}`}
                            className="border-b hover:bg-white/5 transition-colors"
                            style={{
                              borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
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
                            <td className="py-3 px-2 text-sm whitespace-nowrap sticky left-[68px] z-20 font-bold" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', backgroundColor: primaryColor }}>
                              TOT
                            </td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{age ?? '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totGp}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totStats.gs ?? '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totPerGame(totStats.min)}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>-</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totFormat(totStats.vorp)}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>-</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>-</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>-</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totWs !== 0 ? totFormat(totWs) : '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totOws !== 0 ? totFormat(totOws) : '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totDws !== 0 ? totFormat(totDws) : '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totWs48 !== null ? totFormat(totWs48, 3) : '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totFormat(totStats.ewa)}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totTsPct !== null ? (totTsPct * 100).toFixed(1) : '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totTpaPerFga}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{totFtPerFga}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>-</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>-</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>-</td>
                          </tr>
                        );
                        globalIdx++;
                      }

                      // Now render the actual team row (with greyed text if multi-team season)
                      const greyedOpacity = isMultiTeamSeason ? 0.5 : 0.9;
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

                      rows.push(
                        <tr
                          key={`${stat.season}-${stat.tid}-${globalIdx}`}
                          className="border-b hover:bg-white/5 transition-colors"
                          style={{
                            borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                            borderBottomWidth: hasYearGap ? '3px' : '1px',
                            borderBottomStyle: hasYearGap ? 'solid' : 'solid',
                          }}
                        >
                          <td className="py-3 px-4 text-sm whitespace-nowrap sticky left-0 z-20" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})`, backgroundColor: primaryColor }}>
                            <button
                              onClick={() => setModalSeason(stat.season)}
                              className="hover:underline cursor-pointer"
                              style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}
                            >
                              {stat.season}
                            </button>
                          </td>
                          <td className="py-3 px-2 text-sm whitespace-nowrap sticky left-[68px] z-20" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})`, backgroundColor: primaryColor }}>
                            {onTeamClick ? (
                              <button
                                onClick={() => onTeamClick(stat.tid, stat.season)}
                                className="hover:underline cursor-pointer"
                                style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}
                              >
                                {teamInfo?.abbrev || 'UNK'}
                              </button>
                            ) : (
                              <span>{teamInfo?.abbrev || 'UNK'}</span>
                            )}
                          </td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{age ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{gp}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{stat.gs ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{perGame(stat.min)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{format(stat.per)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{format(stat.vorp)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{bpm !== 0 ? format(bpm) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{obpm !== 0 ? format(obpm) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{dbpm !== 0 ? format(dbpm) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{ws !== 0 ? format(ws) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{ows !== 0 ? format(ows) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{dws !== 0 ? format(dws) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{ws48 !== null ? format(ws48, 3) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{format(stat.ewa)}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{tsPct !== null ? (tsPct * 100).toFixed(1) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{tpaPerFga}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{ftPerFga}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{stat.pm != null ? format(stat.pm) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{stat.ortg != null ? format(stat.ortg) : '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? `rgba(255,255,255,${greyedOpacity})` : `rgba(0,0,0,${greyedOpacity})` }}>{stat.drtg != null ? format(stat.drtg) : '-'}</td>
                        </tr>
                      );
                      globalIdx++;
                    });

                    return rows;
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
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Age">Age</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Games Played">GP</th>
                      {isGoalie ? (
                        <>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Record (W-L-OTL)">Rec</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Goals Against Average">GAA</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Save Percentage">SV%</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Shutouts">SO</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Shots Against">SA</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Saves">SV</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Time on Ice">TOI</th>
                        </>
                      ) : (
                        <>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Goals">G</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Assists">A</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Points">PTS</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Plus/Minus">+/-</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Penalty Minutes">PIM</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Shots on Goal">S</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Shooting Percentage">S%</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Time on Ice">TOI</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Hits">HIT</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Blocks">BLK</th>
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
                              <td className="text-center py-3 px-2 text-sm font-medium" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>
                                {(() => {
                                  // Compute goals from even strength, power play, and short-handed
                                  const evG = (stat as any).evG ?? 0;
                                  const ppG = (stat as any).ppG ?? 0;
                                  const shG = (stat as any).shG ?? 0;
                                  const totalGoals = (stat as any).g ?? (evG + ppG + shG);
                                  return totalGoals.toFixed(0);
                                })()}
                              </td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                {(() => {
                                  // Compute assists from even strength, power play, and short-handed
                                  const evA = (stat as any).evA ?? 0;
                                  const ppA = (stat as any).ppA ?? 0;
                                  const shA = (stat as any).shA ?? 0;
                                  const totalAssists = (stat as any).a ?? (stat as any).asts ?? (evA + ppA + shA);
                                  return totalAssists.toFixed(0);
                                })()}
                              </td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                {(() => {
                                  // Compute points from goals + assists
                                  const evG = (stat as any).evG ?? 0;
                                  const ppG = (stat as any).ppG ?? 0;
                                  const shG = (stat as any).shG ?? 0;
                                  const evA = (stat as any).evA ?? 0;
                                  const ppA = (stat as any).ppA ?? 0;
                                  const shA = (stat as any).shA ?? 0;
                                  const goals = (stat as any).g ?? (evG + ppG + shG);
                                  const assists = (stat as any).a ?? (stat as any).asts ?? (evA + ppA + shA);
                                  const totalPoints = (stat as any).pts ?? (goals + assists);
                                  return totalPoints.toFixed(0);
                                })()}
                              </td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                {(stat as any).pm != null ? ((stat as any).pm >= 0 ? `+${(stat as any).pm}` : `${(stat as any).pm}`) : '-'}
                              </td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{((stat as any).pim ?? 0).toFixed(0)}</td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{((stat as any).s ?? 0).toFixed(0)}</td>
                              <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                {(() => {
                                  // Compute goals for shooting percentage
                                  const evG = (stat as any).evG ?? 0;
                                  const ppG = (stat as any).ppG ?? 0;
                                  const shG = (stat as any).shG ?? 0;
                                  const g = (stat as any).g ?? (evG + ppG + shG);
                                  const s = (stat as any).s ?? 0;
                                  return s > 0 ? `${((g / s) * 100).toFixed(1)}%` : '-';
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

        {/* Baseball Batting Stats */}
        {sport === 'baseball' && player.stats && player.stats.length > 0 && (() => {
          // Determine if player is a pitcher based on latest rating
          const latestRating = player.ratings && player.ratings.length > 0
            ? player.ratings
                .filter(r => (!season || r.season <= season))
                .reduce((latest, r) => r.season > latest.season ? r : latest)
            : null;
          const isPitcher = latestRating?.pos === 'SP' || latestRating?.pos === 'RP' || latestRating?.pos === 'P';

          // Only show batting stats for non-pitchers
          if (isPitcher) return null;

          const filteredStats = player.stats
            .filter(s => !s.playoffs && s.gp && s.gp > 0 && (!season || s.season <= season))
            .sort((a, b) => b.season - a.season);

          if (filteredStats.length === 0) return null;

          return (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Batting Stats</h3>
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
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-0 z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }} title="Year">Year</th>
                      <th className="text-left py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-[68px] z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }} title="Team">Team</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Age">Age</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Games Played">G</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Games Started">GS</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Plate Appearances">PA</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="At Bats">AB</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Batting Average">BA</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="On-Base Percentage">OBP</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Slugging Percentage">SLG</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="On-Base + Slugging Percentage">OPS</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Runs">R</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Hits">H</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Doubles">2B</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Triples">3B</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Home Runs">HR</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Runs Batted In">RBI</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Stolen Bases">SB</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Caught Stealing">CS</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Walks">BB</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Strikeouts">SO</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Total Bases">TB</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Double Plays Grounded Into">GDP</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Hit By Pitch">HBP</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Sacrifice Hits/Bunts">SH</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Sacrifice Flies">SF</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Intentional Walks">IBB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStats.map((stat, idx) => {
                      const team = teams.find(t => t.tid === stat.tid);
                      const teamInfo = team ? getTeamNameForSeason(team, stat.season) : null;
                      const age = player.born?.year ? stat.season - player.born.year : null;

                      const hasYearGap = idx < filteredStats.length - 1 &&
                                        stat.season - filteredStats[idx + 1].season > 1;

                      const pa = (stat as any).pa ?? (stat as any).plateAppearances ?? 0;
                      const bb = (stat as any).bb ?? (stat as any).walks ?? 0;
                      const hbp = (stat as any).hbp ?? (stat as any).hitByPitch ?? 0;
                      const sh = (stat as any).sh ?? (stat as any).sacBunts ?? 0;
                      const sf = (stat as any).sf ?? (stat as any).sacFlies ?? 0;
                      const ibb = (stat as any).ibb ?? (stat as any).intentionalWalks ?? 0;

                      // Calculate AB using the correct formula for ZenGM: AB = PA - BB - HBP - SH - SF - IBB
                      const ab = pa - bb - hbp - sh - sf - ibb;

                      const h = (stat as any).h ?? (stat as any).hits ?? 0;
                      const doubles = (stat as any)['2b'] ?? (stat as any).doubles ?? 0;
                      const triples = (stat as any)['3b'] ?? (stat as any).triples ?? 0;
                      const hr = (stat as any).hr ?? (stat as any).homeRuns ?? 0;

                      // Calculate BA, OBP, SLG, OPS
                      const ba = ab > 0 ? (h / ab).toFixed(3).replace(/^0/, '') : '.000';
                      const obp = pa > 0 ? ((h + bb + hbp) / pa).toFixed(3).replace(/^0/, '') : '.000';
                      const tb = h + doubles + (triples * 2) + (hr * 3);
                      const slg = ab > 0 ? (tb / ab).toFixed(3).replace(/^0/, '') : '.000';
                      const ops = ((parseFloat(obp.replace(/^\./, '0.')) + parseFloat(slg.replace(/^\./, '0.')))).toFixed(3).replace(/^0/, '');

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
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{stat.gp ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).gs ?? (stat as any).gamesStarted ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{pa}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{ab}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{ba}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{obp}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{slg}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{ops}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).r ?? (stat as any).runs ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{h}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{doubles}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{triples}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{hr}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).rbi ?? (stat as any).runsBattedIn ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).sb ?? (stat as any).stolenBases ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).cs ?? (stat as any).caughtStealing ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{bb}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).so ?? (stat as any).strikeouts ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{tb}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(stat as any).gdp ?? (stat as any).doublePlays ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{hbp}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{sh}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{sf}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{ibb}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Baseball Pitching Stats */}
        {sport === 'baseball' && player.stats && player.stats.length > 0 && (() => {
          // Determine if player is a pitcher based on latest rating
          const latestRating = player.ratings && player.ratings.length > 0
            ? player.ratings
                .filter(r => (!season || r.season <= season))
                .reduce((latest, r) => r.season > latest.season ? r : latest)
            : null;
          const isPitcher = latestRating?.pos === 'SP' || latestRating?.pos === 'RP' || latestRating?.pos === 'P';

          // Only show pitching stats for pitchers
          if (!isPitcher) return null;

          const filteredStats = player.stats
            .filter(s => !s.playoffs && s.gp && s.gp > 0 && (!season || s.season <= season))
            .sort((a, b) => b.season - a.season);

          if (filteredStats.length === 0) return null;

          return (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Pitching Stats</h3>
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
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-0 z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }} title="Year">Year</th>
                      <th className="text-left py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap sticky left-[68px] z-30" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }} title="Team">Team</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Age">Age</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Games Played">G</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Games Started">GS</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Innings Pitched">IP</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Wins-Losses">W–L</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Saves">SV</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Earned Run Average">ERA</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Walks + Hits per Inning Pitched">WHIP</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Hits Allowed">H</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Walks">BB</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Strikeouts">SO</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Home Runs Allowed">HR</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Strikeouts per 9 Innings">K/9</th>
                      <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Walks per 9 Innings">BB/9</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStats.map((stat, idx) => {
                      const team = teams.find(t => t.tid === stat.tid);
                      const teamInfo = team ? getTeamNameForSeason(team, stat.season) : null;
                      const age = player.born?.year ? stat.season - player.born.year : null;

                      const hasYearGap = idx < filteredStats.length - 1 &&
                                        stat.season - filteredStats[idx + 1].season > 1;

                      // Get pitching stats
                      // IMPORTANT: Check pitching-specific fields (hPit, bbPit, etc) BEFORE batting fields (h, bb, etc)
                      // because pitchers have both batting and pitching stats, and batting stats are usually 0
                      const gp = stat.gp || 0;
                      const gs = (stat as any).gsPit ?? (stat as any).gs ?? (stat as any).gamesStarted ?? 0;
                      const ipOuts = (stat as any).outs ?? (stat as any).outsRecorded ?? 0;
                      const ip = (ipOuts / 3).toFixed(1);
                      const w = (stat as any).w ?? (stat as any).wins ?? 0;
                      const l = (stat as any).l ?? (stat as any).losses ?? 0;
                      const sv = (stat as any).sv ?? (stat as any).saves ?? 0;
                      const er = (stat as any).er ?? (stat as any).earnedRuns ?? 0;
                      const ha = (stat as any).hPit ?? (stat as any).ha ?? (stat as any).hitsAllowed ?? (stat as any).h ?? 0;
                      const bba = (stat as any).bbPit ?? (stat as any).bba ?? (stat as any).walksAllowed ?? (stat as any).bb ?? 0;
                      const soa = (stat as any).soPit ?? (stat as any).soa ?? (stat as any).strikeoutsThrown ?? (stat as any).so ?? 0;
                      const hra = (stat as any).hrPit ?? (stat as any).hra ?? (stat as any).homeRunsAllowed ?? (stat as any).hr ?? 0;

                      // Calculate ERA, WHIP, K/9, BB/9
                      const ipNum = ipOuts / 3;
                      const era = ipNum > 0 ? ((er * 9) / ipNum).toFixed(2) : '0.00';
                      const whip = ipNum > 0 ? ((ha + bba) / ipNum).toFixed(2) : '0.00';
                      const k9 = ipNum > 0 ? ((soa * 9) / ipNum).toFixed(1) : '0.0';
                      const bb9 = ipNum > 0 ? ((bba * 9) / ipNum).toFixed(1) : '0.0';

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
                              onClick={() => onSeasonClick?.(stat.season)}
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
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{gs}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{ip}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{w}–{l}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{sv}</td>
                          <td className="text-center py-3 px-2 text-sm font-medium" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>{era}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{whip}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{ha}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{bba}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{soa}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{hra}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{k9}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{bb9}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Football Ratings Table */}
        {player.ratings && player.ratings.length > 0 && sport === 'football' && (
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
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>End</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Vis</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>ThP</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>ThA</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>BSc</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Elu</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Rte</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Hnd</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>RBk</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>PBk</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>PCv</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Tck</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>PRs</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>RSt</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>KPw</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>KAc</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>PPw</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>PAc</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredRatings = player.ratings
                      .filter(r => !season || r.season <= season)
                      .sort((a, b) => b.season - a.season);

                    return filteredRatings.map((rating, idx) => {
                      const statForSeason = player.stats?.find(s => s.season === rating.season && !s.playoffs);
                      const team = statForSeason ? teams.find(t => t.tid === statForSeason.tid) : null;
                      const teamInfo = team ? getTeamNameForSeason(team, rating.season) : null;
                      const age = player.born?.year ? rating.season - player.born.year : null;
                      const hasYearGap = idx < filteredRatings.length - 1 &&
                                        rating.season - filteredRatings[idx + 1].season > 1;

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
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).hgt ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).stre ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).spd ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).endu ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).vision ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).thp ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).tha ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).bsc ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).elu ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).rtr ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).hnd ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).rbk ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).pbk ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).pcv ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).tck ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).prs ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).rns ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).kpw ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).kac ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).ppw ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).pac ?? '-'}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Hockey Ratings Table */}
        {player.ratings && player.ratings.length > 0 && sport === 'hockey' && (
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
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>End</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Pss</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>WSt</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>SSt</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Stk</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>oIQ</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>dIQ</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Chk</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Blk</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Fcf</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Glk</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredRatings = player.ratings
                      .filter(r => !season || r.season <= season)
                      .sort((a, b) => b.season - a.season);

                    return filteredRatings.map((rating, idx) => {
                      const statForSeason = player.stats?.find(s => s.season === rating.season && !s.playoffs);
                      const team = statForSeason ? teams.find(t => t.tid === statForSeason.tid) : null;
                      const teamInfo = team ? getTeamNameForSeason(team, rating.season) : null;
                      const age = player.born?.year ? rating.season - player.born.year : null;
                      const hasYearGap = idx < filteredRatings.length - 1 &&
                                        rating.season - filteredRatings[idx + 1].season > 1;

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
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).hgt ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).stre ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).spd ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).endu ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).pss ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).wst ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).sst ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).stk ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).oiq ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).diq ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).chk ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).blk ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).fcf ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).glk ?? '-'}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Baseball Ratings Table */}
        {player.ratings && player.ratings.length > 0 && sport === 'baseball' && (
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
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Spd</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>HPw</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Con</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Eye</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Gnd</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Fly</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Thr</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Cat</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>PPw</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Ctl</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Mov</th>
                    <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>End</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredRatings = player.ratings
                      .filter(r => !season || r.season <= season)
                      .sort((a, b) => b.season - a.season);

                    return filteredRatings.map((rating, idx) => {
                      const statForSeason = player.stats?.find(s => s.season === rating.season && !s.playoffs);
                      const team = statForSeason ? teams.find(t => t.tid === statForSeason.tid) : null;
                      const teamInfo = team ? getTeamNameForSeason(team, rating.season) : null;
                      const age = player.born?.year ? rating.season - player.born.year : null;
                      const hasYearGap = idx < filteredRatings.length - 1 &&
                                        rating.season - filteredRatings[idx + 1].season > 1;

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
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).hgt ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).spd ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).hpw ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).con ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).eye ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).gnd ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).fly ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).thr ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).cat ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).ppw ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).ctl ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).mov ?? '-'}</td>
                          <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{(rating as any).endu ?? '-'}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
