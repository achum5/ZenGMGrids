import { useMemo, useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import type { Player, Team, PlayoffSeasonData } from '@/types/bbgm';
import { getPlayerImage } from '@/lib/faceRenderer';
import { getPlayerJerseyInfo } from '@/lib/jersey-utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TeamInfoModalProps {
  open: boolean;
  onClose: () => void;
  season: number;
  teamName: string;
  teamAbbrev: string;
  teamLogo?: string;
  teamColors?: string[]; // [primary, secondary]
  players: PlayerInfo[];
  sport: string;
  teams?: Team[];
  teamStats?: {
    wins: number;
    losses: number;
    teamRating: number;
    avgAge: number;
    playoffResult?: string;
  };
  playoffSeriesData?: PlayoffSeasonData;
  teamTid?: number;
}

interface PlayerInfo {
  player: Player;
  position: string;
  age?: number;
  gamesPlayed: number;
  stats: any;
  yearsWithTeam: number;
  ovr?: number; // Overall rating
  pot?: number; // Potential rating
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

// Component to render player image/face
function PlayerImage({
  player,
  teams,
  sport,
  season
}: {
  player: Player;
  teams: Team[];
  sport: string;
  season: number;
}) {
  const [imageData, setImageData] = useState<{ type: 'url' | 'svg' | 'none'; data: string }>({
    type: 'none',
    data: ''
  });

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Get jersey info for the player
      const jerseyInfo = teams.length > 0
        ? getPlayerJerseyInfo(player, teams, sport, season)
        : undefined;

      // Get player image (prefers imgURL, falls back to face)
      const result = await getPlayerImage({
        pid: player.pid,
        name: player.name,
        imgURL: player.imgURL,
        face: player.face,
        jerseyInfo,
        season,
      });

      if (mounted) {
        setImageData(result);
      }
    })();

    return () => { mounted = false; };
  }, [player.pid, player.imgURL, player.face, teams, sport, season]);

  if (imageData.type === 'none') {
    return null;
  }

  return (
    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
      {imageData.type === 'url' && (
        <img
          src={imageData.data}
          alt={player.name}
          className="w-full h-full object-contain"
          style={{ transform: 'translateX(2px)' }}
        />
      )}
      {imageData.type === 'svg' && (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ transform: 'translateX(-7px) scale(0.85)' }}
          dangerouslySetInnerHTML={{ __html: imageData.data }}
        />
      )}
    </div>
  );
}

export function TeamInfoModal({
  open,
  onClose,
  season,
  teamName,
  teamAbbrev,
  teamLogo,
  teamColors = ['#1d4ed8', '#3b82f6'],
  players,
  sport,
  teams = [],
  teamStats,
  playoffSeriesData,
  teamTid,
}: TeamInfoModalProps) {
  // Ensure we have valid colors with fallbacks
  const [primaryColor, secondaryColor] = useMemo(() => {
    if (!teamColors || teamColors.length === 0) {
      return ['#1d4ed8', '#3b82f6'];
    }
    if (teamColors.length === 1) {
      return [teamColors[0], teamColors[0]];
    }
    return [teamColors[0], teamColors[1]];
  }, [teamColors]);

  const textColor = useMemo(() => getContrastColor(primaryColor), [primaryColor]);
  const statTextColor = useMemo(
    () => (textColor === 'white' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'),
    [textColor]
  );

  // Sort players by contribution (games played * minutes)
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aContribution = (a.gamesPlayed || 0) * (a.stats?.mpg || 0);
      const bContribution = (b.gamesPlayed || 0) * (b.stats?.mpg || 0);
      return bContribution - aContribution;
    });
  }, [players]);

  // Extract playoff series info for this team
  const teamPlayoffSeries = useMemo(() => {
    if (!playoffSeriesData || !teamTid) return [];

    const series: Array<{
      round: number;
      opponent: string;
      opponentTid: number;
      teamWon: number;
      teamLost: number;
      opponentWon: number;
      opponentLost: number;
      won: boolean;
    }> = [];

    playoffSeriesData.series.forEach((round, roundIndex) => {
      round.forEach(matchup => {
        if (matchup.home.tid === teamTid) {
          const opponentTeam = teams.find(t => t.tid === matchup.away.tid);
          series.push({
            round: roundIndex + 1,
            opponent: opponentTeam?.name || `Team ${matchup.away.tid}`,
            opponentTid: matchup.away.tid,
            teamWon: matchup.home.won,
            teamLost: matchup.home.lost || 0,
            opponentWon: matchup.away.won,
            opponentLost: matchup.away.lost || 0,
            won: matchup.home.won > matchup.away.won,
          });
        } else if (matchup.away.tid === teamTid) {
          const opponentTeam = teams.find(t => t.tid === matchup.home.tid);
          series.push({
            round: roundIndex + 1,
            opponent: opponentTeam?.name || `Team ${matchup.home.tid}`,
            opponentTid: matchup.home.tid,
            teamWon: matchup.away.won,
            teamLost: matchup.away.lost || 0,
            opponentWon: matchup.home.won,
            opponentLost: matchup.home.lost || 0,
            won: matchup.away.won > matchup.home.won,
          });
        }
      });
    });

    return series;
  }, [playoffSeriesData, teamTid, teams]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm bg-black/20"
      onClick={onClose}
    >
      {/* Team Info Card */}
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

        {/* Team Logo Watermark - Large centered background */}
        {teamLogo && (
          <div
            className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none"
          >
            <img
              src={teamLogo}
              alt=""
              className="w-[60%] h-[60%] object-contain"
            />
          </div>
        )}

        {/* Header */}
        <div className="relative z-10 p-6 border-b flex items-center gap-6" style={{ borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}` }}>
          {/* Team Logo */}
          {teamLogo && (
            <div className="flex-shrink-0 h-full flex items-center">
              <img
                src={teamLogo}
                alt={teamName}
                className="h-24 w-24 object-contain"
              />
            </div>
          )}

          {/* Text Content */}
          <div className="flex-1">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
            >
              {season} {teamName}
            </h2>
            {teamStats && (
              <ul className="mt-2 space-y-1 text-sm">
                <li style={{ color: statTextColor }} className="flex items-center gap-2">
                  <span>
                    Record: {teamStats.wins}-{teamStats.losses}
                    {teamStats.playoffResult ? ` | ${teamStats.playoffResult}` : ''}
                  </span>
                  {teamStats.playoffResult && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-white/10 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Info className="h-3.5 w-3.5" style={{ color: statTextColor }} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-80 p-4"
                        style={{
                          backgroundColor: primaryColor,
                          borderColor: secondaryColor,
                          border: `2px solid ${secondaryColor}`,
                        }}
                      >
                        <h4 className="text-sm font-semibold mb-3" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>
                          Playoff Series
                        </h4>
                        <div className="space-y-2">
                          {teamPlayoffSeries.length === 0 ? (
                            <p className="text-xs" style={{ color: statTextColor }}>
                              No detailed playoff series data available.
                            </p>
                          ) : (
                            teamPlayoffSeries.map((s, idx) => {
                            const isSingleGame = s.teamWon + s.teamLost === 1 && s.opponentWon + s.opponentLost === 1;
                            const scoreDisplay = isSingleGame
                              ? `${s.teamWon > s.opponentWon ? 'W' : 'L'} ${Math.max(s.teamWon, s.opponentWon)}-${Math.min(s.teamWon, s.opponentWon)}`
                              : `${s.won ? 'W' : 'L'} ${s.teamWon}-${s.opponentWon}`;

                              return (
                                <div
                                  key={idx}
                                  className="text-xs p-2 rounded"
                                  style={{
                                    backgroundColor: `${secondaryColor}15`,
                                    borderLeft: `3px solid ${s.won ? '#22c55e' : '#ef4444'}`,
                                    color: statTextColor,
                                  }}
                                >
                                  <div className="font-medium" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>
                                    Round {s.round}: vs {s.opponent}
                                  </div>
                                  <div className="mt-0.5">{scoreDisplay}</div>
                                </div>
                              );
                            }))
                          }
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </li>
                <li style={{ color: statTextColor }}>
                  Team rating: {teamStats.teamRating}/100
                </li>
                <li style={{ color: statTextColor }}>
                  Average age: {teamStats.avgAge.toFixed(1)}
                </li>
              </ul>
            )}
          </div>
        </div>

        {/* Table Container - Scrollable */}
        <div className="relative z-10 flex-1 overflow-auto">
          <table style={{ width: 'max-content', minWidth: '100%' }}>
            <thead
              className="sticky top-0 z-20"
              style={{
                backgroundColor: primaryColor,
                borderBottom: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
              }}
            >
              <tr>
                <th
                  className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  Player
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  Pos
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  Age
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  Ovr
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  Pot
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  YWT
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  G
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  MP
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  PTS
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  TRB
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  AST
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  PER
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((playerInfo, idx) => (
                <tr
                  key={playerInfo.player.pid}
                  className="border-b hover:bg-white/5 transition-colors"
                  style={{
                    borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  }}
                >
                  {/* Player Name */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <PlayerImage
                        player={playerInfo.player}
                        teams={teams}
                        sport={sport}
                        season={season}
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                      >
                        {playerInfo.player.name}
                      </span>
                    </div>
                  </td>

                  {/* Position */}
                  <td
                    className="text-center py-3 px-2 text-sm"
                    style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                  >
                    {playerInfo.position || '-'}
                  </td>

                  {/* Age */}
                  <td
                    className="text-center py-3 px-2 text-sm"
                    style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                  >
                    {playerInfo.age || '-'}
                  </td>

                  {/* Overall */}
                  <td
                    className="text-center py-3 px-1 text-sm font-medium"
                    style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                  >
                    {playerInfo.ovr || '-'}
                  </td>

                  {/* Potential */}
                  <td
                    className="text-center py-3 px-1 text-sm"
                    style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                  >
                    {playerInfo.pot || '-'}
                  </td>

                  {/* Years With Team */}
                  <td
                    className="text-center py-3 px-2 text-sm"
                    style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                  >
                    {playerInfo.yearsWithTeam}
                  </td>

                  {/* Games */}
                  <td
                    className="text-center py-3 px-2 text-sm"
                    style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                  >
                    {playerInfo.gamesPlayed}
                  </td>

                  {/* Minutes Per Game */}
                  <td
                    className="text-center py-3 px-2 text-sm"
                    style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                  >
                    {playerInfo.stats?.mpg ? playerInfo.stats.mpg.toFixed(1) : '-'}
                  </td>

                  {/* Points Per Game */}
                  <td
                    className="text-center py-3 px-2 text-sm font-medium"
                    style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                  >
                    {playerInfo.stats?.ppg ? playerInfo.stats.ppg.toFixed(1) : '-'}
                  </td>

                  {/* Rebounds Per Game */}
                  <td
                    className="text-center py-3 px-2 text-sm"
                    style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                  >
                    {playerInfo.stats?.rpg ? playerInfo.stats.rpg.toFixed(1) : '-'}
                  </td>

                  {/* Assists Per Game */}
                  <td
                    className="text-center py-3 px-2 text-sm"
                    style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                  >
                    {playerInfo.stats?.apg ? playerInfo.stats.apg.toFixed(1) : '-'}
                  </td>

                  {/* PER */}
                  <td
                    className="text-center py-3 px-2 text-sm"
                    style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                  >
                    {playerInfo.stats?.per ? playerInfo.stats.per.toFixed(1) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
