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

export function PlayerPageModal({ player, sport, teams = [], season, onClose, onTeamClick }: PlayerPageModalProps) {
  const [imageKind, setImageKind] = useState<"url" | "svg" | "none">("none");
  const [imageData, setImageData] = useState("");

  // Get team colors for the player's current team
  const { primaryColor, secondaryColor, textColor } = useMemo(() => {
    if (!player || !season || teams.length === 0) {
      return {
        primaryColor: '#1f2937',
        secondaryColor: '#ffffff',
        textColor: 'white' as const
      };
    }

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

    return {
      primaryColor: '#1f2937',
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
        className="relative w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
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
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>
            {player.name}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:px-8 sm:pb-8 sm:pt-4" style={{ color: statTextColor }}>

        {/* Player Header Section */}
        <div className="flex flex-col sm:flex-row items-start gap-6 pt-4 sm:pt-0">
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
              {/* Position, Team, and Jersey Number */}
              {season && (() => {
                const seasonRating = player.ratings?.find(r => r.season === season);
                const seasonStats = player.stats?.find(s => s.season === season && !s.playoffs);
                const position = seasonRating?.pos || player.pos;
                const team = seasonStats ? teams.find(t => t.tid === seasonStats.tid) : null;
                const jerseyNumber = seasonStats?.jerseyNumber || player.jerseyNumber;

                if (!position && !team && !jerseyNumber) return null;

                return (
                  <div className="flex items-center gap-1">
                    {position && <span className="font-semibold whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>{position}</span>}
                    {position && (team || jerseyNumber) && <span className="whitespace-nowrap">,</span>}
                    {team && (
                      <>
                        <button
                          type="button"
                          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-transparent border-0 p-0 font-inherit whitespace-nowrap"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onTeamClick && season) {
                              onTeamClick(team.tid, season);
                            }
                          }}
                        >
                          {team.region} {team.name}
                        </button>
                      </>
                    )}
                    {jerseyNumber && (
                      <>
                        {(position || team) && <span className="whitespace-nowrap">,</span>}
                        <span className="whitespace-nowrap">#{jerseyNumber}</span>
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

              {/* Age (as of latest season) */}
              {player.born?.year && season && (
                <div className="whitespace-nowrap">
                  <span className="font-semibold" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Age:</span> {season - player.born.year}
                </div>
              )}

              {/* Draft */}
              {(() => {
                if (!player.draft || player.draft.tid == null || player.draft.tid < 0) {
                  return (
                    <div className="whitespace-nowrap">
                      <span className="font-semibold" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Draft:</span> Undrafted
                    </div>
                  );
                }

                const draftTeam = teams?.find(t => t.tid === player.draft.tid);

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
                    {draftTeam && <span> by {draftTeam.abbrev}</span>}
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
                    // Get unique seasons played
                    const seasonsPlayed = new Set(
                      player.stats
                        .filter(s => !s.playoffs && s.gp && s.gp > 0)
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
              <div className="p-[4px] mx-auto sm:mx-0 sm:p-2 sm:mt-[-8px] sm:mb-[-44px] font-['system-ui'] tabular-nums w-full sm:w-auto sm:max-w-[400px]">
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

                {/* Three Column Ratings - Physical left, Shooting center, Skill right */}
                <div className="flex gap-4 sm:gap-1">
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
                    .filter(s => !s.playoffs && s.gp && s.gp > 0) // Regular season only with games played
                    .sort((a, b) => b.season - a.season); // Descending by year

                  return filteredStats.map((stat, idx) => {
                    const team = teams.find(t => t.tid === stat.tid);
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
                        <td className="py-3 px-4 text-sm whitespace-nowrap sticky left-0 z-20" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>{stat.season}</td>
                        <td className="py-3 px-2 text-sm whitespace-nowrap sticky left-[68px] z-20" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', backgroundColor: primaryColor }}>
                          {onTeamClick ? (
                            <button
                              onClick={() => onTeamClick(stat.tid, stat.season)}
                              className="hover:underline cursor-pointer"
                              style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                            >
                              {team?.abbrev || 'UNK'}
                            </button>
                          ) : (
                            <span>{team?.abbrev || 'UNK'}</span>
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
                      .filter(s => !s.playoffs && s.gp && s.gp > 0)
                      .sort((a, b) => b.season - a.season);

                    return filteredStats.map((stat, idx) => {
                      const team = teams.find(t => t.tid === stat.tid);
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
                          <td className="py-3 px-4 text-sm whitespace-nowrap sticky left-0 z-20" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>{stat.season}</td>
                          <td className="py-3 px-2 text-sm whitespace-nowrap sticky left-[68px] z-20" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', backgroundColor: primaryColor }}>
                            {onTeamClick ? (
                              <button
                                onClick={() => onTeamClick(stat.tid, stat.season)}
                                className="hover:underline cursor-pointer"
                                style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                              >
                                {team?.abbrev || 'UNK'}
                              </button>
                            ) : (
                              <span>{team?.abbrev || 'UNK'}</span>
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
        </div>
      </div>
    </div>
  );
}
