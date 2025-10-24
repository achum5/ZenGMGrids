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
        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8" style={{ color: statTextColor }}>

        {/* Player Header Section */}
        <div className="flex flex-col sm:flex-row items-start gap-6 pt-4">
          {/* Left Side: Image + Details */}
          <div className="flex items-start gap-3 sm:gap-6 w-full">
            {/* Player Image */}
            <div className="flex-shrink-0">
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
            <div className="space-y-1 text-muted-foreground w-full" style={{ fontSize: 'clamp(8px, 2.8vw, 14px)' }}>
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
                    {position && <span className="font-semibold whitespace-nowrap">{position}</span>}
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
                  <span className="font-semibold">Born:</span> {player.born.year || 'Unknown'}
                  {player.born.loc && <span> - {player.born.loc}</span>}
                </div>
              )}

              {/* Age (as of latest season) */}
              {player.born?.year && season && (
                <div className="whitespace-nowrap">
                  <span className="font-semibold">Age:</span> {season - player.born.year}
                </div>
              )}

              {/* Draft */}
              {(() => {
                if (!player.draft || player.draft.tid == null || player.draft.tid < 0) {
                  return (
                    <div className="whitespace-nowrap">
                      <span className="font-semibold">Draft:</span> Undrafted
                    </div>
                  );
                }

                const draftTeam = teams?.find(t => t.tid === player.draft.tid);

                return (
                  <div className="whitespace-nowrap">
                    <span className="font-semibold">Draft:</span>{' '}
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
                      <span className="font-semibold capitalize">{relative.type}:</span>{' '}
                      {relative.name}
                    </div>
                  ))}
                </div>
              )}

              {/* College */}
              <div>
                <span className="font-semibold">College:</span>{' '}
                {player.college || 'None'}
              </div>

              {/* Experience (years in league) */}
              {player.stats && player.stats.length > 0 && (
                <div>
                  <span className="font-semibold">Experience:</span>{' '}
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

            // Mobile label abbreviations (≤640px) - BBGM style
            const getMobileLabel = (label: string): string => {
              const mobileAbbreviations: Record<string, string> = {
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
              return mobileAbbreviations[label] || label;
            };

            // Stat row component with 3-cell grid: [label] [value] [Δ]
            const StatRow = ({ label, value, delta }: { label: string; value?: number; delta: ReturnType<typeof getRatingChange> }) => (
              <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto] gap-1 items-center h-[18px] sm:h-[22px] leading-[1.2]">
                <span className="text-[clamp(10px,2.8vw,12px)] sm:text-[13px] whitespace-nowrap sm:hidden">
                  {getMobileLabel(label)}:
                </span>
                <span className="text-[clamp(10px,2.8vw,12px)] sm:text-[13px] whitespace-nowrap overflow-hidden text-ellipsis hidden sm:inline">
                  {label}:
                </span>
                <span className="text-[clamp(10px,2.8vw,12px)] sm:text-[13px] text-right min-w-[24px] sm:min-w-[36px]">{value ?? 'N/A'}</span>
                <span className={`text-[85%] ml-1 whitespace-nowrap min-w-[32px] sm:min-w-[40px] ${delta ? delta.colorClass : ''}`}>
                  {delta ? delta.text : ''}
                </span>
              </div>
            );

            return (
              <div className="p-[4px] mx-auto sm:p-4 sm:mt-[-44px] sm:mb-[-44px] font-['system-ui'] tabular-nums max-w-full w-fit">
                {/* Header Row: Overall and Potential */}
                <div className="flex justify-between mb-1.5 sm:mb-3 gap-6">
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
                <div className="flex gap-4 sm:gap-8">
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
          <div className="mt-8 overflow-x-auto">
            <h3 className="text-xl font-bold mb-4">Career Stats</h3>
            <table className="w-full text-xs tabular-nums border-collapse">
              <thead>
                <tr className="border-b-2" style={{ borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}`, backgroundColor: `${textColor === 'white' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}` }}>
                  <th className="pl-2 pr-0 py-1 text-left sticky left-0 w-[52px]" style={{ backgroundColor: `${textColor === 'white' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}` }}>Year</th>
                  <th className="pl-1 pr-2 py-1 text-left sticky left-[52px]" style={{ backgroundColor: `${textColor === 'white' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}` }}>Team</th>
                  <th className="px-2 py-1 text-right">Age</th>
                  <th className="px-2 py-1 text-right">G</th>
                  <th className="px-2 py-1 text-right">GS</th>
                  <th className="px-2 py-1 text-right">MP</th>
                  <th className="px-2 py-1 text-right">PTS</th>
                  <th className="px-2 py-1 text-right">TRB</th>
                  <th className="px-2 py-1 text-right">AST</th>
                  <th className="px-2 py-1 text-right">FG</th>
                  <th className="px-2 py-1 text-right">FGA</th>
                  <th className="px-2 py-1 text-right">FG%</th>
                  <th className="px-2 py-1 text-right">3P</th>
                  <th className="px-2 py-1 text-right">3PA</th>
                  <th className="px-2 py-1 text-right">3P%</th>
                  <th className="px-2 py-1 text-right">2P</th>
                  <th className="px-2 py-1 text-right">2PA</th>
                  <th className="px-2 py-1 text-right">2P%</th>
                  <th className="px-2 py-1 text-right">eFG%</th>
                  <th className="px-2 py-1 text-right">FT</th>
                  <th className="px-2 py-1 text-right">FTA</th>
                  <th className="px-2 py-1 text-right">FT%</th>
                  <th className="px-2 py-1 text-right">ORB</th>
                  <th className="px-2 py-1 text-right">DRB</th>
                  <th className="px-2 py-1 text-right">TOV</th>
                  <th className="px-2 py-1 text-right">STL</th>
                  <th className="px-2 py-1 text-right">BLK</th>
                  <th className="px-2 py-1 text-right">BA</th>
                  <th className="px-2 py-1 text-right">PF</th>
                </tr>
              </thead>
              <tbody>
                {player.stats
                  .filter(s => !s.playoffs) // Regular season only
                  .sort((a, b) => b.season - a.season) // Descending by year
                  .map((stat, idx) => {
                    const team = teams.find(t => t.tid === stat.tid);
                    const age = player.born?.year ? stat.season - player.born.year : null;

                    // Calculate per-game stats
                    const gp = stat.gp || 0;
                    const perGame = (val?: number) => gp > 0 && val != null ? (val / gp).toFixed(1) : '-';
                    const pct = (made?: number, attempted?: number) => {
                      if (attempted != null && attempted > 0 && made != null) {
                        return ((made / attempted) * 100).toFixed(1);
                      }
                      return '-';
                    };

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
                      <tr key={`${stat.season}-${stat.tid}-${idx}`} className="border-b" style={{ borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                        <td className="pl-2 pr-0 py-1 sticky left-0 w-[52px]" style={{ backgroundColor: primaryColor }}>{stat.season}</td>
                        <td className="pl-1 pr-2 py-1 sticky left-[52px]" style={{ backgroundColor: primaryColor }}>{team?.abbrev || 'UNK'}</td>
                        <td className="px-2 py-1 text-right">{age ?? '-'}</td>
                        <td className="px-2 py-1 text-right">{gp}</td>
                        <td className="px-2 py-1 text-right">{(stat as any).gs ?? '-'}</td>
                        <td className="px-2 py-1 text-right">{perGame(stat.min)}</td>
                        <td className="px-2 py-1 text-right">{perGame(stat.pts)}</td>
                        <td className="px-2 py-1 text-right">{perGame(stat.trb)}</td>
                        <td className="px-2 py-1 text-right">{perGame(stat.ast)}</td>
                        <td className="px-2 py-1 text-right">{perGame(stat.fg)}</td>
                        <td className="px-2 py-1 text-right">{perGame(stat.fga)}</td>
                        <td className="px-2 py-1 text-right">{pct(stat.fg, stat.fga)}</td>
                        <td className="px-2 py-1 text-right">{perGame(tpm)}</td>
                        <td className="px-2 py-1 text-right">{perGame(stat.tpa)}</td>
                        <td className="px-2 py-1 text-right">{pct(tpm, stat.tpa)}</td>
                        <td className="px-2 py-1 text-right">{gp > 0 ? (twoPM / gp).toFixed(1) : '-'}</td>
                        <td className="px-2 py-1 text-right">{gp > 0 ? (twoPA / gp).toFixed(1) : '-'}</td>
                        <td className="px-2 py-1 text-right">{pct(twoPM, twoPA)}</td>
                        <td className="px-2 py-1 text-right">{efgPct}</td>
                        <td className="px-2 py-1 text-right">{perGame(stat.ft)}</td>
                        <td className="px-2 py-1 text-right">{perGame(stat.fta)}</td>
                        <td className="px-2 py-1 text-right">{pct(stat.ft, stat.fta)}</td>
                        <td className="px-2 py-1 text-right">{perGame(stat.orb)}</td>
                        <td className="px-2 py-1 text-right">{perGame(stat.drb)}</td>
                        <td className="px-2 py-1 text-right">{perGame((stat as any).tov)}</td>
                        <td className="px-2 py-1 text-right">{perGame(stat.stl)}</td>
                        <td className="px-2 py-1 text-right">{perGame(stat.blk)}</td>
                        <td className="px-2 py-1 text-right">{perGame((stat as any).ba)}</td>
                        <td className="px-2 py-1 text-right">{perGame((stat as any).pf)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
