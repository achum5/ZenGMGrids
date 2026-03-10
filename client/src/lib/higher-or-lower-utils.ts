import type { Player } from '@/types/bbgm';

// ─── Types ───

export type ComputeMode = 'sum' | 'average' | 'season-best' | 'game-high' | 'advanced-best';

export type StatScope = 'career-totals' | 'career-averages' | 'season-best' | 'game-highs' | 'advanced';

export interface StatCategory {
  key: string;
  label: string;
  statField: string | string[];
  computeMode: ComputeMode;
  scope: StatScope;
  lowerIsBetter?: boolean;
  format?: (val: number) => string;
}

export interface SeasonRange {
  min: number;
  max: number;
}

// ─── Scope Labels ───

export const scopeLabels: Record<StatScope, string> = {
  'career-totals': 'Career Totals',
  'career-averages': 'Career Averages',
  'season-best': 'Best Season',
  'game-highs': 'Game Highs',
  'advanced': 'Advanced',
};

// ─── Category Definitions ───

const fmtDec = (v: number) => v.toFixed(1);
const fmtPct = (v: number) => (v * 100).toFixed(1) + '%';

// Basketball
const basketballByScope: Record<StatScope, StatCategory[]> = {
  'career-totals': [
    { key: 'ct-pts', label: 'Points', statField: 'pts', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-ast', label: 'Assists', statField: 'ast', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-trb', label: 'Rebounds', statField: 'trb', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-stl', label: 'Steals', statField: 'stl', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-blk', label: 'Blocks', statField: 'blk', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-tpm', label: '3-Pointers', statField: 'tpm', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-gp', label: 'Games', statField: 'gp', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-min', label: 'Minutes', statField: 'min', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-seasons', label: 'Seasons Played', statField: '_seasons', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-draft', label: 'Draft Pick', statField: '_draftPick', computeMode: 'sum', scope: 'career-totals', lowerIsBetter: true },
  ],
  'career-averages': [
    { key: 'ca-ppg', label: 'PPG', statField: 'pts', computeMode: 'average', scope: 'career-averages', format: fmtDec },
    { key: 'ca-apg', label: 'APG', statField: 'ast', computeMode: 'average', scope: 'career-averages', format: fmtDec },
    { key: 'ca-rpg', label: 'RPG', statField: 'trb', computeMode: 'average', scope: 'career-averages', format: fmtDec },
    { key: 'ca-spg', label: 'SPG', statField: 'stl', computeMode: 'average', scope: 'career-averages', format: fmtDec },
    { key: 'ca-bpg', label: 'BPG', statField: 'blk', computeMode: 'average', scope: 'career-averages', format: fmtDec },
    { key: 'ca-mpg', label: 'MPG', statField: 'min', computeMode: 'average', scope: 'career-averages', format: fmtDec },
    { key: 'ca-fgpct', label: 'FG%', statField: '_fgPct', computeMode: 'average', scope: 'career-averages', format: fmtPct },
    { key: 'ca-ftpct', label: 'FT%', statField: '_ftPct', computeMode: 'average', scope: 'career-averages', format: fmtPct },
    { key: 'ca-tppct', label: '3P%', statField: '_tpPct', computeMode: 'average', scope: 'career-averages', format: fmtPct },
  ],
  'season-best': [
    { key: 'sb-pts', label: 'Points', statField: 'pts', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-ast', label: 'Assists', statField: 'ast', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-trb', label: 'Rebounds', statField: 'trb', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-stl', label: 'Steals', statField: 'stl', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-blk', label: 'Blocks', statField: 'blk', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-tpm', label: '3-Pointers', statField: 'tpm', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-gp', label: 'Games', statField: 'gp', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-min', label: 'Minutes', statField: 'min', computeMode: 'season-best', scope: 'season-best' },
  ],
  'game-highs': [
    { key: 'gh-pts', label: 'Points', statField: 'ptsMax', computeMode: 'game-high', scope: 'game-highs' },
    { key: 'gh-trb', label: 'Rebounds', statField: 'trbMax', computeMode: 'game-high', scope: 'game-highs' },
    { key: 'gh-ast', label: 'Assists', statField: 'astMax', computeMode: 'game-high', scope: 'game-highs' },
    { key: 'gh-tpm', label: '3-Pointers', statField: 'tpMax', computeMode: 'game-high', scope: 'game-highs' },
  ],
  'advanced': [
    { key: 'adv-per', label: 'PER', statField: 'per', computeMode: 'advanced-best', scope: 'advanced', format: fmtDec },
    { key: 'adv-vorp', label: 'VORP', statField: 'vorp', computeMode: 'advanced-best', scope: 'advanced', format: fmtDec },
    { key: 'adv-bpm', label: 'BPM', statField: 'bpm', computeMode: 'advanced-best', scope: 'advanced', format: fmtDec },
    { key: 'adv-ows', label: 'OWS', statField: 'ows', computeMode: 'advanced-best', scope: 'advanced', format: fmtDec },
    { key: 'adv-dws', label: 'DWS', statField: 'dws', computeMode: 'advanced-best', scope: 'advanced', format: fmtDec },
    { key: 'adv-ws48', label: 'WS/48', statField: 'ws48', computeMode: 'advanced-best', scope: 'advanced', format: (v) => v.toFixed(3) },
    { key: 'adv-ts', label: 'TS%', statField: 'tsPct', computeMode: 'advanced-best', scope: 'advanced', format: fmtPct },
    { key: 'adv-usg', label: 'USG%', statField: 'usgPct', computeMode: 'advanced-best', scope: 'advanced', format: fmtPct },
  ],
};

// Football
const footballByScope: Record<StatScope, StatCategory[]> = {
  'career-totals': [
    { key: 'ct-pssYds', label: 'Passing Yards', statField: 'pssYds', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-rusYds', label: 'Rushing Yards', statField: 'rusYds', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-recYds', label: 'Receiving Yards', statField: 'recYds', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-pssTD', label: 'Passing TDs', statField: 'pssTD', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-rusTD', label: 'Rushing TDs', statField: 'rusTD', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-recTD', label: 'Receiving TDs', statField: 'recTD', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-defSk', label: 'Sacks', statField: ['sks', 'defSk'], computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-defInt', label: 'Interceptions', statField: 'defInt', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-gp', label: 'Games', statField: 'gp', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-seasons', label: 'Seasons Played', statField: '_seasons', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-draft', label: 'Draft Pick', statField: '_draftPick', computeMode: 'sum', scope: 'career-totals', lowerIsBetter: true },
  ],
  'career-averages': [
    { key: 'ca-pssYds', label: 'Pass YPG', statField: 'pssYds', computeMode: 'average', scope: 'career-averages', format: fmtDec },
    { key: 'ca-rusYds', label: 'Rush YPG', statField: 'rusYds', computeMode: 'average', scope: 'career-averages', format: fmtDec },
    { key: 'ca-recYds', label: 'Rec YPG', statField: 'recYds', computeMode: 'average', scope: 'career-averages', format: fmtDec },
  ],
  'season-best': [
    { key: 'sb-pssYds', label: 'Passing Yards', statField: 'pssYds', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-rusYds', label: 'Rushing Yards', statField: 'rusYds', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-recYds', label: 'Receiving Yards', statField: 'recYds', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-pssTD', label: 'Passing TDs', statField: 'pssTD', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-rusTD', label: 'Rushing TDs', statField: 'rusTD', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-recTD', label: 'Receiving TDs', statField: 'recTD', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-defSk', label: 'Sacks', statField: ['sks', 'defSk'], computeMode: 'season-best', scope: 'season-best' },
  ],
  'game-highs': [],
  'advanced': [],
};

// Hockey
const hockeyByScope: Record<StatScope, StatCategory[]> = {
  'career-totals': [
    { key: 'ct-g', label: 'Goals', statField: 'g', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-a', label: 'Assists', statField: ['a', 'asts'], computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-pim', label: 'Penalty Minutes', statField: 'pim', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-ppG', label: 'PP Goals', statField: 'ppG', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-gp', label: 'Games', statField: 'gp', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-seasons', label: 'Seasons Played', statField: '_seasons', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-draft', label: 'Draft Pick', statField: '_draftPick', computeMode: 'sum', scope: 'career-totals', lowerIsBetter: true },
  ],
  'career-averages': [
    { key: 'ca-gpg', label: 'Goals/Game', statField: 'g', computeMode: 'average', scope: 'career-averages', format: fmtDec },
    { key: 'ca-apg', label: 'Assists/Game', statField: ['a', 'asts'], computeMode: 'average', scope: 'career-averages', format: fmtDec },
  ],
  'season-best': [
    { key: 'sb-g', label: 'Goals', statField: 'g', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-a', label: 'Assists', statField: ['a', 'asts'], computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-pim', label: 'Penalty Minutes', statField: 'pim', computeMode: 'season-best', scope: 'season-best' },
  ],
  'game-highs': [],
  'advanced': [],
};

// Baseball
const baseballByScope: Record<StatScope, StatCategory[]> = {
  'career-totals': [
    { key: 'ct-hr', label: 'Home Runs', statField: 'hr', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-h', label: 'Hits', statField: 'h', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-rbi', label: 'RBI', statField: 'rbi', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-sb', label: 'Stolen Bases', statField: 'sb', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-r', label: 'Runs', statField: 'r', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-gp', label: 'Games', statField: 'gp', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-seasons', label: 'Seasons Played', statField: '_seasons', computeMode: 'sum', scope: 'career-totals' },
    { key: 'ct-draft', label: 'Draft Pick', statField: '_draftPick', computeMode: 'sum', scope: 'career-totals', lowerIsBetter: true },
  ],
  'career-averages': [
    { key: 'ca-avg', label: 'Batting Avg', statField: '_battingAvg', computeMode: 'average', scope: 'career-averages', format: (v) => v.toFixed(3) },
    { key: 'ca-hrpg', label: 'HR/Game', statField: 'hr', computeMode: 'average', scope: 'career-averages', format: fmtDec },
  ],
  'season-best': [
    { key: 'sb-hr', label: 'Home Runs', statField: 'hr', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-h', label: 'Hits', statField: 'h', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-rbi', label: 'RBI', statField: 'rbi', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-sb', label: 'Stolen Bases', statField: 'sb', computeMode: 'season-best', scope: 'season-best' },
    { key: 'sb-r', label: 'Runs', statField: 'r', computeMode: 'season-best', scope: 'season-best' },
  ],
  'game-highs': [],
  'advanced': [],
};

function getSportScopes(sport?: string): Record<StatScope, StatCategory[]> {
  switch (sport) {
    case 'football': return footballByScope;
    case 'hockey': return hockeyByScope;
    case 'baseball': return baseballByScope;
    default: return basketballByScope;
  }
}

/** Get available scopes for a sport (only those with categories) */
export function getAvailableScopes(sport?: string): StatScope[] {
  const scopes = getSportScopes(sport);
  return (Object.keys(scopes) as StatScope[]).filter(s => scopes[s].length > 0);
}

/** Get categories for a specific scope */
export function getScopedCategories(sport?: string, scope?: StatScope): StatCategory[] {
  const scopes = getSportScopes(sport);
  return scopes[scope || 'career-totals'] || [];
}

/** Legacy: get all career-totals categories (backward compat) */
export function getStatCategories(sport?: string): StatCategory[] {
  return getScopedCategories(sport, 'career-totals');
}

// ─── Stat Value Computation ───

function getFilteredStats(player: Player, seasonRange?: SeasonRange) {
  let stats = player.stats?.filter(s => !s.playoffs) || [];
  if (seasonRange) {
    stats = stats.filter(s => s.season >= seasonRange.min && s.season <= seasonRange.max);
  }
  return stats;
}

function getStatFieldValue(statEntry: any, fields: string[]): number {
  for (const field of fields) {
    const val = statEntry[field];
    if (typeof val === 'number') return val;
  }
  return 0;
}

export function getPlayerStatValue(
  player: Player,
  category: StatCategory,
  seasonRange?: SeasonRange,
): number {
  // Special fields don't depend on compute mode
  if (category.statField === '_seasons') {
    const seasons = new Set<number>();
    getFilteredStats(player, seasonRange).forEach(s => seasons.add(s.season));
    return seasons.size;
  }

  if (category.statField === '_draftPick') {
    if (!player.draft?.pick || !player.draft?.round) return 9999;
    if (player.draft.round === 1) return player.draft.pick;
    return (player.draft.round - 1) * 30 + (player.draft.pick || 0);
  }

  const fields = Array.isArray(category.statField) ? category.statField : [category.statField];
  const stats = getFilteredStats(player, seasonRange);

  // Special computed averages (shooting percentages, batting avg)
  if (fields[0] === '_fgPct') {
    let fg = 0, fga = 0;
    stats.forEach(s => { fg += (s as any).fg || 0; fga += (s as any).fga || 0; });
    return fga > 0 ? fg / fga : 0;
  }
  if (fields[0] === '_ftPct') {
    let ft = 0, fta = 0;
    stats.forEach(s => { ft += (s as any).ft || 0; fta += (s as any).fta || 0; });
    return fta > 0 ? ft / fta : 0;
  }
  if (fields[0] === '_tpPct') {
    let tpm = 0, tpa = 0;
    stats.forEach(s => { tpm += (s as any).tpm || 0; tpa += (s as any).tpa || 0; });
    return tpa > 0 ? tpm / tpa : 0;
  }
  if (fields[0] === '_battingAvg') {
    let h = 0, ab = 0;
    stats.forEach(s => { h += (s as any).h || 0; ab += (s as any).ab || 0; });
    return ab > 0 ? h / ab : 0;
  }

  switch (category.computeMode) {
    case 'sum': {
      let total = 0;
      stats.forEach(s => { total += getStatFieldValue(s, fields); });
      return Math.round(total * 100) / 100;
    }

    case 'average': {
      let total = 0;
      let gp = 0;
      stats.forEach(s => {
        total += getStatFieldValue(s, fields);
        gp += (s as any).gp || 0;
      });
      return gp > 0 ? Math.round((total / gp) * 1000) / 1000 : 0;
    }

    case 'season-best': {
      // Group by season, sum per season, take max
      const bySeason = new Map<number, number>();
      stats.forEach(s => {
        const val = getStatFieldValue(s, fields);
        bySeason.set(s.season, (bySeason.get(s.season) || 0) + val);
      });
      let max = 0;
      bySeason.forEach(v => { if (v > max) max = v; });
      return Math.round(max * 100) / 100;
    }

    case 'game-high': {
      // Take max of the field across all season entries
      let max = 0;
      stats.forEach(s => {
        const val = getStatFieldValue(s, fields);
        if (val > max) max = val;
      });
      return Math.round(max * 100) / 100;
    }

    case 'advanced-best': {
      // Best single-season value for an advanced stat
      let max = -Infinity;
      let found = false;
      stats.forEach(s => {
        const val = getStatFieldValue(s, fields);
        if (val !== 0 || found) {
          found = true;
          if (val > max) max = val;
        }
      });
      return found ? Math.round(max * 1000) / 1000 : 0;
    }

    default:
      return 0;
  }
}

// ─── Player Filtering ───

export function getEligiblePlayers(
  players: Player[],
  category: StatCategory,
  seasonRange?: SeasonRange,
): Player[] {
  return players.filter(p => {
    const val = getPlayerStatValue(p, category, seasonRange);
    if (category.statField === '_draftPick') return val < 9999;
    return val > 0;
  });
}

export function pickRandomPlayer(eligible: Player[], usedPids: Set<number>): Player | null {
  const available = eligible.filter(p => !usedPids.has(p.pid));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

// ─── Formatting ───

export function formatStatValue(value: number, category: StatCategory): string {
  if (category.statField === '_draftPick') {
    if (value >= 9999) return 'Undrafted';
    return `#${value}`;
  }
  if (category.format) return category.format(value);
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toFixed(1);
}

// ─── High Scores ───

export function getHighScore(statKey: string): number {
  const stored = localStorage.getItem(`hol-highscore-${statKey}`);
  return stored ? parseInt(stored, 10) : 0;
}

export function setHighScore(statKey: string, score: number): void {
  localStorage.setItem(`hol-highscore-${statKey}`, score.toString());
}
