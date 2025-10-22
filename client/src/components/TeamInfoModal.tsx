import { useMemo } from 'react';
import { X } from 'lucide-react';
import { PlayerFace } from '@/components/PlayerFace';
import type { Player, Team } from '@/types/bbgm';

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
  teams?: Team[]; // Add teams for jersey info
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
  contract?: string; // Contract info
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

  // Sort players by contribution (games played * minutes)
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aContribution = (a.gamesPlayed || 0) * (a.stats?.mpg || 0);
      const bContribution = (b.gamesPlayed || 0) * (b.stats?.mpg || 0);
      return bContribution - aContribution;
    });
  }, [players]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/20"
      onClick={onClose}
    >
      {/* Team Info Card */}
      <div
        className="relative w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          background: `linear-gradient(180deg, ${primaryColor}f5 0%, ${primaryColor}ed 100%)`,
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
            className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none -z-10"
          >
            <img
              src={teamLogo}
              alt=""
              className="w-[60%] h-[60%] object-contain"
            />
          </div>
        )}

        {/* Header */}
        <div className="relative z-10 p-6 border-b" style={{ borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}` }}>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
          >
            {season} {teamName}
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}
          >
            {players.length} Players
          </p>
        </div>

        {/* Table Container - Scrollable */}
        <div className="relative z-10 flex-1 overflow-auto">
          <table className="w-full">
            <thead
              className="sticky top-0"
              style={{
                backgroundColor: primaryColor,
                borderBottom: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
              }}
            >
              <tr>
                <th
                  className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  Player
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  Pos
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  Age
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  Ovr
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  Pot
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  Contract
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  YWT
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  G
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  MP
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  PTS
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  TRB
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide"
                  style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                >
                  AST
                </th>
                <th
                  className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide"
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
                  {/* Player Name with Face */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-10 flex-shrink-0 flex items-center justify-center" style={{ marginLeft: '4px' }}>
                        <PlayerFace
                          pid={playerInfo.player.pid}
                          name={playerInfo.player.name}
                          imgURL={playerInfo.player.imgURL}
                          face={playerInfo.player.face}
                          size={40}
                          hideName={true}
                          player={playerInfo.player}
                          teams={teams}
                          sport={sport}
                          season={season}
                        />
                      </div>
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
                    className="text-center py-3 px-2 text-sm font-medium"
                    style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                  >
                    {playerInfo.ovr || '-'}
                  </td>

                  {/* Potential */}
                  <td
                    className="text-center py-3 px-2 text-sm"
                    style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                  >
                    {playerInfo.pot || '-'}
                  </td>

                  {/* Contract */}
                  <td
                    className="text-center py-3 px-2 text-sm"
                    style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                  >
                    {playerInfo.contract || '-'}
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
