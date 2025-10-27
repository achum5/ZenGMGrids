import { useMemo, useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import type { Player, Team, PlayoffSeasonData } from '@/types/bbgm';
import { PlayerFace } from '@/components/PlayerFace';
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


// Define stat columns by sport
// Note: format function receives (value, stats, gp) where stats is the full stats object and gp is games played
const SPORT_STAT_COLUMNS: Record<string, Array<{ key: string; label: string; tooltip?: string; format?: (val: any, stats?: any, gp?: number) => string }>> = {
  basketball: [
    { key: 'min', label: 'MIN', tooltip: 'Minutes Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'pts', label: 'PTS', tooltip: 'Points Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'trb', label: 'TRB', tooltip: 'Total Rebounds Per Game', format: (v, stats, gp) => {
      const trb = v ?? ((stats?.orb ?? 0) + (stats?.drb ?? 0));
      return (trb != null && gp) ? (trb / gp).toFixed(1) : '-';
    }},
    { key: 'ast', label: 'AST', tooltip: 'Assists Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'stl', label: 'STL', tooltip: 'Steals Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'blk', label: 'BLK', tooltip: 'Blocks Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'tov', label: 'TOV', tooltip: 'Turnovers Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'pf', label: 'PF', tooltip: 'Personal Fouls Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'fg', label: 'FG', tooltip: 'Field Goals Made Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'fga', label: 'FGA', tooltip: 'Field Goals Attempted Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'fgp', label: 'FG%', tooltip: 'Field Goal Percentage', format: (v, stats) => {
      const fg = stats?.fg ?? 0;
      const fga = stats?.fga ?? 0;
      return fga > 0 ? ((fg / fga) * 100).toFixed(1) : '-';
    }},
    { key: 'tp', label: '3P', tooltip: 'Three Pointers Made Per Game', format: (v, stats, gp) => {
      const tp = v ?? stats?.tpm ?? 0;
      return (tp != null && gp) ? (tp / gp).toFixed(1) : '-';
    }},
    { key: 'tpa', label: '3PA', tooltip: 'Three Pointers Attempted Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'tpp', label: '3P%', tooltip: 'Three Point Percentage', format: (v, stats) => {
      const tp = stats?.tp ?? stats?.tpm ?? 0;
      const tpa = stats?.tpa ?? 0;
      return tpa > 0 ? ((tp / tpa) * 100).toFixed(1) : '-';
    }},
    { key: 'ft', label: 'FT', tooltip: 'Free Throws Made Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'fta', label: 'FTA', tooltip: 'Free Throws Attempted Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'ftp', label: 'FT%', tooltip: 'Free Throw Percentage', format: (v, stats) => {
      const ft = stats?.ft ?? 0;
      const fta = stats?.fta ?? 0;
      return fta > 0 ? ((ft / fta) * 100).toFixed(1) : '-';
    }},
    { key: 'orb', label: 'ORB', tooltip: 'Offensive Rebounds Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'drb', label: 'DRB', tooltip: 'Defensive Rebounds Per Game', format: (v, stats, gp) => (v != null && gp) ? (v / gp).toFixed(1) : '-' },
    { key: 'per', label: 'PER', tooltip: 'Player Efficiency Rating', format: (v) => v?.toFixed(1) || '-' },
  ],
  football: [], // Football uses position-specific columns defined below
  baseball: [
    // Batting stats
    { key: 'h', label: 'H', tooltip: 'Hits', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'ab', label: 'AB', tooltip: 'At Bats', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'r', label: 'R', tooltip: 'Runs', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'hr', label: 'HR', tooltip: 'Home Runs', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'rbi', label: 'RBI', tooltip: 'Runs Batted In', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'sb', label: 'SB', tooltip: 'Stolen Bases', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'ba', label: 'AVG', tooltip: 'Batting Average', format: (v, stats) => {
      const h = stats?.h ?? 0;
      const ab = stats?.ab ?? 0;
      return ab > 0 ? (h / ab).toFixed(3) : '-';
    }},
    { key: 'obp', label: 'OBP', tooltip: 'On Base Percentage', format: (v) => v != null ? v.toFixed(3) : '-' },
    { key: 'slg', label: 'SLG', tooltip: 'Slugging Percentage', format: (v) => v != null ? v.toFixed(3) : '-' },
    { key: 'ops', label: 'OPS', tooltip: 'On Base Plus Slugging', format: (v) => v != null ? v.toFixed(3) : '-' },
    // Pitching stats
    { key: 'w', label: 'W', tooltip: 'Wins', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'l', label: 'L', tooltip: 'Losses', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'sv', label: 'SV', tooltip: 'Saves', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'ip', label: 'IP', tooltip: 'Innings Pitched', format: (v) => v != null ? v.toFixed(1) : '-' },
    { key: 'soPit', label: 'SO', tooltip: 'Strikeouts', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'era', label: 'ERA', tooltip: 'Earned Run Average', format: (v) => v != null ? v.toFixed(2) : '-' },
    { key: 'whip', label: 'WHIP', tooltip: 'Walks plus Hits per Inning Pitched', format: (v) => v != null ? v.toFixed(2) : '-' },
  ],
  hockey: [], // Unused - hockey uses position-based groups (Skater/Goalie)
  // baseball: [], // Unused - baseball uses position-based groups (Hitters/Pitchers)
};

// Position-group stat columns for baseball
const BASEBALL_GROUP_STAT_COLUMNS: Record<string, Array<{ key: string; label: string; tooltip?: string; format?: (val: any, stats?: any, gp?: number, gs?: number) => string }>> = {
  Hitters: [
    { key: 'h', label: 'H', tooltip: 'Hits', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'ab', label: 'AB', tooltip: 'At Bats', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'r', label: 'R', tooltip: 'Runs', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'hr', label: 'HR', tooltip: 'Home Runs', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'rbi', label: 'RBI', tooltip: 'Runs Batted In', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'sb', label: 'SB', tooltip: 'Stolen Bases', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'ba', label: 'AVG', tooltip: 'Batting Average', format: (v, stats) => {
      const h = stats?.h ?? 0;
      const ab = stats?.ab ?? 0;
      return ab > 0 ? (h / ab).toFixed(3) : '-';
    }},
    { key: 'obp', label: 'OBP', tooltip: 'On Base Percentage', format: (v) => v != null ? v.toFixed(3) : '-' },
    { key: 'slg', label: 'SLG', tooltip: 'Slugging Percentage', format: (v) => v != null ? v.toFixed(3) : '-' },
    { key: 'ops', label: 'OPS', tooltip: 'On Base Plus Slugging', format: (v) => v != null ? v.toFixed(3) : '-' },
  ],
  Pitchers: [
    { key: 'w', label: 'W', tooltip: 'Wins', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'l', label: 'L', tooltip: 'Losses', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'sv', label: 'SV', tooltip: 'Saves', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'ip', label: 'IP', tooltip: 'Innings Pitched', format: (v, stats) => {
      // IP is stored as outs, convert to innings
      const outs = stats?.outs ?? 0;
      return (outs / 3).toFixed(1);
    }},
    { key: 'soPit', label: 'SO', tooltip: 'Strikeouts', format: (v, stats) => {
      const so = stats?.soa ?? stats?.soPit ?? 0;
      return so.toFixed(0);
    }},
    { key: 'era', label: 'ERA', tooltip: 'Earned Run Average', format: (v, stats) => {
      const er = stats?.er ?? 0;
      const outs = stats?.outs ?? 0;
      const ip = outs / 3;
      return ip > 0 ? ((er * 9) / ip).toFixed(2) : '0.00';
    }},
    { key: 'whip', label: 'WHIP', tooltip: 'Walks plus Hits per Inning Pitched', format: (v, stats) => {
      const ha = stats?.ha ?? stats?.hitsAllowed ?? 0;
      const bba = stats?.bba ?? stats?.walksAllowed ?? 0;
      const outs = stats?.outs ?? 0;
      const ip = outs / 3;
      return ip > 0 ? ((ha + bba) / ip).toFixed(2) : '0.00';
    }},
  ],
};

// Position-group stat columns for hockey
const HOCKEY_GROUP_STAT_COLUMNS: Record<string, Array<{ key: string; label: string; tooltip?: string; format?: (val: any, stats?: any, gp?: number, gs?: number) => string }>> = {
  Skater: [
    { key: 'g', label: 'G', tooltip: 'Goals', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'a', label: 'A', tooltip: 'Assists', format: (v, stats) => {
      const a = v ?? stats?.asts;
      return a != null ? a.toFixed(0) : '-';
    }},
    { key: 'pts', label: 'PTS', tooltip: 'Points', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pm', label: '+/-', tooltip: 'Plus/Minus', format: (v) => v != null ? (v >= 0 ? `+${v}` : `${v}`) : '-' },
    { key: 'pim', label: 'PIM', tooltip: 'Penalty Minutes', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 's', label: 'S', tooltip: 'Shots on Goal', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'sPct', label: 'S%', tooltip: 'Shooting Percentage', format: (v, stats) => {
      const g = stats?.g ?? 0;
      const s = stats?.s ?? 0;
      return s > 0 ? `${((g / s) * 100).toFixed(1)}%` : '-';
    }},
    { key: 'min', label: 'TOI', tooltip: 'Time on Ice', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'hit', label: 'HIT', tooltip: 'Hits', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'blk', label: 'BLK', tooltip: 'Blocks', format: (v) => v != null ? v.toFixed(0) : '-' },
  ],
  Goalie: [
    { key: 'rec', label: 'Rec', tooltip: 'Record (W-L-OTL)', format: (v, stats) => {
      const w = stats?.gW ?? 0;
      const l = stats?.gL ?? 0;
      const otl = stats?.gOTL ?? 0;
      if (w === 0 && l === 0 && otl === 0) return '-';
      return otl > 0 ? `${w}-${l}-${otl}` : `${w}-${l}`;
    }},
    { key: 'gaa', label: 'GAA', tooltip: 'Goals Against Average', format: (v, stats) => {
      const ga = stats?.ga ?? 0;
      const min = stats?.gMin ?? 0;
      return min > 0 ? ((ga * 60) / min).toFixed(2) : '-';
    }},
    { key: 'svPct', label: 'SV%', tooltip: 'Save Percentage', format: (v, stats) => {
      const sv = stats?.sv ?? 0;
      const sa = stats?.sa ?? 0;
      return sa > 0 ? (sv / sa).toFixed(3) : '-';
    }},
    { key: 'so', label: 'SO', tooltip: 'Shutouts', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'sa', label: 'SA', tooltip: 'Shots Against', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'sv', label: 'SV', tooltip: 'Saves', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'min', label: 'TOI', tooltip: 'Time on Ice', format: (v, stats) => {
      const min = v ?? stats?.gMin;
      return min != null ? min.toFixed(0) : '-';
    }},
  ],
};

// Position-group stat columns for football
const FOOTBALL_GROUP_STAT_COLUMNS: Record<string, Array<{ key: string; label: string; tooltip?: string; format?: (val: any, stats?: any, gp?: number, gs?: number) => string }>> = {
  QB: [
    { key: 'gs', label: 'GS', tooltip: 'Games Started', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pssCmp', label: 'Cmp', tooltip: 'Pass Completions', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pss', label: 'Att', tooltip: 'Pass Attempts', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pct', label: 'Pct', tooltip: 'Completion Percentage', format: (v, stats) => {
      const cmp = stats?.pssCmp ?? 0;
      const att = stats?.pss ?? 0;
      return att > 0 ? ((cmp / att) * 100).toFixed(1) : '-';
    }},
    { key: 'pssYds', label: 'Yds', tooltip: 'Passing Yards', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pssTD', label: 'TD', tooltip: 'Passing Touchdowns', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pssInt', label: 'INT', tooltip: 'Interceptions Thrown', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pssYdsPerAtt', label: 'Y/A', tooltip: 'Yards Per Attempt', format: (v, stats) => {
      const yds = stats?.pssYds ?? 0;
      const att = stats?.pss ?? 0;
      return att > 0 ? (yds / att).toFixed(1) : '-';
    }},
    { key: 'sk', label: 'Sk', tooltip: 'Sacks Taken', format: (v, stats) => {
      // Sacks taken by QB
      const sacks = v ?? stats?.pssSk ?? stats?.qbRSk;
      return sacks != null ? sacks.toFixed(0) : '-';
    }},
    { key: 'av', label: 'AV', tooltip: 'Approximate Value', format: (v) => v != null ? v.toFixed(0) : '-' },
  ],
  Skill: [
    { key: 'gs', label: 'GS', tooltip: 'Games Started', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'rus', label: 'Rush', tooltip: 'Rush Attempts', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'rusYds', label: 'Rush Yds', tooltip: 'Rushing Yards', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'rusTD', label: 'Rush TD', tooltip: 'Rushing Touchdowns', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'rusYdsPerAtt', label: 'Y/A', tooltip: 'Rushing Yards Per Attempt', format: (v, stats) => {
      const yds = stats?.rusYds ?? 0;
      const att = stats?.rus ?? 0;
      return att > 0 ? (yds / att).toFixed(1) : '-';
    }},
    { key: 'tgt', label: 'Tgt', tooltip: 'Targets', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'rec', label: 'Rec', tooltip: 'Receptions', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'recYds', label: 'Rec Yds', tooltip: 'Receiving Yards', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'recTD', label: 'Rec TD', tooltip: 'Receiving Touchdowns', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'recYdsPerRec', label: 'Y/R', tooltip: 'Receiving Yards Per Reception', format: (v, stats) => {
      const yds = stats?.recYds ?? 0;
      const rec = stats?.rec ?? 0;
      return rec > 0 ? (yds / rec).toFixed(1) : '-';
    }},
    { key: 'fmb', label: 'Fmb', tooltip: 'Fumbles', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'av', label: 'AV', tooltip: 'Approximate Value', format: (v) => v != null ? v.toFixed(0) : '-' },
  ],
  Defense: [
    { key: 'gs', label: 'GS', tooltip: 'Games Started', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defTck', label: 'Tackles', tooltip: 'Total Tackles', format: (v, stats) => {
      // Total tackles - use stored value or calculate from solo + ast
      const total = v ?? stats?.tck;
      if (total != null) return total.toFixed(0);
      const solo = stats?.defTckSolo ?? 0;
      const ast = stats?.defTckAst ?? 0;
      return solo + ast > 0 ? (solo + ast).toFixed(0) : '-';
    }},
    { key: 'defTckSolo', label: 'Solo', tooltip: 'Solo Tackles', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defTckAst', label: 'Ast', tooltip: 'Assisted Tackles', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defTckLoss', label: 'TFL', tooltip: 'Tackles For Loss', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defSk', label: 'Sk', tooltip: 'Sacks', format: (v, stats) => {
      // Defensive sacks - try multiple possible keys
      const sacks = v ?? stats?.sks ?? stats?.sk;
      return sacks != null ? sacks.toFixed(1) : '-';
    }},
    { key: 'defInt', label: 'INT', tooltip: 'Interceptions', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defPssDef', label: 'PD', tooltip: 'Passes Defended', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defFmbFrc', label: 'FF', tooltip: 'Forced Fumbles', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defFmbRec', label: 'FR', tooltip: 'Fumble Recoveries', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'defTD', label: 'TD', tooltip: 'Defensive Touchdowns', format: (v, stats) => {
      const intTD = stats?.defIntTD ?? 0;
      const fmbTD = stats?.defFmbTD ?? 0;
      return (intTD + fmbTD).toFixed(0);
    }},
    { key: 'av', label: 'AV', tooltip: 'Approximate Value', format: (v) => v != null ? v.toFixed(0) : '-' },
  ],
  Kicker: [
    { key: 'gs', label: 'GS', tooltip: 'Games Started', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'fgmfga', label: 'FGM/FGA', tooltip: 'Field Goals Made/Attempted', format: (v, stats) => {
      const fg = (stats?.fg0 ?? 0) + (stats?.fg20 ?? 0) + (stats?.fg30 ?? 0) + (stats?.fg40 ?? 0) + (stats?.fg50 ?? 0);
      const fga = (stats?.fga0 ?? 0) + (stats?.fga20 ?? 0) + (stats?.fga30 ?? 0) + (stats?.fga40 ?? 0) + (stats?.fga50 ?? 0);
      return fga > 0 ? `${fg}/${fga}` : '-';
    }},
    { key: 'fgPct', label: 'FG%', tooltip: 'Field Goal Percentage', format: (v, stats) => {
      const fg = (stats?.fg0 ?? 0) + (stats?.fg20 ?? 0) + (stats?.fg30 ?? 0) + (stats?.fg40 ?? 0) + (stats?.fg50 ?? 0);
      const fga = (stats?.fga0 ?? 0) + (stats?.fga20 ?? 0) + (stats?.fga30 ?? 0) + (stats?.fga40 ?? 0) + (stats?.fga50 ?? 0);
      return fga > 0 ? ((fg / fga) * 100).toFixed(1) : '-';
    }},
    { key: 'fgLng', label: 'FG Lng', tooltip: 'Longest Field Goal', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'xpmxpa', label: 'XPM/XPA', tooltip: 'Extra Points Made/Attempted', format: (v, stats) => {
      const xp = stats?.xp ?? 0;
      const xpa = stats?.xpa ?? 0;
      return xpa > 0 ? `${xp}/${xpa}` : '-';
    }},
    { key: 'xpPct', label: 'XP%', tooltip: 'Extra Point Percentage', format: (v, stats) => {
      const xp = stats?.xp ?? 0;
      const xpa = stats?.xpa ?? 0;
      return xpa > 0 ? ((xp / xpa) * 100).toFixed(1) : '-';
    }},
    { key: 'pnt', label: 'Punts', tooltip: 'Number of Punts', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pntYdsPerAtt', label: 'Punt Avg', tooltip: 'Punt Average', format: (v, stats) => {
      const yds = stats?.pntYds ?? 0;
      const pnt = stats?.pnt ?? 0;
      return pnt > 0 ? (yds / pnt).toFixed(1) : '-';
    }},
    { key: 'pntLng', label: 'Punt Lng', tooltip: 'Longest Punt', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'pntBlk', label: 'Blk', tooltip: 'Blocked Punts', format: (v) => v != null ? v.toFixed(0) : '-' },
    { key: 'av', label: 'AV', tooltip: 'Approximate Value', format: (v) => v != null ? v.toFixed(0) : '-' },
  ],
};

// Helper function to map football position to position group
function getFootballPositionGroup(position: string): string {
  if (position === 'QB') return 'QB';
  if (['RB', 'WR', 'TE'].includes(position)) return 'Skill';
  if (['DL', 'LB', 'CB', 'S'].includes(position)) return 'Defense';
  if (['K', 'P'].includes(position)) return 'Kicker';
  return 'Other'; // OL and other positions
}

// Helper function to get stat columns for a football position group
function getFootballGroupStatColumns(group: string) {
  return FOOTBALL_GROUP_STAT_COLUMNS[group] || [];
}

// Helper function to determine if baseball player is a pitcher
function getBaseballPositionGroup(position: string): string {
  if (position === 'SP' || position === 'RP' || position === 'P') return 'Pitchers';
  return 'Hitters'; // All other positions
}

// Helper function to get stat columns for a baseball position group
function getBaseballGroupStatColumns(group: string) {
  return BASEBALL_GROUP_STAT_COLUMNS[group] || [];
}

// Helper function to determine if hockey player is a goalie
function getHockeyPositionGroup(position: string): string {
  if (position === 'G') return 'Goalie';
  return 'Skater'; // C, W, D, or any other position
}

// Helper function to get stat columns for a hockey position group
function getHockeyGroupStatColumns(group: string) {
  return HOCKEY_GROUP_STAT_COLUMNS[group] || [];
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

  // Sort players by total minutes played in the season
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aMinutes = a.stats?.min || 0;
      const bMinutes = b.stats?.min || 0;
      return bMinutes - aMinutes;
    });
  }, [players]);

  // Group football players by position group
  const footballPlayerGroups = useMemo(() => {
    if (sport !== 'football') return null;

    const groups: Record<string, PlayerInfo[]> = {
      QB: [],
      Skill: [],
      Defense: [],
      Kicker: [],
      Other: []
    };

    sortedPlayers.forEach(player => {
      const group = getFootballPositionGroup(player.position || '');
      groups[group].push(player);
    });

    return groups;
  }, [sport, sortedPlayers]);

  // Group baseball players by position group (Hitters/Pitchers)
  const baseballPlayerGroups = useMemo(() => {
    if (sport !== 'baseball') return null;

    const groups: Record<string, PlayerInfo[]> = {
      Hitters: [],
      Pitchers: []
    };

    sortedPlayers.forEach(player => {
      const group = getBaseballPositionGroup(player.position || '');
      groups[group].push(player);
    });

    return groups;
  }, [sport, sortedPlayers]);

  // Group hockey players by position group (Skater/Goalie)
  const hockeyPlayerGroups = useMemo(() => {
    if (sport !== 'hockey') return null;

    const groups: Record<string, PlayerInfo[]> = {
      Skater: [],
      Goalie: []
    };

    sortedPlayers.forEach(player => {
      const group = getHockeyPositionGroup(player.position || '');
      groups[group].push(player);
    });

    return groups;
  }, [sport, sortedPlayers]);

  // Extract playoff series info for this team
  const teamPlayoffSeries = useMemo(() => {
    if (!playoffSeriesData || !teamTid) return [];

    // Helper function to get season-aligned team name
    const getTeamNameForSeason = (team: Team | undefined, seasonYear: number): string => {
      if (!team) return 'Unknown';

      // Check if team has season-specific data
      if (team.seasons && team.seasons.length > 0) {
        const seasonData = team.seasons.find(s => s.season === seasonYear);
        if (seasonData) {
          const region = seasonData.region || team.region;
          const name = seasonData.name || team.name;
          return name; // Just return the team name (not region + name)
        }
      }

      // Fallback to current team name
      return team.name;
    };

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
          const opponentName = getTeamNameForSeason(opponentTeam, season);
          series.push({
            round: roundIndex + 1,
            opponent: opponentName || `Team ${matchup.away.tid}`,
            opponentTid: matchup.away.tid,
            teamWon: matchup.home.won,
            teamLost: matchup.home.lost || 0,
            opponentWon: matchup.away.won,
            opponentLost: matchup.away.lost || 0,
            won: matchup.home.won > matchup.away.won,
          });
        } else if (matchup.away.tid === teamTid) {
          const opponentTeam = teams.find(t => t.tid === matchup.home.tid);
          const opponentName = getTeamNameForSeason(opponentTeam, season);
          series.push({
            round: roundIndex + 1,
            opponent: opponentName || `Team ${matchup.home.tid}`,
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
  }, [playoffSeriesData, teamTid, teams, season]);

  if (!open) return null;

  return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100000,
          backdropFilter: 'blur(10px) brightness(0.8)',
          WebkitBackdropFilter: 'blur(10px) brightness(0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
        onClick={onClose}
      >
      {/* Team Info Card */}
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
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                      <PopoverContent
                        className="w-80 p-4"
                        style={{
                          backgroundColor: primaryColor,
                          borderColor: secondaryColor,
                          border: `2px solid ${secondaryColor}`,
                          zIndex: 110000,
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
          {sport === 'football' && footballPlayerGroups ? (
            /* Football: Multiple tables grouped by position */
            <div className="space-y-6">
              {(['QB', 'Skill', 'Defense', 'Kicker'] as const).map(groupName => {
                const groupPlayers = footballPlayerGroups[groupName];
                if (!groupPlayers || groupPlayers.length === 0) return null;

                const groupStatColumns = getFootballGroupStatColumns(groupName);
                const groupTitle = groupName === 'Skill' ? 'Skill Players (RB/WR/TE)' :
                                  groupName === 'Defense' ? 'Defense' :
                                  groupName === 'Kicker' ? 'Kicker/Punter' : 'Quarterbacks';

                return (
                  <div key={groupName}>
                    {/* Group Title */}
                    <h3
                      className="text-lg font-bold px-4 py-2 sticky top-0 z-20"
                      style={{
                        backgroundColor: primaryColor,
                        color: textColor === 'white' ? '#ffffff' : '#000000'
                      }}
                    >
                      {groupTitle}
                    </h3>
                    <table style={{ width: 'max-content', minWidth: '100%' }}>
                      <thead
                        className="sticky top-10 z-20"
                        style={{
                          backgroundColor: primaryColor,
                          borderBottom: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                        }}
                      >
                        <tr>
                          <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Player</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Position">Pos</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Age">Age</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Games Played">GP</th>
                          {groupStatColumns.map((col) => (
                            <th key={col.key} className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title={col.tooltip}>
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {groupPlayers.map((playerInfo) => (
                          <tr
                            key={playerInfo.player.pid}
                            onClick={() => onPlayerClick?.(playerInfo.player)}
                            className="border-b hover:bg-white/5 transition-colors cursor-pointer"
                            style={{ borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 flex-shrink-0">
                                  <PlayerFace pid={playerInfo.player.pid} name={playerInfo.player.name} imgURL={playerInfo.player.imgURL} face={playerInfo.player.face} player={playerInfo.player} teams={teams} sport={sport} season={season} hideName={true} size={56} scale={1.0} />
                                </div>
                                <span className="text-sm font-medium" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>{playerInfo.player.name}</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.position || '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.age || '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.gamesPlayed}</td>
                            {groupStatColumns.map((col) => (
                              <td key={col.key} className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                {col.format ? col.format(playerInfo.stats?.[col.key], playerInfo.stats, playerInfo.gamesPlayed, playerInfo.stats?.gs) : (playerInfo.stats?.[col.key] || '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : sport === 'hockey' && hockeyPlayerGroups ? (
            /* Hockey: Multiple tables grouped by position (Skater/Goalie) */
            <div className="space-y-6">
              {(['Skater', 'Goalie'] as const).map(groupName => {
                const groupPlayers = hockeyPlayerGroups[groupName];
                if (!groupPlayers || groupPlayers.length === 0) return null;

                const groupStatColumns = getHockeyGroupStatColumns(groupName);
                const groupTitle = groupName === 'Skater' ? 'Skaters (Forwards & Defensemen)' : 'Goalies';

                return (
                  <div key={groupName}>
                    {/* Group Title */}
                    <h3
                      className="text-lg font-bold px-4 py-2 sticky top-0 z-20"
                      style={{
                        backgroundColor: primaryColor,
                        color: textColor === 'white' ? '#ffffff' : '#000000'
                      }}
                    >
                      {groupTitle}
                    </h3>
                    <table style={{ width: 'max-content', minWidth: '100%' }}>
                      <thead
                        className="sticky top-10 z-20"
                        style={{
                          backgroundColor: primaryColor,
                          borderBottom: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                        }}
                      >
                        <tr>
                          <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Player</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Position">Pos</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Age">Age</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Games Played">GP</th>
                          {groupStatColumns.map((col) => (
                            <th key={col.key} className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title={col.tooltip}>
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {groupPlayers.map((playerInfo) => (
                          <tr
                            key={playerInfo.player.pid}
                            onClick={() => onPlayerClick?.(playerInfo.player)}
                            className="border-b hover:bg-white/5 transition-colors cursor-pointer"
                            style={{ borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 flex-shrink-0">
                                  <PlayerFace pid={playerInfo.player.pid} name={playerInfo.player.name} imgURL={playerInfo.player.imgURL} face={playerInfo.player.face} player={playerInfo.player} teams={teams} sport={sport} season={season} hideName={true} size={56} scale={1.0} />
                                </div>
                                <span className="text-sm font-medium" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>{playerInfo.player.name}</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.position || '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.age || '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.gamesPlayed}</td>
                            {groupStatColumns.map((col) => (
                              <td key={col.key} className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                {col.format ? col.format(playerInfo.stats?.[col.key], playerInfo.stats, playerInfo.gamesPlayed) : (playerInfo.stats?.[col.key] || '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : sport === 'baseball' && baseballPlayerGroups ? (
            /* Baseball: Multiple tables grouped by position (Hitters/Pitchers) */
            <div className="space-y-6">
              {(['Hitters', 'Pitchers'] as const).map(groupName => {
                const groupPlayers = baseballPlayerGroups[groupName];
                if (!groupPlayers || groupPlayers.length === 0) return null;

                const groupStatColumns = getBaseballGroupStatColumns(groupName);

                return (
                  <div key={groupName}>
                    {/* Group Title */}
                    <h3
                      className="text-lg font-bold px-4 py-2 sticky top-0 z-20"
                      style={{
                        backgroundColor: primaryColor,
                        color: textColor === 'white' ? '#ffffff' : '#000000'
                      }}
                    >
                      {groupName}
                    </h3>
                    <table style={{ width: 'max-content', minWidth: '100%' }}>
                      <thead
                        className="sticky top-10 z-20"
                        style={{
                          backgroundColor: primaryColor,
                          borderBottom: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                        }}
                      >
                        <tr>
                          <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Player</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Position">Pos</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Age">Age</th>
                          <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help sticky right-[75px] md:right-[80px] z-20" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }} title="Overall Rating">Ovr</th>
                          <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help sticky right-[40px] md:right-[40px] z-20" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }} title="Potential Rating">Pot</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Years With Team">YWT</th>
                          <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Games Played">GP</th>
                          {groupStatColumns.map((col) => (
                            <th key={col.key} className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title={col.tooltip}>{col.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {groupPlayers.map((playerInfo) => (
                          <tr key={playerInfo.player.pid} onClick={() => onPlayerClick?.(playerInfo.player)} className="border-b hover:bg-white/5 transition-colors cursor-pointer" style={{ borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 flex-shrink-0">
                                  <PlayerFace pid={playerInfo.player.pid} name={playerInfo.player.name} imgURL={playerInfo.player.imgURL} face={playerInfo.player.face} player={playerInfo.player} teams={teams} sport={sport} season={season} hideName={true} size={56} scale={1.0} />
                                </div>
                                <span className="text-sm font-medium" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>{playerInfo.player.name}</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.position || '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.age || '-'}</td>
                            <td className="text-right py-3 px-2 text-sm font-medium sticky right-[75px] md:right-[80px] z-10" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>{playerInfo.ovr || '-'}</td>
                            <td className="text-right py-3 px-2 text-sm sticky right-[40px] md:right-[40px] z-10" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', backgroundColor: primaryColor }}>{playerInfo.pot || '-'}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.yearsWithTeam}</td>
                            <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.gamesPlayed}</td>
                            {groupStatColumns.map((col) => (
                              <td key={col.key} className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                                {col.format ? col.format(playerInfo.stats?.[col.key], playerInfo.stats, playerInfo.gamesPlayed) : (playerInfo.stats?.[col.key] || '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Other sports: Single table */
            <table style={{ width: 'max-content', minWidth: '100%' }}>
              <thead className="sticky top-0 z-20" style={{ backgroundColor: primaryColor, borderBottom: `2px solid ${textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}` }}>
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>Player</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Position">Pos</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Age">Age</th>
                  <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help sticky right-[75px] md:right-[80px] z-20" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }} title="Overall Rating">Ovr</th>
                  <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help sticky right-[40px] md:right-[40px] z-20" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }} title="Potential Rating">Pot</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Years With Team">YWT</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title="Games Played">GP</th>
                  {statColumns.map((col) => (
                    <th key={col.key} className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-help" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }} title={col.tooltip}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((playerInfo) => (
                  <tr key={playerInfo.player.pid} onClick={() => onPlayerClick?.(playerInfo.player)} className="border-b hover:bg-white/5 transition-colors cursor-pointer" style={{ borderColor: `${textColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 flex-shrink-0">
                          <PlayerFace pid={playerInfo.player.pid} name={playerInfo.player.name} imgURL={playerInfo.player.imgURL} face={playerInfo.player.face} player={playerInfo.player} teams={teams} sport={sport} season={season} hideName={true} size={56} scale={1.0} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: textColor === 'white' ? '#ffffff' : '#000000' }}>{playerInfo.player.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.position || '-'}</td>
                    <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.age || '-'}</td>
                    <td className="text-right py-3 px-2 text-sm font-medium sticky right-[75px] md:right-[80px] z-10" style={{ color: textColor === 'white' ? '#ffffff' : '#000000', backgroundColor: primaryColor }}>{playerInfo.ovr || '-'}</td>
                    <td className="text-right py-3 px-2 text-sm sticky right-[40px] md:right-[40px] z-10" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', backgroundColor: primaryColor }}>{playerInfo.pot || '-'}</td>
                    <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.yearsWithTeam}</td>
                    <td className="text-center py-3 px-2 text-sm" style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>{playerInfo.gamesPlayed}</td>
                    {statColumns.map((col, colIdx) => (
                      <td key={col.key} className={`text-center py-3 px-2 text-sm ${colIdx === 0 && sport === 'basketball' ? 'font-medium' : ''}`} style={{ color: textColor === 'white' ? (colIdx === 0 && sport === 'basketball' ? '#ffffff' : 'rgba(255,255,255,0.9)') : (colIdx === 0 && sport === 'basketball' ? '#000000' : 'rgba(0,0,0,0.9)') }}>
                        {col.format ? col.format(playerInfo.stats?.[col.key], playerInfo.stats, playerInfo.gamesPlayed) : (playerInfo.stats?.[col.key] || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
