export type Comp = '>=' | '<=' | '=';

export type Achv =
  | {
      type: 'boolean';
      booleanNoun: string;
    }
  | {
      type: 'draft';
      draftMeta: {
        overall?: number;
        round?: number;
      };
      booleanNoun: string;
    }
  | {
      type: 'award';
      award: {
        key: string;
        nounPhrase: string;
      };
      booleanNoun: string;
    }
  | {
      type: 'decade';
      decadeType: 'played' | 'debuted';
      decadeYear: number;
      booleanNoun: string;
    }
  | {
      type: 'stat';
      scope: 'season' | 'career';
      stat: {
        key: string;
        noun: string;
      };
      comp: Comp;
      value: number;
      booleanNoun: string;
    };

export interface Award {
  awardType: string;
  season: string;
  teamAbbrev?: string;
}

export interface SeasonRecord {
  season: string;
  team: string;
  games: number;
  minutes: number;
  pts: number;
  trb: number;
  ast: number;
  stl: number;
  blk: number;
  tpm: number; // 3-pointers made
  fgp: number; // Field goal percentage
  tpp: number; // 3-point percentage
  ftp: number; // Free throw percentage
  g: number; // Games played
  mp: number; // Minutes played
  // Add other relevant stats as needed for thresholds
}

export interface Player {
  awards?: Award[];
  seasonRecords: SeasonRecord[];
  // Add other player properties as needed
}
