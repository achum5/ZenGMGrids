import { plural } from 'pluralize';

// Type definitions based on the provided contract
export type EntityKind = "team" | "achievement";
export type Scope = "career" | "season" | "game" | "playoffs" | "finals" | "decade" | "draft" | "age" | "misc";
export type Sport = "basketball" | "football" | "baseball" | "hockey" | "common";
export type Comp = ">" | ">=" | "<" | "<=" | "=";

export interface YearsOrSeasons {
  values?: number[];
  label?: "years" | "seasons";
}

export interface StatDef {
  key: string;
  noun: string;
  perGame?: boolean;
  perAttempt?: string;
  unitPrefix?: string;
  isRate?: boolean;
  actorVerb?: string;
}

export interface AwardDef {
  key: string;
  nounPhrase: string;
  level?: "any" | "first_team" | "second_team" | "finals" | "game";
}

export interface Achv {
  type: "stat" | "award" | "boolean" | "draft" | "decade" | "tenure";
  scope?: Scope;
  stat?: StatDef;
  comp?: Comp;
  value?: number;
  award?: AwardDef;
  booleanNoun?: string;
  decadeYear?: number;
  decadeType?: 'played' | 'debuted';
  draftMeta?: { round?: 1 | 2; overall?: number };
}

export interface SideEvidence {
  met: boolean;
  years?: YearsOrSeasons;
  teamName?: string;
  seasonYears?: YearsOrSeasons;
}

export interface RowInput {
  sport: Sport;
  playerName: string;
  left: { kind: EntityKind; teamName?: string; achv?: Achv };
  right: { kind: EntityKind; teamName?: string; achv?: Achv };
  leftEvidence: SideEvidence;
  rightEvidence: SideEvidence;
  player?: Player;
}

// --- Verb and Phrase Maps ---

const VERB_MAP: Record<Sport, Record<string, string>> = {
  basketball: {
    pts: "scored",
    reb: "grabbed",
    ast: "dished",
    stl: "recorded",
    blk: "blocked",
    tpm: "made",
    "3pm": "made",
    tov: "committed",
    "fg%": "shot",
    "3p%": "shot",
    "ft%": "shot",
    mpg: "played",
    spg: "averaged",
    bpg: "averaged",
  },
  football: {
    passYds: "passed for",
    passTD: "threw",
    rushYds: "rushed for",
    rushTD: "rushed for",
    recYds: "had",
    recTD: "caught",
    sacks: "recorded",
    tackles: "made",
    tfl: "made",
    ints: "made",
    "comp%": "posted",
    qbr: "posted",
  },
  baseball: {
    hits: "collected",
    hr: "hit",
    rbi: "drove in",
    sb: "stole",
    runs: "scored",
    wins: "won",
    so: "struck out",
    saves: "recorded",
    avg: "posted",
    obp: "posted",
    slg: "posted",
    ops: "posted",
  },
  hockey: {
    goals: "scored",
    assists: "had",
    points: "recorded",
    hits: "recorded",
    blocks: "recorded",
    takeaways: "recorded",
    shots: "took",
    "faceoff%": "won",
    toi: "averaged",
    sv: "posted", // sv%
    gaa: "posted",
    shutouts: "recorded",
    saves: "made",
    starts: "made",
  },
  common: {},
};

const BOOLEAN_PHRASES: Record<string, string> = {
    "Hall of Fame": "was inducted into the Hall of Fame",
    "Played 15+ Seasons": "played 15+ seasons",
    "#1 Overall Pick": "was the #1 overall pick",
    "First Round Pick": "was a first-round pick",
    "Went Undrafted": "went undrafted",
    "Drafted as Teenager": "was drafted as a teenager",
    "Born outside 50 states + DC": "was born outside the 50 states and DC",
    "Played at Age 40+": "played at age 40+",
    "Played for 5+ Franchises": "played for 5+ franchises",
    "Won Championship": "won a championship",
    "Championship": "won a championship",
};

// --- Helper Functions ---

function formatYears(years?: YearsOrSeasons): string {
  if (!years?.values || years.values.length === 0) {
    return "";
  }

  const sorted = [...years.values].sort((a, b) => a - b);
  const ranges: (string | number)[] = [];

  for (const year of sorted) {
    if (ranges.length > 0) {
      const last = ranges[ranges.length - 1];
      if (typeof last === 'string' && last.includes('-')) {
        const parts = last.split('-').map(Number);
        if (year === parts[1] + 1) {
          ranges[ranges.length - 1] = `${parts[0]}-${year}`;
          continue;
        }
      } else if (typeof last === 'number' && year === last + 1) {
        ranges[ranges.length - 1] = `${last}-${year}`;
        continue;
      }
    }
    ranges.push(year);
  }

  return ` (${ranges.join(', ')})`;
}

function getScopeSuffix(scope?: Scope): string {
    if (!scope) return "";
    const map: Record<Scope, string> = {
        season: " in a season",
        career: " in his career",
        game: " in a game",
        playoffs: " in the playoffs",
        finals: " in the Finals",
        decade: "",
        draft: "",
        age: "",
        misc: "",
    };
    return map[scope] || "";
}

function buildStatPhrase(achv: Achv, sport: Sport): string {
    const { stat, comp, value, scope } = achv;
    if (!stat || comp === undefined || value === undefined) return "";

    const verb = stat.actorVerb || VERB_MAP[sport]?.[stat.key] || "recorded";
    const scopeSuffix = getScopeSuffix(scope);

    let thresholdPhrase = "";
    const noun = (comp === "=" && value === 1) ? stat.noun : plural(stat.noun);

    switch (comp) {
        case ">=": thresholdPhrase = `${value}+`; break;
        case ">": thresholdPhrase = `more than ${value}`; break;
        case "<=": thresholdPhrase = `${value} or fewer`; break;
        case "<": thresholdPhrase = `fewer than ${value}`; break;
        case "=": thresholdPhrase = `${value}`; break;
    }

    if (stat.perGame) {
        return `averaged ${thresholdPhrase} ${noun} per game${scopeSuffix}`;
    }
    if (stat.isRate || stat.unitPrefix) {
        const unit = stat.unitPrefix || "";
        return `${verb} ${thresholdPhrase}${unit}${scopeSuffix}`;
    }

    return `${verb} ${thresholdPhrase} ${noun}${scopeSuffix}`;
}

function buildAchievementPhrase(achv: Achv, sport: Sport): string {
    switch (achv.type) {
        case "award":
            if (achv.award?.nounPhrase) {
                const phrase = achv.award.nounPhrase;
                if (['MVP', 'Defensive Player of the Year', 'Rookie of the Year', 'Best Defenseman', 'Playoffs MVP', 'Finals MVP'].includes(phrase)) {
                    return `won ${phrase}`;
                }
                return `was an ${phrase}`;
            }
            return "";
        case "boolean":
            return achv.booleanNoun ? BOOLEAN_PHRASES[achv.booleanNoun] || `was a ${achv.booleanNoun}` : "";
        case "draft":
            if (achv.draftMeta?.overall === 1) return "was the #1 overall pick";
            if (achv.draftMeta?.round === 1) return "was a first-round pick";
            return "";
        case "decade":
            if (achv.decadeType === 'debuted') {
                return `debuted in the ${achv.decadeYear}s`;
            }
            return `played in the ${achv.decadeYear}s`;
        case "stat":
            return buildStatPhrase(achv, sport);
        default:
            return "";
    }
}

function buildClause(
    side: { kind: EntityKind; teamName?: string; achv?: Achv },
    sport: Sport
): string {
    if (side.kind === "team") {
        return `played for the ${side.teamName}`;
    }
    if (side.achv) {
        const phrase = buildAchievementPhrase(side.achv, sport);
        if (phrase) return phrase;
    }
    // Fallback if achv is missing or doesn't produce a phrase
    return `meet the criteria for "${side.achv?.booleanNoun || side.teamName}"`;
}

// --- Main Function ---

export function generateIncorrectFeedback(input: RowInput): string | null {
    const { playerName, left, right, leftEvidence, rightEvidence, sport, player } = input;

    if (leftEvidence.met && rightEvidence.met) {
        return null; // Never generate for success cases
    }

    const leftClause = buildClause(left, sport);
    const rightClause = buildClause(right, sport);

    const leftYears = leftEvidence.met ? formatYears(leftEvidence.years || leftEvidence.seasonYears) : '';
    const rightYears = rightEvidence.met ? formatYears(rightEvidence.years || rightEvidence.seasonYears) : '';

    if (leftEvidence.met && !rightEvidence.met) {
        // Correct × Incorrect
        const negatedRight = negateClause(rightClause, right.achv, player);
        return `${playerName} ${leftClause}${leftYears}, but ${negatedRight}.`;
    }

    if (!leftEvidence.met && rightEvidence.met) {
        // Incorrect × Correct
        const negatedLeft = negateClause(leftClause, left.achv, player);
        return `${playerName} ${rightClause}${rightYears}, but ${negatedLeft}.`;
    }

    if (!leftEvidence.met && !rightEvidence.met) {
        // Incorrect × Incorrect
        const teamL = left.kind === 'team' ? `the ${left.teamName}` : null;
        const teamR = right.kind === 'team' ? `the ${right.teamName}` : null;

        if (teamL && teamR) {
             return `${playerName} never played for ${teamL} or ${teamR}.`;
        }
        
        const negatedLeft = negateClause(leftClause, left.achv, player);
        const negatedRight = negateClause(rightClause, right.achv, player);

        return `${playerName} ${negatedLeft} and ${negatedRight}.`;
    }

    return null;
}

import type { Player, CatTeam, Team } from '@/types/bbgm';

// A new function to generate feedback for incorrect guesses in the player modal
export function generateIncorrectGuessFeedback(
  player: Player,
  rowConstraint: CatTeam,
  colConstraint: CatTeam,
  teams: Team[],
  sport: string
): string {
  const teamsByTid = new Map(teams.map(team => [team.tid, team]));

  const meetsRow = rowConstraint.test(player);
  const meetsCol = colConstraint.test(player);

  const getTeamName = (constraint: CatTeam): string | undefined => {
      if (constraint.type === 'team' && constraint.tid !== undefined) {
          const team = teamsByTid.get(constraint.tid);
          return team?.region ? `${team.region} ${team.name}` : team?.name;
      }
      return undefined;
  }

  const buildModalClause = (constraint: CatTeam): string => {
    if (constraint.type === 'team' && constraint.tid !== undefined) {
        const teamName = getTeamName(constraint);
        return `played for the ${teamName || 'Unknown Team'}`;
    }
    if (constraint.type === 'achievement' && constraint.achv) {
        const phrase = buildAchievementPhrase(constraint.achv, sport as Sport);
        if (phrase.trim()) {
            return phrase;
        }
    }
    // Fallback for achievements that couldn't be phrased
    return `meet the criteria for "${constraint.label}"`;
  }

  const rowClause = buildModalClause(rowConstraint);
  const colClause = buildModalClause(colConstraint);

  if (meetsRow && !meetsCol) {
    return `${player.name} ${rowClause}, but ${negateClause(colClause, colConstraint.achv, player)}.`;
  }

  if (!meetsRow && meetsCol) {
    return `${player.name} ${colClause}, but ${negateClause(rowClause, rowConstraint.achv, player)}.`;
  }

  if (!meetsRow && !meetsCol) {
    const rowTeamName = getTeamName(rowConstraint);
    const colTeamName = getTeamName(colConstraint);
    if (rowTeamName && colTeamName) {
        return `${player.name} never played for the ${rowTeamName} or the ${colTeamName}.`;
    }
    const negatedRow = negateClause(rowClause, rowConstraint.achv, player);
    const negatedCol = negateClause(colClause, colConstraint.achv, player);
    return `${player.name} ${negatedRow} and ${negatedCol}.`;
  }

  return 'Incorrect guess.';
}

function getOrdinalSuffix(i: number): string {
    const j = i % 10,
        k = i % 100;
    if (j === 1 && k !== 11) {
        return "st";
    }
    if (j === 2 && k !== 12) {
        return "nd";
    }
    if (j === 3 && k !== 13) {
        return "rd";
    }
    return "th";
}

function negateClause(clause: string, achv?: Achv, player?: Player): string {
    // --- DRAFT ACHIEVEMENT LOGIC ---
    if (player && achv && (achv.type === 'draft' || achv.booleanNoun === 'Went Undrafted')) {
        const isDrafted = player.draft && player.draft.pick && player.draft.pick > 0;

        // Case 1: The achievement was "Went Undrafted", but the player was drafted.
        if (achv.booleanNoun === 'Went Undrafted') {
            if (isDrafted) {
                const pick = player.draft!.pick!;
                const suffix = getOrdinalSuffix(pick);
                return `was the ${pick}${suffix} overall pick`;
            }
            return "was drafted"; // Fallback
        }

        // Case 2: The achievement was about being drafted, but the player went undrafted.
        if (achv.type === 'draft' && !isDrafted) {
            return "went undrafted";
        }

        // Case 3: The achievement was about a specific draft position, but the player had a different one.
        if (achv.type === 'draft' && isDrafted) {
            const pick = player.draft!.pick!;
            const round = player.draft!.round!;
            const pickSuffix = getOrdinalSuffix(pick);
            const roundSuffix = getOrdinalSuffix(round);

            if (achv.draftMeta?.overall === 1) {
                return `was the ${pick}${pickSuffix} overall pick`;
            }
            if (achv.draftMeta?.round === 1) {
                return `was a ${round}${roundSuffix}-round pick`;
            }
            if (achv.draftMeta?.round === 2) {
                if (round === 1) return `was a first-round pick`;
                return `was a ${round}${roundSuffix}-round pick`;
            }
        }
    }

    // --- GENERAL FEEDBACK LOGIC ---
    const words = clause.split(' ');
    const verb = words[0];
    const rest = words.slice(1).join(' ');

    if (verb === 'was') return `was not ${rest}`;
    if (clause.startsWith('meet the criteria for')) return `did not ${clause}`;

    const verbMap: Record<string, string> = {
        played: 'play', won: 'win', averaged: 'average', scored: 'score',
        grabbed: 'grab', dished: 'dish', recorded: 'record', blocked: 'block',
        made: 'make', threw: 'throw', rushed: 'rush', had: 'have',
        caught: 'catch', collected: 'collect', hit: 'hit', stole: 'steal',
        debuted: 'debut',
    };

    if (verbMap[verb]) {
        return `did not ${verbMap[verb]} ${rest}`;
    }

    return `did not ${clause}`; // Fallback
}
