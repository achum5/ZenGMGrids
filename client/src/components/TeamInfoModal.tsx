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
  onOpenOpponentTeam?: (opponentTid: number, season: number) => void;
  onPlayerClick?: (player: Player) => void;
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

// Define stat columns by sport
// Note: format function receives (value, stats, gp) where stats is the full stats object and gp is games played
const SPORT_STAT_COLUMNS: Record<string, Array<{ key: string; label: string; format?: (val: any, stats?: any, gp?: number) => string }>> = {
  basketball: [
    { key: 'min', label: 'MIN', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'pts', label: 'PTS', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'trb', label: 'TRB', format: (v, stats, gp) => {
      const trb = v ?? ((stats?.orb ?? 0) + (stats?.drb ?? 0));
      return (trb != null && gp) ? (trb / gp).toFixed(1) : '-';
    }},
    { key: 'ast', label: 'AST', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'stl', label: 'STL', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'blk', label: 'BLK', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'tov', label: 'TOV', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'pf', label: 'PF', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'fg', label: 'FG', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'fga', label: 'FGA', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'fgp', label: 'FG%', format: (v, stats) => {
      const fg = stats?.fg ?? 0;
      const fga = stats?.fga ?? 0;
      return fga > 0 ? ((fg / fga) * 100).toFixed(1) : '-';
    }},
    { key: 'tp', label: '3P', format: (v, stats, gp) => {
      const tp = v ?? stats?.tpm ?? 0;
      return (tp != null && gp) ? (tp / gp).toFixed(1) : '-';
    }},
    { key: 'tpa', label: '3PA', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'tpp', label: '3P%', format: (v, stats) => {
      const tp = stats?.tp ?? stats?.tpm ?? 0;
      const tpa = stats?.tpa ?? 0;
      return tpa > 0 ? ((tp / tpa) * 100).toFixed(1) : '-';
    }},
    { key: 'ft', label: 'FT', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'fta', label: 'FTA', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'ftp', label: 'FT%', format: (v, stats) => {
      const ft = stats?.ft ?? 0;
      const fta = stats?.fta ?? 0;
      return fta > 0 ? ((ft / fta) * 100).toFixed(1) : '-';
    }},
    { key: 'orb', label: 'ORB', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'drb', label: 'DRB', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'per', label: 'PER', format: (v) => v?.toFixed(1) || '-' },
    { key: 'ews', label: 'EWS', format: (v) => v?.toFixed(1) || '-' },
  ],
  football: [
    // Passing stats (QB)
    { key: 'pssCmp', label: 'CMP', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pss', label: 'ATT', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'cmpPct', label: 'CMP%', format: (v, stats) => {
      const cmp = stats?.pssCmp ?? 0;
      const att = stats?.pss ?? 0;
      return att > 0 ? ((cmp / att) * 100).toFixed(1) : '-';
    }},
    { key: 'pssYds', label: 'YDS', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pssTD', label: 'TD', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pssInt', label: 'INT', format: (v) => v != null ? v.toFixed(0) : '-' },
    // Rushing stats
    { key: 'rus', label: 'CAR', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'rusYds', label: 'RUSH YDS', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'rusYdsPerAtt', label: 'YPC', format: (v, stats) => {
      const yds = stats?.rusYds ?? 0;
      const att = stats?.rus ?? 0;
      return att > 0 ? (yds / att).toFixed(1) : '-';
    }},
    { key: 'rusTD', label: 'RUSH TD', format: (v) => v != null ? v.toFixed(0) : '-' },
    // Receiving stats
    { key: 'tgt', label: 'TGT', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'rec', label: 'REC', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'recYds', label: 'REC YDS', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'recYdsPerAtt', label: 'Y/R', format: (v, stats) => {
      const yds = stats?.recYds ?? 0;
      const rec = stats?.rec ?? 0;
      return rec > 0 ? (yds / rec).toFixed(1) : '-';
    }},
    { key: 'recTD', label: 'REC TD', format: (v) => v != null ? v.toFixed(0) : '-' },
    // Defensive stats
    { key: 'defTckSolo', label: 'SOLO', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defTckAst', label: 'AST', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defTckLoss', label: 'TFL', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defSk', label: 'SCK', format: (v, stats) => {
      const sck = v ?? stats?.sks;
      return sck != null ? sck.toFixed(1) : '-';
    }},
    { key: 'defInt', label: 'INT', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defIntYds', label: 'INT YDS', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defIntTD', label: 'INT TD', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defPssDef', label: 'PD', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defFmbFrc', label: 'FF', format: (v, stats) => {
      const ff = v ?? stats?.ff;
      return ff != null ? ff.toFixed(0) : '-';
    }},
    // Return stats
    { key: 'prYds', label: 'PR YDS', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'krYds', label: 'KR YDS', format: (v) => v != null ? v.toFixed(0) : '-' },
    // Kicking stats
    { key: 'fg0', label: 'FG 0-19', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'fga0', label: 'FGA 0-19', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'fg20', label: 'FG 20-29', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'fga20', label: 'FGA 20-29', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'fg30', label: 'FG 30-39', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'fga30', label: 'FGA 30-39', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'fg40', label: 'FG 40-49', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'fga40', label: 'FGA 40-49', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'fg50', label: 'FG 50+', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'fga50', label: 'FGA 50+', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'fgLng', label: 'FG LONG', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'xp', label: 'XP', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'xpa', label: 'XPA', format: (v) => v != null ? v.toFixed(0) : '-' },
    // Punting stats
    { key: 'pnt', label: 'PNT', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pntYds', label: 'PNT YDS', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pntYdsPerAtt', label: 'PNT AVG', format: (v, stats) => {
      const yds = stats?.pntYds ?? 0;
      const pnt = stats?.pnt ?? 0;
      return pnt > 0 ? (yds / pnt).toFixed(1) : '-';
    }},
    { key: 'pntIn20', label: 'PNT I20', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pntTB', label: 'PNT TB', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pntBlk', label: 'PNT BLK', format: (v) => v != null ? v.toFixed(0) : '-' },
  ],
  baseball: [
    // Batting stats
    { key: 'h', label: 'H', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'ab', label: 'AB', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'r', label: 'R', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'hr', label: 'HR', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'rbi', label: 'RBI', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'sb', label: 'SB', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'ba', label: 'AVG', format: (v, stats) => {
      const h = stats?.h ?? 0;
      const ab = stats?.ab ?? 0;
      return ab > 0 ? (h / ab).toFixed(3) : '-';
    }},
    { key: 'obp', label: 'OBP', format: (v) => v != null ? v.toFixed(3) : '-' },
    { key: 'slg', label: 'SLG', format: (v) => v != null ? v.toFixed(3) : '-' },
    { key: 'ops', label: 'OPS', format: (v) => v != null ? v.toFixed(3) : '-' },
    // Pitching stats
    { key: 'w', label: 'W', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'l', label: 'L', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'sv', label: 'SV', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'ip', label: 'IP', format: (v) => v != null ? v.toFixed(1) : '-' },
    { key: 'soPit', label: 'SO', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'era', label: 'ERA', format: (v) => v != null ? v.toFixed(2) : '-' },
    { key: 'whip', label: 'WHIP', format: (v) => v != null ? v.toFixed(2) : '-' },
  ],
  hockey: [
    // Skater stats
    { key: 'g', label: 'G', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'a', label: 'A', format: (v, stats) => {
      const a = v ?? stats?.asts;
      return a != null ? a.toFixed(0) : '-';
    }},
    { key: 'pts', label: 'PTS', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pm', label: '+/-', format: (v) => v != null ? (v >= 0 ? `+${v}` : `${v}`) : '-' },
    { key: 'pim', label: 'PIM', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'evG', label: 'EV G', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'evA', label: 'EV A', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'ppG', label: 'PP G', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'ppA', label: 'PP A', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'shG', label: 'SH G', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'shA', label: 'SH A', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'gwG', label: 'GW', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 's', label: 'SOG', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'sPct', label: 'S%', format: (v, stats) => {
      const g = stats?.g ?? 0;
      const s = stats?.s ?? 0;
      return s > 0 ? ((g / s) * 100).toFixed(1) : '-';
    }},
    { key: 'fow', label: 'FOW', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'fol', label: 'FOL', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'foPct', label: 'FO%', format: (v, stats) => {
      const fow = stats?.fow ?? 0;
      const fol = stats?.fol ?? 0;
      const total = fow + fol;
      return total > 0 ? ((fow / total) * 100).toFixed(1) : '-';
    }},
    { key: 'hit', label: 'HIT', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'tk', label: 'TK', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'blk', label: 'BLK', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'min', label: 'TOI', format: (v) => v != null ? v.toFixed(0) : '-' },
    // Goalie stats
    { key: 'gpGoalie', label: 'GP G', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'gs', label: 'GS', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'gW', label: 'W', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'gL', label: 'L', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'gOTL', label: 'OTL', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'gMin', label: 'MIN', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'ga', label: 'GA', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'gaa', label: 'GAA', format: (v, stats) => {
      const ga = stats?.ga ?? 0;
      const gMin = stats?.gMin ?? 0;
      return gMin > 0 ? ((ga * 60) / gMin).toFixed(2) : '-';
    }},
    { key: 'sa', label: 'SA', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'sv', label: 'SV', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'svPct', label: 'SV%', format: (v, stats) => {
      const sv = stats?.sv ?? 0;
      const sa = stats?.sa ?? 0;
      return sa > 0 ? (sv / sa).toFixed(3) : '-';
    }},
    { key: 'so', label: 'SO', format: (v) => v != null ? v.toFixed(0) : '-' },
  ],
};

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
  onOpenOpponentTeam,
  onPlayerClick,
}: TeamInfoModalProps) {
  const [playoffPopoverOpen, setPlayoffPopoverOpen] = useState(false);

  // Get stat columns for this sport
  const statColumns = SPORT_STAT_COLUMNS[sport] || SPORT_STAT_COLUMNS.basketball;

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
        // Safety check: ensure matchup has home and away data
        if (!matchup?.home || !matchup?.away) return;

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
      className="fixed inset-0 z-[20000] flex items-center justify-center p-4 backdrop-blur-sm bg-black/20"
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
                <li style={{ color: statTextColor }}>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span>
                      Record: {teamStats.wins}-{teamStats.losses}
                      {teamStats.playoffResult ? ` | ${teamStats.playoffResult}` : ''}
                    </span>
                    {teamStats.playoffResult && teamPlayoffSeries.length > 0 && (
                      <Popover open={playoffPopoverOpen} onOpenChange={setPlayoffPopoverOpen}>
                        <PopoverTrigger asChild>
                          <button
                            className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-white/10 transition-colors flex-shrink-0"
                            style={{ color: statTextColor }}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                      <PopoverContent
                        className="w-80 p-4 z-[30000]"
                        style={{
                          backgroundColor: primaryColor,
                          borderColor: secondaryColor,
                          border: `2px solid ${secondaryColor}`,
                        }}
                        onClick={(e) => e.stopPropagation()}
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
                            const higherScore = Math.max(s.teamWon, s.opponentWon);
                            const lowerScore = Math.min(s.teamWon, s.opponentWon);
                            const scoreDisplay = `${s.won ? 'W' : 'L'} ${higherScore}-${lowerScore}`;

                              return (
                                <button
                                  key={idx}
                                  className="text-xs p-2 rounded w-full text-left transition-all hover:scale-[1.02] cursor-pointer"
                                  style={{
                                    backgroundColor: `${secondaryColor}15`,
                                    borderLeft: `3px solid ${s.won ? '#22c55e' : '#ef4444'}`,
                                    color: statTextColor,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPlayoffPopoverOpen(false);
                                    if (onOpenOpponentTeam) {
                                      onOpenOpponentTeam(s.opponentTid, season);
                                    }
                                  }}
                                >
                                  <div className="font-medium" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>
                                    Round {s.round}: vs {s.opponent}
                                  </div>
                                  <div className="mt-0.5">{scoreDisplay}</div>
                                </button>
                              );
                            }))
                          }
                        </div>
                      </PopoverContent>
                    </Popover>
                    )}
                  </div>
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
                {statColumns.map((col) => (
                  <th
                    key={col.key}
                    className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((playerInfo, idx) => (
                <tr
                  key={playerInfo.player.pid}
                  onClick={() => onPlayerClick?.(playerInfo.player)}
                  className="border-b hover:bg-white/5 transition-colors cursor-pointer"
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

                  {/* Dynamic stat columns */}
                  {statColumns.map((col, colIdx) => (
                    <td
                      key={col.key}
                      className={`text-center py-3 px-2 text-sm ${colIdx === 0 && sport === 'basketball' ? 'font-medium' : ''}`}
                      style={{ color: textColor === 'white' ? (colIdx === 0 && sport === 'basketball' ? '#ffffff' : 'rgba(255,255,255,0.9)') : (colIdx === 0 && sport === 'basketball' ? '#000000' : 'rgba(0,0,0,0.9)') }}
                    >
                      {col.format ? col.format(playerInfo.stats?.[col.key], playerInfo.stats, playerInfo.gamesPlayed) : (playerInfo.stats?.[col.key] || '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
